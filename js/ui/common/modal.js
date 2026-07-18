// Dialoghi bloccanti (a differenza dei toast/avvisi non bloccanti). Usato per
// il conflitto di salvataggio (§6.4 spec: rilettura del file appena prima di
// scrivere, e se il contenuto è cambiato rispetto a quanto caricato in
// sessione, avviso con richiesta di conferma prima di sovrascrivere) e per
// promptText, un editor di testo libero (a differenza di window.prompt
// supporta multiline) usato ad es. per i riferimenti/team di progetto.
(function (MP) {
  'use strict';

  function confirmConflict({ label, path }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box modal-conflict';
      box.innerHTML = `
        <h2>Conflitto di salvataggio</h2>
        <p>Il file <code>${path}</code> (${label}) risulta modificato sul disco rispetto a quanto
        caricato in questa sessione — probabilmente un altro utente ha salvato nel frattempo.</p>
        <p>Puoi sovrascriverlo con le tue modifiche (quelle dell'altro utente andranno perse),
        oppure annullare: le tue modifiche restano solo in questa finestra finché non riprovi o
        ricarichi l'app per vedere la versione più recente.</p>
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Annulla</button>
          <button type="button" class="modal-btn-overwrite">Sovrascrivi comunque</button>
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
          <button type="button" class="modal-btn-cancel">Annulla</button>
          <button type="button" class="modal-btn-save">Salva</button>
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

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Form strutturato per i referenti/team di progetto (§ CLAUDE.md "Data model" > progetti).
  // Se `nome` è una stringa (anche vuota) mostra in cima un campo nome obbligatorio (caso
  // creazione progetto); se `nome` è null il form modifica solo i campi team di un progetto
  // esistente. Risolve con `{ nome?, team: {...} } | null` (null se annullato).
  function promptProjectForm({ title, nome = null, team, teamRisorsa }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box modal-box-wide';

      const resourceOptions = () => {
        const groups = teamRisorsa.team.map((t) => {
          const opts = (t.risorse || [])
            .map((r) => `<option value="${escapeHtml(r.sigla)}">${escapeHtml(r.sigla)} — ${escapeHtml(r.nome)}</option>`)
            .join('');
          return opts ? `<optgroup label="${escapeHtml(t.nome)}">${opts}</optgroup>` : '';
        }).join('');
        return `<option value="">— Nessuno —</option>${groups}`;
      };

      box.innerHTML = `
        <h2>${escapeHtml(title)}</h2>
        ${nome !== null ? `
        <label class="modal-field-label" for="mpf-nome">Nome progetto</label>
        <input type="text" id="mpf-nome" class="modal-input" required>` : ''}
        <label class="modal-field-label" for="mpf-pm">Project manager</label>
        <input type="text" id="mpf-pm" class="modal-input">
        <label class="modal-field-label" for="mpf-pe">Project Engineer</label>
        <input type="text" id="mpf-pe" class="modal-input">
        <label class="modal-field-label" for="mpf-sa">Solution analyst reference</label>
        <select id="mpf-sa" class="modal-select">${resourceOptions()}</select>
        <label class="modal-field-label" for="mpf-vv">V&amp;V reference</label>
        <select id="mpf-vv" class="modal-select">${resourceOptions()}</select>
        <label class="modal-field-label" for="mpf-note">Note</label>
        <textarea id="mpf-note" class="modal-textarea" rows="3"></textarea>
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Annulla</button>
          <button type="button" class="modal-btn-save">Salva</button>
        </div>`;
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      const nomeField = nome !== null ? box.querySelector('#mpf-nome') : null;
      const pmField = box.querySelector('#mpf-pm');
      const peField = box.querySelector('#mpf-pe');
      const saField = box.querySelector('#mpf-sa');
      const vvField = box.querySelector('#mpf-vv');
      const noteField = box.querySelector('#mpf-note');

      if (nomeField) nomeField.value = nome;
      pmField.value = team.projectManager || '';
      peField.value = team.projectEngineer || '';
      saField.value = team.solutionAnalyst || '';
      vvField.value = team.vvReference || '';
      noteField.value = team.note || '';
      (nomeField || pmField).focus();

      const close = (result) => {
        overlay.remove();
        resolve(result);
      };
      const save = () => {
        if (nomeField && !nomeField.value.trim()) {
          nomeField.reportValidity();
          return;
        }
        const result = {
          team: MP.schema.createProjectTeamInfo({
            projectManager: pmField.value.trim(),
            projectEngineer: peField.value.trim(),
            solutionAnalyst: saField.value,
            vvReference: vvField.value,
            note: noteField.value.trim(),
          }),
        };
        if (nomeField) result.nome = nomeField.value.trim();
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
  function showProjectCard({ progetto, teamRisorsa }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box modal-box-wide project-card';

      const resolveRef = (sigla) => {
        if (!sigla) return '—';
        const found = MP.schema.findResourceEntry(teamRisorsa, sigla);
        return found
          ? `${escapeHtml(sigla)} — ${escapeHtml(found.risorsa.nome)}`
          : `${escapeHtml(sigla)} <span class="project-card-orphan" title="Risorsa non trovata in team-risorse.json">(non trovata)</span>`;
      };
      const totTask = progetto.baseline.reduce((sum, b) => sum + b.task.length, 0);
      const team = progetto.team || {};
      const row = (label, valueHtml) =>
        `<div class="project-card-row"><span class="project-card-label">${escapeHtml(label)}</span><span class="project-card-value">${valueHtml || '—'}</span></div>`;

      box.innerHTML = `
        <h2>${escapeHtml(progetto.nome)}</h2>
        ${row('Stato', progetto.archiviato ? 'Archiviato' : 'Attivo')}
        ${row('Baseline', `${progetto.baseline.length} (${totTask} task totali)`)}
        ${row('Project manager', escapeHtml(team.projectManager))}
        ${row('Project Engineer', escapeHtml(team.projectEngineer))}
        ${row('Solution analyst reference', resolveRef(team.solutionAnalyst))}
        ${row('V&V reference', resolveRef(team.vvReference))}
        ${row('Note', team.note ? escapeHtml(team.note).replace(/\n/g, '<br>') : '')}
        <div class="modal-actions">
          <button type="button" class="modal-btn-cancel">Chiudi</button>
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
          <button type="button" class="modal-btn-cancel">Annulla</button>
          <button type="button" class="modal-btn-save">Salva</button>
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

  MP.modal = { confirmConflict, promptText, promptColor, promptProjectForm, showProjectCard };
})(window.MP = window.MP || {});
