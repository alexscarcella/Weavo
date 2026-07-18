// Migrazione lazy del vecchio formato dati (campi italiani, schemaVersion 1,
// cartella "progetti/" + file "team-risorse.json") verso il nuovo formato
// inglese (schemaVersion 2, "projects/" + "team-resources.json"). Vedi
// CLAUDE.md "Migrazione dati legacy" per il contesto completo.
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
      archived: !!oldBaseline.archiviata,
      task: (oldBaseline.task || []).map(transformTask),
    };
  }

  function transformProject(oldProjectData) {
    return {
      name: oldProjectData.nome,
      referents: MP.schema.normalizeProjectReferents(oldProjectData.team),
      archived: !!oldProjectData.archiviato,
      baseline: (oldProjectData.baseline || []).map(transformBaseline),
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

  /**
   * Se `dirHandle` punta a una cartella dati nel vecchio formato (schemaVersion
   * assente o < 2), la converte sul posto al nuovo formato e ritorna `true`.
   * Se è già nel formato corrente, non fa nulla e ritorna `false` (costo:
   * un solo JSON.parse di manifest.json).
   * @param {FileSystemDirectoryHandle} dirHandle
   * @returns {Promise<boolean>}
   */
  async function migrateIfNeeded(dirHandle) {
    const manifestText = await MP.fsAccess.readTextFile(dirHandle, MP.schema.PATHS.manifest);
    const oldManifest = JSON.parse(manifestText);
    if (oldManifest.schemaVersion >= MP.schema.SCHEMA_VERSION) return false;

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

    return true;
  }

  MP.legacyMigration = {
    migrateIfNeeded,
    transformManifest,
    transformTeamResources,
    transformProject,
  };
})(window.MP = window.MP || {});
