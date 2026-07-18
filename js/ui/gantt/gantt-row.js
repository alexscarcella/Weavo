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
  function formatTeamTooltip(team) {
    if (!team) return '';
    const righe = [
      team.projectManager && `PM: ${team.projectManager}`,
      team.projectEngineer && `PE: ${team.projectEngineer}`,
      team.solutionAnalyst && `Solution analyst: ${team.solutionAnalyst}`,
      team.vvReference && `V&V: ${team.vvReference}`,
      team.note && `Notes: ${team.note}`,
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

  function renderTaskRow({ state, progetto, baseline, task, file, showProgetto, showBaseline, projectIndex, baselineIndex, weeks, teamMap, sigleValide, siglaTeamMap, allocationIndex, onCellSaved, onBulkCellsSaved, onOpenShiftMenu, lastEdited }) {
    const cells = [];

    const col1 = fixedCell(showProgetto ? progetto.nome : '', 'col-1');
    col1.classList.add('project-color-bar');
    col1.style.setProperty('--project-bar-color', PROJECT_BAR_COLORS[projectIndex % PROJECT_BAR_COLORS.length]);
    if (showProgetto) {
      const nomeSpan = col1.querySelector('.cell-text');
      const teamTooltip = formatTeamTooltip(progetto.team);
      if (nomeSpan) nomeSpan.title = teamTooltip ? `${progetto.nome}\n${teamTooltip}` : progetto.nome;

      const infoBtn = document.createElement('button');
      infoBtn.type = 'button';
      infoBtn.className = 'project-info-btn';
      infoBtn.textContent = 'i';
      infoBtn.title = 'Project info';
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        MP.modal.showProjectCard({ progetto, teamRisorsa: state.dataset.teamRisorsa });
      });
      if (nomeSpan) col1.insertBefore(infoBtn, nomeSpan);
      else col1.appendChild(infoBtn);

      col1.appendChild(menuButton([
        { label: 'Rename project', onClick: () => MP.projectCrud.renameProject(state, file) },
        { label: 'Project team…', onClick: () => MP.projectCrud.editTeam(state, file) },
        { label: progetto.archiviato ? 'Reactivate project' : 'Archive project', onClick: () => MP.projectCrud.toggleArchivio(state, file) },
        { label: '+ New baseline', onClick: () => MP.baselineCrud.createBaseline(state, file) },
        { label: '↑', title: 'Move up', className: 'context-menu-item-icon', onClick: () => MP.projectCrud.moveProject(state, file, -1) },
        { label: '↓', title: 'Move down', className: 'context-menu-item-icon', onClick: () => MP.projectCrud.moveProject(state, file, 1) },
        { label: 'Delete project', danger: true, onClick: () => MP.projectCrud.deleteProject(state, file) },
      ]));
    }
    cells.push(col1);

    const col2 = fixedCell(showBaseline && baseline ? baseline.versione : '', 'col-2');
    if (showBaseline && baseline) {
      col2.appendChild(menuButton([
        { label: 'Rename baseline', onClick: () => MP.baselineCrud.renameBaseline(state, file, baseline) },
        { label: '+ New task', onClick: () => MP.taskCrud.createTask(state, file, baseline) },
        { label: '↑', title: 'Move up', className: 'context-menu-item-icon', onClick: () => MP.baselineCrud.moveBaseline(state, file, baseline, -1) },
        { label: '↓', title: 'Move down', className: 'context-menu-item-icon', onClick: () => MP.baselineCrud.moveBaseline(state, file, baseline, 1) },
        { label: 'Delete baseline', danger: true, onClick: () => MP.baselineCrud.deleteBaseline(state, file, baseline) },
      ]));
    }
    cells.push(col2);

    const col3 = document.createElement('div');
    col3.className = `gantt-cell col-fixed col-3${task && task.concluso ? ' task-concluso' : ''}`;
    if (task) {
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.className = 'task-concluso-checkbox';
      chk.checked = task.concluso;
      chk.title = 'Mark as completed';
      chk.addEventListener('click', (e) => e.stopPropagation());
      chk.addEventListener('change', () => MP.taskCrud.toggleConcluso(state, file, task));
      col3.appendChild(chk);

      const taskText = document.createElement('span');
      taskText.className = 'cell-text';
      taskText.textContent = task.nome;
      taskText.title = task.nome;
      col3.appendChild(taskText);

      col3.appendChild(menuButton([
        { label: 'Rename task', onClick: () => MP.taskCrud.renameTask(state, file, task) },
        { label: '↑', title: 'Move up (crosses baselines)', className: 'context-menu-item-icon', onClick: () => MP.taskCrud.moveTask(state, file, baseline, task, -1) },
        { label: '↓', title: 'Move down (crosses baselines)', className: 'context-menu-item-icon', onClick: () => MP.taskCrud.moveTask(state, file, baseline, task, 1) },
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

    const weekCells = [];
    for (const settimana of weeks) {
      if (task) {
        const cell = renderWeekCell({
          task,
          baseline,
          settimana,
          teamMap,
          sigleValide,
          siglaTeamMap,
          allocationIndex,
          state,
          file,
          onCellSaved,
          onOpenShiftMenu,
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
          if (event.ctrlKey || event.metaKey) {
            MP.cellShiftSelection.handleCtrlClick({ file, task, settimana, div, weekCells });
            return;
          }
          MP.cellSelection.handleCellClick({
            event,
            file,
            task,
            settimana,
            div,
            weekCells,
            dataset: state.dataset,
            onApply: (weeksRange, newEntry) => onBulkCellsSaved({ state, file, task, weeksRange, newEntry }),
          });
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
