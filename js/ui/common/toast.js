// Notifiche non bloccanti (conferme, avvisi) che scompaiono da sole — usate
// per la conferma sintetica del Backup e altri esiti non critici.
(function (MP) {
  'use strict';

  function showToast(message, { duration = 4000, kind = 'info' } = {}) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${kind}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
    return toast;
  }

  MP.toast = { showToast };
})(window.MP = window.MP || {});
