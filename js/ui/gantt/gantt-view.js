// Vista gantt: griglia compatta con colonne e intestazione bloccate (freeze pane via
// CSS Grid + position: sticky, un solo scroll context).
(function (MP) {
  'use strict';

  const { getWeeksInRange, formatWeekLabel } = MP.weekUtils;
  const { renderTaskRow } = MP.ganttRow;
  const { findOrphanTeam, findOrphanResources, findTeamMismatches, findOrphanProjectReferents } = MP.validation;

  // Tiene traccia dell'ultima cella (o range) salvata per poterla rievidenziare
  // dopo il re-render completo che segue ogni salvataggio (vedi app.js: l'intero
  // albero DOM viene rifatto da zero, quindi qualunque highlight applicato agli
  // elementi precedenti andrebbe perso senza questo stato). Riferimento diretto
  // all'oggetto `task` (stabile in memoria per tutta la sessione, non serializzato
  // con un id) invece di un identificatore derivato. Un timer svanisce
  // l'evidenziazione dopo una pausa, per non lasciarla marcata per sempre.
  let lastEdited = null;
  let lastEditedTimer = null;

  // `tasks` è sempre un array: normalmente un solo task, ma la sincronizzazione
  // della milestone di baseline (vedi `syncBaselineMilestone`) tocca più task
  // in un colpo solo, e tutti vanno rievidenziati.
  function markLastEdited(tasks, weeks) {
    if (lastEditedTimer) clearTimeout(lastEditedTimer);
    lastEdited = { tasks: new Set(tasks), weeks: new Set(weeks) };
    lastEditedTimer = setTimeout(() => {
      lastEdited = null;
      lastEditedTimer = null;
      MP.store.setState({});
    }, 2500);
  }

  // Un progetto senza baseline, o una baseline senza task (visibili — vedi
  // showCompleted), non deve sparire dal gantt: senza una riga non ci
  // sarebbe modo di raggiungerne il menu "⋮" per aggiungere la prima
  // baseline/task (righe segnaposto con baseline/task null).
  function buildRows(dataset, showArchived, showCompleted) {
    const rows = [];
    let projectIndex = 0;
    for (const voce of dataset.manifest.projects) {
      const entry = dataset.projects.get(voce.file);
      if (!entry) continue;
      const progetto = entry.data;
      if (progetto.archived && !showArchived) continue;

      const pIdx = projectIndex++;

      const baselineVisibili = progetto.baseline.filter((b) => showArchived || !b.archived);
      if (baselineVisibili.length === 0) {
        rows.push({ progetto, baseline: null, task: null, file: voce.file, showProgetto: true, showBaseline: false, projectIndex: pIdx, baselineIndex: 0 });
        continue;
      }

      baselineVisibili.forEach((baseline, bi) => {
        const taskVisibili = baseline.task.filter((t) => showCompleted || !t.completed);
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

  // Un task ammette una sola settimana di milestone: impostandola su una nuova
  // settimana, l'eventuale flag su un'altra settimana dello stesso task va rimosso
  // (l'ultima impostata sovrascrive la precedente, mai due milestone residue).
  function clearOtherMilestones(task, settimana) {
    for (const [iso, entry] of Object.entries(task.weeks || {})) {
      if (iso === settimana || !entry.milestone) continue;
      delete entry.milestone;
      if (MP.schema.isWeekEntryEmpty(entry)) delete task.weeks[iso];
    }
  }

  // Tutti i task di una stessa baseline condividono un'unica scadenza: impostando
  // la milestone su un task, viene ereditata (stessa settimana) da tutti gli
  // altri task non completed della baseline, applicando anche a loro la regola
  // "una sola milestone per task" — mai due scadenze diverse nella stessa
  // baseline. I task già completed non vengono toccati automaticamente (stesso
  // principio del team-mismatch: dati chiusi mai auto-corretti, vedi CLAUDE.md).
  function syncBaselineMilestone(baseline, task, settimana) {
    clearOtherMilestones(task, settimana);
    const affected = [task];
    for (const t of baseline.task) {
      if (t === task || t.completed) continue;
      clearOtherMilestones(t, settimana);
      const existing = t.weeks[settimana];
      t.weeks[settimana] = existing ? { ...existing, milestone: true } : { milestone: true };
      affected.push(t);
    }
    return affected;
  }

  // Simmetrico a `syncBaselineMilestone`: se l'utente toglie la scadenza
  // condivisa (checkbox smarcata, non uno spostamento su un'altra settimana),
  // va rimossa dagli altri task della baseline che la avevano ereditata, non
  // lasciata residua solo perché il task originario non la mostra più.
  function clearBaselineMilestone(baseline, task, settimana) {
    const affected = [task];
    for (const t of baseline.task) {
      if (t === task || t.completed) continue;
      const entry = (t.weeks || {})[settimana];
      if (!entry || !entry.milestone) continue;
      delete entry.milestone;
      if (MP.schema.isWeekEntryEmpty(entry)) delete t.weeks[settimana];
      affected.push(t);
    }
    return affected;
  }

  async function handleCellSaved({ state, file, task, baseline, settimana, newEntry }) {
    const wasMilestone = ((task.weeks || {})[settimana] || {}).milestone === true;
    const isMilestone = newEntry.milestone === true;
    let affectedTasks = [task];
    if (baseline && isMilestone) affectedTasks = syncBaselineMilestone(baseline, task, settimana);
    else if (baseline && wasMilestone) affectedTasks = clearBaselineMilestone(baseline, task, settimana);
    if (MP.schema.isWeekEntryEmpty(newEntry)) {
      delete task.weeks[settimana];
    } else {
      task.weeks[settimana] = newEntry;
    }
    try {
      await MP.saveCoordinator.saveProject(state, file);
      markLastEdited(affectedTasks, [settimana]);
      MP.store.setState({}); // dataset mutato in place: basta ri-notificare i subscriber
    } catch (e) {
      window.alert(`Error saving "${file}": ${e.message}`);
    }
  }

  // Applica la stessa allocazione (team+resources) a tutte le settimane del
  // range selezionato (vedi cell-selection.js), con un solo salvataggio.
  async function handleBulkCellsSaved({ state, file, task, weeksRange, newEntry }) {
    for (const settimana of weeksRange) {
      if (MP.schema.isWeekEntryEmpty(newEntry)) {
        delete task.weeks[settimana];
      } else {
        task.weeks[settimana] = newEntry;
      }
    }
    try {
      await MP.saveCoordinator.saveProject(state, file);
      markLastEdited([task], weeksRange);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving "${file}": ${e.message}`);
    }
  }

  // Apre il menu contestuale di shift (due voci ◀/▶, riuso di MP.contextMenu —
  // vedi js/ui/common/context-menu.js) per `weeks` (una cella singola o un
  // range Ctrl-selezionato, vedi cell-shift-selection.js). Azione
  // completamente indipendente dal popover di allocazione: nessun campo
  // condiviso, nessun rischio di sovrascrittura incrociata (vedi il piano per
  // il bug della prima versione, che le mescolava in un'unica UI). `anchorEl`
  // è opzionale: se assente (riapertura dopo uno shift), viene ritrovato via
  // `MP.ganttCell.getCellDiv` (popolato ad ogni render).
  function openShiftMenu({ state, file, task, baseline, weeks, anchorEl }) {
    const el = anchorEl || MP.ganttCell.getCellDiv(task, weeks[0]);
    if (!el) return;
    const leftCheck = MP.weekShift.canShiftWeeks(state.dataset, task, weeks, -1);
    const rightCheck = MP.weekShift.canShiftWeeks(state.dataset, task, weeks, 1);
    MP.contextMenu.openMenu({
      anchorEl: el,
      actions: [
        { header: true, label: weeks.length > 1 ? `${weeks.length} weeks selected` : '1 week selected' },
        {
          label: '◀ Shift one week back',
          disabled: !leftCheck.allowed,
          title: leftCheck.allowed ? undefined : leftCheck.reason,
          onClick: () => handleCellsShift({ state, file, task, baseline, weeks, direction: -1 }),
        },
        {
          label: '▶ Shift one week forward',
          disabled: !rightCheck.allowed,
          title: rightCheck.allowed ? undefined : rightCheck.reason,
          onClick: () => handleCellsShift({ state, file, task, baseline, weeks, direction: 1 }),
        },
      ],
    });
  }

  // Sposta di una settimana (avanti/indietro) l'allocazione di una cella
  // singola o dell'intero range Ctrl-selezionato (vedi js/model/week-shift.js
  // per il predicato di ammissibilità e la mutazione, che preserva il
  // contenuto individuale di ciascuna cella). Dopo il salvataggio riapre il
  // menu di shift sulla nuova posizione (stesso meccanismo già usato per
  // `lastEdited`: il div va ritrovato dopo il re-render completo del DOM), per
  // permettere shift ripetuti in sequenza senza dover riselezionare da capo.
  async function handleCellsShift({ state, file, task, baseline, weeks, direction }) {
    const check = MP.weekShift.canShiftWeeks(state.dataset, task, weeks, direction);
    if (!check.allowed) return; // la voce di menu è già disabilitata in questo caso

    const milestoneWeeks = weeks.filter((w) => ((task.weeks || {})[w] || {}).milestone === true);
    MP.weekShift.shiftWeeksData(task, weeks, direction);

    const targets = weeks.map((w) => MP.weekUtils.addWeeks(w, direction));
    let affectedTasks = [task];
    for (const w of milestoneWeeks) {
      if (baseline) affectedTasks = syncBaselineMilestone(baseline, task, MP.weekUtils.addWeeks(w, direction));
    }

    try {
      await MP.saveCoordinator.saveProject(state, file);
      markLastEdited(affectedTasks, [...weeks, ...targets]);
      MP.store.setState({});
      MP.cellShiftSelection.relocate(file, task, targets);
      openShiftMenu({ state, file, task, baseline, weeks: targets });
    } catch (e) {
      window.alert(`Error saving "${file}": ${e.message}`);
    }
  }

  function headerCell(text, colClass, title, extraClass) {
    const div = document.createElement('div');
    div.className = `gantt-cell header ${colClass ? 'col-fixed ' + colClass : 'week-cell'}${extraClass ? ' ' + extraClass : ''}`;
    div.textContent = text;
    if (title) div.title = title;
    return div;
  }

  function renderWarnings(dataset) {
    const orfaniTeam = findOrphanTeam(dataset);
    const orfaniRisorsa = findOrphanResources(dataset);
    const mismatch = findTeamMismatches(dataset);
    const orfaniRiferimenti = findOrphanProjectReferents(dataset);
    const righe = [
      ...dataset.warnings,
      ...orfaniTeam.map((o) => `Team "${o.valore}" not defined — ${o.progetto} / BL ${o.baseline} / ${o.task} / ${o.settimana}`),
      ...orfaniRisorsa.map((o) => `Initials "${o.valore}" not in team-resources.json — ${o.progetto} / BL ${o.baseline} / ${o.task} / ${o.settimana}`),
      ...mismatch.map((m) => `Resource "${m.sigla}" belongs to team "${m.teamAssegnato}" but is allocated here as "${m.teamCella}" — needs regularizing — ${m.progetto} / BL ${m.baseline} / ${m.task} / ${m.settimana}`),
      ...orfaniRiferimenti.map((o) => `Initials "${o.valore}" (${o.campo}) not in team-resources.json — project reference ${o.progetto}`),
    ];
    if (!righe.length) return null;
    const div = document.createElement('div');
    div.className = 'warnings';
    div.innerHTML = `<strong>Warnings (${righe.length}):</strong><ul>${righe.map((r) => `<li>${r}</li>`).join('')}</ul>`;
    return div;
  }

  function renderGanttView(state) {
    const { dataset } = state;
    const weeks = getWeeksInRange(dataset.manifest.weeks.first, dataset.manifest.weeks.last);
    const teamMap = new Map(dataset.teamResources.teams.map((t) => [t.code, t]));
    const resourcesFlat = MP.schema.flattenResources(dataset.teamResources);
    const validInitials = new Set(resourcesFlat.map((r) => r.initials));
    const initialsTeamMap = new Map(resourcesFlat.map((r) => [r.initials, r.teamCode]));
    const allocationIndex = MP.overallocation.buildAllocationIndex(dataset);
    const rows = buildRows(dataset, state.ui.showArchived, state.ui.showCompleted);
    const currentWeek = MP.weekUtils.getCurrentWeekIso();
    const currentWeekIndex = weeks.indexOf(currentWeek);

    const page = document.createElement('div');
    page.className = 'gantt-page';

    const toolbarActions = document.createElement('span');
    toolbarActions.className = 'toolbar-actions';
    toolbarActions.innerHTML = `
      <label class="toggle-archived">
        <input type="checkbox" id="chk-archived" ${state.ui.showArchived ? 'checked' : ''}>
        Show archived
      </label>
      <label class="toggle-completed">
        <input type="checkbox" id="chk-completed" ${state.ui.showCompleted ? 'checked' : ''}>
        Show completed
      </label>`;
    toolbarActions.querySelector('#chk-archived').addEventListener('change', (e) => {
      MP.store.setState((s) => ({ ui: { ...s.ui, showArchived: e.target.checked } }));
    });
    toolbarActions.querySelector('#chk-completed').addEventListener('change', (e) => {
      MP.store.setState((s) => ({ ui: { ...s.ui, showCompleted: e.target.checked } }));
    });
    page.appendChild(MP.datasetHeader.renderDatasetHeader(state, toolbarActions));

    const warnings = renderWarnings(dataset);
    if (warnings) page.appendChild(warnings);

    if (rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No tasks to display (empty dataset or all projects are archived).';
      page.appendChild(empty);
      return page;
    }

    const scroll = document.createElement('div');
    scroll.className = 'gantt-scroll';
    const grid = document.createElement('div');
    grid.className = 'gantt-grid has-week-edge-row';
    // Due colonne extra (stesse dimensioni di una settimana) dedicate a "-" e
    // "+": non sono una settimana reale, si scrollano insieme alla griglia
    // delle settimane invece di restare bloccate. `renderTaskRow`/`gantt-row.js`
    // non sanno nulla di queste 2 colonne (restituiscono sempre 3+weeks.length
    // celle): sono `gantt-view.js` a inserire i filler prima/dopo, riga per riga.
    grid.style.gridTemplateColumns = `170px 90px 300px repeat(${weeks.length + 2}, 46px)`;

    // Riga pulsanti "a bordo tabella" in stile Excel, sopra le etichette di
    // colonna: sacrifica un'intera riga di altezza (24px, come le altre)
    // invece di colonne di larghezza, per non sottrarre spazio orizzontale
    // alle settimane visibili. L'angolo sopra le 3 colonne bloccate resta
    // vuoto (frozen, come l'intestazione sottostante) — i pulsanti vivono
    // esclusivamente nella griglia delle settimane: "-" nella colonna
    // dedicata subito prima della prima settimana (si scrolla via appena si
    // scrolla orizzontalmente, non essendo bloccata), "+" nella colonna
    // dedicata subito dopo l'ultima settimana (entra in vista solo scrollando
    // fino in fondo).
    ['col-1', 'col-2', 'col-3'].forEach((colClass) => {
      const corner = document.createElement('div');
      corner.className = `gantt-cell week-edge-row col-fixed ${colClass}`;
      grid.appendChild(corner);
    });
    const edgeLeft = document.createElement('div');
    edgeLeft.className = 'gantt-cell week-edge-row';
    edgeLeft.appendChild(MP.weekControls.renderRemoveWeekButton(state));
    grid.appendChild(edgeLeft);
    for (let i = 0; i < weeks.length; i++) {
      const filler = document.createElement('div');
      filler.className = 'gantt-cell week-edge-row';
      grid.appendChild(filler);
    }
    const edgeRight = document.createElement('div');
    edgeRight.className = 'gantt-cell week-edge-row';
    edgeRight.appendChild(MP.weekControls.renderAddWeekButton(state));
    grid.appendChild(edgeRight);

    grid.appendChild(headerCell('Project / Team', 'col-1'));
    grid.appendChild(headerCell('Baseline', 'col-2'));
    grid.appendChild(headerCell('Task', 'col-3'));
    grid.appendChild(headerCell('', null));
    for (const settimana of weeks) {
      grid.appendChild(headerCell(formatWeekLabel(settimana), null, settimana, settimana === currentWeek ? 'current-week current-week-line' : null));
    }
    grid.appendChild(headerCell('', null));

    for (const row of rows) {
      const cells = renderTaskRow({
        ...row,
        state,
        weeks,
        teamMap,
        validInitials,
        initialsTeamMap,
        allocationIndex,
        onCellSaved: handleCellSaved,
        onBulkCellsSaved: handleBulkCellsSaved,
        onOpenShiftMenu: openShiftMenu,
        lastEdited,
      });
      if (currentWeekIndex !== -1) cells[3 + currentWeekIndex].classList.add('current-week-line');

      const rowFillerClass = row.showProgetto ? ' row-project-start' : row.showBaseline ? ' row-baseline-start' : '';
      const altClass = row.baselineIndex % 2 === 1 ? ' row-baseline-alt' : '';
      const rowFiller = () => {
        const div = document.createElement('div');
        div.className = `gantt-cell week-cell${rowFillerClass}${altClass}`;
        return div;
      };

      cells.slice(0, 3).forEach((cell) => grid.appendChild(cell));
      grid.appendChild(rowFiller());
      cells.slice(3).forEach((cell) => grid.appendChild(cell));
      grid.appendChild(rowFiller());
    }

    scroll.appendChild(grid);
    page.appendChild(scroll);

    return page;
  }

  MP.ganttView = { renderGanttView, buildRows };
})(window.MP = window.MP || {});
