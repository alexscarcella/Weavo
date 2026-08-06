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

  function getWeeksInRange(first, last) {
    const weeks = [];
    let current = first;
    while (current <= last) {
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

  // True se la settimana `iso` è la prima del gantt il cui lunedì cade in un
  // mese diverso da quello della settimana precedente — usato per disegnare un
  // separatore verticale di orientamento nella timeline (gantt/resource-load/
  // milestones), distinto dalla linea "oggi" (current-week-line).
  function isMonthBoundary(iso) {
    const date = toDate(iso);
    const prev = toDate(addDays(iso, -7));
    return date.getUTCMonth() !== prev.getUTCMonth() || date.getUTCFullYear() !== prev.getUTCFullYear();
  }

  // Elenco (progetto/baseline/task/settimana) di ogni allocazione non vuota che
  // cade in uno degli iso presenti in weekIsoSet — usato per avvisare prima di
  // eliminare settimane in coda (§6.3 della spec). `completed` è true se il
  // progetto, la baseline, il task o la singola settimana sono già chiusi —
  // permette al chiamante di distinguere allocazioni ancora vincolanti da
  // quelle ormai storiche.
  function findAllocationsInWeeks(dataset, weekIsoSet) {
    const risultati = [];
    for (const [, { data: progetto }] of dataset.projects) {
      progetto.baseline.forEach((baseline) => {
        baseline.task.forEach((task) => {
          for (const [settimana, entry] of Object.entries(task.weeks || {})) {
            if (weekIsoSet.has(settimana) && entry && (entry.team || entry.milestone)) {
              const completed = !!(progetto.completed || baseline.completed || task.completed || entry.completed);
              risultati.push({ progetto: progetto.name, baseline: baseline.version, task: task.name, settimana, completed });
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
    isMonthBoundary,
    findAllocationsInWeeks,
  };
})(window.MP = window.MP || {});
