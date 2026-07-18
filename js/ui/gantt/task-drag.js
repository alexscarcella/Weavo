// Drag&drop dei task: trascinare un task su un'altra riga lo riposiziona
// esattamente lì, anche in un'altra baseline dello stesso progetto (mai tra
// progetti diversi). Nessun elemento DOM rappresenta "una riga" nella griglia
// (vedi gantt-row.js/gantt-view.js: ogni riga è solo una sequenza di
// .gantt-cell fratelli), quindi l'indicatore di drop viene applicato alle 3
// celle fisse (col-1/col-2/col-3) della riga sotto il puntatore — sempre
// presenti, anche per le righe segnaposto, e sticky-left quindi sempre
// visibili indipendentemente dallo scroll orizzontale.
// Stato di modulo (singleton), fuori dallo store: stesso pattern di
// cell-selection.js/cell-shift-selection.js. Nessun setState viene emesso
// durante il trascinamento (solo al drop), quindi il DOM non viene mai
// ricostruito a metà gesto.
(function (MP) {
  'use strict';

  let dragging = null; // { state, file, sourceBaseline, task, cells }
  let targetCells = null; // celle che portano l'indicatore di drop corrente
  let targetBaseline = null; // baseline/task/position della riga target corrente,
  let targetTask = null; // per evitare di ritoccare le classi ad ogni singolo
  let targetPosition = null; // evento dragover se il target non è cambiato

  function clearIndicator() {
    if (targetCells) targetCells.forEach((c) => c.classList.remove('drag-target-before', 'drag-target-after'));
    targetCells = null;
    targetBaseline = null;
    targetTask = null;
    targetPosition = null;
  }

  function reset() {
    clearIndicator();
    if (dragging) dragging.cells.forEach((c) => c.classList.remove('dragging'));
    dragging = null;
  }

  function handleDragStart(event, { state, file, sourceBaseline, task, cells }) {
    dragging = { state, file, sourceBaseline, task, cells };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', task.name);
    if (event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(cells[2], 10, 10);
    cells.forEach((c) => c.classList.add('dragging'));
  }

  function handleDragOver(event, { file, baseline, task, cells }) {
    if (!dragging) return;
    if (file !== dragging.file || !baseline) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const rect = cells[2].getBoundingClientRect();
    const position = task && event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
    if (baseline === targetBaseline && task === targetTask && position === targetPosition) return;

    clearIndicator();
    targetCells = cells;
    targetBaseline = baseline;
    targetTask = task;
    targetPosition = position;
    cells.forEach((c) => c.classList.add(position === 'before' ? 'drag-target-before' : 'drag-target-after'));
  }

  function handleDragLeave(event, { cells }) {
    if (!dragging || targetCells !== cells) return;
    const related = event.relatedTarget;
    if (related && cells.includes(related)) return; // spostamento tra le celle della stessa riga
    clearIndicator();
  }

  function handleDrop(event, { file, baseline, task, cells }) {
    event.preventDefault();
    const dragged = dragging;
    reset();
    if (!dragged || file !== dragged.file || !baseline) return;

    let targetIndex;
    if (task) {
      const rect = cells[2].getBoundingClientRect();
      const after = event.clientY >= rect.top + rect.height / 2;
      targetIndex = baseline.task.indexOf(task) + (after ? 1 : 0);
    } else {
      targetIndex = 0;
    }
    MP.taskCrud.moveTaskToPosition(dragged.state, dragged.file, dragged.sourceBaseline, dragged.task, baseline, targetIndex);
  }

  function handleDragEnd() {
    reset();
  }

  MP.taskDrag = { handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd };
})(window.MP = window.MP || {});
