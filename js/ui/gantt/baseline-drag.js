// Drag&drop delle baseline: trascinare il blocco di una baseline la riposiziona,
// dentro lo stesso progetto (riordino) oppure in un progetto DIVERSO
// (spostamento cross-progetto). Ricalca il pattern module-singleton di
// task-drag.js. Il file di origine e quello di destinazione possono coincidere
// o no: MP.baselineCrud.moveBaselineToPosition distingue i due casi.
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

  // `baseline` è null sulla riga segnaposto "— no baseline —" di un progetto
  // senza baseline: è comunque un bersaglio valido (unico punto di inserimento).
  function handleDragOver(event, { baseline, cells }) {
    if (!dragging) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const rect = cells[1].getBoundingClientRect();
    const position = baseline && event.clientY >= rect.top + rect.height / 2 ? 'after' : 'before';
    if (targetCells === cells && baseline === targetBaseline && position === targetPosition) return;

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
    if (!dragged) return;

    const progetto = dragged.state.dataset.projects.get(file).data;
    let targetIndex;
    if (baseline) {
      const rect = cells[1].getBoundingClientRect();
      const after = event.clientY >= rect.top + rect.height / 2;
      targetIndex = progetto.baseline.indexOf(baseline) + (after ? 1 : 0);
    } else {
      targetIndex = 0; // progetto senza baseline: unico slot di inserimento
    }
    MP.baselineCrud.moveBaselineToPosition(dragged.state, dragged.file, dragged.baseline, file, targetIndex);
  }

  function handleDragEnd() {
    reset();
  }

  MP.baselineDrag = { handleDragStart, handleDragOver, handleDragLeave, handleDrop, handleDragEnd };
})(window.MP = window.MP || {});
