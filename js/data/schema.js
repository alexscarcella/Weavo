// Riferimento unico per lo schema dati (manifest/team-risorse/progetti).
// Usato sia dall'app runtime sia, in futuro, dallo script di import Excel.
// Nessun elenco qui rappresenta un vincolo "hardcoded" per l'app: SEED_TEAM
// è solo un contenuto proposto alla creazione di un dataset vuoto, liberamente
// modificabile dall'utente in team-risorse.json subito dopo.
//
// Un "team" è l'unica anagrafica di raggruppamento: ogni risorsa appartiene
// a esattamente un team (relazione 1 team -> N risorse), annidata dentro il
// team stesso in team-risorse.json. Non esiste più un'anagrafica risorse
// indipendente dal team.
//
// Niente `import`/`export`: caricato come script classico (namespace globale
// window.MP) perché type="module" viene bloccato da CORS quando index.html è
// aperto direttamente da file:// (verificato), e la distribuzione richiede
// "doppio click su index.html, nessun server".
(function (MP) {
  'use strict';

  const SCHEMA_VERSION = 1;

  const PATHS = {
    manifest: 'manifest.json',
    teamRisorsa: 'team-risorse.json',
    progettiDir: 'progetti',
    backupDir: 'backup',
  };

  const SEED_TEAM = [
    { codice: 'dev', nome: 'Sviluppo', colore: '#00B050' },
    { codice: 'vv', nome: 'V&V', colore: '#FFC000' },
    { codice: 'devops', nome: 'DevOps', colore: '#2E86FF' },
    { codice: 'run', nome: 'Team Run', colore: '#8E44AD' },
    { codice: 'build', nome: 'Team Build', colore: '#D4AC0D' },
  ];

  /**
   * Crea la forma vuota di manifest.json per un dataset nuovo: nessun progetto,
   * range settimane collassato su un'unica settimana di partenza (prima === ultima).
   * @param {string} primaSettimana - ISO date (lunedì) della prima/unica settimana.
   * @returns {{schemaVersion: number, settimane: {prima: string, ultima: string}, progetti: Array}}
   */
  function createEmptyManifest(primaSettimana) {
    return {
      schemaVersion: SCHEMA_VERSION,
      settimane: { prima: primaSettimana, ultima: primaSettimana },
      progetti: [],
    };
  }

  /**
   * Crea la forma vuota di team-risorse.json per un dataset nuovo.
   * @param {boolean} [withSeed=true] - se true, precompila con SEED_TEAM (team senza
   *   risorse) come punto di partenza suggerito; l'utente resta libero di modificarlo
   *   subito dopo nella pagina team/risorse. Se false, parte da nessun team.
   * @returns {{team: Array}}
   */
  function createEmptyTeamRisorsa(withSeed = true) {
    return { team: withSeed ? SEED_TEAM.map((t) => ({ ...t, risorse: [] })) : [] };
  }

  /**
   * Cerca una risorsa per sigla in tutti i team (le sigle sono uniche a
   * livello globale, non solo all'interno del team).
   * @param {{team: Array}} teamRisorsa - dataset team-risorse.json.
   * @param {string} sigla - sigla della risorsa da cercare.
   * @returns {{team: Object, risorsa: Object}|null} il team e la risorsa trovati,
   *   o null se la sigla non esiste in nessun team.
   */
  function findResourceEntry(teamRisorsa, sigla) {
    for (const team of teamRisorsa.team) {
      const risorsa = (team.risorse || []).find((r) => r.sigla === sigla);
      if (risorsa) return { team, risorsa };
    }
    return null;
  }

  /**
   * Cerca un team per codice.
   * @param {{team: Array}} teamRisorsa - dataset team-risorse.json.
   * @param {string} codice - codice del team (es. "dev", "vv"); non è un enum
   *   fisso nel codice, è definito dinamicamente dal contenuto di team-risorse.json.
   * @returns {Object|undefined} il team trovato, o undefined se nessun team ha quel codice.
   */
  function findTeamByCodice(teamRisorsa, codice) {
    return teamRisorsa.team.find((t) => t.codice === codice);
  }

  /**
   * Lista piatta di tutte le risorse di tutti i team, con il team di
   * appartenenza denormalizzato su ogni riga: comoda per le viste che non
   * ragionano per team (vista carico risorse, insiemi di sigle valide).
   * @param {{team: Array}} teamRisorsa - dataset team-risorse.json.
   * @returns {Array<{sigla: string, nome: string, teamCodice: string}>}
   */
  function flattenRisorse(teamRisorsa) {
    const result = [];
    for (const team of teamRisorsa.team) {
      for (const risorsa of team.risorse || []) {
        result.push({ sigla: risorsa.sigla, nome: risorsa.nome, teamCodice: team.codice });
      }
    }
    return result;
  }

  /**
   * Insieme di tutte le sigle esistenti in team-risorse.json, a prescindere dal team.
   * Usato per distinguere una sigla valida da un riferimento orfano nei task.
   * @param {{team: Array}} teamRisorsa - dataset team-risorse.json.
   * @returns {Set<string>}
   */
  function existingSigle(teamRisorsa) {
    return new Set(flattenRisorse(teamRisorsa).map((r) => r.sigla));
  }

  /**
   * Crea la struttura dei referenti/team di un progetto. `solutionAnalyst`/`vvReference`
   * contengono la `sigla` di una risorsa di team-risorse.json (o '' se non assegnato) — mai un
   * oggetto denormalizzato, il nome si risolve al volo via `findResourceEntry`.
   * @param {Object} [options]
   * @param {string} [options.projectManager='']
   * @param {string} [options.projectEngineer='']
   * @param {string} [options.solutionAnalyst=''] - sigla risorsa.
   * @param {string} [options.vvReference=''] - sigla risorsa.
   * @param {string} [options.note='']
   * @returns {{projectManager: string, projectEngineer: string, solutionAnalyst: string, vvReference: string, note: string}}
   */
  function createProjectTeamInfo({ projectManager = '', projectEngineer = '', solutionAnalyst = '', vvReference = '', note = '' } = {}) {
    return { projectManager, projectEngineer, solutionAnalyst, vvReference, note };
  }

  /**
   * Normalizza il campo `team` di un progetto letto da disco: i dati legacy (stringa libera,
   * formato pre-struttura) vengono migrati in `note`; un oggetto già nel nuovo formato viene
   * ripassato per completare eventuali chiavi mancanti. Usato in `repository.loadDataset` come
   * migrazione lazy "self-heal on touch" (si riscrive nel nuovo formato al primo salvataggio).
   * @param {string|Object|null|undefined} team - valore letto da progetti/*.json.
   * @returns {{projectManager: string, projectEngineer: string, solutionAnalyst: string, vvReference: string, note: string}}
   */
  function normalizeProjectTeam(team) {
    if (typeof team === 'string') return createProjectTeamInfo({ note: team });
    return createProjectTeamInfo(team || {});
  }

  /**
   * Crea un nuovo progetto vuoto (nessuna baseline).
   * @param {string} nome - nome del progetto.
   * @param {Object} [team] - referenti/team di progetto, vedi `createProjectTeamInfo`.
   * @returns {{nome: string, team: Object, archiviato: boolean, baseline: Array}}
   */
  function createProject(nome, team = createProjectTeamInfo()) {
    return { nome, team, archiviato: false, baseline: [] };
  }

  /**
   * Crea una nuova baseline/release vuota (nessun task).
   * @param {string} versione - identificativo/versione della baseline.
   * @returns {{versione: string, task: Array}}
   */
  function createBaseline(versione) {
    return { versione, task: [] };
  }

  /**
   * Crea un nuovo task vuoto (nessuna settimana allocata), non concluso.
   * @param {string} nome - nome del task.
   * @returns {{nome: string, concluso: boolean, settimane: Object}}
   */
  function createTask(nome) {
    return { nome, concluso: false, settimane: {} };
  }

  /**
   * Costruisce una week entry (task.settimane[iso]) applicando la regola di
   * coerenza decisa per il popover di editing: un'allocazione (team + risorse)
   * è valida solo se entrambe le parti sono presenti; altrimenti resta solo
   * l'eventuale flag milestone (mai uno stato parziale tipo {team:"dev", risorse:[]}).
   * Va sempre usata al posto di costruire l'oggetto a mano.
   * @param {Object} [options]
   * @param {string} [options.team] - codice team dell'allocazione.
   * @param {string[]} [options.risorse] - sigle delle risorse allocate.
   * @param {boolean} [options.milestone] - flag di rilascio baseline su questa settimana.
   * @returns {{team?: string, risorse?: string[], milestone?: boolean}}
   */
  function createWeekEntry({ team, risorse, milestone } = {}) {
    const entry = {};
    if (team && Array.isArray(risorse) && risorse.length > 0) {
      entry.team = team;
      entry.risorse = risorse;
    }
    if (milestone) entry.milestone = true;
    return entry;
  }

  /**
   * Indica se una week entry è vuota, cioè priva sia di un'allocazione
   * (team + risorse non vuoto) sia del flag milestone.
   * @param {{team?: string, risorse?: string[], milestone?: boolean}|null|undefined} entry
   * @returns {boolean}
   */
  function isWeekEntryEmpty(entry) {
    if (!entry) return true;
    const hasAllocazione = !!entry.team && Array.isArray(entry.risorse) && entry.risorse.length > 0;
    const hasMilestone = entry.milestone === true;
    return !hasAllocazione && !hasMilestone;
  }

  MP.schema = {
    SCHEMA_VERSION,
    PATHS,
    SEED_TEAM,
    createEmptyManifest,
    createEmptyTeamRisorsa,
    findResourceEntry,
    findTeamByCodice,
    flattenRisorse,
    existingSigle,
    createProjectTeamInfo,
    normalizeProjectTeam,
    createProject,
    createBaseline,
    createTask,
    createWeekEntry,
    isWeekEntryEmpty,
  };
})(window.MP = window.MP || {});
