// Migrazione lazy di un data folder ancora su uno schemaVersion precedente.
// Due step incrementali, entrambi scatenati da un unico ingresso
// (migrateIfNeeded) in base alla versione rilevata:
// - v1 (o assente) -> v3: vecchio formato con campi italiani, cartella
//   "progetti/" + file "team-risorse.json", verso il formato inglese attuale
//   ("projects/" + "team-resources.json", campo "completed" al posto di
//   "archiviata"/"archiviato"). Vedi CLAUDE.md "Migrazione dati legacy".
// - v2 -> v3: dati già nel formato inglese attuale (stessi PATHS, nessun
//   rename di file/cartelle) ma con "archived" invece di "completed" su
//   project/baseline — rename di campo introdotto per omogeneizzare il
//   concetto con "completed" a livello task.
//
// I dati non sono critici (rigenerabili da import.js/xlsx o da un backup
// manuale/automatico già esistente nell'app), quindi qui non c'è un backup
// dedicato né gestione esplicita di crash a metà: se qualcosa va storto la
// scrittura di manifest.json per ultimo (vedi migrateIfNeeded) fa da "commit
// point" gratuito — un tentativo interrotto prima di quel punto viene
// semplicemente ripetuto da capo al prossimo avvio, senza conseguenze.
(function (MP) {
  'use strict';

  // Percorsi del vecchio formato: volutamente NON MP.schema.PATHS, che dopo
  // questo refactor punta ai nomi nuovi. Questi restano fissi per sempre,
  // descrivono una forma storica ormai congelata.
  const LEGACY_TEAM_RESOURCES_FILE = 'team-risorse.json';
  const LEGACY_PROJECTS_DIR = 'progetti';

  function transformWeekEntry(oldEntry) {
    return MP.schema.createWeekEntry({
      team: oldEntry && oldEntry.team,
      resources: oldEntry && oldEntry.risorse,
      milestone: oldEntry && oldEntry.milestone,
    });
  }

  function transformWeeksMap(oldSettimane) {
    const weeks = {};
    for (const [iso, entry] of Object.entries(oldSettimane || {})) {
      weeks[iso] = transformWeekEntry(entry);
    }
    return weeks;
  }

  function transformTask(oldTask) {
    return {
      name: oldTask.nome,
      completed: !!oldTask.concluso,
      weeks: transformWeeksMap(oldTask.settimane),
    };
  }

  function transformBaseline(oldBaseline) {
    return {
      version: oldBaseline.versione,
      completed: !!oldBaseline.archiviata,
      task: (oldBaseline.task || []).map(transformTask),
    };
  }

  function transformProject(oldProjectData) {
    return {
      name: oldProjectData.nome,
      referents: MP.schema.normalizeProjectReferents(oldProjectData.team),
      completed: !!oldProjectData.archiviato,
      baseline: (oldProjectData.baseline || []).map(transformBaseline),
    };
  }

  // v2 -> v3: dati già inglesi (PATHS invariati), solo rename di campo su
  // project/baseline. team-resources.json non è toccato da questo step.
  function renameArchivedToCompletedBaseline(oldBaseline) {
    const { archived, ...rest } = oldBaseline;
    return { ...rest, completed: !!archived };
  }

  function renameArchivedToCompletedProject(oldProjectData) {
    const { archived, ...rest } = oldProjectData;
    return {
      ...rest,
      completed: !!archived,
      baseline: (oldProjectData.baseline || []).map(renameArchivedToCompletedBaseline),
    };
  }

  function transformTeamResources(oldTeamRisorsa) {
    return {
      teams: (oldTeamRisorsa.team || []).map((t) => ({
        code: t.codice,
        name: t.nome,
        color: t.colore,
        resources: (t.risorse || []).map((r) => ({ initials: r.sigla, name: r.nome })),
      })),
    };
  }

  function legacyToNewProjectPath(oldFile) {
    return oldFile.replace(new RegExp('^' + LEGACY_PROJECTS_DIR + '/'), MP.schema.PATHS.projectsDir + '/');
  }

  function transformManifest(oldManifest) {
    return {
      schemaVersion: MP.schema.SCHEMA_VERSION,
      weeks: { first: oldManifest.settimane.prima, last: oldManifest.settimane.ultima },
      projects: (oldManifest.progetti || []).map((voce) => ({
        file: legacyToNewProjectPath(voce.file),
        name: voce.nome,
      })),
    };
  }

  // v1 (o schemaVersion assente) -> v3: vecchio formato italiano, file/cartelle legacy.
  async function migrateV1ToV3(dirHandle, oldManifest) {
    const oldTeamRisorsaText = await MP.fsAccess.readTextFile(dirHandle, LEGACY_TEAM_RESOURCES_FILE);
    const oldTeamRisorsa = JSON.parse(oldTeamRisorsaText);

    const oldProjects = [];
    for (const voce of oldManifest.progetti || []) {
      const rawText = await MP.fsAccess.readTextFile(dirHandle, voce.file);
      oldProjects.push({ file: voce.file, data: JSON.parse(rawText) });
    }

    const newManifest = transformManifest(oldManifest);
    const newTeamResources = transformTeamResources(oldTeamRisorsa);
    const newProjects = oldProjects.map(({ file, data }) => ({
      file: legacyToNewProjectPath(file),
      data: transformProject(data),
    }));

    await MP.fsAccess.writeTextFile(
      dirHandle,
      MP.schema.PATHS.teamResources,
      JSON.stringify(newTeamResources, null, 2) + '\n'
    );
    for (const { file, data } of newProjects) {
      await MP.fsAccess.writeTextFile(dirHandle, file, JSON.stringify(data, null, 2) + '\n');
    }
    // manifest.json per ultimo: è il commit point, vedi commento in testa al file.
    await MP.fsAccess.writeTextFile(
      dirHandle,
      MP.schema.PATHS.manifest,
      JSON.stringify(newManifest, null, 2) + '\n'
    );

    await MP.fsAccess.removeFile(dirHandle, LEGACY_TEAM_RESOURCES_FILE);
    await MP.fsAccess.removeDirectory(dirHandle, LEGACY_PROJECTS_DIR);
  }

  // v2 -> v3: dati già inglesi, stessi PATHS/file — solo rename di campo
  // (archived -> completed) su ogni progetto e le sue baseline. team-resources.json
  // non è toccato da questo step.
  async function migrateV2ToV3(dirHandle, oldManifest) {
    const oldProjects = [];
    for (const voce of oldManifest.projects || []) {
      const rawText = await MP.fsAccess.readTextFile(dirHandle, voce.file);
      oldProjects.push({ file: voce.file, data: JSON.parse(rawText) });
    }

    const newProjects = oldProjects.map(({ file, data }) => ({
      file,
      data: renameArchivedToCompletedProject(data),
    }));
    const newManifest = { ...oldManifest, schemaVersion: MP.schema.SCHEMA_VERSION };

    for (const { file, data } of newProjects) {
      await MP.fsAccess.writeTextFile(dirHandle, file, JSON.stringify(data, null, 2) + '\n');
    }
    // manifest.json per ultimo: è il commit point, vedi commento in testa al file.
    await MP.fsAccess.writeTextFile(
      dirHandle,
      MP.schema.PATHS.manifest,
      JSON.stringify(newManifest, null, 2) + '\n'
    );
  }

  /**
   * Se `dirHandle` punta a una cartella dati su uno schemaVersion precedente, la
   * converte sul posto al formato corrente e ritorna `true`. Se è già alla
   * versione corrente, non fa nulla e ritorna `false` (costo: un solo
   * JSON.parse di manifest.json).
   * @param {FileSystemDirectoryHandle} dirHandle
   * @returns {Promise<boolean>}
   */
  async function migrateIfNeeded(dirHandle) {
    const manifestText = await MP.fsAccess.readTextFile(dirHandle, MP.schema.PATHS.manifest);
    const oldManifest = JSON.parse(manifestText);
    if (oldManifest.schemaVersion >= MP.schema.SCHEMA_VERSION) return false;

    if (oldManifest.schemaVersion === 2) {
      await migrateV2ToV3(dirHandle, oldManifest);
    } else {
      await migrateV1ToV3(dirHandle, oldManifest);
    }

    return true;
  }

  MP.legacyMigration = {
    migrateIfNeeded,
    transformManifest,
    transformTeamResources,
    transformProject,
  };
})(window.MP = window.MP || {});
