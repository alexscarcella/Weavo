// Vista carico risorse: per ciascuna risorsa, conteggio task per settimana
// (sostituisce le formule COUNTIF del foglio Excel originale), evidenziando la
// sovrallocazione (conteggio > 1). Sola lettura: il CRUD di team e risorse è
// centralizzato nella pagina dedicata (js/ui/team-risorse/team-risorse-view.js).
(function (MP) {
  'use strict';

  const { getWeeksInRange, formatWeekLabel } = MP.weekUtils;
  const { buildAllocationIndex, findAllocations } = MP.overallocation;

  function headerCell(text, colClass, title) {
    const div = document.createElement('div');
    div.className = `gantt-cell header ${colClass ? 'col-fixed ' + colClass : 'week-cell'}`;
    div.textContent = text;
    if (title) div.title = title;
    return div;
  }

  function fixedCell(text, colClass) {
    const div = document.createElement('div');
    div.className = `gantt-cell col-fixed ${colClass}`;
    const span = document.createElement('span');
    span.className = 'cell-text';
    span.textContent = text;
    span.title = text;
    div.appendChild(span);
    return div;
  }

  function renderResourceLoadView(state) {
    const { dataset } = state;
    const weeks = getWeeksInRange(dataset.manifest.settimane.prima, dataset.manifest.settimane.ultima);
    const index = buildAllocationIndex(dataset);

    const page = document.createElement('div');
    page.className = 'gantt-page';

    const toolbar = document.createElement('div');
    toolbar.className = 'gantt-toolbar';
    const info = document.createElement('span');
    info.className = 'dataset-info';
    info.textContent = 'Carico risorse per settimana — evidenziato quando una risorsa è allocata su più di un task nella stessa settimana (i task conclusi non contano)';
    toolbar.appendChild(info);
    const manageBtn = document.createElement('button');
    manageBtn.type = 'button';
    manageBtn.className = 'btn-nuova-risorsa';
    manageBtn.textContent = 'Gestisci team e risorse →';
    manageBtn.addEventListener('click', () => {
      MP.store.setState((s) => ({ ui: { ...s.ui, vistaCorrente: 'team-risorse' } }));
    });
    toolbar.appendChild(manageBtn);
    page.appendChild(toolbar);

    const risorse = MP.schema.flattenRisorse(dataset.teamRisorsa);
    if (risorse.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'Nessuna risorsa in team-risorse.json.';
      page.appendChild(empty);
      return page;
    }

    const scroll = document.createElement('div');
    scroll.className = 'gantt-scroll';
    const grid = document.createElement('div');
    grid.className = 'gantt-grid';
    grid.style.gridTemplateColumns = `70px 170px repeat(${weeks.length}, 46px)`;

    grid.appendChild(headerCell('Sigla', 'col-1'));
    grid.appendChild(headerCell('Nome', 'col-2'));
    for (const settimana of weeks) {
      grid.appendChild(headerCell(formatWeekLabel(settimana), null, settimana));
    }

    for (const risorsa of risorse) {
      grid.appendChild(fixedCell(risorsa.sigla, 'col-1'));
      grid.appendChild(fixedCell(risorsa.nome, 'col-2'));

      for (const settimana of weeks) {
        const refs = findAllocations(index, risorsa.sigla, settimana);
        const cell = document.createElement('div');
        cell.className = 'gantt-cell week-cell load-cell';
        if (refs.length > 0) {
          cell.textContent = String(refs.length);
          cell.title = refs.map((r) => `${r.progettoNome} / BL ${r.baselineVersione} / ${r.taskNome}`).join('\n');
        }
        if (refs.length > 1) cell.classList.add('overallocated');
        grid.appendChild(cell);
      }
    }

    scroll.appendChild(grid);
    page.appendChild(scroll);
    return page;
  }

  MP.resourceLoadView = { renderResourceLoadView };
})(window.MP = window.MP || {});
