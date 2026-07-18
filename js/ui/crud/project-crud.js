// CRUD progetti: crea (con slug automatico e gestione collisioni), rinomina,
// elimina, archivia/riattiva, riordina. Nessuna lista di progetti hardcoded:
// tutto passa da manifest.json + projects/*.json.
(function (MP) {
  'use strict';

  const { slugify, uniqueSlug } = MP.slug;

  function existingSlugs(manifest) {
    return new Set(
      manifest.projects.map((p) => p.file.replace(/^projects\//, '').replace(/\.json$/, ''))
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
      name: '',
      referents: MP.schema.createProjectReferents(),
      teamResources: state.dataset.teamResources,
    });
    if (!result || !result.name || !result.name.trim()) return null;
    const name = result.name.trim();

    const manifest = state.dataset.manifest;
    const slug = uniqueSlug(slugify(name), existingSlugs(manifest));
    const file = `${MP.schema.PATHS.projectsDir}/${slug}.json`;
    const data = MP.schema.createProject(name, result.referents);

    manifest.projects.push({ file, name });
    state.dataset.projects.set(file, { data, rawText: '' });

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

  async function renameProject(state, file, nameInput) {
    const entry = state.dataset.projects.get(file);
    const nuovoNome = nameInput !== undefined ? nameInput : window.prompt('New project name:', entry.data.name);
    if (!nuovoNome || !nuovoNome.trim()) return;
    entry.data.name = nuovoNome.trim();
    const manifestVoce = state.dataset.manifest.projects.find((p) => p.file === file);
    if (manifestVoce) manifestVoce.name = nuovoNome.trim();
    await persist(state, { manifest: true, projectFiles: [file] });
  }

  async function editReferents(state, file, referentsInput) {
    const entry = state.dataset.projects.get(file);
    const result = referentsInput !== undefined
      ? { referents: referentsInput }
      : await MP.modal.promptProjectForm({
          title: 'Project team',
          name: null,
          referents: entry.data.referents,
          teamResources: state.dataset.teamResources,
        });
    if (!result) return;
    entry.data.referents = result.referents;
    await persist(state, { manifest: false, projectFiles: [file] });
  }

  async function toggleArchived(state, file) {
    const entry = state.dataset.projects.get(file);
    entry.data.archived = !entry.data.archived;
    await persist(state, { manifest: false, projectFiles: [file] });
  }

  async function deleteProject(state, file, skipConfirm) {
    const entry = state.dataset.projects.get(file);
    if (!entry) return;
    const confermato = skipConfirm || window.confirm(
      `Permanently delete the project "${entry.data.name}" and its file "${file}"? This cannot be undone (consider a Backup first).`
    );
    if (!confermato) return;

    state.dataset.manifest.projects = state.dataset.manifest.projects.filter((p) => p.file !== file);
    state.dataset.projects.delete(file);

    try {
      await MP.fsAccess.removeFile(state.dirHandle, file);
    } catch (e) {
      window.alert(`The project was removed from the list but the file "${file}" could not be deleted: ${e.message}`);
    }
    await persist(state, { manifest: true, projectFiles: [] });
  }

  async function moveProject(state, file, direction) {
    const arr = state.dataset.manifest.projects;
    const idx = arr.findIndex((p) => p.file === file);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= arr.length) return;
    [arr[idx], arr[swapWith]] = [arr[swapWith], arr[idx]];
    await persist(state, { manifest: true, projectFiles: [] });
  }

  MP.projectCrud = { createProject, renameProject, editReferents, toggleArchived, deleteProject, moveProject };
})(window.MP = window.MP || {});
