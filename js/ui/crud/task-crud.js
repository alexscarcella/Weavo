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

  // A differenza di renameTask, una stringa vuota è un valore valido (svuota la nota) — solo
  // null/undefined (Cancel sul modal) è "annulla".
  async function setTaskNote(state, file, task, noteInput) {
    const nota = noteInput !== undefined
      ? noteInput
      : await MP.modal.promptText({
          title: task.note ? 'Edit note' : 'Add note',
          label: 'Note',
          value: task.note || '',
          multiline: true,
          maxLength: 200,
        });
    if (nota === null || nota === undefined) return;
    task.note = nota.trim().slice(0, 200);
    await persistProject(state, file);
  }

  // Date condivise (readyForUat/uat) attualmente in vigore su `baseline`,
  // lette dal primo task non completed che le porta (per l'invariante
  // mantenuto da syncBaselineMilestone in gantt-view.js, tutti i task non
  // completed della stessa baseline condividono lo stesso valore per ciascun
  // tipo, quindi il primo trovato basta). null per un tipo se nessun task
  // della baseline di destinazione lo porta ancora.
  function findBaselineSharedMilestoneDates(baseline) {
    const dates = { readyForUat: null, uat: null };
    for (const t of baseline.task) {
      if (t.completed) continue;
      const taskDates = MP.milestoneRules.collectTaskMilestoneDates(t);
      if (dates.readyForUat === null && taskDates.readyForUat) dates.readyForUat = taskDates.readyForUat;
      if (dates.uat === null && taskDates.uat) dates.uat = taskDates.uat;
    }
    return dates;
  }

  // Riscrive le settimane readyForUat/uat di `task` per farle coincidere con
  // `adopted` (le date condivise della baseline di destinazione): rimuove le
  // vecchie settimane di questi 2 tipi (appartenevano alla baseline di
  // partenza) e imposta le nuove, preservando team/resources/completed
  // eventualmente già presenti su quella settimana (stesso merge non
  // distruttivo di syncBaselineMilestone) — tranne che per UAT, dove
  // l'assegnazione di risorse è inibita (vedi MP.schema.createWeekEntry): se
  // la settimana adottata ha già un'allocazione, viene rimossa. taskDeadline
  // non è mai toccata: resta una scadenza del task, indipendente dalla
  // baseline che lo contiene.
  function applyAdoptedSharedDates(task, adopted) {
    for (const [iso, entry] of Object.entries(task.weeks || {})) {
      if (!entry || (entry.milestone !== MP.schema.MILESTONE_TYPES.READY_FOR_UAT && entry.milestone !== MP.schema.MILESTONE_TYPES.UAT)) continue;
      delete entry.milestone;
      if (MP.schema.isWeekEntryEmpty(entry)) delete task.weeks[iso];
    }
    for (const type of [MP.schema.MILESTONE_TYPES.READY_FOR_UAT, MP.schema.MILESTONE_TYPES.UAT]) {
      const iso = adopted[type];
      if (!iso) continue;
      const existing = task.weeks[iso];
      const merged = existing ? { ...existing, milestone: type } : { milestone: type };
      if (type === MP.schema.MILESTONE_TYPES.UAT) {
        delete merged.team;
        delete merged.resources;
      }
      task.weeks[iso] = merged;
    }
  }

  // Sposta un task in una posizione esatta (usato dal drag&drop, vedi
  // task-drag.js): la baseline di destinazione può essere una qualsiasi
  // baseline dello stesso progetto (anche la stessa in cui si trova già il
  // task, per un riordino interno). targetIndex è l'indice nell'array della
  // baseline di destinazione *dopo* la rimozione del task da quello di
  // partenza.
  //
  // Spostamento fra baseline DIVERSE: il task adotta le date readyForUat/uat
  // già in vigore sulla baseline di destinazione (stesso principio di un
  // salvataggio normale via popover — vedi gantt-view.js/syncBaselineMilestone),
  // mantenendo la propria taskDeadline (mai condivisa). Se il risultato
  // violerebbe il vincolo d'ordine taskDeadline < readyForUat < uat (vedi
  // js/model/milestone-rules.js), lo spostamento è bloccato con un alert
  // PRIMA di qualunque mutazione — il task resta dov'era, nessun salvataggio.
  // Un riordino nella STESSA baseline non tocca mai le milestone (nessuna data
  // può cambiare restando nella stessa baseline).
  async function moveTaskToPosition(state, file, sourceBaseline, task, targetBaseline, targetIndex) {
    const sourceArr = sourceBaseline.task;
    const idx = sourceArr.indexOf(task);
    if (idx < 0) return;

    if (sourceBaseline !== targetBaseline) {
      const taskDates = MP.milestoneRules.collectTaskMilestoneDates(task);
      if (taskDates.taskDeadline || taskDates.readyForUat || taskDates.uat) {
        const targetShared = findBaselineSharedMilestoneDates(targetBaseline);
        const adopted = { taskDeadline: taskDates.taskDeadline, readyForUat: targetShared.readyForUat, uat: targetShared.uat };
        const check = MP.milestoneRules.checkOrdering(adopted);
        if (!check.ok) {
          window.alert(`Cannot move "${task.name}" to this baseline: ${check.reason}`);
          return;
        }
        applyAdoptedSharedDates(task, adopted);
      }
    }

    sourceArr.splice(idx, 1);
    let insertAt = targetIndex;
    if (sourceBaseline === targetBaseline && idx < targetIndex) insertAt -= 1;
    targetBaseline.task.splice(insertAt, 0, task);
    await persistProject(state, file);
  }

  MP.taskCrud = { createTask, renameTask, deleteTask, moveTaskToPosition, toggleCompleted, setTaskNote };
})(window.MP = window.MP || {});
