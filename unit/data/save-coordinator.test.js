const { loadMP } = require('../helpers/load-mp');

// save-coordinator.js è uno script IIFE su window.MP e usa MP.repository /
// MP.conflictDiff / MP.modal SOLO a runtime (non al require): li si stubba prima
// di caricarlo. Nessun DOM, nessun I/O reale.
describe('MP.saveCoordinator', () => {
  const MP = loadMP('js/data/schema.js');

  // Stato dei doppioni, resettato in beforeEach.
  let diskText; // { [file]: testo-su-disco }  — assenza chiave => readTextFileOrNull ritorna null
  let writtenText; // { [file]: testo-scritto }
  let saveProjectImpl; // (file, data) => text | throw
  let confirmConflictResult;
  let confirmConflictCalls;

  global.window.MP.repository = {
    readTextFileOrNull: async (_dir, path) => (Object.prototype.hasOwnProperty.call(diskText, path) ? diskText[path] : null),
    saveProject: async (_dir, file, data) => saveProjectImpl(file, data),
  };
  global.window.MP.conflictDiff = { summarize: () => ['(diff)'] };
  global.window.MP.modal = {
    confirmConflict: async ({ path }) => {
      confirmConflictCalls.push(path);
      return confirmConflictResult;
    },
  };

  loadMP('js/data/save-coordinator.js');
  const { saveCoordinator } = MP;

  function makeState(files) {
    const projects = new Map();
    for (const [file, o] of Object.entries(files)) {
      projects.set(file, { data: { name: o.name || file }, rawText: o.rawText });
    }
    return { dirHandle: {}, dataset: { projects } };
  }

  beforeEach(() => {
    diskText = {};
    writtenText = {};
    confirmConflictResult = true;
    confirmConflictCalls = [];
    saveProjectImpl = (file, data) => {
      const text = JSON.stringify(data);
      writtenText[file] = text;
      return text;
    };
  });

  // --- regressione saveProject (comportamento invariato dopo il refactor) ---

  test('saveProject: nessun conflitto → scrive una volta, aggiorna rawText, ritorna true', async () => {
    const state = makeState({ 'projects/a.json': { rawText: 'OLD', name: 'A' } });
    diskText['projects/a.json'] = 'OLD';
    const res = await saveCoordinator.saveProject(state, 'projects/a.json');
    expect(res).toBe(true);
    expect(confirmConflictCalls).toEqual([]);
    expect(writtenText['projects/a.json']).toBe(JSON.stringify({ name: 'A' }));
    expect(state.dataset.projects.get('projects/a.json').rawText).toBe(JSON.stringify({ name: 'A' }));
  });

  test('saveProject: disco diverso + conferma → scrive, ritorna true', async () => {
    const state = makeState({ 'projects/a.json': { rawText: 'OLD', name: 'A' } });
    diskText['projects/a.json'] = 'CHANGED';
    confirmConflictResult = true;
    const res = await saveCoordinator.saveProject(state, 'projects/a.json');
    expect(res).toBe(true);
    expect(confirmConflictCalls).toEqual(['projects/a.json']);
    expect(writtenText['projects/a.json']).toBeDefined();
  });

  test('saveProject: disco diverso + annulla → nessuna scrittura, rawText invariato, false', async () => {
    const state = makeState({ 'projects/a.json': { rawText: 'OLD', name: 'A' } });
    diskText['projects/a.json'] = 'CHANGED';
    confirmConflictResult = false;
    const res = await saveCoordinator.saveProject(state, 'projects/a.json');
    expect(res).toBe(false);
    expect(writtenText['projects/a.json']).toBeUndefined();
    expect(state.dataset.projects.get('projects/a.json').rawText).toBe('OLD');
  });

  test('saveProject: file assente su disco → scrive senza prompt', async () => {
    const state = makeState({ 'projects/a.json': { rawText: 'OLD', name: 'A' } });
    const res = await saveCoordinator.saveProject(state, 'projects/a.json');
    expect(res).toBe(true);
    expect(confirmConflictCalls).toEqual([]);
    expect(writtenText['projects/a.json']).toBeDefined();
  });

  test('saveProject: errore di scrittura → propaga, rawText non aggiornato', async () => {
    const state = makeState({ 'projects/a.json': { rawText: 'OLD', name: 'A' } });
    diskText['projects/a.json'] = 'OLD';
    saveProjectImpl = () => { throw new Error('disk full'); };
    await expect(saveCoordinator.saveProject(state, 'projects/a.json')).rejects.toThrow('disk full');
    expect(state.dataset.projects.get('projects/a.json').rawText).toBe('OLD');
  });

  // --- nuovo saveProjects ---

  test('saveProjects: 2 file senza conflitto → scrive entrambi nell\'ordine dato, true', async () => {
    const state = makeState({
      'projects/dest.json': { rawText: 'D', name: 'D' },
      'projects/src.json': { rawText: 'S', name: 'S' },
    });
    diskText['projects/dest.json'] = 'D';
    diskText['projects/src.json'] = 'S';
    const order = [];
    saveProjectImpl = (file, data) => {
      order.push(file);
      const t = JSON.stringify(data);
      writtenText[file] = t;
      return t;
    };
    const res = await saveCoordinator.saveProjects(state, ['projects/dest.json', 'projects/src.json']);
    expect(res).toBe(true);
    expect(order).toEqual(['projects/dest.json', 'projects/src.json']);
    expect(state.dataset.projects.get('projects/dest.json').rawText).toBe(JSON.stringify({ name: 'D' }));
    expect(state.dataset.projects.get('projects/src.json').rawText).toBe(JSON.stringify({ name: 'S' }));
  });

  test('saveProjects: 2° file in conflitto + conferma → tutti i check poi tutte le scritture', async () => {
    const state = makeState({
      'projects/dest.json': { rawText: 'D', name: 'D' },
      'projects/src.json': { rawText: 'S', name: 'S' },
    });
    diskText['projects/dest.json'] = 'D';
    diskText['projects/src.json'] = 'CHANGED';
    confirmConflictResult = true;
    const res = await saveCoordinator.saveProjects(state, ['projects/dest.json', 'projects/src.json']);
    expect(res).toBe(true);
    expect(confirmConflictCalls).toEqual(['projects/src.json']);
    expect(writtenText['projects/dest.json']).toBeDefined();
    expect(writtenText['projects/src.json']).toBeDefined();
  });

  test('saveProjects: 2° file in conflitto + annulla → ZERO scritture (nemmeno del 1°), false', async () => {
    const state = makeState({
      'projects/dest.json': { rawText: 'D', name: 'D' },
      'projects/src.json': { rawText: 'S', name: 'S' },
    });
    diskText['projects/dest.json'] = 'D';
    diskText['projects/src.json'] = 'CHANGED';
    confirmConflictResult = false;
    const res = await saveCoordinator.saveProjects(state, ['projects/dest.json', 'projects/src.json']);
    expect(res).toBe(false);
    expect(writtenText).toEqual({});
    expect(state.dataset.projects.get('projects/dest.json').rawText).toBe('D');
    expect(state.dataset.projects.get('projects/src.json').rawText).toBe('S');
  });

  test('saveProjects: 1° file in conflitto + annulla → nessun check del 2°, zero scritture', async () => {
    const state = makeState({
      'projects/dest.json': { rawText: 'D', name: 'D' },
      'projects/src.json': { rawText: 'S', name: 'S' },
    });
    diskText['projects/dest.json'] = 'CHANGED';
    diskText['projects/src.json'] = 'S';
    confirmConflictResult = false;
    const res = await saveCoordinator.saveProjects(state, ['projects/dest.json', 'projects/src.json']);
    expect(res).toBe(false);
    expect(confirmConflictCalls).toEqual(['projects/dest.json']);
    expect(writtenText).toEqual({});
  });

  test('saveProjects: errore di scrittura del 2° → rilancia con il nome del file; il 1° resta scritto', async () => {
    const state = makeState({
      'projects/dest.json': { rawText: 'D', name: 'D' },
      'projects/src.json': { rawText: 'S', name: 'S' },
    });
    diskText['projects/dest.json'] = 'D';
    diskText['projects/src.json'] = 'S';
    saveProjectImpl = (file, data) => {
      if (file === 'projects/src.json') throw new Error('EPERM');
      const t = JSON.stringify(data);
      writtenText[file] = t;
      return t;
    };
    await expect(saveCoordinator.saveProjects(state, ['projects/dest.json', 'projects/src.json']))
      .rejects.toThrow('Error saving "projects/src.json": EPERM');
    expect(writtenText['projects/dest.json']).toBeDefined();
    expect(state.dataset.projects.get('projects/dest.json').rawText).toBe(JSON.stringify({ name: 'D' }));
  });

  test('saveProjects: array di 1 elemento → equivalente a saveProject', async () => {
    const state = makeState({ 'projects/a.json': { rawText: 'OLD', name: 'A' } });
    diskText['projects/a.json'] = 'OLD';
    const res = await saveCoordinator.saveProjects(state, ['projects/a.json']);
    expect(res).toBe(true);
    expect(writtenText['projects/a.json']).toBe(JSON.stringify({ name: 'A' }));
  });
});
