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
        ${row('Status', progetto.archived ? 'Archived' : 'Active')}
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

      <h3>Editing an allocation</h3>
      <ul>
        <li><strong>Double-click</strong> a week cell to open the editor: pick a team,
        then the resources (only from that team), then — single cell only — the
        delivery milestone flag.</li>
        <li>Closing the editor (click outside or <kbd>Esc</kbd>) saves automatically —
        there's no separate "Save" button.</li>
      </ul>

      <h3>Editing several weeks at once</h3>
      <ul>
        <li><strong>Click</strong> a cell to set a starting point, then
        <strong>Shift+click</strong> another cell on the same row to select the range
        between them — the editor applies the same team and resources to every
        selected week in one go.</li>
      </ul>

      <h3>Clearing an allocation</h3>
      <ul>
        <li>Open the editor and deselect all resources (or set the team back to
        "— none —"), then close it — the week is cleared.</li>
      </ul>

      <h3>Shifting an allocation by one week</h3>
      <ul>
        <li><strong>Right-click</strong> a cell to shift it one week back or forward —
        this is a separate action from editing, so it never overwrites what's in
        the cell.</li>
        <li>To shift several weeks together while keeping each cell's own content,
        first <strong>Ctrl+click</strong> two cells on the same row to select the
        range, then right-click inside it — the menu's top line shows how many
        weeks are currently selected, useful to confirm the selection went
        through.</li>
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
        renaming, reordering, archiving, and deleting.</li>
        <li>The checkbox next to a task name marks it as completed — completed tasks
        are excluded from overallocation checks and are never touched automatically
        by team/resource changes.</li>
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

  MP.modal = { confirmConflict, promptText, promptSelect, promptColor, promptProjectForm, showProjectCard, confirmWithReport, showHelpGuide };
})(window.MP = window.MP || {});
