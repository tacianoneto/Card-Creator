import type { CSSProperties, DragEvent, KeyboardEvent, ReactNode } from 'react';
import { useMemo, useRef, useState } from 'react';

import {
  Award,
  BookMarked,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Crown,
  Dice5,
  Eye,
  EyeOff,
  FileImage,
  FileType2,
  Folder,
  FolderPlus,
  Frame,
  Gem,
  GripVertical,
  Group,
  ImagePlus,
  Lock,
  Minus,
  Plus,
  ScanFace,
  Search,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Ungroup,
  Unlock,
  UserSquare2,
} from 'lucide-react';

import { getGroupColor } from '../lib/editor';
import type { AssetFolder, CardElement, CardElementType, CardTemplate, EditorMode, FontAsset, GraphicAsset, SidebarTab } from '../types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidebarProps {
  activeTab: SidebarTab;
  onChangeTab: (tab: SidebarTab) => void;
  onAddElement: (type: CardElementType) => void;
  graphics: GraphicAsset[];
  assetFolders: AssetFolder[];
  fonts: FontAsset[];
  layers: CardElement[];
  selectedElementIds: string[];
  groupNames: Record<string, string>;
  onSelectLayer: (elementId: string, additive?: boolean) => void;
  collapsedGroupIds: string[];
  onToggleGroup: (groupId: string) => void;
  onSelectGroup: (groupId: string, additive?: boolean) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onGroupSelectedLayers: () => void;
  onUngroupSelectedLayers: () => void;
  onSetSelectedLayersLocked: (locked: boolean) => void;
  onSetSelectedLayersHidden: (hidden: boolean) => void;
  onMoveLayer: (elementId: string, direction: 'forward' | 'backward') => void;
  onReorderLayer: (draggedId: string, targetId: string) => void;
  onToggleLayerLock: (elementId: string) => void;
  onToggleLayerHide: (elementId: string) => void;
  onRenameLayer: (elementId: string, name: string) => void;
  onDuplicateLayer: (elementId: string) => void;
  onDeleteLayer: (elementId: string) => void;
  onInsertGraphic: (graphic: GraphicAsset) => void;
  onUseGraphicAsBackground: (graphic: GraphicAsset) => void;
  onAddAssetFolder: (name: string, parentId?: string) => void;
  onUpdateAssetFolder: (folderId: string, patch: Partial<AssetFolder>) => void;
  onDeleteAssetFolder: (folderId: string) => void;
  onDuplicateAssetFolder: (folderId: string) => void;
  onUpdateGraphicAsset: (assetId: string, patch: Partial<GraphicAsset>) => void;
  onDuplicateGraphicAsset: (assetId: string) => void;
  onDeleteGraphicAsset: (assetId: string) => void;
  optimizeImageUploads: boolean;
  onToggleOptimizeImageUploads: (enabled: boolean) => void;
  onRequestGraphicUpload: (folderId?: string) => void;
  onRequestFontUpload: () => void;
  // Template system (Phase 6)
  templates?: CardTemplate[];
  authoringMode?: EditorMode;
  editingTemplate?: CardTemplate | null;
  onSaveCardAsTemplate?: (name: string, description: string) => void;
  onApplyTemplate?: (template: CardTemplate, asNewCard: boolean) => void;
  onDeleteTemplate?: (templateId: string) => void;
}

// ---------------------------------------------------------------------------
// Element action list
// ---------------------------------------------------------------------------

const elementActions: { type: CardElementType; label: string; icon: ReactNode }[] = [
  { type: 'portrait', label: 'Retrato',  icon: <UserSquare2 size={16} /> },
  { type: 'image',    label: 'Imagem',   icon: <ImagePlus size={16} /> },
  { type: 'text',     label: 'Texto',    icon: <Type size={16} /> },
  { type: 'title',    label: 'Título',   icon: <Crown size={16} /> },
  { type: 'separator', label: 'Separador', icon: <Minus size={16} /> },
  { type: 'info',     label: 'Caixa',    icon: <ScanFace size={16} /> },
  { type: 'number',   label: 'Número',   icon: <Plus size={16} /> },
  { type: 'die',      label: 'Dado',     icon: <Dice5 size={16} /> },
  { type: 'frame',    label: 'Moldura',  icon: <Frame size={16} /> },
  { type: 'shape',    label: 'Forma',    icon: <Shapes size={16} /> },
  { type: 'icon',     label: 'Ícone',    icon: <Sparkles size={16} /> },
  { type: 'marker',   label: 'Marcador', icon: <Sparkles size={16} /> },
  { type: 'counter',  label: 'Contador', icon: <Gem size={16} /> },
  { type: 'seal',     label: 'Selo',     icon: <Award size={16} /> },
];

// ---------------------------------------------------------------------------
// Save-as-template modal
// ---------------------------------------------------------------------------

interface SaveTemplateModalProps {
  initialDescription?: string;
  initialName: string;
  submitLabel?: string;
  title?: string;
  onConfirm: (name: string, description: string) => void;
  onClose: () => void;
}

