// Generazione slug kebab-case ASCII per i nomi file dei progetti (§8.3 spec:
// minuscolo, accenti/simboli/spazi -> "-", collisioni risolte con suffisso
// numerico -2, -3, ...).
(function (MP) {
  'use strict';

  var DIACRITICS_RE = /[̀-ͯ]/g;

  function slugify(text) {
    const base = text
      .normalize('NFD')
      .replace(DIACRITICS_RE, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || 'progetto';
  }

  function uniqueSlug(baseSlug, existingSlugsSet) {
    if (!existingSlugsSet.has(baseSlug)) return baseSlug;
    let n = 2;
    while (existingSlugsSet.has(`${baseSlug}-${n}`)) n += 1;
    return `${baseSlug}-${n}`;
  }

  MP.slug = { slugify, uniqueSlug };
})(window.MP = window.MP || {});
