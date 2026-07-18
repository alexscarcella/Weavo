// CRUD team dentro team-risorse.json: crea, rinomina, ricolora, elimina.
// `codice` è la chiave tecnica referenziata dai task (§4.5 spec): eliminarlo
// lascia i task che lo usano con un riferimento orfano, segnalato in UI, non
// corretto in automatico (nessuna migrazione automatica prevista).
// L'eliminazione di un team con risorse ancora assegnate è bloccata: la
// relazione team->risorse è 1-N, quindi eliminare il team lascerebbe le sue
// risorse senza un team, condizione mai valida in questo modello.
(function (MP) {
  'use strict';

  async function persist(state) {
    try {
      await MP.saveCoordinator.saveTeamRisorsa(state);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving team-risorse.json: ${e.message}`);
    }
  }

  function existingCodici(teamRisorsa) {
    return new Set(teamRisorsa.team.map((t) => t.codice));
  }

  async function createTeam(state, codiceInput, nomeInput, coloreInput) {
    const codice = codiceInput !== undefined ? codiceInput : window.prompt('Code of the new team (stable technical identifier, e.g. "qa"):');
    if (!codice || !codice.trim()) return;
    const codiceTrim = codice.trim();
    if (existingCodici(state.dataset.teamRisorsa).has(codiceTrim)) {
      window.alert(`A team with code "${codiceTrim}" already exists.`);
      return;
    }
    const nome = nomeInput !== undefined ? nomeInput : window.prompt('Readable name of the team:');
    if (!nome || !nome.trim()) return;
    const colore = coloreInput !== undefined ? coloreInput : await MP.modal.promptColor({ title: 'Color of the new team', value: '#2E86FF' });
    if (!colore || !colore.trim()) return;
    state.dataset.teamRisorsa.team.push({ codice: codiceTrim, nome: nome.trim(), colore: colore.trim(), risorse: [] });
    await persist(state);
  }

  async function renameTeam(state, codice, nuovoNomeInput) {
    const team = MP.schema.findTeamByCodice(state.dataset.teamRisorsa, codice);
    if (!team) return;
    const nuovoNome = nuovoNomeInput !== undefined ? nuovoNomeInput : window.prompt('New readable name:', team.nome);
    if (!nuovoNome || !nuovoNome.trim()) return;
    team.nome = nuovoNome.trim();
    await persist(state);
  }

  async function recolorTeam(state, codice, nuovoColoreInput) {
    const team = MP.schema.findTeamByCodice(state.dataset.teamRisorsa, codice);
    if (!team) return;
    const nuovoColore = nuovoColoreInput !== undefined ? nuovoColoreInput : await MP.modal.promptColor({ title: `Color of team "${team.nome}"`, value: team.colore });
    if (!nuovoColore || !nuovoColore.trim()) return;
    team.colore = nuovoColore.trim();
    await persist(state);
  }

  async function deleteTeam(state, codice) {
    const team = MP.schema.findTeamByCodice(state.dataset.teamRisorsa, codice);
    if (!team) return;
    if ((team.risorse || []).length > 0) {
      window.alert(
        `Cannot delete team "${team.nome}": it still has ${team.risorse.length} resources assigned. Move or delete them before deleting the team.`
      );
      return;
    }
    const confermato = window.confirm(
      `Delete team "${team.nome}" (${codice})? Tasks referencing it will keep an orphan code (flagged as a warning) and are not modified automatically.`
    );
    if (!confermato) return;
    state.dataset.teamRisorsa.team = state.dataset.teamRisorsa.team.filter((t) => t.codice !== codice);
    await persist(state);
  }

  MP.teamCrud = { createTeam, renameTeam, recolorTeam, deleteTeam };
})(window.MP = window.MP || {});
