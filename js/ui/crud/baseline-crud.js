// CRUD baseline all'interno di un progetto: crea, rinomina, elimina, riordina.
(function (MP) {
  'use strict';

  async function persistProject(state, file) {
    try {
      await MP.saveCoordinator.saveProject(state, file);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Errore nel salvataggio: ${e.message}`);
    }
  }

  async function createBaseline(state, file, versioneInput) {
    const versione = versioneInput !== undefined ? versioneInput : window.prompt('Nome/versione della nuova baseline:');
    if (!versione || !versione.trim()) return;
    const progetto = state.dataset.progetti.get(file).data;
    progetto.baseline.push(MP.schema.createBaseline(versione.trim()));
    await persistProject(state, file);
  }

  async function renameBaseline(state, file, baseline, nuovoInput) {
    const nuovo = nuovoInput !== undefined ? nuovoInput : window.prompt('Nuovo nome/versione della baseline:', baseline.versione);
    if (!nuovo || !nuovo.trim()) return;
    baseline.versione = nuovo.trim();
    await persistProject(state, file);
  }

  async function deleteBaseline(state, file, baseline, skipConfirm) {
    const progetto = state.dataset.progetti.get(file).data;
    const confermato = skipConfirm || window.confirm(
      `Eliminare la baseline "${baseline.versione}" e tutti i suoi task? L'operazione non è reversibile.`
    );
    if (!confermato) return;
    progetto.baseline = progetto.baseline.filter((b) => b !== baseline);
    await persistProject(state, file);
  }

  async function moveBaseline(state, file, baseline, direction) {
    const progetto = state.dataset.progetti.get(file).data;
    const arr = progetto.baseline;
    const idx = arr.indexOf(baseline);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= arr.length) return;
    [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
    await persistProject(state, file);
  }

  MP.baselineCrud = { createBaseline, renameBaseline, deleteBaseline, moveBaseline };
})(window.MP = window.MP || {});
