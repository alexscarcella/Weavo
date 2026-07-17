// Menu a scomparsa nella top-bar: punto di accesso unico alle funzioni
// dell'app (cambio vista, backup). Riusa MP.contextMenu per l'apertura/
// chiusura del pannello invece di duplicarne la logica.
(function (MP) {
  'use strict';

  const VIEWS = [
    { id: 'gantt', label: 'Master Plan' },
    { id: 'carico-risorse', label: 'Carico risorse' },
    { id: 'milestones', label: 'Milestone' },
    { id: 'team-risorse', label: 'Team e risorse' },
  ];

  function renderHamburgerMenu(state) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hamburger-btn';
    btn.textContent = '☰';
    btn.title = 'Menu funzioni';
    btn.setAttribute('aria-label', 'Menu funzioni');
    btn.setAttribute('aria-haspopup', 'true');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      MP.contextMenu.openMenu({ anchorEl: btn, actions: buildActions(state) });
    });
    return btn;
  }

  function buildActions(state) {
    const viewActions = VIEWS.map((v) => ({
      label: state.ui.vistaCorrente === v.id ? `✓ ${v.label}` : v.label,
      onClick: () => MP.store.setState((s) => ({ ui: { ...s.ui, vistaCorrente: v.id } })),
    }));
    return [
      ...viewActions,
      { label: '💾 Backup', onClick: () => runBackup(state), className: 'context-menu-item-action', separator: true },
    ];
  }

  async function runBackup(state) {
    try {
      const result = await MP.repository.createBackup(state.dirHandle);
      MP.toast.showToast(`Backup salvato in ${result.folder} (${result.fileCount} file)`, { kind: 'success' });
    } catch (e) {
      MP.toast.showToast(`Errore durante il backup: ${e.message}`, { kind: 'error', duration: 6000 });
    }
  }

  // Nome della pagina corrente accanto al menu ☰ — stessa etichetta usata nel menu.
  function renderPageTitle(state) {
    const span = document.createElement('span');
    span.className = 'page-title';
    const view = VIEWS.find((v) => v.id === state.ui.vistaCorrente);
    span.textContent = view ? view.label : '';
    return span;
  }

  MP.toolbar = { renderHamburgerMenu, renderPageTitle };
})(window.MP = window.MP || {});
