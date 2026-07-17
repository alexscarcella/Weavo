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

  MP.modal = { confirmConflict, promptText, promptColor };
})(window.MP = window.MP || {});
