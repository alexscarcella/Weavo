// Riferimento unico per lo schema dati (manifest/team-resources/projects).
// Usato sia dall'app runtime sia, in futuro, dallo script di import Excel.
// Nessun elenco qui rappresenta un vincolo "hardcoded" per l'app: SEED_TEAM
// è solo un contenuto proposto alla creazione di un dataset vuoto, liberamente
// modificabile dall'utente in team-resources.json subito dopo.
//
// Un "team" è l'unica anagrafica di raggruppamento: ogni risorsa appartiene
// a esattamente un team (relazione 1 team -> N risorse), annidata dentro il
// team stesso in team-resources.json. Non esiste più un'anagrafica risorse
// indipendente dal team.
//
// Niente `import`/`export`: caricato come script classico (namespace globale
// window.MP) perché type="module" viene bloccato da CORS quando index.html è
// aperto direttamente da file:// (verificato), e la distribuzione richiede
// "doppio click su index.html, nessun server".
(function (MP) {
  'use strict';

  const SCHEMA_VERSION = 4;

  const PATHS = {
    manifest: 'manifest.json',
    teamResources: 'team-resources.json',
    projectsDir: 'projects',
    backupDir: 'backup',
  };

  // Le 3 tipologie di milestone (vedi requirements): "taskDeadline" è una
  // scadenza interna, per singolo task, mai propagata; "readyForUat"/"uat"
  // sono scadenze condivise a livello di baseline, propagate a tutti i task
  // non completed della baseline (stesso meccanismo, vedi gantt-view.js). Una
  // week entry porta al più UNA di queste tre. MILESTONE_ORDER è la sequenza
  // cronologica obbligatoria (taskDeadline < readyForUat < uat, mai sulla
  // stessa settimana) — ogni controllo d'ordine itera questo array invece di
  // hardcodare la sequenza altrove, così la regola vive in un solo posto.
  const MILESTONE_TYPES = { TASK_DEADLINE: 'taskDeadline', READY_FOR_UAT: 'readyForUat', UAT: 'uat' };
  const MILESTONE_ORDER = [MILESTONE_TYPES.TASK_DEADLINE, MILESTONE_TYPES.READY_FOR_UAT, MILESTONE_TYPES.UAT];
  const MILESTONE_LABELS = {
    taskDeadline: 'Task deadline',
    readyForUat: 'Ready for UAT',
    uat: 'UAT',
  };

  const SEED_TEAM = [
    { code: 'dev', name: 'Development', color: '#00B050' },
    { code: 'vv', name: 'V&V', color: '#FFC000' },
    { code: 'devops', name: 'DevOps', color: '#2E86FF' },
    { code: 'run', name: 'Run Team', color: '#8E44AD' },
    { code: 'build', name: 'Build Team', color: '#D4AC0D' },
  ];

  /**
   * Crea la forma vuota di manifest.json per un dataset nuovo: nessun progetto,
   * range settimane collassato su un'unica settimana di partenza (first === last).
   * @param {string} firstWeek - ISO date (lunedì) della prima/unica settimana.
   * @returns {{schemaVersion: number, weeks: {first: string, last: string}, projects: Array}}
   */
  function createEmptyManifest(firstWeek) {
    return {
      schemaVersion: SCHEMA_VERSION,
      weeks: { first: firstWeek, last: firstWeek },
      projects: [],
    };
  }

  /**
   * Crea la forma vuota di team-resources.json per un dataset nuovo.
   * @param {boolean} [withSeed=true] - se true, precompila con SEED_TEAM (team senza
   *   risorse) come punto di partenza suggerito; l'utente resta libero di modificarlo
   *   subito dopo nella pagina team/risorse. Se false, parte da nessun team.
   * @returns {{teams: Array}}
   */
  function createEmptyTeamResources(withSeed = true) {
    return { teams: withSeed ? SEED_TEAM.map((t) => ({ ...t, resources: [] })) : [] };
  }

  /**
   * Cerca una risorsa per initials in tutti i team (le initials sono uniche a
   * livello globale, non solo all'interno del team).
   * @param {{teams: Array}} teamResources - dataset team-resources.json.
   * @param {string} initials - initials della risorsa da cercare.
   * @returns {{team: Object, resource: Object}|null} il team e la risorsa trovati,
   *   o null se le initials non esistono in nessun team.
   */
  function findResourceEntry(teamResources, initials) {
    for (const team of teamResources.teams) {
      const resource = (team.resources || []).find((r) => r.initials === initials);
      if (resource) return { team, resource };
    }
    return null;
  }

  /**
   * Cerca un team per code.
   * @param {{teams: Array}} teamResources - dataset team-resources.json.
   * @param {string} code - code del team (es. "dev", "vv"); non è un enum
   *   fisso nel codice, è definito dinamicamente dal contenuto di team-resources.json.
   * @returns {Object|undefined} il team trovato, o undefined se nessun team ha quel code.
   */
  function findTeamByCode(teamResources, code) {
    return teamResources.teams.find((t) => t.code === code);
  }

  /**
   * Lista piatta di tutte le risorse di tutti i team, con il team di
   * appartenenza denormalizzato su ogni riga: comoda per le viste che non
   * ragionano per team (vista carico risorse, insiemi di initials valide).
   * @param {{teams: Array}} teamResources - dataset team-resources.json.
   * @returns {Array<{initials: string, name: string, teamCode: string}>}
   */
  function flattenResources(teamResources) {
    const result = [];
    for (const team of teamResources.teams) {
      for (const resource of team.resources || []) {
        result.push({ initials: resource.initials, name: resource.name, teamCode: team.code });
      }
    }
    return result;
  }

  /**
   * Insieme di tutte le initials esistenti in team-resources.json, a prescindere dal team.
   * Usato per distinguere delle initials valide da un riferimento orfano nei task.
   * @param {{teams: Array}} teamResources - dataset team-resources.json.
   * @returns {Set<string>}
   */
  function existingInitials(teamResources) {
    return new Set(flattenResources(teamResources).map((r) => r.initials));
  }

  /**
   * Crea la struttura dei referenti di un progetto. `solutionAnalyst`/`vvReference`
   * contengono le `initials` di una risorsa di team-resources.json (o '' se non assegnato) — mai
   * un oggetto denormalizzato, il nome si risolve al volo via `findResourceEntry`.
   * @param {Object} [options]
   * @param {string} [options.projectManager='']
   * @param {string} [options.projectEngineer='']
   * @param {string} [options.solutionAnalyst=''] - initials risorsa.
   * @param {string} [options.vvReference=''] - initials risorsa.
   * @param {string} [options.note='']
   * @returns {{projectManager: string, projectEngineer: string, solutionAnalyst: string, vvReference: string, note: string}}
   */
  function createProjectReferents({ projectManager = '', projectEngineer = '', solutionAnalyst = '', vvReference = '', note = '' } = {}) {
    return { projectManager, projectEngineer, solutionAnalyst, vvReference, note };
  }

  /**
   * Normalizza il campo `referents` di un progetto letto da disco: i dati legacy (stringa
   * libera, formato pre-struttura) vengono migrati in `note`; un oggetto già nel nuovo formato
   * viene ripassato per completare eventuali chiavi mancanti. Usato in `repository.loadDataset`
   * come migrazione lazy "self-heal on touch" (si riscrive nel nuovo formato al primo salvataggio).
   * @param {string|Object|null|undefined} referents - valore letto da projects/*.json.
   * @returns {{projectManager: string, projectEngineer: string, solutionAnalyst: string, vvReference: string, note: string}}
   */
  function normalizeProjectReferents(referents) {
    if (typeof referents === 'string') return createProjectReferents({ note: referents });
    return createProjectReferents(referents || {});
  }

  /**
   * Crea un nuovo progetto vuoto (nessuna baseline).
   * @param {string} name - nome del progetto.
   * @param {Object} [referents] - referenti di progetto, vedi `createProjectReferents`.
   * @returns {{name: string, referents: Object, completed: boolean, baseline: Array}}
   */
  function createProject(name, referents = createProjectReferents()) {
    return { name, referents, completed: false, baseline: [] };
  }

  /**
   * Crea una nuova baseline/release vuota (nessun task).
   * @param {string} version - identificativo/versione della baseline.
   * @returns {{version: string, completed: boolean, task: Array}}
   */
  function createBaseline(version) {
    return { version, completed: false, task: [] };
  }

  /**
   * Crea un nuovo task vuoto (nessuna settimana allocata), non completed.
   * @param {string} name - nome del task.
   * @returns {{name: string, completed: boolean, weeks: Object, note: string}}
   */
  function createTask(name) {
    return { name, completed: false, weeks: {}, note: '' };
  }

  /**
   * Costruisce una week entry (task.weeks[iso]) applicando la regola di
   * coerenza decisa per il popover di editing: un'allocazione (team + resources)
   * è valida solo se entrambe le parti sono presenti; altrimenti resta solo
   * l'eventuale flag milestone (mai uno stato parziale tipo {team:"dev", resources:[]}).
   * L'assegnazione di risorse è inoltre inibita sulla settimana dell'UAT (milestone
   * 'uat'): `team`/`resources` vengono scartati anche se passati, qualunque sia
   * l'input — la scadenza cliente-facing non deve mai coincidere con un'allocazione.
   * Va sempre usata al posto di costruire l'oggetto a mano.
   * @param {Object} [options]
   * @param {string} [options.team] - code team dell'allocazione.
   * @param {string[]} [options.resources] - initials delle risorse allocate.
   * @param {string} [options.milestone] - tipo di milestone su questa settimana, uno dei
   *   valori di MILESTONE_TYPES ('taskDeadline'|'readyForUat'|'uat'), o falsy per nessuna.
   * @param {boolean} [options.completed] - flag di completamento parziale di questa singola
   *   settimana (indipendente da task.completed) — vedi isWeekEntryEmpty.
   * @returns {{team?: string, resources?: string[], milestone?: string, completed?: boolean}}
   */
  function createWeekEntry({ team, resources, milestone, completed } = {}) {
    const entry = {};
    const validMilestone = milestone && MILESTONE_ORDER.includes(milestone) ? milestone : undefined;
    const allowsAllocation = validMilestone !== MILESTONE_TYPES.UAT;
    if (allowsAllocation && team && Array.isArray(resources) && resources.length > 0) {
      entry.team = team;
      entry.resources = resources;
    }
    if (validMilestone) entry.milestone = validMilestone;
    if (completed) entry.completed = true;
    return entry;
  }

  /**
   * Indica se una week entry è vuota, cioè priva sia di un'allocazione
   * (team + resources non vuoto) sia di un tipo di milestone sia del flag completed.
   * @param {{team?: string, resources?: string[], milestone?: string, completed?: boolean}|null|undefined} entry
   * @returns {boolean}
   */
  function isWeekEntryEmpty(entry) {
    if (!entry) return true;
    const hasAllocation = !!entry.team && Array.isArray(entry.resources) && entry.resources.length > 0;
    const hasMilestone = !!entry.milestone;
    const hasCompleted = entry.completed === true;
    return !hasAllocation && !hasMilestone && !hasCompleted;
  }

  MP.schema = {
    SCHEMA_VERSION,
    PATHS,
    SEED_TEAM,
    MILESTONE_TYPES,
    MILESTONE_ORDER,
    MILESTONE_LABELS,
    createEmptyManifest,
    createEmptyTeamResources,
    findResourceEntry,
    findTeamByCode,
    flattenResources,
    existingInitials,
    createProjectReferents,
    normalizeProjectReferents,
    createProject,
    createBaseline,
    createTask,
    createWeekEntry,
    isWeekEntryEmpty,
  };
})(window.MP = window.MP || {});
