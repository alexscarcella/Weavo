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

  // Shift dell'intera baseline (tutti i task non-completed, milestone comprese) di N
  // settimane avanti/indietro in un colpo solo — vedi MP.weekShift.canShiftBaseline/
  // shiftBaselineData per la logica pura. `deltaInput` (usato dai test) bypassa il
  // prompt.
  async function shiftBaseline(state, file, baseline, deltaInput) {
    const raw = deltaInput !== undefined ? deltaInput : window.prompt(
      'How many weeks should the whole baseline shift? Use a negative number to shift backward, positive to shift forward (e.g. -2 or 3):'
    );
    if (raw === null || raw === undefined) return;
    const trimmed = String(raw).trim();
    if (!/^-?\d+$/.test(trimmed)) {
      window.alert('Enter a whole number of weeks (e.g. -2 or 3).');
      return;
    }
    const delta = parseInt(trimmed, 10);
    if (delta === 0) {
      window.alert('Enter a non-zero number of weeks.');
      return;
    }

    const check = MP.weekShift.canShiftBaseline(state.dataset, baseline, delta);
    if (!check.allowed) {
      window.alert(check.reason);
      return;
    }
    if (check.movedWeeksCount === 0) {
      window.alert('This baseline has no allocations or milestones to shift.');
      return;
    }

    const direction = delta > 0 ? 'forward' : 'backward';
    const magnitude = Math.abs(delta);
    const skippedNote = check.skippedCompletedCount > 0
      ? ` ${check.skippedCompletedCount} completed task(s) will be left untouched.`
      : '';
    const confermato = window.confirm(
      `Shift baseline "${baseline.version}" ${magnitude} week(s) ${direction}? This will move ${check.movedWeeksCount} allocation(s)/milestone(s) across ${check.affectedTasksCount} task(s).${skippedNote}`
    );
    if (!confermato) return;

    MP.weekShift.shiftBaselineData(baseline, delta);
    await persistProject(state, file);
  }

  MP.baselineCrud = { createBaseline, renameBaseline, deleteBaseline, moveBaseline, toggleArchived, shiftBaseline };
})(window.MP = window.MP || {});
