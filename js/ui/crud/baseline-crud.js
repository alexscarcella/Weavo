// CRUD baseline all'interno di un progetto: crea, rinomina, elimina, riordina.
(function (MP) {
  'use strict';

  async function persistProject(state, file) {
    try {
      await MP.saveCoordinator.saveProject(state, file);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving: ${e.message}`);
    }
  }

  async function createBaseline(state, file, versionInput) {
    const version = versionInput !== undefined ? versionInput : window.prompt('Name/version of the new baseline:');
    if (!version || !version.trim()) return;
    const progetto = state.dataset.projects.get(file).data;
    progetto.baseline.push(MP.schema.createBaseline(version.trim()));
    await persistProject(state, file);
  }

  async function renameBaseline(state, file, baseline, nuovoInput) {
    const nuovo = nuovoInput !== undefined ? nuovoInput : window.prompt('New name/version of the baseline:', baseline.version);
    if (!nuovo || !nuovo.trim()) return;
    baseline.version = nuovo.trim();
    await persistProject(state, file);
  }

  async function deleteBaseline(state, file, baseline, skipConfirm) {
    const progetto = state.dataset.projects.get(file).data;
    const confermato = skipConfirm || window.confirm(
      `Delete the baseline "${baseline.version}" and all its tasks? This cannot be undone.`
    );
    if (!confermato) return;
    progetto.baseline = progetto.baseline.filter((b) => b !== baseline);
    await persistProject(state, file);
  }

  async function moveBaseline(state, file, baseline, direction) {
    const progetto = state.dataset.projects.get(file).data;
    const arr = progetto.baseline;
    const idx = arr.indexOf(baseline);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= arr.length) return;
    [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
    await persistProject(state, file);
  }

  async function toggleArchived(state, file, baseline) {
    baseline.archived = !baseline.archived;
    await persistProject(state, file);
  }

  MP.baselineCrud = { createBaseline, renameBaseline, deleteBaseline, moveBaseline, toggleArchived };
})(window.MP = window.MP || {});
