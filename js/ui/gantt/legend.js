// Legenda colori costruita dinamicamente da team-risorse.json (nessun colore
// hardcoded). Sola lettura: la creazione/modifica di team e risorse è
// centralizzata nella pagina dedicata (js/ui/team-risorse/team-risorse-view.js).
(function (MP) {
  'use strict';

  function swatch(className, colore) {
    const span = document.createElement('span');
    span.className = className || 'legend-swatch';
    if (colore) span.style.background = colore;
    return span;
  }

  function staticItem(colore, extraClass, testo) {
    const item = document.createElement('span');
    item.className = 'legend-item';
    item.appendChild(swatch(`legend-swatch${extraClass ? ' ' + extraClass : ''}`, colore));
    item.appendChild(document.createTextNode(testo));
    return item;
  }

  function badgeItem(badgeClass, badgeText, testo) {
    const item = document.createElement('span');
    item.className = 'legend-item';
    const badge = document.createElement('span');
    badge.className = `badge-orfano legend-badge${badgeClass ? ' ' + badgeClass : ''}`;
    badge.textContent = badgeText;
    item.appendChild(badge);
    item.appendChild(document.createTextNode(testo));
    return item;
  }

  function renderLegend(state) {
    const dataset = state.dataset;
    const div = document.createElement('div');
    div.className = 'legend';

    dataset.teamRisorsa.team.forEach((t) => {
      const item = document.createElement('span');
      item.className = 'legend-item';
      item.appendChild(swatch('legend-swatch', t.colore));
      const label = document.createElement('span');
      label.textContent = t.nome;
      item.appendChild(label);
      div.appendChild(item);
    });

    div.appendChild(staticItem('#d9d9d9', null, 'Closed'));
    div.appendChild(staticItem(null, 'legend-milestone', 'Milestone'));
    div.appendChild(staticItem(null, 'legend-overallocated', 'Overallocated'));
    div.appendChild(staticItem(null, 'legend-mismatch', 'Team to regularize'));
    div.appendChild(badgeItem('', '?', 'Team not defined'));
    div.appendChild(badgeItem('badge-orfano-risorsa', '!', 'Sigla not in directory'));

    return div;
  }

  MP.legend = { renderLegend };
})(window.MP = window.MP || {});
