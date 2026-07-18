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
    btn.title = 'Actions';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMenu({ anchorEl: btn, actions });
    });
    return btn;
  }

  MP.contextMenu = { openMenu, closeExisting, createMenuButton };
})(window.MP = window.MP || {});
