// Pagina dedicata al CRUD di team e risorse (team-resources.json): unico punto
// dell'app dove si creano/modificano/eliminano team e risorse — la legenda
// del gantt e la vista resource-load sono di sola lettura e rimandano qui.
// Un team ha 0-N risorse; una risorsa appartiene sempre a esattamente un
// team (obbligatorio già alla creazione).
(function (MP) {
  'use strict';

  const createMenuButton = MP.contextMenu.createMenuButton;

  function swatch(colore) {
    const span = document.createElement('span');
    span.className = 'team-swatch';
    span.style.background = colore;
    return span;
  }

  function renderResourceRow(state, team, risorsa) {
    const row = document.createElement('div');
    row.className = 'resource-row';

    const initials = document.createElement('span');
    initials.className = 'resource-initials';
    initials.textContent = risorsa.initials;
    row.appendChild(initials);

    const nome = document.createElement('span');
    nome.className = 'resource-name';
    nome.textContent = risorsa.name;
    row.appendChild(nome);

    row.appendChild(createMenuButton([
      { label: 'Rename resource', onClick: () => MP.resourceCrud.renameResource(state, risorsa.initials) },
      { label: 'Move to another team', onClick: () => MP.resourceCrud.moveResource(state, risorsa.initials) },
      { label: 'Delete resource', danger: true, onClick: () => MP.resourceCrud.deleteResource(state, risorsa.initials) },
    ]));

    return row;
  }

  function renderTeamCard(state, team) {
    const card = document.createElement('div');
    card.className = 'team-card';

    const header = document.createElement('div');
    header.className = 'team-card-header';
    header.appendChild(swatch(team.color));
    const titolo = document.createElement('span');
    titolo.className = 'team-title';
    titolo.textContent = `${team.name} (${team.code})`;
    header.appendChild(titolo);
    const conteggio = document.createElement('span');
    conteggio.className = 'hint';
    conteggio.textContent = `${team.resources.length} resources`;
    header.appendChild(conteggio);
    header.appendChild(createMenuButton([
      { label: 'Rename team', onClick: () => MP.teamCrud.renameTeam(state, team.code) },
      { label: 'Change color', onClick: () => MP.teamCrud.recolorTeam(state, team.code) },
      { label: 'Delete team', danger: true, onClick: () => MP.teamCrud.deleteTeam(state, team.code) },
    ]));
    card.appendChild(header);

    const risorseWrap = document.createElement('div');
    risorseWrap.className = 'team-resources';
    if (team.resources.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No resources in this team.';
      risorseWrap.appendChild(empty);
    } else {
      const sortedResources = [...team.resources].sort((a, b) => a.name.localeCompare(b.name));
      sortedResources.forEach((risorsa) => risorseWrap.appendChild(renderResourceRow(state, team, risorsa)));
    }
    card.appendChild(risorseWrap);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-new-resource';
    addBtn.textContent = '+ New resource';
    addBtn.addEventListener('click', () => MP.resourceCrud.createResource(state, team.code));
    card.appendChild(addBtn);

    return card;
  }

  function renderTeamResourcesView(state) {
    const { dataset } = state;
    const page = document.createElement('div');
    page.className = 'team-resources-page';

    const toolbar = document.createElement('div');
    toolbar.className = 'gantt-toolbar';
    const info = document.createElement('span');
    info.className = 'dataset-info';
    info.textContent = 'Team & resources — every resource belongs to exactly one team.';
    toolbar.appendChild(info);
    const addTeamBtn = document.createElement('button');
    addTeamBtn.type = 'button';
    addTeamBtn.className = 'btn-new-team';
    addTeamBtn.textContent = '+ New team';
    addTeamBtn.addEventListener('click', () => MP.teamCrud.createTeam(state));
    toolbar.appendChild(addTeamBtn);
    page.appendChild(toolbar);

    if (dataset.teamResources.teams.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No teams in team-resources.json.';
      page.appendChild(empty);
      return page;
    }

    const list = document.createElement('div');
    list.className = 'team-list';
    dataset.teamResources.teams.forEach((team) => list.appendChild(renderTeamCard(state, team)));
    page.appendChild(list);

    return page;
  }

  MP.teamResourcesView = { renderTeamResourcesView };
})(window.MP = window.MP || {});
