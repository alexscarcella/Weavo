// Punto unico di scrittura "sicura": rilegge il file su disco subito prima di
// scrivere e, se il contenuto è cambiato rispetto all'ultimo testo noto in
// sessione (dataRef.rawText), chiede conferma via modal prima di sovrascrivere
// (§6.4 spec). Aggiorna dataRef.rawText dopo ogni scrittura riuscita, cosicché
// i controlli successivi confrontino sempre contro l'ultima versione scritta da
// questa sessione, non contro il caricamento iniziale.
(function (MP) {
  'use strict';

  async function withConflictCheck({ dirHandle, path, dataRef, writeFn, label }) {
    let diskText = null;
    try {
      diskText = await MP.fsAccess.readTextFile(dirHandle, path);
    } catch (e) {
      diskText = null; // file assente (es. cancellato): non è un conflitto di contenuto
    }
    if (diskText !== null && diskText !== dataRef.rawText) {
      const proceed = await MP.modal.confirmConflict({ label, path });
      if (!proceed) return false;
    }
    const text = await writeFn();
    dataRef.rawText = text;
    return true;
  }

  function saveProject(state, file) {
    const entry = state.dataset.progetti.get(file);
    return withConflictCheck({
      dirHandle: state.dirHandle,
      path: file,
      dataRef: entry,
      writeFn: () => MP.repository.saveProject(state.dirHandle, file, entry.data),
      label: `progetto "${entry.data.nome}"`,
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

  function saveTeamRisorsa(state) {
    const dataRef = state.dataset.teamRisorsaMeta;
    return withConflictCheck({
      dirHandle: state.dirHandle,
      path: MP.schema.PATHS.teamRisorsa,
      dataRef,
      writeFn: () => MP.repository.saveTeamRisorsa(state.dirHandle, state.dataset.teamRisorsa),
      label: 'team-risorse.json',
    });
  }

  MP.saveCoordinator = { saveProject, saveManifest, saveTeamRisorsa };
})(window.MP = window.MP || {});
