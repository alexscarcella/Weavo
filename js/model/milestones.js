// Densità delle milestone di rilascio baseline sul calendario: una baseline ha
// concettualmente un'unica data di rilascio (vedi syncBaselineMilestone in
// gantt-view.js, che la propaga a tutti i task non completed della baseline),
// ma il dato resta duplicato su ogni task.weeks[iso].milestone — nessun
// campo dedicato su `baseline`. Questo modulo deriva, per ogni baseline, la
// settimana di rilascio "effettiva" (la più frequente tra i suoi task, letti
// tutti — anche i completed, a differenza della sincronizzazione in scrittura)
// senza toccare i dati: se i task sono in disaccordo (dataset non ancora
// normalizzato da un prossimo edit di milestone su quella baseline), la riga
// viene segnalata `inconsistent` ma non corretta.
(function (MP) {
  'use strict';

  function computeBaselineMilestones(dataset, showCompletedProjects) {
    const rows = [];
    for (const voce of dataset.manifest.projects) {
      const entry = dataset.projects.get(voce.file);
      if (!entry) continue;
      const progetto = entry.data;
      if (progetto.completed && !showCompletedProjects) continue;

      const baselineVisibili = progetto.baseline.filter((b) => showCompletedProjects || !b.completed);
      baselineVisibili.forEach((baseline, bi) => {
        const counts = new Map();
        let taskName = null;
        for (const task of baseline.task) {
          for (const [iso, entry] of Object.entries(task.weeks || {})) {
            if (!entry || !entry.milestone) continue;
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

        rows.push({
          file: voce.file,
          progetto,
          baseline,
          settimana,
          distinctDates: Array.from(counts.keys()).sort(),
          taskName,
          inconsistent,
          showProgetto: bi === 0,
          baselineIndex: bi,
        });
      });
    }
    return rows;
  }

  // Conteggio delle baseline la cui milestone di rilascio "effettiva" (vedi sopra) cade da
  // oggi in avanti — usato dall'header condiviso gantt/resource-load (dataset-header.js) per
  // dare visibilità immediata a quante consegne restano da fare, senza dover apre la pagina
  // Milestone. Confronto per stringa ISO (YYYY-MM-DD), valido perché entrambe le date sono
  // nello stesso formato.
  function countUpcomingBaselines(dataset, showCompletedProjects) {
    const todayIso = MP.weekUtils.getTodayIso();
    return computeBaselineMilestones(dataset, showCompletedProjects)
      .filter((row) => row.settimana && row.settimana >= todayIso)
      .length;
  }

  // Elenco (per la pagina Milestone, sezione copiabile) delle sole milestone future,
  // raggruppate per mese solare della loro data effettiva. Pura derivazione, nessuna
  // formattazione/locale qui: quella resta al layer UI. Per una baseline "inconsistent"
  // (task in disaccordo sulla settimana) la data mostrata è la più recente tra quelle
  // trovate (non quella "più frequente" usata da computeBaselineMilestones per
  // griglia/istogramma), con le altre date riportate in `otherDates` come nota.
  function computeUpcomingMilestonesByMonth(dataset, showCompletedProjects) {
    const todayIso = MP.weekUtils.getTodayIso();
    const upcoming = computeBaselineMilestones(dataset, showCompletedProjects)
      .filter((row) => row.settimana && row.settimana >= todayIso)
      .map((row) => {
        const displayDate = row.inconsistent ? row.distinctDates[row.distinctDates.length - 1] : row.settimana;
        const otherDates = row.inconsistent ? row.distinctDates.filter((iso) => iso !== displayDate) : [];
        return {
          displayDate,
          otherDates,
          inconsistent: row.inconsistent,
          progettoName: row.progetto.name,
          baselineVersion: row.baseline.version,
        };
      });

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
