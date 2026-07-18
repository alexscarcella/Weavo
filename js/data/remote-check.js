// Rilevazione "soft" di modifiche sul disco fuori dal momento del salvataggio:
// a differenza di save-coordinator.js (che rilegge un file solo appena prima di
// scriverlo, per decidere se bloccare quella specifica scrittura), qui si rileggono
// passivamente tutti i file noti del dataset per dare un preavviso prima ancora di
// iniziare a editare — nessuna scrittura, nessun modal bloccante, solo un elenco di
// cosa è cambiato. Deliberatamente senza stato/timer propri: è invocata da app.js
// al ritorno di focus sulla scheda (mai da un setInterval), così non c'è alcun I/O
// periodico in background mentre la scheda resta inattiva o comunque a fuoco senza
// cambi di visibilità — vedi il listener `visibilitychange` in app.js.
(function (MP) {
  'use strict';

  async function findChangedFiles(state) {
    const { dirHandle, dataset } = state;
    const checks = [
      { path: MP.schema.PATHS.manifest, label: 'manifest.json', dataRef: dataset.manifestMeta },
      { path: MP.schema.PATHS.teamResources, label: 'team-resources.json', dataRef: dataset.teamResourcesMeta },
      ...Array.from(dataset.projects.entries()).map(([file, entry]) => ({
        path: file,
        label: `project "${entry.data.name}"`,
        dataRef: entry,
      })),
    ];
    const results = await Promise.all(checks.map(async ({ path, label, dataRef }) => {
      const diskText = await MP.repository.readTextFileOrNull(dirHandle, path);
      const changed = diskText !== null && diskText !== dataRef.rawText;
      return changed ? { path, label } : null;
    }));
    return results.filter(Boolean);
  }

  MP.remoteCheck = { findChangedFiles };
})(window.MP = window.MP || {});
