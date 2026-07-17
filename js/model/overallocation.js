// Indice delle allocazioni per (sigla, settimana), cross-progetto. Usato sia dal
// popover di editing (avviso su doppia allocazione) sia dalla vista gantt/carico
// risorse per evidenziare la sovrallocazione. I task conclusi non contano come
// impegno attivo (§4.6 della spec) e sono esclusi dall'indice.
(function (MP) {
  'use strict';

  function buildAllocationIndex(dataset) {
    const index = new Map(); // chiave: "sigla|settimana" -> array di riferimenti
    for (const [file, { data: progetto }] of dataset.progetti) {
      progetto.baseline.forEach((baseline) => {
        baseline.task.forEach((task) => {
          if (task.concluso) return;
          for (const [settimana, entry] of Object.entries(task.settimane || {})) {
            for (const sigla of entry.risorse || []) {
              const key = `${sigla}|${settimana}`;
              if (!index.has(key)) index.set(key, []);
              index.get(key).push({
                progettoFile: file,
                progettoNome: progetto.nome,
                baselineVersione: baseline.versione,
                taskNome: task.nome,
                taskRef: task,
              });
            }
          }
        });
      });
    }
    return index;
  }

  function findAllocations(index, sigla, settimana) {
    return index.get(`${sigla}|${settimana}`) || [];
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
