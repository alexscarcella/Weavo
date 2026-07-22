// Header di brand statico, presente su ogni schermata (renderizzato una sola
// volta all'avvio in app.js, fuori dal ciclo di render legato allo stato: il
// suo contenuto non dipende mai da state). Nessuna logica applicativa qui.
(function (MP) {
  'use strict';

  const APP_VERSION = 'v1.3.2';
  const APP_COPYRIGHT = '© 2026 Weavo';

  const LOGO_SVG = `
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#eaf2ff"/>
      <path d="M6 10 L11 22 L16 12 L21 22 L26 10" stroke="#4a5768" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>
      <path d="M6 14 L11 26 L16 16 L21 26 L26 14" stroke="#2E86FF" stroke-width="3"
        stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  function renderHeader() {
    const header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
      <div class="app-header-brand">
        ${LOGO_SVG}
        <span class="app-header-title">Weavo</span>
        <span class="app-header-version">${APP_VERSION}</span>
      </div>
      <div class="app-header-copyright">${APP_COPYRIGHT}</div>`;
    return header;
  }

  MP.appHeader = { renderHeader };
})(window.MP = window.MP || {});
