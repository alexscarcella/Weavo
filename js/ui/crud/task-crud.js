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
    const progetto = state.dataset.progetti.get(file).data;
    const baselineIdx = progetto.baseline.indexOf(baseline);
    const targetBaselineIdx = baselineIdx + direction;
    if (targetBaselineIdx < 0 || targetBaselineIdx >= progetto.baseline.length) return;
    const targetBaseline = progetto.baseline[targetBaselineIdx];
    arr.splice(idx, 1);
    if (direction < 0) targetBaseline.task.push(task);
    else targetBaseline.task.unshift(task);
    await persistProject(state, file);
  }

  async function toggleConcluso(state, file, task) {
    task.concluso = !task.concluso;
    await persistProject(state, file);
  }

  MP.taskCrud = { createTask, renameTask, deleteTask, moveTask, toggleConcluso };
})(window.MP = window.MP || {});
