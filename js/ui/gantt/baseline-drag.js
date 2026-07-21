// Drag&drop per riordinare le baseline all'interno dello stesso progetto (mai tra progetti
// diversi). Ricalca lo stesso pattern module-singleton di task-drag.js, semplificato perché
// una baseline si sposta sempre dentro un solo array (progetto.baseline), senza la distinzione
// baseline sorgente/destinazione che serve invece ai task.
(function (MP) {
  'use strict';

  let dragging = null; // { state, file, baseline, cells }
  let targetCells = null;
  let targetBaseline = null;
  let targetPosition = null;

  function clearIndicator() {
    if (targetCells) targetCells.forEach((c) => c.classList.remove('drag-target-before', 'drag-target-after'));
    targetCells = null;
    targetBaseline = null;
    targetPosition = null;
  }

  function reset() {
    clearIndicator();
    if (dragging) dragging.cells.forEach((c) => c.classList.remove('dragging'));
    dragging = null;
  }

  function handleDragStart(event, { state, file, baseline, cells }) {
    dragging = { state, file, baseline, cells };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', baseline.version);
    if (event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(cells[1], 10, 10);
    cells.forEach((c) => c.classList.add('dragging'));
  }

  function handleDragOver(event, { file, baseline, cells }) {
    if (!dragging) return;
    if (file !== dragging.file) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const rect = cells[1].getBoundingClientRect();
    const position = event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
    if (baseline === targetBaseline && position === targetPosition) return;

    clearIndicator();
    targetCells = cells;
    targetBaseline = baseline;
    targetPosition = position;
    cells.forEach((c) => c.classList.add(position === 'before' ? 'drag-target-before' : 'drag-target-after'));
  }

  function handleDragLeave(event, { cells }) {
    if (!dragging || targetCells !== cells) return;
    const related = event.relatedTarget;
    if (related && cells.includes(related)) return; // ci si sta spostando tra celle della stessa riga
    clearIndicator();
  }

  function handleDrop(event, { file, baseline, cells }) {
    event.preventDefault();
    const dragged = dragging;
    reset();
    if (!dragged || file !== dragged.file) return;

    const progetto = dragged.state.dataset.projects.get(file).data;
    const rect = cells[1].getBoundingClientRect();
    const after = event.clientY >= rect.top + rect.height / 2;
    const targetIndex = progetto.baseline.indexOf(baseline) + (after ? 1 : 0);
    MP.baselineCrud.moveBaselineToPosition(dragged.state, dragged.file, dragged.baseline, targetIndex);
  }

  function handleDragEnd() {
    reset();
  }

  MP.baselineDrag = { handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd };
})(window.MP = window.MP || {});
