// Popover di editing per una cella settimana×task, o per un range di settimane
// selezionato sulla stessa riga (vedi cell-selection.js): prima si sceglie il
// team, poi si selezionano multiple risorse (solo tra quelle di quel team),
// poi l'eventuale tipo di milestone — None/Task deadline/Ready for UAT/UAT,
// solo modalità singola cella — un range applica solo team+resources, la
// milestone resta un concetto per singola settimana). Il blocco duro sul
// vincolo d'ordine delle 3 milestone (js/model/milestone-rules.js) avviene
// solo alla chiusura, in gantt-view.js:handleCellSaved — questo popover mostra
// solo un avviso informativo non bloccante quando un tipo condiviso
// (readyForUat/uat) aggiornerebbe anche altri task della baseline. Salvataggio
// automatico alla chiusura (nessun bottone "salva" separato), con avviso non
// bloccante anche su doppia allocazione. Aperto solo dal click destro
// (gantt-view.js:openCellContextMenu), mai dal click semplice — `whenIdle()`
// espone il salvataggio pendente in corso in modo che il menu di shift (che
// può apparire insieme, sopra questo popover) possa attendere che un'eventuale
// modifica non ancora salvata sia commessa prima di agire.
(function (MP) {
  'use strict';

  const { buildAllocationIndex, findAllocations } = MP.overallocation;
  const { createWeekEntry, MILESTONE_TYPES, MILESTONE_LABELS } = MP.schema;
  const { formatWeekLabel } = MP.weekUtils;

  let activeContext = null;

  // Promise dell'ultimo salvataggio commesso (o già risolta se nessuno è in
  // corso): esposta via `whenIdle()` per chi deve attendere che un eventuale
  // salvataggio pendente del popover sia completato prima di agire sugli
  // stessi dati (es. il menu di shift sopra il popover, vedi gantt-view.js).
  let pendingSave = Promise.resolve();

  function handleOutsideClick(e) {
    const pop = document.querySelector('.cell-popover');
    if (pop && !pop.contains(e.target)) commitAndClose();
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') commitAndClose();
  }

  function detachGlobalListeners() {
    document.removeEventListener('mousedown', handleOutsideClick, true);
    document.removeEventListener('keydown', handleKeydown, true);
  }

  function closeExisting() {
    const existing = document.querySelector('.cell-popover');
    if (existing) existing.remove();
    detachGlobalListeners();
    activeContext = null;
  }

  function commitAndClose() {
    const ctx = activeContext;
    closeExisting();
    if (ctx) pendingSave = Promise.resolve(ctx.save());
    return pendingSave;
  }

  function whenIdle() {
    return pendingSave;
  }

  // Posiziona il popover in modo che resti sempre interamente visibile,
  // qualunque sia la posizione della cella cliccata (bordo destro/sinistro/
  // alto/basso della viewport): misura le dimensioni reali del popover (già
  // nel DOM con tutto il contenuto quando questa funzione viene chiamata,
  // vedi openPopover) invece di assumere un'altezza/larghezza fissa, poi
  // sceglie sopra/sotto la cella in base a dove c'è più spazio e chiude ogni
  // coordinata dentro i margini della viewport.
  function positionPopover(pop, anchorEl) {
    const margin = 8;
    const rect = anchorEl.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const width = popRect.width;
    const height = popRect.height;

    pop.style.position = 'fixed';

    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    let top = (height <= spaceBelow || spaceBelow >= spaceAbove)
      ? rect.bottom + 4
      : rect.top - height - 4;
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

    let left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));

    pop.style.top = `${top}px`;
    pop.style.left = `${left}px`;
  }

  // `weeksRange` (opzionale): array di iso settimana quando il popover è
  // aperto su un range multi-cella (vedi cell-selection.js) invece che sulla
  // singola `settimana`. In quel caso i valori iniziali vengono presi dalla
  // prima settimana del range ("cella ancora") e propagati identici a tutte
  // le settimane del range al salvataggio — la milestone resta esclusa.
  function openPopover({ anchorEl, dataset, task, baseline, settimana, weeksRange, onSave }) {
    closeExisting();

    const weeks = weeksRange && weeksRange.length ? weeksRange : [settimana];
    const isBulk = weeks.length > 1;
    const anchorWeek = weeks[0];

    const entry = (task.weeks || {})[anchorWeek] || {};
    let selectedTeam = entry.team || '';
    const selectedResources = new Set(entry.resources || []);
    let selectedMilestoneType = entry.milestone || '';
    let selectedCompleted = entry.completed === true;
    // L'assegnazione di risorse è inibita sulla settimana dell'UAT (vedi
    // MP.schema.createWeekEntry) — difensivo, per un'eventuale entry preesistente
    // che la violasse (dati legacy): non precompilare team/resources in quel caso.
    if (selectedMilestoneType === MILESTONE_TYPES.UAT) {
      selectedTeam = '';
      selectedResources.clear();
    }

    const index = buildAllocationIndex(dataset);

    const pop = document.createElement('div');
    pop.className = 'cell-popover';

    // Colore di sfondo per riga (funziona in Chrome/Edge, gli unici browser target — vedi
    // CLAUDE.md) così il team si distingue anche solo scorrendo la lista, non solo dopo la
    // selezione. Applicato anche al controllo chiuso (vedi sotto), non solo alle opzioni.
    const teamOptions = dataset.teamResources.teams
      .map((t) => `<option value="${t.code}" style="background-color:${t.color}" ${t.code === selectedTeam ? 'selected' : ''}>${t.name}</option>`)
      .join('');

    const altreDiverse = isBulk
      ? weeks.slice(1).filter((w) => {
          const e = (task.weeks || {})[w];
          const vuota = !e || (!e.team && !(e.resources || []).length && !e.milestone && !e.completed);
          return !vuota && JSON.stringify({ team: e.team, resources: e.resources || [], completed: e.completed === true }) !== JSON.stringify({ team: entry.team, resources: entry.resources || [], completed: entry.completed === true });
        }).length
      : 0;

    pop.innerHTML = `
      ${isBulk ? `<p class="popover-bulk-hint">Allocation over ${weeks.length} weeks, from ${formatWeekLabel(weeks[0])}
        to ${formatWeekLabel(weeks[weeks.length - 1])}${altreDiverse ? ` — overwrites ${altreDiverse} weeks with different data` : ''}.</p>` : ''}
      <div class="popover-field popover-team-field">
        <label>Team</label>
        <select class="popover-team">
          <option value="">— none —</option>
          ${teamOptions}
        </select>
      </div>
      <div class="popover-field popover-resources-field">
        <label>Resources</label>
        <div class="popover-resources-list"></div>
      </div>
      <p class="hint popover-uat-hint">Resource assignment is disabled for a UAT week.</p>
      <div class="popover-field popover-completed-field">
        <label><input type="checkbox" class="popover-completed" ${selectedCompleted ? 'checked' : ''}> Completed</label>
      </div>
      ${isBulk ? '' : `<div class="popover-field popover-milestone-field">
        <label>Milestone</label>
        <label class="popover-milestone-option"><input type="radio" name="popover-milestone" value="" ${!selectedMilestoneType ? 'checked' : ''}> None</label>
        <label class="popover-milestone-option"><input type="radio" name="popover-milestone" value="${MILESTONE_TYPES.TASK_DEADLINE}" ${selectedMilestoneType === MILESTONE_TYPES.TASK_DEADLINE ? 'checked' : ''}> ${MILESTONE_LABELS.taskDeadline}</label>
        <label class="popover-milestone-option"><input type="radio" name="popover-milestone" value="${MILESTONE_TYPES.READY_FOR_UAT}" ${selectedMilestoneType === MILESTONE_TYPES.READY_FOR_UAT ? 'checked' : ''}> ${MILESTONE_LABELS.readyForUat}</label>
        <label class="popover-milestone-option"><input type="radio" name="popover-milestone" value="${MILESTONE_TYPES.UAT}" ${selectedMilestoneType === MILESTONE_TYPES.UAT ? 'checked' : ''}> ${MILESTONE_LABELS.uat}</label>
        <div class="popover-milestone-info"></div>
      </div>`}
      <div class="popover-conflicts"></div>
      <p class="hint popover-hint">Close (click outside or Esc) to save.</p>
    `;

    document.body.appendChild(pop);
    positionPopover(pop, anchorEl);

    const resourcesListEl = pop.querySelector('.popover-resources-list');
    const conflictsEl = pop.querySelector('.popover-conflicts');

    function refreshConflicts() {
      const righe = [];
      for (const initials of selectedResources) {
        for (const w of weeks) {
          const refs = findAllocations(index, initials, w).filter((r) => r.taskRef !== task);
          for (const ref of refs) {
            const settimanaLabel = isBulk ? ` (${formatWeekLabel(w)})` : '';
            righe.push(`<strong>${initials}</strong>${settimanaLabel} already allocated to ${ref.projectName} / BL ${ref.baselineVersion} / ${ref.taskName}`);
          }
        }
      }
      conflictsEl.innerHTML = righe.length
        ? `<div class="popover-warning">⚠ ${righe.join('<br>')}</div>`
        : '';
    }

    // L'elenco risorse dipende dal team scelto: una cella può contenere solo
    // risorse dello stesso team (§ una risorsa appartiene a un solo team).
    // Cambiando team, le risorse già selezionate che non appartengono più al
    // team scelto vengono deselezionate.
    function renderResourcesList() {
      const team = MP.schema.findTeamByCode(dataset.teamResources, selectedTeam);
      if (!team) {
        resourcesListEl.innerHTML = '<span class="hint">Select a team to choose resources.</span>';
        return;
      }
      for (const initials of [...selectedResources]) {
        if (!team.resources.some((r) => r.initials === initials)) selectedResources.delete(initials);
      }
      const resourcesOrdinate = [...team.resources].sort((a, b) => a.name.localeCompare(b.name));
      resourcesListEl.innerHTML = resourcesOrdinate.length
        ? resourcesOrdinate.map((r) => `
            <label class="popover-resource">
              <input type="checkbox" value="${r.initials}" ${selectedResources.has(r.initials) ? 'checked' : ''}>
              <span>${r.initials} — ${r.name}</span>
            </label>`).join('')
        : '<span class="hint">No resources in this team.</span>';
      resourcesListEl.querySelectorAll('.popover-resource input').forEach((cb) => {
        cb.addEventListener('change', (e) => {
          if (e.target.checked) selectedResources.add(e.target.value);
          else selectedResources.delete(e.target.value);
          refreshConflicts();
        });
      });
    }

    // Colora anche il controllo chiuso col colore del team scelto (non solo le opzioni
    // della tendina aperta), così il colore resta visibile senza dover riaprire il menu.
    const teamSelectEl = pop.querySelector('.popover-team');
    function syncTeamSelectColor() {
      const team = MP.schema.findTeamByCode(dataset.teamResources, selectedTeam);
      teamSelectEl.style.backgroundColor = team ? team.color : '';
    }
    teamSelectEl.addEventListener('change', (e) => {
      selectedTeam = e.target.value;
      syncTeamSelectColor();
      renderResourcesList();
      refreshConflicts();
    });
    syncTeamSelectColor();

    // L'assegnazione di risorse è inibita sulla settimana dell'UAT (vedi
    // MP.schema.createWeekEntry): quando questo tipo è selezionato, i campi
    // Team/Resources vengono disabilitati (non solo rifiutati al salvataggio)
    // così l'utente non può nemmeno provare a impostarli.
    const teamFieldEl = pop.querySelector('.popover-team-field');
    const resourcesFieldEl = pop.querySelector('.popover-resources-field');
    const uatHintEl = pop.querySelector('.popover-uat-hint');
    function updateAllocationAvailability() {
      const isUat = selectedMilestoneType === MILESTONE_TYPES.UAT;
      teamSelectEl.disabled = isUat;
      teamFieldEl.classList.toggle('popover-field-disabled', isUat);
      resourcesFieldEl.classList.toggle('popover-field-disabled', isUat);
      resourcesListEl.querySelectorAll('.popover-resource input').forEach((cb) => {
        cb.disabled = isUat;
      });
      uatHintEl.classList.toggle('popover-uat-hint-visible', isUat);
    }

    // Avviso informativo, MAI bloccante (il blocco vero e proprio sul vincolo
    // d'ordine avviene alla chiusura, in gantt-view.js:handleCellSaved — vedi
    // commento in testa al file): quando si sceglie un tipo condiviso
    // (readyForUat/uat), segnala quanti ALTRI task non completed della
    // baseline verranno aggiornati alla stessa settimana.
    const milestoneInfoEl = pop.querySelector('.popover-milestone-info');
    function refreshMilestoneInfo() {
      if (!milestoneInfoEl) return;
      const type = selectedMilestoneType;
      const isShared = type === MILESTONE_TYPES.READY_FOR_UAT || type === MILESTONE_TYPES.UAT;
      if (!baseline || !isShared) {
        milestoneInfoEl.innerHTML = '';
        return;
      }
      const otherTasks = baseline.task.filter((t) => t !== task && !t.completed);
      const count = otherTasks.filter((t) => MP.milestoneRules.collectTaskMilestoneDates(t)[type] !== anchorWeek).length;
      const parts = [];
      if (count > 0) {
        parts.push(`Setting this will also update ${count} other task${count > 1 ? 's' : ''} in this baseline to this week (${MILESTONE_LABELS[type]})`);
      }
      if (type === MILESTONE_TYPES.UAT) {
        const withAllocation = otherTasks.filter((t) => {
          const e = (t.weeks || {})[anchorWeek];
          return e && e.team && (e.resources || []).length;
        }).length;
        if (withAllocation > 0) {
          parts.push(`${withAllocation} of them currently ${withAllocation > 1 ? 'have' : 'has'} a resource allocation this week — it will be cleared, since resource assignment is disabled for a UAT week`);
        }
      }
      milestoneInfoEl.innerHTML = parts.length ? `<div class="popover-info">ℹ ${parts.join('; ')}.</div>` : '';
    }
    pop.querySelectorAll('input[name="popover-milestone"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        selectedMilestoneType = e.target.value;
        if (selectedMilestoneType === MILESTONE_TYPES.UAT) {
          selectedTeam = '';
          selectedResources.clear();
          syncTeamSelectColor();
          renderResourcesList();
          refreshConflicts();
        }
        updateAllocationAvailability();
        refreshMilestoneInfo();
      });
    });
    refreshMilestoneInfo();

    pop.querySelector('.popover-completed').addEventListener('change', (e) => {
      selectedCompleted = e.target.checked;
    });

    renderResourcesList();
    refreshConflicts();
    updateAllocationAvailability();

    activeContext = {
      save() {
        const newEntry = createWeekEntry({
          team: selectedTeam,
          resources: [...selectedResources],
          milestone: isBulk ? '' : selectedMilestoneType,
          completed: selectedCompleted,
        });
        return onSave(newEntry);
      },
    };

    // Il click che ha aperto il popover è lo stesso che, propagandosi, farebbe
    // scattare subito il listener di "click fuori": lo aggancio al giro
    // successivo dell'event loop.
    setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick, true);
      document.addEventListener('keydown', handleKeydown, true);
    }, 0);
  }

  MP.cellPopover = { openPopover, closeExisting, commitAndClose, whenIdle };
})(window.MP = window.MP || {});
