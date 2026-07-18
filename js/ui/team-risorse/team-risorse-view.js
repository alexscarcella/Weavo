// Pagina dedicata al CRUD di team e risorse (team-risorse.json): unico punto
// dell'app dove si creano/modificano/eliminano team e risorse — la legenda
// del gantt e la vista carico risorse sono di sola lettura e rimandano qui.
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

    const sigla = document.createElement('span');
    sigla.className = 'resource-sigla';
    sigla.textContent = risorsa.sigla;
    row.appendChild(sigla);

    const nome = document.createElement('span');
    nome.className = 'resource-nome';
    nome.textContent = risorsa.nome;
    row.appendChild(nome);

    row.appendChild(createMenuButton([
      { label: 'Rename resource', onClick: () => MP.resourceCrud.renameResource(state, risorsa.sigla) },
      { label: 'Move to another team', onClick: () => MP.resourceCrud.moveResource(state, risorsa.sigla) },
      { label: 'Delete resource', danger: true, onClick: () => MP.resourceCrud.deleteResource(state, risorsa.sigla) },
    ]));

    return row;
  }

  function renderTeamCard(state, team) {
    const card = document.createElement('div');
    card.className = 'team-card';

    const header = document.createElement('div');
    header.className = 'team-card-header';
    header.appendChild(swatch(team.colore));
    const titolo = document.createElement('span');
    titolo.className = 'team-titolo';
    titolo.textContent = `${team.nome} (${team.codice})`;
    header.appendChild(titolo);
    const conteggio = document.createElement('span');
    conteggio.className = 'hint';
    conteggio.textContent = `${team.risorse.length} resources`;
    header.appendChild(conteggio);
    header.appendChild(createMenuButton([
      { label: 'Rename team', onClick: () => MP.teamCrud.renameTeam(state, team.codice) },
      { label: 'Change color', onClick: () => MP.teamCrud.recolorTeam(state, team.codice) },
      { label: 'Delete team', danger: true, onClick: () => MP.teamCrud.deleteTeam(state, team.codice) },
    ]));
    card.appendChild(header);

    const risorseWrap = document.createElement('div');
    risorseWrap.className = 'team-resources';
    if (team.risorse.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No resources in this team.';
      risorseWrap.appendChild(empty);
    } else {
      team.risorse.forEach((risorsa) => risorseWrap.appendChild(renderResourceRow(state, team, risorsa)));
    }
    card.appendChild(risorseWrap);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn-nuova-risorsa';
    addBtn.textContent = '+ New resource';
    addBtn.addEventListener('click', () => MP.resourceCrud.createResource(state, team.codice));
    card.appendChild(addBtn);

    return card;
  }

  function renderTeamRisorsaView(state) {
    const { dataset } = state;
    const page = document.createElement('div');
    page.className = 'team-risorse-page';

    const toolbar = document.createElement('div');
    toolbar.className = 'gantt-toolbar';
    const info = document.createElement('span');
    info.className = 'dataset-info';
    info.textContent = 'Team & resources — every resource belongs to exactly one team.';
    toolbar.appendChild(info);
    const addTeamBtn = document.createElement('button');
    addTeamBtn.type = 'button';
    addTeamBtn.className = 'btn-nuovo-tipo';
    addTeamBtn.textContent = '+ New team';
    addTeamBtn.addEventListener('click', () => MP.teamCrud.createTeam(state));
    toolbar.appendChild(addTeamBtn);
    page.appendChild(toolbar);

    if (dataset.teamRisorsa.team.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hint';
      empty.textContent = 'No teams in team-risorse.json.';
      page.appendChild(empty);
      return page;
    }

    const list = document.createElement('div');
    list.className = 'team-list';
    dataset.teamRisorsa.team.forEach((team) => list.appendChild(renderTeamCard(state, team)));
    page.appendChild(list);

    return page;
  }

  MP.teamRisorsaView = { renderTeamRisorsaView };
})(window.MP = window.MP || {});
