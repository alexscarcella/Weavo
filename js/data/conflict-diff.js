// Riassunto leggibile delle differenze tra due versioni testuali dello stesso file
// dati (manifest/team-resources/progetto), usato dal modal di conflitto di
// salvataggio (save-coordinator.js) per mostrare COSA è cambiato su disco, non solo
// che è cambiato — la decisione "sovrascrivere o annullare" è molto più informata
// se si vede quali task/settimane sono coinvolti invece del solo testo grezzo
// differente. Diff strutturale mirata al modello dati, non un diff testuale
// generico: pura funzione di sola lettura, nessuna I/O, nessuna mutazione.
(function (MP) {
  'use strict';

  const MAX_LINES = 20;

  function summarize(path, oldText, newText) {
    let oldData;
    let newData;
    try {
      oldData = JSON.parse(oldText);
      newData = JSON.parse(newText);
    } catch (e) {
      return ['Unable to summarize the differences (content changed on disk).'];
    }

    let lines;
    try {
      if (path === MP.schema.PATHS.manifest) lines = summarizeManifest(oldData, newData);
      else if (path === MP.schema.PATHS.teamResources) lines = summarizeTeamResources(oldData, newData);
      else lines = summarizeProject(oldData, newData);
    } catch (e) {
      return ['Unable to summarize the differences (content changed on disk).'];
    }

    if (lines.length === 0) {
      return ['Content changed, but no structural difference was detected (formatting only).'];
    }
    if (lines.length > MAX_LINES) {
      return [...lines.slice(0, MAX_LINES), `…and ${lines.length - MAX_LINES} more change(s).`];
    }
    return lines;
  }

  function summarizeManifest(oldData, newData) {
    const lines = [];
    if (oldData.weeks.first !== newData.weeks.first || oldData.weeks.last !== newData.weeks.last) {
      lines.push(`Week range: ${oldData.weeks.first}–${oldData.weeks.last} → ${newData.weeks.first}–${newData.weeks.last}`);
    }
    const oldFiles = new Map(oldData.projects.map((p) => [p.file, p]));
    const newFiles = new Map(newData.projects.map((p) => [p.file, p]));
    for (const [file, p] of newFiles) {
      if (!oldFiles.has(file)) lines.push(`New project: "${p.name}"`);
    }
    for (const [file, p] of oldFiles) {
      if (!newFiles.has(file)) lines.push(`Project removed: "${p.name}"`);
    }
    return lines;
  }

  function summarizeTeamResources(oldData, newData) {
    const lines = [];
    const oldTeams = new Map(oldData.teams.map((t) => [t.code, t]));
    const newTeams = new Map(newData.teams.map((t) => [t.code, t]));
    for (const [code, t] of newTeams) {
      const old = oldTeams.get(code);
      if (!old) {
        lines.push(`New team: "${t.name}"`);
        continue;
      }
      if (old.name !== t.name) lines.push(`Team renamed: "${old.name}" → "${t.name}" (${code})`);
      if (old.color !== t.color) lines.push(`Team "${t.name}" recolored: ${old.color} → ${t.color}`);
      const oldRes = new Map((old.resources || []).map((r) => [r.initials, r]));
      const newRes = new Map((t.resources || []).map((r) => [r.initials, r]));
      for (const [initials, r] of newRes) {
        const oldR = oldRes.get(initials);
        if (!oldR) lines.push(`New resource: ${initials} — ${r.name} (${t.name})`);
        else if (oldR.name !== r.name) lines.push(`Resource renamed: ${initials} — "${oldR.name}" → "${r.name}"`);
      }
      for (const [initials, r] of oldRes) {
        if (!newRes.has(initials)) lines.push(`Resource removed: ${initials} — ${r.name} (${t.name})`);
      }
    }
    for (const [code, t] of oldTeams) {
      if (!newTeams.has(code)) lines.push(`Team removed: "${t.name}"`);
    }
    return lines;
  }

  function summarizeProject(oldData, newData) {
    const lines = [];
    if (oldData.name !== newData.name) {
      lines.push(`Project renamed: "${oldData.name}" → "${newData.name}"`);
    }
    const oldTasks = flattenTasks(oldData);
    const newTasks = flattenTasks(newData);
    for (const [key, t] of newTasks) {
      const old = oldTasks.get(key);
      if (!old) {
        lines.push(`New task: "${t.name}" (${t.baselineVersion})`);
        continue;
      }
      if (old.completed !== t.completed) {
        lines.push(`Task "${t.name}" (${t.baselineVersion}): completed → ${t.completed}`);
      }
      const weekLines = diffWeeks(old.weeks, t.weeks);
      if (weekLines.length > 0) {
        lines.push(`Task "${t.name}" (${t.baselineVersion}): ${weekLines.join(', ')}`);
      }
    }
    for (const [key, t] of oldTasks) {
      if (!newTasks.has(key)) lines.push(`Task removed: "${t.name}" (${t.baselineVersion})`);
    }
    return lines;
  }

  // Chiave baseline+nome task (nessun id stabile nello schema): un doppione di nome
  // nella stessa baseline collassa le due entry nel confronto, accettato come limite
  // di un diff diagnostico, non di una fonte di verità sui dati.
  function flattenTasks(projectData) {
    const map = new Map();
    for (const baseline of projectData.baseline || []) {
      for (const task of baseline.task || []) {
        map.set(`${baseline.version}::${task.name}`, { ...task, baselineVersion: baseline.version });
      }
    }
    return map;
  }

  function diffWeeks(oldWeeks = {}, newWeeks = {}) {
    const lines = [];
    const keys = new Set([...Object.keys(oldWeeks), ...Object.keys(newWeeks)]);
    for (const iso of Array.from(keys).sort()) {
      const before = oldWeeks[iso];
      const after = newWeeks[iso];
      const beforeEmpty = MP.schema.isWeekEntryEmpty(before);
      const afterEmpty = MP.schema.isWeekEntryEmpty(after);
      if (beforeEmpty && !afterEmpty) lines.push(`${iso} added`);
      else if (!beforeEmpty && afterEmpty) lines.push(`${iso} cleared`);
      else if (!beforeEmpty && !afterEmpty && JSON.stringify(before) !== JSON.stringify(after)) lines.push(`${iso} changed`);
    }
    return lines;
  }

  MP.conflictDiff = { summarize };
})(window.MP = window.MP || {});
