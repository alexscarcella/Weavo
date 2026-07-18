// CRUD team dentro team-resources.json: crea, rinomina, ricolora, elimina.
// `code` è la chiave tecnica referenziata dai task (§4.5 spec): eliminarlo
// lascia i task che lo usano con un riferimento orfano, segnalato in UI, non
// corretto in automatico (nessuna migrazione automatica prevista).
// L'eliminazione di un team con risorse ancora assegnate è bloccata: la
// relazione team->resources è 1-N, quindi eliminare il team lascerebbe le sue
// risorse senza un team, condizione mai valida in questo modello.
(function (MP) {
  'use strict';

  async function persist(state) {
    try {
      await MP.saveCoordinator.saveTeamResources(state);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving team-resources.json: ${e.message}`);
    }
  }

  function existingCodici(teamResources) {
    return new Set(teamResources.teams.map((t) => t.code));
  }

  async function createTeam(state, codeInput, nameInput, colorInput) {
    const code = codeInput !== undefined ? codeInput : window.prompt('Code of the new team (stable technical identifier, e.g. "qa"):');
    if (!code || !code.trim()) return;
    const codeTrim = code.trim();
    if (existingCodici(state.dataset.teamResources).has(codeTrim)) {
      window.alert(`A team with code "${codeTrim}" already exists.`);
      return;
    }
    const name = nameInput !== undefined ? nameInput : window.prompt('Readable name of the team:');
    if (!name || !name.trim()) return;
    const color = colorInput !== undefined ? colorInput : await MP.modal.promptColor({ title: 'Color of the new team', value: '#2E86FF' });
    if (!color || !color.trim()) return;
    state.dataset.teamResources.teams.push({ code: codeTrim, name: name.trim(), color: color.trim(), resources: [] });
    await persist(state);
  }

  async function renameTeam(state, code, newNameInput) {
    const team = MP.schema.findTeamByCode(state.dataset.teamResources, code);
    if (!team) return;
    const newName = newNameInput !== undefined ? newNameInput : window.prompt('New readable name:', team.name);
    if (!newName || !newName.trim()) return;
    team.name = newName.trim();
    await persist(state);
  }

  async function recolorTeam(state, code, newColorInput) {
    const team = MP.schema.findTeamByCode(state.dataset.teamResources, code);
    if (!team) return;
    const newColor = newColorInput !== undefined ? newColorInput : await MP.modal.promptColor({ title: `Color of team "${team.name}"`, value: team.color });
    if (!newColor || !newColor.trim()) return;
    team.color = newColor.trim();
    await persist(state);
  }

  async function deleteTeam(state, code) {
    const team = MP.schema.findTeamByCode(state.dataset.teamResources, code);
    if (!team) return;
    if ((team.resources || []).length > 0) {
      window.alert(
        `Cannot delete team "${team.name}": it still has ${team.resources.length} resources assigned. Move or delete them before deleting the team.`
      );
      return;
    }
    const confermato = window.confirm(
      `Delete team "${team.name}" (${code})? Tasks referencing it will keep an orphan code (flagged as a warning) and are not modified automatically.`
    );
    if (!confermato) return;
    state.dataset.teamResources.teams = state.dataset.teamResources.teams.filter((t) => t.code !== code);
    await persist(state);
  }

  MP.teamCrud = { createTeam, renameTeam, recolorTeam, deleteTeam };
})(window.MP = window.MP || {});
