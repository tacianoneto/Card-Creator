/**
 * storage.ts
 *
 * Persistent storage for the multi-project system.
 *
 * IndexedDB is the primary storage for full project snapshots. localStorage is
 * kept only as a lightweight metadata mirror and as a fallback when IndexedDB is
 * unavailable. Components should keep using the sync API exposed here after the
 * app calls migrateIfNeeded() during startup.
 */

import type { CardDocument, ProjectLibrary, ProjectMeta, ProjectSnapshot } from '../types';
import { createId, isProjectSnapshot } from './editor';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const LIBRARY_KEY = 'bcs-library';
export const LEGACY_KEY = 'board-card-studio-project';

export const projectKey = (id: string) => `bcs-project-${id}`;

const LIBRARY_VERSION = 1 as const;
const LOCAL_STORAGE_SAFE_LIMIT_BYTES = 9 * 1024 * 1024;
const DB_NAME = 'board-card-studio';
const DB_VERSION = 1;
const LIBRARY_STORE = 'library';
const PROJECT_STORE = 'projects';
const LIBRARY_ID = 'main';

interface BackupBundle {
  kind: 'board-card-studio-backup';
  version: 1;
  exportedAt: number;
  projects: ProjectSnapshot[];
}

export interface LocalStorageStatus {
  indexedDbAvailable: boolean;
  persistent: boolean;
  usageBytes: number | null;
  quotaBytes: number | null;
}

let initialized = false;
let initPromise: Promise<void> | null = null;
let indexedDbAvailable = true;
let dbPromise: Promise<IDBDatabase | null> | null = null;
let libraryCache: ProjectLibrary = emptyLibrary();
const projectCache = new Map<string, ProjectSnapshot>();

export class StorageQuotaWarning extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageQuotaWarning';
  }
}

export const isStorageQuotaWarning = (error: unknown): error is StorageQuotaWarning =>
  error instanceof StorageQuotaWarning ||
  (error instanceof Error && error.name === 'StorageQuotaWarning');

function isBackupBundle(value: unknown): value is BackupBundle {
  const candidate = value as Partial<BackupBundle>;
  return (
    candidate?.kind === 'board-card-studio-backup' &&
    candidate.version === 1 &&
    Array.isArray(candidate.projects) &&
    candidate.projects.every(isProjectSnapshot)
  );
}

function byteSize(value: string) {
  return new Blob([value]).size;
}

function estimateLocalStorageBytes(nextKey: string, nextValue: string) {
  let total = 0;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || key === nextKey) continue;
    total += byteSize(key) + byteSize(localStorage.getItem(key) ?? '');
  }
  return total + byteSize(nextKey) + byteSize(nextValue);
}

function assertLocalStorageRoom(nextKey: string, nextValue: string) {
  const estimatedBytes = estimateLocalStorageBytes(nextKey, nextValue);
  if (estimatedBytes > LOCAL_STORAGE_SAFE_LIMIT_BYTES) {
    const usedMb = (estimatedBytes / 1024 / 1024).toFixed(1);
    throw new StorageQuotaWarning(
      `Projeto muito grande para salvar com seguranca no armazenamento local (${usedMb} MB). Use IndexedDB ou exporte o projeto.`,
    );
  }
}

function setLocalStorageChecked(key: string, value: string) {
  assertLocalStorageRoom(key, value);
  localStorage.setItem(key, value);
}

function emptyLibrary(): ProjectLibrary {
  return { version: LIBRARY_VERSION, projects: [] };
}

function cloneSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  if (typeof structuredClone === 'function') return structuredClone(snapshot) as ProjectSnapshot;
  return JSON.parse(JSON.stringify(snapshot)) as ProjectSnapshot;
}

function cloneLibrary(library: ProjectLibrary): ProjectLibrary {
  if (typeof structuredClone === 'function') return structuredClone(library) as ProjectLibrary;
  return JSON.parse(JSON.stringify(library)) as ProjectLibrary;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    if (!('indexedDB' in window)) {
      indexedDbAvailable = false;
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(LIBRARY_STORE)) {
        db.createObjectStore(LIBRARY_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        db.createObjectStore(PROJECT_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      indexedDbAvailable = true;
      resolve(request.result);
    };

    request.onerror = () => {
      console.error('[storage] IndexedDB open failed:', request.error);
      indexedDbAvailable = false;
      resolve(null);
    };
  });

  return dbPromise;
}

function loadLibraryFromLocalStorage(): ProjectLibrary {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) return emptyLibrary();
    const parsed = JSON.parse(raw) as Partial<ProjectLibrary>;
    if (parsed.version !== LIBRARY_VERSION || !Array.isArray(parsed.projects)) {
      return emptyLibrary();
    }
    return parsed as ProjectLibrary;
  } catch {
    return emptyLibrary();
  }
}

