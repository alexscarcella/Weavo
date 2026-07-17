// Store minimale in memoria (nessun framework): stato + pub/sub.
(function (MP) {
  'use strict';

  let state = {
    status: 'init', // init | unsupported | not-connected | loading | ready | error
    dirHandle: null,
    dataset: null, // { manifest, teamRisorsa, progetti, warnings }
    error: null,
    ui: {
      vistaCorrente: 'gantt', // gantt | carico-risorse | milestones | team-risorse
      mostraArchiviati: false,
      mostraConclusi: false,
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

  MP.store = { getState, setState, subscribe };
})(window.MP = window.MP || {});
