import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ChevronLeft,
  Database,
  Download,
  FileDown,
  FileUp,
  FlipHorizontal2,
  FlipVertical2,
  Grid2x2,
  Group,
  Magnet,
  Plus,
  RefreshCcw,
  Redo2,
  Undo2,
  Ungroup,
} from 'lucide-react';

import { CanvasStage } from './CanvasStage';
import { CardStrip } from './CardStrip';
import { InspectorPanel } from './InspectorPanel';
import { Sidebar } from './Sidebar';
import { useEditorAutosave } from '../hooks/useEditorAutosave';
import { useResizablePanel } from '../hooks/useResizablePanel';
import {
  CARD_PRESETS,
  createElement,
  createEmptyCard,
  createEmptyDeck,
  createId,
  DECK_COLORS,
  DEFAULT_FONTS,
  downloadDataUrl,
  duplicateElement,
  getNextZIndex,
  inferFontFamily,
  isProjectSnapshot,
  moveElementLayer,
  readFileAsDataUrl,
  readImageFileAsOptimizedDataUrl,
  readFileAsText,
  registerFontAsset,
  reorderElementLayer,
  SYSTEM_FONT_FALLBACKS,
} from '../lib/editor';
import {
  historyLimitFor,
  queueIdleTask,
  shouldAutoCaptureThumbnail,
} from '../lib/editorTiming';
import {
  applyDynamicFieldValue,
  getDynamicFields,
} from '../lib/dynamicFields';
import {
  isStorageQuotaWarning,
  loadProject,
  saveProject,
  updateProjectThumbnail,
} from '../lib/storage';
import type {
  AlignmentMode,
  CardDocument,
  CardElement,
  CardElementPatch,
  CardTemplate,
  Deck,
  EditorMode,
  FlipAxis,
  FontAsset,
  GraphicAsset,
  AssetFolder,
  ProjectSnapshot,
  SidebarTab,
  TextStyleSpan,
} from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const THUMBNAIL_DELAY_MS = 6500;
const TOAST_DURATION_MS = 3200;

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

interface CardsHistory {
  past: CardDocument[][];
  future: CardDocument[][];
}

type ToastTone = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  tone: ToastTone;
  message: string;
}

interface ElementContextMenuState {
  elementId: string;
  x: number;
  y: number;
}

interface FindReplaceStats {
  cards: number;
  elements: number;
  matches: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

const yieldToBrowser = () =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });

const getExportFileName = (deckName: string, card: CardDocument, cardIndex: number, deckIndex: number) => {
  const safeDeck = deckName.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').toLowerCase() || `baralho-${deckIndex + 1}`;
  const safeCard = card.name.trim().replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '-').toLowerCase() || `carta-${cardIndex + 1}`;
  return `${safeDeck}--${String(cardIndex + 1).padStart(2, '0')}-${safeCard}.png`;
};

type ToPngOptions = Parameters<(typeof import('html-to-image'))['toPng']>[1];
interface LocalFontData {
  family: string;
  fullName?: string;
  postscriptName?: string;
  style?: string;
}

let htmlToImageLoader: Promise<typeof import('html-to-image')> | null = null;
const manualFontCssCache = new WeakMap<FontAsset[], string>();

function cssString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function inferFontFormat(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'woff2') return 'woff2';
  if (ext === 'woff') return 'woff';
  if (ext === 'otf') return 'opentype';
  return 'truetype';
}

function buildManualFontEmbedCSS(fontAssets: FontAsset[]) {
  if (fontAssets.length === 0) return '';
  const cached = manualFontCssCache.get(fontAssets);
  if (cached !== undefined) return cached;
  const css = fontAssets
    .map((font) => {
      const family = cssString(font.family);
      const format = inferFontFormat(font.name);
      return `@font-face{font-family:"${family}";src:url("${font.src}") format("${format}");font-weight:100 900;font-style:normal;font-display:block;}`;
    })
    .join('\n');
  manualFontCssCache.set(fontAssets, css);
  return css;
}

async function renderNodeToPng(node: HTMLElement, options?: ToPngOptions, fontAssets: FontAsset[] = []) {
  htmlToImageLoader ??= import('html-to-image');
  const { getFontEmbedCSS, toPng } = await htmlToImageLoader;
  const shouldClipForCapture = node.classList.contains('card-surface')
    && !node.classList.contains('card-surface--exporting');

  if (shouldClipForCapture) node.classList.add('card-surface--exporting');

  try {
    const libraryFontCSS = await getFontEmbedCSS(node, options).catch(() => '');
    const manualFontCSS = buildManualFontEmbedCSS(fontAssets);
    const fontEmbedCSS = [libraryFontCSS, manualFontCSS].filter(Boolean).join('\n');
    return await toPng(node, fontEmbedCSS ? { ...options, fontEmbedCSS } : options);
  } finally {
    if (shouldClipForCapture) node.classList.remove('card-surface--exporting');
  }
}

const STYLE_COPY_IGNORED_KEYS = new Set([
  'id',
  'type',
  'name',
  'x',
  'y',
  'width',
  'height',
  'locked',
  'hidden',
  'groupId',
  'zIndex',
  'binding',
  'content',
  'richContent',
  'src',
  'customSrc',
  'iconName',
  'value',
  'maxValue',
  'label',
  'title',
  'body',
  'text',
  'subtitle',
  'symbol',
  'sides',
]);

function buildStylePatch(source: CardElement, target: CardElement): CardElementPatch {
  const targetKeys = new Set(Object.keys(target));
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (STYLE_COPY_IGNORED_KEYS.has(key) || !targetKeys.has(key)) continue;
    patch[key] = value;
  }
  return patch as CardElementPatch;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countTextMatches(value: string, query: string, matchCase: boolean) {
  if (!query) return 0;
  const matcher = new RegExp(escapeRegExp(query), matchCase ? 'g' : 'gi');
  return value.match(matcher)?.length ?? 0;
}

function replaceTextMatches(value: string, query: string, replacement: string, matchCase: boolean) {
  if (!query) return value;
  const matcher = new RegExp(escapeRegExp(query), matchCase ? 'g' : 'gi');
  return value.replace(matcher, replacement);
}

function getElementTextFields(element: CardElement): string[] {
  switch (element.type) {
    case 'text':
      return ['content'];
    case 'title':
      return ['text', 'subtitle'];
    case 'info':
      return ['title', 'body'];
    case 'number':
    case 'marker':
    case 'seal':
    case 'bar':
      return ['label'];
    default:
      return [];
  }
}

function getFindReplaceStats(cards: CardDocument[], query: string, matchCase: boolean): FindReplaceStats {
  if (!query) return { cards: 0, elements: 0, matches: 0 };
  const matchedCardIds = new Set<string>();
  const matchedElementIds = new Set<string>();
  let matches = 0;

  for (const card of cards) {
    for (const element of card.elements) {
      const elementRecord = element as unknown as Record<string, unknown>;
      let elementMatches = 0;
      for (const field of getElementTextFields(element)) {
        const value = elementRecord[field];
        if (typeof value === 'string') elementMatches += countTextMatches(value, query, matchCase);
      }
      if (element.type === 'text' && element.richContent?.length) {
        elementMatches += element.richContent.reduce(
          (total, span) => total + countTextMatches(span.text, query, matchCase),
          0,
        );
      }
      if (elementMatches > 0) {
        matchedCardIds.add(card.id);
        matchedElementIds.add(element.id);
        matches += elementMatches;
      }
    }
  }

  return { cards: matchedCardIds.size, elements: matchedElementIds.size, matches };
}

function replaceTextInDeck(cards: CardDocument[], query: string, replacement: string, matchCase: boolean) {
  const stats = getFindReplaceStats(cards, query, matchCase);
  if (stats.matches === 0) return { cards, stats };

  const nextCards = cards.map((card) => ({
    ...card,
    elements: card.elements.map((element) => {
      const elementRecord = element as unknown as Record<string, unknown>;
      const patch: Record<string, unknown> = {};
      for (const field of getElementTextFields(element)) {
        const value = elementRecord[field];
        if (typeof value === 'string') {
          patch[field] = replaceTextMatches(value, query, replacement, matchCase);
        }
      }
      if (element.type === 'text' && element.richContent?.length) {
        patch.richContent = element.richContent.map((span) => ({
          ...span,
          text: replaceTextMatches(span.text, query, replacement, matchCase),
        }));
      }
      return Object.keys(patch).length > 0 ? ({ ...element, ...patch } as CardElement) : element;
    }),
  }));

  return { cards: nextCards, stats };
}

function cloneCardDocument(card: CardDocument): CardDocument {
  return {
    ...card,
    background: { ...card.background },
    groupNames: card.groupNames ? { ...card.groupNames } : undefined,
    elements: card.elements.map((element) => ({ ...element })),
  };
}

function cloneTemplateCardForEditing(template: CardTemplate): CardDocument {
  return {
    ...cloneCardDocument(template.card),
    name: template.name,
  };
}

/** Resolve decks from a stored snapshot, migrating legacy `cards[]` if needed. */
function resolveDecks(stored: ProjectSnapshot | null): Deck[] {
  if (stored?.decks && stored.decks.length > 0) return stored.decks;

  // Legacy migration: flat cards → single deck "Principal"
  const cards = stored?.cards?.length ? stored.cards : [];
  const firstCard = cards[0];
  return [
    {
      id: createId(),
      name: 'Principal',
      color: DECK_COLORS[0],
      cardWidth: firstCard?.width ?? CARD_PRESETS[0].width,
      cardHeight: firstCard?.height ?? CARD_PRESETS[0].height,
      cards: cards.length > 0 ? cards : [createEmptyCard()],
      description: '',
    },
  ];
}

function resolveInitialData(projectId: string, options?: { initialDeckId?: null | string }) {
  const stored = loadProject(projectId);
  const decks = resolveDecks(stored);
  const initialDeckId =
    options?.initialDeckId && decks.some((deck) => deck.id === options.initialDeckId)
      ? options.initialDeckId
      : decks[0]?.id;
  return {
    decks,
    graphics: stored?.graphics ?? [],
    assetFolders: stored?.assetFolders ?? [],
    fonts: stored?.fonts ?? [],
    templates: stored?.templates ?? [],
    projectName: stored?.name ?? 'Sem título',
    projectDescription: stored?.description ?? '',
    initialDeckId: initialDeckId ?? decks[0]?.id ?? '',
  };
}

// ---------------------------------------------------------------------------
// New Deck Modal (inline in editor)
// ---------------------------------------------------------------------------

interface NewDeckModalProps {
  existingCount: number;
  onConfirm: (name: string, presetId: string) => void;
  onClose: () => void;
}

