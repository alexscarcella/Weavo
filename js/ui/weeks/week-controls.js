// Comandi "aggiungi settimana" (in coda, futuro, lato destro del gantt) ed
// "elimina settimana" (in testa, passato, lato sinistro del gantt) — sempre una
// settimana alla volta. L'eliminazione richiede sempre una conferma esplicita
// dell'utente, con dettaglio delle allocazioni che andrebbero perse se presenti.
(function (MP) {
  'use strict';

  const { addWeeks, getWeeksInRange, formatWeekLabel, findAllocationsInWeeks } = MP.weekUtils;

  async function persistManifest(state) {
    try {
      await MP.saveCoordinator.saveManifest(state);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Errore nel salvataggio di manifest.json: ${e.message}`);
    }
  }

  async function handleAddWeek(state) {
    const manifest = state.dataset.manifest;
    manifest.settimane.ultima = addWeeks(manifest.settimane.ultima, 1);
    await persistManifest(state);
  }

  async function handleRemoveWeek(state) {
    const { dataset } = state;
    const manifest = dataset.manifest;
    const weeks = getWeeksInRange(manifest.settimane.prima, manifest.settimane.ultima);

    if (weeks.length < 2) {
      window.alert('Impossibile eliminare: deve restare almeno una settimana nel gantt.');
      return;
    }

    const settimanaDaRimuovere = manifest.settimane.prima;
    const weeksToRemove = new Set([settimanaDaRimuovere]);
    const allocazioni = findAllocationsInWeeks(dataset, weeksToRemove);
    const etichetta = formatWeekLabel(settimanaDaRimuovere);

    let messaggio = `Eliminare la settimana del ${etichetta}?`;
    if (allocazioni.length > 0) {
      const dettaglio = allocazioni
        .slice(0, 10)
        .map((a) => `- ${a.progetto} / BL ${a.baseline} / ${a.task}`)
        .join('\n');
      const extra = allocazioni.length > 10 ? `\n… e altre ${allocazioni.length - 10} allocazioni.` : '';
      messaggio = `La settimana del ${etichetta} contiene ${allocazioni.length} allocazioni che verranno eliminate definitivamente:\n\n${dettaglio}${extra}\n\nProcedere comunque?`;
    }
    if (!window.confirm(messaggio)) return;

    const fileDaSalvare = [];
    for (const [file, { data: progetto }] of dataset.progetti) {
      let modificato = false;
      progetto.baseline.forEach((baseline) => {
        baseline.task.forEach((task) => {
          if (task.settimane && settimanaDaRimuovere in task.settimane) {
            delete task.settimane[settimanaDaRimuovere];
            modificato = true;
          }
        });
      });
      if (modificato) fileDaSalvare.push(file);
    }

    manifest.settimane.prima = addWeeks(settimanaDaRimuovere, 1);

    try {
      await MP.saveCoordinator.saveManifest(state);
      for (const file of fileDaSalvare) {
        await MP.saveCoordinator.saveProject(state, file);
      }
      MP.store.setState({});
    } catch (e) {
      window.alert(`Errore nel salvataggio: ${e.message}`);
    }
  }

  // Pulsanti "a bordo tabella", in stile Excel (maniglie di espansione/riduzione
  // agli estremi della tabella): l'elimina va appeso al fianco sinistro del
  // gantt (rimuove dal passato), l'aggiungi al fianco destro (estende nel
  // futuro) — vedi gantt-view.js, che li affianca allo scroll container invece
  // di metterli nella top-bar generica.
  function renderAddWeekButton(state) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'week-edge-btn week-edge-add';
    btn.textContent = '+';
    btn.title = 'Aggiungi una settimana in fondo al gantt (futuro)';
    btn.setAttribute('aria-label', 'Aggiungi settimana');
    btn.addEventListener('click', () => handleAddWeek(state));
    return btn;
  }

  function renderRemoveWeekButton(state) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'week-edge-btn week-edge-remove';
    btn.textContent = '−';
    btn.title = 'Elimina la prima settimana del gantt (passato)';
    btn.setAttribute('aria-label', 'Elimina settimana');
    btn.addEventListener('click', () => handleRemoveWeek(state));
    return btn;
  }

  MP.weekControls = { renderAddWeekButton, renderRemoveWeekButton, handleAddWeek, handleRemoveWeek };
})(window.MP = window.MP || {});
