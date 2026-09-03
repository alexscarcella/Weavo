// Ridimensionamento manuale (maniglia + mouse) delle 3 colonne fisse della
// Gantt view (Project/Team, Baseline, Task). Stato di gesture transiente in
// una variabile module-level (mai in MP.store): durante il drag si aggiorna
// solo la CSS custom property sul grid corrente, senza toccare lo state né
// innescare un re-render (stesso principio di week-drag.js/task-drag.js/
// baseline-drag.js, ma con mousedown/mousemove nativi invece di HTML5 DnD,
// più adatti a un resize). Le larghezze scelte persistono in localStorage:
// sono una preferenza dell'utente/browser, non un dato del progetto, quindi
// non finiscono nei JSON condivisi su OneDrive.
(function (MP) {
  'use strict';

  const STORAGE_KEY = 'mp.ganttColWidths';
  const DEFAULTS = { col1: 255, col2: 351, col3: 300 };
  const MIN_WIDTH = 80;

  function loadWidths() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      const parsed = JSON.parse(raw);
      return {
        col1: Number(parsed.col1) > 0 ? Number(parsed.col1) : DEFAULTS.col1,
        col2: Number(parsed.col2) > 0 ? Number(parsed.col2) : DEFAULTS.col2,
        col3: Number(parsed.col3) > 0 ? Number(parsed.col3) : DEFAULTS.col3,
      };
    } catch (e) {
      return { ...DEFAULTS };
    }
  }

  function saveWidths() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch (e) {
      // localStorage non disponibile (quota, private mode): il resize resta
      // comunque funzionante per la sessione corrente, solo non persiste.
    }
  }

  let widths = loadWidths();
  let dragging = null; // { key, startX, startWidth, grid, handle }

  function getWidths() {
    return { ...widths };
  }

  function applyWidth(grid, key, px) {
    grid.style.setProperty(`--mp-${key}-w`, `${px}px`);
  }

  function onMouseMove(e) {
    if (!dragging) return;
    const next = Math.max(MIN_WIDTH, dragging.startWidth + (e.clientX - dragging.startX));
    applyWidth(dragging.grid, dragging.key, next);
  }

  function onMouseUp(e) {
    if (!dragging) return;
    const next = Math.max(MIN_WIDTH, dragging.startWidth + (e.clientX - dragging.startX));
    widths = { ...widths, [dragging.key]: next };
    saveWidths();
    dragging.handle.classList.remove('resizing');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    dragging = null;
  }

  // `grid` viene passato per riferimento all'elemento .gantt-grid corrente: va
  // ripreso al mousedown (non alla creazione della maniglia) così un drag che
  // inizia su un render e continua a lungo lavora sempre sull'elemento vivo.
  function attachHandle(handle, key) {
    handle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const grid = handle.closest('.gantt-grid');
      if (!grid) return;
      dragging = { key, startX: e.clientX, startWidth: widths[key], grid, handle };
      handle.classList.add('resizing');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  MP.colResize = { getWidths, attachHandle };
})(window.MP = window.MP || {});
