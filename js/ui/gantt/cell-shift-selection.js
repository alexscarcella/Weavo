// Selezione di un range di settimane dedicata allo SHIFT (menu contestuale al
// click destro, vedi gantt-cell.js/gantt-view.js), completamente indipendente
// dalla selezione per l'allocazione bulk (cell-selection.js, click + shift-
// click): Ctrl+click estende un range sulla stessa riga, evidenziato con una
// classe CSS distinta (`cell-shift-selected`, mai `cell-selected`) per non
// creare ambiguità visiva. Le due selezioni non condividono mai stato — lo
// shift non tocca mai i campi team/risorse del popover di allocazione, e
// viceversa (mescolare le due funzioni in un'unica UI causava sovrascritture
// accidentali dell'intero range alla chiusura del popover: lo shift preserva
// il contenuto individuale di ciascuna cella, ma il popover di allocazione
// bulk, se chiuso, riscrive l'intero range con un valore uniforme).
(function (MP) {
  'use strict';

  let anchor = null; // { file, task, settimana }
  let selection = null; // { file, task, weeks: [...] } quando il range è >= 2 settimane
  let highlighted = [];

  function clearHighlight() {
    highlighted.forEach((div) => div.classList.remove('cell-shift-selected'));
    highlighted = [];
  }

  function reset() {
    clearHighlight();
    anchor = null;
    selection = null;
  }

  function setAnchor({ file, task, settimana, div }) {
    clearHighlight();
    anchor = { file, task, settimana };
    selection = null;
    div.classList.add('cell-shift-selected');
    highlighted = [div];
  }

  // weekCells: elenco ordinato { settimana, div } di tutte le celle della riga
  // (stesso ordine di visualizzazione) — serve per ricavare l'intervallo tra
  // l'ancora e la cella appena Ctrl-cliccata.
  function handleCtrlClick({ file, task, settimana, div, weekCells }) {
    const sameRowAnchor = anchor && anchor.file === file && anchor.task === task;
    if (!sameRowAnchor) {
      setAnchor({ file, task, settimana, div });
      return;
    }

    const idxA = weekCells.findIndex((c) => c.settimana === anchor.settimana);
    const idxB = weekCells.findIndex((c) => c.settimana === settimana);
    if (idxA === -1 || idxB === -1) {
      setAnchor({ file, task, settimana, div });
      return;
    }
    const [from, to] = idxA <= idxB ? [idxA, idxB] : [idxB, idxA];
    const range = weekCells.slice(from, to + 1);

    clearHighlight();
    range.forEach((c) => c.div.classList.add('cell-shift-selected'));
    highlighted = range.map((c) => c.div);
    selection = { file, task, weeks: range.map((c) => c.settimana) };
  }

  // Settimane da usare per il click destro su `settimana`: il range Ctrl-
  // selezionato se copre questa stessa riga e include la cella cliccata,
  // altrimenti la sola cella cliccata.
  function weeksForShift(file, task, settimana) {
    if (selection && selection.file === file && selection.task === task && selection.weeks.includes(settimana)) {
      return selection.weeks;
    }
    return [settimana];
  }

  // Dopo uno shift eseguito con successo, sposta la selezione sulle nuove
  // settimane e ri-evidenzia i div appena ricreati dal re-render completo
  // (via MP.ganttCell.getCellDiv, popolato ad ogni render) — permette shift
  // ripetuti in sequenza senza dover riselezionare da capo.
  function relocate(file, task, newWeeks) {
    clearHighlight();
    if (newWeeks.length > 1) {
      selection = { file, task, weeks: newWeeks };
    } else {
      selection = null;
    }
    anchor = { file, task, settimana: newWeeks[0] };
    newWeeks.forEach((w) => {
      const div = MP.ganttCell.getCellDiv(task, w);
      if (div) {
        div.classList.add('cell-shift-selected');
        highlighted.push(div);
      }
    });
  }

  MP.cellShiftSelection = { handleCtrlClick, weeksForShift, relocate, reset };
})(window.MP = window.MP || {});
