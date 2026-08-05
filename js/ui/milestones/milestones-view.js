// Vista milestone: densità delle 2 scadenze condivise di baseline (Ready for
// UAT / UAT — la 3ª tipologia, Task deadline, è per singolo task e resta
// fuori da questo report aggregato, vedi js/model/milestones.js) sul
// calendario. Stesse settimane di gantt/resource-load
// (MP.weekUtils.getWeeksInRange) e stesso header condiviso (MP.datasetHeader),
// ma righe ridotte a una per baseline (colonne fisse "Project" + "Baseline",
// niente Task/Team) — le 2 settimane mostrate per riga sono derivate da
// MP.milestones (vedi js/model/milestones.js) leggendo i task della baseline,
// mai un editing affordance: sola lettura, come resource-load. L'elenco
// puntato copiabile delle sole milestone future (aggregate per mese) vive in
// un popover (MP.modal.showMilestoneList, stesso stile header-con-icona-copia
// della scheda allocazioni di resource-load) aperto dal bottone "Upcoming
// milestones" nella riga info dell'header, non più come blocco fisso in
// pagina. Ordine di rendering della pagina: header → istogramma a barre (una
// per settimana, impilata in 2 segmenti colorati — uno per tipo) → una
// mini-griglia separata (.milestone-totals-grid) con le 2 righe di conteggio
// per settimana (una per tipo), riquadrata/sfondo distinto apposta per non
// essere scambiata per parte del calendario sottostante → calendario a
// griglia (una riga per baseline). Le 3 sezioni condividono lo stesso
// .gantt-scroll (e le stesse larghezze di colonna via gridTemplateColumns)
// per restare allineate durante lo scroll orizzontale.
(function (MP) {
  'use strict';

  const { getWeeksInRange, formatWeekLabel, getCurrentWeekIso } = MP.weekUtils;
  const { computeBaselineMilestones, computeUpcomingMilestonesByMonth } = MP.milestones;
  const { READY_FOR_UAT, UAT } = MP.schema.MILESTONE_TYPES;
  const SHARED_TYPES = [READY_FOR_UAT, UAT];
  const CELL_CLASS = { readyForUat: 'milestone-ready-for-uat', uat: 'milestone-uat' };
  const TOTAL_CELL_CLASS = { readyForUat: 'milestone-total-cell-ready-for-uat', uat: 'milestone-total-cell-uat' };

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

  function buildMilestoneTooltip(row, type, iso) {
    const series = row[type];
    const parts = [`${MP.schema.MILESTONE_LABELS[type]}: ${row.progetto.name} — Baseline ${row.baseline.version}`];
    if (series.taskName) parts.push(series.taskName);
    parts.push(`release ${iso}`);
    if (series.inconsistent) parts.push("inconsistent dates across the baseline's tasks, needs normalizing");
    return parts.join(' — ');
  }

  function renderMilestonesView(state) {
    const { dataset } = state;
    const weeks = getWeeksInRange(dataset.manifest.weeks.first, dataset.manifest.weeks.last);
    const currentWeek = getCurrentWeekIso();
    const currentWeekIndex = weeks.indexOf(currentWeek);
    const rows = computeBaselineMilestones(dataset, state.ui.showCompletedProjects);

    const weekCounts = { readyForUat: new Map(), uat: new Map() };
    const totals = { readyForUat: 0, uat: 0 };
    for (const row of rows) {
      for (const type of SHARED_TYPES) {
        const series = row[type];
        if (!series.settimana) continue;
        weekCounts[type].set(series.settimana, (weekCounts[type].get(series.settimana) || 0) + 1);
        totals[type]++;
      }
    }
    const totalRilasci = totals.readyForUat + totals.uat;

    const page = document.createElement('div');
    page.className = 'gantt-page';

    const counterEl = document.createElement('span');
    counterEl.className = 'milestone-counter';
    counterEl.textContent = `Total releases in period: ${totals.readyForUat} Ready for UAT, ${totals.uat} UAT`;

    const monthGroups = computeUpcomingMilestonesByMonth(dataset, state.ui.showCompletedProjects);
    const listBtn = document.createElement('button');
    listBtn.type = 'button';
    listBtn.className = 'milestone-list-btn';
    listBtn.textContent = '📋 Upcoming milestones';
    listBtn.addEventListener('click', () => MP.modal.showMilestoneList(monthGroups));

    const headerExtra = document.createElement('span');
    headerExtra.className = 'milestone-header-extra';
    headerExtra.appendChild(counterEl);
    headerExtra.appendChild(listBtn);
    page.appendChild(MP.datasetHeader.renderDatasetHeader(state, headerExtra));

    if (totalRilasci === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No baseline has a release milestone set in this period.';
      page.appendChild(empty);
      return page;
    }

    const scroll = document.createElement('div');
    scroll.className = 'gantt-scroll';
    const gridTemplateColumns = `170px 234px repeat(${weeks.length}, 46px)`;
    const grid = document.createElement('div');
    grid.className = 'gantt-grid';
    grid.style.gridTemplateColumns = gridTemplateColumns;

    grid.appendChild(headerCell('Project', 'col-1'));
    grid.appendChild(headerCell('Baseline', 'ms-col-baseline'));
    for (const settimana of weeks) {
      grid.appendChild(headerCell(formatWeekLabel(settimana), null, settimana, settimana === currentWeek ? 'current-week current-week-line' : null));
    }

    rows.forEach((row) => {
      const rowInconsistent = row.readyForUat.inconsistent || row.uat.inconsistent;
      const rowClass =
        (row.showProgetto ? ' row-project-start' : '') +
        (row.baselineIndex % 2 === 1 ? ' row-baseline-alt' : '') +
        (rowInconsistent ? ' row-inconsistent' : '');

      grid.appendChild(fixedCell(row.showProgetto ? row.progetto.name : '', 'col-1', rowClass));
      grid.appendChild(fixedCell(row.baseline.version, 'ms-col-baseline', rowClass));

      weeks.forEach((iso, i) => {
        const cell = document.createElement('div');
        cell.className = `gantt-cell week-cell${rowClass}`;
        const titleParts = [];
        for (const type of SHARED_TYPES) {
          if (row[type].settimana === iso) {
            cell.classList.add(CELL_CLASS[type]);
            titleParts.push(buildMilestoneTooltip(row, type, iso));
          }
        }
        if (titleParts.length) cell.title = titleParts.join(' | ');
        if (i === currentWeekIndex) cell.classList.add('current-week-line');
        grid.appendChild(cell);
      });
    });

    const totalsGrid = document.createElement('div');
    totalsGrid.className = 'gantt-grid milestone-totals-grid';
    totalsGrid.style.gridTemplateColumns = gridTemplateColumns;
    for (const type of SHARED_TYPES) {
      totalsGrid.appendChild(fixedCell(MP.schema.MILESTONE_LABELS[type], 'col-1'));
      totalsGrid.appendChild(fixedCell('releases/week', 'ms-col-baseline'));
      weeks.forEach((iso, i) => {
        const cell = document.createElement('div');
        cell.className = 'gantt-cell week-cell';
        const count = weekCounts[type].get(iso) || 0;
        if (count > 0) {
          cell.textContent = String(count);
          cell.classList.add('milestone-total-cell', TOTAL_CELL_CLASS[type]);
        }
        if (i === currentWeekIndex) cell.classList.add('current-week-line');
        totalsGrid.appendChild(cell);
      });
    }

    scroll.appendChild(renderHistogram(weeks, weekCounts, currentWeekIndex));
    scroll.appendChild(totalsGrid);
    scroll.appendChild(grid);
    page.appendChild(scroll);

    return page;
  }

  // Fuori dalla CSS Grid della tabella (grid-auto-rows fisso a 24px, troppo
  // basso per delle barre leggibili): un blocco flex separato, ma dentro lo
  // stesso .gantt-scroll, così scrolla in sincrono orizzontalmente con la
  // griglia sovrastante senza bisogno di codice di sync dedicato. Una barra
  // per settimana, impilata in 2 segmenti colorati (Ready for UAT in basso,
  // UAT sopra) proporzionali ai rispettivi conteggi — mai più di una barra per
  // settimana, quindi niente problemi di larghezza dentro i 46px della colonna.
  function renderHistogram(weeks, weekCounts, currentWeekIndex) {
    const totalFor = (iso) => (weekCounts.readyForUat.get(iso) || 0) + (weekCounts.uat.get(iso) || 0);
    const maxCount = Math.max(1, ...weeks.map(totalFor));
    const hist = document.createElement('div');
    hist.className = 'milestone-histogram';

    const spacer = document.createElement('div');
    spacer.className = 'milestone-hist-spacer';
    hist.appendChild(spacer);

    weeks.forEach((iso, i) => {
      const readyCount = weekCounts.readyForUat.get(iso) || 0;
      const uatCount = weekCounts.uat.get(iso) || 0;
      const total = readyCount + uatCount;
      const cell = document.createElement('div');
      cell.className = `milestone-hist-cell${i === currentWeekIndex ? ' current-week-line' : ''}`;
      if (total > 0) {
        const label = document.createElement('span');
        label.className = 'milestone-hist-count';
        label.textContent = String(total);
        cell.appendChild(label);
        const bar = document.createElement('div');
        bar.className = 'milestone-hist-bar';
        bar.style.height = `${Math.round((total / maxCount) * 100)}%`;
        bar.title = `${formatWeekLabel(iso)}: ${readyCount} Ready for UAT, ${uatCount} UAT`;
        if (readyCount > 0) {
          const seg = document.createElement('div');
          seg.className = 'milestone-hist-seg-ready';
          seg.style.flexGrow = String(readyCount);
          bar.appendChild(seg);
        }
        if (uatCount > 0) {
          const seg = document.createElement('div');
          seg.className = 'milestone-hist-seg-uat';
          seg.style.flexGrow = String(uatCount);
          bar.appendChild(seg);
        }
        cell.appendChild(bar);
      }
      hist.appendChild(cell);
    });

    return hist;
  }

  MP.milestonesView = { renderMilestonesView };
})(window.MP = window.MP || {});
