// Store minimale in memoria (nessun framework): stato + pub/sub.
(function (MP) {
  'use strict';

  const AUTO_BACKUP_KEY = 'mp.autoBackupOnExit';

  let state = {
    status: 'init', // init | unsupported | not-connected | loading | ready | error
    dirHandle: null,
    dataset: null, // { manifest, teamRisorsa, progetti, warnings }
    error: null,
    ui: {
      vistaCorrente: 'gantt', // gantt | carico-risorse | milestones | team-risorse
      mostraArchiviati: false,
      mostraConclusi: false,
      autoBackupOnExit: localStorage.getItem(AUTO_BACKUP_KEY) === 'true',
    },
  };

  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(partial) {
    const patch = typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...patch };
    for (const listener of listeners) listener(state);
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  // Unico punto che scrive mp.autoBackupOnExit: evita che il valore in localStorage
  // e state.ui.autoBackupOnExit possano andare fuori sincrono.
  function setAutoBackupOnExit(value) {
    localStorage.setItem(AUTO_BACKUP_KEY, String(value));
    setState((s) => ({ ui: { ...s.ui, autoBackupOnExit: value } }));
  }

  MP.store = { getState, setState, subscribe, setAutoBackupOnExit };
})(window.MP = window.MP || {});
