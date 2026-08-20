const { loadMP } = require('../helpers/load-mp');

describe('MP.schema.isWeekEntryEmpty', () => {
  const { schema } = loadMP('js/data/schema.js');

  test('an allocation with team + resources is not empty', () => {
    expect(schema.isWeekEntryEmpty({ team: 'dev', resources: ['LC'] })).toBe(false);
  });

  test('a team without resources never counts as an allocation (no partial state)', () => {
    expect(schema.isWeekEntryEmpty({ team: 'dev', resources: [] })).toBe(true);
  });
});

describe('MP.schema.createBaseline', () => {
  const { schema } = loadMP('js/data/schema.js');

  test('starts with an empty note, no tasks, and not completed', () => {
    expect(schema.createBaseline('1.0')).toEqual({ version: '1.0', completed: false, task: [], note: '' });
  });
});

describe('MP.schema.createTask', () => {
  const { schema } = loadMP('js/data/schema.js');

  test('starts with an empty note, no weeks, and not completed', () => {
    expect(schema.createTask('Integration Testing')).toEqual({ name: 'Integration Testing', completed: false, weeks: {}, note: '' });
  });
});
