// Entry point. Script classico (nessun type="module": vedi nota in schema.js).
//
// Nessuna persistenza dell'handle cartella tra sessioni: verificato che
// IndexedDB non è utilizzabile in modo affidabile quando la pagina è aperta da
// file:// (indexedDB.open() resta bloccato, nessun evento success/error) e
// localStorage non può contenere un FileSystemDirectoryHandle. L'utente
// seleziona la cartella dati a ogni apertura dell'app (comportamento noto e
// accettato dalla spec, §5). L'opzione `id` passata a showDirectoryPicker in
// fs-access.js, che in teoria dovrebbe far riaprire il dialogo già navigato
// sull'ultima cartella scelta, verificato che NON funziona sotto file:// (vedi
// commento in fs-access.js) — non riduce i click, non promettere il contrario
// a schermo. L'unica vera mitigazione è il nome dell'ultima cartella connessa
// con successo, salvato in localStorage (solo il nome, mai l'handle) e
// mostrato come promemoria per riconoscere la cartella giusta.
(function (MP) {
  'use strict';

  const fsAccess = MP.fsAccess;
  const { loadDataset } = MP.repository;
  const { getState, setState, subscribe } = MP.store;

  const appEl = document.getElementById('app');
  const LAST_FOLDER_KEY = 'mp.lastFolderName';

  function render() {
    const state = getState();

    // Ogni azione (anche il salvataggio di una singola cella) passa da un
    // MP.store.setState() che qui rifà l'intero albero DOM da zero: senza
    // questo salva/ripristina, lo scroll orizzontale/verticale della griglia
    // (.gantt-scroll, condivisa da gantt e resource-load) tornerebbe sempre
    // a 0,0 a ogni edit, facendo "sparire" dalla vista la cella appena
    // modificata anche quando l'utente era scrollato altrove.
    const prevScroll = appEl.querySelector('.gantt-scroll');
    const scrollLeft = prevScroll ? prevScroll.scrollLeft : 0;
    const scrollTop = prevScroll ? prevScroll.scrollTop : 0;

    appEl.innerHTML = '';

    const renderers = {
      unsupported: renderUnsupported,
      'not-connected': renderNotConnected,
      loading: () => renderMessage('Loading dataset...'),
      error: renderError,
      ready: renderReady,
    };

    const renderFn = renderers[state.status];
    if (renderFn) appEl.appendChild(renderFn(state));

    const nextScroll = appEl.querySelector('.gantt-scroll');
    if (nextScroll) {
      nextScroll.scrollLeft = scrollLeft;
      nextScroll.scrollTop = scrollTop;
    }
  }

  function renderUnsupported() {
    const div = document.createElement('div');
    div.className = 'blocking-message';
    div.innerHTML = `
      <h1>Unsupported browser</h1>
      <p>This application requires the File System Access API, available only on
      <strong>up-to-date Chrome or Edge</strong>. Open this page in one of these browsers.</p>`;
    return div;
  }

  function renderNotConnected() {
    const div = document.createElement('div');
    div.className = 'connect-panel';
    // Solo il nome della cartella (handle.name), mai il percorso assoluto: la File
    // System Access API non lo espone mai (sandboxing di piattaforma, non un
    // limite di questa app) — niente `.path` su FileSystemHandle, per nessun
    // motivo aggirabile lato JS.
    const lastFolderName = localStorage.getItem(LAST_FOLDER_KEY);
    const lastFolderHint = lastFolderName
      ? `<p class="hint">Last folder used on this PC: <strong>${escapeHtml(lastFolderName)}</strong></p>`
      : '';
    div.innerHTML = `
      <h1>Connect the data folder</h1>
      <p>Select the shared data folder (e.g. <code>/masterplan-data/</code>) to get started.</p>
      <p class="hint">The browser requires you to re-select the folder every time the app is opened:
      this is a known limitation of the technology used, not an error.</p>
      ${lastFolderHint}
      <button id="btn-connect">Select data folder</button>`;
    div.querySelector('#btn-connect').addEventListener('click', connectToDirectory);
    return div;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function renderMessage(text) {
    const div = document.createElement('div');
    div.className = 'status-message';
    div.textContent = text;
    return div;
  }

  function renderError(state) {
    const div = document.createElement('div');
    div.className = 'error-panel';
    div.innerHTML = `<h1>Error</h1><p>${state.error}</p><button id="btn-retry">Retry</button>`;
    div.querySelector('#btn-retry').addEventListener('click', () => setState({ status: 'not-connected' }));
    return div;
  }

  function renderReady(state) {
    const wrapper = document.createElement('div');
    wrapper.className = 'app-ready';
    const topBar = document.createElement('div');
    topBar.className = 'top-bar';
    topBar.appendChild(MP.toolbar.renderHamburgerMenu(state));
    topBar.appendChild(MP.toolbar.renderPageTitle(state));
    topBar.appendChild(MP.toolbar.renderHelpButton());
    wrapper.appendChild(topBar);
    const viewRenderers = {
      'resource-load': MP.resourceLoadView.renderResourceLoadView,
      'team-resources': MP.teamResourcesView.renderTeamResourcesView,
      milestones: MP.milestonesView.renderMilestonesView,
    };
    const renderView = viewRenderers[state.ui.currentView] || MP.ganttView.renderGanttView;
    wrapper.appendChild(renderView(state));
    return wrapper;
  }

  async function connectToDirectory() {
    setState({ status: 'loading' });
    try {
      const handle = await fsAccess.pickDirectory();
      const dataset = await loadDataset(handle);
      localStorage.setItem(LAST_FOLDER_KEY, handle.name);
      setState({ status: 'ready', dirHandle: handle, dataset });
    } catch (e) {
      if (e.name === 'AbortError') {
        setState({ status: 'not-connected' });
        return;
      }
      setState({ status: 'error', error: e.message });
    }
  }

  function bootstrap() {
    document.getElementById('app-header').appendChild(MP.appHeader.renderHeader());
    if (!fsAccess.isSupported()) {
      setState({ status: 'unsupported' });
      return;
    }
    setState({ status: 'not-connected' });
  }

  let backupOnExitInFlight = false;

  // pagehide scatta anche solo per ingresso in bfcache, non solo per chiusura reale:
  // il flag evita un secondo backup se scattasse di nuovo mentre il precedente è
  // ancora in corso. Fire-and-forget: l'handler non può attendere l'operazione async
  // prima che la pagina venga scaricata, quindi su una chiusura reale la scrittura
  // multi-file può restare incompleta — accettato, vedi docs/deployment.md "Backups".
  window.addEventListener('pagehide', () => {
    const state = getState();
    if (backupOnExitInFlight) return;
    if (!state.ui.autoBackupOnExit || state.status !== 'ready' || !state.dirHandle) return;
    backupOnExitInFlight = true;
    MP.repository.createBackup(state.dirHandle)
      .catch(() => {})
      .finally(() => { backupOnExitInFlight = false; });
  });

  subscribe(render);
  bootstrap();
})(window.MP = window.MP || {});
