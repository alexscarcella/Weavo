// Piccolo menu contestuale generico (elenco di azioni), usato dalle icone "⋮"
// di riga per le operazioni CRUD su progetti/baseline/task.
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

  function openMenu({ anchorEl, actions }) {
    closeExisting();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = action.danger ? 'context-menu-item danger' : 'context-menu-item';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        closeExisting();
        action.onClick();
      });
      menu.appendChild(btn);
    });
    document.body.appendChild(menu);

    const rect = anchorEl.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${Math.min(rect.bottom + 2, window.innerHeight - 220)}px`;
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 190)}px`;

    setTimeout(() => document.addEventListener('mousedown', onOutsideClick, true), 0);
  }

  function createMenuButton(actions, extraClass) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `row-menu-btn${extraClass ? ' ' + extraClass : ''}`;
    btn.textContent = '⋮';
    btn.title = 'Azioni';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMenu({ anchorEl: btn, actions });
    });
    return btn;
  }

  MP.contextMenu = { openMenu, closeExisting, createMenuButton };
})(window.MP = window.MP || {});
