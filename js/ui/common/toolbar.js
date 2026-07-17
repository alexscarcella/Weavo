// Menu a scomparsa nella top-bar: punto di accesso unico alle funzioni
// dell'app (cambio vista, backup). Riusa MP.contextMenu per l'apertura/
// chiusura del pannello invece di duplicarne la logica.
(function (MP) {
  'use strict';

  const VIEWS = [
    { id: 'gantt', label: 'Gantt' },
    { id: 'carico-risorse', label: 'Carico risorse' },
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
    return [...viewActions, { label: 'Backup', onClick: () => runBackup(state) }];
  }

  async function runBackup(state) {
    try {
      const result = await MP.repository.createBackup(state.dirHandle);
      MP.toast.showToast(`Backup salvato in ${result.folder} (${result.fileCount} file)`, { kind: 'success' });
    } catch (e) {
      MP.toast.showToast(`Errore durante il backup: ${e.message}`, { kind: 'error', duration: 6000 });
    }
  }

  MP.toolbar = { renderHamburgerMenu };
})(window.MP = window.MP || {});