function NewDeckModal({ existingCount, onConfirm, onClose }: NewDeckModalProps) {
  const [name, setName] = useState(`Baralho ${existingCount + 1}`);
  const [presetId, setPresetId] = useState(CARD_PRESETS[0].id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), presetId);
  };

  return (
    <div className="hs-modal-backdrop" onClick={onClose}>
      <div className="hs-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hs-modal__header">
          <h2>Novo Baralho</h2>
          <button type="button" className="hs-modal__close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="hs-modal__body">
          <div className="hs-field">
            <label htmlFor="deck-name">Nome do baralho</label>
            <input
              id="deck-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={40}
              placeholder="Ex: Cartas de Ação"
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
                  <span className="hs-preset-btn__name">{preset.label.split(' ')[0]}</span>
                  <span className="hs-preset-btn__size">{preset.width}×{preset.height}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="hs-modal__footer">
            <button type="button" className="hs-btn hs-btn--ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="hs-btn hs-btn--primary" disabled={!name.trim()}>
              <Plus size={13} />
              Criar Baralho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface FindReplaceModalProps {
  deckName: string;
  query: string;
  replacement: string;
  matchCase: boolean;
  stats: FindReplaceStats;
  onQueryChange: (value: string) => void;
  onReplacementChange: (value: string) => void;
  onMatchCaseChange: (value: boolean) => void;
  onReplaceAll: () => void;
  onClose: () => void;
}

function FindReplaceModal({
  deckName,
  query,
  replacement,
  matchCase,
  stats,
  onQueryChange,
  onReplacementChange,
  onMatchCaseChange,
  onReplaceAll,
  onClose,
}: FindReplaceModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onReplaceAll();
  };

  return (
    <div className="find-modal-backdrop" onMouseDown={onClose}>
      <form className="find-modal" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="find-modal__header">
          <div>
            <h2>Buscar e substituir</h2>
            <span>{deckName}</span>
          </div>
          <button type="button" className="find-modal__close" onClick={onClose}>Fechar</button>
        </div>

        <div className="find-modal__body">
          <label className="find-modal__field">
            <span>Buscar</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Texto atual"
            />
          </label>

          <label className="find-modal__field">
            <span>Substituir por</span>
            <input
              type="text"
              value={replacement}
              onChange={(event) => onReplacementChange(event.target.value)}
              placeholder="Novo texto"
            />
          </label>

          <label className="find-modal__check">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(event) => onMatchCaseChange(event.target.checked)}
            />
            Diferenciar maiusculas/minusculas
          </label>

          <div className="find-modal__stats" aria-live="polite">
            <strong>{stats.matches}</strong>
            <span>ocorrencia(s)</span>
            <strong>{stats.elements}</strong>
            <span>elemento(s)</span>
            <strong>{stats.cards}</strong>
            <span>carta(s)</span>
          </div>
        </div>

        <div className="find-modal__footer">
          <button type="button" className="find-modal__ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="find-modal__primary" disabled={!query || stats.matches === 0}>
            Substituir tudo
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface EditorScreenProps {
  projectId: string;
  mode: EditorMode;
  initialDeckId?: null | string;
  launchTemplateId?: null | string;
  onGoHome: () => void;
}

export function EditorScreen({
  projectId,
  mode,
  initialDeckId,
  launchTemplateId,
  onGoHome: onGoHomeProp,
}: EditorScreenProps) {
  const [initialData] = useState(() => resolveInitialData(projectId, { initialDeckId }));

  // ── Core state ──────────────────────────────────────────────────────────
  const [decks, setDecks] = useState<Deck[]>(initialData.decks);
  const [activeDeckId, setActiveDeckId] = useState<string>(initialData.initialDeckId);
  const [activeCardId, setActiveCardId] = useState<string>(
    initialData.decks.find((deck) => deck.id === initialData.initialDeckId)?.cards[0].id ??
      initialData.decks[0].cards[0].id,
  );
  const [selectionStateIds, setSelectionStateIds] = useState<string[]>([]);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>(mode === 'template' ? 'templates' : 'elements');
  const [graphics, setGraphics] = useState<GraphicAsset[]>(initialData.graphics);
  const [assetFolders, setAssetFolders] = useState<AssetFolder[]>(initialData.assetFolders);
  const [fonts, setFonts] = useState<FontAsset[]>(initialData.fonts);
  const [systemFonts, setSystemFonts] = useState<string[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>(initialData.templates);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateDraftCard, setTemplateDraftCard] = useState<CardDocument | null>(null);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<string[]>([]);
  const [history, setHistory] = useState<CardsHistory>({ past: [], future: [] });
  const [zoom, setZoom] = useState(0.64);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [dataEditModeRequested, setDataEditModeRequested] = useState(false);
  const [elementContextMenu, setElementContextMenu] = useState<ElementContextMenuState | null>(null);
  const [showFindReplaceModal, setShowFindReplaceModal] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceValue, setReplaceValue] = useState('');
  const [findMatchCase, setFindMatchCase] = useState(false);
  const [showNewDeckModal, setShowNewDeckModal] = useState(false);
  const [isCanvasInteracting, setIsCanvasInteracting] = useState(false);
  const [sidebarWidth, beginSidebarResize] = useResizablePanel(252, 220, 520, 'right');
  const [inspectorWidth, beginInspectorResize] = useResizablePanel(320, 270, 520, 'left');
  const launchTemplateHandledRef = useRef(false);

  // ── Refs ────────────────────────────────────────────────────────────────
  const cardRef = useRef<HTMLDivElement>(null);
  const decksRef = useRef<Deck[]>(decks);
  const activeDeckIdRef = useRef<string>(activeDeckId);
  const historyRef = useRef<CardsHistory>(history);
  const graphicUploadRef = useRef<HTMLInputElement>(null);
  const pendingGraphicFolderIdRef = useRef<string | undefined>(undefined);
  const fontUploadRef = useRef<HTMLInputElement>(null);
  const projectImportRef = useRef<HTMLInputElement>(null);
  const dragHistorySnapshotRef = useRef<CardDocument[] | null>(null);
  const altDragSnapshotRef = useRef<CardDocument[] | null>(null);
  const clipboardRef = useRef<CardElement[]>([]);
  const projectNameRef = useRef(initialData.projectName);
  const projectDescriptionRef = useRef(initialData.projectDescription);
  const templatesRef = useRef(templates);
  const editingTemplateIdRef = useRef<string | null>(editingTemplateId);
  const templateDraftCardRef = useRef<CardDocument | null>(templateDraftCard);
  const previewSpaceTimerRef = useRef<number | null>(null);
  const copiedStyleRef = useRef<CardElement | null>(null);
  const pendingCanvasMoveRef = useRef<{ elementId: string; x: number; y: number } | null>(null);
  const canvasMoveFrameRef = useRef<number | null>(null);
  const pendingElementUpdatesRef = useRef<Map<string, CardElementPatch>>(new Map());
  const elementUpdateFrameRef = useRef<number | null>(null);

  useEffect(() => { decksRef.current = decks; }, [decks]);
  useEffect(() => { activeDeckIdRef.current = activeDeckId; }, [activeDeckId]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { templatesRef.current = templates; }, [templates]);
  useEffect(() => { editingTemplateIdRef.current = editingTemplateId; }, [editingTemplateId]);
  useEffect(() => { templateDraftCardRef.current = templateDraftCard; }, [templateDraftCard]);
  useEffect(() => () => {
    if (canvasMoveFrameRef.current !== null) window.cancelAnimationFrame(canvasMoveFrameRef.current);
    if (elementUpdateFrameRef.current !== null) window.cancelAnimationFrame(elementUpdateFrameRef.current);
  }, []);

  const syncTemplateDraftCard = (card: CardDocument) => {
    const nextCard = cloneCardDocument(card);
    templateDraftCardRef.current = nextCard;
    setTemplateDraftCard(nextCard);

    const templateId = editingTemplateIdRef.current;
    if (!templateId) return;

    setTemplates((current) => {
      const nextTemplates = current.map((template) =>
        template.id === templateId
          ? { ...template, card: nextCard, templateMode: 'data' as const }
          : template,
      );
      templatesRef.current = nextTemplates;
      return nextTemplates;
    });
  };

  // ── Derived ─────────────────────────────────────────────────────────────
  const activeDeck = decks.find((d) => d.id === activeDeckId) ?? decks[0];
  const editingTemplate = editingTemplateId ? templates.find((template) => template.id === editingTemplateId) ?? null : null;
  const isEditingExistingTemplate = Boolean(editingTemplate && templateDraftCard);
  const cards = useMemo(
    () => (templateDraftCard ? [templateDraftCard] : activeDeck.cards),
    [activeDeck.cards, templateDraftCard],
  );
  const activeCard = templateDraftCard ?? cards.find((c) => c.id === activeCardId) ?? cards[0];
  const activeElements = activeCard.elements;

  // ── Memoized derived values — avoids recomputing on unrelated renders ───────
  const selectableElementIds = useMemo(
    () => new Set(activeElements.filter((el) => !el.locked).map((el) => el.id)),
    [activeElements],
  );

  const selectedElementIds = useMemo(
    () => selectionStateIds.filter((id) => selectableElementIds.has(id)),
    [selectionStateIds, selectableElementIds],
  );

  const selectedElementIdSet = useMemo(() => new Set(selectedElementIds), [selectedElementIds]);

  const selectedElements = useMemo(
    () => activeElements.filter((e) => selectedElementIdSet.has(e.id) && !e.locked),
    [activeElements, selectedElementIdSet],
  );

  const findReplaceStats = useMemo(
    () => getFindReplaceStats(cards, findQuery, findMatchCase),
    [cards, findQuery, findMatchCase],
  );

  const selectedElementId = selectedElementIds.length === 1 ? selectedElementIds[0] : null;
  const selectedElement = useMemo(
    () =>
      selectedElementId
        ? (activeElements.find((e) => e.id === selectedElementId && !e.locked) ?? null)
        : null,
    [activeElements, selectedElementId],
  );

  const dynamicFields = useMemo(() => getDynamicFields(activeCard), [activeCard]);
  const canEditData = dynamicFields.length > 0 && !isEditingExistingTemplate && mode !== 'template';
  const isDataEditMode = dataEditModeRequested && canEditData;

  const fontOptions = useMemo(
    () => [...new Set([...DEFAULT_FONTS, ...SYSTEM_FONT_FALLBACKS, ...systemFonts, ...fonts.map((f) => f.family)])],
    [fonts, systemFonts],
  );

  const totalCards = useMemo(
    () => decks.reduce((t, d) => t + d.cards.length, 0),
    [decks],
  );
  const activeElementCount = activeCard.elements.length;
  const thumbnailSignature = `${activeCard.id}|${activeCard.name}|${activeCard.width}x${activeCard.height}|${activeCard.background.primaryColor}|${activeCard.background.secondaryColor}|${activeCard.background.gradientAngle}|${activeCard.background.texture}|${activeElementCount}`;

  const hasSelection = !isDataEditMode && selectedElements.length > 0;
  const canFlipSelection = !isDataEditMode && selectedElements.length > 0;
  const canGroupSelection = !isDataEditMode && selectedElements.length > 1;
  const canUngroupSelection = !isDataEditMode && selectedElements.some((el) => el.groupId);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  useEffect(() => {
    if (!launchTemplateId || launchTemplateHandledRef.current) return;
    const template = templatesRef.current.find((item) => item.id === launchTemplateId);
    if (!template) return;
    launchTemplateHandledRef.current = true;
    const draftCard = cloneTemplateCardForEditing(template);
    editingTemplateIdRef.current = template.id;
    templateDraftCardRef.current = draftCard;
    startTransition(() => {
      setEditingTemplateId(template.id);
      setTemplateDraftCard(draftCard);
      setActiveCardId(draftCard.id);
      setSelectionStateIds([]);
      setSidebarTab('layers');
      const emptyHistory: CardsHistory = { past: [], future: [] };
      historyRef.current = emptyHistory;
      setHistory(emptyHistory);
    });
  }, [launchTemplateId]);

  // ── Toasts ──────────────────────────────────────────────────────────────
  const pushToast = (tone: ToastTone, message: string) => {
    const toastId = createId();
    setToasts((current) => [...current, { id: toastId, tone, message }].slice(-4));
    window.setTimeout(() => setToasts((current) => current.filter((t) => t.id !== toastId)), TOAST_DURATION_MS);
  };
  const pushToastFromEffect = useEffectEvent((tone: ToastTone, message: string) => pushToast(tone, message));
  const dismissToast = (toastId: string) => setToasts((current) => current.filter((t) => t.id !== toastId));

  // ── Font registration ────────────────────────────────────────────────────
  useEffect(() => {
    void Promise.all(fonts.map((f) => registerFontAsset(f))).catch(() => {
      pushToastFromEffect('error', 'Nao foi possivel carregar uma ou mais fontes.');
    });
  }, [fonts]);

  useEditorAutosave({
    assetFolders,
    decks,
    decksRef,
    fonts,
    graphics,
    onError: (message) => pushToast('error', message),
    projectDescriptionRef,
    projectId,
    projectNameRef,
    templates,
    templatesRef,
    totalCards,
    isInteractionActive: isCanvasInteracting,
  });

  const persistCurrentProject = () => {
    try {
      saveProject({
        version: 1,
        id: projectId,
        name: projectNameRef.current,
        description: projectDescriptionRef.current,
        decks: decksRef.current,
        cards: [],
        graphics,
        assetFolders,
        fonts,
        templates: templatesRef.current,
      });
      return true;
    } catch (error) {
      pushToast(
        'error',
        isStorageQuotaWarning(error)
          ? error.message
          : 'Nao foi possivel salvar o projeto no navegador.',
      );
      return false;
    }
  };

  // ── Thumbnail (debounced, background) ────────────────────────────────────
  useEffect(() => {
    let cancelIdle: (() => void) | null = null;
    const timeoutId = window.setTimeout(() => {
      cancelIdle = queueIdleTask(() => {
        if (isEditingExistingTemplate) return;
        if (!shouldAutoCaptureThumbnail(totalCards) || activeElementCount > 32) return;
        const el = cardRef.current;
        if (!el) return;
        renderNodeToPng(el, { pixelRatio: 0.22, cacheBust: false }, fonts)
          .then((url) => updateProjectThumbnail(projectId, url))
          .catch(() => {});
      });
    }, THUMBNAIL_DELAY_MS);
    return () => {
      window.clearTimeout(timeoutId);
      cancelIdle?.();
    };
  }, [activeElementCount, thumbnailSignature, fonts, isEditingExistingTemplate, projectId, totalCards]);

  // ── onGoHome: snapshot thumbnail first ───────────────────────────────────
  const onGoHome = () => {
    if (isEditingExistingTemplate) {
      persistCurrentProject();
      onGoHomeProp();
      return;
    }

    const el = cardRef.current;
    if (!el) { onGoHomeProp(); return; }
    let settled = false;
    const settle = (thumbnail?: string) => {
      if (settled) return;
      settled = true;
      if (thumbnail) updateProjectThumbnail(projectId, thumbnail);
      persistCurrentProject();
      onGoHomeProp();
    };
    const fallback = window.setTimeout(() => settle(), 1500);
    renderNodeToPng(el, { pixelRatio: 0.4, cacheBust: false }, fonts)
      .then((url) => { window.clearTimeout(fallback); settle(url); })
      .catch(() => { window.clearTimeout(fallback); settle(); });
  };

  // ── History ──────────────────────────────────────────────────────────────
  const setHistoryState = (next: CardsHistory) => { historyRef.current = next; setHistory(next); };
  const clearHistory = () => setHistoryState({ past: [], future: [] });

  const pushCardsHistory = (snapshot: CardDocument[]) => {
    const current = historyRef.current;
    const limit = historyLimitFor(snapshot.length);
    setHistoryState({ past: [...current.past.slice(-(limit - 1)), snapshot], future: [] });
  };

  // Update active deck's cards inside decks array.
  const commitCards = (updater: (current: CardDocument[]) => CardDocument[]) => {
    const shouldCaptureHistory = dragHistorySnapshotRef.current === null;
    const draftCard = templateDraftCardRef.current;
    if (draftCard) {
      const currentCards = [draftCard];
      const nextCards = updater(currentCards);
      if (nextCards === currentCards) return;
      const nextCard = nextCards[0] ?? draftCard;

      if (shouldCaptureHistory) pushCardsHistory(currentCards);
      syncTemplateDraftCard(nextCard);
      setActiveCardId(nextCard.id);
      return;
    }

    const currentDecks = decksRef.current;
    const deckId = activeDeckIdRef.current;
    const deck = currentDecks.find((d) => d.id === deckId) ?? currentDecks[0];
    const currentCards = deck.cards;
    const nextCards = updater(currentCards);
    if (nextCards === currentCards) return;

    if (shouldCaptureHistory) pushCardsHistory(currentCards);

    const nextDecks = currentDecks.map((d) => (d.id === deckId ? { ...d, cards: nextCards } : d));
    decksRef.current = nextDecks;
    setDecks(nextDecks);
  };

  const restoreCardsSnapshot = (nextCards: CardDocument[]) => {
    dragHistorySnapshotRef.current = null;
    const draftCard = templateDraftCardRef.current;
    if (draftCard) {
      const nextCard = nextCards[0] ?? draftCard;
      syncTemplateDraftCard(nextCard);
      setActiveCardId(nextCard.id);
      setSelectionStateIds([]);
      return;
    }

    const deckId = activeDeckIdRef.current;
    const nextDecks = decksRef.current.map((d) => (d.id === deckId ? { ...d, cards: nextCards } : d));
    decksRef.current = nextDecks;
    setDecks(nextDecks);
    setActiveCardId((id) => (nextCards.some((c) => c.id === id) ? id : (nextCards[0]?.id ?? '')));
    setSelectionStateIds([]);
  };

  const undoCards = () => {
    const current = historyRef.current;
    if (current.past.length === 0) return;
    const prev = current.past[current.past.length - 1];
    const deckId = activeDeckIdRef.current;
    const currentCards = decksRef.current.find((d) => d.id === deckId)?.cards ?? [];
    setHistoryState({ past: current.past.slice(0, -1), future: [currentCards, ...current.future].slice(0, historyLimitFor(currentCards.length)) });
    restoreCardsSnapshot(prev);
  };

  const redoCards = () => {
    const current = historyRef.current;
    if (current.future.length === 0) return;
    const next = current.future[0];
    const deckId = activeDeckIdRef.current;
    const currentCards = decksRef.current.find((d) => d.id === deckId)?.cards ?? [];
    const limit = historyLimitFor(currentCards.length);
    setHistoryState({ past: [...current.past.slice(-(limit - 1)), currentCards], future: current.future.slice(1) });
    restoreCardsSnapshot(next);
  };

  // ── Deck management ───────────────────────────────────────────────────────

  const switchDeck = (deckId: string) => {
    if (deckId === activeDeckId) return;
    const deck = decks.find((d) => d.id === deckId);
    if (!deck) return;
    setActiveDeckId(deckId);
    setActiveCardId(deck.cards[0]?.id ?? '');
    setSelectionStateIds([]);
    clearHistory();
  };

  const addDeck = (name: string, presetId: string) => {
    const preset = CARD_PRESETS.find((p) => p.id === presetId) ?? CARD_PRESETS[0];
    const colorIndex = decks.length % DECK_COLORS.length;
    const newDeck = createEmptyDeck(name, preset.width, preset.height, colorIndex);
    const nextDecks = [...decksRef.current, newDeck];
    decksRef.current = nextDecks;
    setDecks(nextDecks);
    setActiveDeckId(newDeck.id);
    setActiveCardId(newDeck.cards[0].id);
    setSelectionStateIds([]);
    clearHistory();
    setShowNewDeckModal(false);
    pushToast('success', `Baralho "${name}" criado.`);
  };

  const deleteDeck = (deckId: string) => {
    if (decks.length <= 1) return;
    const nextDecks = decksRef.current.filter((d) => d.id !== deckId);
    decksRef.current = nextDecks;
    setDecks(nextDecks);
    if (activeDeckIdRef.current === deckId) {
      const fallback = nextDecks[0];
      setActiveDeckId(fallback.id);
      setActiveCardId(fallback.cards[0]?.id ?? '');
      setSelectionStateIds([]);
      clearHistory();
    }
  };

  const renameDeck = (deckId: string, name: string) => {
    const nextDecks = decksRef.current.map((d) => (d.id === deckId ? { ...d, name } : d));
    decksRef.current = nextDecks;
    setDecks(nextDecks);
  };

  // ── Card/element mutations ────────────────────────────────────────────────

  const updateActiveCard = (updater: (card: CardDocument) => CardDocument) => {
    commitCards((current) => {
      const index = current.findIndex((card) => card.id === activeCardId);
      if (index < 0) return current;
      const nextCard = updater(current[index]);
      if (nextCard === current[index]) return current;
      const nextCards = current.slice();
      nextCards[index] = nextCard;
      return nextCards;
    });
  };

  const applyElementUpdates = (updates: Array<{ id: string; patch: CardElementPatch }>) => {
    if (updates.length === 0) return;
    const patchById = new Map(updates.map((update) => [update.id, update.patch]));
    updateActiveCard((card) => ({
      ...card,
      elements: card.elements.map((element) => {
        const patch = patchById.get(element.id);
        return patch && !element.locked ? ({ ...element, ...patch } as CardElement) : element;
      }),
    }));
  };

  const flushPendingElementUpdates = () => {
    if (elementUpdateFrameRef.current !== null) {
      window.cancelAnimationFrame(elementUpdateFrameRef.current);
      elementUpdateFrameRef.current = null;
    }
    const updates = Array.from(pendingElementUpdatesRef.current.entries()).map(([id, patch]) => ({ id, patch }));
    pendingElementUpdatesRef.current.clear();
    applyElementUpdates(updates);
  };

  const queueElementUpdates = (updates: Array<{ id: string; patch: CardElementPatch }>) => {
    updates.forEach(({ id, patch }) => {
      const nextPatch: CardElementPatch = {
        ...(pendingElementUpdatesRef.current.get(id) ?? {}),
        ...patch,
      } as CardElementPatch;
      pendingElementUpdatesRef.current.set(id, nextPatch);
    });
    if (elementUpdateFrameRef.current !== null) return;
    elementUpdateFrameRef.current = window.requestAnimationFrame(() => {
      elementUpdateFrameRef.current = null;
      const nextUpdates = Array.from(pendingElementUpdatesRef.current.entries()).map(([id, patch]) => ({ id, patch }));
      pendingElementUpdatesRef.current.clear();
      applyElementUpdates(nextUpdates);
    });
  };

  const updateElement = (elementId: string, patch: CardElementPatch) => {
    updateElements([{ id: elementId, patch }]);
  };

  const updateElements = (updates: Array<{ id: string; patch: CardElementPatch }>) => {
    if (isDataEditMode) return;
    if (dragHistorySnapshotRef.current) {
      queueElementUpdates(updates);
      return;
    }
    applyElementUpdates(updates);
  };

  const updateDynamicField = (key: string, value: string) => {
    updateActiveCard((card) => applyDynamicFieldValue(card, key, value, graphics));
  };

  const toggleDataEditMode = () => {
    if (!canEditData) {
      pushToast('info', 'Esta carta nao tem campos dinamicos.');
      return;
    }

    setElementContextMenu(null);
    setEditingElementId(null);
    setSelectionStateIds([]);
    setIsPreviewMode(false);
    setDataEditModeRequested((current) => !current);
  };

  const replaceTextAcrossDeck = () => {
    const query = findQuery;
    if (!query) return;
    const { stats } = replaceTextInDeck(cards, query, replaceValue, findMatchCase);
    if (stats.matches === 0) {
      pushToast('info', 'Nenhuma ocorrencia encontrada no baralho atual.');
      return;
    }
    commitCards((currentCards) => replaceTextInDeck(currentCards, query, replaceValue, findMatchCase).cards);
    setShowFindReplaceModal(false);
    setSelectionStateIds([]);
    pushToast('success', `${stats.matches} ocorrencia(s) substituida(s) em ${stats.cards} carta(s).`);
  };

  const selectElement = (elementId: string | null, additive = false) => {
    if (isDataEditMode) { setSelectionStateIds([]); return; }
    if (!elementId) { setSelectionStateIds([]); return; }
    if (activeCard.elements.some((el) => el.id === elementId && el.locked)) return;
    const target = activeCard.elements.find((el) => el.id === elementId);
    const targetIds = target?.groupId
      ? activeCard.elements.filter((el) => el.groupId === target.groupId && !el.locked).map((el) => el.id)
      : [elementId];
    setSelectionStateIds((current) => {
      if (!additive) return targetIds;
      const isFullySelected = targetIds.every((id) => current.includes(id));
      if (isFullySelected) return current.filter((id) => !targetIds.includes(id));
      return [...new Set([...current, ...targetIds])];
    });
  };

  const selectLayer = (elementId: string, additive = false) => {
    if (isDataEditMode) { setSelectionStateIds([]); return; }
    if (activeCard.elements.some((el) => el.id === elementId && el.locked)) return;
    setSelectionStateIds((current) => {
      if (!additive) return [elementId];
      return current.includes(elementId)
        ? current.filter((id) => id !== elementId)
        : [...current, elementId];
    });
  };

  const selectGroup = (groupId: string, additive = false) => {
    if (isDataEditMode) { setSelectionStateIds([]); return; }
    const targetIds = activeCard.elements
      .filter((el) => el.groupId === groupId && !el.locked)
      .map((el) => el.id);
    if (targetIds.length === 0) return;
    setSelectionStateIds((current) => {
      if (!additive) return targetIds;
      const isFullySelected = targetIds.every((id) => current.includes(id));
      if (isFullySelected) return current.filter((id) => !targetIds.includes(id));
      return [...new Set([...current, ...targetIds])];
    });
  };

  const toggleGroupCollapsed = (groupId: string) => {
    setCollapsedGroupIds((ids) =>
      ids.includes(groupId) ? ids.filter((id) => id !== groupId) : [...ids, groupId],
    );
  };

  const renameGroup = (groupId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    updateActiveCard((card) => ({
      ...card,
      groupNames: {
        ...(card.groupNames ?? {}),
        [groupId]: cleanName,
      },
    }));
  };

  const addElementToCard = (type: CardElement['type']) => {
    const next = createElement(type, activeCard);
    next.zIndex = getNextZIndex(activeCard.elements);
    updateActiveCard((card) => ({ ...card, elements: [...card.elements, next] }));
    setSelectionStateIds([next.id]);
    setSidebarTab('layers');
  };

  const duplicateSelectedElement = (elementId: string) => {
    const source = activeCard.elements.find((e) => e.id === elementId);
    if (!source) return;
    const copy = duplicateElement(source, getNextZIndex(activeCard.elements));
    updateActiveCard((card) => ({ ...card, elements: [...card.elements, copy] }));
    setSelectionStateIds([copy.id]);
  };

  const deleteSelectedElement = (elementId: string) => {
    updateActiveCard((card) => ({ ...card, elements: card.elements.filter((e) => e.id !== elementId) }));
    setSelectionStateIds((ids) => ids.filter((id) => id !== elementId));
  };

  const toggleLayerLock = (elementId: string) => {
    const target = activeCard.elements.find((el) => el.id === elementId);
    if (!target) return;
    const nextLocked = !target.locked;
    updateActiveCard((card) => ({
      ...card,
      elements: card.elements.map((el) =>
        el.id === elementId ? ({ ...el, locked: nextLocked } as CardElement) : el,
      ),
    }));
    if (nextLocked) setSelectionStateIds((ids) => ids.filter((id) => id !== elementId));
  };

  const selectElements = (ids: string[]) => {
    if (isDataEditMode) { setSelectionStateIds([]); return; }
    setSelectionStateIds(ids);
  };

  const toggleLayerHide = (elementId: string) => {
    const target = activeCard.elements.find((el) => el.id === elementId);
    if (!target) return;
    const nextHidden = !target.hidden;
    updateActiveCard((card) => ({
      ...card,
      elements: card.elements.map((el) =>
        el.id === elementId ? ({ ...el, hidden: nextHidden } as CardElement) : el,
      ),
    }));
    if (nextHidden) setSelectionStateIds((ids) => ids.filter((id) => id !== elementId));
  };

  const renameLayer = (elementId: string, name: string) =>
    updateElement(elementId, { name } as CardElementPatch);

  const moveElementToEdge = (elementId: string, edge: 'front' | 'back') => {
    updateActiveCard((card) => {
      const target = card.elements.find((el) => el.id === elementId);
      if (!target || target.locked) return card;
      const zIndexes = card.elements.map((el) => el.zIndex);
      const nextZ = edge === 'front' ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - 1;
      return {
        ...card,
        elements: card.elements.map((el) =>
          el.id === elementId ? ({ ...el, zIndex: nextZ } as CardElement) : el,
        ),
      };
    });
  };

  const moveSelectionToEdge = (edge: 'front' | 'back') => {
    if (selectedElements.length === 0) return;
    const ids = new Set(selectedElementIds);
    updateActiveCard((card) => {
      const selected = card.elements
        .filter((element) => ids.has(element.id) && !element.locked)
        .sort((a, b) => a.zIndex - b.zIndex);
      if (selected.length === 0) return card;
      const zIndexes = card.elements.map((element) => element.zIndex);
      const base = edge === 'front' ? Math.max(...zIndexes) + 1 : Math.min(...zIndexes) - selected.length;
      const nextZ = new Map(selected.map((element, index) => [
        element.id,
        edge === 'front' ? base + index : base + index,
      ]));
      return {
        ...card,
        elements: card.elements.map((element) =>
          nextZ.has(element.id) ? ({ ...element, zIndex: nextZ.get(element.id)! } as CardElement) : element,
        ),
      };
    });
  };

  const copyElementStyle = (elementId: string) => {
    const source = activeCard.elements.find((el) => el.id === elementId);
    if (!source) return;
    copiedStyleRef.current = source;
    pushToast('success', `Estilo de "${source.name}" copiado.`);
  };

  const pasteElementStyle = (elementId: string) => {
    const source = copiedStyleRef.current;
    const target = activeCard.elements.find((el) => el.id === elementId);
    if (!source || !target) return;
    const patch = buildStylePatch(source, target);
    if (Object.keys(patch).length === 0) {
      pushToast('info', 'Nenhum estilo compatível para colar neste elemento.');
      return;
    }
    updateElement(elementId, patch);
    pushToast('success', `Estilo aplicado em "${target.name}".`);
  };

  const openElementContextMenu = (elementId: string, x: number, y: number) => {
    const menuWidth = 210;
    const menuHeight = 292;
    setElementContextMenu({
      elementId,
      x: Math.min(x, window.innerWidth - menuWidth - 8),
      y: Math.min(y, window.innerHeight - menuHeight - 8),
    });
  };

  const runElementContextAction = (action: (elementId: string) => void) => {
    if (!elementContextMenu) return;
    action(elementContextMenu.elementId);
    setElementContextMenu(null);
  };

  const deleteSelectedElements = () => {
    const ids = new Set(selectedElementIds);
    updateActiveCard((card) => ({ ...card, elements: card.elements.filter((e) => !ids.has(e.id)) }));
    setSelectionStateIds([]);
  };

  const lockSelectedElements = () => {
    const ids = new Set(selectedElementIds);
    updateActiveCard((card) => ({
      ...card,
      elements: card.elements.map((element) =>
        ids.has(element.id) ? ({ ...element, locked: true } as CardElement) : element,
      ),
    }));
    setSelectionStateIds([]);
  };

  const resetSelectedRotation = () => {
    const ids = new Set(selectedElementIds);
    updateActiveCard((card) => ({
      ...card,
      elements: card.elements.map((element) =>
        ids.has(element.id) && !element.locked ? ({ ...element, rotation: 0 } as CardElement) : element,
      ),
    }));
  };

  const duplicateSelectedElements = () => {
    if (selectedElements.length === 0) return;
    const startZ = getNextZIndex(activeCard.elements);
    const groupMap = new Map<string, string>();
    const copies = selectedElements.map((el, index) => {
      const copy = duplicateElement(el, startZ + index);
      if (el.groupId) {
        if (!groupMap.has(el.groupId)) groupMap.set(el.groupId, createId());
        copy.groupId = groupMap.get(el.groupId);
      }
      return copy;
    });
    updateActiveCard((card) => ({ ...card, elements: [...card.elements, ...copies] }));
    setSelectionStateIds(copies.map((c) => c.id));
  };

  const startEditElement = (id: string) => setEditingElementId(id);
  const commitElementEdit = (id: string, content: string, richContent?: TextStyleSpan[]) => {
    updateElement(id, { content, richContent } as CardElementPatch);
    setEditingElementId(null);
  };
  const cancelElementEdit = () => setEditingElementId(null);

  const moveSelectedElements = (dx: number, dy: number) => {
    const ids = new Set(selectedElementIds);
    updateActiveCard((card) => ({
      ...card,
      elements: card.elements.map((el) =>
        ids.has(el.id) ? ({ ...el, x: el.x + dx, y: el.y + dy } as CardElement) : el,
      ),
    }));
  };

  const beginElementMoveHistory = (elementId: string, duplicateOnDrag = false) => {
    if (dragHistorySnapshotRef.current) return;
    const draftCard = templateDraftCardRef.current;
    if (draftCard) {
      const source = draftCard.elements.find((element) => element.id === elementId && !element.locked);
      if (!source) return;
      const snapshot = [draftCard];
      dragHistorySnapshotRef.current = snapshot;
      altDragSnapshotRef.current = duplicateOnDrag ? snapshot : null;
      pushCardsHistory(snapshot);
      setIsCanvasInteracting(true);
      return;
    }

    const deckId = activeDeckIdRef.current;
    const deck = decksRef.current.find((d) => d.id === deckId);
    const source = deck?.cards.find((c) => c.id === activeCardId)?.elements.find((el) => el.id === elementId && !el.locked);
    if (!source) return;
    dragHistorySnapshotRef.current = deck!.cards;
    altDragSnapshotRef.current = duplicateOnDrag ? deck!.cards : null;
    pushCardsHistory(deck!.cards);
    setIsCanvasInteracting(true);
  };

  const applyCanvasElementMove = (elementId: string, x: number, y: number) => {
    const selectedIds = new Set(selectedElementIds);
    const shouldMoveCurrentSelection = selectedIds.has(elementId);
    const draftCard = templateDraftCardRef.current;
    if (draftCard) {
      const source = draftCard.elements.find((element) => element.id === elementId && !element.locked);
      if (!source) return;
      const dx = x - source.x;
      const dy = y - source.y;
      if (dx === 0 && dy === 0) return;

      syncTemplateDraftCard({
        ...draftCard,
        elements: draftCard.elements.map((element) => {
          const shouldMove =
            !element.locked &&
            (shouldMoveCurrentSelection
              ? selectedIds.has(element.id)
              : element.id === source.id || (source.groupId !== undefined && element.groupId === source.groupId));
          return shouldMove ? ({ ...element, x: element.x + dx, y: element.y + dy } as CardElement) : element;
        }),
      });
      return;
    }

    const deckId = activeDeckIdRef.current;

    setDecks((currentDecks) => {
      const currentDeck = currentDecks.find((d) => d.id === deckId);
      if (!currentDeck) return currentDecks;
      const cardIndex = currentDeck.cards.findIndex((c) => c.id === activeCardId);
      const currentCard = cardIndex >= 0 ? currentDeck.cards[cardIndex] : undefined;
      const source = currentCard?.elements.find((el) => el.id === elementId && !el.locked);
      if (!currentCard || !source) return currentDecks;
      const dx = x - source.x;
      const dy = y - source.y;
      if (dx === 0 && dy === 0) return currentDecks;

      const nextCards = currentDeck.cards.slice();
      nextCards[cardIndex] = {
        ...currentCard,
        elements: currentCard.elements.map((el) => {
          const shouldMove =
            !el.locked &&
            (shouldMoveCurrentSelection
              ? selectedIds.has(el.id)
              : el.id === source.id || (source.groupId !== undefined && el.groupId === source.groupId));
          return shouldMove ? ({ ...el, x: el.x + dx, y: el.y + dy } as CardElement) : el;
        }),
      };
      const nextDecks = currentDecks.map((d) => (d.id === deckId ? { ...d, cards: nextCards } : d));
      decksRef.current = nextDecks;
      return nextDecks;
    });
  };

  const flushPendingCanvasMove = () => {
    if (canvasMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(canvasMoveFrameRef.current);
      canvasMoveFrameRef.current = null;
    }
    const pendingMove = pendingCanvasMoveRef.current;
    pendingCanvasMoveRef.current = null;
    if (pendingMove) applyCanvasElementMove(pendingMove.elementId, pendingMove.x, pendingMove.y);
  };

  const moveElementFromCanvas = (elementId: string, x: number, y: number) => {
    pendingCanvasMoveRef.current = { elementId, x, y };
    if (canvasMoveFrameRef.current !== null) return;
    canvasMoveFrameRef.current = window.requestAnimationFrame(() => {
      canvasMoveFrameRef.current = null;
      const pendingMove = pendingCanvasMoveRef.current;
      pendingCanvasMoveRef.current = null;
      if (pendingMove) applyCanvasElementMove(pendingMove.elementId, pendingMove.x, pendingMove.y);
    });
  };

  const endElementMoveHistory = () => {
    flushPendingElementUpdates();
    flushPendingCanvasMove();
    setIsCanvasInteracting(false);
    const snapshot = altDragSnapshotRef.current;
    altDragSnapshotRef.current = null;
    dragHistorySnapshotRef.current = null;
    if (!snapshot) return;

    const draftCard = templateDraftCardRef.current;
    if (draftCard) {
      const originalCard = snapshot.find((card) => card.id === draftCard.id);
      if (!originalCard) return;
      const originalById = new Map(originalCard.elements.map((element) => [element.id, element]));
      const movedElements = draftCard.elements.filter((element) => {
        const original = originalById.get(element.id);
        return original && (original.x !== element.x || original.y !== element.y);
      });

      if (movedElements.length === 0) {
        syncTemplateDraftCard(originalCard);
        return;
      }

      const startZ = getNextZIndex(originalCard.elements);
      const groupMap = new Map<string, string>();
      const copies = movedElements.map((moved, index) => {
        const original = originalById.get(moved.id)!;
        const copy = duplicateElement(original, startZ + index);
        copy.x = moved.x;
        copy.y = moved.y;
        if (original.groupId) {
          if (!groupMap.has(original.groupId)) groupMap.set(original.groupId, createId());
          copy.groupId = groupMap.get(original.groupId);
        }
        return copy;
      });

      syncTemplateDraftCard({ ...originalCard, elements: [...originalCard.elements, ...copies] });
      setSelectionStateIds(copies.map((copy) => copy.id));
      return;
    }

    const deckId = activeDeckIdRef.current;
    const currentDeck = decksRef.current.find((d) => d.id === deckId);
    const originalCard = snapshot.find((card) => card.id === activeCardId);
    const movedCard = currentDeck?.cards.find((card) => card.id === activeCardId);
    if (!currentDeck || !originalCard || !movedCard) return;

    const originalById = new Map(originalCard.elements.map((el) => [el.id, el]));
    const movedElements = movedCard.elements.filter((el) => {
      const original = originalById.get(el.id);
      return original && (original.x !== el.x || original.y !== el.y);
    });
    if (movedElements.length === 0) {
      const restoredDecks = decksRef.current.map((deck) => (deck.id === deckId ? { ...deck, cards: snapshot } : deck));
      decksRef.current = restoredDecks;
      setDecks(restoredDecks);
      return;
    }

    const startZ = getNextZIndex(originalCard.elements);
    const groupMap = new Map<string, string>();
    const copies = movedElements.map((moved, index) => {
      const original = originalById.get(moved.id)!;
      const copy = duplicateElement(original, startZ + index);
      copy.x = moved.x;
      copy.y = moved.y;
      if (original.groupId) {
        if (!groupMap.has(original.groupId)) groupMap.set(original.groupId, createId());
        copy.groupId = groupMap.get(original.groupId);
      }
      return copy;
    });

    const restoredCards = snapshot.map((card) =>
      card.id === activeCardId ? { ...card, elements: [...card.elements, ...copies] } : card,
    );
    const nextDecks = decksRef.current.map((deck) => (deck.id === deckId ? { ...deck, cards: restoredCards } : deck));
    decksRef.current = nextDecks;
    setDecks(nextDecks);
    setSelectionStateIds(copies.map((copy) => copy.id));
  };

  const groupSelectedElements = () => {
    if (selectedElements.length < 2) return;
    const ids = new Set(selectedElements.map((el) => el.id));
    const groupId = createId();
    updateActiveCard((card) => ({
      ...card,
      groupNames: { ...(card.groupNames ?? {}), [groupId]: 'Grupo' },
      elements: card.elements.map((el) => (ids.has(el.id) ? ({ ...el, groupId } as CardElement) : el)),
    }));
  };

  const ungroupSelectedElements = () => {
    const groupIds = new Set(
      selectedElements.map((el) => el.groupId).filter((gid): gid is string => Boolean(gid)),
    );
    if (groupIds.size === 0) return;
    updateActiveCard((card) => ({
      ...card,
      groupNames: Object.fromEntries(
        Object.entries(card.groupNames ?? {}).filter(([groupId]) => !groupIds.has(groupId)),
      ),
      elements: card.elements.map((el) =>
        el.groupId && groupIds.has(el.groupId) ? ({ ...el, groupId: undefined } as CardElement) : el,
      ),
    }));
  };

  const alignSelection = (mode: AlignmentMode) => {
    if (selectedElements.length === 0) return;
    const ids = new Set(selectedElementIds);
    const bounds =
      selectedElements.length === 1
        ? { left: 0, top: 0, right: activeCard.width, bottom: activeCard.height }
        : {
            left: Math.min(...selectedElements.map((el) => el.x)),
            top: Math.min(...selectedElements.map((el) => el.y)),
            right: Math.max(...selectedElements.map((el) => el.x + el.width)),
            bottom: Math.max(...selectedElements.map((el) => el.y + el.height)),
          };
    const cx = (bounds.left + bounds.right) / 2;
    const cy = (bounds.top + bounds.bottom) / 2;
    updateActiveCard((card) => ({
      ...card,
      elements: card.elements.map((el) => {
        if (!ids.has(el.id)) return el;
        switch (mode) {
          case 'left':   return { ...el, x: bounds.left } as CardElement;
          case 'center': return { ...el, x: Math.round(cx - el.width / 2) } as CardElement;
          case 'right':  return { ...el, x: bounds.right - el.width } as CardElement;
          case 'top':    return { ...el, y: bounds.top } as CardElement;
          case 'middle': return { ...el, y: Math.round(cy - el.height / 2) } as CardElement;
          case 'bottom': return { ...el, y: bounds.bottom - el.height } as CardElement;
          default:       return el;
        }
      }),
    }));
  };

  const flipSelection = (axis: FlipAxis) => {
    const ids = new Set(selectedElementIds);
    updateActiveCard((card) => ({
      ...card,
      elements: card.elements.map((el) => {
        if (!ids.has(el.id) || el.locked) return el;
        return { ...el, flipX: axis === 'x' ? !el.flipX : el.flipX, flipY: axis === 'y' ? !el.flipY : el.flipY } as CardElement;
      }),
    }));
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  const clearPreviewSpaceTimer = () => {
    if (previewSpaceTimerRef.current === null) return;
    window.clearTimeout(previewSpaceTimerRef.current);
    previewSpaceTimerRef.current = null;
  };

  const enterPreviewMode = () => {
    clearPreviewSpaceTimer();
    setEditingElementId(null);
    setSelectionStateIds([]);
    setDataEditModeRequested(false);
    setIsPreviewMode(true);
  };

  const handleCardKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === 'h') {
      event.preventDefault();
      setElementContextMenu(null);
      setShowFindReplaceModal(true);
      return;
    }
    if (event.key === 'Escape' && showFindReplaceModal) {
      event.preventDefault();
      setShowFindReplaceModal(false);
      return;
    }
    const isTyping =
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable;
    if (isTyping) return;

    if (event.key === 'Escape' && isDataEditMode) {
      event.preventDefault();
      setDataEditModeRequested(false);
      return;
    }
    if (isDataEditMode) return;

    if (event.key === 'Escape' && isPreviewMode) {
      event.preventDefault();
      setIsPreviewMode(false);
      return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && key === 'p') {
      event.preventDefault();
      if (isPreviewMode) setIsPreviewMode(false);
      else enterPreviewMode();
      return;
    }
    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.code === 'Space' && !event.repeat && !isPreviewMode) {
      clearPreviewSpaceTimer();
      previewSpaceTimerRef.current = window.setTimeout(() => {
        previewSpaceTimerRef.current = null;
        enterPreviewMode();
      }, 520);
    }
    if ((event.ctrlKey || event.metaKey) && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) redoCards();
      else undoCards();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'y') { event.preventDefault(); redoCards(); return; }
    if (event.key === 'Escape') {
      if (showFindReplaceModal) { setShowFindReplaceModal(false); return; }
      if (elementContextMenu) { setElementContextMenu(null); return; }
      if (editingElementId) { cancelElementEdit(); return; }
      setSelectionStateIds([]); return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'v') {
      event.preventDefault();
      const clipboard = clipboardRef.current;
      if (clipboard.length === 0) return;
      const startZ = getNextZIndex(activeCard.elements);
      const groupMap = new Map<string, string>();
      const copies = clipboard.map((el, index) => {
        const copy = duplicateElement(el, startZ + index);
        if (el.groupId) { if (!groupMap.has(el.groupId)) groupMap.set(el.groupId, createId()); copy.groupId = groupMap.get(el.groupId); }
        return copy;
      });
      updateActiveCard((card) => ({ ...card, elements: [...card.elements, ...copies] }));
      setSelectionStateIds(copies.map((c) => c.id));
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'd') {
      event.preventDefault();
      if (selectedElementIds.length > 0) duplicateSelectedElements();
      else duplicateCard(activeCardId);
      return;
    }
    if ((event.ctrlKey || event.metaKey) && key === 'g') {
      event.preventDefault();
      groupSelectedElements();
      return;
    }
    if (selectedElementIds.length === 0) return;
    const step = event.shiftKey ? 10 : 1;
    if ((event.ctrlKey || event.metaKey) && key === 'c') { if (selectedElements.length > 0) clipboardRef.current = selectedElements; return; }
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); deleteSelectedElements(); return; }
    if (event.key === 'ArrowLeft')  { event.preventDefault(); moveSelectedElements(-step, 0); }
    if (event.key === 'ArrowRight') { event.preventDefault(); moveSelectedElements(step, 0); }
    if (event.key === 'ArrowUp')    { event.preventDefault(); moveSelectedElements(0, -step); }
    if (event.key === 'ArrowDown')  { event.preventDefault(); moveSelectedElements(0, step); }
  });

  const handleCardKeyUp = useEffectEvent((event: KeyboardEvent) => {
    if (event.code === 'Space') clearPreviewSpaceTimer();
  });

  useEffect(() => {
    window.addEventListener('keydown', handleCardKeyDown);
    window.addEventListener('keyup', handleCardKeyUp);
    window.addEventListener('pointerdown', clearPreviewSpaceTimer);
    return () => {
      window.removeEventListener('keydown', handleCardKeyDown);
      window.removeEventListener('keyup', handleCardKeyUp);
      window.removeEventListener('pointerdown', clearPreviewSpaceTimer);
      clearPreviewSpaceTimer();
    };
  }, []);

  // ── Export / Import ───────────────────────────────────────────────────────
  const exportCurrentCard = async () => {
    if (!cardRef.current) return;
    try {
      setIsExporting(true);
      await waitForPaint();
      const dataUrl = await renderNodeToPng(cardRef.current, { cacheBust: true, pixelRatio: 2 }, fonts);
      downloadDataUrl(`${activeCard.name.replace(/\s+/g, '-').toLowerCase() || 'carta'}.png`, dataUrl);
      pushToast('success', `PNG exportado: ${activeCard.name}.`);
    } catch { pushToast('error', 'Nao foi possivel exportar o PNG atual.'); }
    finally { setIsExporting(false); }
  };

  // Export ALL cards from ALL decks, prefixed with deck name.
  const exportAllCardsAsPng = async () => {
    if (!cardRef.current) return;
    const previousDeckId = activeDeckId;
    const previousCardId = activeCardId;
    const previousSelection = selectedElementIds;
    try {
      setIsExporting(true);
      setSelectionStateIds([]);
      let exported = 0;
      for (const [di, deck] of decks.entries()) {
        setActiveDeckId(deck.id);
        activeDeckIdRef.current = deck.id;
        for (const [ci, card] of deck.cards.entries()) {
          setActiveCardId(card.id);
          await waitForPaint();
          if (!cardRef.current) continue;
          const dataUrl = await renderNodeToPng(cardRef.current, { cacheBust: true, pixelRatio: 2 }, fonts);
          downloadDataUrl(getExportFileName(deck.name, card, ci, di), dataUrl);
          exported++;
          if (exported % 3 === 0) await yieldToBrowser();
        }
      }
      pushToast('success', `${exported} cartas exportadas em PNG (${decks.length} baralho${decks.length > 1 ? 's' : ''}).`);
    } catch { pushToast('error', 'Nao foi possivel exportar todas as cartas.'); }
    finally {
      setActiveDeckId(previousDeckId);
      activeDeckIdRef.current = previousDeckId;
      setActiveCardId(previousCardId);
      setSelectionStateIds(previousSelection);
      setIsExporting(false);
    }
  };

  const exportProject = () => {
    const snapshot: ProjectSnapshot = {
      version: 1,
      id: projectId,
      name: projectNameRef.current,
      description: projectDescriptionRef.current,
      decks: decksRef.current,
      cards: [],
      graphics,
      assetFolders,
      fonts,
      templates,
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    downloadDataUrl(`${(projectNameRef.current || 'projeto').replace(/\s+/g, '-').toLowerCase()}.json`, url);
    setTimeout(() => URL.revokeObjectURL(url), 0);
    pushToast('success', 'Projeto exportado com sucesso.');
  };

  const importProject = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      if (!isProjectSnapshot(parsed)) throw new Error('Arquivo inválido.');
      await Promise.all(parsed.fonts.map((f: FontAsset) => registerFontAsset(f)));
      const importedDecks = resolveDecks(parsed);
      if (importedDecks.every((d) => d.cards.length === 0)) throw new Error('Nenhuma carta encontrada.');
      startTransition(() => {
        const nextDecks = importedDecks;
        decksRef.current = nextDecks;
        setDecks(nextDecks);
        setActiveDeckId(nextDecks[0].id);
        activeDeckIdRef.current = nextDecks[0].id;
        setActiveCardId(nextDecks[0].cards[0].id);
        setGraphics(parsed.graphics);
        setAssetFolders(parsed.assetFolders ?? []);
        setFonts(parsed.fonts);
        setHistoryState({ past: [], future: [] });
        setSelectionStateIds([]);
      });
      pushToast('success', 'Projeto importado com sucesso.');
    } catch { pushToast('error', 'Nao foi possivel importar o projeto.'); }
  };

  // ── Card management ───────────────────────────────────────────────────────
  const addCard = () => {
    const next = createEmptyCard(`Carta ${cards.length + 1}`, activeDeck.cardWidth, activeDeck.cardHeight);
    commitCards((current) => [...current, next]);
    setActiveCardId(next.id);
    setSelectionStateIds([]);
  };

  function duplicateCard(cardId: string) {
    const source = cards.find((c) => c.id === cardId);
    if (!source) return;
    const cloned: CardDocument = {
      ...source,
      id: createId(),
      name: `${source.name} cópia`,
      elements: source.elements.map((e) => ({ ...e, id: createId() })),
    };
    commitCards((current) => [...current, cloned]);
    setActiveCardId(cloned.id);
    setSelectionStateIds([]);
  }

  const renameCard = (cardId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    commitCards((current) =>
      current.map((card) => (card.id === cardId ? { ...card, name: cleanName } : card)),
    );
  };

  const reorderCards = (draggedCardId: string, targetCardId: string) => {
    if (draggedCardId === targetCardId) return;
    commitCards((current) => {
      const fromIndex = current.findIndex((card) => card.id === draggedCardId);
      const toIndex = current.findIndex((card) => card.id === targetCardId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const deleteCard = (cardId: string) => {
    if (cards.length === 1) return;
    commitCards((current) => current.filter((c) => c.id !== cardId));
    if (activeCardId === cardId) {
      const remaining = cards.filter((c) => c.id !== cardId);
      setActiveCardId(remaining[0].id);
      setSelectionStateIds([]);
    }
  };

  const deleteCards = (cardIds: string[]) => {
    const ids = new Set(cardIds);
    if (ids.size === 0 || cards.length - ids.size < 1) {
      pushToast('info', 'Mantenha pelo menos uma carta neste baralho.');
      return;
    }
    const remaining = cards.filter((card) => !ids.has(card.id));
    commitCards(() => remaining);
    if (ids.has(activeCardId)) {
      setActiveCardId(remaining[0].id);
      setSelectionStateIds([]);
    }
  };

  const moveCardsToDeck = (cardIds: string[], targetDeckId: string) => {
    const ids = new Set(cardIds);
    if (ids.size === 0 || targetDeckId === activeDeckId) return;

    const sourceDeck = decksRef.current.find((deck) => deck.id === activeDeckId);
    const targetDeck = decksRef.current.find((deck) => deck.id === targetDeckId);
    if (!sourceDeck || !targetDeck) return;

    const moving = sourceDeck.cards.filter((card) => ids.has(card.id));
    if (moving.length === 0) return;
    if (sourceDeck.cards.length - moving.length < 1) {
      pushToast('info', 'Mantenha pelo menos uma carta no baralho de origem.');
      return;
    }

    const movedCards = moving.map((card) => ({
      ...card,
      width: targetDeck.cardWidth,
      height: targetDeck.cardHeight,
    }));
    const remainingCards = sourceDeck.cards.filter((card) => !ids.has(card.id));
    const nextDecks = decksRef.current.map((deck) => {
      if (deck.id === sourceDeck.id) return { ...deck, cards: remainingCards };
      if (deck.id === targetDeck.id) return { ...deck, cards: [...deck.cards, ...movedCards] };
      return deck;
    });

    decksRef.current = nextDecks;
    setDecks(nextDecks);
    if (ids.has(activeCardId)) {
      setActiveCardId(remainingCards[0].id);
      setSelectionStateIds([]);
    }
    clearHistory();
    pushToast('success', `${moving.length} carta${moving.length !== 1 ? 's' : ''} movida${moving.length !== 1 ? 's' : ''}.`);
  };

  // ── Asset management ──────────────────────────────────────────────────────
  const uploadGraphics = async (files: File[]) => {
    try {
      const targetFolderId = pendingGraphicFolderIdRef.current;
      pendingGraphicFolderIdRef.current = undefined;
      const uploaded: GraphicAsset[] = [];
      for (const file of files.filter((f) => f.type.startsWith('image/'))) {
        uploaded.push({
          id: createId(),
          name: file.name.replace(/\.[^.]+$/, ''),
          src: await readImageFileAsOptimizedDataUrl(file),
          kind: 'image',
          folderId: targetFolderId,
        });
        if (uploaded.length % 2 === 0) await yieldToBrowser();
      }
      if (uploaded.length === 0) return;
      setGraphics((prev) => [...prev, ...uploaded]);
      setSidebarTab('assets');
      pushToast('success', `${uploaded.length} imagem(ns) adicionada(s).`);
    } catch { pushToast('error', 'Nao foi possivel carregar as imagens.'); }
  };

  const addAssetFolder = (name: string, parentId?: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setAssetFolders((current) => [...current, { id: createId(), name: cleanName, parentId }]);
  };

  const updateAssetFolder = (folderId: string, patch: Partial<AssetFolder>) => {
    setAssetFolders((current) => current.map((folder) => (folder.id === folderId ? { ...folder, ...patch } : folder)));
  };

  const collectAssetFolderDescendants = (folderId: string, folders: AssetFolder[]) => {
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
  };

  const deleteAssetFolder = (folderId: string) => {
    const deletedIds = collectAssetFolderDescendants(folderId, assetFolders);
    setAssetFolders((current) => current.filter((folder) => !deletedIds.has(folder.id)));
    setGraphics((current) => current.map((asset) => (asset.folderId && deletedIds.has(asset.folderId) ? { ...asset, folderId: undefined } : asset)));
    pushToast('success', 'Pasta removida. Os assets foram movidos para a raiz.');
  };

  const duplicateAssetFolder = (folderId: string) => {
    const source = assetFolders.find((folder) => folder.id === folderId);
    if (!source) return;
    const subtreeIds = collectAssetFolderDescendants(folderId, assetFolders);
    const foldersToCopy = assetFolders.filter((folder) => subtreeIds.has(folder.id));
    const idMap = new Map<string, string>();
    foldersToCopy.forEach((folder) => idMap.set(folder.id, createId()));
    const copiedFolders = foldersToCopy.map((folder) => ({
      ...folder,
      id: idMap.get(folder.id)!,
      name: folder.id === folderId ? `${folder.name} copia` : folder.name,
      parentId: folder.parentId && subtreeIds.has(folder.parentId) ? idMap.get(folder.parentId) : folder.parentId,
    }));
    const copiedGraphics = graphics
      .filter((asset) => asset.folderId && subtreeIds.has(asset.folderId))
      .map((asset) => ({
        ...asset,
        id: createId(),
        name: `${asset.name} copia`,
        folderId: asset.folderId ? idMap.get(asset.folderId) : undefined,
      }));
    setAssetFolders((current) => [...current, ...copiedFolders]);
    setGraphics((current) => [...current, ...copiedGraphics]);
  };

  const updateGraphicAsset = (assetId: string, patch: Partial<GraphicAsset>) => {
    setGraphics((current) => current.map((asset) => (asset.id === assetId ? { ...asset, ...patch } : asset)));
  };

  const duplicateGraphicAsset = (assetId: string) => {
    setGraphics((current) => {
      const source = current.find((asset) => asset.id === assetId);
      if (!source) return current;
      return [...current, { ...source, id: createId(), name: `${source.name} copia` }];
    });
  };

  const deleteGraphicAsset = (assetId: string) => {
    setGraphics((current) => current.filter((asset) => asset.id !== assetId));
  };

  const uploadFonts = async (files: File[]) => {
    try {
      const uploaded = await Promise.all(
        files.map(async (f) => {
          const src = await readFileAsDataUrl(f);
          const font: FontAsset = { id: createId(), name: f.name, family: inferFontFamily(f.name), src };
          await registerFontAsset(font);
          return font;
        }),
      );
      setFonts((prev) => [...prev, ...uploaded]);
      setSidebarTab('assets');
      pushToast('success', `${uploaded.length} fonte(s) adicionada(s).`);
    } catch { pushToast('error', 'Nao foi possivel carregar as fontes.'); }
  };

  const loadSystemFonts = async () => {
    const queryLocalFonts = (window as Window & {
      queryLocalFonts?: () => Promise<LocalFontData[]>;
    }).queryLocalFonts;

    if (!queryLocalFonts) {
      pushToast('info', 'Este ambiente nao permite listar fontes locais. Use as fontes comuns ou envie .ttf/.otf.');
      return;
    }

    try {
      const localFonts = await queryLocalFonts();
      const families = localFonts
        .map((font) => font.family)
        .filter((family): family is string => Boolean(family?.trim()));
      setSystemFonts((current) => [...new Set([...current, ...families])].sort((a, b) => a.localeCompare(b)));
      pushToast('success', `${new Set(families).size} fonte(s) locais detectada(s).`);
    } catch {
      pushToast('error', 'Nao foi possivel acessar as fontes locais.');
    }
  };

  const insertGraphic = (graphic: GraphicAsset) => {
    if (graphic.kind === 'icon' && selectedElement?.type === 'icon') {
      updateElement(selectedElement.id, { iconName: `asset:${graphic.id}`, customSrc: graphic.src, name: graphic.name });
      return;
    }
    if (selectedElement?.type === 'image') {
      updateElement(selectedElement.id, { src: graphic.src, name: graphic.name });
      return;
    }
    const img = createElement('image', activeCard);
    img.id = createId();
    img.name = graphic.name;
    img.src = graphic.src;
    img.zIndex = getNextZIndex(activeCard.elements);
    updateActiveCard((card) => ({ ...card, elements: [...card.elements, img] }));
    setSelectionStateIds([img.id]);
  };

  const resetDemoCard = () => {
    const fresh = createEmptyCard(activeCard.name, activeCard.width, activeCard.height);
    fresh.id = activeCard.id;
    updateActiveCard(() => fresh);
    setSelectionStateIds([]);
  };

  // ── Templates ─────────────────────────────────────────────────────────────
  const saveCardAsTemplate = (name: string, description: string) => {
    const el = cardRef.current;
    const doSave = (thumbnail: string) => {
      if (editingTemplateId) {
        const nextCard = cloneCardDocument({ ...activeCard, name });
        templateDraftCardRef.current = nextCard;
        setTemplateDraftCard(nextCard);
        setTemplates((prev) => {
          const nextTemplates = prev.map((template) =>
            template.id === editingTemplateId
              ? {
                  ...template,
                  name,
                  description,
                  thumbnail,
                  card: nextCard,
                  templateMode: 'data' as const,
                }
              : template,
          );
          templatesRef.current = nextTemplates;
          return nextTemplates;
        });
        pushToast('success', `Modelo "${name}" atualizado.`);
        return;
      }

      const template: CardTemplate = {
        id: createId(), name, description, thumbnail,
        card: cloneCardDocument({ ...activeCard, id: createId(), name }),
        templateMode: mode === 'template' ? 'data' : 'layout',
      };
      setTemplates((prev) => {
        const nextTemplates = [...prev, template];
        templatesRef.current = nextTemplates;
        return nextTemplates;
      });
      pushToast('success', `Modelo "${name}" salvo.`);
    };
    if (el) renderNodeToPng(el, { pixelRatio: 0.4, cacheBust: false }, fonts).then(doSave).catch(() => doSave(''));
    else doSave('');
  };

  const applyTemplate = (template: CardTemplate, asNewCard: boolean) => {
    if (asNewCard) {
      const newCard: CardDocument = {
        ...template.card,
        id: createId(),
        name: template.name,
        elements: template.card.elements.map((e) => ({ ...e, id: createId() })),
      };
      commitCards((current) => [...current, newCard]);
      setActiveCardId(newCard.id);
      setSelectionStateIds([]);
    } else {
      updateActiveCard((card) => ({
        ...template.card, id: card.id, name: card.name,
        elements: template.card.elements.map((e) => ({ ...e, id: createId() })),
      }));
      setSelectionStateIds([]);
    }
    pushToast('success', `Modelo "${template.name}" aplicado.`);
  };

  const deleteTemplate = (templateId: string) =>
    setTemplates((prev) => {
      const nextTemplates = prev.filter((template) => template.id !== templateId);
      templatesRef.current = nextTemplates;
      return nextTemplates;
    });

  // ── Render ────────────────────────────────────────────────────────────────
  const contextTarget = elementContextMenu
    ? activeCard.elements.find((element) => element.id === elementContextMenu.elementId)
    : null;
  const editorClassName = [
    'editor',
    isPreviewMode ? 'editor--preview' : '',
    isDataEditMode ? 'editor--data' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={editorClassName}>
      {/* ── Menubar ── */}
      <header className="menubar">
        <div className="menubar__brand">
          <button type="button" className="menubar__back-btn" onClick={onGoHome} title="Voltar para projeto">
            <ChevronLeft size={15} />
          </button>
          <div className="menubar__logo">BCS</div>
          <div className="menubar__brand-text">
            <span className="menubar__title">{initialData.projectName}</span>
            <span className="menubar__subtitle">
              {editingTemplate ? `Editando modelo: ${editingTemplate.name}` : mode === 'template' ? 'Editor de modelo' : 'Editor de cartas'}
            </span>
          </div>
        </div>

        <div className="menubar__actions">
          <button type="button" className="menubar__btn menubar__btn--primary" onClick={addCard} disabled={isEditingExistingTemplate || isDataEditMode}>
            <Plus size={13} />
            Nova carta
          </button>
          <button type="button" className="menubar__btn" onClick={resetDemoCard} disabled={isDataEditMode}>
            <RefreshCcw size={13} />
            Limpar
          </button>
          <button type="button" className="menubar__btn" onClick={undoCards} disabled={!canUndo}>
            <Undo2 size={13} />
            Desfazer
          </button>
          <button type="button" className="menubar__btn" onClick={redoCards} disabled={!canRedo}>
            <Redo2 size={13} />
            Refazer
          </button>

          <div className="menubar__sep" />

          <button type="button" className="menubar__btn" onClick={exportCurrentCard} disabled={isExporting}>
            <Download size={13} />
            {isExporting ? 'Exportando…' : 'PNG'}
          </button>
          <button type="button" className="menubar__btn" onClick={exportAllCardsAsPng} disabled={isExporting || totalCards === 0 || isEditingExistingTemplate}>
            <Download size={13} />
            Todos PNG
          </button>
          <button type="button" className="menubar__btn" onClick={exportProject}>
            <FileDown size={13} />
            Projeto
          </button>
          <button type="button" className="menubar__btn" onClick={() => projectImportRef.current?.click()}>
            <FileUp size={13} />
            Importar
          </button>

          <div className="menubar__sep" />

          <div className="menubar__zoom">
            <span className="menubar__zoom-label">Zoom</span>
            <input type="range" min={0.1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            <span className="menubar__zoom-val">{Math.round(zoom * 100)}%</span>
          </div>

          <button type="button" className={showGrid ? 'menubar__btn menubar__btn--active' : 'menubar__btn'} onClick={() => setShowGrid((v) => !v)}>
            <Grid2x2 size={13} />
            Grade
          </button>
          <button type="button" className={snapToGrid ? 'menubar__btn menubar__btn--active' : 'menubar__btn'} onClick={() => setSnapToGrid((v) => !v)}>
            <Magnet size={13} />
            Snap
          </button>
          <button
            type="button"
            className={isDataEditMode ? 'menubar__btn menubar__btn--active' : 'menubar__btn'}
            onClick={toggleDataEditMode}
            disabled={!canEditData}
            title={canEditData ? 'Editar apenas dados dinamicos' : 'Carta sem campos dinamicos'}
          >
            <Database size={13} />
            Dados
          </button>

          <div className="menubar__sep" />

          <div className="menubar__toolgroup">
            <button type="button" className="menubar__icon-btn" title="Alinhar à esquerda" disabled={!hasSelection} onClick={() => alignSelection('left')}><AlignHorizontalJustifyStart size={15} /></button>
            <button type="button" className="menubar__icon-btn" title="Centralizar horizontal" disabled={!hasSelection} onClick={() => alignSelection('center')}><AlignHorizontalJustifyCenter size={15} /></button>
            <button type="button" className="menubar__icon-btn" title="Alinhar à direita" disabled={!hasSelection} onClick={() => alignSelection('right')}><AlignHorizontalJustifyEnd size={15} /></button>
            <span className="menubar__tool-sep" />
            <button type="button" className="menubar__icon-btn" title="Alinhar ao topo" disabled={!hasSelection} onClick={() => alignSelection('top')}><AlignVerticalJustifyStart size={15} /></button>
            <button type="button" className="menubar__icon-btn" title="Centralizar vertical" disabled={!hasSelection} onClick={() => alignSelection('middle')}><AlignVerticalJustifyCenter size={15} /></button>
            <button type="button" className="menubar__icon-btn" title="Alinhar à base" disabled={!hasSelection} onClick={() => alignSelection('bottom')}><AlignVerticalJustifyEnd size={15} /></button>
            <span className="menubar__tool-sep" />
            <button type="button" className="menubar__icon-btn" title="Inverter horizontal" disabled={!canFlipSelection} onClick={() => flipSelection('x')}><FlipHorizontal2 size={15} /></button>
            <button type="button" className="menubar__icon-btn" title="Inverter vertical" disabled={!canFlipSelection} onClick={() => flipSelection('y')}><FlipVertical2 size={15} /></button>
            <span className="menubar__tool-sep" />
            <button type="button" className="menubar__icon-btn" title="Agrupar" disabled={!canGroupSelection} onClick={groupSelectedElements}><Group size={15} /></button>
            <button type="button" className="menubar__icon-btn" title="Desagrupar" disabled={!canUngroupSelection} onClick={ungroupSelectedElements}><Ungroup size={15} /></button>
          </div>
        </div>

        <div className="menubar__stats">
          <div className="menubar__stat">
            <span className="menubar__stat-label">Baralhos</span>
            <span className="menubar__stat-value">{decks.length}</span>
          </div>
          <div className="menubar__stat">
            <span className="menubar__stat-label">Cartas</span>
            <span className="menubar__stat-value">{totalCards}</span>
          </div>
          <div className="menubar__stat">
            <span className="menubar__stat-label">Seleção</span>
            <span className="menubar__stat-value">{isDataEditMode ? 'Dados' : selectedElement ? selectedElement.name : '—'}</span>
          </div>
        </div>
      </header>

      {/* ── Workspace ── */}
      <main
        className="workspace"
        style={{
          '--sidebar-w': `${sidebarWidth}px`,
          '--inspector-w': `${inspectorWidth}px`,
        } as CSSProperties}
      >
        <Sidebar
          activeTab={sidebarTab}
          onChangeTab={setSidebarTab}
          onAddElement={addElementToCard}
          graphics={graphics}
          assetFolders={assetFolders}
          fonts={fonts}
          layers={activeCard.elements}
          selectedElementIds={isDataEditMode ? [] : selectedElementIds}
          groupNames={activeCard.groupNames ?? {}}
          collapsedGroupIds={collapsedGroupIds}
          onToggleGroup={toggleGroupCollapsed}
          onSelectGroup={selectGroup}
          onRenameGroup={renameGroup}
          onSelectLayer={selectLayer}
          onMoveLayer={(elementId, direction) =>
            updateActiveCard((card) => ({ ...card, elements: moveElementLayer(card.elements, elementId, direction) }))
          }
          onReorderLayer={(draggedId, targetId) =>
            updateActiveCard((card) => ({ ...card, elements: reorderElementLayer(card.elements, draggedId, targetId) }))
          }
          onToggleLayerLock={toggleLayerLock}
          onToggleLayerHide={toggleLayerHide}
          onRenameLayer={renameLayer}
          onDuplicateLayer={duplicateSelectedElement}
          onDeleteLayer={deleteSelectedElement}
          onInsertGraphic={insertGraphic}
          onUseGraphicAsBackground={(graphic) =>
            updateActiveCard((card) => ({ ...card, background: { ...card.background, imageSrc: graphic.src } }))
          }
          onAddAssetFolder={addAssetFolder}
          onUpdateAssetFolder={updateAssetFolder}
          onDeleteAssetFolder={deleteAssetFolder}
          onDuplicateAssetFolder={duplicateAssetFolder}
          onUpdateGraphicAsset={updateGraphicAsset}
          onDuplicateGraphicAsset={duplicateGraphicAsset}
          onDeleteGraphicAsset={deleteGraphicAsset}
          onRequestGraphicUpload={(folderId) => {
            pendingGraphicFolderIdRef.current = folderId;
            graphicUploadRef.current?.click();
          }}
          onRequestFontUpload={() => fontUploadRef.current?.click()}
          templates={templates}
          authoringMode={mode}
          editingTemplate={editingTemplate}
          onSaveCardAsTemplate={mode === 'template' ? saveCardAsTemplate : undefined}
          onApplyTemplate={applyTemplate}
          onDeleteTemplate={deleteTemplate}
        />

        <div
          className="sidebar-resizer"
          onMouseDown={beginSidebarResize}
          title="Redimensionar painel esquerdo"
        />

        <CanvasStage
          card={activeCard}
          zoom={zoom}
          onZoomChange={setZoom}
          showGrid={isPreviewMode ? false : showGrid}
          snapToGrid={snapToGrid}
          selectedElementIds={isPreviewMode || isDataEditMode ? [] : selectedElementIds}
          isExporting={isExporting}
          editingElementId={isPreviewMode || isDataEditMode ? null : editingElementId}
          onSelectElement={selectElement}
          onSelectElements={selectElements}
          onUpdateElement={updateElement}
          onUpdateElements={updateElements}
          onBeginElementMove={beginElementMoveHistory}
          onMoveElement={moveElementFromCanvas}
          onEndElementMove={endElementMoveHistory}
          onStartEditElement={startEditElement}
          onCommitEdit={commitElementEdit}
          onCancelEdit={cancelElementEdit}
          onElementContextMenu={openElementContextMenu}
          onDuplicateSelection={duplicateSelectedElements}
          onDeleteSelection={deleteSelectedElements}
          onBringSelectionToFront={() => moveSelectionToEdge('front')}
          onSendSelectionToBack={() => moveSelectionToEdge('back')}
          onLockSelection={lockSelectedElements}
          onFlipSelectionX={() => flipSelection('x')}
          onFlipSelectionY={() => flipSelection('y')}
          onResetSelectionRotation={resetSelectedRotation}
          cardRef={cardRef}
          showTemplateBindings={mode === 'template' || isDataEditMode}
          interactionDisabled={isPreviewMode || isDataEditMode}
        />

        <div
          className="inspector-resizer"
          onMouseDown={beginInspectorResize}
          title="Redimensionar painel"
        />

        <InspectorPanel
          card={activeCard}
          selectedElement={isDataEditMode ? null : selectedElement}
          selectedElements={isDataEditMode ? [] : selectedElements}
          graphics={graphics}
          fontOptions={fontOptions}
          onLoadSystemFonts={loadSystemFonts}
          onUpdateCard={(patch) => updateActiveCard((card) => ({ ...card, ...patch }))}
          onUpdateBackground={(patch) =>
            updateActiveCard((card) => ({ ...card, background: { ...card.background, ...patch } }))
          }
          onUpdateElement={updateElement}
          dataEditMode={isDataEditMode}
          onUpdateDynamicField={updateDynamicField}
          onExitDataEditMode={() => setDataEditModeRequested(false)}
          mode={mode}
        />
      </main>

      {/* ── Card strip with deck tabs ── */}
      {isEditingExistingTemplate ? (
        <div className="template-edit-strip">
          <span>Modelo</span>
          <strong>{editingTemplate?.name ?? activeCard.name}</strong>
          <em>Alteracoes aplicadas ao modelo existente</em>
        </div>
      ) : (
        <CardStrip
          cards={cards}
          activeCardId={activeCardId}
          onSelectCard={(cardId) => {
            startTransition(() => { setActiveCardId(cardId); setSelectionStateIds([]); });
          }}
          onAddCard={addCard}
          onDuplicateCard={duplicateCard}
          onDeleteCard={deleteCard}
          onRenameCard={renameCard}
          onReorderCards={reorderCards}
          onDeleteCards={deleteCards}
          onMoveCardsToDeck={moveCardsToDeck}
          decks={decks}
          activeDeckId={activeDeckId}
          isCanvasInteracting={isCanvasInteracting}
          onSelectDeck={switchDeck}
          onAddDeck={() => setShowNewDeckModal(true)}
          onRenameDeck={renameDeck}
          onDeleteDeck={deleteDeck}
        />
      )}

      {elementContextMenu && contextTarget ? (
        <>
          <button
            type="button"
            className="canvas-context-menu__scrim"
            aria-label="Fechar menu de contexto"
            onMouseDown={() => setElementContextMenu(null)}
          />
          <div
            className="canvas-context-menu"
            style={{ left: elementContextMenu.x, top: elementContextMenu.y }}
            role="menu"
            aria-label={`Acoes de ${contextTarget.name}`}
          >
            <button type="button" role="menuitem" onClick={() => runElementContextAction(duplicateSelectedElement)}>
              Duplicar
            </button>
            <button type="button" role="menuitem" onClick={() => runElementContextAction(deleteSelectedElement)}>
              Deletar
            </button>
            <button type="button" role="menuitem" onClick={() => runElementContextAction(toggleLayerLock)}>
              {contextTarget.locked ? 'Desbloquear' : 'Bloquear'}
            </button>
            <button type="button" role="menuitem" onClick={() => runElementContextAction(toggleLayerHide)}>
              {contextTarget.hidden ? 'Mostrar' : 'Ocultar'}
            </button>
            <span className="canvas-context-menu__sep" />
            <button type="button" role="menuitem" onClick={() => runElementContextAction((id) => moveElementToEdge(id, 'front'))}>
              Trazer para frente
            </button>
            <button type="button" role="menuitem" onClick={() => runElementContextAction((id) => moveElementToEdge(id, 'back'))}>
              Enviar para trás
            </button>
            <span className="canvas-context-menu__sep" />
            <button type="button" role="menuitem" onClick={() => runElementContextAction(copyElementStyle)}>
              Copiar estilo
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!copiedStyleRef.current}
              onClick={() => runElementContextAction(pasteElementStyle)}
            >
              Colar estilo
            </button>
          </div>
        </>
      ) : null}

      {/* Hidden file inputs */}
      <input ref={graphicUploadRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" multiple hidden onChange={async (e) => { await uploadGraphics(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <input ref={fontUploadRef} type="file" accept=".ttf,.otf,.woff,.woff2" multiple hidden onChange={async (e) => { await uploadFonts(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
      <input ref={projectImportRef} type="file" accept="application/json,.json" hidden onChange={async (e) => { await importProject(e.target.files?.[0]); e.target.value = ''; }} />

      {/* New Deck Modal */}
      {showNewDeckModal && (
        <NewDeckModal
          existingCount={decks.length}
          onConfirm={addDeck}
          onClose={() => setShowNewDeckModal(false)}
        />
      )}

      {showFindReplaceModal && (
        <FindReplaceModal
          deckName={`Baralho: ${activeDeck.name}`}
          query={findQuery}
          replacement={replaceValue}
          matchCase={findMatchCase}
          stats={findReplaceStats}
          onQueryChange={setFindQuery}
          onReplacementChange={setReplaceValue}
          onMatchCaseChange={setFindMatchCase}
          onReplaceAll={replaceTextAcrossDeck}
          onClose={() => setShowFindReplaceModal(false)}
        />
      )}

      {/* Toasts */}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
            <div className="toast__body">
              <span className="toast__label">{toast.tone === 'error' ? 'Erro' : toast.tone === 'success' ? 'Sucesso' : 'Aviso'}</span>
              <p>{toast.message}</p>
            </div>
            <button type="button" className="toast__close" onClick={() => dismissToast(toast.id)}>Fechar</button>
          </div>
        ))}
      </div>
    </div>
  );
}
