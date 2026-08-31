// Header condiviso da vista gantt e vista carico risorse: riga info (range
// settimane + conteggio task/progetti/baseline in arrivo, esattamente come la
// vista gantt calcola le proprie righe visibili — vedi MP.ganttView.buildRows)
// più la legenda colori (MP.legend). Le azioni specifiche di una vista (es. "+
// Nuovo progetto" e i toggle "mostra completati" in gantt) vengono passate
// come elemento extra da affiancare sulla stessa riga, per restare "una riga
// come oggi" anche dopo la condivisione tra le due pagine.
(function (MP) {
  'use strict';

  function renderDatasetHeader(state, extraActionsEl) {
    const { dataset } = state;
    // Il filtro multi-progetto agisce solo sulla vista gantt: le viste
    // milestones/resource-load renderizzano griglie proprie, qui ne resta
    // solo il conteggio righe, che per loro va lasciato non filtrato.
    const projectFilter = state.ui.currentView === 'gantt' ? state.ui.projectFilter : null;
    const rows = MP.ganttView.buildRows(dataset, state.ui.showCompletedProjects, state.ui.showCompleted, projectFilter);
    const upcoming = MP.milestones.countUpcomingBaselines(dataset, state.ui.showCompletedProjects);
    const filteredProjects = projectFilter && projectFilter.length;

    const fragment = document.createDocumentFragment();

    const toolbar = document.createElement('div');
    toolbar.className = 'gantt-toolbar';
    const info = document.createElement('span');
    info.className = 'dataset-info';
    // La File System Access API non espone mai il percorso assoluto su disco
    // (sandboxing di piattaforma — vedi CLAUDE.md/app.js), solo il nome della
    // cartella selezionata: è il meglio disponibile come "percorso" dei dati.
    const cartella = state.dirHandle ? state.dirHandle.name : '';
    const projectsLabel = filteredProjects
      ? `${projectFilter.length} of ${dataset.projects.size} projects`
      : `${dataset.projects.size} projects`;
    info.textContent = `${cartella} — ${dataset.manifest.weeks.first} → ${dataset.manifest.weeks.last} — ${rows.length} task rows — ${projectsLabel} — Upcoming: ${upcoming.readyForUat} Ready for UAT, ${upcoming.uat} UAT`;
    toolbar.appendChild(info);
    if (extraActionsEl) toolbar.appendChild(extraActionsEl);
    fragment.appendChild(toolbar);

    fragment.appendChild(MP.legend.renderLegend(state));

    return fragment;
  }

  MP.datasetHeader = { renderDatasetHeader };
})(window.MP = window.MP || {});
