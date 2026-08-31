// Filtro multi-progetto della vista gantt: un bottone nella toolbar dell'header
// + un pannello a tendina con una checkbox per progetto (+ "Select all" /
// "Clear"). Le modifiche si accumulano in un set di lavoro locale e vengono
// applicate con UN SOLO `setState` alla CHIUSURA del pannello: un setState per
// ogni toggle rifarebbe l'intero albero DOM (vedi app.js) chiudendo il
// pannello a ogni click. Lo stato selezionato vive in `state.ui.projectFilter`
// (array dei `file` di progetto; [] = tutti).
(function (MP) {
  'use strict';

  let btnEl = null;
  let panelEl = null;
  let working = null; // Set<file> in editing mentre il pannello è aperto, null quando chiuso
  let initialKey = '';

  function projectList(state) {
    const out = [];
    for (const voce of state.dataset.manifest.projects) {
      const entry = state.dataset.projects.get(voce.file);
      if (!entry) continue; // stessa guardia di buildRows
      out.push({ file: voce.file, name: (entry.data && entry.data.name) || voce.name || voce.file });
    }
    // Le checkbox del pannello vanno in ordine alfabetico crescente per nome
    // (indipendente dall'ordine del manifest, che guida invece la griglia).
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }

  function keyOf(set) {
    return [...set].sort().join('\n');
  }

  function updateBtnLabel(state) {
    const total = projectList(state).length;
    let allSelected;
    let count;
    if (working) {
      count = working.size;
      allSelected = count === 0 || count === total; // 0 e "tutti" si normalizzano entrambi a []
    } else {
      const pf = state.ui.projectFilter || [];
      count = pf.length;
      allSelected = count === 0;
    }
    btnEl.textContent = allSelected ? 'Projects: all' : `Projects: ${count} of ${total}`;
  }

  function detachGlobal() {
    document.removeEventListener('mousedown', onOutside, true);
    document.removeEventListener('keydown', onKeydown, true);
  }

  function discardPanel() {
    if (panelEl) panelEl.remove();
    panelEl = null;
    working = null;
    detachGlobal();
  }

  function closePanel(state) {
    if (!panelEl) return;
    const selection = working;
    const changed = selection && keyOf(selection) !== initialKey;
    discardPanel();
    updateBtnLabel(state);
    if (changed) {
      const all = projectList(state).map((p) => p.file);
      // "tutti selezionati" (o nessuno) -> [] per mantenere l'invariante "vuoto = tutti".
      const next = all.length && all.every((f) => selection.has(f)) ? [] : [...selection];
      MP.store.setState((s) => ({ ui: { ...s.ui, projectFilter: next } }));
    }
  }

  function onOutside(e) {
    if (!panelEl) return;
    if (panelEl.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.project-filter-btn')) return; // lascia agire il click del bottone
    closePanel(MP.store.getState());
  }

  function onKeydown(e) {
    if (e.key === 'Escape') closePanel(MP.store.getState());
  }

  function openPanel(state) {
    const projects = projectList(state);
    const pf = state.ui.projectFilter || [];
    working = new Set(pf.length ? pf : projects.map((p) => p.file)); // [] = tutti -> parti con tutte spuntate
    initialKey = keyOf(working);

    panelEl = document.createElement('div');
    panelEl.className = 'project-filter-panel';

    const actions = document.createElement('div');
    actions.className = 'project-filter-actions';
    const selectAll = document.createElement('button');
    selectAll.type = 'button';
    selectAll.textContent = 'Select all';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Clear';
    actions.append(selectAll, clear);
    panelEl.appendChild(actions);

    const listEl = document.createElement('div');
    listEl.className = 'project-filter-list';
    panelEl.appendChild(listEl);

    projects.forEach((p) => {
      const label = document.createElement('label');
      label.className = 'project-filter-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = p.file;
      cb.checked = working.has(p.file);
      cb.addEventListener('change', () => {
        if (cb.checked) working.add(p.file);
        else working.delete(p.file);
        updateBtnLabel(state);
      });
      const span = document.createElement('span');
      span.textContent = p.name;
      label.append(cb, span);
      listEl.appendChild(label);
    });

    selectAll.addEventListener('click', () => {
      working = new Set(projects.map((p) => p.file));
      listEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = true; });
      updateBtnLabel(state);
    });
    clear.addEventListener('click', () => {
      working.clear();
      listEl.querySelectorAll('input[type="checkbox"]').forEach((cb) => { cb.checked = false; });
      updateBtnLabel(state);
    });

    document.body.appendChild(panelEl);
    const r = btnEl.getBoundingClientRect();
    panelEl.style.position = 'fixed';
    panelEl.style.top = `${Math.round(r.bottom + 4)}px`;
    panelEl.style.left = `${Math.round(r.left)}px`;

    updateBtnLabel(state);

    // Il click che apre il pannello è lo stesso che, propagandosi, farebbe
    // scattare subito "click fuori": aggancio i listener al giro successivo.
    setTimeout(() => {
      document.addEventListener('mousedown', onOutside, true);
      document.addEventListener('keydown', onKeydown, true);
    }, 0);
  }

  function renderProjectFilter(state) {
    // Nuovo render dell'intero albero: se per qualche motivo un pannello era
    // ancora aperto, lo si abbandona senza applicare nulla (le modifiche non
    // confermate vanno perse, come per il cell-popover).
    discardPanel();

    const wrap = document.createElement('span');
    wrap.className = 'project-filter';
    btnEl = document.createElement('button');
    btnEl.type = 'button';
    btnEl.className = 'project-filter-btn';
    wrap.appendChild(btnEl);
    updateBtnLabel(state);

    btnEl.addEventListener('click', () => {
      if (panelEl) closePanel(state);
      else openPanel(state);
    });

    return wrap;
  }

  MP.projectFilter = { renderProjectFilter };
})(window.MP = window.MP || {});
