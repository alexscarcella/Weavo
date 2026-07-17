// CRUD task all'interno di una baseline: crea, rinomina, elimina, riordina,
// toggle "concluso" (azione diretta, senza riaprire il popover della cella).
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

  async function createTask(state, file, baseline, nomeInput) {
    const nome = nomeInput !== undefined ? nomeInput : window.prompt('Nome del nuovo task:');
    if (!nome || !nome.trim()) return;
    baseline.task.push(MP.schema.createTask(nome.trim()));
    await persistProject(state, file);
  }

  async function renameTask(state, file, task, nuovoInput) {
    const nuovo = nuovoInput !== undefined ? nuovoInput : window.prompt('Nuovo nome del task:', task.nome);
    if (!nuovo || !nuovo.trim()) return;
    task.nome = nuovo.trim();
    await persistProject(state, file);
  }

  async function deleteTask(state, file, baseline, task, skipConfirm) {
    const confermato = skipConfirm || window.confirm(
      `Eliminare il task "${task.nome}" e tutte le sue allocazioni? L'operazione non è reversibile.`
    );
    if (!confermato) return;
    baseline.task = baseline.task.filter((t) => t !== task);
    await persistProject(state, file);
  }

  async function moveTask(state, file, baseline, task, direction) {
    const arr = baseline.task;
    const idx = arr.indexOf(task);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= arr.length) return;
    [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
    await persistProject(state, file);
  }

  async function toggleConcluso(state, file, task) {
    task.concluso = !task.concluso;
    await persistProject(state, file);
  }

  MP.taskCrud = { createTask, renameTask, deleteTask, moveTask, toggleConcluso };
})(window.MP = window.MP || {});
