// Store minimale in memoria (nessun framework): stato + pub/sub.
(function (MP) {
  'use strict';

  const AUTO_BACKUP_KEY = 'mp.autoBackupOnExit';
  const NOTIFY_REMOTE_CHANGES_KEY = 'mp.notifyOnRemoteChanges';

  let state = {
    status: 'init', // init | unsupported | not-connected | loading | ready | error
    dirHandle: null,
    dataset: null, // { manifest, teamResources, projects, warnings }
    error: null,
    ui: {
      currentView: 'gantt', // gantt | resource-load | milestones | team-resources
      showCompletedProjects: false,
      showCompleted: false,
      autoBackupOnExit: localStorage.getItem(AUTO_BACKUP_KEY) === 'true',
      // Preavviso "il dataset è cambiato su disco" al ritorno di focus sulla scheda
      // (vedi remote-check.js/app.js) — opt-in, off di default: introduce una rilettura
      // di ogni file noto del dataset a ogni cambio di focus, per quanto non un I/O
      // continuo/periodico (nessun timer coinvolto).
      notifyOnRemoteChanges: localStorage.getItem(NOTIFY_REMOTE_CHANGES_KEY) === 'true',
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

  // Stesso schema di setAutoBackupOnExit: un solo punto di scrittura per evitare che
  // localStorage e state.ui.notifyOnRemoteChanges vadano fuori sincrono.
  function setNotifyOnRemoteChanges(value) {
    localStorage.setItem(NOTIFY_REMOTE_CHANGES_KEY, String(value));
    setState((s) => ({ ui: { ...s.ui, notifyOnRemoteChanges: value } }));
  }

  MP.store = { getState, setState, subscribe, setAutoBackupOnExit, setNotifyOnRemoteChanges };
})(window.MP = window.MP || {});
