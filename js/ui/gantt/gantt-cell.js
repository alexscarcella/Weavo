// Rendering di una singola cella settimana×task. Il click semplice/shift-click
// è gestito da gantt-row.js tramite cell-selection.js (selezione di una cella
// o di un range sulla riga — solo evidenziazione, nessun popover). Il doppio
// click non fa nulla: ogni azione passa dal click destro (contextmenu), che
// risolve la selezione corrente in un elenco di settimane
// (cell-selection.js:getRangeForAction) e apre il menu combinato
// (gantt-view.js:openCellContextMenu) — popover di allocazione sotto la
// cella, ed eventualmente il menu di shift sopra, se il range ha già
// un'allocazione.
(function (MP) {
  'use strict';

  // Registro task -> (settimana -> div) della cella attualmente renderizzata,
  // ricostruito ad ogni render. Usato da gantt-view.js/cell-selection.js dopo
  // uno shift per ritrovare il div della cella di destinazione (appena
  // ricreato dal re-render completo del DOM, vedi app.js) e riaprire il menu
  // di shift / ri-evidenziare la selezione lì sopra. WeakMap sul `task`
  // (riferimento stabile in memoria per la sessione) così le voci di task
  // ormai eliminati non trattengono i div in memoria.
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

  function renderWeekCell({ task, baseline, settimana, teamMap, validInitials, initialsTeamMap, allocationIndex, state, file, onCellContextMenu, lastEdited }) {
    const entry = (task.weeks || {})[settimana];
    const div = document.createElement('div');
    div.className = 'gantt-cell week-cell editable-cell';
    const titleParts = [];

    if (lastEdited && lastEdited.tasks.has(task) && lastEdited.weeks.has(settimana)) {
      div.classList.add('cell-just-edited');
    }

    const weekCompleted = task.completed || (entry && entry.completed === true);

    if (weekCompleted) {
      div.style.background = '#d9d9d9';
    } else if (entry && entry.team) {
      const teamInfo = teamMap.get(entry.team);
      if (teamInfo) {
        div.style.background = teamInfo.color;
      } else {
        div.classList.add('orphan-team');
        titleParts.push(`Team "${entry.team}" not defined in team-resources.json`);
        const badge = document.createElement('span');
        badge.className = 'badge-orphan';
        badge.textContent = '?';
        div.appendChild(badge);
      }
    }

    if (entry && entry.milestone) {
      div.classList.add('milestone');
      titleParts.push('Delivery milestone');
    }

    if (entry && entry.completed) {
      titleParts.push('Completed');
    }

    if (entry && Array.isArray(entry.resources) && entry.resources.length) {
      const testo = document.createElement('span');
      testo.className = 'cell-text';
      testo.textContent = entry.resources.join(', ');
      div.appendChild(testo);
      titleParts.push(entry.resources.join(', '));

      const orfane = entry.resources.filter((s) => !validInitials.has(s));
      if (orfane.length) {
        div.classList.add('orphan-resource');
        titleParts.push(`Initials not in team-resources.json: ${orfane.join(', ')}`);
        const badge = document.createElement('span');
        badge.className = 'badge-orphan badge-orphan-resource';
        badge.textContent = '!';
        div.appendChild(badge);
      }

      if (!weekCompleted) {
        const sovrallocate = entry.resources.filter(
          (s) => MP.overallocation.findAllocations(allocationIndex, s, settimana).length > 1
        );
        if (sovrallocate.length) {
          div.classList.add('overallocated');
          const dettagli = sovrallocate.map((s) => {
            const altri = MP.overallocation
              .findAllocations(allocationIndex, s, settimana)
              .filter((r) => r.taskRef !== task)
              .map((r) => `${r.projectName} / BL ${r.baselineVersion} / ${r.taskName}`)
              .join('; ');
            return `${s} → ${altri}`;
          });
          titleParts.push(`Overallocated this week:\n${dettagli.join('\n')}`);
        }

        const daRegolarizzare = entry.team
          ? entry.resources.filter((s) => initialsTeamMap.has(s) && initialsTeamMap.get(s) !== entry.team)
          : [];
        if (daRegolarizzare.length) {
          div.classList.add('team-mismatch');
          titleParts.push(`Team to regularize: ${daRegolarizzare.join(', ')} no longer belongs to team "${entry.team}"`);
          const badge = document.createElement('span');
          badge.className = 'badge-orphan badge-mismatch';
          badge.textContent = '⚠';
          div.appendChild(badge);
        }
      }
    }

    if (titleParts.length) div.title = titleParts.join(' — ');

    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const weeks = MP.cellSelection.getRangeForAction({ file, task, settimana, div });
      onCellContextMenu({ state, file, task, baseline, weeks, anchorEl: div });
    });

    registerCell(task, settimana, div);
    return div;
  }

  MP.ganttCell = { renderWeekCell, getCellDiv };
})(window.MP = window.MP || {});
