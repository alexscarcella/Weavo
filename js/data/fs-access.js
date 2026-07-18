// Wrapper isolato sulla File System Access API del browser. Nessuna logica
// applicativa qui: solo primitive di basso livello, composte da repository.js.
(function (MP) {
  'use strict';

  function isSupported() {
    return 'showDirectoryPicker' in window;
  }

  // `id` dovrebbe far sì che Chrome/Edge ricordino, per profilo browser,
  // l'ultima cartella scelta con questo stesso id e riaprano il dialogo già
  // navigato lì. Verificato empiricamente (luglio 2026) che sotto file:// NON
  // funziona: anche solo ricaricando la pagina nella stessa sessione, senza
  // chiudere il browser, il dialogo riparte dalla posizione di default —
  // stessa causa probabile dell'origine opaca/non persistente che blocca
  // IndexedDB (vedi Hard constraints in CLAUDE.md). Lasciato perché innocuo e
  // conforme a spec (potrebbe iniziare a funzionare se l'app venisse mai
  // servita da un'origine non-file://), ma non va presentato all'utente come
  // una riduzione di click. Vedi docs/deployment.md "No persisted connection".
  async function pickDirectory() {
    return window.showDirectoryPicker({ mode: 'readwrite', id: 'masterplan-dati' });
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

  // Rimozione ricorsiva di una sottocartella. Usata dalla migrazione legacy
  // (js/data/legacy-migration.js) per eliminare la vecchia cartella progetti
  // dopo aver scritto quella nuova — non esiste un "rename" nella File System
  // Access API, solo create-nuovo + copia + delete-vecchio.
  async function removeDirectory(rootHandle, name) {
    await rootHandle.removeEntry(name, { recursive: true });
  }

  async function directoryExists(rootHandle, name) {
    try {
      await rootHandle.getDirectoryHandle(name, { create: false });
      return true;
    } catch (e) {
      return false;
    }
  }

  async function fileExists(rootHandle, relativePath) {
    try {
      await getFileHandle(rootHandle, relativePath);
      return true;
    } catch (e) {
      return false;
    }
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
    removeDirectory,
    directoryExists,
    fileExists,
  };
})(window.MP = window.MP || {});
