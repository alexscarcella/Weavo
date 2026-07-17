// Rendering di una singola cella settimana×task. Il doppio click apre il
// popover di edit per questa sola cella (resettando un'eventuale selezione
// multi-cella in corso); il click semplice è gestito da gantt-row.js tramite
// cell-selection.js, che serve invece alla selezione di un range sulla riga.
(function (MP) {
  'use strict';

  function renderWeekCell({ task, settimana, teamMap, sigleValide, siglaTeamMap, allocationIndex, state, file, onCellSaved, lastEdited }) {
    const entry = (task.settimane || {})[settimana];
    const div = document.createElement('div');
    div.className = 'gantt-cell week-cell editable-cell';
    const titleParts = [];

    if (lastEdited && lastEdited.task === task && lastEdited.weeks.has(settimana)) {
      div.classList.add('cell-just-edited');
    }

    if (task.concluso) {
      div.style.background = '#d9d9d9';
    } else if (entry && entry.team) {
      const teamInfo = teamMap.get(entry.team);
      if (teamInfo) {
        div.style.background = teamInfo.colore;
      } else {
        div.classList.add('orphan-team');
        titleParts.push(`Team "${entry.team}" non definito in team-risorse.json`);
        const badge = document.createElement('span');
        badge.className = 'badge-orfano';
        badge.textContent = '?';
        div.appendChild(badge);
      }
    }

    if (entry && entry.milestone) {
      div.classList.add('milestone');
      titleParts.push('Milestone di consegna');
    }

    if (entry && Array.isArray(entry.risorse) && entry.risorse.length) {
      const testo = document.createElement('span');
      testo.className = 'cell-text';
      testo.textContent = entry.risorse.join(', ');
      div.appendChild(testo);
      titleParts.push(entry.risorse.join(', '));

      const orfane = entry.risorse.filter((s) => !sigleValide.has(s));
      if (orfane.length) {
        div.classList.add('orphan-risorsa');
        titleParts.push(`Sigla non in team-risorse.json: ${orfane.join(', ')}`);
        const badge = document.createElement('span');
        badge.className = 'badge-orfano badge-orfano-risorsa';
        badge.textContent = '!';
        div.appendChild(badge);
      }

      if (!task.concluso) {
        const sovrallocate = entry.risorse.filter(
          (s) => MP.overallocation.findAllocations(allocationIndex, s, settimana).length > 1
        );
        if (sovrallocate.length) {
          div.classList.add('overallocated');
          titleParts.push(`Sovrallocazione: ${sovrallocate.join(', ')} allocata anche su altri task questa settimana`);
        }

        const daRegolarizzare = entry.team
          ? entry.risorse.filter((s) => siglaTeamMap.has(s) && siglaTeamMap.get(s) !== entry.team)
          : [];
        if (daRegolarizzare.length) {
          div.classList.add('team-mismatch');
          titleParts.push(`Team da regolarizzare: ${daRegolarizzare.join(', ')} non appartiene più al team "${entry.team}"`);
          const badge = document.createElement('span');
          badge.className = 'badge-orfano badge-mismatch';
          badge.textContent = '⚠';
          div.appendChild(badge);
        }
      }
    }

    if (titleParts.length) div.title = titleParts.join(' — ');

    div.addEventListener('dblclick', () => {
      MP.cellSelection.reset();
      MP.cellPopover.openPopover({
        anchorEl: div,
        dataset: state.dataset,
        task,
        settimana,
        onSave: (newEntry) => onCellSaved({ state, file, task, settimana, newEntry }),
      });
    });

    return div;
  }

  MP.ganttCell = { renderWeekCell };
})(window.MP = window.MP || {});
