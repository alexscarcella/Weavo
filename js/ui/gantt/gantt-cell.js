// Rendering di una singola cella settimana×task. Il doppio click apre il
// popover di edit per questa sola cella (resettando un'eventuale selezione
// multi-cella in corso); il click semplice è gestito da gantt-row.js tramite
// cell-selection.js, che serve invece alla selezione di un range sulla riga.
(function (MP) {
  'use strict';

  // Registro task -> (settimana -> div) della cella attualmente renderizzata,
  // ricostruito ad ogni render. Usato da gantt-view.js dopo uno shift per
  // ritrovare il div della cella di destinazione (appena ricreato dal
  // re-render completo del DOM, vedi app.js) e riaprire il popover lì sopra.
  // WeakMap sul `task` (riferimento stabile in memoria per la sessione) così
  // le voci di task ormai eliminati non trattengono i div in memoria.
  const cellRegistry = new WeakMap();

  function registerCell(task, settimana, div) {
    let perSettimana = cellRegistry.get(task);
    if (!perSettimana) {
      perSettimana = new Map();
      cellRegistry.set(task, perSettimana);
    }
    perSettimana.set(settimana, div);
  }

  function getCellDiv(task, settimana) {
    const perSettimana = cellRegistry.get(task);
    return perSettimana ? perSettimana.get(settimana) : undefined;
  }

  function renderWeekCell({ task, baseline, settimana, teamMap, sigleValide, siglaTeamMap, allocationIndex, state, file, onCellSaved, onCellsShift, lastEdited }) {
    const entry = (task.settimane || {})[settimana];
    const div = document.createElement('div');
    div.className = 'gantt-cell week-cell editable-cell';
    const titleParts = [];

    if (lastEdited && lastEdited.tasks.has(task) && lastEdited.weeks.has(settimana)) {
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
        titleParts.push(`Team "${entry.team}" not defined in team-risorse.json`);
        const badge = document.createElement('span');
        badge.className = 'badge-orfano';
        badge.textContent = '?';
        div.appendChild(badge);
      }
    }

    if (entry && entry.milestone) {
      div.classList.add('milestone');
      titleParts.push('Delivery milestone');
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
        titleParts.push(`Sigla not in team-risorse.json: ${orfane.join(', ')}`);
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
          const dettagli = sovrallocate.map((s) => {
            const altri = MP.overallocation
              .findAllocations(allocationIndex, s, settimana)
              .filter((r) => r.taskRef !== task)
              .map((r) => `${r.progettoNome} / BL ${r.baselineVersione} / ${r.taskNome}`)
              .join('; ');
            return `${s} → ${altri}`;
          });
          titleParts.push(`Overallocated this week:\n${dettagli.join('\n')}`);
        }

        const daRegolarizzare = entry.team
          ? entry.risorse.filter((s) => siglaTeamMap.has(s) && siglaTeamMap.get(s) !== entry.team)
          : [];
        if (daRegolarizzare.length) {
          div.classList.add('team-mismatch');
          titleParts.push(`Team to regularize: ${daRegolarizzare.join(', ')} no longer belongs to team "${entry.team}"`);
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
        onSave: (newEntry) => onCellSaved({ state, file, task, baseline, settimana, newEntry }),
        onShift: (direction) => onCellsShift({ state, file, task, baseline, weeks: [settimana], direction }),
      });
    });

    registerCell(task, settimana, div);
    return div;
  }

  MP.ganttCell = { renderWeekCell, getCellDiv };
})(window.MP = window.MP || {});
