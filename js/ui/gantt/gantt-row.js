// Rendering delle celle di una riga: 3 colonne bloccate (con azioni CRUD via
// menu "⋮") + N celle settimana. `baseline`/`task` possono essere null quando
// la riga è un segnaposto (progetto senza baseline, o baseline senza task) —
// altrimenti quel progetto/baseline resterebbe senza alcuna riga da cui
// raggiungere il menu "+ Nuova baseline"/"+ Nuovo task".
(function (MP) {
  'use strict';

  const { renderWeekCell } = MP.ganttCell;

  const menuButton = MP.contextMenu.createMenuButton;

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

  function renderTaskRow({ state, progetto, baseline, task, file, showProgetto, showBaseline, weeks, teamMap, sigleValide, siglaTeamMap, allocationIndex, onCellSaved }) {
    const cells = [];

    const col1 = fixedCell(showProgetto ? progetto.nome : '', 'col-1');
    if (showProgetto) {
      col1.appendChild(menuButton([
        { label: 'Rinomina progetto', onClick: () => MP.projectCrud.renameProject(state, file) },
        { label: progetto.archiviato ? 'Riattiva progetto' : 'Archivia progetto', onClick: () => MP.projectCrud.toggleArchivio(state, file) },
        { label: '+ Nuova baseline', onClick: () => MP.baselineCrud.createBaseline(state, file) },
        { label: 'Sposta su', onClick: () => MP.projectCrud.moveProject(state, file, -1) },
        { label: 'Sposta giù', onClick: () => MP.projectCrud.moveProject(state, file, 1) },
        { label: 'Elimina progetto', danger: true, onClick: () => MP.projectCrud.deleteProject(state, file) },
      ]));
    }
    cells.push(col1);

    const col2 = fixedCell(showBaseline && baseline ? baseline.versione : '', 'col-2');
    if (showBaseline && baseline) {
      col2.appendChild(menuButton([
        { label: 'Rinomina baseline', onClick: () => MP.baselineCrud.renameBaseline(state, file, baseline) },
        { label: '+ Nuovo task', onClick: () => MP.taskCrud.createTask(state, file, baseline) },
        { label: 'Sposta su', onClick: () => MP.baselineCrud.moveBaseline(state, file, baseline, -1) },
        { label: 'Sposta giù', onClick: () => MP.baselineCrud.moveBaseline(state, file, baseline, 1) },
        { label: 'Elimina baseline', danger: true, onClick: () => MP.baselineCrud.deleteBaseline(state, file, baseline) },
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
      chk.title = 'Segna come concluso';
      chk.addEventListener('click', (e) => e.stopPropagation());
      chk.addEventListener('change', () => MP.taskCrud.toggleConcluso(state, file, task));
      col3.appendChild(chk);

      const taskText = document.createElement('span');
      taskText.className = 'cell-text';
      taskText.textContent = task.nome;
      taskText.title = task.nome;
      col3.appendChild(taskText);

      col3.appendChild(menuButton([
        { label: 'Rinomina task', onClick: () => MP.taskCrud.renameTask(state, file, task) },
        { label: 'Sposta su', onClick: () => MP.taskCrud.moveTask(state, file, baseline, task, -1) },
        { label: 'Sposta giù', onClick: () => MP.taskCrud.moveTask(state, file, baseline, task, 1) },
        { label: 'Elimina task', danger: true, onClick: () => MP.taskCrud.deleteTask(state, file, baseline, task) },
      ]));
    } else if (baseline) {
      const placeholder = document.createElement('span');
      placeholder.className = 'cell-text hint-text';
      placeholder.textContent = '— nessun task —';
      col3.appendChild(placeholder);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'cell-text hint-text';
      placeholder.textContent = '— nessuna baseline —';
      col3.appendChild(placeholder);
    }
    cells.push(col3);

    for (const settimana of weeks) {
      if (task) {
        cells.push(renderWeekCell({
          task,
          settimana,
          teamMap,
          sigleValide,
          siglaTeamMap,
          allocationIndex,
          state,
          file,
          onCellSaved,
        }));
      } else {
        const empty = document.createElement('div');
        empty.className = 'gantt-cell week-cell';
        cells.push(empty);
      }
    }
    return cells;
  }

  MP.ganttRow = { renderTaskRow };
})(window.MP = window.MP || {});
