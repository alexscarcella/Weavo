// Rilevazione di riferimenti orfani (team o initials risorsa usati in un task ma
// assenti dalle rispettive anagrafiche) e di risorse allocate con un team
// diverso da quello a cui appartengono ora — warning non bloccanti, mai
// errori fatali.
(function (MP) {
  'use strict';

  function forEachWeekEntry(dataset, callback) {
    for (const [file, { data: progetto }] of dataset.projects) {
      for (const baseline of progetto.baseline) {
        for (const task of baseline.task) {
          for (const [settimana, entry] of Object.entries(task.weeks || {})) {
            callback({ file, progetto, baseline, task, settimana, entry });
          }
        }
      }
    }
  }

  function findOrphanTeam(dataset) {
    const teamValidi = new Set(dataset.teamResources.teams.map((t) => t.code));
    const orfani = [];
    forEachWeekEntry(dataset, ({ progetto, baseline, task, settimana, entry }) => {
      if (entry.team && !teamValidi.has(entry.team)) {
        orfani.push({ progetto: progetto.name, baseline: baseline.version, task: task.name, settimana, valore: entry.team });
      }
    });
    return orfani;
  }

  function findOrphanResources(dataset) {
    const initialsValide = MP.schema.existingInitials(dataset.teamResources);
    const orfane = [];
    forEachWeekEntry(dataset, ({ progetto, baseline, task, settimana, entry }) => {
      for (const initials of entry.resources || []) {
        if (!initialsValide.has(initials)) {
          orfane.push({ progetto: progetto.name, baseline: baseline.version, task: task.name, settimana, valore: initials });
        }
      }
    });
    return orfane;
  }

  // Risorse allocate in una settimana di un task non completed con un `team`
  // diverso dal team a cui la risorsa appartiene ora in team-resources.json —
  // tipicamente il risultato di uno spostamento di risorsa tra team dopo che
  // l'allocazione era già stata registrata. Segnalato, non corretto in
  // automatico: l'utente regolarizza a mano riaprendo la cella.
  function findTeamMismatches(dataset) {
    const mismatch = [];
    forEachWeekEntry(dataset, ({ progetto, baseline, task, settimana, entry }) => {
      if (task.completed || !entry.team) return;
      for (const initials of entry.resources || []) {
        const found = MP.schema.findResourceEntry(dataset.teamResources, initials);
        if (found && found.team.code !== entry.team) {
          mismatch.push({
            progetto: progetto.name,
            baseline: baseline.version,
            task: task.name,
            settimana,
            sigla: initials,
            teamAssegnato: found.team.code,
            teamCella: entry.team,
          });
        }
      }
    });
    return mismatch;
  }

  // Tutte le week entry che referenziano delle initials (in entry.resources), divise tra task
  // attivi (non completed) e completed. A differenza dei find* sopra ritorna riferimenti mutabili
  // (task, entry, ...) e non stringhe già appiattite: usato sia per decidere quali celle
  // riscrivere dopo uno spostamento di risorsa, sia per il cascade-delete e il riepilogo
  // copiabile alla cancellazione, entrambi in resource-crud.js.
  function findResourceAllocations(dataset, initials) {
    const attive = [];
    const concluse = [];
    forEachWeekEntry(dataset, ({ file, progetto, baseline, task, settimana, entry }) => {
      if (!Array.isArray(entry.resources) || !entry.resources.includes(initials)) return;
      const record = { file, progetto, baseline, task, settimana, entry };
      (task.completed ? concluse : attive).push(record);
    });
    return { attive, concluse };
  }

  // Initials orfane nei riferimenti risorsa di progetto (solutionAnalyst/vvReference in
  // progetto.referents), stesso principio di findOrphanResources ma sul livello progetto invece
  // che sulle week entry.
  function findOrphanProjectReferents(dataset) {
    const initialsValide = MP.schema.existingInitials(dataset.teamResources);
    const CAMPI = [
      ['solutionAnalyst', 'Solution analyst reference'],
      ['vvReference', 'V&V reference'],
    ];
    const orfani = [];
    for (const [, { data: progetto }] of dataset.projects) {
      const referents = progetto.referents || {};
      for (const [chiave, etichetta] of CAMPI) {
        const initials = referents[chiave];
        if (initials && !initialsValide.has(initials)) {
          orfani.push({ progetto: progetto.name, campo: etichetta, valore: initials });
        }
      }
    }
    return orfani;
  }

  // Allocazioni attive (task non completed) di una risorsa, raggruppate per task con prima/
  // ultima settimana e conteggio — dietro l'icona "i" della vista Workload
  // (js/ui/resource-load/resource-load-view.js). Un task "a cavallo" della settimana corrente
  // (alcune settimane già passate, altre future per quella risorsa) genera due gruppi distinti,
  // uno per settimane passate e uno per future, così da comparire nella sezione giusta di
  // entrambe invece di forzare l'intero task in una sola.
  function groupResourceTaskAllocations(dataset, initials) {
    const { attive } = findResourceAllocations(dataset, initials);
    const perTask = new Map();
    for (const { progetto, baseline, task, settimana } of attive) {
      if (!perTask.has(task)) perTask.set(task, { progetto, baseline, task, settimane: [] });
      perTask.get(task).settimane.push(settimana);
    }

    const currentWeek = MP.weekUtils.getCurrentWeekIso();
    const upcoming = [];
    const past = [];
    for (const { progetto, baseline, task, settimane } of perTask.values()) {
      settimane.sort();
      const passate = settimane.filter((s) => s < currentWeek);
      const future = settimane.filter((s) => s >= currentWeek);
      const toRow = (subset) => ({
        progetto: progetto.name,
        baseline: baseline.version,
        task: task.name,
        firstWeek: subset[0],
        lastWeek: subset[subset.length - 1],
        weekCount: subset.length,
      });
      if (future.length > 0) upcoming.push(toRow(future));
      if (passate.length > 0) past.push(toRow(passate));
    }
    upcoming.sort((a, b) => (a.firstWeek < b.firstWeek ? -1 : a.firstWeek > b.firstWeek ? 1 : 0));
    past.sort((a, b) => (a.firstWeek > b.firstWeek ? -1 : a.firstWeek < b.firstWeek ? 1 : 0));

    return { upcoming, past };
  }

  // Come groupResourceTaskAllocations, ma per un intero team trattato come un'unica entità —
  // dietro l'icona "i" della riga di intestazione team nella vista Workload. Un task conta come
  // "del team" su una settimana se almeno una risorsa del team vi è allocata quella settimana
  // (appartenenza letta da team-resources.json, non da entry.team); più risorse del team sulla
  // stessa settimana non producono righe duplicate — è l'unione delle settimane, non una somma
  // per risorsa — perché la richiesta è "solo i task, senza distinzione per singola risorsa".
  function groupTeamTaskAllocations(dataset, teamCode) {
    const team = dataset.teamResources.teams.find((t) => t.code === teamCode);
    const teamInitials = new Set(((team && team.resources) || []).map((r) => r.initials));
    const perTask = new Map();
    forEachWeekEntry(dataset, ({ progetto, baseline, task, settimana, entry }) => {
      if (task.completed) return;
      if (!Array.isArray(entry.resources) || !entry.resources.some((initials) => teamInitials.has(initials))) return;
      if (!perTask.has(task)) perTask.set(task, { progetto, baseline, task, settimane: new Set() });
      perTask.get(task).settimane.add(settimana);
    });

    const currentWeek = MP.weekUtils.getCurrentWeekIso();
    const upcoming = [];
    const past = [];
    for (const { progetto, baseline, task, settimane } of perTask.values()) {
      const ordinate = [...settimane].sort();
      const passate = ordinate.filter((s) => s < currentWeek);
      const future = ordinate.filter((s) => s >= currentWeek);
      const toRow = (subset) => ({
        progetto: progetto.name,
        baseline: baseline.version,
        task: task.name,
        firstWeek: subset[0],
        lastWeek: subset[subset.length - 1],
        weekCount: subset.length,
      });
      if (future.length > 0) upcoming.push(toRow(future));
      if (passate.length > 0) past.push(toRow(passate));
    }
    const compare = (dir) => (a, b) => {
      if (a.firstWeek !== b.firstWeek) return dir * (a.firstWeek < b.firstWeek ? -1 : 1);
      return a.progetto < b.progetto ? -1 : a.progetto > b.progetto ? 1 : 0;
    };
    upcoming.sort(compare(1));
    past.sort(compare(-1));

    return { upcoming, past };
  }

  MP.validation = {
    forEachWeekEntry,
    findOrphanTeam,
    findOrphanResources,
    findTeamMismatches,
    findOrphanProjectReferents,
    findResourceAllocations,
    groupResourceTaskAllocations,
    groupTeamTaskAllocations,
  };
})(window.MP = window.MP || {});
