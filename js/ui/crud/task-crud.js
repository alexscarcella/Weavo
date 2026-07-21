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

  async function toggleCompleted(state, file, task) {
    task.completed = !task.completed;
    await persistProject(state, file);
  }

  // Sposta un task in una posizione esatta (usato dal drag&drop, vedi
  // task-drag.js): la baseline di destinazione può essere una qualsiasi
  // baseline dello stesso progetto (anche la stessa in cui si trova già il
  // task, per un riordino interno). targetIndex è l'indice nell'array della
  // baseline di destinazione *dopo* la rimozione del task da quello di
  // partenza.
  async function moveTaskToPosition(state, file, sourceBaseline, task, targetBaseline, targetIndex) {
    const sourceArr = sourceBaseline.task;
    const idx = sourceArr.indexOf(task);
    if (idx < 0) return;
    sourceArr.splice(idx, 1);
    let insertAt = targetIndex;
    if (sourceBaseline === targetBaseline && idx < targetIndex) insertAt -= 1;
    targetBaseline.task.splice(insertAt, 0, task);
    await persistProject(state, file);
  }

  MP.taskCrud = { createTask, renameTask, deleteTask, moveTaskToPosition, toggleCompleted };
})(window.MP = window.MP || {});
