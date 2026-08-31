// Punto unico di scrittura "sicura": rilegge il file su disco subito prima di
// scrivere e, se il contenuto è cambiato rispetto all'ultimo testo noto in
// sessione (dataRef.rawText), chiede conferma via modal prima di sovrascrivere
// (§6.4 spec), mostrando un riassunto di cosa è cambiato (MP.conflictDiff, vedi
// quel file) per una decisione informata. Aggiorna dataRef.rawText dopo ogni
// scrittura riuscita, cosicché i controlli successivi confrontino sempre contro
// l'ultima versione scritta da questa sessione, non contro il caricamento iniziale.
(function (MP) {
  'use strict';

  async function withConflictCheck({ dirHandle, path, dataRef, writeFn, label }) {
    const diskText = await MP.repository.readTextFileOrNull(dirHandle, path);
    if (diskText !== null && diskText !== dataRef.rawText) {
      const diffLines = MP.conflictDiff.summarize(path, dataRef.rawText, diskText);
      const proceed = await MP.modal.confirmConflict({ label, path, diffLines });
      if (!proceed) return false;
    }
    const text = await writeFn();
    dataRef.rawText = text;
    return true;
  }

  // Fase "controllo" di un salvataggio di progetto: rilegge il file e, se è
  // cambiato su disco rispetto all'ultimo testo noto in sessione, mostra il
  // modal di conferma. NON scrive nulla. Ritorna false solo se l'utente annulla.
  // Estratto da withConflictCheck per poter fare, in saveProjects, TUTTI i
  // controlli di conflitto prima di QUALSIASI scrittura (vedi lì il perché).
  async function precheckProjectConflict(state, file) {
    const entry = state.dataset.projects.get(file);
    const diskText = await MP.repository.readTextFileOrNull(state.dirHandle, file);
    if (diskText !== null && diskText !== entry.rawText) {
      const diffLines = MP.conflictDiff.summarize(file, entry.rawText, diskText);
      return MP.modal.confirmConflict({ label: `project "${entry.data.name}"`, path: file, diffLines });
    }
    return true;
  }

  // Fase "scrittura": scrive un file di progetto e aggiorna il rawText noto in
  // sessione, cosicché i controlli di conflitto successivi confrontino contro
  // l'ultima versione scritta da questa sessione.
  async function writeProjectOne(state, file) {
    const entry = state.dataset.projects.get(file);
    entry.rawText = await MP.repository.saveProject(state.dirHandle, file, entry.data);
  }

  async function saveProject(state, file) {
    const proceed = await precheckProjectConflict(state, file);
    if (!proceed) return false;
    await writeProjectOne(state, file);
    return true;
  }

  // Salva più file di progetto come un'unica operazione logica (usato dagli
  // spostamenti cross-progetto di baseline/task: il progetto di origine perde
  // l'oggetto, quello di destinazione lo acquista). Struttura in due fasi:
  // PRIMA tutti i controlli di conflitto, POI tutte le scritture. Così se
  // l'utente annulla un modal di conflitto NIENTE è ancora stato scritto e il
  // chiamante può annullare in modo pulito anche la mutazione in memoria — a
  // differenza di un semplice loop di saveProject, che scriverebbe il primo
  // file e poi lascerebbe una scrittura a metà se il secondo modal viene
  // annullato. Nessuna atomicità su disco oltre a questo: se una scrittura di
  // fase 2 fallisce a metà, i file già scritti restano scritti (documentato).
  // L'ordine di `files` è l'ordine di scrittura: passare [destinazione, origine]
  // così un fallimento della seconda lascia un DUPLICATO visibile, mai una
  // perdita.
  async function saveProjects(state, files) {
    for (const file of files) {
      if (!(await precheckProjectConflict(state, file))) return false;
    }
    for (const file of files) {
      try {
        await writeProjectOne(state, file);
      } catch (e) {
        throw new Error(`Error saving "${file}": ${e.message}`);
      }
    }
    return true;
  }

  function saveManifest(state) {
    const dataRef = state.dataset.manifestMeta;
    return withConflictCheck({
      dirHandle: state.dirHandle,
      path: MP.schema.PATHS.manifest,
      dataRef,
      writeFn: () => MP.repository.saveManifest(state.dirHandle, state.dataset.manifest),
      label: 'manifest.json',
    });
  }

  function saveTeamResources(state) {
    const dataRef = state.dataset.teamResourcesMeta;
    return withConflictCheck({
      dirHandle: state.dirHandle,
      path: MP.schema.PATHS.teamResources,
      dataRef,
      writeFn: () => MP.repository.saveTeamResources(state.dirHandle, state.dataset.teamResources),
      label: 'team-resources.json',
    });
  }

  MP.saveCoordinator = { saveProject, saveProjects, saveManifest, saveTeamResources };
})(window.MP = window.MP || {});
