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

  test('starts with an empty note, no tasks, no BL team, and not completed', () => {
    expect(schema.createBaseline('1.0')).toEqual({ version: '1.0', completed: false, task: [], note: '', team: null });
  });
});

describe('MP.schema.normalizeBaselineTeam', () => {
  const { schema } = loadMP('js/data/schema.js');

  test('null/undefined means "inherit project team" and stays null', () => {
    expect(schema.normalizeBaselineTeam(null)).toBe(null);
    expect(schema.normalizeBaselineTeam(undefined)).toBe(null);
  });

  test('an object is completed with the missing referents keys', () => {
    expect(schema.normalizeBaselineTeam({ projectManager: 'LC' })).toEqual({
      projectManager: 'LC', projectEngineer: '', solutionAnalyst: '', vvReference: '', note: '',
    });
  });

  test('a legacy free-text string is migrated into note', () => {
    expect(schema.normalizeBaselineTeam('vecchio team')).toEqual({
      projectManager: '', projectEngineer: '', solutionAnalyst: '', vvReference: '', note: 'vecchio team',
    });
  });
});

describe('MP.schema.resolveBaselineTeam', () => {
  const { schema } = loadMP('js/data/schema.js');

  test('inherits the project team when the baseline has no BL team', () => {
    const progetto = { referents: { projectManager: 'PM1', projectEngineer: '', solutionAnalyst: '', vvReference: '', note: '' } };
    expect(schema.resolveBaselineTeam(progetto, { team: null })).toBe(progetto.referents);
  });

  test('returns the specific BL team when overridden', () => {
    const progetto = { referents: { projectManager: 'PM1', projectEngineer: '', solutionAnalyst: '', vvReference: '', note: '' } };
    const team = { projectManager: 'PM2', projectEngineer: '', solutionAnalyst: '', vvReference: '', note: '' };
    expect(schema.resolveBaselineTeam(progetto, { team })).toBe(team);
  });
});

describe('MP.schema.isBaselineTeamEmpty', () => {
  const { schema } = loadMP('js/data/schema.js');

  test('null/undefined is empty (inherit)', () => {
    expect(schema.isBaselineTeamEmpty(null)).toBe(true);
    expect(schema.isBaselineTeamEmpty(undefined)).toBe(true);
  });

  test('an all-empty team is empty (not populated)', () => {
    expect(schema.isBaselineTeamEmpty({ projectManager: '', projectEngineer: '', solutionAnalyst: '', vvReference: '', note: '' })).toBe(true);
  });

  test('a team with at least one field set is not empty', () => {
    expect(schema.isBaselineTeamEmpty({ projectManager: '', projectEngineer: '', solutionAnalyst: 'AB', vvReference: '', note: '' })).toBe(false);
    expect(schema.isBaselineTeamEmpty({ projectManager: 'PM', projectEngineer: '', solutionAnalyst: '', vvReference: '', note: '' })).toBe(false);
  });
});

describe('MP.schema.createTask', () => {
  const { schema } = loadMP('js/data/schema.js');

  test('starts with an empty note, no weeks, and not completed', () => {
    expect(schema.createTask('Integration Testing')).toEqual({ name: 'Integration Testing', completed: false, weeks: {}, note: '' });
  });
});
