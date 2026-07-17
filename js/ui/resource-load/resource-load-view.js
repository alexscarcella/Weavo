// Vista carico risorse: per ciascuna risorsa, conteggio task per settimana
// (sostituisce le formule COUNTIF del foglio Excel originale). Header (range
// settimane + conteggio task/progetti + legenda colori team) condiviso con la
// vista gantt via MP.datasetHeader — vedi js/ui/common/dataset-header.js.
// Le risorse sono raggruppate per team di appartenenza (colore del team come
// intestazione di gruppo e come barra sulla colonna sigla), con una legenda
// separata per il grado di allocazione (verde = 1, giallo = 2, rosso > 2).
// Sola lettura: il CRUD di team e risorse è centralizzato nella pagina
// dedicata (js/ui/team-risorse/team-risorse-view.js).
(function (MP) {
  'use strict';

  const { getWeeksInRange, formatWeekLabel, getCurrentWeekIso } = MP.weekUtils;
  const { buildAllocationIndex, findAllocations } = MP.overallocation;

  function headerCell(text, colClass, title, extraClass) {
    const div = document.createElement('div');
    div.className = `gantt-cell header ${colClass ? 'col-fixed ' + colClass : 'week-cell'}${extraClass ? ' ' + extraClass : ''}`;
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

  function loadClass(count) {
    if (count === 1) return 'load-1';
    if (count === 2) return 'load-2';
    if (count > 2) return 'load-3plus';
    return null;
  }

  // Riga separatrice piena larghezza che apre un gruppo team: colonne sigla+nome
  // sticky con nome team e swatch colore, il resto della riga come banda tinteggiata.
  function teamHeaderRow(team, weeksCount, currentWeekIndex) {
    const cells = [];
    const header = document.createElement('div');
    header.className = 'gantt-cell col-fixed team-group-header';
    header.style.gridColumn = '1 / span 2';
    const swatch = document.createElement('span');
    swatch.className = 'team-swatch';
    swatch.style.background = team.colore;
    header.appendChild(swatch);
    const label = document.createElement('span');
    label.className = 'cell-text';
    label.textContent = team.nome;
    header.appendChild(label);
    cells.push(header);

    for (let i = 0; i < weeksCount; i++) {
      const band = document.createElement('div');
      band.className = 'gantt-cell week-cell team-group-header-band';
      if (i === currentWeekIndex) band.classList.add('current-week-line');
      cells.push(band);
    }
    return cells;
  }

  function renderResourceLoadView(state) {
    const { dataset } = state;
    const weeks = getWeeksInRange(dataset.manifest.settimane.prima, dataset.manifest.settimane.ultima);
    const index = buildAllocationIndex(dataset);
    const currentWeek = getCurrentWeekIso();
    const currentWeekIndex = weeks.indexOf(currentWeek);

    const page = document.createElement('div');
    page.className = 'gantt-page';

    page.appendChild(MP.datasetHeader.renderDatasetHeader(state));

    const heatLegend = document.createElement('div');
    heatLegend.className = 'legend';
    [
      ['load-1', '1 allocazione'],
      ['load-2', '2 allocazioni'],
      ['load-3plus', '> 2 allocazioni'],
    ].forEach(([cls, testo]) => {
      const item = document.createElement('span');
      item.className = 'legend-item';
      const sw = document.createElement('span');
      sw.className = `legend-swatch ${cls}`;
      item.appendChild(sw);
      item.appendChild(document.createTextNode(testo));
      heatLegend.appendChild(item);
    });
    page.appendChild(heatLegend);

    const teams = dataset.teamRisorsa.team.filter((t) => (t.risorse || []).length > 0);
    if (teams.length === 0) {
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
      grid.appendChild(headerCell(formatWeekLabel(settimana), null, settimana, settimana === currentWeek ? 'current-week current-week-line' : null));
    }

    for (const team of teams) {
      teamHeaderRow(team, weeks.length, currentWeekIndex).forEach((cell) => grid.appendChild(cell));

      for (const risorsa of team.risorse) {
        const col1 = fixedCell(risorsa.sigla, 'col-1');
        col1.classList.add('team-color-bar');
        col1.style.setProperty('--team-bar-color', team.colore);
        grid.appendChild(col1);
        grid.appendChild(fixedCell(risorsa.nome, 'col-2'));

        weeks.forEach((settimana, i) => {
          const refs = findAllocations(index, risorsa.sigla, settimana);
          const cell = document.createElement('div');
          cell.className = 'gantt-cell week-cell load-cell';
          if (refs.length > 0) {
            cell.textContent = String(refs.length);
            cell.title = refs.map((r) => `${r.progettoNome} / BL ${r.baselineVersione} / ${r.taskNome}`).join('\n');
            cell.classList.add(loadClass(refs.length));
          }
          if (i === currentWeekIndex) cell.classList.add('current-week-line');
          grid.appendChild(cell);
        });
      }
    }

    scroll.appendChild(grid);
    page.appendChild(scroll);
    return page;
  }

  MP.resourceLoadView = { renderResourceLoadView };
})(window.MP = window.MP || {});
