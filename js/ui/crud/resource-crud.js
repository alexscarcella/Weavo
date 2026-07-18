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
      window.alert(`Error saving team-risorse.json: ${e.message}`);
    }
  }

  function promptTeamCodice(teamRisorsa, message) {
    const codici = teamRisorsa.team.map((t) => `${t.codice} (${t.nome})`).join(', ');
    const codice = window.prompt(`${message}\nAvailable teams: ${codici}`);
    if (!codice || !codice.trim()) return null;
    const codiceTrim = codice.trim();
    const team = MP.schema.findTeamByCodice(teamRisorsa, codiceTrim);
    if (!team) {
      window.alert(`No team with code "${codiceTrim}".`);
      return null;
    }
    return team;
  }

  async function createResource(state, teamCodiceInput, siglaInput, nomeInput) {
    const teamRisorsa = state.dataset.teamRisorsa;
    if (teamRisorsa.team.length === 0) {
      window.alert('Create at least one team first: a resource must always belong to a team.');
      return;
    }
    const team = teamCodiceInput !== undefined
      ? MP.schema.findTeamByCodice(teamRisorsa, teamCodiceInput)
      : promptTeamCodice(teamRisorsa, 'Code of the team to assign the new resource to (required):');
    if (!team) return;

    const sigla = siglaInput !== undefined ? siglaInput : window.prompt('Sigla of the new resource (e.g. LC):');
    if (!sigla || !sigla.trim()) return;
    const siglaTrim = sigla.trim().toUpperCase();
    if (MP.schema.existingSigle(teamRisorsa).has(siglaTrim)) {
      window.alert(`A resource with sigla "${siglaTrim}" already exists.`);
      return;
    }
    const nome = nomeInput !== undefined ? nomeInput : window.prompt('Full name of the resource:');
    if (!nome || !nome.trim()) return;
    team.risorse.push({ sigla: siglaTrim, nome: nome.trim() });
    await persist(state);
  }

  async function renameResource(state, sigla, nuovoNomeInput) {
    const found = MP.schema.findResourceEntry(state.dataset.teamRisorsa, sigla);
    if (!found) return;
    const nuovoNome = nuovoNomeInput !== undefined ? nuovoNomeInput : window.prompt('New full name:', found.risorsa.nome);
    if (!nuovoNome || !nuovoNome.trim()) return;
    found.risorsa.nome = nuovoNome.trim();
    await persist(state);
  }

  // Sposta la risorsa da un team all'altro dentro team-risorse.json. Le settimane già
  // registrate con questa risorsa (task non conclusi) vengono scandite: quelle "non ambigue"
  // (dove, dopo lo spostamento, tutte le risorse allocate in quella cella appartengono a un
  // unico team) hanno il loro `team` riscritto in blocco per seguire il nuovo team, previa
  // conferma con conteggio celle coinvolte — così il colore in gantt segue automaticamente
  // (gantt-cell.js colora in base a entry.team). Le celle con risorse di team diversi restano
  // "ambigue": non vengono toccate, e continuano ad essere segnalate da
  // MP.validation.findTeamMismatches (badge + pannello avvisi), da regolarizzare a mano
  // riaprendo la cella. I task conclusi non vengono mai scanditi né toccati.
  async function moveResource(state, sigla, nuovoTeamCodiceInput) {
    const teamRisorsa = state.dataset.teamRisorsa;
    const found = MP.schema.findResourceEntry(teamRisorsa, sigla);
    if (!found) return;
    let nuovoTeam;
    if (nuovoTeamCodiceInput !== undefined) {
      nuovoTeam = MP.schema.findTeamByCodice(teamRisorsa, nuovoTeamCodiceInput);
    } else {
      const altriTeam = teamRisorsa.team.filter((t) => t.codice !== found.team.codice);
      if (altriTeam.length === 0) {
        window.alert('There are no other teams to move this resource to.');
        return;
      }
      const codiceScelto = await MP.modal.promptSelect({
        title: `Move "${sigla} — ${found.risorsa.nome}"`,
        label: 'New team',
        options: altriTeam.map((t) => ({ value: t.codice, label: `${t.codice} — ${t.nome}` })),
        confirmLabel: 'Move',
      });
      if (!codiceScelto) return;
      nuovoTeam = MP.schema.findTeamByCodice(teamRisorsa, codiceScelto);
    }
    if (!nuovoTeam) return;
    if (nuovoTeam.codice === found.team.codice) return;

    const teamAttualeDi = (s) => {
      if (s === sigla) return nuovoTeam.codice;
      const entry = MP.schema.findResourceEntry(teamRisorsa, s);
      return entry ? entry.team.codice : null;
    };

    const daRegolarizzare = [];
    const { attive } = MP.validation.findResourceAllocations(state.dataset, sigla);
    for (const { file, entry } of attive) {
      if (!entry.team || !Array.isArray(entry.risorse)) continue;
      const teamsCoinvolti = new Set(entry.risorse.map(teamAttualeDi));
      if (teamsCoinvolti.size === 1 && !teamsCoinvolti.has(null)) {
        const teamUnico = [...teamsCoinvolti][0];
        if (entry.team !== teamUnico) daRegolarizzare.push({ file, entry, teamUnico });
      }
    }

    const extra = daRegolarizzare.length > 0
      ? `\n\n${daRegolarizzare.length} cell(s) will be automatically updated to the new team "${nuovoTeam.codice}" because they only involve resources of that team. Cells with resources from different teams will remain flagged as "to regularize" in the warnings panel, to fix by hand.`
      : '';
    const confermato = window.confirm(
      `Move "${sigla} — ${found.risorsa.nome}" from team "${found.team.codice}" to team "${nuovoTeam.codice}"?${extra}`
    );
    if (!confermato) return;

    found.team.risorse = found.team.risorse.filter((r) => r.sigla !== sigla);
    nuovoTeam.risorse.push(found.risorsa);

    const fileDaSalvare = new Set();
    for (const { file, entry, teamUnico } of daRegolarizzare) {
      entry.team = teamUnico;
      fileDaSalvare.add(file);
    }

    try {
      await MP.saveCoordinator.saveTeamRisorsa(state);
      for (const file of fileDaSalvare) {
        await MP.saveCoordinator.saveProject(state, file);
      }
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving: ${e.message}`);
    }
  }

  function buildDeletionReport(sigla, nomeRisorsa, attive, concluse) {
    const riga = (r) => `${r.progetto.nome} / ${r.baseline.versione} / ${r.task.nome} / ${r.settimana}`;
    const sezione = (titolo, records, nota) => [
      `${titolo} (${records.length}):`,
      ...(records.length ? records.map((r) => `${riga(r)}${nota ? ` (${nota})` : ''}`) : ['(none)']),
    ].join('\n');
    return [
      `Resource: ${sigla} — ${nomeRisorsa}`,
      '',
      sezione('Allocations that will be removed', attive, null),
      '',
      sezione('Allocations on completed tasks (unchanged)', concluse, 'historical'),
    ].join('\n');
  }

  // Elimina la risorsa dall'anagrafica e, contestualmente, rimuove ogni sua allocazione dai
  // task non conclusi (mai lo stato parziale {team, risorse: []}: se risorse si svuota viene
  // rimosso anche team, preservando milestone se presente). I task conclusi non vengono toccati
  // (stesso principio "mai auto-corretti" usato per mismatch team e milestone), diventando
  // riferimento orfano segnalato da MP.validation.findOrphanRisorse. I riferimenti di progetto
  // (solutionAnalyst/vvReference) non vengono toccati per lo stesso motivo. Prima
  // dell'eliminazione viene mostrato un riepilogo copiabile (testo pre-selezionato) delle
  // allocazioni coinvolte, con richiesta di conferma esplicita.
  async function deleteResource(state, sigla, skipConfirm) {
    const found = MP.schema.findResourceEntry(state.dataset.teamRisorsa, sigla);
    if (!found) return;

    const { attive, concluse } = MP.validation.findResourceAllocations(state.dataset, sigla);

    if (!skipConfirm) {
      const confermato = await MP.modal.confirmWithReport({
        title: `Delete the resource "${sigla} — ${found.risorsa.nome}"?`,
        message: 'It will be removed from the team-risorse.json directory. The active allocations listed below will be removed from non-completed tasks; those on completed tasks remain unchanged (historical data). The text below is pre-selected: copy it if you want to keep it elsewhere.',
        reportText: buildDeletionReport(sigla, found.risorsa.nome, attive, concluse),
        confirmLabel: 'Proceed with deletion',
        cancelLabel: 'Cancel',
        danger: true,
      });
      if (!confermato) return;
    }

    const fileDaSalvare = new Set();
    for (const { file, task, settimana, entry } of attive) {
      entry.risorse = entry.risorse.filter((s) => s !== sigla);
      if (entry.risorse.length === 0) delete entry.team;
      if (MP.schema.isWeekEntryEmpty(entry)) delete task.settimane[settimana];
      fileDaSalvare.add(file);
    }

    try {
      for (const file of fileDaSalvare) {
        await MP.saveCoordinator.saveProject(state, file);
      }
      found.team.risorse = found.team.risorse.filter((r) => r.sigla !== sigla);
      await MP.saveCoordinator.saveTeamRisorsa(state);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving: ${e.message}`);
    }
  }

  MP.resourceCrud = { createResource, renameResource, moveResource, deleteResource };
})(window.MP = window.MP || {});
