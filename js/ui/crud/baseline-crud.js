// CRUD baseline all'interno di un progetto: crea, rinomina, elimina, riordina.
(function (MP) {
  'use strict';

  async function persistProject(state, file) {
    try {
      await MP.saveCoordinator.saveProject(state, file);
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving: ${e.message}`);
    }
  }

  async function createBaseline(state, file, versionInput) {
    const version = versionInput !== undefined ? versionInput : window.prompt('Name/version of the new baseline:');
    if (!version || !version.trim()) return;
    const progetto = state.dataset.projects.get(file).data;
    progetto.baseline.push(MP.schema.createBaseline(version.trim()));
    await persistProject(state, file);
  }

  async function renameBaseline(state, file, baseline, nuovoInput) {
    const nuovo = nuovoInput !== undefined ? nuovoInput : window.prompt('New name/version of the baseline:', baseline.version);
    if (!nuovo || !nuovo.trim()) return;
    baseline.version = nuovo.trim();
    await persistProject(state, file);
  }

  async function deleteBaseline(state, file, baseline, skipConfirm) {
    const progetto = state.dataset.projects.get(file).data;
    const confermato = skipConfirm || window.confirm(
      `Delete the baseline "${baseline.version}" and all its tasks? This cannot be undone.`
    );
    if (!confermato) return;
    progetto.baseline = progetto.baseline.filter((b) => b !== baseline);
    await persistProject(state, file);
  }

  // Sposta una baseline in una posizione esatta (usato dal drag&drop, vedi baseline-drag.js).
  // `targetFile` può essere lo stesso `sourceFile` (riordino dentro un progetto) o un progetto
  // diverso (spostamento cross-progetto). targetIndex è l'indice nell'array `baseline` grezzo
  // (non filtrato da showCompletedProjects) del progetto di DESTINAZIONE, calcolato dal chiamante.
  //
  // Cross-progetto: la baseline esce dall'array di un progetto ed entra in quello di un altro —
  // due file da salvare via MP.saveCoordinator.saveProjects (nessuna transazione su disco). Se la
  // baseline eredita il team dal progetto (team == null), il team effettivo di origine viene
  // congelato come BL team dedicato PRIMA dello spostamento, così non eredita silenziosamente
  // quello della destinazione (vedi MP.schema.resolveBaselineTeam).
  async function moveBaselineToPosition(state, sourceFile, baseline, targetFile, targetIndex) {
    if (sourceFile === targetFile) {
      const progetto = state.dataset.projects.get(sourceFile).data;
      const arr = progetto.baseline;
      const idx = arr.indexOf(baseline);
      if (idx < 0) return;
      arr.splice(idx, 1);
      let insertAt = targetIndex;
      if (idx < targetIndex) insertAt -= 1;
      arr.splice(insertAt, 0, baseline);
      await persistProject(state, sourceFile);
      return;
    }

    const sourceProg = state.dataset.projects.get(sourceFile).data;
    const targetProg = state.dataset.projects.get(targetFile).data;

    // Congela il team ereditato (solo se non vuoto), come oggetto NUOVO — normalizeBaselineTeam
    // passa da createProjectReferents e non aliasa sourceProg.referents.
    let snappedTeam = false;
    if (baseline.team == null) {
      const resolved = MP.schema.resolveBaselineTeam(sourceProg, baseline);
      if (!MP.schema.isBaselineTeamEmpty(resolved)) {
        baseline.team = MP.schema.normalizeBaselineTeam(resolved);
        snappedTeam = true;
      }
    }

    const idx = sourceProg.baseline.indexOf(baseline);
    if (idx < 0) {
      if (snappedTeam) baseline.team = null;
      return;
    }
    sourceProg.baseline.splice(idx, 1);
    targetProg.baseline.splice(targetIndex, 0, baseline);

    let ok = false;
    try {
      // Destinazione prima, origine poi: un fallimento della seconda scrittura lascia un
      // duplicato visibile e correggibile, mai una perdita.
      ok = await MP.saveCoordinator.saveProjects(state, [targetFile, sourceFile]);
    } catch (e) {
      window.alert(`Error saving: ${e.message}`);
      return;
    }

    if (!ok) {
      // Modal di conflitto annullato => saveProjects garantisce che nulla sia stato scritto:
      // annulla anche la mutazione in memoria per non lasciare uno stato "avanti" rispetto al disco.
      targetProg.baseline.splice(targetProg.baseline.indexOf(baseline), 1);
      sourceProg.baseline.splice(idx, 0, baseline);
      if (snappedTeam) baseline.team = null;
      return;
    }

    MP.store.setState({});
  }

  async function toggleCompleted(state, file, baseline) {
    const marking = !baseline.completed;
    if (marking && !window.confirm(`Mark baseline "${baseline.version}" as completed? It will be hidden unless "Show completed projects/baselines" is on.`)) {
      return;
    }
    baseline.completed = marking;
    await persistProject(state, file);
  }

  // Shift dell'intera baseline (tutti i task non-completed, milestone comprese) di N
  // settimane avanti/indietro in un colpo solo — vedi MP.weekShift.canShiftBaseline/
  // shiftBaselineData per la logica pura. `deltaInput` (usato dai test) bypassa il
  // prompt.
  async function shiftBaseline(state, file, baseline, deltaInput) {
    const raw = deltaInput !== undefined ? deltaInput : window.prompt(
      'How many weeks should the whole baseline shift? Use a negative number to shift backward, positive to shift forward (e.g. -2 or 3):'
    );
    if (raw === null || raw === undefined) return;
    const trimmed = String(raw).trim();
    if (!/^-?\d+$/.test(trimmed)) {
      window.alert('Enter a whole number of weeks (e.g. -2 or 3).');
      return;
    }
    const delta = parseInt(trimmed, 10);
    if (delta === 0) {
      window.alert('Enter a non-zero number of weeks.');
      return;
    }

    const check = MP.weekShift.canShiftBaseline(state.dataset, baseline, delta);
    if (!check.allowed) {
      window.alert(check.reason);
      return;
    }
    if (check.movedWeeksCount === 0) {
      window.alert('This baseline has no allocations or milestones to shift.');
      return;
    }

    const direction = delta > 0 ? 'forward' : 'backward';
    const magnitude = Math.abs(delta);
    const skippedParts = [];
    if (check.skippedCompletedCount > 0) skippedParts.push(`${check.skippedCompletedCount} completed task(s)`);
    if (check.skippedCompletedWeeksCount > 0) skippedParts.push(`${check.skippedCompletedWeeksCount} completed week(s)`);
    const skippedNote = skippedParts.length ? ` ${skippedParts.join(' and ')} will be left untouched.` : '';
    const confermato = window.confirm(
      `Shift baseline "${baseline.version}" ${magnitude} week(s) ${direction}? This will move ${check.movedWeeksCount} allocation(s)/milestone(s) across ${check.affectedTasksCount} task(s).${skippedNote}`
    );
    if (!confermato) return;

    MP.weekShift.shiftBaselineData(baseline, delta);
    await persistProject(state, file);
  }

  // A differenza di renameBaseline, una stringa vuota è un valore valido (svuota la nota) — solo
  // null/undefined (Cancel sul modal) è "annulla".
  async function setBaselineNote(state, file, baseline, noteInput) {
    const nota = noteInput !== undefined
      ? noteInput
      : await MP.modal.promptText({
          title: baseline.note ? 'Edit note' : 'Add note',
          label: 'Note',
          value: baseline.note || '',
          multiline: true,
          maxLength: 200,
        });
    if (nota === null || nota === undefined) return;
    baseline.note = nota.trim().slice(0, 200);
    await persistProject(state, file);
  }

  // Modifica il BL team di una baseline: apre il form (promptBaselineTeamForm) precompilato
  // col team effettivo corrente, con la checkbox "Inherit from project team" spuntata se la
  // baseline non ha ancora un BL team specifico. `result.team` è `null` (eredita) o un oggetto
  // (BL team dedicato). `teamInput` (usato dai test) bypassa il form.
  async function setBaselineTeam(state, file, baseline, teamInput) {
    const progetto = state.dataset.projects.get(file).data;
    const result = teamInput !== undefined
      ? { team: teamInput }
      : await MP.modal.promptBaselineTeamForm({
          title: 'BL team',
          baselineTeam: baseline.team,
          projectTeam: progetto.referents,
          teamResources: state.dataset.teamResources,
        });
    if (!result) return;
    baseline.team = result.team === undefined ? null : result.team;
    await persistProject(state, file);
  }

  // Riporta la baseline a ereditare il project team (cancella il BL team specifico).
  async function revertBaselineTeam(state, file, baseline) {
    baseline.team = null;
    await persistProject(state, file);
  }

  MP.baselineCrud = { createBaseline, renameBaseline, deleteBaseline, moveBaselineToPosition, toggleCompleted, shiftBaseline, setBaselineNote, setBaselineTeam, revertBaselineTeam };
})(window.MP = window.MP || {});
