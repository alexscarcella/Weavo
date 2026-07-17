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

  function createEmptyManifest(primaSettimana) {
    return {
      schemaVersion: SCHEMA_VERSION,
      settimane: { prima: primaSettimana, ultima: primaSettimana },
      progetti: [],
    };
  }

  function createEmptyTeamRisorsa(withSeed = true) {
    return { team: withSeed ? SEED_TEAM.map((t) => ({ ...t, risorse: [] })) : [] };
  }

  // Cerca una risorsa per sigla in tutti i team (le sigle sono uniche a
  // livello globale, non solo all'interno del team). Ritorna { team, risorsa }
  // o null se non trovata.
  function findResourceEntry(teamRisorsa, sigla) {
    for (const team of teamRisorsa.team) {
      const risorsa = (team.risorse || []).find((r) => r.sigla === sigla);
      if (risorsa) return { team, risorsa };
    }
    return null;
  }

  function findTeamByCodice(teamRisorsa, codice) {
    return teamRisorsa.team.find((t) => t.codice === codice);
  }

  // Lista piatta di tutte le risorse di tutti i team, con il team di
  // appartenenza denormalizzato su ogni riga: comoda per le viste che non
  // ragionano per team (vista carico risorse, insiemi di sigle valide).
  function flattenRisorse(teamRisorsa) {
    const result = [];
    for (const team of teamRisorsa.team) {
      for (const risorsa of team.risorse || []) {
        result.push({ sigla: risorsa.sigla, nome: risorsa.nome, teamCodice: team.codice });
      }
    }
    return result;
  }

  function existingSigle(teamRisorsa) {
    return new Set(flattenRisorse(teamRisorsa).map((r) => r.sigla));
  }

  function createProject(nome, team = '') {
    return { nome, team, archiviato: false, baseline: [] };
  }

  function createBaseline(versione) {
    return { versione, task: [] };
  }

  function createTask(nome) {
    return { nome, concluso: false, settimane: {} };
  }

  // Applica la regola di coerenza decisa per il popover di editing: un'allocazione
  // (team + risorse) è valida solo se entrambe le parti sono presenti; altrimenti
  // resta solo l'eventuale flag milestone (mai uno stato tipo {team:"dev", risorse:[]}).
  function createWeekEntry({ team, risorse, milestone } = {}) {
    const entry = {};
    if (team && Array.isArray(risorse) && risorse.length > 0) {
      entry.team = team;
      entry.risorse = risorse;
    }
    if (milestone) entry.milestone = true;
    return entry;
  }

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
    createProject,
    createBaseline,
    createTask,
    createWeekEntry,
    isWeekEntryEmpty,
  };
})(window.MP = window.MP || {});
