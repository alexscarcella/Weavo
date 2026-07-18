// Rilevazione di riferimenti orfani (team o sigla risorsa usati in un task ma
// assenti dalle rispettive anagrafiche) e di risorse allocate con un team
// diverso da quello a cui appartengono ora — warning non bloccanti, mai
// errori fatali.
(function (MP) {
  'use strict';

  function forEachWeekEntry(dataset, callback) {
    for (const [file, { data: progetto }] of dataset.progetti) {
      for (const baseline of progetto.baseline) {
        for (const task of baseline.task) {
          for (const [settimana, entry] of Object.entries(task.settimane || {})) {
            callback({ file, progetto, baseline, task, settimana, entry });
          }
        }
      }
    }
  }

  function findOrphanTeam(dataset) {
    const teamValidi = new Set(dataset.teamRisorsa.team.map((t) => t.codice));
    const orfani = [];
    forEachWeekEntry(dataset, ({ progetto, baseline, task, settimana, entry }) => {
      if (entry.team && !teamValidi.has(entry.team)) {
        orfani.push({ progetto: progetto.nome, baseline: baseline.versione, task: task.nome, settimana, valore: entry.team });
      }
    });
    return orfani;
  }

  function findOrphanRisorse(dataset) {
    const sigleValide = MP.schema.existingSigle(dataset.teamRisorsa);
    const orfane = [];
    forEachWeekEntry(dataset, ({ progetto, baseline, task, settimana, entry }) => {
      for (const sigla of entry.risorse || []) {
        if (!sigleValide.has(sigla)) {
          orfane.push({ progetto: progetto.nome, baseline: baseline.versione, task: task.nome, settimana, valore: sigla });
        }
      }
    });
    return orfane;
  }

  // Risorse allocate in una settimana di un task non concluso con un `team`
  // diverso dal team a cui la risorsa appartiene ora in team-risorse.json —
  // tipicamente il risultato di uno spostamento di risorsa tra team dopo che
  // l'allocazione era già stata registrata. Segnalato, non corretto in
  // automatico: l'utente regolarizza a mano riaprendo la cella.
  function findTeamMismatches(dataset) {
    const mismatch = [];
    forEachWeekEntry(dataset, ({ progetto, baseline, task, settimana, entry }) => {
      if (task.concluso || !entry.team) return;
      for (const sigla of entry.risorse || []) {
        const found = MP.schema.findResourceEntry(dataset.teamRisorsa, sigla);
        if (found && found.team.codice !== entry.team) {
          mismatch.push({
            progetto: progetto.nome,
            baseline: baseline.versione,
            task: task.nome,
            settimana,
            sigla,
            teamAssegnato: found.team.codice,
            teamCella: entry.team,
          });
        }
      }
    });
    return mismatch;
  }

  // Sigle orfane nei riferimenti risorsa di progetto (solutionAnalyst/vvReference in
  // progetto.team), stesso principio di findOrphanRisorse ma sul livello progetto invece che
  // sulle week entry.
  function findOrphanProjectRiferimenti(dataset) {
    const sigleValide = MP.schema.existingSigle(dataset.teamRisorsa);
    const CAMPI = [
      ['solutionAnalyst', 'Solution analyst reference'],
      ['vvReference', 'V&V reference'],
    ];
    const orfani = [];
    for (const [, { data: progetto }] of dataset.progetti) {
      const team = progetto.team || {};
      for (const [chiave, etichetta] of CAMPI) {
        const sigla = team[chiave];
        if (sigla && !sigleValide.has(sigla)) {
          orfani.push({ progetto: progetto.nome, campo: etichetta, valore: sigla });
        }
      }
    }
    return orfani;
  }

  MP.validation = { findOrphanTeam, findOrphanRisorse, findTeamMismatches, findOrphanProjectRiferimenti };
})(window.MP = window.MP || {});
