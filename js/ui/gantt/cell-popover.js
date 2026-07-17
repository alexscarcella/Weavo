// Popover di editing per una cella settimana×task, o per un range di settimane
// selezionato sulla stessa riga (vedi cell-selection.js): prima si sceglie il
// team, poi si selezionano multiple risorse (solo tra quelle di quel team),
// poi l'eventuale flag milestone (solo modalità singola cella — un range
// applica solo team+risorse, la milestone resta un concetto per singola
// settimana). Salvataggio automatico alla chiusura (nessun bottone "salva"
// separato), con avviso non bloccante su doppia allocazione.
(function (MP) {
  'use strict';

  const { buildAllocationIndex, findAllocations } = MP.overallocation;
  const { createWeekEntry } = MP.schema;
  const { formatWeekLabel } = MP.weekUtils;

  let activeContext = null;

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
    if (ctx) ctx.save();
  }

  function positionPopover(pop, anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    pop.style.position = 'fixed';
    const top = Math.min(rect.bottom + 4, window.innerHeight - 280);
    const left = Math.min(rect.left, window.innerWidth - 280);
    pop.style.top = `${Math.max(8, top)}px`;
    pop.style.left = `${Math.max(8, left)}px`;
  }

  // `weeksRange` (opzionale): array di iso settimana quando il popover è
  // aperto su un range multi-cella (vedi cell-selection.js) invece che sulla
  // singola `settimana`. In quel caso i valori iniziali vengono presi dalla
  // prima settimana del range ("cella ancora") e propagati identici a tutte
  // le settimane del range al salvataggio — la milestone resta esclusa.
  function openPopover({ anchorEl, dataset, task, settimana, weeksRange, onSave }) {
    closeExisting();

    const weeks = weeksRange && weeksRange.length ? weeksRange : [settimana];
    const isBulk = weeks.length > 1;
    const anchorWeek = weeks[0];

    const entry = (task.settimane || {})[anchorWeek] || {};
    let selectedTeam = entry.team || '';
    const selectedRisorse = new Set(entry.risorse || []);
    let selectedMilestone = entry.milestone === true;

    const index = buildAllocationIndex(dataset);

    const pop = document.createElement('div');
    pop.className = 'cell-popover';

    const teamOptions = dataset.teamRisorsa.team
      .map((t) => `<option value="${t.codice}" ${t.codice === selectedTeam ? 'selected' : ''}>${t.nome}</option>`)
      .join('');

    const altreDiverse = isBulk
      ? weeks.slice(1).filter((w) => {
          const e = (task.settimane || {})[w];
          const vuota = !e || (!e.team && !(e.risorse || []).length && !e.milestone);
          return !vuota && JSON.stringify({ team: e.team, risorse: e.risorse || [] }) !== JSON.stringify({ team: entry.team, risorse: entry.risorse || [] });
        }).length
      : 0;

    pop.innerHTML = `
      ${isBulk ? `<p class="popover-bulk-hint">Allocazione su ${weeks.length} settimane, dal ${formatWeekLabel(weeks[0])}
        al ${formatWeekLabel(weeks[weeks.length - 1])}${altreDiverse ? ` — sovrascrive ${altreDiverse} settimane con dati diversi` : ''}.</p>` : ''}
      <div class="popover-field">
        <label>Team</label>
        <select class="popover-team">
          <option value="">— nessuno —</option>
          ${teamOptions}
        </select>
      </div>
      <div class="popover-field">
        <label>Risorse</label>
        <div class="popover-risorse-list"></div>
      </div>
      ${isBulk ? '' : `<div class="popover-field popover-milestone-field">
        <label><input type="checkbox" class="popover-milestone" ${selectedMilestone ? 'checked' : ''}> Milestone di consegna</label>
      </div>`}
      <div class="popover-conflicts"></div>
      <p class="hint popover-hint">Chiudi (clic fuori o Esc) per salvare.</p>
    `;

    document.body.appendChild(pop);
    positionPopover(pop, anchorEl);

    const risorseListEl = pop.querySelector('.popover-risorse-list');
    const conflictsEl = pop.querySelector('.popover-conflicts');

    function refreshConflicts() {
      const righe = [];
      for (const sigla of selectedRisorse) {
        for (const w of weeks) {
          const refs = findAllocations(index, sigla, w).filter((r) => r.taskRef !== task);
          for (const ref of refs) {
            const settimanaLabel = isBulk ? ` (${formatWeekLabel(w)})` : '';
            righe.push(`<strong>${sigla}</strong>${settimanaLabel} già allocata su ${ref.progettoNome} / BL ${ref.baselineVersione} / ${ref.taskNome}`);
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
    function renderRisorseList() {
      const team = MP.schema.findTeamByCodice(dataset.teamRisorsa, selectedTeam);
      if (!team) {
        risorseListEl.innerHTML = '<span class="hint">Seleziona un team per scegliere le risorse.</span>';
        return;
      }
      for (const sigla of [...selectedRisorse]) {
        if (!team.risorse.some((r) => r.sigla === sigla)) selectedRisorse.delete(sigla);
      }
      risorseListEl.innerHTML = team.risorse.length
        ? team.risorse.map((r) => `
            <label class="popover-risorsa">
              <input type="checkbox" value="${r.sigla}" ${selectedRisorse.has(r.sigla) ? 'checked' : ''}>
              <span>${r.sigla} — ${r.nome}</span>
            </label>`).join('')
        : '<span class="hint">Nessuna risorsa in questo team.</span>';
      risorseListEl.querySelectorAll('.popover-risorsa input').forEach((cb) => {
        cb.addEventListener('change', (e) => {
          if (e.target.checked) selectedRisorse.add(e.target.value);
          else selectedRisorse.delete(e.target.value);
          refreshConflicts();
        });
      });
    }

    pop.querySelector('.popover-team').addEventListener('change', (e) => {
      selectedTeam = e.target.value;
      renderRisorseList();
      refreshConflicts();
    });
    const milestoneCheckbox = pop.querySelector('.popover-milestone');
    if (milestoneCheckbox) {
      milestoneCheckbox.addEventListener('change', (e) => {
        selectedMilestone = e.target.checked;
      });
    }

    renderRisorseList();
    refreshConflicts();

    activeContext = {
      save() {
        const newEntry = createWeekEntry({
          team: selectedTeam,
          risorse: [...selectedRisorse],
          milestone: isBulk ? false : selectedMilestone,
        });
        onSave(newEntry);
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

  MP.cellPopover = { openPopover, closeExisting };
})(window.MP = window.MP || {});
