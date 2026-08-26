// Piccolo menu contestuale generico (elenco di azioni), usato dalle icone "⋮"
// di riga per le operazioni CRUD su progetti/baseline/task, e dal menu di
// shift della griglia (gantt-view.js). Il posizionamento (sopra/sotto
// `anchorEl` in base allo spazio reale disponibile, clampato al viewport) è
// delegato a MP.floatingPosition — vedi quel modulo per i dettagli. Passando
// `deferPosition: true` il menu viene creato e aggiunto al DOM ma non
// posizionato: usato quando il chiamante deve posizionarlo insieme ad altri
// box come un unico blocco (vedi gantt-view.js:openCellContextMenu, dove il
// menu di shift può comparire insieme al popover di allocazione).
(function (MP) {
  'use strict';

  function onOutsideClick(e) {
    const menu = document.querySelector('.context-menu');
    if (menu && !menu.contains(e.target)) closeExisting();
  }

  function closeExisting() {
    const existing = document.querySelector('.context-menu');
    if (existing) existing.remove();
    document.removeEventListener('mousedown', onOutsideClick, true);
  }

  function openMenu({ anchorEl, actions, deferPosition }) {
    closeExisting();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    actions.forEach((action) => {
      if (action.separator) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        menu.appendChild(sep);
      }
      // Riga informativa non cliccabile (es. "3 weeks selected"), non un'azione:
      // niente bottone/onClick, solo testo.
      if (action.header) {
        const label = document.createElement('div');
        label.className = 'context-menu-header';
        label.textContent = action.label;
        menu.appendChild(label);
        return;
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = action.danger ? 'context-menu-item danger' : 'context-menu-item';
      if (action.className) btn.classList.add(action.className);
      if (action.title) btn.title = action.title;
      btn.textContent = action.label;
      if (action.disabled) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          closeExisting();
          action.onClick();
        });
      }
      menu.appendChild(btn);
    });
    document.body.appendChild(menu);

    if (!deferPosition) {
      MP.floatingPosition.positionSingle(menu, anchorEl.getBoundingClientRect());
    }

    setTimeout(() => document.addEventListener('mousedown', onOutsideClick, true), 0);
    return menu;
  }

  function createMenuButton(actions, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `row-menu-btn${extraClass ? ' ' + extraClass : ''}`;
    btn.textContent = '⋮';
    btn.title = 'Actions';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMenu({ anchorEl: btn, actions });
    });
    return btn;
  }

  MP.contextMenu = { openMenu, closeExisting, createMenuButton };
})(window.MP = window.MP || {});
