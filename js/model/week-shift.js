// Logica pura per lo spostamento ("shift") di una settimana o di un range di
// settimane contiguo di uno stesso task, di una settimana avanti/indietro
// (usata dal menu contestuale di shift — vedi gantt-view.js/gantt-cell.js —
// completamente indipendente dal popover di editing cella, cell-popover.js).
// Nessun I/O, nessun DOM: solo predicato di ammissibilità + mutazione di
// `task.weeks`.
(function (MP) {
  'use strict';

  const { addWeeks } = MP.weekUtils;
  const { isWeekEntryEmpty } = MP.schema;

  // `weeks` è l'array ordinato di iso settimana coinvolte (una singola cella o
  // l'intero range selezionato), `direction` è -1 (indietro) o +1 (avanti).
  // Blocca se: il task è completed, lo spostamento uscirebbe dal range di
  // settimane esistente (manifest.weeks.first/last, mai esteso
  // automaticamente), oppure la (sola) cella di destinazione che cade fuori
  // dal blocco selezionato contiene già un'allocazione non vuota nello stesso
  // task — le altre celle di destinazione coincidono con celle già dentro il
  // blocco e vengono sovrascritte intenzionalmente come parte dello shift.
  function canShiftWeeks(dataset, task, weeks, direction) {
    if (task.completed) {
      return { allowed: false, reason: 'Completed task: shifting not allowed' };
    }
    const targets = weeks.map((w) => addWeeks(w, direction));
    const { first, last } = dataset.manifest.weeks;
    if (targets.some((t) => t < first || t > last)) {
      return { allowed: false, reason: 'Outside the existing week range' };
    }
    const weekSet = new Set(weeks);
    for (let i = 0; i < weeks.length; i++) {
      if (weekSet.has(targets[i])) continue;
      const existing = (task.weeks || {})[targets[i]];
      if (!isWeekEntryEmpty(existing)) {
        return { allowed: false, reason: `The destination week (${targets[i]}) already has an allocation` };
      }
    }
    return { allowed: true };
  }

  // Muta `task.weeks` spostando ogni entry del blocco `weeks` di
  // `direction` settimane, preservando il contenuto individuale di ciascuna
  // cella (permutazione fedele, non normalizzazione a un valore uniforme).
  // Va chiamata solo dopo aver verificato `canShiftWeeks`.
  function shiftWeeksData(task, weeks, direction) {
    const snapshot = weeks.map((w) => task.weeks[w]);
    weeks.forEach((w) => delete task.weeks[w]);
    weeks.forEach((w, i) => {
      const entry = snapshot[i];
      if (entry && !isWeekEntryEmpty(entry)) {
        task.weeks[addWeeks(w, direction)] = entry;
      }
    });
  }

  // Shift dell'intera baseline (tutti i task non-completed, tutte le settimane non
  // vuote di ciascuno) di `deltaWeeks` (intero con segno, non necessariamente ±1).
  // A differenza di canShiftWeeks/shiftWeeksData non serve un controllo "cella di
  // destinazione già occupata": uno stesso task viene traslato per intero (tutte le
  // sue settimane non vuote, stesso delta), quindi la mappa chiave→valore risultante
  // è per costruzione iniettiva (nessuna collisione interna possibile). I task
  // completed vengono saltati (mai auto-corretti, stesso principio usato altrove) e
  // contati a parte per il messaggio di conferma lato UI. Blocca l'intera operazione
  // (nessuno shift parziale) se anche una sola settimana uscirebbe dal range
  // manifest.weeks.first/last.
  function canShiftBaseline(dataset, baseline, deltaWeeks) {
    const { first, last } = dataset.manifest.weeks;
    let affectedTasksCount = 0;
    let skippedCompletedCount = 0;
    let movedWeeksCount = 0;
    for (const task of baseline.task) {
      if (task.completed) {
        skippedCompletedCount++;
        continue;
      }
      let taskHasMove = false;
      for (const [iso, entry] of Object.entries(task.weeks || {})) {
        if (!entry || isWeekEntryEmpty(entry)) continue;
        const target = addWeeks(iso, deltaWeeks);
        if (target < first || target > last) {
          return {
            allowed: false,
            reason: `Shifting would move "${task.name}" (week ${iso}) to ${target}, which is outside the current range (${first} – ${last}).`,
          };
        }
        taskHasMove = true;
        movedWeeksCount++;
      }
      if (taskHasMove) affectedTasksCount++;
    }
    return { allowed: true, affectedTasksCount, skippedCompletedCount, movedWeeksCount };
  }

  // Muta ogni task non-completed della baseline, ricostruendo `task.weeks` da zero
  // con ogni entry non vuota traslata di `deltaWeeks` — le milestone si spostano
  // insieme all'entry che le contiene, nessuna sincronizzazione dedicata necessaria
  // (tutti i task della baseline si spostano della stessa quantità). Va chiamata solo
  // dopo un `canShiftBaseline` con `allowed: true`.
  function shiftBaselineData(baseline, deltaWeeks) {
    for (const task of baseline.task) {
      if (task.completed) continue;
      const oldWeeks = task.weeks || {};
      const newWeeks = {};
      for (const [iso, entry] of Object.entries(oldWeeks)) {
        if (!entry || isWeekEntryEmpty(entry)) continue;
        newWeeks[addWeeks(iso, deltaWeeks)] = entry;
      }
      task.weeks = newWeeks;
    }
  }

  MP.weekShift = { canShiftWeeks, shiftWeeksData, canShiftBaseline, shiftBaselineData };
})(window.MP = window.MP || {});
