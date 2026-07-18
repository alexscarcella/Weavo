// Indice delle allocazioni per (initials, settimana), cross-progetto. Usato sia dal popover di
// editing (avviso su doppia allocazione) sia dalla vista gantt/resource-load per evidenziare la
// sovrallocazione. I task completed non contano come impegno attivo (§4.6 della spec) e sono
// esclusi dall'indice.
(function (MP) {
  'use strict';

  function buildAllocationIndex(dataset) {
    const index = new Map(); // chiave: "initials|settimana" -> array di riferimenti
    for (const [file, { data: progetto }] of dataset.projects) {
      progetto.baseline.forEach((baseline) => {
        baseline.task.forEach((task) => {
          if (task.completed) return;
          for (const [settimana, entry] of Object.entries(task.weeks || {})) {
            for (const initials of entry.resources || []) {
              const key = `${initials}|${settimana}`;
              if (!index.has(key)) index.set(key, []);
              index.get(key).push({
                projectFile: file,
                projectName: progetto.name,
                baselineVersion: baseline.version,
                taskName: task.name,
                taskRef: task,
              });
            }
          }
        });
      });
    }
    return index;
  }

  function findAllocations(index, initials, settimana) {
    return index.get(`${initials}|${settimana}`) || [];
  }

  function findOverallocatedKeys(index) {
    const keys = new Set();
    for (const [key, refs] of index) {
      if (refs.length > 1) keys.add(key);
    }
    return keys;
  }

  MP.overallocation = { buildAllocationIndex, findAllocations, findOverallocatedKeys };
})(window.MP = window.MP || {});
