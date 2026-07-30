const path = require('path');

// I file in js/ sono script classici IIFE che si agganciano a window.MP.* (niente
// import/export, vedi CLAUDE.md "Hard constraints"). require() li fa girare come script:
// basta che `window` esista come globale prima del require, cosi' l'IIFE trova dove attaccarsi.
function loadMP(relativePath) {
  global.window = global.window || {};
  global.window.MP = global.window.MP || {};
  require(path.join(__dirname, '..', '..', relativePath));
  return global.window.MP;
}

module.exports = { loadMP };