function saveLibraryToLocalStorage(lib: ProjectLibrary) {
  try {
    setLocalStorageChecked(LIBRARY_KEY, JSON.stringify(lib));
  } catch (error) {
    console.error('[storage] save library mirror failed:', error);
    throw error;
  }
}

function loadProjectFromLocalStorage(id: string): ProjectSnapshot | null {
  try {
    const raw = localStorage.getItem(projectKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isProjectSnapshot(parsed) ? (parsed as ProjectSnapshot) : null;
  } catch {
    return null;
  }
}

async function idbLoadLibrary(db: IDBDatabase): Promise<ProjectLibrary | null> {
  const tx = db.transaction(LIBRARY_STORE, 'readonly');
  const done = transactionDone(tx);
  const raw = await requestToPromise<{ id: string; value: ProjectLibrary } | undefined>(
    tx.objectStore(LIBRARY_STORE).get(LIBRARY_ID),
  );
  await done;
  return raw?.value?.version === LIBRARY_VERSION && Array.isArray(raw.value.projects) ? raw.value : null;
}

async function idbSaveLibrary(db: IDBDatabase, lib: ProjectLibrary) {
  const tx = db.transaction(LIBRARY_STORE, 'readwrite');
  const done = transactionDone(tx);
  tx.objectStore(LIBRARY_STORE).put({ id: LIBRARY_ID, value: cloneLibrary(lib) });
  await done;
}

async function idbLoadProjects(db: IDBDatabase) {
  const tx = db.transaction(PROJECT_STORE, 'readonly');
  const done = transactionDone(tx);
  const snapshots = await requestToPromise<ProjectSnapshot[]>(tx.objectStore(PROJECT_STORE).getAll());
  await done;
  return snapshots.filter(isProjectSnapshot);
}

async function idbSaveProject(db: IDBDatabase, snapshot: ProjectSnapshot) {
  const tx = db.transaction(PROJECT_STORE, 'readwrite');
  const done = transactionDone(tx);
  tx.objectStore(PROJECT_STORE).put(snapshot);
  await done;
}

async function idbDeleteProject(db: IDBDatabase, id: string) {
  const tx = db.transaction(PROJECT_STORE, 'readwrite');
  const done = transactionDone(tx);
  tx.objectStore(PROJECT_STORE).delete(id);
  await done;
}

function buildProjectMeta(
  snapshot: ProjectSnapshot,
  existing: ProjectMeta | undefined,
  thumbnail?: string,
): ProjectMeta {
  const now = Date.now();
  const deckCards = snapshot.decks?.flatMap((deck) => deck.cards) ?? [];
  const allCards = deckCards.length > 0 ? deckCards : snapshot.cards;
  const firstCard: CardDocument | undefined = allCards[0];

  return {
    id: snapshot.id ?? createId(),
    name: snapshot.name || 'Sem titulo',
    description: snapshot.description ?? '',
    thumbnail: thumbnail ?? existing?.thumbnail ?? '',
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    cardCount: allCards.length,
    cardWidth: firstCard?.width ?? 420,
    cardHeight: firstCard?.height ?? 588,
    tags: existing?.tags ?? [],
  };
}

function persistProjectAsync(snapshot: ProjectSnapshot) {
  if (!indexedDbAvailable) {
    setLocalStorageChecked(projectKey(snapshot.id ?? ''), JSON.stringify(snapshot));
    return;
  }

  void openDatabase()
    .then((db) => (db ? idbSaveProject(db, snapshot) : undefined))
    .catch((error) => {
      console.error('[storage] IndexedDB project save failed:', error);
    });
}

function persistLibraryAsync(lib: ProjectLibrary) {
  saveLibraryToLocalStorage(lib);

  if (!indexedDbAvailable) return;

  void openDatabase()
    .then((db) => (db ? idbSaveLibrary(db, lib) : undefined))
    .catch((error) => {
      console.error('[storage] IndexedDB library save failed:', error);
    });
}

function removeMigratedLocalProject(id: string) {
  try {
    localStorage.removeItem(projectKey(id));
  } catch {
    // Non-critical cleanup.
  }
}

async function readLegacyProject(): Promise<ProjectSnapshot | null> {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isProjectSnapshot(parsed) ? (parsed as ProjectSnapshot) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Initialization / migration
// ---------------------------------------------------------------------------

export async function migrateIfNeeded(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const localLibrary = loadLibraryFromLocalStorage();
    libraryCache = localLibrary;

    const db = await openDatabase();
    if (!db) {
      indexedDbAvailable = false;
      for (const meta of localLibrary.projects) {
        const snapshot = loadProjectFromLocalStorage(meta.id);
        if (snapshot) projectCache.set(meta.id, snapshot);
      }
      initialized = true;
      return;
    }

    const idbLibrary = await idbLoadLibrary(db);
    const idbProjects = await idbLoadProjects(db);
    projectCache.clear();
    for (const snapshot of idbProjects) {
      if (snapshot.id) projectCache.set(snapshot.id, snapshot);
    }

    let nextLibrary = idbLibrary?.projects.length ? idbLibrary : localLibrary;

    for (const meta of localLibrary.projects) {
      if (projectCache.has(meta.id)) continue;
      const localSnapshot = loadProjectFromLocalStorage(meta.id);
      if (!localSnapshot) continue;
      localSnapshot.id = localSnapshot.id || meta.id;
      projectCache.set(meta.id, localSnapshot);
      await idbSaveProject(db, localSnapshot);
      removeMigratedLocalProject(meta.id);
    }

    nextLibrary.projects = nextLibrary.projects.filter((project) => projectCache.has(project.id));

    const legacySnapshot = await readLegacyProject();
    if (legacySnapshot && nextLibrary.projects.length === 0) {
      legacySnapshot.id = createId();
      legacySnapshot.name = 'Meu Projeto';
      legacySnapshot.description = '';
      legacySnapshot.templates = [];
      projectCache.set(legacySnapshot.id, legacySnapshot);
      await idbSaveProject(db, legacySnapshot);
      nextLibrary = {
        version: LIBRARY_VERSION,
        projects: [buildProjectMeta(legacySnapshot, undefined)],
      };
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        // Non-critical cleanup.
      }
    }

    const knownIds = new Set(nextLibrary.projects.map((project) => project.id));
    for (const snapshot of projectCache.values()) {
      if (!snapshot.id || knownIds.has(snapshot.id)) continue;
      nextLibrary.projects.unshift(buildProjectMeta(snapshot, undefined));
      knownIds.add(snapshot.id);
    }

    libraryCache = nextLibrary;
    await idbSaveLibrary(db, libraryCache);
    saveLibraryToLocalStorage(libraryCache);
    initialized = true;
  })();

  return initPromise;
}

