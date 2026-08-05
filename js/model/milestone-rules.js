// Logica pura per il vincolo d'ordine cronologico fra le 3 tipologie di
// milestone (MP.schema.MILESTONE_ORDER: taskDeadline < readyForUat < uat, mai
// sulla stessa settimana). Nessun I/O, nessun DOM: solo predicati di
// ammissibilità, riusati da ogni punto di scrittura che può alterare una
// settimana con milestone (popover cella, shift singola cella, shift intera
// baseline, drag&drop task fra baseline) così la regola vive in un solo
// posto invece di essere duplicata 4 volte.
(function (MP) {
  'use strict';

  const { MILESTONE_ORDER, MILESTONE_TYPES, MILESTONE_LABELS } = MP.schema;
  const { addWeeks } = MP.weekUtils;

  // Le 3 date di milestone di un task (iso o null ciascuna), lette dalle sue
  // week entries. Per costruzione (vedi clearOtherMilestones type-aware in
  // gantt-view.js) al più una settimana per tipo esiste per task.
  function collectTaskMilestoneDates(task) {
    const dates = { taskDeadline: null, readyForUat: null, uat: null };
    for (const [iso, entry] of Object.entries(task.weeks || {})) {
      if (entry && entry.milestone && Object.prototype.hasOwnProperty.call(dates, entry.milestone)) {
        dates[entry.milestone] = iso;
      }
    }
    return dates;
  }

  // Verifica che le date presenti in `dates` (alcune possono essere null/assenti)
  // siano strettamente crescenti nell'ordine MILESTONE_ORDER, mai sulla stessa
  // settimana. Confronto ISO stringa diretto (valido, stesso trucco già usato
  // da countUpcomingBaselines in milestones.js).
  function checkOrdering(dates) {
    const present = MILESTONE_ORDER.filter((type) => dates[type]).map((type) => ({ type, iso: dates[type] }));
    for (let i = 1; i < present.length; i++) {
      const prev = present[i - 1];
      const curr = present[i];
      if (curr.iso <= prev.iso) {
        return {
          ok: false,
          reason: `${MILESTONE_LABELS[prev.type]} (${prev.iso}) must be strictly before ${MILESTONE_LABELS[curr.type]} (${curr.iso}).`,
        };
      }
    }
    return { ok: true };
  }

  // Una singola week entry porta al più UN tipo (vedi collectTaskMilestoneDates):
  // impostare `type` su `newIso` va quindi simulato liberando prima quello slot
  // da qualunque ALTRO tipo lo occupasse già (conversione in place, es.
  // readyForUat -> uat sulla stessa settimana) — altrimenti la simulazione
  // vedrebbe transitoriamente due tipi sulla stessa data e la rifiuterebbe
  // sempre, anche quando la mutazione reale (che sovrascrive la stessa entry)
  // non lascia mai quello stato. Muta `dates` in place e la ritorna.
  function applyTentativeChange(dates, type, newIso) {
    if (newIso) {
      for (const otherType of MILESTONE_ORDER) {
        if (otherType !== type && dates[otherType] === newIso) dates[otherType] = null;
      }
    }
    dates[type] = newIso || null;
    return dates;
  }

  // Verifica il cambio di UNA sola data (di un tipo qualunque) sul singolo
  // task passato, ignorando propagazione di baseline — usata per taskDeadline
  // (mai condivisa) e come mattone per checkBaselineChange sotto.
  // `newIso` è null per rappresentare una cancellazione.
  function checkTaskChange(task, type, newIso) {
    const dates = applyTentativeChange(collectTaskMilestoneDates(task), type, newIso);
    return checkOrdering(dates);
  }

  // Verifica il cambio di una data condivisa (readyForUat/uat) su OGNI task
  // non completed della baseline (gli stessi che syncBaselineMilestone
  // toccherebbe) — restituisce il primo fallimento trovato, con il nome del
  // task in causa, o { ok: true } se tutti i task restano coerenti.
  function checkBaselineChange(baseline, type, newIso) {
    for (const task of baseline.task) {
      if (task.completed) continue;
      const dates = applyTentativeChange(collectTaskMilestoneDates(task), type, newIso);
      const check = checkOrdering(dates);
      if (!check.ok) {
        return { ok: false, reason: `${check.reason} (task "${task.name}")` };
      }
    }
    return { ok: true };
  }

  // Dispatcher usato dal salvataggio del popover: i tipi condivisi
  // (readyForUat/uat) si validano su tutta la baseline, taskDeadline solo sul
  // task stesso.
  function checkChange({ task, baseline, type, newIso }) {
    if (baseline && (type === MILESTONE_TYPES.READY_FOR_UAT || type === MILESTONE_TYPES.UAT)) {
      return checkBaselineChange(baseline, type, newIso);
    }
    return checkTaskChange(task, type, newIso);
  }

  // Per canShiftBaseline: date del task dopo uno shift di `deltaWeeks`. Una
  // data la cui week entry è marcata completed resta ferma (stesso principio
  // "dato chiuso mai toccato" del resto di week-shift.js) — solo le altre
  // traslano — poi verifica l'ordine sul risultato.
  function checkTaskOrderingAfterShift(task, deltaWeeks) {
    const dates = collectTaskMilestoneDates(task);
    const shifted = {};
    for (const type of MILESTONE_ORDER) {
      const iso = dates[type];
      if (!iso) { shifted[type] = null; continue; }
      const entry = (task.weeks || {})[iso];
      shifted[type] = entry && entry.completed ? iso : addWeeks(iso, deltaWeeks);
    }
    return checkOrdering(shifted);
  }

  MP.milestoneRules = {
    collectTaskMilestoneDates,
    checkOrdering,
    checkTaskChange,
    checkBaselineChange,
    checkChange,
    checkTaskOrderingAfterShift,
  };
})(window.MP = window.MP || {});
