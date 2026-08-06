const { loadMP } = require('../helpers/load-mp');

describe('MP.weekUtils.addWeeks', () => {
  const { weekUtils } = loadMP('js/model/week-utils.js');

  test('adding 1 week rolls over to the next month when needed', () => {
    expect(weekUtils.addWeeks('2026-07-27', 1)).toBe('2026-08-03');
  });
});

describe('MP.weekUtils.weeksBetween', () => {
  const { weekUtils } = loadMP('js/model/week-utils.js');

  test('counts forward in weeks as a positive delta', () => {
    expect(weekUtils.weeksBetween('2026-08-03', '2026-08-24')).toBe(3);
  });

  test('counts backward in weeks as a negative delta', () => {
    expect(weekUtils.weeksBetween('2026-08-24', '2026-08-03')).toBe(-3);
  });

  test('is 0 for the same week', () => {
    expect(weekUtils.weeksBetween('2026-08-03', '2026-08-03')).toBe(0);
  });
});
