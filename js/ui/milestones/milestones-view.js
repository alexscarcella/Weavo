// Vista milestone: densità delle scadenze di rilascio baseline sul calendario.
// Stesse settimane di gantt/carico-risorse (MP.weekUtils.getWeeksInRange) e
// stesso header condiviso (MP.datasetHeader), ma righe ridotte a una per
// baseline (colonne fisse "Attività" + "Baseline", niente Task/Team) — il dato
// mostrato è la settimana di rilascio derivata da MP.milestones (vedi
// js/model/milestones.js) leggendo i task della baseline, mai un editing
// affordance: sola lettura, come carico-risorse. In fondo alla griglia una
// riga di conteggio per settimana e, sotto la griglia (stesso .gantt-scroll,
// per restare allineati durante lo scroll orizzontale), un istogramma a barre
// con lo stesso conteggio.
(function (MP) {
  'use strict';

  const { getWeeksInRange, formatWeekLabel, getCurrentWeekIso } = MP.weekUtils;
  const { computeBaselineMilestones } = MP.milestones;

  function headerCell(text, colClass, title, extraClass) {
    const div = document.createElement('div');
    div.className = `gantt-cell header ${colClass ? 'col-fixed ' + colClass : 'week-cell'}${extraClass ? ' ' + extraClass : ''}`;
    div.textContent = text;
    if (title) div.title = title;
    return div;
  }

  function fixedCell(text, colClass, extraClass) {
    const div = document.createElement('div');
    div.className = `gantt-cell col-fixed ${colClass}${extraClass ? ' ' + extraClass : ''}`;
    const span = document.createElement('span');
    span.className = 'cell-text';
    span.textContent = text;
    span.title = text;
    div.appendChild(span);
    return div;
  }

  function renderMilestonesView(state) {
    const { dataset } = state;
    const weeks = getWeeksInRange(dataset.manifest.settimane.prima, dataset.manifest.settimane.ultima);
    const currentWeek = getCurrentWeekIso();
    const currentWeekIndex = weeks.indexOf(currentWeek);
    const rows = computeBaselineMilestones(dataset, state.ui.mostraArchiviati);

    const weekCounts = new Map();
    let totalRilasci = 0;
    for (const row of rows) {
      if (!row.settimana) continue;
      weekCounts.set(row.settimana, (weekCounts.get(row.settimana) || 0) + 1);
      totalRilasci++;
    }

    const page = document.createElement('div');
    page.className = 'gantt-page';

    const counterEl = document.createElement('span');
    counterEl.className = 'milestone-counter';
    counterEl.textContent = `Totale rilasci nel periodo: ${totalRilasci}`;
    page.appendChild(MP.datasetHeader.renderDatasetHeader(state, counterEl));

    if (totalRilasci === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'Nessuna baseline ha una milestone di rilascio impostata nel periodo.';
      page.appendChild(empty);
      return page;
    }

    const scroll = document.createElement('div');
    scroll.className = 'gantt-scroll';
    const grid = document.createElement('div');
    grid.className = 'gantt-grid';
    grid.style.gridTemplateColumns = `170px 90px repeat(${weeks.length}, 46px)`;

    grid.appendChild(headerCell('Attività', 'col-1'));
    grid.appendChild(headerCell('Baseline', 'col-2'));
    for (const settimana of weeks) {
      grid.appendChild(headerCell(formatWeekLabel(settimana), null, settimana, settimana === currentWeek ? 'current-week current-week-line' : null));
    }

    rows.forEach((row) => {
      const rowClass =
        (row.showProgetto ? ' row-project-start' : '') +
        (row.baselineIndex % 2 === 1 ? ' row-baseline-alt' : '') +
        (row.inconsistent ? ' row-inconsistent' : '');

      grid.appendChild(fixedCell(row.showProgetto ? row.progetto.nome : '', 'col-1', rowClass));
      grid.appendChild(fixedCell(row.baseline.versione, 'col-2', rowClass));

      weeks.forEach((iso, i) => {
        const cell = document.createElement('div');
        cell.className = `gantt-cell week-cell${rowClass}`;
        if (row.settimana === iso) {
          cell.classList.add('milestone');
          const parts = [`${row.progetto.nome} — Baseline ${row.baseline.versione}`];
          if (row.taskNome) parts.push(row.taskNome);
          parts.push(`rilascio ${iso}`);
          if (row.inconsistent) parts.push('date incoerenti tra i task della baseline, da normalizzare');
          cell.title = parts.join(' — ');
        }
        if (i === currentWeekIndex) cell.classList.add('current-week-line');
        grid.appendChild(cell);
      });
    });

    grid.appendChild(fixedCell('Totale', 'col-1'));
    grid.appendChild(fixedCell('rilasci/settimana', 'col-2'));
    weeks.forEach((iso, i) => {
      const cell = document.createElement('div');
      cell.className = 'gantt-cell week-cell';
      const count = weekCounts.get(iso) || 0;
      if (count > 0) {
        cell.textContent = String(count);
        cell.classList.add('milestone-total-cell');
      }
      if (i === currentWeekIndex) cell.classList.add('current-week-line');
      grid.appendChild(cell);
    });

    scroll.appendChild(grid);
    scroll.appendChild(renderHistogram(weeks, weekCounts, currentWeekIndex));
    page.appendChild(scroll);

    return page;
  }

  // Fuori dalla CSS Grid della tabella (grid-auto-rows fisso a 24px, troppo
  // basso per delle barre leggibili): un blocco flex separato, ma dentro lo
  // stesso .gantt-scroll, così scrolla in sincrono orizzontalmente con la
  // griglia sovrastante senza bisogno di codice di sync dedicato.
  function renderHistogram(weeks, weekCounts, currentWeekIndex) {
    const maxCount = Math.max(1, ...weeks.map((iso) => weekCounts.get(iso) || 0));
    const hist = document.createElement('div');
    hist.className = 'milestone-histogram';

    const spacer = document.createElement('div');
    spacer.className = 'milestone-hist-spacer';
    hist.appendChild(spacer);

    weeks.forEach((iso, i) => {
      const count = weekCounts.get(iso) || 0;
      const cell = document.createElement('div');
      cell.className = `milestone-hist-cell${i === currentWeekIndex ? ' current-week-line' : ''}`;
      if (count > 0) {
        const label = document.createElement('span');
        label.className = 'milestone-hist-count';
        label.textContent = String(count);
        cell.appendChild(label);
        const bar = document.createElement('div');
        bar.className = 'milestone-hist-bar';
        bar.style.height = `${Math.round((count / maxCount) * 100)}%`;
        bar.title = `${formatWeekLabel(iso)}: ${count} rilasci`;
        cell.appendChild(bar);
      }
      hist.appendChild(cell);
    });

    return hist;
  }

  MP.milestonesView = { renderMilestonesView };
})(window.MP = window.MP || {});
