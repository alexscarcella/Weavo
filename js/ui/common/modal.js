// Dialoghi bloccanti (a differenza dei toast/avvisi non bloccanti). Per ora
// usato solo per il conflitto di salvataggio (§6.4 spec): rilettura del file
// appena prima di scrivere, e se il contenuto è cambiato rispetto a quanto
// caricato in sessione, avviso con richiesta di conferma prima di sovrascrivere.
(function (MP) {
  'use strict';

  function confirmConflict({ label, path }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const box = document.createElement('div');
      box.className = 'modal-box';
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

  MP.modal = { confirmConflict };
})(window.MP = window.MP || {});
