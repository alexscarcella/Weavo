// Densità delle milestone di rilascio baseline sul calendario. Una baseline ha
// concettualmente 2 scadenze condivise indipendenti — "Ready for UAT" e "UAT"
// (vedi syncBaselineMilestone in gantt-view.js, che le propaga separatamente
// a tutti i task non completed della baseline; la 3ª tipologia, "Task
// deadline", è per singolo task e resta volutamente FUORI da questo report
// aggregato) — ma il dato resta duplicato su ogni task.weeks[iso].milestone,
// nessun campo dedicato su `baseline`. Questo modulo deriva, per ogni
// baseline e per CIASCUNA delle 2 scadenze condivise separatamente, la
// settimana "effettiva" (la più frequente tra i suoi task, letti tutti —
// anche i completed, a differenza della sincronizzazione in scrittura) senza
// toccare i dati: se i task sono in disaccordo (dataset non ancora
// normalizzato da un prossimo edit di milestone su quella baseline), la serie
// viene segnalata `inconsistent` ma non corretta.
(function (MP) {
  'use strict';

  const { READY_FOR_UAT, UAT } = MP.schema.MILESTONE_TYPES;
  const SHARED_TYPES = [READY_FOR_UAT, UAT];

  // Deriva la settimana "effettiva" di UN tipo di milestone condivisa per una
  // baseline: la più frequente tra i suoi task (mode), con l'iso più basso a
  // parità di frequenza come tie-break deterministico.
  function computeSeries(baseline, type) {
    const counts = new Map();
    let taskName = null;
    for (const task of baseline.task) {
      for (const [iso, entry] of Object.entries(task.weeks || {})) {
        if (!entry || entry.milestone !== type) continue;
        counts.set(iso, (counts.get(iso) || 0) + 1);
        if (taskName === null) taskName = task.name;
      }
    }

    let settimana = null;
    let inconsistent = false;
    if (counts.size > 0) {
      inconsistent = counts.size > 1;
      let best = null;
      for (const [iso, count] of counts) {
        if (!best || count > best.count || (count === best.count && iso < best.iso)) best = { iso, count };
      }
      settimana = best.iso;
    }

    return { settimana, distinctDates: Array.from(counts.keys()).sort(), taskName, inconsistent };
  }

  function computeBaselineMilestones(dataset, showCompletedProjects) {
    const rows = [];
    for (const voce of dataset.manifest.projects) {
      const entry = dataset.projects.get(voce.file);
      if (!entry) continue;
      const progetto = entry.data;
      if (progetto.completed && !showCompletedProjects) continue;

      const baselineVisibili = progetto.baseline.filter((b) => showCompletedProjects || !b.completed);
      baselineVisibili.forEach((baseline, bi) => {
        rows.push({
          file: voce.file,
          progetto,
          baseline,
          showProgetto: bi === 0,
          baselineIndex: bi,
          readyForUat: computeSeries(baseline, READY_FOR_UAT),
          uat: computeSeries(baseline, UAT),
        });
      });
    }
    return rows;
  }

  // Conteggio, per ciascuna delle 2 scadenze condivise separatamente, delle
  // baseline la cui data "effettiva" (vedi sopra) cade da oggi in avanti —
  // usato dall'header condiviso gantt/resource-load (dataset-header.js) per
  // dare visibilità immediata a quante consegne restano da fare, senza dover
  // aprire la pagina Milestone. Confronto per stringa ISO (YYYY-MM-DD), valido
  // perché entrambe le date sono nello stesso formato.
  function countUpcomingBaselines(dataset, showCompletedProjects) {
    const todayIso = MP.weekUtils.getTodayIso();
    const rows = computeBaselineMilestones(dataset, showCompletedProjects);
    const count = (type) => rows.filter((row) => row[type].settimana && row[type].settimana >= todayIso).length;
    return { readyForUat: count(READY_FOR_UAT), uat: count(UAT) };
  }

  // Elenco (per la pagina Milestone, sezione copiabile) delle sole milestone future
  // di ENTRAMBE le scadenze condivise, taggate con il proprio `type`/etichetta —
  // una baseline può quindi comparire due volte (una per Ready for UAT, una per
  // UAT, su date diverse nel caso consistente) — raggruppate per mese solare
  // della loro data effettiva. Pura derivazione, nessuna formattazione/locale
  // qui: quella resta al layer UI. Per una serie "inconsistent" (task in
  // disaccordo sulla settimana) la data mostrata è la più recente tra quelle
  // trovate (non quella "più frequente" usata da computeBaselineMilestones per
  // griglia/istogramma), con le altre date riportate in `otherDates` come nota.
  function computeUpcomingMilestonesByMonth(dataset, showCompletedProjects) {
    const todayIso = MP.weekUtils.getTodayIso();
    const rows = computeBaselineMilestones(dataset, showCompletedProjects);
    const upcoming = [];
    for (const row of rows) {
      for (const type of SHARED_TYPES) {
        const series = row[type];
        if (!series.settimana || series.settimana < todayIso) continue;
        const displayDate = series.inconsistent ? series.distinctDates[series.distinctDates.length - 1] : series.settimana;
        const otherDates = series.inconsistent ? series.distinctDates.filter((iso) => iso !== displayDate) : [];
        upcoming.push({
          type,
          label: MP.schema.MILESTONE_LABELS[type],
          displayDate,
          otherDates,
          inconsistent: series.inconsistent,
          progettoName: row.progetto.name,
          baselineVersion: row.baseline.version,
        });
      }
    }

    const byMonth = new Map();
    for (const item of upcoming) {
      const monthKey = item.displayDate.slice(0, 7);
      if (!byMonth.has(monthKey)) byMonth.set(monthKey, []);
      byMonth.get(monthKey).push(item);
    }

    return Array.from(byMonth.keys())
      .sort()
      .map((monthKey) => {
        const monthRows = byMonth.get(monthKey).sort((a, b) => {
          if (a.displayDate !== b.displayDate) return a.displayDate < b.displayDate ? -1 : 1;
          return a.progettoName.localeCompare(b.progettoName);
        });
        return { monthKey, rows: monthRows };
      });
  }

  MP.milestones = { computeBaselineMilestones, countUpcomingBaselines, computeUpcomingMilestonesByMonth };
})(window.MP = window.MP || {});