// ---------------------------------------------------------------------------
// Library helpers
// ---------------------------------------------------------------------------

export function loadLibrary(): ProjectLibrary {
  return cloneLibrary(libraryCache.projects.length || initialized ? libraryCache : loadLibraryFromLocalStorage());
}

export function saveLibrary(lib: ProjectLibrary): void {
  libraryCache = cloneLibrary(lib);
  persistLibraryAsync(libraryCache);
}

// ---------------------------------------------------------------------------
// Project CRUD
// ---------------------------------------------------------------------------

export function loadProject(id: string): ProjectSnapshot | null {
  const cached = projectCache.get(id);
  if (cached) return cloneSnapshot(cached);

  if (!indexedDbAvailable) {
    const fallback = loadProjectFromLocalStorage(id);
    if (fallback) projectCache.set(id, fallback);
    return fallback ? cloneSnapshot(fallback) : null;
  }

  return null;
}

/**
 * Persist a full project snapshot.
 * Also refreshes the matching entry in the library (meta only).
 * Pass `thumbnail` (base64 PNG) to update the preview shown on the home screen.
 */
export function saveProject(snapshot: ProjectSnapshot, thumbnail?: string): void {
  if (!snapshot.id) snapshot.id = createId();
  if (!snapshot.name) snapshot.name = 'Sem titulo';

  const snapshotClone = snapshot;
  projectCache.set(snapshotClone.id ?? '', snapshotClone);
  persistProjectAsync(snapshotClone);

  const lib = loadLibrary();
  const existingIndex = lib.projects.findIndex((p) => p.id === snapshotClone.id);
  const existing = existingIndex >= 0 ? lib.projects[existingIndex] : undefined;
  const updatedMeta = buildProjectMeta(snapshotClone, existing, thumbnail);

  if (existingIndex >= 0) {
    lib.projects[existingIndex] = updatedMeta;
  } else {
    lib.projects.unshift(updatedMeta);
  }

  saveLibrary(lib);
}

export function deleteProject(id: string): void {
  projectCache.delete(id);
  if (!indexedDbAvailable) {
    try {
      localStorage.removeItem(projectKey(id));
    } catch (e) {
      console.error('[storage] deleteProject localStorage failed:', e);
    }
  } else {
    void openDatabase()
      .then((db) => (db ? idbDeleteProject(db, id) : undefined))
      .catch((error) => console.error('[storage] IndexedDB project delete failed:', error));
  }

  const lib = loadLibrary();
  lib.projects = lib.projects.filter((p) => p.id !== id);
  saveLibrary(lib);
}

