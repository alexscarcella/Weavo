// Dialoghi bloccanti (a differenza dei toast/avvisi non bloccanti). Usato per
// il conflitto di salvataggio (§6.4 spec: rilettura del file appena prima di
// scrivere, e se il contenuto è cambiato rispetto a quanto caricato in
// sessione, avviso con richiesta di conferma prima di sovrascrivere) e per
// promptText, un editor di testo libero (a differenza di window.prompt
// supporta multiline) usato ad es. per i riferimenti/team di progetto.
(function (MP) {
  'use strict';

  function confirmConflict({ label, path, diffLines = [] }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box modal-box-wide modal-conflict';
      const diffHtml = diffLines.length > 0
        ? `<p>What changed on disk:</p><ul class="modal-conflict-diff">${diffLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
        : '';
      box.innerHTML = `
        <h2>Save conflict</h2>
        <p>The file <code>${path}</code> (${label}) has been modified on disk since it was
        loaded in this session — probably another user saved it in the meantime.</p>
        ${diffHtml}
        <p>You can overwrite it with your changes (the other user's changes will be lost),
        or cancel: your changes stay only in this window until you retry or
        reload the app to see the latest version.</p>
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Cancel</button>
          <button type="button" class="modal-btn-overwrite">Overwrite anyway</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      box.querySelector('.modal-btn-cancel').addEventListener('click', () => {
        overlay.remove();
        resolve(false);
      });
      box.querySelector('.modal-btn-overwrite').addEventListener('click', () => {
        overlay.remove();
        resolve(true);
      });
    });
  }

  // Editor di testo libero generico (sostituisce window.prompt quando serve
  // multiline). Risolve con il testo inserito, o null se annullato.
  function promptText({ title, label, value = '', multiline = false, placeholder = '' } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box';
      const fieldId = 'modal-prompt-field';
      box.innerHTML = `
        <h2>${title}</h2>
        ${label ? `<label class="modal-field-label" for="${fieldId}">${label}</label>` : ''}
        ${multiline
          ? `<textarea id="${fieldId}" class="modal-textarea" rows="4"></textarea>`
          : `<input type="text" id="${fieldId}" class="modal-input">`}
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Cancel</button>
          <button type="button" class="modal-btn-save">Save</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const field = box.querySelector(`#${fieldId}`);
      field.value = value;
      if (placeholder) field.placeholder = placeholder;
      field.focus();
      field.select();

      const close = (result) => {
        overlay.remove();
        resolve(result);
      };
      box.querySelector('.modal-btn-cancel').addEventListener('click', () => close(null));
      box.querySelector('.modal-btn-save').addEventListener('click', () => close(field.value));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
      field.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(null);
        else if (e.key === 'Enter' && !multiline) close(field.value);
      });
    });
  }

  // Conferma con riepilogo di sola lettura: mostra un testo pre-selezionato e copiabile
  // (textarea readonly) prima di un'azione distruttiva, richiedendo comunque un click esplicito
  // di conferma (chiudere/Escape/click fuori equivalgono ad annullare) — a differenza di
  // promptText non è editabile e risolve con l'esito della scelta (bool), non col testo.
  function confirmWithReport({ title, message = '', reportText = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = `modal-box modal-box-wide${danger ? ' modal-danger-confirm' : ''}`;
      box.innerHTML = `
        <h2>${escapeHtml(title)}</h2>
        ${message ? `<p>${escapeHtml(message)}</p>` : ''}
        <textarea class="modal-textarea" rows="12" readonly></textarea>
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">${escapeHtml(cancelLabel)}</button>
          <button type="button" class="modal-btn-save">${escapeHtml(confirmLabel)}</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const field = box.querySelector('textarea');
      field.value = reportText;
      field.focus();
      field.select();

      const close = (result) => {
        overlay.remove();
        resolve(result);
      };
      box.querySelector('.modal-btn-cancel').addEventListener('click', () => close(false));
      box.querySelector('.modal-btn-save').addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(false);
      });
    });
  }

  // Editor a scelta singola tra opzioni fisse (select), al posto di window.prompt a testo
  // libero — usato ad es. per scegliere il team di destinazione nello spostamento di una
  // risorsa. Risolve col value selezionato, o null se annullato.
  function promptSelect({ title, label = '', options, value = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel' } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box';
      const fieldId = 'modal-select-field';
      const opts = options.map((o) => `<option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`).join('');
      box.innerHTML = `
        <h2>${escapeHtml(title)}</h2>
        ${label ? `<label class="modal-field-label" for="${fieldId}">${escapeHtml(label)}</label>` : ''}
        <select id="${fieldId}" class="modal-select">${opts}</select>
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">${escapeHtml(cancelLabel)}</button>
          <button type="button" class="modal-btn-save">${escapeHtml(confirmLabel)}</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const field = box.querySelector(`#${fieldId}`);
      if (value) field.value = value;
      field.focus();

      const close = (result) => {
        overlay.remove();
        resolve(result);
      };
      box.querySelector('.modal-btn-cancel').addEventListener('click', () => close(null));
      box.querySelector('.modal-btn-save').addEventListener('click', () => close(field.value));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(null);
      });
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Form strutturato per i referenti di progetto (§ CLAUDE.md "Data model" > projects).
  // Se `name` è una stringa (anche vuota) mostra in cima un campo nome obbligatorio (caso
  // creazione progetto); se `name` è null il form modifica solo i referenti di un progetto
  // esistente. Risolve con `{ name?, referents: {...} } | null` (null se annullato).
  function promptProjectForm({ title, name = null, referents, teamResources }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box modal-box-wide';

      const resourceOptions = () => {
        const groups = teamResources.teams.map((t) => {
          const opts = (t.resources || [])
            .map((r) => `<option value="${escapeHtml(r.initials)}">${escapeHtml(r.initials)} — ${escapeHtml(r.name)}</option>`)
            .join('');
          return opts ? `<optgroup label="${escapeHtml(t.name)}">${opts}</optgroup>` : '';
        }).join('');
        return `<option value="">— None —</option>${groups}`;
      };

      box.innerHTML = `
        <h2>${escapeHtml(title)}</h2>
        ${name !== null ? `
        <label class="modal-field-label" for="mpf-name">Project name</label>
        <input type="text" id="mpf-name" class="modal-input" required>` : ''}
        <label class="modal-field-label" for="mpf-pm">Project manager</label>
        <input type="text" id="mpf-pm" class="modal-input">
        <label class="modal-field-label" for="mpf-pe">Project Engineer</label>
        <input type="text" id="mpf-pe" class="modal-input">
        <label class="modal-field-label" for="mpf-sa">Solution analyst reference</label>
        <select id="mpf-sa" class="modal-select">${resourceOptions()}</select>
        <label class="modal-field-label" for="mpf-vv">V&amp;V reference</label>
        <select id="mpf-vv" class="modal-select">${resourceOptions()}</select>
        <label class="modal-field-label" for="mpf-note">Notes</label>
        <textarea id="mpf-note" class="modal-textarea" rows="3"></textarea>
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Cancel</button>
          <button type="button" class="modal-btn-save">Save</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const nameField = name !== null ? box.querySelector('#mpf-name') : null;
      const pmField = box.querySelector('#mpf-pm');
      const peField = box.querySelector('#mpf-pe');
      const saField = box.querySelector('#mpf-sa');
      const vvField = box.querySelector('#mpf-vv');
      const noteField = box.querySelector('#mpf-note');

      if (nameField) nameField.value = name;
      pmField.value = referents.projectManager || '';
      peField.value = referents.projectEngineer || '';
      saField.value = referents.solutionAnalyst || '';
      vvField.value = referents.vvReference || '';
      noteField.value = referents.note || '';
      (nameField || pmField).focus();

      const close = (result) => {
        overlay.remove();
        resolve(result);
      };
      const save = () => {
        if (nameField && !nameField.value.trim()) {
          nameField.reportValidity();
          return;
        }
        const result = {
          referents: MP.schema.createProjectReferents({
            projectManager: pmField.value.trim(),
            projectEngineer: peField.value.trim(),
            solutionAnalyst: saField.value,
            vvReference: vvField.value,
            note: noteField.value.trim(),
          }),
        };
        if (nameField) result.name = nameField.value.trim();
        close(result);
      };
      box.querySelector('.modal-btn-cancel').addEventListener('click', () => close(null));
      box.querySelector('.modal-btn-save').addEventListener('click', save);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(null);
      });
    });
  }

  // Scheda di sola lettura con i dati completi di un progetto (icona "i" nella riga Gantt).
  // Per modificare si usa "Team di progetto…" nel menu ⋮ (promptProjectForm) — nessun bottone
  // "Modifica" qui, per non duplicare l'azione di scrittura in due punti.
  function showProjectCard({ progetto, teamResources }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box modal-box-wide project-card';

      const resolveRef = (initials) => {
        if (!initials) return '—';
        const found = MP.schema.findResourceEntry(teamResources, initials);
        return found
          ? `${escapeHtml(initials)} — ${escapeHtml(found.resource.name)}`
          : `${escapeHtml(initials)} <span class="project-card-orphan" title="Resource not found in team-resources.json">(not found)</span>`;
      };
      const totTask = progetto.baseline.reduce((sum, b) => sum + b.task.length, 0);
      const referents = progetto.referents || {};
      const row = (label, valueHtml) =>
        `<div class="project-card-row"><span class="project-card-label">${escapeHtml(label)}</span><span class="project-card-value">${valueHtml || '—'}</span></div>`;

      box.innerHTML = `
        <h2>${escapeHtml(progetto.name)}</h2>
        ${row('Status', progetto.completed ? 'Completed' : 'Active')}
        ${row('Baseline', `${progetto.baseline.length} (${totTask} tasks total)`)}
        ${row('Project manager', escapeHtml(referents.projectManager))}
        ${row('Project Engineer', escapeHtml(referents.projectEngineer))}
        ${row('Solution analyst reference', resolveRef(referents.solutionAnalyst))}
        ${row('V&V reference', resolveRef(referents.vvReference))}
        ${row('Notes', referents.note ? escapeHtml(referents.note).replace(/\n/g, '<br>') : '')}
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Close</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const close = () => {
        overlay.remove();
        resolve();
      };
      box.querySelector('.modal-btn-cancel').addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });
    });
  }

  // Icona "copy" (due rettangoli sovrapposti), stroke-only cosicché erediti il colore via
  // currentColor/CSS invece di un'emoji — usata dal bottone di copia del popover allocazioni
  // risorsa sotto.
  const COPY_ICON_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';

  function formatWeekRange(r) {
    const formatWeek = MP.weekUtils.formatWeekLabel;
    return r.firstWeek === r.lastWeek ? formatWeek(r.firstWeek) : `${formatWeek(r.firstWeek)} – ${formatWeek(r.lastWeek)}`;
  }

  function formatMonthLabel(monthKey) {
    return new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  // Le righe di ciascuna sezione arrivano già ordinate cronologicamente da
  // MP.validation.group*TaskAllocations, quindi le righe dello stesso mese (calcolato sulla
  // firstWeek, lo stesso campo usato per l'ordinamento) sono sempre contigue — un semplice
  // "apri un nuovo gruppo quando cambia il mese" basta, nessun bisogno di raggruppare/riordinare.
  function groupRowsByMonth(rows) {
    const groups = [];
    for (const r of rows) {
      const monthKey = r.firstWeek.slice(0, 7);
      const last = groups[groups.length - 1];
      if (last && last.monthKey === monthKey) last.rows.push(r);
      else groups.push({ monthKey, rows: [r] });
    }
    return groups;
  }

  function formatRowText(r) {
    return `${formatWeekRange(r)} — ${r.progetto} / BL ${r.baseline} / ${r.task} — ${r.weekCount} wk`;
  }

  // Segmento "progetto / BL / task — N wk" con il progetto in grassetto, condiviso dalle righe
  // del popover e dal frammento HTML copiato negli appunti (vedi sotto) — la data resta fuori,
  // renderizzata a parte da ciascun chiamante (colonna propria nel popover, stesso testo inline
  // nella lista copiata).
  function formatRowBodyHtml(r) {
    return `<strong>${escapeHtml(r.progetto)}</strong> / BL ${escapeHtml(r.baseline)} / ${escapeHtml(r.task)} — ${r.weekCount} wk`;
  }

  // Testo semplice (per client senza supporto a ClipboardItem) e un frammento HTML equivalente
  // (intestazioni mese + elenco puntato, progetto in grassetto) per lo stesso contenuto,
  // raggruppato per anno/mese come il popover, cosicché incollando in Word/Outlook si ottenga
  // una lista formattata invece di una singola riga di testo piatto — vedi
  // copyAllocationsToClipboard sotto.
  function buildAllocationsText(heading, upcoming, past) {
    const section = (title, rows) => {
      if (rows.length === 0) return `${title}\nNone.`;
      const body = groupRowsByMonth(rows)
        .map((g) => `${formatMonthLabel(g.monthKey)}\n${g.rows.map((r) => `- ${formatRowText(r)}`).join('\n')}`)
        .join('\n\n');
      return `${title}\n${body}`;
    };
    return `${heading}\n\n${section('Upcoming tasks', upcoming)}\n\n${section('Past tasks', past)}`;
  }

  function buildAllocationsHtml(heading, upcoming, past) {
    const section = (title, rows) => {
      if (rows.length === 0) return `<h4>${escapeHtml(title)}</h4><p>None.</p>`;
      const body = groupRowsByMonth(rows)
        .map((g) => `<h5>${escapeHtml(formatMonthLabel(g.monthKey))}</h5><ul>${g.rows.map((r) => `<li>${formatWeekRange(r)} — ${formatRowBodyHtml(r)}</li>`).join('')}</ul>`)
        .join('');
      return `<h4>${escapeHtml(title)}</h4>${body}`;
    };
    return `<div><h3>${escapeHtml(heading)}</h3>${section('Upcoming tasks', upcoming)}${section('Past tasks', past)}</div>`;
  }

  async function copyAllocationsToClipboard(heading, upcoming, past) {
    const text = buildAllocationsText(heading, upcoming, past);
    try {
      if (window.ClipboardItem) {
        const html = buildAllocationsHtml(heading, upcoming, past);
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      MP.toast.showToast('Task list copied to clipboard', { kind: 'success' });
    } catch (e) {
      MP.toast.showToast(`Copy failed: ${e.message}`, { kind: 'error', duration: 6000 });
    }
  }

  // Scheda di sola lettura con task non completed già raggruppati/ordinati in "Upcoming"/"Past"
  // (MP.validation.groupResourceTaskAllocations per una risorsa, groupTeamTaskAllocations per un
  // intero team) — questo modulo si limita a formattarli, condivisa da showResourceAllocations e
  // showTeamAllocations sotto. Il bottone 📋 copia lo stesso contenuto (testo + HTML) via
  // navigator.clipboard.write, per incollarlo formattato in una mail o in un documento Word.
  function renderAllocationsCard(heading, upcoming, past) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box modal-box-wide project-card allocations-card';

      const rowHtml = (r) =>
        `<div class="project-card-row"><span class="project-card-label">${formatWeekRange(r)}</span><span class="project-card-value">${formatRowBodyHtml(r)}</span></div>`;
      const section = (title, rows) => {
        if (rows.length === 0) return `<h3>${escapeHtml(title)}</h3><p class="hint">None.</p>`;
        const body = groupRowsByMonth(rows)
          .map((g) => `<h4 class="allocations-month">${escapeHtml(formatMonthLabel(g.monthKey))}</h4>${g.rows.map(rowHtml).join('')}`)
          .join('');
        return `<h3>${escapeHtml(title)}</h3>${body}`;
      };

      const nothingToCopy = upcoming.length === 0 && past.length === 0;
      box.innerHTML = `
        <div class="modal-copy-header">
          <h2>${escapeHtml(heading)}</h2>
          <button type="button" class="modal-copy-icon-btn" title="Copy list to clipboard"${nothingToCopy ? ' disabled' : ''}>${COPY_ICON_SVG}</button>
        </div>
        ${section('Upcoming tasks', upcoming)}
        ${section('Past tasks', past)}
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Close</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      box.querySelector('.modal-copy-icon-btn').addEventListener('click', () => copyAllocationsToClipboard(heading, upcoming, past));

      const close = () => {
        overlay.remove();
        resolve();
      };
      box.querySelector('.modal-btn-cancel').addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });
    });
  }

  function showResourceAllocations({ risorsa, upcoming, past }) {
    return renderAllocationsCard(`${risorsa.name} (${risorsa.initials})`, upcoming, past);
  }

  function showTeamAllocations({ team, upcoming, past }) {
    return renderAllocationsCard(`${team.name} — team tasks`, upcoming, past);
  }

  function formatReadableDate(iso) {
    return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatMilestoneLine(row) {
    let line = `${formatReadableDate(row.displayDate)} — ${row.progettoName} — ${row.baselineVersion}`;
    if (row.inconsistent && row.otherDates.length > 0) {
      line += ` (other dates: ${row.otherDates.map(formatReadableDate).join(', ')})`;
    }
    return line;
  }

  function buildMilestoneClipboardText(monthGroups) {
    return monthGroups
      .map((group) => `${formatMonthLabel(group.monthKey)}\n${group.rows.map((row) => `- ${formatMilestoneLine(row)}`).join('\n')}`)
      .join('\n\n');
  }

  async function copyMilestoneListToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      MP.toast.showToast('Milestone list copied to clipboard', { kind: 'success' });
    } catch (e) {
      MP.toast.showToast(`Copy failed: ${e.message}`, { kind: 'error', duration: 6000 });
    }
  }

  // Scheda di sola lettura con le sole milestone future raggruppate per mese
  // (MP.milestones.computeUpcomingMilestonesByMonth) — stesso schema di
  // renderAllocationsCard sopra (header con icona copia + bottone Close),
  // usata dalla pagina Milestones al posto del vecchio blocco fisso in pagina.
  function renderMilestoneListCard(monthGroups) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box modal-box-wide milestone-list-card';

      const body = monthGroups.length === 0
        ? '<p class="hint">No upcoming milestones.</p>'
        : monthGroups
            .map((group) => `<h4 class="milestone-list-month">${escapeHtml(formatMonthLabel(group.monthKey))}</h4><ul class="milestone-list-items">${group.rows.map((row) => `<li>${escapeHtml(formatMilestoneLine(row))}</li>`).join('')}</ul>`)
            .join('');

      box.innerHTML = `
        <div class="modal-copy-header">
          <h2>Upcoming milestones</h2>
          <button type="button" class="modal-copy-icon-btn" title="Copy list to clipboard"${monthGroups.length === 0 ? ' disabled' : ''}>${COPY_ICON_SVG}</button>
        </div>
        ${body}
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Close</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      box.querySelector('.modal-copy-icon-btn').addEventListener('click', () => copyMilestoneListToClipboard(buildMilestoneClipboardText(monthGroups)));

      const close = () => {
        overlay.remove();
        resolve();
      };
      box.querySelector('.modal-btn-cancel').addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });
      box.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close();
      });
    });
  }

  function showMilestoneList(monthGroups) {
    return renderMilestoneListCard(monthGroups);
  }

  // Guida sintetica alle interazioni del gantt (bottone "?" nella top-bar,
  // vedi toolbar.js) — contenuto statico, nessun dato utente da sanificare.
  // Non risolve nulla (a differenza degli altri dialoghi): serve solo a
  // mostrare/nascondere il pannello, niente input da riportare al chiamante.
  function showHelpGuide() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const box = document.createElement('div');
    box.className = 'modal-box modal-box-wide help-guide';
    box.innerHTML = `
      <h2>How to use the Gantt</h2>

      <h3>Selecting a cell or a range</h3>
      <ul>
        <li><strong>Click</strong> a week cell to select just that one. To select
        several adjacent weeks on the same row, <strong>Shift+click</strong> another
        cell on that row — clicking just selects/highlights, it doesn't open
        anything by itself.</li>
      </ul>

      <h3>Editing an allocation</h3>
      <ul>
        <li><strong>Right-click</strong> the selected cell (or range) to open the
        editor below it: pick a team, then the resources (only from that team),
        then — single cell only — the delivery milestone flag. For a range, the
        same team and resources are applied to every selected week in one go.</li>
        <li>Closing the editor (click outside or <kbd>Esc</kbd>) saves automatically —
        there's no separate "Save" button.</li>
      </ul>

      <h3>Clearing an allocation</h3>
      <ul>
        <li>Open the editor and deselect all resources (or set the team back to
        "— none —"), then close it — the week is cleared.</li>
      </ul>

      <h3>Shifting an allocation by one week</h3>
      <ul>
        <li>Right-clicking a cell (or range) that already has an allocation also
        opens a shift menu <strong>above</strong> it, at the same time as the editor
        below — "shift one week back/forward". The menu's top line shows how many
        weeks are selected.</li>
        <li>Shifting keeps each cell's own content (it's a separate action from
        editing, never routed through the editor's save) — if you were mid-edit in
        the editor below, clicking a shift action saves that edit first, then
        shifts.</li>
        <li>Shifting is blocked (with a tooltip explaining why) when the destination
        already has an allocation, the task is completed, or you'd go past the
        first/last week of the sheet.</li>
      </ul>

      <h3>Delivery milestones</h3>
      <ul>
        <li>All tasks in the same baseline share one milestone week — setting it on
        one task's cell applies it to the others automatically.</li>
      </ul>

      <h3>Rows: rename, reorder, delete…</h3>
      <ul>
        <li>The <strong>⋮</strong> menu on a project/baseline/task row name covers
        renaming, reordering, and deleting.</li>
        <li>The checkbox next to a project/baseline/task name marks it as completed.
        For a task this happens immediately — completed tasks are excluded from
        overallocation checks and are never touched automatically by team/resource
        changes. For a project or baseline, checking the box asks for confirmation
        first, since it hides the whole project/baseline block by default;
        unchecking it needs no confirmation.</li>
      </ul>

      <h3>Warnings on cells</h3>
      <ul>
        <li>A colored badge or dashed outline on a cell flags an issue — hover it for
        details: an unknown team/resource, a resource allocated elsewhere the same
        week, or a resource that changed team since it was allocated here.</li>
      </ul>

      <div class="modal-actions">
        <button type="button" class="modal-btn-cancel">Close</button>
      </div>`;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    box.querySelector('.modal-btn-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  const HEX_RE = /^#[0-9a-fA-F]{6}$/;

  // Selezione colore via color-picker nativo (input type="color"), con campo
  // testo esadecimale sincronizzato per chi vuole incollare/leggere il valore
  // esatto. Risolve con l'esadecimale scelto, o null se annullato.
  function promptColor({ title, value = '#2E86FF' } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box';
      const initial = HEX_RE.test(value) ? value : '#2E86FF';
      box.innerHTML = `
        <h2>${title}</h2>
        <div class="modal-color-row">
          <input type="color" class="modal-color-swatch" value="${initial}">
          <input type="text" class="modal-input modal-color-hex" value="${initial}" maxlength="7">
        </div>
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Cancel</button>
          <button type="button" class="modal-btn-save">Save</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const swatchInput = box.querySelector('.modal-color-swatch');
      const hexInput = box.querySelector('.modal-color-hex');

      swatchInput.addEventListener('input', () => {
        hexInput.value = swatchInput.value;
      });
      hexInput.addEventListener('input', () => {
        if (HEX_RE.test(hexInput.value)) swatchInput.value = hexInput.value;
      });
      hexInput.focus();
      hexInput.select();

      const close = (result) => {
        overlay.remove();
        resolve(result);
      };
      box.querySelector('.modal-btn-cancel').addEventListener('click', () => close(null));
      box.querySelector('.modal-btn-save').addEventListener('click', () => {
        close(HEX_RE.test(hexInput.value) ? hexInput.value : swatchInput.value);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
      hexInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') close(null);
        else if (e.key === 'Enter') close(HEX_RE.test(hexInput.value) ? hexInput.value : swatchInput.value);
      });
    });
  }

  MP.modal = { confirmConflict, promptText, promptSelect, promptColor, promptProjectForm, showProjectCard, showResourceAllocations, showTeamAllocations, showMilestoneList, confirmWithReport, showHelpGuide };
})(window.MP = window.MP || {});
