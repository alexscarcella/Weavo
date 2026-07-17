// Wrapper isolato sulla File System Access API del browser. Nessuna logica
// applicativa qui: solo primitive di basso livello, composte da repository.js.
(function (MP) {
  'use strict';

  function isSupported() {
    return 'showDirectoryPicker' in window;
  }

  async function pickDirectory() {
    return window.showDirectoryPicker({ mode: 'readwrite' });
  }

  async function queryPermissionSilently(handle, mode = 'readwrite') {
    return (await handle.queryPermission({ mode })) === 'granted';
  }

  // Deve essere invocata a partire da un gesto utente diretto (es. dentro un
  // listener di click), altrimenti il browser rifiuta la richiesta.
  async function ensurePermission(handle, mode = 'readwrite') {
    if (await queryPermissionSilently(handle, mode)) return true;
    return (await handle.requestPermission({ mode })) === 'granted';
  }

  function splitPath(relativePath) {
    const parts = relativePath.split('/').filter(Boolean);
    const fileName = parts.pop();
    return { dirSegments: parts, fileName };
  }

  async function resolveDirHandle(rootHandle, segments, { create = false } = {}) {
    let current = rootHandle;
    for (const segment of segments) {
      current = await current.getDirectoryHandle(segment, { create });
    }
    return current;
  }

  async function getFileHandle(rootHandle, relativePath, { create = false } = {}) {
    const { dirSegments, fileName } = splitPath(relativePath);
    const dirHandle = await resolveDirHandle(rootHandle, dirSegments, { create });
    return dirHandle.getFileHandle(fileName, { create });
  }

  async function readTextFile(rootHandle, relativePath) {
    const fileHandle = await getFileHandle(rootHandle, relativePath);
    const file = await fileHandle.getFile();
    return file.text();
  }

  async function writeTextFile(rootHandle, relativePath, text) {
    const fileHandle = await getFileHandle(rootHandle, relativePath, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(text);
    await writable.close();
  }

  async function ensureSubfolder(rootHandle, name) {
    return rootHandle.getDirectoryHandle(name, { create: true });
  }

  async function removeFile(rootHandle, relativePath) {
    const { dirSegments, fileName } = splitPath(relativePath);
    const dirHandle = await resolveDirHandle(rootHandle, dirSegments, { create: false });
    await dirHandle.removeEntry(fileName);
  }

  async function listJsonFiles(rootHandle, subfolder) {
    const dirHandle = await rootHandle.getDirectoryHandle(subfolder, { create: false });
    const files = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file' && name.endsWith('.json')) files.push({ name, handle });
    }
    return files;
  }

  MP.fsAccess = {
    isSupported,
    pickDirectory,
    queryPermissionSilently,
    ensurePermission,
    getFileHandle,
    readTextFile,
    writeTextFile,
    ensureSubfolder,
    listJsonFiles,
    removeFile,
  };
})(window.MP = window.MP || {});
