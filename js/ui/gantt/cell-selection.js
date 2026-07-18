// Controller di selezione multi-cella su una riga (singolo task): click imposta
// l'ancora, shift-click sulla stessa riga estende il range fino alla cella
// cliccata ed apre subito il popover di allocazione in blocco (team+risorse
// applicati a tutte le settimane del range — niente milestone, vedi
// cell-popover.js). Un click semplice su un'altra riga, o senza un'ancora
// valida sulla stessa riga, resetta la selezione e la fa ripartire da lì.
// Singleton di modulo: la selezione vive fuori dal ciclo di re-render della
// griglia (evidenziata via classe CSS sui div, non tramite lo state store).
(function (MP) {
  'use strict';

  let anchor = null; // { file, task, settimana }
  let highlighted = [];

  function clearHighlight() {
    highlighted.forEach((div) => div.classList.remove('cell-selected'));
    highlighted = [];
  }

  function reset() {
    clearHighlight();
    anchor = null;
  }

  function setAnchor({ file, task, settimana, div }) {
    clearHighlight();
    anchor = { file, task, settimana };
    div.classList.add('cell-selected');
    highlighted = [div];
  }

  // weekCells: elenco ordinato { settimana, div } di tutte le celle della riga
  // (stesso ordine di visualizzazione) — serve per ricavare l'intervallo tra
  // l'ancora e la cella appena cliccata.
  function handleCellClick({ event, file, task, settimana, div, weekCells, dataset, onApply, onCellsShift }) {
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

    MP.cellPopover.openPopover({
      anchorEl: div,
      dataset,
      task,
      weeksRange: range.map((c) => c.settimana),
      onSave: (newEntry) => {
        onApply(range.map((c) => c.settimana), newEntry);
        reset();
      },
      onShift: (direction) => {
        onCellsShift(range.map((c) => c.settimana), direction);
        reset();
      },
    });
  }

  MP.cellSelection = { handleCellClick, reset };
})(window.MP = window.MP || {});
