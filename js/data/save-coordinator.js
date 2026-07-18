// Punto unico di scrittura "sicura": rilegge il file su disco subito prima di
// scrivere e, se il contenuto è cambiato rispetto all'ultimo testo noto in
// sessione (dataRef.rawText), chiede conferma via modal prima di sovrascrivere
// (§6.4 spec), mostrando un riassunto di cosa è cambiato (MP.conflictDiff, vedi
// quel file) per una decisione informata. Aggiorna dataRef.rawText dopo ogni
// scrittura riuscita, cosicché i controlli successivi confrontino sempre contro
// l'ultima versione scritta da questa sessione, non contro il caricamento iniziale.
(function (MP) {
  'use strict';

  async function withConflictCheck({ dirHandle, path, dataRef, writeFn, label }) {
    const diskText = await MP.repository.readTextFileOrNull(dirHandle, path);
    if (diskText !== null && diskText !== dataRef.rawText) {
      const diffLines = MP.conflictDiff.summarize(path, dataRef.rawText, diskText);
      const proceed = await MP.modal.confirmConflict({ label, path, diffLines });
      if (!proceed) return false;
    }
    const text = await writeFn();
    dataRef.rawText = text;
    return true;
  }

  function saveProject(state, file) {
    const entry = state.dataset.projects.get(file);
    return withConflictCheck({
      dirHandle: state.dirHandle,
      path: file,
      dataRef: entry,
      writeFn: () => MP.repository.saveProject(state.dirHandle, file, entry.data),
      label: `project "${entry.data.name}"`,
    });
  }

  function saveManifest(state) {
    const dataRef = state.dataset.manifestMeta;
    return withConflictCheck({
      dirHandle: state.dirHandle,
      path: MP.schema.PATHS.manifest,
      dataRef,
      writeFn: () => MP.repository.saveManifest(state.dirHandle, state.dataset.manifest),
      label: 'manifest.json',
    });
  }

  function saveTeamResources(state) {
    const dataRef = state.dataset.teamResourcesMeta;
    return withConflictCheck({
      dirHandle: state.dirHandle,
      path: MP.schema.PATHS.teamResources,
      dataRef,
      writeFn: () => MP.repository.saveTeamResources(state.dirHandle, state.dataset.teamResources),
      label: 'team-resources.json',
    });
  }

  MP.saveCoordinator = { saveProject, saveManifest, saveTeamResources };
})(window.MP = window.MP || {});
