// CRUD risorse dentro team-resources.json: crea (sempre dentro un team, mai
// senza), rinomina (nome esteso), elimina, sposta in un altro team. Nessuna
// lista hardcoded: la UI di editing celle/vista resource-load legge sempre
// da qui.
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

  function promptTeamCode(teamResources, message) {
    const codici = teamResources.teams.map((t) => `${t.code} (${t.name})`).join(', ');
    const code = window.prompt(`${message}\nAvailable teams: ${codici}`);
    if (!code || !code.trim()) return null;
    const codeTrim = code.trim();
    const team = MP.schema.findTeamByCode(teamResources, codeTrim);
    if (!team) {
      window.alert(`No team with code "${codeTrim}".`);
      return null;
    }
    return team;
  }

  async function createResource(state, teamCodeInput, initialsInput, nameInput) {
    const teamResources = state.dataset.teamResources;
    if (teamResources.teams.length === 0) {
      window.alert('Create at least one team first: a resource must always belong to a team.');
      return;
    }
    const team = teamCodeInput !== undefined
      ? MP.schema.findTeamByCode(teamResources, teamCodeInput)
      : promptTeamCode(teamResources, 'Code of the team to assign the new resource to (required):');
    if (!team) return;

    const initials = initialsInput !== undefined ? initialsInput : window.prompt('Initials of the new resource (e.g. LC):');
    if (!initials || !initials.trim()) return;
    const initialsTrim = initials.trim().toUpperCase();
    if (MP.schema.existingInitials(teamResources).has(initialsTrim)) {
      window.alert(`A resource with initials "${initialsTrim}" already exists.`);
      return;
    }
    const name = nameInput !== undefined ? nameInput : window.prompt('Full name of the resource:');
    if (!name || !name.trim()) return;
    team.resources.push({ initials: initialsTrim, name: name.trim() });
    await persist(state);
  }

  async function renameResource(state, initials, newNameInput) {
    const found = MP.schema.findResourceEntry(state.dataset.teamResources, initials);
    if (!found) return;
    const newName = newNameInput !== undefined ? newNameInput : window.prompt('New full name:', found.resource.name);
    if (!newName || !newName.trim()) return;
    found.resource.name = newName.trim();
    await persist(state);
  }

  // Sposta la risorsa da un team all'altro dentro team-resources.json. Le settimane già
  // registrate con questa risorsa (task non completed) vengono scandite: quelle "non ambigue"
  // (dove, dopo lo spostamento, tutte le risorse allocate in quella cella appartengono a un
  // unico team) hanno il loro `team` riscritto in blocco per seguire il nuovo team, previa
  // conferma con conteggio celle coinvolte — così il colore in gantt segue automaticamente
  // (gantt-cell.js colora in base a entry.team). Le celle con risorse di team diversi restano
  // "ambigue": non vengono toccate, e continuano ad essere segnalate da
  // MP.validation.findTeamMismatches (badge + pannello avvisi), da regolarizzare a mano
  // riaprendo la cella. I task completed non vengono mai scanditi né toccati.
  async function moveResource(state, initials, newTeamCodeInput) {
    const teamResources = state.dataset.teamResources;
    const found = MP.schema.findResourceEntry(teamResources, initials);
    if (!found) return;
    let newTeam;
    if (newTeamCodeInput !== undefined) {
      newTeam = MP.schema.findTeamByCode(teamResources, newTeamCodeInput);
    } else {
      const altriTeam = teamResources.teams.filter((t) => t.code !== found.team.code);
      if (altriTeam.length === 0) {
        window.alert('There are no other teams to move this resource to.');
        return;
      }
      const codiceScelto = await MP.modal.promptSelect({
        title: `Move "${initials} — ${found.resource.name}"`,
        label: 'New team',
        options: altriTeam.map((t) => ({ value: t.code, label: `${t.code} — ${t.name}` })),
        confirmLabel: 'Move',
      });
      if (!codiceScelto) return;
      newTeam = MP.schema.findTeamByCode(teamResources, codiceScelto);
    }
    if (!newTeam) return;
    if (newTeam.code === found.team.code) return;

    const teamAttualeDi = (s) => {
      if (s === initials) return newTeam.code;
      const entry = MP.schema.findResourceEntry(teamResources, s);
      return entry ? entry.team.code : null;
    };

    const daRegolarizzare = [];
    const { attive } = MP.validation.findResourceAllocations(state.dataset, initials);
    for (const { file, entry } of attive) {
      if (!entry.team || !Array.isArray(entry.resources)) continue;
      const teamsCoinvolti = new Set(entry.resources.map(teamAttualeDi));
      if (teamsCoinvolti.size === 1 && !teamsCoinvolti.has(null)) {
        const teamUnico = [...teamsCoinvolti][0];
        if (entry.team !== teamUnico) daRegolarizzare.push({ file, entry, teamUnico });
      }
    }

    const extra = daRegolarizzare.length > 0
      ? `\n\n${daRegolarizzare.length} cell(s) will be automatically updated to the new team "${newTeam.code}" because they only involve resources of that team. Cells with resources from different teams will remain flagged as "to regularize" in the warnings panel, to fix by hand.`
      : '';
    const confermato = window.confirm(
      `Move "${initials} — ${found.resource.name}" from team "${found.team.code}" to team "${newTeam.code}"?${extra}`
    );
    if (!confermato) return;

    found.team.resources = found.team.resources.filter((r) => r.initials !== initials);
    newTeam.resources.push(found.resource);

    const fileDaSalvare = new Set();
    for (const { file, entry, teamUnico } of daRegolarizzare) {
      entry.team = teamUnico;
      fileDaSalvare.add(file);
    }

    try {
      await MP.saveCoordinator.saveTeamResources(state);
      for (const file of fileDaSalvare) {
        await MP.saveCoordinator.saveProject(state, file);
      }
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving: ${e.message}`);
    }
  }

  function buildDeletionReport(initials, resourceName, attive, concluse) {
    const riga = (r) => `${r.progetto.name} / ${r.baseline.version} / ${r.task.name} / ${r.settimana}`;
    const sezione = (titolo, records, nota) => [
      `${titolo} (${records.length}):`,
      ...(records.length ? records.map((r) => `${riga(r)}${nota ? ` (${nota})` : ''}`) : ['(none)']),
    ].join('\n');
    return [
      `Resource: ${initials} — ${resourceName}`,
      '',
      sezione('Allocations that will be removed', attive, null),
      '',
      sezione('Allocations on completed tasks (unchanged)', concluse, 'historical'),
    ].join('\n');
  }

  // Elimina la risorsa dall'anagrafica e, contestualmente, rimuove ogni sua allocazione dai
  // task non completed (mai lo stato parziale {team, resources: []}: se resources si svuota
  // viene rimosso anche team, preservando milestone se presente). I task completed non vengono
  // toccati (stesso principio "mai auto-corretti" usato per mismatch team e milestone),
  // diventando riferimento orfano segnalato da MP.validation.findOrphanResources. I riferimenti
  // di progetto (solutionAnalyst/vvReference) non vengono toccati per lo stesso motivo. Prima
  // dell'eliminazione viene mostrato un riepilogo copiabile (testo pre-selezionato) delle
  // allocazioni coinvolte, con richiesta di conferma esplicita.
  async function deleteResource(state, initials, skipConfirm) {
    const found = MP.schema.findResourceEntry(state.dataset.teamResources, initials);
    if (!found) return;

    const { attive, concluse } = MP.validation.findResourceAllocations(state.dataset, initials);

    if (!skipConfirm) {
      const confermato = await MP.modal.confirmWithReport({
        title: `Delete the resource "${initials} — ${found.resource.name}"?`,
        message: 'It will be removed from the team-resources.json directory. The active allocations listed below will be removed from non-completed tasks; those on completed tasks remain unchanged (historical data). The text below is pre-selected: copy it if you want to keep it elsewhere.',
        reportText: buildDeletionReport(initials, found.resource.name, attive, concluse),
        confirmLabel: 'Proceed with deletion',
        cancelLabel: 'Cancel',
        danger: true,
      });
      if (!confermato) return;
    }

    const fileDaSalvare = new Set();
    for (const { file, task, settimana, entry } of attive) {
      entry.resources = entry.resources.filter((s) => s !== initials);
      if (entry.resources.length === 0) delete entry.team;
      if (MP.schema.isWeekEntryEmpty(entry)) delete task.weeks[settimana];
      fileDaSalvare.add(file);
    }

    try {
      for (const file of fileDaSalvare) {
        await MP.saveCoordinator.saveProject(state, file);
      }
      found.team.resources = found.team.resources.filter((r) => r.initials !== initials);
      await MP.saveCoordinator.saveTeamResources(state);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving: ${e.message}`);
    }
  }

  MP.resourceCrud = { createResource, renameResource, moveResource, deleteResource };
})(window.MP = window.MP || {});
