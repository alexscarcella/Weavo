// Comandi "aggiungi settimana" / "elimina ultime N settimane" (solo in coda,
// mai nel mezzo). L'eliminazione chiede conferma se ci sono allocazioni attive
// nelle settimane da rimuovere, per evitare cancellazioni accidentali di dati.
(function (MP) {
  'use strict';

  const { addWeeks, getWeeksInRange, findAllocationsInWeeks } = MP.weekUtils;

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

  async function handleRemoveWeeks(state, n) {
    const { dataset } = state;
    const manifest = dataset.manifest;
    const weeks = getWeeksInRange(manifest.settimane.prima, manifest.settimane.ultima);

    if (!Number.isInteger(n) || n < 1 || n >= weeks.length) {
      window.alert('Numero di settimane da eliminare non valido: deve restare almeno una settimana nel gantt.');
      return;
    }

    const weeksToRemove = new Set(weeks.slice(weeks.length - n));
    const allocazioni = findAllocationsInWeeks(dataset, weeksToRemove);

    if (allocazioni.length > 0) {
      const dettaglio = allocazioni
        .slice(0, 10)
        .map((a) => `- ${a.progetto} / BL ${a.baseline} / ${a.task} / ${a.settimana}`)
        .join('\n');
      const extra = allocazioni.length > 10 ? `\n… e altre ${allocazioni.length - 10} allocazioni.` : '';
      const confermato = window.confirm(
        `Le ultime ${n} settimane contengono ${allocazioni.length} allocazioni che verranno eliminate definitivamente:\n\n${dettaglio}${extra}\n\nProcedere comunque?`
      );
      if (!confermato) return;
    }

    const fileDaSalvare = [];
    for (const [file, { data: progetto }] of dataset.progetti) {
      let modificato = false;
      progetto.baseline.forEach((baseline) => {
        baseline.task.forEach((task) => {
          weeksToRemove.forEach((w) => {
            if (task.settimane && w in task.settimane) {
              delete task.settimane[w];
              modificato = true;
            }
          });
        });
      });
      if (modificato) fileDaSalvare.push(file);
    }

    manifest.settimane.ultima = addWeeks(manifest.settimane.ultima, -n);

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

  function renderWeekControls(state) {
    const div = document.createElement('div');
    div.className = 'week-controls';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = '+ Aggiungi settimana';
    addBtn.addEventListener('click', () => handleAddWeek(state));

    const removeInput = document.createElement('input');
    removeInput.type = 'number';
    removeInput.min = '1';
    removeInput.value = '1';
    removeInput.className = 'week-remove-input';
    removeInput.title = 'Numero di settimane da eliminare dalla coda';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Elimina ultime N settimane';
    removeBtn.addEventListener('click', () => {
      handleRemoveWeeks(state, parseInt(removeInput.value, 10));
    });

    div.appendChild(addBtn);
    div.appendChild(removeInput);
    div.appendChild(removeBtn);
    return div;
  }

  MP.weekControls = { renderWeekControls, handleAddWeek, handleRemoveWeeks };
})(window.MP = window.MP || {});
