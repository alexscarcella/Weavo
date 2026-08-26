// Posizionamento condiviso per box "flottanti" (popover, context-menu) ancorati
// a un elemento della pagina: sceglie sopra/sotto l'ancora in base allo spazio
// reale disponibile (misurato via getBoundingClientRect, mai stimato) e clampa
// entrambi gli assi dentro il viewport. Usato sia per un singolo box
// (positionSingle) sia per più box che devono apparire insieme come un unico
// blocco non sovrapposto (positionStack) — caso della cella con allocazione
// esistente, dove il popover di editing e il menu di shift si aprono
// contemporaneamente (vedi gantt-view.js:openCellContextMenu). I due box
// restano componenti/DOM separati (nessuna modifica alla logica dati/salvataggio,
// storicamente separata per un bug di sovrascrittura — vedi cell-popover.js) e
// solo la loro geometria a schermo viene coordinata qui.
(function (MP) {
  'use strict';

  function clampHorizontal(left, width, margin) {
    return Math.max(margin, Math.min(left, window.innerWidth - width - margin));
  }

  function positionSingle(el, anchorRect, { margin = 8 } = {}) {
    // `position: fixed` va impostato PRIMA di misurare: un box senza `width`
    // esplicita (es. .context-menu, solo `min-width`) si allarga a tutta la
    // larghezza del contenitore finché è in flusso normale (`position: static`)
    // — la sua larghezza "shrink-to-fit" reale si applica solo una volta
    // fuori flusso. Misurare prima porta a una `width` enormemente
    // sovrastimata e quindi a un clamp orizzontale sbagliato (visto in bug
    // reale: il box finiva incollato al bordo sinistro del viewport). Nessun
    // flicker: `top`/`left` vengono assegnati nello stesso tick sincrono,
    // prima che il browser possa dipingere lo stato intermedio.
    el.style.position = 'fixed';
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - anchorRect.bottom - margin;
    const spaceAbove = anchorRect.top - margin;
    let top = (rect.height <= spaceBelow || spaceBelow >= spaceAbove)
      ? anchorRect.bottom + 4
      : anchorRect.top - rect.height - 4;
    top = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));

    el.style.top = `${top}px`;
    el.style.left = `${clampHorizontal(anchorRect.left, rect.width, margin)}px`;
  }

  // `els`: box già nel DOM, in ordine di distanza dall'ancora (il primo è il
  // più vicino alla cella). Sceglie sopra/sotto in base allo spazio richiesto
  // dall'intero blocco (somma delle altezze reali + gap), poi impila ogni box
  // contro il precedente. Ogni box resta comunque clampato singolarmente ai
  // bordi del viewport, rete di sicurezza se il blocco combinato eccede lo
  // spazio disponibile su entrambi i lati.
  function positionStack(els, anchorRect, { margin = 8, gap = 4 } = {}) {
    // Vedi il commento in positionSingle: `position: fixed` va impostato su
    // ogni box PRIMA di misurarlo, altrimenti un box senza `width` esplicita
    // (es. .context-menu) viene misurato mentre è ancora in flusso normale e
    // risulta largo quanto il contenitore invece che shrink-to-fit.
    els.forEach((el) => { el.style.position = 'fixed'; });
    const rects = els.map((el) => el.getBoundingClientRect());
    const totalHeight = rects.reduce((sum, r) => sum + r.height, 0) + gap * (els.length - 1);
    const spaceBelow = window.innerHeight - anchorRect.bottom - margin;
    const spaceAbove = anchorRect.top - margin;
    const below = totalHeight <= spaceBelow || spaceBelow >= spaceAbove;

    let cursor = below ? anchorRect.bottom + gap : anchorRect.top - gap;
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      const rect = rects[i];
      const top = below ? cursor : cursor - rect.height;
      const clampedTop = Math.max(margin, Math.min(top, window.innerHeight - rect.height - margin));

      el.style.top = `${clampedTop}px`;
      el.style.left = `${clampHorizontal(anchorRect.left, rect.width, margin)}px`;

      cursor = below ? cursor + rect.height + gap : cursor - rect.height - gap;
    }
  }

  MP.floatingPosition = { positionSingle, positionStack };
})(window.MP = window.MP || {});
