// CRUD risorse dentro team-risorse.json: crea (sempre dentro un team, mai
// senza), rinomina (nome esteso), elimina, sposta in un altro team. Nessuna
// lista hardcoded: la UI di editing celle/vista carico risorse legge sempre
// da qui.
(function (MP) {
  'use strict';

  async function persist(state) {
    try {
      await MP.saveCoordinator.saveTeamRisorsa(state);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Errore nel salvataggio di team-risorse.json: ${e.message}`);
    }
  }

  function promptTeamCodice(teamRisorsa, message) {
    const codici = teamRisorsa.team.map((t) => `${t.codice} (${t.nome})`).join(', ');
    const codice = window.prompt(`${message}\nTeam disponibili: ${codici}`);
    if (!codice || !codice.trim()) return null;
    const codiceTrim = codice.trim();
    const team = MP.schema.findTeamByCodice(teamRisorsa, codiceTrim);
    if (!team) {
      window.alert(`Nessun team con codice "${codiceTrim}".`);
      return null;
    }
    return team;
  }

  async function createResource(state, teamCodiceInput, siglaInput, nomeInput) {
    const teamRisorsa = state.dataset.teamRisorsa;
    if (teamRisorsa.team.length === 0) {
      window.alert('Crea prima almeno un team: una risorsa deve sempre appartenere a un team.');
      return;
    }
    const team = teamCodiceInput !== undefined
      ? MP.schema.findTeamByCodice(teamRisorsa, teamCodiceInput)
      : promptTeamCodice(teamRisorsa, 'Codice del team a cui assegnare la nuova risorsa (obbligatorio):');
    if (!team) return;

    const sigla = siglaInput !== undefined ? siglaInput : window.prompt('Sigla della nuova risorsa (es. LC):');
    if (!sigla || !sigla.trim()) return;
    const siglaTrim = sigla.trim().toUpperCase();
    if (MP.schema.existingSigle(teamRisorsa).has(siglaTrim)) {
      window.alert(`Esiste già una risorsa con sigla "${siglaTrim}".`);
      return;
    }
    const nome = nomeInput !== undefined ? nomeInput : window.prompt('Nome esteso della risorsa:');
    if (!nome || !nome.trim()) return;
    team.risorse.push({ sigla: siglaTrim, nome: nome.trim() });
    await persist(state);
  }

  async function renameResource(state, sigla, nuovoNomeInput) {
    const found = MP.schema.findResourceEntry(state.dataset.teamRisorsa, sigla);
    if (!found) return;
    const nuovoNome = nuovoNomeInput !== undefined ? nuovoNomeInput : window.prompt('Nuovo nome esteso:', found.risorsa.nome);
    if (!nuovoNome || !nuovoNome.trim()) return;
    found.risorsa.nome = nuovoNome.trim();
    await persist(state);
  }

  // Sposta la risorsa da un team all'altro dentro team-risorse.json. Non
  // tocca nessun file progetto: le settimane già registrate con questa
  // risorsa restano com'erano e, se il loro `team` non combacia più col
  // nuovo team della risorsa, vengono segnalate da
  // MP.validation.findTeamMismatches (evidenziate nel gantt), da regolarizzare
  // a mano riaprendo la cella.
  async function moveResource(state, sigla, nuovoTeamCodiceInput) {
    const teamRisorsa = state.dataset.teamRisorsa;
    const found = MP.schema.findResourceEntry(teamRisorsa, sigla);
    if (!found) return;
    const nuovoTeam = nuovoTeamCodiceInput !== undefined
      ? MP.schema.findTeamByCodice(teamRisorsa, nuovoTeamCodiceInput)
      : promptTeamCodice(teamRisorsa, `Nuovo team per "${sigla} — ${found.risorsa.nome}":`);
    if (!nuovoTeam) return;
    if (nuovoTeam.codice === found.team.codice) return;
    found.team.risorse = found.team.risorse.filter((r) => r.sigla !== sigla);
    nuovoTeam.risorse.push(found.risorsa);
    await persist(state);
  }

  async function deleteResource(state, sigla, skipConfirm) {
    const found = MP.schema.findResourceEntry(state.dataset.teamRisorsa, sigla);
    if (!found) return;
    const confermato = skipConfirm || window.confirm(
      `Eliminare la risorsa "${sigla} — ${found.risorsa.nome}" dall'anagrafica? I task che la referenziano già resteranno con una sigla orfana (segnalata come avviso), non vengono modificati automaticamente.`
    );
    if (!confermato) return;
    found.team.risorse = found.team.risorse.filter((r) => r.sigla !== sigla);
    await persist(state);
  }

  MP.resourceCrud = { createResource, renameResource, moveResource, deleteResource };
})(window.MP = window.MP || {});
