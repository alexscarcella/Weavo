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

  MP.weekShift = { canShiftWeeks, shiftWeeksData };
})(window.MP = window.MP || {});
