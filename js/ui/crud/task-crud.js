// CRUD task all'interno di una baseline: crea, rinomina, elimina, riordina,
// toggle "completed" (azione diretta, senza riaprire il popover della cella).
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

  async function createTask(state, file, baseline, nameInput) {
    const name = nameInput !== undefined ? nameInput : window.prompt('Name of the new task:');
    if (!name || !name.trim()) return;
    baseline.task.push(MP.schema.createTask(name.trim()));
    await persistProject(state, file);
  }

  async function renameTask(state, file, task, nuovoInput) {
    const nuovo = nuovoInput !== undefined ? nuovoInput : window.prompt('New task name:', task.name);
    if (!nuovo || !nuovo.trim()) return;
    task.name = nuovo.trim();
    await persistProject(state, file);
  }

  async function deleteTask(state, file, baseline, task, skipConfirm) {
    const confermato = skipConfirm || window.confirm(
      `Delete the task "${task.name}" and all its allocations? This cannot be undone.`
    );
    if (!confermato) return;
    baseline.task = baseline.task.filter((t) => t !== task);
    await persistProject(state, file);
  }

  // Sposta un task su/giù nella sua baseline; se il task è già in cima/fondo,
  // attraversa il confine verso la baseline precedente/successiva dello
  // stesso progetto (append in fondo se si sale, in testa se si scende, così
  // il task si posiziona subito accanto al confine attraversato). Nessun-op
  // se non c'è una baseline adiacente in quella direzione.
  async function moveTask(state, file, baseline, task, direction) {
    const arr = baseline.task;
    const idx = arr.indexOf(task);
    if (idx < 0) return;
    const swapWith = idx + direction;
    if (swapWith >= 0 && swapWith < arr.length) {
      [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
      await persistProject(state, file);
      return;
    }
    const progetto = state.dataset.projects.get(file).data;
    const baselineIdx = progetto.baseline.indexOf(baseline);
    const targetBaselineIdx = baselineIdx + direction;
    if (targetBaselineIdx < 0 || targetBaselineIdx >= progetto.baseline.length) return;
    const targetBaseline = progetto.baseline[targetBaselineIdx];
    arr.splice(idx, 1);
    if (direction < 0) targetBaseline.task.push(task);
    else targetBaseline.task.unshift(task);
    await persistProject(state, file);
  }

  async function toggleCompleted(state, file, task) {
    task.completed = !task.completed;
    await persistProject(state, file);
  }

  MP.taskCrud = { createTask, renameTask, deleteTask, moveTask, toggleCompleted };
})(window.MP = window.MP || {});
