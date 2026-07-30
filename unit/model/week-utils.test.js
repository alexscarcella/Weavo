const { loadMP } = require('../helpers/load-mp');

describe('MP.weekUtils.addWeeks', () => {
  const { weekUtils } = loadMP('js/model/week-utils.js');

  test('adding 1 week rolls over to the next month when needed', () => {
    expect(weekUtils.addWeeks('2026-07-27', 1)).toBe('2026-08-03');
  });
});
