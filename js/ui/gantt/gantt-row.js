// Rendering delle celle di una riga: 3 colonne bloccate (con azioni CRUD via
// menu "⋮") + N celle settimana. `baseline`/`task` possono essere null quando
// la riga è un segnaposto (progetto senza baseline, o baseline senza task) —
// altrimenti quel progetto/baseline resterebbe senza alcuna riga da cui
// raggiungere il menu "+ Nuova baseline"/"+ Nuovo task".
(function (MP) {
  'use strict';

  const { renderWeekCell } = MP.ganttCell;

  const menuButton = MP.contextMenu.createMenuButton;

  // Colori decorativi per la barra progetto (colonna 1): ciclici in base
  // all'ordine dei progetti nel manifest, non legati ai colori dei team.
  const PROJECT_BAR_COLORS = ['#5b8def', '#e0965a', '#6fb37c', '#b073c9', '#d4886e', '#4fb0b0', '#c9a227', '#e07e97'];

  // Riepilogo breve dei referenti di progetto per il tooltip nativo sul nome (la scheda
  // completa, con i riferimenti risorsa risolti a nome, è dietro l'icona "i" — vedi sotto).
  function formatTeamTooltip(referents) {
    if (!referents) return '';
    const righe = [
      referents.projectManager && `PM: ${referents.projectManager}`,
      referents.projectEngineer && `PE: ${referents.projectEngineer}`,
      referents.solutionAnalyst && `Solution analyst: ${referents.solutionAnalyst}`,
      referents.vvReference && `V&V: ${referents.vvReference}`,
      referents.note && `Notes: ${referents.note}`,
    ].filter(Boolean);
    return righe.join('\n');
  }

  function fixedCell(text, colClass, extraClass) {
    const div = document.createElement('div');
    div.className = `gantt-cell col-fixed ${colClass}${extraClass ? ' ' + extraClass : ''}`;
    const span = document.createElement('span');
    span.className = 'cell-text';
    span.textContent = text || '';
    if (text) span.title = text;
    div.appendChild(span);
    return div;
  }

  function renderTaskRow({ state, progetto, baseline, task, file, showProgetto, showBaseline, projectIndex, baselineIndex, weeks, teamMap, validInitials, initialsTeamMap, allocationIndex, onCellContextMenu, lastEdited }) {
    const cells = [];

    const col1 = fixedCell(showProgetto ? progetto.name : '', 'col-1');
    col1.classList.add('project-color-bar');
    col1.style.setProperty('--project-bar-color', PROJECT_BAR_COLORS[projectIndex % PROJECT_BAR_COLORS.length]);
    if (showProgetto) {
      if (progetto.completed) col1.classList.add('completed-dim');
      const nomeSpan = col1.querySelector('.cell-text');
      const teamTooltip = formatTeamTooltip(progetto.referents);
      if (nomeSpan) nomeSpan.title = teamTooltip ? `${progetto.name}\n${teamTooltip}` : progetto.name;

      const infoBtn = document.createElement('button');
      infoBtn.type = 'button';
      infoBtn.className = 'project-info-btn';
      infoBtn.textContent = 'i';
      infoBtn.title = 'Project info';
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        MP.modal.showProjectCard({ progetto, teamResources: state.dataset.teamResources });
      });
      if (nomeSpan) col1.insertBefore(infoBtn, nomeSpan);
      else col1.appendChild(infoBtn);

      const completedChk = document.createElement('input');
      completedChk.type = 'checkbox';
      completedChk.className = 'completed-checkbox';
      completedChk.checked = !!progetto.completed;
      completedChk.title = 'Mark as completed';
      completedChk.addEventListener('click', (e) => e.stopPropagation());
      completedChk.addEventListener('change', () => MP.projectCrud.toggleCompleted(state, file));
      if (nomeSpan) col1.insertBefore(completedChk, nomeSpan);
      else col1.appendChild(completedChk);

      col1.appendChild(menuButton([
        { label: 'Rename project', onClick: () => MP.projectCrud.renameProject(state, file) },
        { label: 'Project team…', onClick: () => MP.projectCrud.editReferents(state, file) },
        { label: '+ New baseline', onClick: () => MP.baselineCrud.createBaseline(state, file) },
        { label: '↑', title: 'Move up', className: 'context-menu-item-icon', onClick: () => MP.projectCrud.moveProject(state, file, -1) },
        { label: '↓', title: 'Move down', className: 'context-menu-item-icon', onClick: () => MP.projectCrud.moveProject(state, file, 1) },
        { label: 'Delete project', danger: true, onClick: () => MP.projectCrud.deleteProject(state, file) },
      ]));
    }
    cells.push(col1);

    const col2 = fixedCell(showBaseline && baseline ? baseline.version : '', 'col-2');
    if (showBaseline && baseline) {
      if (baseline.completed) col2.classList.add('completed-dim');
      const versionSpan = col2.querySelector('.cell-text');

      const completedChk = document.createElement('input');
      completedChk.type = 'checkbox';
      completedChk.className = 'completed-checkbox';
      completedChk.checked = !!baseline.completed;
      completedChk.title = 'Mark as completed';
      completedChk.addEventListener('click', (e) => e.stopPropagation());
      completedChk.addEventListener('change', () => MP.baselineCrud.toggleCompleted(state, file, baseline));
      if (versionSpan) col2.insertBefore(completedChk, versionSpan);
      else col2.appendChild(completedChk);

      col2.appendChild(menuButton([
        { label: 'Rename baseline', onClick: () => MP.baselineCrud.renameBaseline(state, file, baseline) },
        { label: 'Shift baseline…', onClick: () => MP.baselineCrud.shiftBaseline(state, file, baseline) },
        { label: '+ New task', onClick: () => MP.taskCrud.createTask(state, file, baseline) },
        { label: 'Delete baseline', danger: true, onClick: () => MP.baselineCrud.deleteBaseline(state, file, baseline) },
      ]));
    }
    cells.push(col2);

    const col3 = document.createElement('div');
    col3.className = `gantt-cell col-fixed col-3${task && task.completed ? ' completed-dim' : ''}`;
    if (task) {
      const dragHandle = document.createElement('span');
      dragHandle.className = 'task-drag-handle';
      dragHandle.textContent = '⠿';
      dragHandle.title = 'Drag to move (also across baselines of this project)';
      dragHandle.draggable = true;
      dragHandle.addEventListener('dragstart', (e) => MP.taskDrag.handleDragStart(e, { state, file, sourceBaseline: baseline, task, cells: [col1, col2, col3] }));
      dragHandle.addEventListener('dragend', (e) => MP.taskDrag.handleDragEnd(e));
      col3.appendChild(dragHandle);

      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'completed-checkbox';
      chk.checked = task.completed;
      chk.title = 'Mark as completed';
      chk.addEventListener('click', (e) => e.stopPropagation());
      chk.addEventListener('change', () => MP.taskCrud.toggleCompleted(state, file, task));
      col3.appendChild(chk);

      const taskText = document.createElement('span');
      taskText.className = 'cell-text';
      taskText.textContent = task.name;
      taskText.title = task.name;
      col3.appendChild(taskText);

      col3.appendChild(menuButton([
        { label: 'Rename task', onClick: () => MP.taskCrud.renameTask(state, file, task) },
        { label: 'Delete task', danger: true, onClick: () => MP.taskCrud.deleteTask(state, file, baseline, task) },
      ]));
    } else if (baseline) {
      const placeholder = document.createElement('span');
      placeholder.className = 'cell-text hint-text';
      placeholder.textContent = '— no task —';
      col3.appendChild(placeholder);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'cell-text hint-text';
      placeholder.textContent = '— no baseline —';
      col3.appendChild(placeholder);
    }
    cells.push(col3);

    // Drag handle del drag&drop baseline (vedi baseline-drag.js): solo sulla riga con il nome
    // della baseline (showBaseline) — è l'unico punto da cui si afferra il blocco.
    if (showBaseline && baseline) {
      const dragHandle = document.createElement('span');
      dragHandle.className = 'task-drag-handle';
      dragHandle.textContent = '⠿';
      dragHandle.title = 'Drag to reorder within this project';
      dragHandle.draggable = true;
      dragHandle.addEventListener('dragstart', (e) => MP.baselineDrag.handleDragStart(e, { state, file, baseline, cells: [col1, col2, col3] }));
      dragHandle.addEventListener('dragend', (e) => MP.baselineDrag.handleDragEnd(e));
      col2.insertBefore(dragHandle, col2.firstChild);
    }

    // Bersaglio di drop del drag&drop baseline: qualunque riga della baseline (task compresi
    // e il segnaposto "— no task —"), non solo quella col nome — altrimenti non si potrebbe
    // agganciare il punto di inserimento "dopo l'ultima baseline" quando il suo blocco ha più
    // righe (il "before/after" si calcola sul punto medio della riga sotto il cursore, quindi
    // vale sempre "prima/dopo questa baseline nel suo complesso", non "prima/dopo questa riga").
    // Coesiste senza conflitti con i listener task-drag qui sotto: ciascun modulo tiene il
    // proprio stato `dragging` privato e i suoi handler non fanno nulla quando è null.
    if (baseline) {
      const baselineDragCells = [col1, col2, col3];
      baselineDragCells.forEach((cell) => {
        cell.addEventListener('dragover', (e) => MP.baselineDrag.handleDragOver(e, { file, baseline, cells: baselineDragCells }));
        cell.addEventListener('dragleave', (e) => MP.baselineDrag.handleDragLeave(e, { cells: baselineDragCells }));
        cell.addEventListener('drop', (e) => MP.baselineDrag.handleDrop(e, { file, baseline, cells: baselineDragCells }));
      });
    }

    // Bersaglio di drop del drag&drop task (vedi task-drag.js): qualunque riga
    // con una baseline reale, compresa la riga segnaposto "— no task —" di una
    // baseline vuota. La riga segnaposto "— no baseline —" (baseline null) non
    // riceve alcun listener: non c'è un array `task` in cui inserire.
    if (baseline) {
      const dragCells = [col1, col2, col3];
      dragCells.forEach((cell) => {
        cell.addEventListener('dragover', (e) => MP.taskDrag.handleDragOver(e, { file, baseline, task, cells: dragCells }));
        cell.addEventListener('dragleave', (e) => MP.taskDrag.handleDragLeave(e, { cells: dragCells }));
        cell.addEventListener('drop', (e) => MP.taskDrag.handleDrop(e, { file, baseline, task, cells: dragCells }));
      });
    }

    const weekCells = [];
    for (const settimana of weeks) {
      if (task) {
        const cell = renderWeekCell({
          task,
          baseline,
          settimana,
          teamMap,
          validInitials,
          initialsTeamMap,
          allocationIndex,
          state,
          file,
          onCellContextMenu,
          lastEdited,
        });
        cells.push(cell);
        weekCells.push({ settimana, div: cell });
      } else {
        const empty = document.createElement('div');
        empty.className = 'gantt-cell week-cell';
        cells.push(empty);
      }
    }

    if (task) {
      weekCells.forEach(({ settimana, div }) => {
        div.addEventListener('click', (event) => {
          MP.cellSelection.handleCellClick({ event, file, task, settimana, div, weekCells });
        });
      });
    }

    for (const cell of cells) {
      if (showProgetto) cell.classList.add('row-project-start');
      else if (showBaseline) cell.classList.add('row-baseline-start');
      if (baselineIndex % 2 === 1) cell.classList.add('row-baseline-alt');
    }

    return cells;
  }

  MP.ganttRow = { renderTaskRow };
})(window.MP = window.MP || {});