/**
 * Deep-clone a project under a new id.
 * Returns the new ProjectMeta on success, null if source not found.
 */
export function duplicateProject(id: string): ProjectMeta | null {
  const source = loadProject(id);
  if (!source) return null;

  const newId = createId();
  const sourceMeta = loadLibrary().projects.find((p) => p.id === id);

  const clone: ProjectSnapshot = {
    ...source,
    id: newId,
    name: `${source.name ?? 'Projeto'} (copia)`,
    cards: source.cards.map((c) => ({ ...c, id: createId() })),
    decks: source.decks?.map((deck) => ({
      ...deck,
      id: createId(),
      cards: deck.cards.map((card) => ({ ...card, id: createId() })),
    })),
    templates: source.templates ? [...source.templates] : [],
  };

  saveProject(clone, sourceMeta?.thumbnail ?? '');

  return loadLibrary().projects.find((p) => p.id === newId) ?? null;
}

// ---------------------------------------------------------------------------
// Import / Export
// ---------------------------------------------------------------------------

export function exportProjectAsJson(id: string): string | null {
  const snap = loadProject(id);
  if (!snap) return null;
  return JSON.stringify(snap, null, 2);
}

export function importProjectFromJson(json: string): ProjectMeta | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (!isProjectSnapshot(parsed)) return null;

  const snap = parsed as ProjectSnapshot;
  snap.id = createId();
  snap.name = snap.name ? `${snap.name} (importado)` : 'Projeto importado';
  snap.description = snap.description ?? '';
  snap.templates = snap.templates ?? [];

  saveProject(snap);

  return loadLibrary().projects.find((p) => p.id === snap.id) ?? null;
}

export function exportAllProjectsAsJson(): string {
  const projects = loadLibrary()
    .projects
    .map((meta) => loadProject(meta.id))
    .filter((snapshot): snapshot is ProjectSnapshot => Boolean(snapshot));

  const bundle: BackupBundle = {
    kind: 'board-card-studio-backup',
    version: 1,
    exportedAt: Date.now(),
    projects,
  };

  return JSON.stringify(bundle, null, 2);
}

export function importProjectsFromJson(json: string): ProjectMeta[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  if (isProjectSnapshot(parsed)) {
    const meta = importProjectFromJson(json);
    return meta ? [meta] : null;
  }

  if (!isBackupBundle(parsed)) return null;

  const imported: ProjectMeta[] = [];
  parsed.projects.forEach((project) => {
    const snap = cloneSnapshot(project);
    snap.id = createId();
    snap.name = snap.name ? `${snap.name} (backup)` : 'Projeto importado';
    snap.description = snap.description ?? '';
    snap.templates = snap.templates ?? [];
    saveProject(snap);
    const meta = loadLibrary().projects.find((candidate) => candidate.id === snap.id);
    if (meta) imported.push(meta);
  });

  return imported;
}

export async function getLocalStorageStatus(): Promise<LocalStorageStatus> {
  const storage = navigator.storage;
  const estimate = storage?.estimate ? await storage.estimate() : null;
  const persistent = storage?.persisted ? await storage.persisted() : false;

  return {
    indexedDbAvailable,
    persistent,
    usageBytes: typeof estimate?.usage === 'number' ? estimate.usage : null,
    quotaBytes: typeof estimate?.quota === 'number' ? estimate.quota : null,
  };
}

export async function requestLocalStoragePersistence(): Promise<boolean> {
  const storage = navigator.storage;
  if (!storage?.persist) return false;
  return storage.persist();
}

// ---------------------------------------------------------------------------
// Thumbnail updater
// ---------------------------------------------------------------------------

export function updateProjectThumbnail(id: string, thumbnail: string): void {
  const lib = loadLibrary();
  const meta = lib.projects.find((p) => p.id === id);
  if (!meta) return;
  meta.thumbnail = thumbnail;
  meta.updatedAt = Date.now();
  saveLibrary(lib);
}

// ---------------------------------------------------------------------------
// Project meta patch (rename, description, tags)
// ---------------------------------------------------------------------------

export function patchProjectMeta(
  id: string,
  patch: Partial<Pick<ProjectMeta, 'name' | 'description' | 'tags'>>,
): void {
  const lib = loadLibrary();
  const meta = lib.projects.find((p) => p.id === id);
  if (!meta) return;
  Object.assign(meta, patch, { updatedAt: Date.now() });
  saveLibrary(lib);

  const snap = loadProject(id);
  if (!snap) return;
  if (patch.name !== undefined) snap.name = patch.name;
  if (patch.description !== undefined) snap.description = patch.description;
  projectCache.set(id, cloneSnapshot(snap));
  persistProjectAsync(snap);
}
