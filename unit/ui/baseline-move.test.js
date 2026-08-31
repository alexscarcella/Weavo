const { loadMP } = require('../helpers/load-mp');

// baseline-crud.js è uno script IIFE su window.MP. Usa MP.schema (reale),
// MP.saveCoordinator / MP.store / window.alert / window.prompt solo a runtime —
// gli ultimi tre stubbati qui. Nessun DOM al require.
describe('MP.baselineCrud.moveBaselineToPosition', () => {
  const MP = loadMP('js/data/schema.js');

  let saveProjectCalls; // file singoli passati a saveCoordinator.saveProject (path riordino intra-progetto)
  let saveProjectsCalls; // array di file passati a saveCoordinator.saveProjects (path cross-progetto)
  let saveProjectsResult; // valore che saveProjects risolve (true = ok, false = conflitto annullato)
  let saveProjectShouldThrow;
  let setStateCalls;
  let alertCalls;

  global.window.MP.saveCoordinator = {
    saveProject: async (_state, file) => {
      saveProjectCalls.push(file);
      if (saveProjectShouldThrow) throw new Error('boom');
      return true;
    },
    saveProjects: async (_state, files) => {
      saveProjectsCalls.push(files.slice());
      return saveProjectsResult;
    },
  };
  global.window.MP.store = { setState: (x) => setStateCalls.push(x) };
  global.window.alert = (m) => alertCalls.push(m);

  loadMP('js/ui/crud/baseline-crud.js');

  function makeState(projectsObj) {
    const projects = new Map();
    for (const [file, data] of Object.entries(projectsObj)) projects.set(file, { data, rawText: '' });
    return { dataset: { projects } };
  }
  const move = (...args) => MP.baselineCrud.moveBaselineToPosition(...args);

  beforeEach(() => {
    saveProjectCalls = [];
    saveProjectsCalls = [];
    saveProjectsResult = true;
    saveProjectShouldThrow = false;
    setStateCalls = [];
    alertCalls = [];
  });

  // ---------- regressione: riordino nello stesso progetto ----------

  test('reorder stesso progetto: sposta in avanti', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    const b1 = MP.schema.createBaseline('2.0');
    const b2 = MP.schema.createBaseline('3.0');
    const p = MP.schema.createProject('P');
    p.baseline = [b0, b1, b2];
    const state = makeState({ 'projects/p.json': p });

    await move(state, 'projects/p.json', b0, 'projects/p.json', 2);

    expect(p.baseline).toEqual([b1, b0, b2]);
    expect(saveProjectCalls).toEqual(['projects/p.json']);
    expect(saveProjectsCalls).toEqual([]);
    expect(setStateCalls.length).toBe(1);
  });

  test('reorder stesso progetto: sposta all\'indietro', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    const b1 = MP.schema.createBaseline('2.0');
    const b2 = MP.schema.createBaseline('3.0');
    const p = MP.schema.createProject('P');
    p.baseline = [b0, b1, b2];
    const state = makeState({ 'projects/p.json': p });

    await move(state, 'projects/p.json', b2, 'projects/p.json', 0);

    expect(p.baseline).toEqual([b2, b0, b1]);
    expect(saveProjectCalls).toEqual(['projects/p.json']);
  });

  test('reorder stesso progetto: stessa posizione → ordine invariato, salva comunque', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    const b1 = MP.schema.createBaseline('2.0');
    const b2 = MP.schema.createBaseline('3.0');
    const p = MP.schema.createProject('P');
    p.baseline = [b0, b1, b2];
    const state = makeState({ 'projects/p.json': p });

    await move(state, 'projects/p.json', b1, 'projects/p.json', 1);

    expect(p.baseline).toEqual([b0, b1, b2]);
    expect(saveProjectCalls).toEqual(['projects/p.json']);
  });

  test('baseline non presente nell\'array → no-op, nessun save', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    const orphan = MP.schema.createBaseline('X');
    const p = MP.schema.createProject('P');
    p.baseline = [b0];
    const state = makeState({ 'projects/p.json': p });

    await move(state, 'projects/p.json', orphan, 'projects/p.json', 0);

    expect(saveProjectCalls).toEqual([]);
    expect(saveProjectsCalls).toEqual([]);
    expect(p.baseline).toEqual([b0]);
  });

  test('reorder interno non tocca baseline.team', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    const b1 = MP.schema.createBaseline('2.0');
    b1.team = MP.schema.createProjectReferents({ projectManager: 'PM1' });
    const p = MP.schema.createProject('P');
    p.baseline = [b0, b1];
    const state = makeState({ 'projects/p.json': p });

    await move(state, 'projects/p.json', b0, 'projects/p.json', 2);

    expect(b1.team).toEqual(MP.schema.createProjectReferents({ projectManager: 'PM1' }));
  });

  test('errore di saveProject → window.alert, nessun throw esterno', async () => {
    saveProjectShouldThrow = true;
    const b0 = MP.schema.createBaseline('1.0');
    const b1 = MP.schema.createBaseline('2.0');
    const p = MP.schema.createProject('P');
    p.baseline = [b0, b1];
    const state = makeState({ 'projects/p.json': p });

    await expect(move(state, 'projects/p.json', b0, 'projects/p.json', 2)).resolves.toBeUndefined();
    expect(alertCalls.length).toBe(1);
    expect(alertCalls[0]).toMatch(/boom/);
  });

  // ---------- nuova feature: spostamento cross-progetto ----------

  test('cross-progetto: identità preservata, splice fra i due array, saveProjects([dest, src])', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    const src = MP.schema.createProject('SRC');
    src.baseline = [b0];
    const dst = MP.schema.createProject('DST');
    dst.baseline = [];
    const state = makeState({ 'projects/src.json': src, 'projects/dst.json': dst });

    await move(state, 'projects/src.json', b0, 'projects/dst.json', 0);

    expect(src.baseline).toEqual([]);
    expect(dst.baseline).toEqual([b0]);
    expect(dst.baseline[0]).toBe(b0);
    expect(saveProjectsCalls).toEqual([['projects/dst.json', 'projects/src.json']]);
    expect(saveProjectCalls).toEqual([]);
    expect(setStateCalls.length).toBe(1);
  });

  test('cross-progetto team==null + referenti origine NON vuoti → team congelato e NON aliasato', async () => {
    const b0 = MP.schema.createBaseline('1.0'); // team: null (eredita)
    const src = MP.schema.createProject('SRC', MP.schema.createProjectReferents({ projectManager: 'Alice' }));
    src.baseline = [b0];
    const dst = MP.schema.createProject('DST', MP.schema.createProjectReferents({ projectManager: 'Bob' }));
    dst.baseline = [];
    const state = makeState({ 'projects/src.json': src, 'projects/dst.json': dst });

    await move(state, 'projects/src.json', b0, 'projects/dst.json', 0);

    expect(b0.team).not.toBeNull();
    expect(b0.team.projectManager).toBe('Alice');
    // non aliasato: mutare i referenti del progetto origine non deve toccare b0.team
    src.referents.projectManager = 'CHANGED';
    expect(b0.team.projectManager).toBe('Alice');
  });

  test('cross-progetto team==null + referenti origine vuoti → resta null', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    const src = MP.schema.createProject('SRC'); // referents tutti ''
    src.baseline = [b0];
    const dst = MP.schema.createProject('DST');
    dst.baseline = [];
    const state = makeState({ 'projects/src.json': src, 'projects/dst.json': dst });

    await move(state, 'projects/src.json', b0, 'projects/dst.json', 0);

    expect(b0.team).toBeNull();
  });

  test('cross-progetto: baseline con team dedicato → invariato (nessuno snapshot)', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    b0.team = MP.schema.createProjectReferents({ projectManager: 'Dedicated' });
    const dedicated = b0.team;
    const src = MP.schema.createProject('SRC', MP.schema.createProjectReferents({ projectManager: 'Alice' }));
    src.baseline = [b0];
    const dst = MP.schema.createProject('DST');
    dst.baseline = [];
    const state = makeState({ 'projects/src.json': src, 'projects/dst.json': dst });

    await move(state, 'projects/src.json', b0, 'projects/dst.json', 0);

    expect(b0.team).toBe(dedicated);
    expect(b0.team.projectManager).toBe('Dedicated');
  });

  test('cross-progetto: saveProjects → false → rollback completo, nessun setState', async () => {
    saveProjectsResult = false;
    const other = MP.schema.createBaseline('0.9');
    const b0 = MP.schema.createBaseline('1.0'); // team null
    const src = MP.schema.createProject('SRC', MP.schema.createProjectReferents({ projectManager: 'Alice' }));
    src.baseline = [other, b0];
    const dst = MP.schema.createProject('DST');
    dst.baseline = [];
    const state = makeState({ 'projects/src.json': src, 'projects/dst.json': dst });

    await move(state, 'projects/src.json', b0, 'projects/dst.json', 0);

    expect(src.baseline).toEqual([other, b0]); // ripristinato all'indice originale
    expect(dst.baseline).toEqual([]);
    expect(b0.team).toBeNull(); // snapshot annullato
    expect(setStateCalls.length).toBe(0);
  });

  test('cross-progetto: spostare l\'ultima baseline → progetto origine vuoto, nessun throw', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    const src = MP.schema.createProject('SRC');
    src.baseline = [b0];
    const dst = MP.schema.createProject('DST');
    dst.baseline = [];
    const state = makeState({ 'projects/src.json': src, 'projects/dst.json': dst });

    await expect(move(state, 'projects/src.json', b0, 'projects/dst.json', 0)).resolves.toBeUndefined();
    expect(src.baseline).toEqual([]);
    expect(dst.baseline).toEqual([b0]);
  });

  test('cross-progetto: baseline completed presente in destinazione → targetIndex su array grezzo', async () => {
    const done = MP.schema.createBaseline('done');
    done.completed = true;
    const live = MP.schema.createBaseline('live');
    const dst = MP.schema.createProject('DST');
    dst.baseline = [done, live];
    const b0 = MP.schema.createBaseline('moved');
    const src = MP.schema.createProject('SRC');
    src.baseline = [b0];
    const state = makeState({ 'projects/src.json': src, 'projects/dst.json': dst });

    // il chiamante calcola targetIndex sull'array grezzo: inserire fra done e live => 1
    await move(state, 'projects/src.json', b0, 'projects/dst.json', 1);

    expect(dst.baseline).toEqual([done, b0, live]);
  });

  test('cross-progetto: drop su progetto senza baseline (targetIndex 0)', async () => {
    const b0 = MP.schema.createBaseline('1.0');
    const src = MP.schema.createProject('SRC');
    src.baseline = [b0];
    const dst = MP.schema.createProject('DST');
    dst.baseline = []; // progetto vuoto: riga segnaposto "— no baseline —"
    const state = makeState({ 'projects/src.json': src, 'projects/dst.json': dst });

    await move(state, 'projects/src.json', b0, 'projects/dst.json', 0);

    expect(dst.baseline).toEqual([b0]);
    expect(saveProjectsCalls).toEqual([['projects/dst.json', 'projects/src.json']]);
  });
});
