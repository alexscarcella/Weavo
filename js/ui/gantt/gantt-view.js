// Vista gantt: griglia compatta con colonne e intestazione bloccate (freeze pane via
// CSS Grid + position: sticky, un solo scroll context).
(function (MP) {
  'use strict';

  const { getWeeksInRange, formatWeekLabel } = MP.weekUtils;
  const { renderTaskRow } = MP.ganttRow;
  const { renderLegend } = MP.legend;
  const { findOrphanTeam, findOrphanRisorse, findTeamMismatches } = MP.validation;

  // Un progetto senza baseline, o una baseline senza task (visibili — vedi
  // mostraConclusi), non deve sparire dal gantt: senza una riga non ci
  // sarebbe modo di raggiungerne il menu "⋮" per aggiungere la prima
  // baseline/task (righe segnaposto con baseline/task null).
  function buildRows(dataset, mostraArchiviati, mostraConclusi) {
    const rows = [];
    let projectIndex = 0;
    for (const voce of dataset.manifest.progetti) {
      const entry = dataset.progetti.get(voce.file);
      if (!entry) continue;
      const progetto = entry.data;
      if (progetto.archiviato && !mostraArchiviati) continue;

      const pIdx = projectIndex++;

      if (progetto.baseline.length === 0) {
        rows.push({ progetto, baseline: null, task: null, file: voce.file, showProgetto: true, showBaseline: false, projectIndex: pIdx, baselineIndex: 0 });
        continue;
      }

      progetto.baseline.forEach((baseline, bi) => {
        const taskVisibili = baseline.task.filter((t) => mostraConclusi || !t.concluso);
        if (taskVisibili.length === 0) {
          rows.push({ progetto, baseline, task: null, file: voce.file, showProgetto: bi === 0, showBaseline: true, projectIndex: pIdx, baselineIndex: bi });
          return;
        }
        taskVisibili.forEach((task, ti) => {
          rows.push({
            progetto,
            baseline,
            task,
            file: voce.file,
            showProgetto: bi === 0 && ti === 0,
            showBaseline: ti === 0,
            projectIndex: pIdx,
            baselineIndex: bi,
          });
        });
      });
    }
    return rows;
  }

  async function handleCellSaved({ state, file, task, settimana, newEntry }) {
    if (MP.schema.isWeekEntryEmpty(newEntry)) {
      delete task.settimane[settimana];
    } else {
      task.settimane[settimana] = newEntry;
    }
    try {
      await MP.saveCoordinator.saveProject(state, file);
      MP.store.setState({}); // dataset mutato in place: basta ri-notificare i subscriber
    } catch (e) {
      window.alert(`Errore nel salvataggio di "${file}": ${e.message}`);
    }
  }

  // Applica la stessa allocazione (team+risorse) a tutte le settimane del
  // range selezionato (vedi cell-selection.js), con un solo salvataggio.
  async function handleBulkCellsSaved({ state, file, task, weeksRange, newEntry }) {
    for (const settimana of weeksRange) {
      if (MP.schema.isWeekEntryEmpty(newEntry)) {
        delete task.settimane[settimana];
      } else {
        task.settimane[settimana] = newEntry;
      }
    }
    try {
      await MP.saveCoordinator.saveProject(state, file);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Errore nel salvataggio di "${file}": ${e.message}`);
    }
  }

  function headerCell(text, colClass, title) {
    const div = document.createElement('div');
    div.className = `gantt-cell header ${colClass ? 'col-fixed ' + colClass : 'week-cell'}`;
    div.textContent = text;
    if (title) div.title = title;
    return div;
  }

  function renderWarnings(dataset) {
    const orfaniTeam = findOrphanTeam(dataset);
    const orfaniRisorsa = findOrphanRisorse(dataset);
    const mismatch = findTeamMismatches(dataset);
    const righe = [
      ...dataset.warnings,
      ...orfaniTeam.map((o) => `Team "${o.valore}" non definito — ${o.progetto} / BL ${o.baseline} / ${o.task} / ${o.settimana}`),
      ...orfaniRisorsa.map((o) => `Sigla "${o.valore}" non in team-risorse.json — ${o.progetto} / BL ${o.baseline} / ${o.task} / ${o.settimana}`),
      ...mismatch.map((m) => `Risorsa "${m.sigla}" è del team "${m.teamAssegnato}" ma qui allocata come "${m.teamCella}" — da regolarizzare — ${m.progetto} / BL ${m.baseline} / ${m.task} / ${m.settimana}`),
    ];
    if (!righe.length) return null;
    const div = document.createElement('div');
    div.className = 'warnings';
    div.innerHTML = `<strong>Avvisi (${righe.length}):</strong><ul>${righe.map((r) => `<li>${r}</li>`).join('')}</ul>`;
    return div;
  }

  function renderGanttView(state) {
    const { dataset } = state;
    const weeks = getWeeksInRange(dataset.manifest.settimane.prima, dataset.manifest.settimane.ultima);
    const teamMap = new Map(dataset.teamRisorsa.team.map((t) => [t.codice, t]));
    const risorseFlat = MP.schema.flattenRisorse(dataset.teamRisorsa);
    const sigleValide = new Set(risorseFlat.map((r) => r.sigla));
    const siglaTeamMap = new Map(risorseFlat.map((r) => [r.sigla, r.teamCodice]));
    const allocationIndex = MP.overallocation.buildAllocationIndex(dataset);
    const rows = buildRows(dataset, state.ui.mostraArchiviati, state.ui.mostraConclusi);

    const page = document.createElement('div');
    page.className = 'gantt-page';

    const toolbar = document.createElement('div');
    toolbar.className = 'gantt-toolbar';
    toolbar.innerHTML = `
      <span class="dataset-info">${dataset.manifest.settimane.prima} → ${dataset.manifest.settimane.ultima}
        — ${rows.length} righe task — ${dataset.progetti.size} progetti</span>
      <span class="toolbar-actions">
        <button type="button" class="btn-nuovo-progetto">+ Nuovo progetto</button>
        <label class="toggle-archiviati">
          <input type="checkbox" id="chk-archiviati" ${state.ui.mostraArchiviati ? 'checked' : ''}>
          Mostra archiviati
        </label>
        <label class="toggle-conclusi">
          <input type="checkbox" id="chk-conclusi" ${state.ui.mostraConclusi ? 'checked' : ''}>
          Mostra conclusi
        </label>
      </span>`;
    toolbar.querySelector('#chk-archiviati').addEventListener('change', (e) => {
      MP.store.setState((s) => ({ ui: { ...s.ui, mostraArchiviati: e.target.checked } }));
    });
    toolbar.querySelector('#chk-conclusi').addEventListener('change', (e) => {
      MP.store.setState((s) => ({ ui: { ...s.ui, mostraConclusi: e.target.checked } }));
    });
    toolbar.querySelector('.btn-nuovo-progetto').addEventListener('click', () => {
      MP.projectCrud.createProject(state);
    });
    page.appendChild(toolbar);

    page.appendChild(renderLegend(state));

    const warnings = renderWarnings(dataset);
    if (warnings) page.appendChild(warnings);

    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'Nessun task da visualizzare (dataset vuoto o tutti i progetti sono archiviati).';
      page.appendChild(empty);
      return page;
    }

    const scroll = document.createElement('div');
    scroll.className = 'gantt-scroll';
    const grid = document.createElement('div');
    grid.className = 'gantt-grid';
    grid.style.gridTemplateColumns = `170px 90px 200px repeat(${weeks.length}, 46px)`;

    grid.appendChild(headerCell('Attività / Team', 'col-1'));
    grid.appendChild(headerCell('Baseline', 'col-2'));
    grid.appendChild(headerCell('Task', 'col-3'));
    for (const settimana of weeks) {
      grid.appendChild(headerCell(formatWeekLabel(settimana), null, settimana));
    }

    for (const row of rows) {
      const cells = renderTaskRow({
        ...row,
        state,
        weeks,
        teamMap,
        sigleValide,
        siglaTeamMap,
        allocationIndex,
        onCellSaved: handleCellSaved,
        onBulkCellsSaved: handleBulkCellsSaved,
      });
      cells.forEach((cell) => grid.appendChild(cell));
    }

    scroll.appendChild(grid);
    page.appendChild(scroll);

    return page;
  }

  MP.ganttView = { renderGanttView };
})(window.MP = window.MP || {});