function SaveTemplateModal({
  initialDescription = '',
  initialName,
  submitLabel = 'Salvar',
  title = 'Salvar como Modelo',
  onConfirm,
  onClose,
}: SaveTemplateModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), description.trim());
  };

  return (
    <div className="sidebar-modal-backdrop" onClick={onClose}>
      <div className="sidebar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-modal__header">
          <span>{title}</span>
          <button type="button" className="sidebar-modal__close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="sidebar-modal__body">
          <div className="sidebar-modal__field">
            <label>Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={50}
              placeholder="Ex: Carta de Criatura"
            />
          </div>
          <div className="sidebar-modal__field">
            <label>Descrição <span>(opcional)</span></label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={80}
              placeholder="Breve descrição…"
            />
          </div>
          <div className="sidebar-modal__footer">
            <button type="button" className="sidebar-modal__btn sidebar-modal__btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="sidebar-modal__btn sidebar-modal__btn--primary" disabled={!name.trim()}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Apply-template modal
// ---------------------------------------------------------------------------

interface ApplyTemplateModalProps {
  template: CardTemplate;
  onApply: (asNewCard: boolean) => void;
  onClose: () => void;
}

function ApplyTemplateModal({ template, onApply, onClose }: ApplyTemplateModalProps) {
  return (
    <div className="sidebar-modal-backdrop" onClick={onClose}>
      <div className="sidebar-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-modal__header">
          <span>Aplicar — {template.name}</span>
          <button type="button" className="sidebar-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="sidebar-modal__body">
          {template.description && (
            <p className="sidebar-modal__desc">{template.description}</p>
          )}
          <p className="sidebar-modal__question">Como deseja aplicar este modelo?</p>
          <div className="sidebar-modal__apply-options">
            <button
              type="button"
              className="sidebar-modal__apply-btn"
              onClick={() => { onApply(false); onClose(); }}
            >
              <strong>Substituir carta atual</strong>
              <span>Substitui os elementos da carta ativa pelo modelo.</span>
            </button>
            <button
              type="button"
              className="sidebar-modal__apply-btn"
              onClick={() => { onApply(true); onClose(); }}
            >
              <strong>Criar nova carta</strong>
              <span>Adiciona uma nova carta baseada no modelo.</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function collectFolderDescendants(folderId: string, folders: AssetFolder[]) {
  const ids = new Set<string>([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }
  return ids;
}

function flattenAssetFolders(folders: AssetFolder[], parentId: string | null = null, depth = 0): Array<AssetFolder & { depth: number }> {
  return folders
    .filter((folder) => (folder.parentId ?? null) === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((folder) => [
      { ...folder, depth },
      ...flattenAssetFolders(folders, folder.id, depth + 1),
    ]);
}

function buildFolderPath(folderId: string | null, folderById: Map<string, AssetFolder>) {
  const path: AssetFolder[] = [];
  let cursor = folderId ? folderById.get(folderId) : null;
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? folderById.get(cursor.parentId) ?? null : null;
  }
  return path;
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function Sidebar({
  activeTab,
  onChangeTab,
  onAddElement,
  graphics,
  assetFolders,
  fonts,
  layers,
  selectedElementIds,
  groupNames,
  onSelectLayer,
  collapsedGroupIds,
  onToggleGroup,
  onSelectGroup,
  onRenameGroup,
  onGroupSelectedLayers,
  onUngroupSelectedLayers,
  onSetSelectedLayersLocked,
  onSetSelectedLayersHidden,
  onMoveLayer,
  onReorderLayer,
  onToggleLayerLock,
  onToggleLayerHide,
  onRenameLayer,
  onDuplicateLayer,
  onDeleteLayer,
  onInsertGraphic,
  onUseGraphicAsBackground,
  onAddAssetFolder,
  onUpdateAssetFolder,
  onDeleteAssetFolder,
  onDuplicateAssetFolder,
  onUpdateGraphicAsset,
  onDuplicateGraphicAsset,
  onDeleteGraphicAsset,
  optimizeImageUploads,
  onToggleOptimizeImageUploads,
  onRequestGraphicUpload,
  onRequestFontUpload,
  templates = [],
  authoringMode = 'manual',
  editingTemplate = null,
  onSaveCardAsTemplate,
  onApplyTemplate,
  onDeleteTemplate,
}: SidebarProps) {
  // Layer drag/rename state
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingLayerName, setEditingLayerName] = useState('');
  const [layerSearch, setLayerSearch] = useState('');
  const [selectedAssetFolderId, setSelectedAssetFolderId] = useState<string | null>(null);
  const [selectedAssetItem, setSelectedAssetItem] = useState<{ type: 'asset' | 'folder'; id: string } | null>(null);
  const [renamingAssetItem, setRenamingAssetItem] = useState<{ type: 'asset' | 'folder'; id: string } | null>(null);
  const [assetRenameValue, setAssetRenameValue] = useState('');
  const [newAssetFolderName, setNewAssetFolderName] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const assetRenameInputRef = useRef<HTMLInputElement>(null);
  const showLegacyAssetPanel = useMemo(() => new URLSearchParams(window.location.search).has('legacy-assets'), []);

  // Template modal state
  const [showSaveModal, setShowSaveModal] = useState(false);

  const sortedLayers = useMemo(() => [...layers].sort((a, b) => b.zIndex - a.zIndex), [layers]);
  const visibleLayers = useMemo(() => {
    const query = layerSearch.trim().toLowerCase();
    if (!query) return sortedLayers;
    return sortedLayers.filter((layer) => {
      const groupName = layer.groupId ? groupNames[layer.groupId] ?? '' : '';
      return [
        layer.name,
        layer.type,
        groupName,
        layer.locked ? 'bloqueada' : '',
        layer.hidden ? 'oculta' : '',
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [groupNames, layerSearch, sortedLayers]);
  const groupedLayers = useMemo(() => visibleLayers.reduce<Record<string, CardElement[]>>((groups, layer) => {
    if (!layer.groupId) return groups;
    groups[layer.groupId] = [...(groups[layer.groupId] ?? []), layer];
    return groups;
  }, {}), [visibleLayers]);
  const renderedGroups = new Set<string>();
  const folderById = useMemo(() => new Map(assetFolders.map((folder) => [folder.id, folder])), [assetFolders]);
  const currentAssetFolderId = selectedAssetFolderId && folderById.has(selectedAssetFolderId)
    ? selectedAssetFolderId
    : null;
  const currentAssetFolder = currentAssetFolderId ? folderById.get(currentAssetFolderId) ?? null : null;
  const visibleAssetFolders = useMemo(
    () => assetFolders
      .filter((folder) => (folder.parentId ?? null) === currentAssetFolderId)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [assetFolders, currentAssetFolderId],
  );
  const visibleGraphics = useMemo(
    () => graphics
      .filter((asset) => (asset.folderId ?? null) === currentAssetFolderId)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [graphics, currentAssetFolderId],
  );
  const selectedAsset = useMemo(
    () => selectedAssetItem?.type === 'asset'
      ? graphics.find((asset) => asset.id === selectedAssetItem.id) ?? null
      : null,
    [graphics, selectedAssetItem],
  );
  const selectedAssetFolder = selectedAssetItem?.type === 'folder'
    ? folderById.get(selectedAssetItem.id) ?? null
    : null;
  const selectedAssetFolderDescendants = useMemo(
    () => selectedAssetFolder
      ? collectFolderDescendants(selectedAssetFolder.id, assetFolders)
      : new Set<string>(),
    [assetFolders, selectedAssetFolder],
  );
  const assetFolderOptions = useMemo(() => flattenAssetFolders(assetFolders), [assetFolders]);
  const currentFolderPath = useMemo(
    () => buildFolderPath(currentAssetFolderId, folderById),
    [currentAssetFolderId, folderById],
  );

  const submitAssetFolder = () => {
    const cleanName = newAssetFolderName.trim();
    if (!cleanName) return;
    onAddAssetFolder(cleanName, currentAssetFolderId ?? undefined);
    setNewAssetFolderName('');
  };

  const openAssetFolder = (folderId: string | null) => {
    setSelectedAssetFolderId(folderId);
    setSelectedAssetItem(null);
    setRenamingAssetItem(null);
  };

  const startAssetRename = (item: { type: 'asset' | 'folder'; id: string }, currentName: string) => {
    setSelectedAssetItem(item);
    setRenamingAssetItem(item);
    setAssetRenameValue(currentName);
    setTimeout(() => assetRenameInputRef.current?.select(), 0);
  };

  const commitAssetRename = () => {
    const cleanName = assetRenameValue.trim();
    if (renamingAssetItem && cleanName) {
      if (renamingAssetItem.type === 'asset') onUpdateGraphicAsset(renamingAssetItem.id, { name: cleanName });
      else onUpdateAssetFolder(renamingAssetItem.id, { name: cleanName });
    }
    setRenamingAssetItem(null);
  };

  const handleAssetRenameKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') commitAssetRename();
    if (event.key === 'Escape') setRenamingAssetItem(null);
  };
  const [applyTarget, setApplyTarget] = useState<CardTemplate | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const isTemplateAuthoring = authoringMode === 'template';
  const templateSaveLabel = editingTemplate
    ? 'Atualizar modelo'
    : isTemplateAuthoring
      ? 'Salvar modelo'
      : 'Salvar carta';
  const templateSaveTitle = editingTemplate
    ? `Atualizar ${editingTemplate.name}`
    : isTemplateAuthoring
      ? 'Salvar modelo atual'
      : 'Salvar carta atual como modelo';

  // ---------------------------------------------------------------------------
  // Layer rename
  // ---------------------------------------------------------------------------

  const startRename = (layer: CardElement) => {
    setEditingLayerId(layer.id);
    setEditingLayerName(layer.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const startGroupRename = (groupId: string) => {
    setEditingLayerId(`group:${groupId}`);
    setEditingLayerName(groupNames[groupId] ?? 'Grupo');
    setTimeout(() => renameInputRef.current?.select(), 0);
  };

  const commitRename = () => {
    if (editingLayerId && editingLayerName.trim()) {
      if (editingLayerId.startsWith('group:')) {
        onRenameGroup(editingLayerId.slice(6), editingLayerName.trim());
      } else {
        onRenameLayer(editingLayerId, editingLayerName.trim());
      }
    }
    setEditingLayerId(null);
  };

  const handleRenameKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitRename();
    if (e.key === 'Escape') setEditingLayerId(null);
  };

  // ---------------------------------------------------------------------------
  // Layer drag-and-drop
  // ---------------------------------------------------------------------------

  const startLayerDrag = (event: DragEvent<HTMLElement>, layerId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', layerId);
    setDraggingLayerId(layerId);
  };

  const dropLayer = (event: DragEvent<HTMLElement>, targetId: string) => {
    event.preventDefault();
    const draggedId = draggingLayerId ?? event.dataTransfer.getData('text/plain');
    setDraggingLayerId(null);
    setDragOverLayerId(null);
    if (!draggedId || draggedId === targetId) return;
    onReorderLayer(draggedId, targetId);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar__tabs">
          <Tab active={activeTab === 'elements'}  onClick={() => onChangeTab('elements')}>Elementos</Tab>
          <Tab active={activeTab === 'templates'} onClick={() => onChangeTab('templates')}>Modelos</Tab>
          <Tab active={activeTab === 'assets'}    onClick={() => onChangeTab('assets')}>Assets</Tab>
          <Tab active={activeTab === 'layers'}    onClick={() => onChangeTab('layers')}>Camadas</Tab>
        </div>

        {/* ── ELEMENTOS ── */}
        {activeTab === 'elements' && (
          <div className="sidebar__stack">
            <div>
              <div className="sidebar__section-head">
                <span className="sidebar__section-label">Adicionar elemento</span>
              </div>
              <div className="sidebar__element-grid">
                {elementActions.map((action) => (
                  <button
                    key={action.type}
                    type="button"
                    className="sidebar__element-card"
                    onClick={() => onAddElement(action.type)}
                  >
                    <div className="sidebar__element-icon">{action.icon}</div>
                    <div className="sidebar__element-copy">
                      <strong>{action.label}</strong>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MODELOS ── */}
        {activeTab === 'templates' && (
          <div className="sidebar__stack">

            {/* ── Modelos do Projeto (user-saved) ── */}
            <div>
              <div className="sidebar__section-head">
                <span className="sidebar__section-label">
                  Modelos do Projeto
                  {templates.length > 0 && (
                    <span className="sidebar__section-count">{templates.length}</span>
                  )}
                </span>
                {onSaveCardAsTemplate && (
                  <button
                    type="button"
                    className="sidebar__section-action"
                    title={templateSaveTitle}
                    onClick={() => setShowSaveModal(true)}
                  >
                    <Plus size={12} />
                    {templateSaveLabel}
                  </button>
                )}
              </div>

              {templates.length === 0 ? (
                <div className="sidebar__template-empty">
                  <BookMarked size={22} />
                  <p>Nenhum modelo salvo.</p>
                  {onSaveCardAsTemplate && (
                    <button
                      type="button"
                      className="sidebar__template-empty-btn"
                      onClick={() => setShowSaveModal(true)}
                    >
                      <Plus size={12} />
                      {templateSaveLabel}
                    </button>
                  )}
                </div>
              ) : (
                <div className="sidebar__template-list">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="sidebar__template-card">
                      {/* Thumbnail */}
                      <div className="sidebar__template-thumb">
                        {tpl.thumbnail ? (
                          <img src={tpl.thumbnail} alt={tpl.name} />
                        ) : (
                          <div className="sidebar__template-thumb-empty">BCS</div>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="sidebar__template-meta">
                        <strong>{tpl.name}</strong>
                        {tpl.description && <span>{tpl.description}</span>}
                        <div className="sidebar__template-actions">
                          {onApplyTemplate && (
                            <button
                              type="button"
                              className="sidebar__template-action-btn sidebar__template-action-btn--apply"
                              onClick={() => setApplyTarget(tpl)}
                            >
                              Aplicar
                            </button>
                          )}
                          {onDeleteTemplate && (
                            <button
                              type="button"
                              className="sidebar__template-action-btn sidebar__template-action-btn--delete"
                              onClick={() => setDeleteTargetId(tpl.id)}
                              title="Remover modelo"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ── ASSETS ── */}
        {activeTab === 'assets' && (
          <div className="sidebar__stack sidebar__stack--assets">
            <div className="asset-explorer">
              <div className="asset-explorer__toolbar">
                <button type="button" title="Enviar imagens para esta pasta" onClick={() => onRequestGraphicUpload(currentAssetFolderId ?? undefined)}>
                  <FileImage size={14} />
                  Upload
                </button>
                <button type="button" title="Enviar fontes" onClick={onRequestFontUpload}>
                  <FileType2 size={14} />
                  Fontes
                </button>
              </div>
              <label className="asset-explorer__optimize-toggle">
                <input
                  type="checkbox"
                  checked={optimizeImageUploads}
                  onChange={(event) => onToggleOptimizeImageUploads(event.target.checked)}
                />
                <span>
                  <strong>Otimizar PNG grande</strong>
                  <small>Converte para WebP quando reduzir peso.</small>
                </span>
              </label>

              <div className="asset-explorer__new-folder">
                <input
                  type="text"
                  value={newAssetFolderName}
                  onChange={(e) => setNewAssetFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitAssetFolder();
                  }}
                  placeholder={currentAssetFolder ? `Nova pasta em ${currentAssetFolder.name}` : 'Nova pasta'}
                />
                <button type="button" title="Criar pasta" onClick={submitAssetFolder}>
                  <FolderPlus size={13} />
                </button>
              </div>

              <div className="asset-explorer__crumbs">
                <button type="button" className={!currentAssetFolderId ? 'asset-explorer__crumb asset-explorer__crumb--active' : 'asset-explorer__crumb'} onClick={() => openAssetFolder(null)}>
                  Assets
                </button>
                {currentFolderPath.map((folder) => (
                  <button key={folder.id} type="button" className="asset-explorer__crumb" onClick={() => openAssetFolder(folder.id)}>
                    <ChevronRight size={11} />
                    {folder.name}
                  </button>
                ))}
              </div>

              <div className="asset-explorer__body">
                <nav className="asset-explorer__tree" aria-label="Pastas de assets">
                  <button
                    type="button"
                    className={!currentAssetFolderId ? 'asset-tree-row asset-tree-row--active' : 'asset-tree-row'}
                    onClick={() => openAssetFolder(null)}
                  >
                    <Folder size={13} />
                    <span>Assets</span>
                  </button>
                  {assetFolderOptions.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      className={currentAssetFolderId === folder.id ? 'asset-tree-row asset-tree-row--active' : 'asset-tree-row'}
                      style={{ paddingLeft: 8 + folder.depth * 14 }}
                      onClick={() => openAssetFolder(folder.id)}
                    >
                      <Folder size={13} />
                      <span>{folder.name}</span>
                    </button>
                  ))}
                </nav>

                <div className="asset-explorer__list" role="listbox" aria-label="Conteudo da pasta atual">
                  {visibleAssetFolders.length === 0 && visibleGraphics.length === 0 ? (
                    <div className="asset-explorer__empty">
                      <Folder size={20} />
                      <span>Pasta vazia</span>
                    </div>
                  ) : (
                    <>
                      {visibleAssetFolders.map((folder) => {
                        const isSelected = selectedAssetItem?.type === 'folder' && selectedAssetItem.id === folder.id;
                        const isRenaming = renamingAssetItem?.type === 'folder' && renamingAssetItem.id === folder.id;
                        return (
                          <button
                            key={folder.id}
                            type="button"
                            className={isSelected ? 'asset-file-row asset-file-row--selected' : 'asset-file-row'}
                            onClick={() => setSelectedAssetItem({ type: 'folder', id: folder.id })}
                            onDoubleClick={() => openAssetFolder(folder.id)}
                          >
                            <Folder size={16} />
                            {isRenaming ? (
                              <input
                                ref={assetRenameInputRef}
                                value={assetRenameValue}
                                onChange={(e) => setAssetRenameValue(e.target.value)}
                                onBlur={commitAssetRename}
                                onKeyDown={handleAssetRenameKey}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span>{folder.name}</span>
                            )}
                            <small>Pasta</small>
                          </button>
                        );
                      })}
                      {visibleGraphics.map((asset) => {
                        const isSelected = selectedAssetItem?.type === 'asset' && selectedAssetItem.id === asset.id;
                        const isRenaming = renamingAssetItem?.type === 'asset' && renamingAssetItem.id === asset.id;
                        return (
                          <button
                            key={asset.id}
                            type="button"
                            className={isSelected ? 'asset-file-row asset-file-row--selected' : 'asset-file-row'}
                            onClick={() => setSelectedAssetItem({ type: 'asset', id: asset.id })}
                            onDoubleClick={() => onInsertGraphic(asset)}
                          >
                            <img src={asset.src} alt={asset.name} />
                            {isRenaming ? (
                              <input
                                ref={assetRenameInputRef}
                                value={assetRenameValue}
                                onChange={(e) => setAssetRenameValue(e.target.value)}
                                onBlur={commitAssetRename}
                                onKeyDown={handleAssetRenameKey}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span>{asset.name}</span>
                            )}
                            <small>{asset.kind === 'icon' ? 'Icone' : 'Imagem'}</small>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

              {(selectedAsset || selectedAssetFolder) && (
                <div className="asset-explorer__details">
                  {selectedAssetFolder && (
                    <>
                      <strong>{selectedAssetFolder.name}</strong>
                      <select
                        value={selectedAssetFolder.parentId ?? ''}
                        onChange={(event) => onUpdateAssetFolder(selectedAssetFolder.id, { parentId: event.target.value || undefined })}
                      >
                        <option value="">Assets</option>
                        {assetFolderOptions
                          .filter((folder) => folder.id !== selectedAssetFolder.id && !selectedAssetFolderDescendants.has(folder.id))
                          .map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {'  '.repeat(folder.depth)}{folder.name}
                            </option>
                          ))}
                      </select>
                      <div className="asset-explorer__detail-actions">
                        <button type="button" onClick={() => openAssetFolder(selectedAssetFolder.id)}>Abrir</button>
                        <button type="button" onClick={() => startAssetRename({ type: 'folder', id: selectedAssetFolder.id }, selectedAssetFolder.name)}>Renomear</button>
                        <button type="button" onClick={() => onDuplicateAssetFolder(selectedAssetFolder.id)}>Duplicar</button>
                        <button type="button" className="asset-explorer__danger" onClick={() => { onDeleteAssetFolder(selectedAssetFolder.id); setSelectedAssetItem(null); }}>Excluir</button>
                      </div>
                    </>
                  )}
                  {selectedAsset && (
                    <>
                      <strong>{selectedAsset.name}</strong>
                      <div className="asset-explorer__detail-fields">
                        <select value={selectedAsset.kind ?? 'image'} onChange={(e) => onUpdateGraphicAsset(selectedAsset.id, { kind: e.target.value as GraphicAsset['kind'] })}>
                          <option value="image">Imagem</option>
                          <option value="icon">Icone</option>
                        </select>
                        <select value={selectedAsset.folderId ?? ''} onChange={(e) => onUpdateGraphicAsset(selectedAsset.id, { folderId: e.target.value || undefined })}>
                          <option value="">Assets</option>
                          {assetFolderOptions.map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {'  '.repeat(folder.depth)}{folder.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="asset-explorer__detail-actions">
                        <button type="button" onClick={() => onInsertGraphic(selectedAsset)}>Inserir</button>
                        <button type="button" onClick={() => onUseGraphicAsBackground(selectedAsset)}>Fundo</button>
                        <button type="button" onClick={() => startAssetRename({ type: 'asset', id: selectedAsset.id }, selectedAsset.name)}>Renomear</button>
                        <button type="button" onClick={() => onDuplicateGraphicAsset(selectedAsset.id)}>Duplicar</button>
                        <button type="button" className="asset-explorer__danger" onClick={() => { onDeleteGraphicAsset(selectedAsset.id); setSelectedAssetItem(null); }}>Excluir</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {fonts.length > 0 && (
                <div className="asset-explorer__fonts">
                  <span>Fontes ({fonts.length})</span>
                  {fonts.map((f) => (
                    <div key={f.id} className="sidebar__font-card">
                      <strong style={{ fontFamily: f.family }}>{f.family}</strong>
                      <span>{f.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {showLegacyAssetPanel && (
              <>
            <div>
              <div className="sidebar__section-head">
                <span className="sidebar__section-label">Upload</span>
              </div>
              <div className="sidebar__upload-actions">
                <button type="button" onClick={() => onRequestGraphicUpload()}>
                  <FileImage size={14} />
                  Imagens / ícones / molduras
                </button>
                <button type="button" onClick={onRequestFontUpload}>
                  <FileType2 size={14} />
                  Fontes (.ttf, .otf, .woff)
                </button>
              </div>
            </div>

            <div className="sidebar__divider" />

            <div>
              <div className="sidebar__section-head">
                <span className="sidebar__section-label">Pastas</span>
              </div>
              <div className="sidebar__asset-folder-row">
                <input
                  type="text"
                  value={newAssetFolderName}
                  onChange={(e) => setNewAssetFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitAssetFolder();
                  }}
                  placeholder="Nova pasta"
                />
                <button type="button" title="Criar pasta" onClick={submitAssetFolder}>
                  <FolderPlus size={13} />
                </button>
              </div>
              <div className="sidebar__asset-folder-tabs">
                <button type="button" className={selectedAssetFolderId === 'all' ? 'sidebar__asset-folder-tab sidebar__asset-folder-tab--active' : 'sidebar__asset-folder-tab'} onClick={() => setSelectedAssetFolderId('all')}>Todos</button>
                <button type="button" className={selectedAssetFolderId === 'unfiled' ? 'sidebar__asset-folder-tab sidebar__asset-folder-tab--active' : 'sidebar__asset-folder-tab'} onClick={() => setSelectedAssetFolderId('unfiled')}>Sem pasta</button>
                {assetFolders.map((folder) => (
                  <button key={folder.id} type="button" className={selectedAssetFolderId === folder.id ? 'sidebar__asset-folder-tab sidebar__asset-folder-tab--active' : 'sidebar__asset-folder-tab'} onClick={() => setSelectedAssetFolderId(folder.id)}>
                    <Folder size={12} />
                    {folder.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="sidebar__divider" />

            <div>
              <div className="sidebar__section-head">
                <span className="sidebar__section-label">Gráficos ({visibleGraphics.length}/{graphics.length})</span>
              </div>
              {graphics.length === 0 ? (
                <p className="sidebar__hint">Nenhuma imagem carregada.</p>
              ) : visibleGraphics.length === 0 ? (
                <p className="sidebar__hint">Nenhum asset nesta pasta.</p>
              ) : (
                <div className="sidebar__asset-list">
                  {visibleGraphics.map((g) => (
                    <article key={g.id} className="sidebar__asset-card">
                      <img src={g.src} alt={g.name} />
                      <div className="sidebar__asset-meta">
                        <strong>{g.name}</strong>
                        <div className="sidebar__asset-controls">
                          <select value={g.kind ?? 'image'} onChange={(e) => onUpdateGraphicAsset(g.id, { kind: e.target.value as GraphicAsset['kind'] })}>
                            <option value="image">Imagem</option>
                            <option value="icon">Icone</option>
                          </select>
                          <select value={g.folderId ?? ''} onChange={(e) => onUpdateGraphicAsset(g.id, { folderId: e.target.value || undefined })}>
                            <option value="">Sem pasta</option>
                            {assetFolders.map((folder) => (
                              <option key={folder.id} value={folder.id}>{folder.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sidebar__asset-actions">
                          <button type="button" onClick={() => onInsertGraphic(g)}>Inserir</button>
                          <button type="button" onClick={() => onUseGraphicAsBackground(g)}>Fundo</button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {fonts.length > 0 && (
              <>
                <div className="sidebar__divider" />
                <div>
                  <div className="sidebar__section-head">
                    <span className="sidebar__section-label">Fontes ({fonts.length})</span>
                  </div>
                  <div className="sidebar__font-list">
                    {fonts.map((f) => (
                      <div key={f.id} className="sidebar__font-card">
                        <strong style={{ fontFamily: f.family }}>{f.family}</strong>
                        <span>{f.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
              </>
            )}
          </div>
        )}

        {/* ── CAMADAS ── */}
        {activeTab === 'layers' && (
          <div className="sidebar__stack">
            <div>
              <div className="sidebar__section-head">
                <span className="sidebar__section-label">
                  Pilha de camadas ({visibleLayers.length}/{layers.length})
                </span>
              </div>
              <div className="sidebar__layer-tools">
                <label className="sidebar__layer-search">
                  <Search size={13} />
                  <input
                    type="search"
                    value={layerSearch}
                    onChange={(event) => setLayerSearch(event.target.value)}
                    placeholder="Buscar camada, tipo ou grupo"
                  />
                </label>
                {selectedElementIds.length > 0 ? (
                  <div className="sidebar__layer-bulk-actions">
                    <button type="button" title="Agrupar selecao" disabled={selectedElementIds.length < 2} onClick={onGroupSelectedLayers}>
                      <Group size={12} />
                    </button>
                    <button type="button" title="Desagrupar selecao" onClick={onUngroupSelectedLayers}>
                      <Ungroup size={12} />
                    </button>
                    <button type="button" title="Ocultar selecao" onClick={() => onSetSelectedLayersHidden(true)}>
                      <EyeOff size={12} />
                    </button>
                    <button type="button" title="Mostrar selecao" onClick={() => onSetSelectedLayersHidden(false)}>
                      <Eye size={12} />
                    </button>
                    <button type="button" title="Bloquear selecao" onClick={() => onSetSelectedLayersLocked(true)}>
                      <Lock size={12} />
                    </button>
                    <button type="button" title="Desbloquear selecao" onClick={() => onSetSelectedLayersLocked(false)}>
                      <Unlock size={12} />
                    </button>
                  </div>
                ) : null}
              </div>

              {layers.length === 0 ? (
                <p className="sidebar__hint">Nenhum elemento ainda. Adicione pela aba Elementos.</p>
              ) : visibleLayers.length === 0 ? (
                <p className="sidebar__hint">Nenhuma camada encontrada.</p>
              ) : (
                <div className="sidebar__layer-list">
                  {visibleLayers
                    .flatMap((layer) => {
                      if (!layer.groupId) return [layer];
                      if (renderedGroups.has(layer.groupId)) return [];
                      renderedGroups.add(layer.groupId);
                      const members = groupedLayers[layer.groupId] ?? [];
                      return collapsedGroupIds.includes(layer.groupId)
                        ? [{ groupId: layer.groupId, members }]
                        : [{ groupId: layer.groupId, members }, ...members];
                    })
                    .map((entry) => {
                      if ('members' in entry) {
                        const groupId = entry.groupId;
                        const members = entry.members;
                        const isCollapsed = collapsedGroupIds.includes(groupId);
                        const groupName = groupNames[groupId] ?? 'Grupo';
                        const selectableMembers = members.filter((item) => !item.locked);
                        const isSelected =
                          selectableMembers.length > 0 &&
                          selectableMembers.every((item) => selectedElementIds.includes(item.id));
                        const className = [
                          'sidebar__layer-card',
                          'sidebar__layer-card--group',
                          isSelected ? 'sidebar__layer-card--selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ');

                        return (
                          <div
                            key={`group-${groupId}`}
                            className={className}
                            style={{ '--group-color': getGroupColor(groupId) } as CSSProperties}
                          >
                            <button
                              type="button"
                              className="sidebar__layer-toggle"
                              title={isCollapsed ? 'Expandir grupo' : 'Recolher grupo'}
                              onClick={() => onToggleGroup(groupId)}
                            >
                              {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                            </button>
                            <button
                              type="button"
                              className="sidebar__layer-select"
                              title="Selecionar grupo"
                              onClick={(event) =>
                                onSelectGroup(groupId, event.shiftKey || event.ctrlKey || event.metaKey)
                              }
                            >
                              <Folder size={14} />
                              {editingLayerId === `group:${groupId}` ? (
                                <input
                                  ref={renameInputRef}
                                  className="sidebar__layer-rename-input"
                                  value={editingLayerName}
                                  onChange={(e) => setEditingLayerName(e.target.value)}
                                  onBlur={commitRename}
                                  onKeyDown={handleRenameKey}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <strong
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    startGroupRename(groupId);
                                  }}
                                >
                                  {groupName}
                                </strong>
                              )}
                              <span>{members.length} camadas</span>
                            </button>
                            <div className="sidebar__layer-actions">
                              <button
                                type="button"
                                title="Renomear grupo"
                                onClick={() => startGroupRename(groupId)}
                              >
                                <FileType2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      }

                      const layer = entry;
                      const isLocked = layer.locked === true;
                      const isSelected = !isLocked && selectedElementIds.includes(layer.id);
                      const className = [
                        'sidebar__layer-card',
                        layer.groupId ? 'sidebar__layer-card--child' : '',
                        isSelected ? 'sidebar__layer-card--selected' : '',
                        isLocked ? 'sidebar__layer-card--locked' : '',
                        draggingLayerId === layer.id ? 'sidebar__layer-card--dragging' : '',
                        dragOverLayerId === layer.id && draggingLayerId !== layer.id
                          ? 'sidebar__layer-card--drop-target'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      const isHidden = layer.hidden === true;

                      return (
                        <div
                          key={layer.id}
                          className={className}
                          style={{
                            ...(layer.groupId
                              ? ({ '--group-color': getGroupColor(layer.groupId) } as CSSProperties)
                              : undefined),
                            opacity: isHidden ? 0.45 : undefined,
                          }}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                            setDragOverLayerId(layer.id);
                          }}
                          onDragLeave={() => setDragOverLayerId((id) => (id === layer.id ? null : id))}
                          onDrop={(event) => dropLayer(event, layer.id)}
                        >
                          <span
                            className="sidebar__layer-drag"
                            draggable
                            title="Arrastar para reordenar"
                            onDragStart={(event) => startLayerDrag(event, layer.id)}
                            onDragEnd={() => {
                              setDraggingLayerId(null);
                              setDragOverLayerId(null);
                            }}
                          >
                            <GripVertical size={13} />
                          </span>
                          <button
                            type="button"
                            className="sidebar__layer-select"
                            title={isLocked ? 'Camada bloqueada' : 'Selecionar esta camada'}
                            disabled={isLocked}
                            onClick={(event) =>
                              onSelectLayer(layer.id, event.shiftKey || event.ctrlKey || event.metaKey)
                            }
                          >
                            {layer.groupId ? <span className="sidebar__layer-group-dot" /> : null}
                            {editingLayerId === layer.id ? (
                              <input
                                ref={renameInputRef}
                                className="sidebar__layer-rename-input"
                                value={editingLayerName}
                                onChange={(e) => setEditingLayerName(e.target.value)}
                                onBlur={commitRename}
                                onKeyDown={handleRenameKey}
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <strong
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  startRename(layer);
                                }}
                              >
                                {layer.name}
                              </strong>
                            )}
                            <span>
                              {layer.type}
                              {layer.groupId ? ' · grupo' : ''}
                              {isLocked ? ' · bloqueada' : ''}
                              {isHidden ? ' · oculta' : ''}
                            </span>
                          </button>
                          <div className="sidebar__layer-actions">
                            <button
                              type="button"
                              title="Renomear"
                              onClick={() => startRename(layer)}
                            >
                              <FileType2 size={12} />
                            </button>
                            <button
                              type="button"
                              title={isHidden ? 'Mostrar camada' : 'Ocultar camada'}
                              className={
                                isHidden
                                  ? 'sidebar__layer-lock sidebar__layer-lock--active'
                                  : 'sidebar__layer-lock'
                              }
                              onClick={() => onToggleLayerHide(layer.id)}
                            >
                              {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                            </button>
                            <button
                              type="button"
                              title={isLocked ? 'Desbloquear camada' : 'Bloquear camada'}
                              className={
                                isLocked
                                  ? 'sidebar__layer-lock sidebar__layer-lock--active'
                                  : 'sidebar__layer-lock'
                              }
                              onClick={() => onToggleLayerLock(layer.id)}
                            >
                              {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                            </button>
                            <button
                              type="button"
                              title="Subir camada"
                              onClick={() => onMoveLayer(layer.id, 'forward')}
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              type="button"
                              title="Descer camada"
                              onClick={() => onMoveLayer(layer.id, 'backward')}
                            >
                              <ChevronDown size={12} />
                            </button>
                            <button
                              type="button"
                              title="Duplicar"
                              onClick={() => onDuplicateLayer(layer.id)}
                            >
                              <Copy size={12} />
                            </button>
                            <button
                              type="button"
                              title="Remover"
                              onClick={() => onDeleteLayer(layer.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* ── Modals (rendered outside aside to avoid stacking-context clipping) ── */}

      {showSaveModal && (
        <SaveTemplateModal
          initialDescription={editingTemplate?.description ?? ''}
          initialName={editingTemplate?.name ?? (layers.length > 0 ? 'Modelo sem título' : 'Modelo sem título')}
          submitLabel={editingTemplate ? 'Atualizar' : 'Salvar'}
          title={editingTemplate ? 'Atualizar modelo' : 'Salvar como Modelo'}
          onConfirm={(name, description) => {
            onSaveCardAsTemplate?.(name, description);
            setShowSaveModal(false);
          }}
          onClose={() => setShowSaveModal(false)}
        />
      )}

      {applyTarget && (
        <ApplyTemplateModal
          template={applyTarget}
          onApply={(asNewCard) => onApplyTemplate?.(applyTarget, asNewCard)}
          onClose={() => setApplyTarget(null)}
        />
      )}

      {deleteTargetId && (
        <div className="sidebar-modal-backdrop" onClick={() => setDeleteTargetId(null)}>
          <div className="sidebar-modal sidebar-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="sidebar-modal__header">
              <span>Remover modelo?</span>
              <button type="button" className="sidebar-modal__close" onClick={() => setDeleteTargetId(null)}>✕</button>
            </div>
            <div className="sidebar-modal__body">
              <p className="sidebar-modal__desc">Esta ação não pode ser desfeita.</p>
              <div className="sidebar-modal__footer">
                <button
                  type="button"
                  className="sidebar-modal__btn sidebar-modal__btn--ghost"
                  onClick={() => setDeleteTargetId(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="sidebar-modal__btn sidebar-modal__btn--danger"
                  onClick={() => {
                    onDeleteTemplate?.(deleteTargetId);
                    setDeleteTargetId(null);
                  }}
                >
                  <Trash2 size={12} />
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Tab helper
// ---------------------------------------------------------------------------

function Tab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? 'sidebar__tab sidebar__tab--active' : 'sidebar__tab'}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
