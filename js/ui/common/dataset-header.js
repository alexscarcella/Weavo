// Header condiviso da vista gantt e vista carico risorse: riga info (range
// settimane + conteggio task/progetti, esattamente come la vista gantt calcola
// le proprie righe visibili — vedi MP.ganttView.buildRows) più la legenda
// colori (MP.legend). Le azioni specifiche di una vista (es. "+ Nuovo
// progetto" e i toggle archiviati/conclusi in gantt) vengono passate come
// elemento extra da affiancare sulla stessa riga, per restare "una riga come
// oggi" anche dopo la condivisione tra le due pagine.
(function (MP) {
  'use strict';

  function renderDatasetHeader(state, extraActionsEl) {
    const { dataset } = state;
    const rows = MP.ganttView.buildRows(dataset, state.ui.mostraArchiviati, state.ui.mostraConclusi);

    const fragment = document.createDocumentFragment();

    const toolbar = document.createElement('div');
    toolbar.className = 'gantt-toolbar';
    const info = document.createElement('span');
    info.className = 'dataset-info';
    info.textContent = `${dataset.manifest.settimane.prima} → ${dataset.manifest.settimane.ultima} — ${rows.length} righe task — ${dataset.progetti.size} progetti`;
    toolbar.appendChild(info);
    if (extraActionsEl) toolbar.appendChild(extraActionsEl);
    fragment.appendChild(toolbar);

    fragment.appendChild(MP.legend.renderLegend(state));

    return fragment;
  }

  MP.datasetHeader = { renderDatasetHeader };
})(window.MP = window.MP || {});
