const { loadMP } = require('../helpers/load-mp');

// task-crud.js è uno script IIFE su window.MP. Usa MP.schema + MP.milestoneRules
// (reali, caricati sotto), e MP.saveCoordinator / MP.store / window.alert solo a
// runtime (stubbati). Nessun DOM al require.
describe('MP.taskCrud.moveTaskToPosition', () => {
  const MP = loadMP('js/data/schema.js');
  loadMP('js/model/week-utils.js'); // milestone-rules destruttura MP.weekUtils.addWeeks al require
  loadMP('js/model/milestone-rules.js');

  let saveProjectCalls;
  let saveProjectsCalls;
  let saveProjectsResult;
  let setStateCalls;
  let alertCalls;

  global.window.MP.saveCoordinator = {
    saveProject: async (_state, file) => { saveProjectCalls.push(file); return true; },
    saveProjects: async (_state, files) => { saveProjectsCalls.push(files.slice()); return saveProjectsResult; },
  };
  global.window.MP.store = { setState: (x) => setStateCalls.push(x) };
  global.window.alert = (m) => alertCalls.push(m);

  loadMP('js/ui/crud/task-crud.js');

  const T = MP.schema.MILESTONE_TYPES;
  const wk = (o) => MP.schema.createWeekEntry(o);

  function makeTask(name, weeks) {
    const t = MP.schema.createTask(name);
    if (weeks) t.weeks = weeks;
    return t;
  }
  function makeState(projectsObj) {
    const projects = new Map();
    for (const [file, data] of Object.entries(projectsObj)) projects.set(file, { data, rawText: '' });
    return { dataset: { projects } };
  }
  const move = (...args) => MP.taskCrud.moveTaskToPosition(...args);

  beforeEach(() => {
    saveProjectCalls = [];
    saveProjectsCalls = [];
    saveProjectsResult = true;
    setStateCalls = [];
    alertCalls = [];
  });

  // ---------- regressione: riordino nella stessa baseline ----------

  test('reorder stessa baseline: ordine cambia, milestone/weeks intatte, single-file save', async () => {
    const t0 = makeTask('T0', { '2026-02-02': wk({ milestone: T.TASK_DEADLINE }) });
    const t1 = makeTask('T1');
    const t2 = makeTask('T2');
    const bl = MP.schema.createBaseline('1.0');
    bl.task = [t0, t1, t2];
    const proj = MP.schema.createProject('P');
    proj.baseline = [bl];
    const state = makeState({ 'projects/p.json': proj });

    await move(state, 'projects/p.json', bl, t0, 'projects/p.json', bl, 2);

    expect(bl.task).toEqual([t1, t0, t2]);
    expect(t0.weeks).toEqual({ '2026-02-02': { milestone: 'taskDeadline' } });
    expect(saveProjectCalls).toEqual(['projects/p.json']);
    expect(saveProjectsCalls).toEqual([]);
    expect(setStateCalls.length).toBe(1);
  });

  test('task non presente → no-op', async () => {
    const t0 = makeTask('T0');
    const orphan = makeTask('orphan');
    const bl = MP.schema.createBaseline('1.0');
    bl.task = [t0];
    const proj = MP.schema.createProject('P');
    proj.baseline = [bl];
    const state = makeState({ 'projects/p.json': proj });

    await move(state, 'projects/p.json', bl, orphan, 'projects/p.json', bl, 0);

    expect(saveProjectCalls).toEqual([]);
    expect(bl.task).toEqual([t0]);
  });

  // ---------- regressione: cross-baseline nello STESSO progetto ----------

  test('cross-baseline stesso progetto: adotta readyForUat/uat della destinazione', async () => {
    const moving = makeTask('MOV', { '2026-03-02': wk({ milestone: T.READY_FOR_UAT }) });
    const srcBl = MP.schema.createBaseline('1.0');
    srcBl.task = [moving];
    const anchor = makeTask('ANCHOR', {
      '2026-04-06': wk({ milestone: T.READY_FOR_UAT }),
      '2026-05-04': wk({ milestone: T.UAT }),
    });
    const dstBl = MP.schema.createBaseline('2.0');
    dstBl.task = [anchor];
    const proj = MP.schema.createProject('P');
    proj.baseline = [srcBl, dstBl];
    const state = makeState({ 'projects/p.json': proj });

    await move(state, 'projects/p.json', srcBl, moving, 'projects/p.json', dstBl, 1);

    expect(moving.weeks['2026-03-02']).toBeUndefined();
    expect(moving.weeks['2026-04-06']).toEqual({ milestone: 'readyForUat' });
    expect(moving.weeks['2026-05-04']).toEqual({ milestone: 'uat' });
    expect(dstBl.task).toEqual([anchor, moving]);
    expect(srcBl.task).toEqual([]);
    expect(saveProjectCalls).toEqual(['projects/p.json']);
    expect(saveProjectsCalls).toEqual([]);
  });

  test('cross-baseline stesso progetto senza milestone condivise in destinazione → solo rimozione', async () => {
    const moving = makeTask('MOV', { '2026-03-02': wk({ milestone: T.READY_FOR_UAT }) });
    const srcBl = MP.schema.createBaseline('1.0');
    srcBl.task = [moving];
    const dstBl = MP.schema.createBaseline('2.0');
    dstBl.task = [];
    const proj = MP.schema.createProject('P');
    proj.baseline = [srcBl, dstBl];
    const state = makeState({ 'projects/p.json': proj });

    await move(state, 'projects/p.json', srcBl, moving, 'projects/p.json', dstBl, 0);

    expect(moving.weeks['2026-03-02']).toBeUndefined();
    expect(Object.keys(moving.weeks)).toEqual([]);
    expect(dstBl.task).toEqual([moving]);
  });

  test('violazione ordine milestone → window.alert, nessuno splice, nessun save', async () => {
    const moving = makeTask('MOV', { '2026-06-01': wk({ milestone: T.TASK_DEADLINE }) });
    const srcBl = MP.schema.createBaseline('1.0');
    srcBl.task = [moving];
    const anchor = makeTask('ANCHOR', { '2026-04-06': wk({ milestone: T.READY_FOR_UAT }) });
    const dstBl = MP.schema.createBaseline('2.0');
    dstBl.task = [anchor];
    const proj = MP.schema.createProject('P');
    proj.baseline = [srcBl, dstBl];
    const state = makeState({ 'projects/p.json': proj });

    await move(state, 'projects/p.json', srcBl, moving, 'projects/p.json', dstBl, 1);

    expect(alertCalls.length).toBe(1);
    expect(srcBl.task).toEqual([moving]);
    expect(dstBl.task).toEqual([anchor]);
    expect(saveProjectCalls).toEqual([]);
    expect(saveProjectsCalls).toEqual([]);
  });

  test('task senza milestone → salta il blocco, splice + single-file save', async () => {
    const moving = makeTask('MOV');
    const srcBl = MP.schema.createBaseline('1.0');
    srcBl.task = [moving];
    const dstBl = MP.schema.createBaseline('2.0');
    dstBl.task = [];
    const proj = MP.schema.createProject('P');
    proj.baseline = [srcBl, dstBl];
    const state = makeState({ 'projects/p.json': proj });

    await move(state, 'projects/p.json', srcBl, moving, 'projects/p.json', dstBl, 0);

    expect(dstBl.task).toEqual([moving]);
    expect(srcBl.task).toEqual([]);
    expect(saveProjectCalls).toEqual(['projects/p.json']);
  });

  // ---------- nuova feature: cross-progetto ----------

  test('cross-progetto cross-baseline: adotta date destinazione, saveProjects([dest, src])', async () => {
    const moving = makeTask('MOV', {
      '2026-03-02': wk({ milestone: T.READY_FOR_UAT }),
      '2026-03-09': wk({ team: 'dev', resources: ['AA'] }),
    });
    const srcBl = MP.schema.createBaseline('1.0');
    srcBl.task = [moving];
    const srcProj = MP.schema.createProject('SRC');
    srcProj.baseline = [srcBl];
    const anchor = makeTask('ANCHOR', {
      '2026-04-06': wk({ milestone: T.READY_FOR_UAT }),
      '2026-05-04': wk({ milestone: T.UAT }),
    });
    const dstBl = MP.schema.createBaseline('2.0');
    dstBl.task = [anchor];
    const dstProj = MP.schema.createProject('DST');
    dstProj.baseline = [dstBl];
    const state = makeState({ 'projects/src.json': srcProj, 'projects/dst.json': dstProj });

    await move(state, 'projects/src.json', srcBl, moving, 'projects/dst.json', dstBl, 1);

    expect(srcBl.task).toEqual([]);
    expect(dstBl.task).toEqual([anchor, moving]);
    expect(dstBl.task[1]).toBe(moving);
    expect(moving.weeks['2026-03-02']).toBeUndefined();
    expect(moving.weeks['2026-04-06']).toEqual({ milestone: 'readyForUat' });
    expect(moving.weeks['2026-05-04']).toEqual({ milestone: 'uat' });
    expect(moving.weeks['2026-03-09']).toEqual({ team: 'dev', resources: ['AA'] });
    expect(saveProjectsCalls).toEqual([['projects/dst.json', 'projects/src.json']]);
    expect(saveProjectCalls).toEqual([]);
  });

  test('cross-progetto: allocazione sulla settimana UAT adottata viene rimossa', async () => {
    const moving = makeTask('MOV', {
      '2026-05-04': wk({ team: 'dev', resources: ['AA'] }), // diventerà la settimana UAT
      '2026-03-02': wk({ milestone: T.READY_FOR_UAT }),
    });
    const srcBl = MP.schema.createBaseline('1.0');
    srcBl.task = [moving];
    const srcProj = MP.schema.createProject('SRC');
    srcProj.baseline = [srcBl];
    const anchor = makeTask('ANCHOR', {
      '2026-04-06': wk({ milestone: T.READY_FOR_UAT }),
      '2026-05-04': wk({ milestone: T.UAT }),
    });
    const dstBl = MP.schema.createBaseline('2.0');
    dstBl.task = [anchor];
    const dstProj = MP.schema.createProject('DST');
    dstProj.baseline = [dstBl];
    const state = makeState({ 'projects/src.json': srcProj, 'projects/dst.json': dstProj });

    await move(state, 'projects/src.json', srcBl, moving, 'projects/dst.json', dstBl, 1);

    expect(moving.weeks['2026-05-04']).toEqual({ milestone: 'uat' });
  });

  test('cross-progetto: violazione ordine → alert, nessuno splice, nessuna chiamata a saveProjects', async () => {
    const moving = makeTask('MOV', { '2026-06-01': wk({ milestone: T.TASK_DEADLINE }) });
    const srcBl = MP.schema.createBaseline('1.0');
    srcBl.task = [moving];
    const srcProj = MP.schema.createProject('SRC');
    srcProj.baseline = [srcBl];
    const anchor = makeTask('ANCHOR', { '2026-04-06': wk({ milestone: T.READY_FOR_UAT }) });
    const dstBl = MP.schema.createBaseline('2.0');
    dstBl.task = [anchor];
    const dstProj = MP.schema.createProject('DST');
    dstProj.baseline = [dstBl];
    const state = makeState({ 'projects/src.json': srcProj, 'projects/dst.json': dstProj });

    await move(state, 'projects/src.json', srcBl, moving, 'projects/dst.json', dstBl, 1);

    expect(alertCalls.length).toBe(1);
    expect(srcBl.task).toEqual([moving]);
    expect(dstBl.task).toEqual([anchor]);
    expect(saveProjectsCalls).toEqual([]);
    expect(saveProjectCalls).toEqual([]);
  });

  test('cross-progetto: saveProjects → false → splice annullato, nessun setState', async () => {
    saveProjectsResult = false;
    const keep = makeTask('KEEP');
    const moving = makeTask('MOV');
    const srcBl = MP.schema.createBaseline('1.0');
    srcBl.task = [keep, moving];
    const srcProj = MP.schema.createProject('SRC');
    srcProj.baseline = [srcBl];
    const dstBl = MP.schema.createBaseline('2.0');
    dstBl.task = [];
    const dstProj = MP.schema.createProject('DST');
    dstProj.baseline = [dstBl];
    const state = makeState({ 'projects/src.json': srcProj, 'projects/dst.json': dstProj });

    await move(state, 'projects/src.json', srcBl, moving, 'projects/dst.json', dstBl, 0);

    expect(srcBl.task).toEqual([keep, moving]); // ripristinato all'indice originale
    expect(dstBl.task).toEqual([]);
    expect(setStateCalls.length).toBe(0);
  });

  test('cross-progetto senza milestone → pura mossa, saveProjects a due file', async () => {
    const moving = makeTask('MOV');
    const srcBl = MP.schema.createBaseline('1.0');
    srcBl.task = [moving];
    const srcProj = MP.schema.createProject('SRC');
    srcProj.baseline = [srcBl];
    const dstBl = MP.schema.createBaseline('2.0');
    dstBl.task = [];
    const dstProj = MP.schema.createProject('DST');
    dstProj.baseline = [dstBl];
    const state = makeState({ 'projects/src.json': srcProj, 'projects/dst.json': dstProj });

    await move(state, 'projects/src.json', srcBl, moving, 'projects/dst.json', dstBl, 0);

    expect(srcBl.task).toEqual([]);
    expect(dstBl.task).toEqual([moving]);
    expect(saveProjectsCalls).toEqual([['projects/dst.json', 'projects/src.json']]);
  });
});
