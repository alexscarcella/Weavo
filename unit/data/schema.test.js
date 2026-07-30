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
