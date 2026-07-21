// Selezione multi-cella su una riga (singolo task): click imposta l'ancora
// (singola cella), shift-click sulla stessa riga estende il range fino alla
// cella cliccata — solo evidenziazione (classe CSS `cell-selected`), nessun
// popover si apre al click. La selezione (singola cella o range) è l'unica
// sorgente di verità sia per il popover di allocazione sia per il menu di
// shift, entrambi aperti dal click destro (vedi gantt-cell.js/gantt-view.js):
// `getRangeForAction` risolve quali settimane sono coinvolte da un'azione
// scatenata sulla cella cliccata col destro. Un click semplice su un'altra
// riga, o senza un'ancora valida sulla stessa riga, resetta la selezione e la
// fa ripartire da lì. Singleton di modulo: la selezione vive fuori dal ciclo
// di re-render della griglia (evidenziata via classe CSS sui div, non tramite
// lo state store).
(function (MP) {
  'use strict';

  let anchor = null; // { file, task, settimana }
  let selection = null; // { file, task, weeks: [...] } quando il range è >= 2 settimane
  let highlighted = [];

  function clearHighlight() {
    highlighted.forEach((div) => div.classList.remove('cell-selected'));
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
    div.classList.add('cell-selected');
    highlighted = [div];
  }

  // weekCells: elenco ordinato { settimana, div } di tutte le celle della riga
  // (stesso ordine di visualizzazione) — serve per ricavare l'intervallo tra
  // l'ancora e la cella appena cliccata.
  function handleCellClick({ event, file, task, settimana, div, weekCells }) {
    const sameRowAnchor = event.shiftKey && anchor && anchor.file === file && anchor.task === task;
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
    range.forEach((c) => c.div.classList.add('cell-selected'));
    highlighted = range.map((c) => c.div);
    selection = { file, task, weeks: range.map((c) => c.settimana) };
  }

  // Settimane coinvolte da un'azione (popover di allocazione, menu di shift)
  // scatenata col click destro su `settimana`: il range selezionato se copre
  // questa stessa riga e include la cella cliccata, altrimenti la sola cella
  // cliccata — in quel caso la selezione viene anche spostata lì (stile
  // Excel: click destro fuori dalla selezione corrente la sostituisce con la
  // sola cella cliccata).
  function getRangeForAction({ file, task, settimana, div }) {
    if (selection && selection.file === file && selection.task === task && selection.weeks.includes(settimana)) {
      return selection.weeks;
    }
    setAnchor({ file, task, settimana, div });
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
        div.classList.add('cell-selected');
        highlighted.push(div);
      }
    });
  }

  MP.cellSelection = { handleCellClick, getRangeForAction, relocate, reset };
})(window.MP = window.MP || {});
