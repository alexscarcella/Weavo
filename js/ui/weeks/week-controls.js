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
      window.alert(`Error saving manifest.json: ${e.message}`);
    }
  }

  async function handleAddWeek(state) {
    const manifest = state.dataset.manifest;
    manifest.weeks.last = addWeeks(manifest.weeks.last, 1);
    await persistManifest(state);
  }

  function buildRemovalReport(etichetta, attive, chiuse) {
    const riga = (a) => `${a.progetto} / BL ${a.baseline} / ${a.task}`;
    const sezione = (titolo, records) => [
      `${titolo} (${records.length}):`,
      ...(records.length ? records.map(riga) : ['(none)']),
    ].join('\n');
    return [
      `Week: ${etichetta}`,
      '',
      sezione('ACTIVE allocations (still binding)', attive),
      '',
      sezione('Completed/closed allocations (no longer binding)', chiuse),
    ].join('\n');
  }

  async function handleRemoveWeek(state) {
    const { dataset } = state;
    const manifest = dataset.manifest;
    const weeks = getWeeksInRange(manifest.weeks.first, manifest.weeks.last);

    if (weeks.length < 2) {
      window.alert('Cannot remove: at least one week must remain in the gantt.');
      return;
    }

    const settimanaDaRimuovere = manifest.weeks.first;
    const weeksToRemove = new Set([settimanaDaRimuovere]);
    const allocazioni = findAllocationsInWeeks(dataset, weeksToRemove);
    const etichetta = formatWeekLabel(settimanaDaRimuovere);

    if (allocazioni.length > 0) {
      const attive = allocazioni.filter((a) => !a.completed);
      const chiuse = allocazioni.filter((a) => a.completed);
      const confermato = await MP.modal.confirmWithReport({
        title: `Remove the week of ${etichetta}?`,
        message: `${allocazioni.length} allocations will be permanently deleted (${attive.length} active, ${chiuse.length} completed/closed). The text below is pre-selected: copy it if you want to keep it elsewhere.`,
        reportText: buildRemovalReport(etichetta, attive, chiuse),
        confirmLabel: 'Proceed with deletion',
        cancelLabel: 'Cancel',
        danger: true,
        boxClass: 'week-remove-report-card',
        rows: 20,
      });
      if (!confermato) return;
    } else if (!window.confirm(`Remove the week of ${etichetta}?`)) {
      return;
    }

    const fileDaSalvare = [];
    for (const [file, { data: progetto }] of dataset.projects) {
      let modificato = false;
      progetto.baseline.forEach((baseline) => {
        baseline.task.forEach((task) => {
          if (task.weeks && settimanaDaRimuovere in task.weeks) {
            delete task.weeks[settimanaDaRimuovere];
            modificato = true;
          }
        });
      });
      if (modificato) fileDaSalvare.push(file);
    }

    manifest.weeks.first = addWeeks(settimanaDaRimuovere, 1);

    try {
      await MP.saveCoordinator.saveManifest(state);
      for (const file of fileDaSalvare) {
        await MP.saveCoordinator.saveProject(state, file);
      }
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving: ${e.message}`);
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
    btn.title = 'Add a week at the end of the gantt (future)';
    btn.setAttribute('aria-label', 'Add week');
    btn.addEventListener('click', () => handleAddWeek(state));
    return btn;
  }

  function renderRemoveWeekButton(state) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'week-edge-btn week-edge-remove';
    btn.textContent = '−';
    btn.title = 'Remove the first week of the gantt (past)';
    btn.setAttribute('aria-label', 'Remove week');
    btn.addEventListener('click', () => handleRemoveWeek(state));
    return btn;
  }

  MP.weekControls = { renderAddWeekButton, renderRemoveWeekButton, handleAddWeek, handleRemoveWeek };
})(window.MP = window.MP || {});
