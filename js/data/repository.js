// Orchestrazione alto livello sopra fs-access.js: carica l'intero dataset in
// memoria a partire dall'handle della cartella dati.
//
// Nota: accediamo sempre a MP.fsAccess.<fn> "sul momento" (mai destrutturato
// una volta sola all'avvio del modulo), così resta possibile sostituire le
// primitive fs-access a runtime (utile per i test automatici, che simulano il
// filesystem senza una vera cartella).
(function (MP) {
  'use strict';

  const { PATHS } = MP.schema;

  async function loadDataset(dirHandle) {
    const warnings = [];

    await MP.legacyMigration.migrateIfNeeded(dirHandle);

    const manifestText = await MP.fsAccess.readTextFile(dirHandle, PATHS.manifest);
    const teamResourcesText = await MP.fsAccess.readTextFile(dirHandle, PATHS.teamResources);

    const projects = new Map();
    const manifest = JSON.parse(manifestText);
    for (const voce of manifest.projects) {
      try {
        const rawText = await MP.fsAccess.readTextFile(dirHandle, voce.file);
        const data = JSON.parse(rawText);
        data.referents = MP.schema.normalizeProjectReferents(data.referents);
        projects.set(voce.file, { data, rawText });
      } catch (e) {
        warnings.push(`Unable to load "${voce.file}" (${voce.name}): ${e.message}`);
      }
    }

    // Ogni oggetto *Meta traccia il testo grezzo letto/scritto per l'ultima
    // volta in questa sessione: è il riferimento usato da save-coordinator.js
    // per capire se un altro utente ha modificato il file nel frattempo
    // (reread-before-write).
    return {
      manifest,
      teamResources: JSON.parse(teamResourcesText),
      projects,
      warnings,
      manifestMeta: { rawText: manifestText },
      teamResourcesMeta: { rawText: teamResourcesText },
    };
  }

  // Scrittura diretta, senza controllo di conflitto: usata da save-coordinator.js
  // (che fa reread-before-write) e da chi non ne ha bisogno (es. backup).
  async function saveProject(dirHandle, file, projectData) {
    const text = JSON.stringify(projectData, null, 2) + '\n';
    await MP.fsAccess.writeTextFile(dirHandle, file, text);
    return text;
  }

  async function saveManifest(dirHandle, manifest) {
    const text = JSON.stringify(manifest, null, 2) + '\n';
    await MP.fsAccess.writeTextFile(dirHandle, PATHS.manifest, text);
    return text;
  }

  async function saveTeamResources(dirHandle, teamResources) {
    const text = JSON.stringify(teamResources, null, 2) + '\n';
    await MP.fsAccess.writeTextFile(dirHandle, PATHS.teamResources, text);
    return text;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function backupTimestamp(date) {
    return (
      `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}` +
      `_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`
    );
  }

  // Copia integrale "punto nel tempo" di manifest/team-resources/tutti i file
  // progetto in backup/AAAAMMGG_HHMMSS/ (§7 spec). Enumera i file progetto
  // direttamente dal disco (non solo dal dataset in memoria), così il backup
  // riflette esattamente lo stato reale della cartella dati, incluse eventuali
  // modifiche manuali esterne all'app. Nessuna trasformazione dei dati.
  // Scritture in parallelo (nessuna dipendenza d'ordine tra i file): riduce la
  // finestra di rischio per il backup automatico su pagehide (vedi app.js), che
  // non può attendere il completamento prima che la pagina venga scaricata.
  async function createBackup(dirHandle, now) {
    const timestamp = backupTimestamp(now || new Date());
    const backupRoot = await MP.fsAccess.ensureSubfolder(dirHandle, PATHS.backupDir);
    const backupFolder = await MP.fsAccess.ensureSubfolder(backupRoot, timestamp);

    const projectFiles = await MP.fsAccess.listJsonFiles(dirHandle, PATHS.projectsDir);

    await Promise.all([
      ...[PATHS.manifest, PATHS.teamResources].map(async (name) => {
        const text = await MP.fsAccess.readTextFile(dirHandle, name);
        await MP.fsAccess.writeTextFile(backupFolder, name, text);
      }),
      ...projectFiles.map(async ({ name }) => {
        const text = await MP.fsAccess.readTextFile(dirHandle, `${PATHS.projectsDir}/${name}`);
        await MP.fsAccess.writeTextFile(backupFolder, `${PATHS.projectsDir}/${name}`, text);
      }),
    ]);

    return { folder: `${PATHS.backupDir}/${timestamp}`, fileCount: 2 + projectFiles.length };
  }

  MP.repository = { loadDataset, saveProject, saveManifest, saveTeamResources, createBackup };
})(window.MP = window.MP || {});
