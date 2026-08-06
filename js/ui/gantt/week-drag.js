// Drag&drop di un blocco contiguo di settimane allocate (o dell'intera selezione
// corrente, vedi cell-selection.js) di uno stesso task, avanti/indietro nel tempo.
// Stesso pattern a singleton di modulo di task-drag.js/baseline-drag.js: stato
// privato fuori dallo store, nessun re-render a metà gesture. A differenza di
// quei due moduli, la distanza non è fissa (before/after una riga): il delta
// viene calcolato dalla cella sotto il cursore e CLAMPATO al primo ostacolo
// incontrato (un'altra allocazione o una milestone, vedi
// MP.weekShift.findMaxShift) — "scorri finché non incontri un ostacolo", non un
// rifiuto secco se il cursore va oltre.
(function (MP) {
  'use strict';

  let dragging = null; // { state, file, task, baseline, weeks, cells }
  let lastHoveredSettimana = null;
  let targetCells = null;

  function clearTargetClasses() {
    if (targetCells) targetCells.forEach((c) => c.classList.remove('week-drag-target-valid', 'week-drag-blocked'));
    targetCells = null;
  }

  function reset() {
    clearTargetClasses();
    lastHoveredSettimana = null;
    if (dragging) dragging.cells.forEach((c) => c.classList.remove('dragging'));
    dragging = null;
  }

  function handleDragStart(event, { state, file, task, baseline, settimana, div }) {
    const weeks = MP.cellSelection.getRangeForAction({ file, task, settimana, div });
    const cells = weeks.map((w) => MP.ganttCell.getCellDiv(task, w)).filter(Boolean);
    dragging = { state, file, task, baseline, weeks, cells };
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', weeks[0]);
    if (event.dataTransfer.setDragImage) event.dataTransfer.setDragImage(div, 10, 10);
    cells.forEach((c) => c.classList.add('dragging'));
  }

  function handleDragOver(event, { task, settimana }) {
    if (!dragging || task !== dragging.task) {
      if (dragging) event.dataTransfer.dropEffect = 'none';
      return;
    }
    if (settimana === lastHoveredSettimana) {
      event.preventDefault();
      event.dataTransfer.dropEffect = targetCells ? 'move' : 'none';
      return;
    }
    lastHoveredSettimana = settimana;

    const rawDelta = MP.weekUtils.weeksBetween(dragging.weeks[0], settimana);
    const delta = MP.weekShift.findMaxShift(dragging.state.dataset, dragging.task, dragging.weeks, rawDelta, dragging.baseline);

    event.preventDefault();
    event.dataTransfer.dropEffect = delta !== 0 ? 'move' : 'none';

    clearTargetClasses();
    if (delta !== 0) {
      const targets = dragging.weeks.map((w) => MP.weekUtils.addWeeks(w, delta));
      targetCells = targets.map((t) => MP.ganttCell.getCellDiv(task, t)).filter(Boolean);
      targetCells.forEach((c) => c.classList.add('week-drag-target-valid'));
    } else if (rawDelta !== 0) {
      // Bloccato già al primo passo (es. task/settimana completed): nessun
      // movimento possibile in quella direzione, segnala sulle celle sorgente.
      targetCells = dragging.cells;
      targetCells.forEach((c) => c.classList.add('week-drag-blocked'));
    }
  }

  async function handleDrop(event, { task, settimana }) {
    event.preventDefault();
    const dragged = dragging;
    reset();
    if (!dragged || task !== dragged.task) return;

    const rawDelta = MP.weekUtils.weeksBetween(dragged.weeks[0], settimana);
    const delta = MP.weekShift.findMaxShift(dragged.state.dataset, dragged.task, dragged.weeks, rawDelta, dragged.baseline);
    if (delta === 0) return;

    await MP.cellPopover.whenIdle();
    await MP.ganttView.commitWeeksShift({
      state: dragged.state,
      file: dragged.file,
      task: dragged.task,
      baseline: dragged.baseline,
      weeks: dragged.weeks,
      direction: delta,
    });
  }

  function handleDragEnd() {
    reset();
  }

  MP.weekDrag = { handleDragStart, handleDragOver, handleDrop, handleDragEnd };
})(window.MP = window.MP || {});
