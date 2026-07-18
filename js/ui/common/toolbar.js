// Menu a scomparsa nella top-bar: punto di accesso unico alle funzioni
// dell'app (cambio vista, backup, cambio cartella dati). Riusa MP.contextMenu
// per l'apertura/chiusura del pannello invece di duplicarne la logica.
(function (MP) {
  'use strict';

  const VIEWS = [
    { id: 'gantt', label: 'Master Plan' },
    { id: 'carico-risorse', label: 'Resource load' },
    { id: 'milestones', label: 'Milestones' },
    { id: 'team-risorse', label: 'Team & resources' },
  ];

  function renderHamburgerMenu(state) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hamburger-btn';
    btn.textContent = '☰';
    btn.title = 'Menu';
    btn.setAttribute('aria-label', 'Menu');
    btn.setAttribute('aria-haspopup', 'true');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      MP.contextMenu.openMenu({ anchorEl: btn, actions: buildActions(state) });
    });
    return btn;
  }

  function buildActions(state) {
    const viewActions = VIEWS.map((v, i) => ({
      label: state.ui.vistaCorrente === v.id ? `✓ ${v.label}` : v.label,
      onClick: () => MP.store.setState((s) => ({ ui: { ...s.ui, vistaCorrente: v.id } })),
      separator: i === 0,
    }));
    return [
      { label: '+ New project', onClick: () => createProject(state) },
      ...viewActions,
      { label: '💾 Backup', onClick: () => runBackup(state), className: 'context-menu-item-action', separator: true },
      { label: 'Change data folder…', onClick: () => changeDataFolder(state), separator: true },
    ];
  }

  // Raggiungibile da qualunque pagina (il menu ☰ è globale): dopo la creazione porta l'utente
  // sulla vista gantt, dove il nuovo progetto è visibile.
  async function createProject(state) {
    const file = await MP.projectCrud.createProject(state);
    if (file) MP.store.setState((s) => ({ ui: { ...s.ui, vistaCorrente: 'gantt' } }));
  }

  async function runBackup(state) {
    try {
      const result = await MP.repository.createBackup(state.dirHandle);
      MP.toast.showToast(`Backup saved to ${result.folder} (${result.fileCount} files)`, { kind: 'success' });
    } catch (e) {
      MP.toast.showToast(`Backup failed: ${e.message}`, { kind: 'error', duration: 6000 });
    }
  }

  // Rilascia l'handle della cartella dati corrente e riporta l'app alla schermata
  // "not-connected" (stesso schermo del primo avvio), da cui l'utente sceglie una
  // cartella diversa col normale pulsante "Select data folder" — nessuna logica di
  // picker duplicata qui. Nessun dato viene toccato: è solo un cambio di sessione.
  function changeDataFolder(state) {
    const nomeCorrente = state.dirHandle ? state.dirHandle.name : 'the current folder';
    const confermato = window.confirm(`Close "${nomeCorrente}" and choose a different data folder?`);
    if (!confermato) return;
    MP.store.setState({ status: 'not-connected', dirHandle: null, dataset: null });
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
