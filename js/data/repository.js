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

    const manifestText = await MP.fsAccess.readTextFile(dirHandle, PATHS.manifest);
    const teamRisorsaText = await MP.fsAccess.readTextFile(dirHandle, PATHS.teamRisorsa);

    const progetti = new Map();
    const manifest = JSON.parse(manifestText);
    for (const voce of manifest.progetti) {
      try {
        const rawText = await MP.fsAccess.readTextFile(dirHandle, voce.file);
        const data = JSON.parse(rawText);
        data.team = MP.schema.normalizeProjectTeam(data.team);
        progetti.set(voce.file, { data, rawText });
      } catch (e) {
        warnings.push(`Impossibile caricare "${voce.file}" (${voce.nome}): ${e.message}`);
      }
    }

    // Ogni oggetto *Meta traccia il testo grezzo letto/scritto per l'ultima
    // volta in questa sessione: è il riferimento usato da save-coordinator.js
    // per capire se un altro utente ha modificato il file nel frattempo
    // (reread-before-write).
    return {
      manifest,
      teamRisorsa: JSON.parse(teamRisorsaText),
      progetti,
      warnings,
      manifestMeta: { rawText: manifestText },
      teamRisorsaMeta: { rawText: teamRisorsaText },
    };
  }

  // Scrittura diretta, senza controllo di conflitto: usata da save-coordinator.js
  // (che fa reread-before-write) e da chi non ne ha bisogno (es. backup).
  async function saveProject(dirHandle, file, progettoData) {
    const text = JSON.stringify(progettoData, null, 2) + '\n';
    await MP.fsAccess.writeTextFile(dirHandle, file, text);
    return text;
  }

  async function saveManifest(dirHandle, manifest) {
    const text = JSON.stringify(manifest, null, 2) + '\n';
    await MP.fsAccess.writeTextFile(dirHandle, PATHS.manifest, text);
    return text;
  }

  async function saveTeamRisorsa(dirHandle, teamRisorsa) {
    const text = JSON.stringify(teamRisorsa, null, 2) + '\n';
    await MP.fsAccess.writeTextFile(dirHandle, PATHS.teamRisorsa, text);
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

  // Copia integrale "punto nel tempo" di manifest/team-risorse/tutti i file
  // progetto in backup/AAAAMMGG_HHMMSS/ (§7 spec). Enumera i file progetto
  // direttamente dal disco (non solo dal dataset in memoria), così il backup
  // riflette esattamente lo stato reale della cartella dati, incluse eventuali
  // modifiche manuali esterne all'app. Nessuna trasformazione dei dati.
  async function createBackup(dirHandle, now) {
    const timestamp = backupTimestamp(now || new Date());
    const backupRoot = await MP.fsAccess.ensureSubfolder(dirHandle, PATHS.backupDir);
    const backupFolder = await MP.fsAccess.ensureSubfolder(backupRoot, timestamp);

    for (const name of [PATHS.manifest, PATHS.teamRisorsa]) {
      const text = await MP.fsAccess.readTextFile(dirHandle, name);
      await MP.fsAccess.writeTextFile(backupFolder, name, text);
    }

    const progettiFiles = await MP.fsAccess.listJsonFiles(dirHandle, PATHS.progettiDir);
    for (const { name } of progettiFiles) {
      const text = await MP.fsAccess.readTextFile(dirHandle, `${PATHS.progettiDir}/${name}`);
      await MP.fsAccess.writeTextFile(backupFolder, `${PATHS.progettiDir}/${name}`, text);
    }

    return { folder: `${PATHS.backupDir}/${timestamp}`, fileCount: 2 + progettiFiles.length };
  }

  MP.repository = { loadDataset, saveProject, saveManifest, saveTeamRisorsa, createBackup };
})(window.MP = window.MP || {});
