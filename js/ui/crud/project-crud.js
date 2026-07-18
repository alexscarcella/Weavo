// CRUD progetti: crea (con slug automatico e gestione collisioni), rinomina,
// elimina, archivia/riattiva, riordina. Nessuna lista di progetti hardcoded:
// tutto passa da manifest.json + progetti/*.json.
(function (MP) {
  'use strict';

  const { slugify, uniqueSlug } = MP.slug;

  function existingSlugs(manifest) {
    return new Set(
      manifest.progetti.map((p) => p.file.replace(/^progetti\//, '').replace(/\.json$/, ''))
    );
  }

  async function persist(state, { manifest = true, projectFiles = [] } = {}) {
    try {
      if (manifest) await MP.saveCoordinator.saveManifest(state);
      for (const file of projectFiles) {
        await MP.saveCoordinator.saveProject(state, file);
      }
      MP.store.setState({});
    } catch (e) {
      window.alert(`Error saving: ${e.message}`);
    }
  }

  async function createProject(state, preset) {
    const result = preset !== undefined ? preset : await MP.modal.promptProjectForm({
      title: 'New project',
      nome: '',
      team: MP.schema.createProjectTeamInfo(),
      teamRisorsa: state.dataset.teamRisorsa,
    });
    if (!result || !result.nome || !result.nome.trim()) return null;
    const nome = result.nome.trim();

    const manifest = state.dataset.manifest;
    const slug = uniqueSlug(slugify(nome), existingSlugs(manifest));
    const file = `progetti/${slug}.json`;
    const data = MP.schema.createProject(nome, result.team);

    manifest.progetti.push({ file, nome });
    state.dataset.progetti.set(file, { data, rawText: '' });

    try {
      await MP.saveCoordinator.saveProject(state, file);
      await MP.saveCoordinator.saveManifest(state);
      MP.store.setState({});
      return file;
    } catch (e) {
      window.alert(`Error creating the project: ${e.message}`);
      return null;
    }
  }

  async function renameProject(state, file, nomeInput) {
    const entry = state.dataset.progetti.get(file);
    const nuovoNome = nomeInput !== undefined ? nomeInput : window.prompt('New project name:', entry.data.nome);
    if (!nuovoNome || !nuovoNome.trim()) return;
    entry.data.nome = nuovoNome.trim();
    const manifestVoce = state.dataset.manifest.progetti.find((p) => p.file === file);
    if (manifestVoce) manifestVoce.nome = nuovoNome.trim();
    await persist(state, { manifest: true, projectFiles: [file] });
  }

  async function editTeam(state, file, teamInput) {
    const entry = state.dataset.progetti.get(file);
    const result = teamInput !== undefined
      ? { team: teamInput }
      : await MP.modal.promptProjectForm({
          title: 'Project team',
          nome: null,
          team: entry.data.team,
          teamRisorsa: state.dataset.teamRisorsa,
        });
    if (!result) return;
    entry.data.team = result.team;
    await persist(state, { manifest: false, projectFiles: [file] });
  }

  async function toggleArchivio(state, file) {
    const entry = state.dataset.progetti.get(file);
    entry.data.archiviato = !entry.data.archiviato;
    await persist(state, { manifest: false, projectFiles: [file] });
  }

  async function deleteProject(state, file, skipConfirm) {
    const entry = state.dataset.progetti.get(file);
    if (!entry) return;
    const confermato = skipConfirm || window.confirm(
      `Permanently delete the project "${entry.data.nome}" and its file "${file}"? This cannot be undone (consider a Backup first).`
    );
    if (!confermato) return;

    state.dataset.manifest.progetti = state.dataset.manifest.progetti.filter((p) => p.file !== file);
    state.dataset.progetti.delete(file);

    try {
      await MP.fsAccess.removeFile(state.dirHandle, file);
    } catch (e) {
      window.alert(`The project was removed from the list but the file "${file}" could not be deleted: ${e.message}`);
    }
    await persist(state, { manifest: true, projectFiles: [] });
  }

  async function moveProject(state, file, direction) {
    const arr = state.dataset.manifest.progetti;
    const idx = arr.findIndex((p) => p.file === file);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= arr.length) return;
    [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
    await persist(state, { manifest: true, projectFiles: [] });
  }

  MP.projectCrud = { createProject, renameProject, editTeam, toggleArchivio, deleteProject, moveProject };
})(window.MP = window.MP || {});
