const { loadMP } = require('../helpers/load-mp');

// week-shift.js dipende da MP.weekUtils (addWeeks) e MP.milestoneRules
// (checkChange, per il vincolo d'ordine delle milestone) — stesso ordine di
// index.html: week-utils.js -> milestone-rules.js -> week-shift.js.
describe('MP.weekShift.findMaxShift', () => {
  const { schema } = loadMP('js/data/schema.js');
  loadMP('js/model/week-utils.js');
  loadMP('js/model/milestone-rules.js');
  const { weekShift } = loadMP('js/model/week-shift.js');

  const MANIFEST_RANGE = { first: '2026-01-05', last: '2026-12-28' };

  function buildTask(weeksEntries, { taskCompleted = false } = {}) {
    const task = schema.createTask('Task Test');
    task.completed = taskCompleted;
    Object.assign(task.weeks, weeksEntries);
    return task;
  }

  function buildDataset() {
    return { manifest: { weeks: MANIFEST_RANGE } };
  }

  test('si ferma un passo prima di un\'allocazione già presente più avanti nel range', () => {
    const dataset = buildDataset();
    const task = buildTask({
      '2026-08-03': schema.createWeekEntry({ team: 'dev', resources: ['LC'] }),
      '2026-08-24': schema.createWeekEntry({ team: 'dev', resources: ['LC'] }), // ostacolo
    });

    // addWeeks('2026-08-03', 3) === '2026-08-24' (l'ostacolo): deve fermarsi a 2.
    expect(weekShift.findMaxShift(dataset, task, ['2026-08-03'], 3, undefined)).toBe(2);
  });

  test('si ferma un passo prima di una settimana con milestone (senza allocazione)', () => {
    const dataset = buildDataset();
    const task = buildTask({
      '2026-08-03': schema.createWeekEntry({ team: 'dev', resources: ['LC'] }),
      '2026-08-24': schema.createWeekEntry({ milestone: schema.MILESTONE_TYPES.TASK_DEADLINE }), // ostacolo
    });

    expect(weekShift.findMaxShift(dataset, task, ['2026-08-03'], 3, undefined)).toBe(2);
  });

  test('ritorna 0 se già il primo passo è bloccato (task completed)', () => {
    const dataset = buildDataset();
    const task = buildTask(
      { '2026-08-03': schema.createWeekEntry({ team: 'dev', resources: ['LC'] }) },
      { taskCompleted: true }
    );

    expect(weekShift.findMaxShift(dataset, task, ['2026-08-03'], 5, undefined)).toBe(0);
  });

  test('ritorna l\'intero rawDelta richiesto quando il percorso è completamente libero', () => {
    const dataset = buildDataset();
    const task = buildTask({
      '2026-08-03': schema.createWeekEntry({ team: 'dev', resources: ['LC'] }),
    });

    expect(weekShift.findMaxShift(dataset, task, ['2026-08-03'], 5, undefined)).toBe(5);
  });

  test('si ferma prima di rompere l\'ordine taskDeadline/readyForUat/uat tra i task della baseline', () => {
    const dataset = buildDataset();
    const { MILESTONE_TYPES } = schema;

    // Task A: quello che trasciniamo, porta un readyForUat (tipo condiviso di
    // baseline) su 2026-08-03. Task B: non toccato, porta già uno uat fisso su
    // 2026-09-07 — nessuna delle due settimane collide con task.weeks di A
    // lungo il percorso (task A ha solo quella settimana), quindi qui è
    // ESCLUSIVAMENTE il controllo d'ordine (checkBaselineChange) a bloccare,
    // non la collisione di destinazione.
    const taskA = buildTask({ '2026-08-03': schema.createWeekEntry({ milestone: MILESTONE_TYPES.READY_FOR_UAT }) });
    const taskB = buildTask({ '2026-09-07': schema.createWeekEntry({ milestone: MILESTONE_TYPES.UAT }) });
    const baseline = schema.createBaseline('v1');
    baseline.task.push(taskA, taskB);

    // addWeeks('2026-08-03', 5) === '2026-09-07', la stessa settimana dello uat
    // di B: è comunque ammesso, perché applyTentativeChange (milestone-rules.js)
    // simula lì la stessa "cancellazione dell'altro tipo sulla stessa settimana"
    // che la propagazione reale (clearOtherMilestones/syncBaselineMilestone)
    // farebbe — lo uat di B verrebbe sostituito dal readyForUat in arrivo, non
    // convivere con esso. La vera violazione d'ordine scatta a mag 6
    // (2026-09-14): lì lo uat di B resta fermo su 2026-09-07 (nessuna
    // coincidenza di settimana stavolta) mentre il readyForUat lo supera,
    // rompendo readyForUat < uat.
    expect(weekShift.findMaxShift(dataset, taskA, ['2026-08-03'], 7, baseline)).toBe(5);
  });
});
