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
  // Blocca se: il task è completed, una qualunque delle settimane sorgente è
  // marcata completed (completamento parziale — stesso principio "dato chiuso
  // mai toccato" del task interamente completed), lo spostamento uscirebbe dal
  // range di settimane esistente (manifest.weeks.first/last, mai esteso
  // automaticamente), oppure la (sola) cella di destinazione che cade fuori
  // dal blocco selezionato contiene già un'allocazione non vuota nello stesso
  // task — le altre celle di destinazione coincidono con celle già dentro il
  // blocco e vengono sovrascritte intenzionalmente come parte dello shift.
  function canShiftWeeks(dataset, task, weeks, direction) {
    if (task.completed) {
      return { allowed: false, reason: 'Completed task: shifting not allowed' };
    }
    if (weeks.some((w) => ((task.weeks || {})[w] || {}).completed)) {
      return { allowed: false, reason: 'Completed week: shifting not allowed' };
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
  // A differenza di canShiftWeeks/shiftWeeksData non serve, in generale, un controllo
  // "cella di destinazione già occupata": uno stesso task viene traslato per intero
  // (tutte le sue settimane non vuote, stesso delta), quindi la mappa chiave→valore
  // risultante è per costruzione iniettiva tra le settimane che si spostano (nessuna
  // collisione interna possibile tra loro). Le settimane marcate completed (vedi
  // completamento parziale) fanno eccezione: restano ferme nella loro posizione
  // originale invece di traslare col resto del task, stesso principio "dato chiuso mai
  // toccato" già applicato ai task interamente completed — quindi vanno anche escluse
  // dal controllo di iniettività, e una settimana in movimento che atterrasse sull'iso
  // di una settimana completed ferma va bloccata esplicitamente (collisione reale). I
  // task completed vengono saltati per intero (mai auto-corretti) e contati a parte per
  // il messaggio di conferma lato UI, così come le singole settimane completed skippate
  // dentro un task altrimenti attivo. Blocca l'intera operazione (nessuno shift
  // parziale) se anche una sola settimana in movimento uscirebbe dal range
  // manifest.weeks.first/last o collide con una settimana completed ferma.
  function canShiftBaseline(dataset, baseline, deltaWeeks) {
    const { first, last } = dataset.manifest.weeks;
    let affectedTasksCount = 0;
    let skippedCompletedCount = 0;
    let skippedCompletedWeeksCount = 0;
    let movedWeeksCount = 0;
    for (const task of baseline.task) {
      if (task.completed) {
        skippedCompletedCount++;
        continue;
      }
      const weeksMap = task.weeks || {};
      const stationaryIsos = new Set(
        Object.entries(weeksMap)
          .filter(([, entry]) => entry && entry.completed)
          .map(([iso]) => iso)
      );
      let taskHasMove = false;
      for (const [iso, entry] of Object.entries(weeksMap)) {
        if (!entry || isWeekEntryEmpty(entry)) continue;
        if (entry.completed) {
          skippedCompletedWeeksCount++;
          continue;
        }
        const target = addWeeks(iso, deltaWeeks);
        if (target < first || target > last) {
          return {
            allowed: false,
            reason: `Shifting would move "${task.name}" (week ${iso}) to ${target}, which is outside the current range (${first} – ${last}).`,
          };
        }
        if (stationaryIsos.has(target)) {
          return {
            allowed: false,
            reason: `Shifting "${task.name}" (week ${iso}) would overlap a completed week (${target}), which stays fixed.`,
          };
        }
        taskHasMove = true;
        movedWeeksCount++;
      }
      if (taskHasMove) affectedTasksCount++;
    }
    return { allowed: true, affectedTasksCount, skippedCompletedCount, skippedCompletedWeeksCount, movedWeeksCount };
  }

  // Muta ogni task non-completed della baseline, ricostruendo `task.weeks` da zero:
  // ogni entry non vuota e non completed viene traslata di `deltaWeeks` — le milestone
  // si spostano insieme all'entry che le contiene, nessuna sincronizzazione dedicata
  // necessaria (tutti i task della baseline si spostano della stessa quantità). Le
  // entry completed restano al loro iso originale (mai spostate). Va chiamata solo
  // dopo un `canShiftBaseline` con `allowed: true`.
  function shiftBaselineData(baseline, deltaWeeks) {
    for (const task of baseline.task) {
      if (task.completed) continue;
      const oldWeeks = task.weeks || {};
      const newWeeks = {};
      for (const [iso, entry] of Object.entries(oldWeeks)) {
        if (!entry || isWeekEntryEmpty(entry)) continue;
        if (entry.completed) {
          newWeeks[iso] = entry;
          continue;
        }
        newWeeks[addWeeks(iso, deltaWeeks)] = entry;
      }
      task.weeks = newWeeks;
    }
  }

  MP.weekShift = { canShiftWeeks, shiftWeeksData, canShiftBaseline, shiftBaselineData };
})(window.MP = window.MP || {});
