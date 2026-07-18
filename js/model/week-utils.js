// Aritmetica settimane: lunedì come inizio settimana, date in formato ISO "YYYY-MM-DD".
(function (MP) {
  'use strict';

  function toDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  function toIso(date) {
    return date.toISOString().slice(0, 10);
  }

  function isMonday(iso) {
    return toDate(iso).getUTCDay() === 1;
  }

  function addDays(iso, days) {
    const date = toDate(iso);
    date.setUTCDate(date.getUTCDate() + days);
    return toIso(date);
  }

  function addWeeks(iso, weeks) {
    return addDays(iso, weeks * 7);
  }

  function getWeeksInRange(prima, ultima) {
    const weeks = [];
    let current = prima;
    while (current <= ultima) {
      weeks.push(current);
      current = addWeeks(current, 1);
    }
    return weeks;
  }

  function formatWeekLabel(iso) {
    const date = toDate(iso);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  }

  // Data odierna (formato ISO), letta dall'orologio locale del browser — mai
  // persistita, ricalcolata ad ogni chiamata.
  function getTodayIso() {
    const now = new Date();
    return toIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
  }

  // Lunedì (formato ISO) della settimana in cui cade la data odierna — usato per
  // evidenziare la colonna corrente nel gantt e nel carico risorse.
  function getCurrentWeekIso() {
    const todayIso = getTodayIso();
    const dow = toDate(todayIso).getUTCDay();
    const diffFromMonday = dow === 0 ? 6 : dow - 1;
    return addDays(todayIso, -diffFromMonday);
  }

  // Elenco (progetto/baseline/task/settimana) di ogni allocazione non vuota che
  // cade in uno degli iso presenti in weekIsoSet — usato per avvisare prima di
  // eliminare settimane in coda (§6.3 della spec).
  function findAllocationsInWeeks(dataset, weekIsoSet) {
    const risultati = [];
    for (const [, { data: progetto }] of dataset.progetti) {
      progetto.baseline.forEach((baseline) => {
        baseline.task.forEach((task) => {
          for (const [settimana, entry] of Object.entries(task.settimane || {})) {
            if (weekIsoSet.has(settimana) && entry && (entry.team || entry.milestone)) {
              risultati.push({ progetto: progetto.nome, baseline: baseline.versione, task: task.nome, settimana });
            }
          }
        });
      });
    }
    return risultati;
  }

  MP.weekUtils = {
    toDate,
    toIso,
    isMonday,
    addDays,
    addWeeks,
    getWeeksInRange,
    formatWeekLabel,
    getTodayIso,
    getCurrentWeekIso,
    findAllocationsInWeeks,
  };
})(window.MP = window.MP || {});
