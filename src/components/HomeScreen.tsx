import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Copy,
  DownloadCloud,
  FolderKanban,
  FileDown,
  FileUp,
  Plus,
  Trash2,
} from 'lucide-react';

import { CARD_PRESETS, clampCardDimension, createEmptyDeck, createId } from '../lib/editor';
import {
  deleteProject,
  duplicateProject,
  exportAllProjectsAsJson,
  exportProjectAsJson,
  getLocalStorageStatus,
  importProjectsFromJson,
  loadLibrary,
  requestLocalStoragePersistence,
  saveProject,
} from '../lib/storage';
import { downloadDataUrl, readFileAsText } from '../lib/editor';
import type { ProjectMeta } from '../types';
import type { LocalStorageStatus } from '../lib/storage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days}d`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function formatBytes(bytes: number | null) {
  if (bytes === null) return 'indisponivel';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unitIndex]}`;
}

function buildBackupFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `board-card-studio-backup-${date}.json`;
}

const WELCOME_DISMISSED_KEY = 'bcs-local-storage-welcome-dismissed';
const LAST_BACKUP_AT_KEY = 'bcs-last-backup-at';
const BACKUP_PROJECT_STATE_KEY = 'bcs-backup-project-state';
const BACKUP_REMINDER_DAYS = 7;
const BACKUP_REMINDER_CHANGES = 8;

function readStoredNumber(key: string) {
  const value = Number(localStorage.getItem(key) ?? '');
  return Number.isFinite(value) ? value : 0;
}

function readBackupProjectState() {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_PROJECT_STATE_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeBackupProjectState(projects: ProjectMeta[]) {
  localStorage.setItem(
    BACKUP_PROJECT_STATE_KEY,
    JSON.stringify(Object.fromEntries(projects.map((project) => [project.id, project.updatedAt]))),
  );
}

function countProjectChangesSinceBackup(projects: ProjectMeta[]) {
  const state = readBackupProjectState();
  return projects.filter((project) => (state[project.id] ?? 0) !== project.updatedAt).length;
}

function currentTimestamp() {
  return Date.now();
}

// ---------------------------------------------------------------------------
// New Project Modal
// ---------------------------------------------------------------------------

interface NewProjectModalProps {
  onConfirm: (name: string, description: string, width: number, height: number) => void;
  onClose: () => void;
}

const CUSTOM_PRESET_ID = 'custom';

function NewProjectModal({ onConfirm, onClose }: NewProjectModalProps) {
  const [name, setName] = useState('Novo Projeto');
  const [description, setDescription] = useState('');
  const [presetId, setPresetId] = useState(CARD_PRESETS[0].id);
  const [customWidth, setCustomWidth] = useState(CARD_PRESETS[0].width);
  const [customHeight, setCustomHeight] = useState(CARD_PRESETS[0].height);
  const backdropMouseDownRef = useRef(false);

  const isCustom = presetId === CUSTOM_PRESET_ID;
  const selectedPreset = CARD_PRESETS.find((preset) => preset.id === presetId) ?? CARD_PRESETS[0];
  const resolvedWidth = isCustom ? clampCardDimension(customWidth) : selectedPreset.width;
  const resolvedHeight = isCustom ? clampCardDimension(customHeight) : selectedPreset.height;

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    backdropMouseDownRef.current = event.target === event.currentTarget;
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (backdropMouseDownRef.current && event.target === event.currentTarget) {
      onClose();
    }
    backdropMouseDownRef.current = false;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), description.trim(), resolvedWidth, resolvedHeight);
  };

  return (
    <div className="hs-modal-backdrop" onMouseDown={handleBackdropMouseDown} onClick={handleBackdropClick}>
      <div className="hs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hs-modal__header">
          <h2>Novo Projeto</h2>
          <button type="button" className="hs-modal__close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="hs-modal__body">
          <div className="hs-field">
            <label htmlFor="proj-name">Nome do projeto</label>
            <input
              id="proj-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={60}
              placeholder="Meu Jogo de Cartas"
            />
          </div>

          <div className="hs-field">
            <label htmlFor="proj-desc">Descrição <span>(opcional)</span></label>
            <input
              id="proj-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={120}
              placeholder="Breve descrição do projeto…"
            />
          </div>

          <div className="hs-field">
            <label>Tamanho das cartas</label>
            <div className="hs-preset-grid">
              {CARD_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`hs-preset-btn${presetId === preset.id ? ' hs-preset-btn--active' : ''}`}
                  onClick={() => setPresetId(preset.id)}
                >
                  <span className="hs-preset-btn__name">{preset.label}</span>
                  <span className="hs-preset-btn__size">{preset.width}×{preset.height}</span>
                </button>
              ))}
              <button
                type="button"
                className={`hs-preset-btn${isCustom ? ' hs-preset-btn--active' : ''}`}
                onClick={() => setPresetId(CUSTOM_PRESET_ID)}
              >
                <span className="hs-preset-btn__name">Personalizado</span>
                <span className="hs-preset-btn__size">{resolvedWidth}×{resolvedHeight}</span>
              </button>
            </div>
            {isCustom ? (
              <div className="hs-custom-size">
                <label>
                  <span>Largura</span>
                  <input
                    type="number"
                    min={240}
                    max={2000}
                    value={customWidth}
                    onChange={(event) => setCustomWidth(Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Altura</span>
                  <input
                    type="number"
                    min={240}
                    max={2000}
                    value={customHeight}
                    onChange={(event) => setCustomHeight(Number(event.target.value))}
                  />
                </label>
                <small>Limite: 240 a 2000 px.</small>
              </div>
            ) : null}
          </div>

          <div className="hs-modal__footer">
            <button type="button" className="hs-btn hs-btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="hs-btn hs-btn--primary" disabled={!name.trim()}>
              <Plus size={14} />
              Criar Projeto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Card
// ---------------------------------------------------------------------------

interface ProjectCardProps {
  meta: ProjectMeta;
  onOpen: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}

function ProjectCard({ meta, onOpen, onDuplicate, onExport, onDelete }: ProjectCardProps) {
  const aspectRatio = meta.cardHeight > 0 ? meta.cardWidth / meta.cardHeight : 0.714;
  const thumbH = 146;
  const thumbW = Math.round(thumbH * aspectRatio);

  return (
    <div className="hs-proj-card" onDoubleClick={onOpen}>
      {/* Thumbnail */}
      <div className="hs-proj-card__thumb" style={{ width: thumbW, height: thumbH }}>
        {meta.thumbnail ? (
          <img src={meta.thumbnail} alt={meta.name} />
        ) : (
          <div className="hs-proj-card__thumb-empty">
            <span>BCS</span>
          </div>
        )}
        {/* Hover overlay */}
        <div className="hs-proj-card__overlay">
          <button
            type="button"
            className="hs-proj-card__open-btn"
            onClick={onOpen}
            title="Abrir projeto"
          >
            <FolderKanban size={14} />
            Entrar
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="hs-proj-card__meta">
        <strong className="hs-proj-card__name" title={meta.name}>{meta.name}</strong>
        {meta.description && (
          <p className="hs-proj-card__desc">{meta.description}</p>
        )}
        <div className="hs-proj-card__info">
          <span>{meta.cardCount} {meta.cardCount === 1 ? 'carta' : 'cartas'}</span>
          <span className="hs-proj-card__dot">·</span>
          <span>{formatDate(meta.updatedAt)}</span>
        </div>
        <div className="hs-proj-card__actions">
          <button type="button" onClick={onDuplicate} title="Duplicar projeto">
            <Copy size={11} />
          </button>
          <button type="button" onClick={onExport} title="Exportar projeto">
            <FileDown size={11} />
          </button>
          <button type="button" onClick={onDelete} title="Excluir projeto" className="hs-proj-card__delete">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

interface HomeScreenProps {
  onOpenProject: (id: string) => void;
}

export function HomeScreen({ onOpenProject }: HomeScreenProps) {
  const [projects, setProjects] = useState<ProjectMeta[]>(() => loadLibrary().projects);
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<LocalStorageStatus | null>(null);
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(() => localStorage.getItem(WELCOME_DISMISSED_KEY) !== '1');
  const [now, setNow] = useState(() => Date.now());
  const importRef = useRef<HTMLInputElement>(null);

  const refreshStorageStatus = async () => {
    try {
      setStorageStatus(await getLocalStorageStatus());
    } catch {
      setStorageStatus(null);
    }
  };

  const refresh = () => {
    setNow(currentTimestamp());
    setProjects(loadLibrary().projects);
    void refreshStorageStatus();
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNow(currentTimestamp());
      void refreshStorageStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  const handleCreate = (name: string, description: string, width: number, height: number) => {
    const newId = createId();
    saveProject({
      version: 1,
      id: newId,
      name,
      description,
      decks: [createEmptyDeck('Principal', width, height)],
      cards: [],
      graphics: [],
      fonts: [],
      templates: [],
    });

    onOpenProject(newId);
  };

  // ---------------------------------------------------------------------------
  // Duplicate
  // ---------------------------------------------------------------------------

  const handleDuplicate = (id: string) => {
    duplicateProject(id);
    refresh();
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  const handleExport = (id: string, name: string) => {
    const json = exportProjectAsJson(id);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const safeName = (name || 'projeto').replace(/\s+/g, '-').toLowerCase();
    downloadDataUrl(`${safeName}.json`, url);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleExportAll = () => {
    const json = exportAllProjectsAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(buildBackupFileName(), url);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    localStorage.setItem(LAST_BACKUP_AT_KEY, String(currentTimestamp()));
    writeBackupProjectState(loadLibrary().projects);
    refresh();
  };

  const dismissWelcome = () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, '1');
    setIsWelcomeVisible(false);
  };

  const handleRequestPersistence = async () => {
    const persisted = await requestLocalStoragePersistence();
    await refreshStorageStatus();
    if (!persisted) {
      alert('Seu navegador nao ativou protecao extra. Seus projetos continuam salvos localmente, mas mantenha backups.');
    }
  };

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  const handleDelete = (id: string) => {
    deleteProject(id);
    setDeleteConfirmId(null);
    refresh();
  };

  // ---------------------------------------------------------------------------
  // Import
  // ---------------------------------------------------------------------------

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const imported = importProjectsFromJson(text);
      if (!imported?.length) {
        alert('Arquivo inválido ou corrompido.');
        return;
      }
      refresh();
    } catch {
      alert('Nao foi possivel importar o projeto.');
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const usageRatio = storageStatus?.usageBytes !== null && storageStatus?.quotaBytes
    ? Math.min(100, Math.round((storageStatus.usageBytes / storageStatus.quotaBytes) * 100))
    : null;
  const lastBackupAt = readStoredNumber(LAST_BACKUP_AT_KEY);
  const daysSinceBackup = lastBackupAt ? Math.floor((now - lastBackupAt) / 86_400_000) : null;
  const changedProjects = countProjectChangesSinceBackup(projects);
  const shouldSuggestBackup = projects.length > 0 && (
    !lastBackupAt ||
    (daysSinceBackup !== null && daysSinceBackup >= BACKUP_REMINDER_DAYS) ||
    changedProjects >= BACKUP_REMINDER_CHANGES
  );

  return (
    <div className="hs">
      {/* ── Top bar ── */}
      <header className="hs-topbar">
        <div className="hs-topbar__brand">
          <div className="hs-topbar__logo">BCS</div>
          <div>
            <div className="hs-topbar__title">Board Card Studio</div>
            <div className="hs-topbar__subtitle">Gerenciador de projetos</div>
          </div>
        </div>

        <div className="hs-topbar__actions">
          <button
            type="button"
            className="hs-btn hs-btn--ghost"
            onClick={() => importRef.current?.click()}
          >
            <FileUp size={14} />
            Importar backup
          </button>
          <button
            type="button"
            className="hs-btn hs-btn--primary"
            onClick={() => setShowNewModal(true)}
          >
            <Plus size={14} />
            Novo Projeto
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="hs-content">
        {isWelcomeVisible ? (
          <section className="hs-welcome-card">
            <div className="hs-welcome-card__icon">
              <Archive size={22} />
            </div>
            <div>
              <span>Antes de começar</span>
              <h2>Seus projetos ficam salvos neste navegador.</h2>
              <p>Use <strong>Backup completo</strong> para não perder dados ao trocar de computador, limpar o navegador ou reinstalar o app.</p>
            </div>
            <div className="hs-welcome-card__actions">
              <button type="button" className="hs-btn hs-btn--primary" onClick={handleExportAll} disabled={projects.length === 0}>
                <DownloadCloud size={14} />
                Fazer backup
              </button>
              <button type="button" className="hs-btn hs-btn--ghost" onClick={dismissWelcome}>
                Entendi
              </button>
            </div>
          </section>
        ) : null}

        {shouldSuggestBackup ? (
          <section className="hs-backup-reminder">
            <AlertTriangle size={17} />
            <div>
              <strong>Backup recomendado</strong>
              <span>
                {!lastBackupAt
                  ? 'Voce ainda nao exportou um backup completo.'
                  : `${changedProjects} projeto(s) mudaram desde o ultimo backup${daysSinceBackup !== null ? `, feito ha ${daysSinceBackup} dia(s)` : ''}.`}
              </span>
            </div>
            <button type="button" className="hs-btn hs-btn--primary" onClick={handleExportAll}>
              <FileDown size={14} />
              Exportar tudo
            </button>
          </section>
        ) : null}

        <section className="hs-storage-card">
          <div className="hs-storage-card__main">
            <div className={storageStatus?.persistent ? 'hs-storage-card__icon hs-storage-card__icon--ok' : 'hs-storage-card__icon'}>
              {storageStatus?.persistent ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            </div>
            <div>
              <strong>Salvo neste navegador</strong>
              <p>Projetos, cartas e imagens ficam neste dispositivo. Para trocar de computador ou limpar o navegador, exporte um backup.</p>
              <div className="hs-storage-meter">
                <span style={{ width: `${usageRatio ?? 0}%` }} />
              </div>
              <small>
                {storageStatus
                  ? `${formatBytes(storageStatus.usageBytes)} usados${storageStatus.quotaBytes ? ` de ${formatBytes(storageStatus.quotaBytes)}` : ''}`
                  : 'Calculando armazenamento local...'}
              </small>
            </div>
          </div>

          <div className="hs-storage-card__actions">
            <span className={storageStatus?.persistent ? 'hs-storage-pill hs-storage-pill--ok' : 'hs-storage-pill'}>
              {storageStatus?.persistent ? 'Protecao ativa' : 'Backup recomendado'}
            </span>
            {!storageStatus?.persistent ? (
              <button type="button" className="hs-btn hs-btn--ghost" onClick={handleRequestPersistence}>
                Proteger dados locais
              </button>
            ) : null}
            <button type="button" className="hs-btn hs-btn--ghost" onClick={handleExportAll} disabled={projects.length === 0}>
              <FileDown size={14} />
              Exportar tudo
            </button>
          </div>
        </section>
        {projects.length === 0 ? (
          // Empty state
          <div className="hs-empty">
            <div className="hs-empty__icon">
              <FolderKanban size={38} />
            </div>
            <h2>Nenhum projeto ainda</h2>
            <p>Crie seu primeiro projeto para começar a editar cartas.</p>
            <button
              type="button"
              className="hs-btn hs-btn--primary"
              onClick={() => setShowNewModal(true)}
            >
              <Plus size={14} />
              Criar Projeto
            </button>
          </div>
        ) : (
          <>
            <div className="hs-section-head">
              <span className="hs-section-label">Projetos recentes</span>
              <span className="hs-section-count">{projects.length}</span>
            </div>

            <div className="hs-grid">
              {/* New project shortcut card */}
              <button
                type="button"
                className="hs-new-card"
                onClick={() => setShowNewModal(true)}
              >
                <div className="hs-new-card__icon">
                  <Plus size={22} />
                </div>
                <span>Novo Projeto</span>
              </button>

              {projects.map((meta) => (
                <ProjectCard
                  key={meta.id}
                  meta={meta}
                  onOpen={() => onOpenProject(meta.id)}
                  onDuplicate={() => handleDuplicate(meta.id)}
                  onExport={() => handleExport(meta.id, meta.name)}
                  onDelete={() => setDeleteConfirmId(meta.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── Modals ── */}
      {showNewModal && (
        <NewProjectModal
          onConfirm={handleCreate}
          onClose={() => setShowNewModal(false)}
        />
      )}

      {deleteConfirmId && (
        <div className="hs-modal-backdrop" onClick={() => setDeleteConfirmId(null)}>
          <div className="hs-modal hs-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="hs-modal__header">
              <h2>Excluir projeto?</h2>
            </div>
            <div className="hs-modal__body">
              <p className="hs-modal__confirm-text">
                Esta ação não pode ser desfeita. O projeto e todos os dados serão removidos.
              </p>
              <div className="hs-modal__footer">
                <button
                  type="button"
                  className="hs-btn hs-btn--ghost"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="hs-btn hs-btn--danger"
                  onClick={() => handleDelete(deleteConfirmId)}
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          await handleImport(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
