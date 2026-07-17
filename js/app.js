// Entry point. Script classico (nessun type="module": vedi nota in schema.js).
//
// Nessuna persistenza dell'handle cartella tra sessioni: verificato che
// IndexedDB non è utilizzabile in modo affidabile quando la pagina è aperta da
// file:// (indexedDB.open() resta bloccato, nessun evento success/error) e
// localStorage non può contenere un FileSystemDirectoryHandle. L'utente
// seleziona la cartella dati a ogni apertura dell'app (comportamento noto e
// accettato dalla spec, §5).
(function (MP) {
  'use strict';

  const fsAccess = MP.fsAccess;
  const { loadDataset } = MP.repository;
  const { getState, setState, subscribe } = MP.store;

  const appEl = document.getElementById('app');

  function render() {
    const state = getState();
    appEl.innerHTML = '';

    const renderers = {
      unsupported: renderUnsupported,
      'not-connected': renderNotConnected,
      loading: () => renderMessage('Caricamento dataset in corso...'),
      error: renderError,
      ready: renderReady,
    };

    const renderFn = renderers[state.status];
    if (renderFn) appEl.appendChild(renderFn(state));
  }

  function renderUnsupported() {
    const div = document.createElement('div');
    div.className = 'blocking-message';
    div.innerHTML = `
      <h1>Browser non supportato</h1>
      <p>Questa applicazione richiede la File System Access API, disponibile solo su
      <strong>Chrome o Edge aggiornati</strong>. Apri questa pagina in uno di questi browser.</p>`;
    return div;
  }

  function renderNotConnected() {
    const div = document.createElement('div');
    div.className = 'connect-panel';
    div.innerHTML = `
      <h1>Master Plan</h1>
      <p>Seleziona la cartella dati (es. <code>/masterplan-data/</code>) condivisa per iniziare.</p>
      <p class="hint">Il browser richiede di riselezionare la cartella a ogni apertura dell'app:
      è un limite noto della tecnologia usata, non un errore.</p>
      <button id="btn-connect">Seleziona cartella dati</button>`;
    div.querySelector('#btn-connect').addEventListener('click', connectToDirectory);
    return div;
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
    div.innerHTML = `<h1>Errore</h1><p>${state.error}</p><button id="btn-retry">Riprova</button>`;
    div.querySelector('#btn-retry').addEventListener('click', () => setState({ status: 'not-connected' }));
    return div;
  }

  function renderReady(state) {
    const wrapper = document.createElement('div');
    const topBar = document.createElement('div');
    topBar.className = 'top-bar';
    topBar.appendChild(MP.toolbar.renderHamburgerMenu(state));
    topBar.appendChild(MP.weekControls.renderWeekControls(state));
    wrapper.appendChild(topBar);
    const viewRenderers = {
      'carico-risorse': MP.resourceLoadView.renderResourceLoadView,
      'team-risorse': MP.teamRisorsaView.renderTeamRisorsaView,
    };
    const renderView = viewRenderers[state.ui.vistaCorrente] || MP.ganttView.renderGanttView;
    wrapper.appendChild(renderView(state));
    return wrapper;
  }

  async function connectToDirectory() {
    setState({ status: 'loading' });
    try {
      const handle = await fsAccess.pickDirectory();
      const dataset = await loadDataset(handle);
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
    if (!fsAccess.isSupported()) {
      setState({ status: 'unsupported' });
      return;
    }
    setState({ status: 'not-connected' });
  }

  subscribe(render);
  bootstrap();
})(window.MP = window.MP || {});
