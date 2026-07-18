// Densità delle milestone di rilascio baseline sul calendario: una baseline ha
// concettualmente un'unica data di rilascio (vedi syncBaselineMilestone in
// gantt-view.js, che la propaga a tutti i task non conclusi della baseline),
// ma il dato resta duplicato su ogni task.settimane[iso].milestone — nessun
// campo dedicato su `baseline`. Questo modulo deriva, per ogni baseline, la
// settimana di rilascio "effettiva" (la più frequente tra i suoi task, letti
// tutti — anche i conclusi, a differenza della sincronizzazione in scrittura)
// senza toccare i dati: se i task sono in disaccordo (dataset non ancora
// normalizzato da un prossimo edit di milestone su quella baseline), la riga
// viene segnalata `inconsistent` ma non corretta.
(function (MP) {
  'use strict';

  function computeBaselineMilestones(dataset, mostraArchiviati) {
    const rows = [];
    for (const voce of dataset.manifest.progetti) {
      const entry = dataset.progetti.get(voce.file);
      if (!entry) continue;
      const progetto = entry.data;
      if (progetto.archiviato && !mostraArchiviati) continue;

      const baselineVisibili = progetto.baseline.filter((b) => mostraArchiviati || !b.archiviata);
      baselineVisibili.forEach((baseline, bi) => {
        const counts = new Map();
        let taskNome = null;
        for (const task of baseline.task) {
          for (const [iso, entry] of Object.entries(task.settimane || {})) {
            if (!entry || !entry.milestone) continue;
            counts.set(iso, (counts.get(iso) || 0) + 1);
            if (taskNome === null) taskNome = task.nome;
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
          taskNome,
          inconsistent,
          showProgetto: bi === 0,
          baselineIndex: bi,
        });
      });
    }
    return rows;
  }

  // Conteggio delle baseline la cui milestone di rilascio "effettiva" (vedi sopra) cade da
  // oggi in avanti — usato dall'header condiviso gantt/carico-risorse (dataset-header.js) per
  // dare visibilità immediata a quante consegne restano da fare, senza dover apre la pagina
  // Milestone. Confronto per stringa ISO (YYYY-MM-DD), valido perché entrambe le date sono
  // nello stesso formato.
  function countUpcomingBaselines(dataset, mostraArchiviati) {
    const todayIso = MP.weekUtils.getTodayIso();
    return computeBaselineMilestones(dataset, mostraArchiviati)
      .filter((row) => row.settimana && row.settimana >= todayIso)
      .length;
  }

  MP.milestones = { computeBaselineMilestones, countUpcomingBaselines };
})(window.MP = window.MP || {});
