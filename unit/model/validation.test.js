const { loadMP } = require('../helpers/load-mp');

describe('MP.validation.findTeamMismatches', () => {
  // validation.js chiama internamente MP.schema.findResourceEntry/existingInitials, quindi
  // schema.js va caricato PRIMA di validation.js — stesso ordine di index.html, non a caso:
  // entrambi si agganciano allo stesso window.MP condiviso, quindi l'ordine di require conta.
  const { schema } = loadMP('js/data/schema.js');
  const { validation } = loadMP('js/model/validation.js');

  // Costruisce un dataset minimo ma realistico, usando gli stessi factory di schema.js
  // usati dall'app vera (createProject/createBaseline/createTask/createWeekEntry) invece di
  // oggetti letterali a mano: se la forma dei dati cambia, questo fixture si adegua da solo.
  function buildDataset({ taskCompleted = false, weekCompleted = false } = {}) {
    const teamResources = {
      teams: [
        { code: 'dev', name: 'Development', color: '#00B050', resources: [{ initials: 'LC', name: 'Luca Ciazzi' }] },
        { code: 'vv', name: 'V&V', color: '#FFC000', resources: [] },
      ],
    };

    const project = schema.createProject('Progetto Test');
    const baseline = schema.createBaseline('v1');
    const task = schema.createTask('Task Test');
    task.completed = taskCompleted;
    // LC appartiene al team "dev" in teamResources, ma qui la cella lo alloca sotto "vv":
    // è esattamente il caso di "risorsa spostata dopo che l'allocazione era già registrata".
    task.weeks['2026-08-03'] = schema.createWeekEntry({ team: 'vv', resources: ['LC'], completed: weekCompleted });
    baseline.task.push(task);
    project.baseline.push(baseline);

    return {
      teamResources,
      projects: new Map([['progetto-test.json', { data: project }]]),
    };
  }

  test('segnala una risorsa allocata con un team diverso da quello attuale', () => {
    const dataset = buildDataset();

    const mismatches = validation.findTeamMismatches(dataset);

    expect(mismatches).toEqual([
      {
        progetto: 'Progetto Test',
        baseline: 'v1',
        task: 'Task Test',
        settimana: '2026-08-03',
        sigla: 'LC',
        teamAssegnato: 'dev',
        teamCella: 'vv',
      },
    ]);
  });

  test('non segnala nulla se il task è completed (dato chiuso, mai auto-corretto)', () => {
    const dataset = buildDataset({ taskCompleted: true });

    expect(validation.findTeamMismatches(dataset)).toEqual([]);
  });

  test('non segnala nulla se solo quella settimana è completed (flag indipendente dal task)', () => {
    const dataset = buildDataset({ weekCompleted: true });

    expect(validation.findTeamMismatches(dataset)).toEqual([]);
  });
});
