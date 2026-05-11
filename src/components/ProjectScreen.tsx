import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileUp,
  FolderOpen,
  Layers3,
  PencilRuler,
  Plus,
  Shapes,
  WandSparkles,
} from 'lucide-react';

import { CardElementView } from './CardElementView';
import {
  createCardFromTemplateRow,
  createDeckFromTemplateRows,
  createDefaultMapping,
  extractTemplateFields,
  parseBatchTable,
  normalizeKey,
  validateBatch,
} from '../lib/batch';
import { ICON_CATALOG } from '../iconCatalog';
import { createId, getBackgroundStyle, getTextureStyle, readFileAsText } from '../lib/editor';
import { loadLibrary, loadProject, saveProject } from '../lib/storage';
import type { BatchField } from '../lib/batch';
import type {
  CardDocument,
  CardElement,
  CardTemplate,
  Deck,
  EditorMode,
  ElementBindingKind,
  GraphicAsset,
  ProjectSnapshot,
} from '../types';

interface ProjectScreenProps {
  projectId: string;
  onGoHome: () => void;
  onOpenEditor: (options: {
    mode: EditorMode;
    initialDeckId?: string | null;
    launchTemplateId?: string | null;
  }) => void;
}

function resolveDecks(snapshot: ProjectSnapshot | null): Deck[] {
  if (snapshot?.decks?.length) return snapshot.decks;
  if (snapshot?.cards?.length) {
    const first = snapshot.cards[0];
    return [{
      id: 'legacy-deck',
      name: 'Principal',
      color: '#f6a823',
      cardWidth: first.width,
      cardHeight: first.height,
      cards: snapshot.cards,
      description: '',
    }];
  }
  return [];
}

function formatUpdated(ts?: number) {
  if (!ts) return 'sem atividade recente';
  return new Date(ts).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getBatchFieldExampleValue(field: BatchField) {
  if (field.kinds.includes('image')) return 'nome-do-asset.png';
  if (field.kinds.includes('icon')) return 'flame';
  if (field.kinds.includes('color')) return field.sample || '#f6a823';
  if (field.kinds.includes('number')) return field.sample || '3';
  return field.sample || `Exemplo ${field.key}`;
}

function escapeDelimitedCell(value: string, delimiter: string) {
  const clean = String(value ?? '');
  if (!clean.includes(delimiter) && !/["\r\n]/.test(clean)) return clean;
  return `"${clean.replace(/"/g, '""')}"`;
}

function sanitizeFileName(value: string) {
  return normalizeKey(value).replace(/_+/g, '-') || 'modelo';
}

function buildTemplateCsv(template: CardTemplate) {
  const fields = extractTemplateFields(template);
  const delimiter = ';';
  const rows = [
    fields.map((field) => field.key),
    fields.map(getBatchFieldExampleValue),
  ];

  return rows
    .map((row) => row.map((cell) => escapeDelimitedCell(cell, delimiter)).join(delimiter))
    .join('\r\n');
}

function downloadTemplateCsv(template: CardTemplate | null) {
  if (!template) return;
  const csv = buildTemplateCsv(template);
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFileName(template.name)}-planilha-modelo.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function StaticCardPreview({ card }: { card: CardDocument }) {
  const scale = Math.min(1, 280 / card.width, 390 / card.height);
  const orderedElements = [...card.elements]
    .filter((element) => !element.hidden)
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="batch-preview-frame" style={{ width: card.width * scale, height: card.height * scale }}>
      <div
        className="card-surface card-surface--preview"
        style={{
          width: card.width,
          height: card.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="card-surface__clip">
          <div className="card-surface__background" style={getBackgroundStyle(card.background)} />
          {card.background.imageSrc ? (
            <div
              className="card-surface__background card-surface__background--image"
              style={{
                opacity: card.background.imageOpacity,
                backgroundImage: `url(${card.background.imageSrc})`,
                backgroundSize: card.background.imageFit,
              }}
            />
          ) : null}
          {card.background.texture !== 'none' ? (
            <div className="card-surface__background card-surface__background--texture" style={getTextureStyle(card.background.texture)} />
          ) : null}
          {orderedElements.map((element) => (
            <div
              key={element.id}
              className="canvas-node-visual"
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
                zIndex: element.zIndex,
              }}
            >
              <div
                className="canvas-node__content"
                style={{
                  rotate: `${element.rotation}deg`,
                  transformOrigin: 'center center',
                }}
              >
                <CardElementView element={element} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type TemplateFillSource = 'binding' | 'auto';

interface TemplateFillField {
  id: string;
  key: string;
  label: string;
  kind: ElementBindingKind;
  kinds: ElementBindingKind[];
  sample: string;
  source: TemplateFillSource;
  elementId?: string;
  property?: string;
}

const TEMPLATE_FILL_KIND_LABELS: Record<ElementBindingKind, string> = {
  text: 'Texto',
  image: 'Imagem',
  icon: 'Icone',
  number: 'Numero',
  color: 'Cor',
};

function preferredFillKind(kinds: ElementBindingKind[]) {
  if (kinds.includes('image')) return 'image';
  if (kinds.includes('icon')) return 'icon';
  if (kinds.includes('color')) return 'color';
  if (kinds.includes('number')) return 'number';
  return 'text';
}

function uniqueFieldKey(base: string, usedKeys: Set<string>) {
  const clean = normalizeKey(base) || 'campo';
  let next = clean;
  let suffix = 2;
  while (usedKeys.has(next)) {
    next = `${clean}_${suffix}`;
    suffix += 1;
  }
  usedKeys.add(next);
  return next;
}

function inferElementFields(element: CardElement, usedKeys: Set<string>): TemplateFillField[] {
  const baseLabel = element.name || element.type;
  const makeField = (
    property: string,
    labelSuffix: string,
    kind: ElementBindingKind,
    sample: string | number,
  ): TemplateFillField => ({
    id: `${element.id}:${property}`,
    key: uniqueFieldKey(labelSuffix ? `${baseLabel}_${labelSuffix}` : baseLabel, usedKeys),
    label: labelSuffix ? `${baseLabel} - ${labelSuffix}` : baseLabel,
    kind,
    kinds: [kind],
    sample: String(sample ?? ''),
    source: 'auto',
    elementId: element.id,
    property,
  });

  switch (element.type) {
    case 'text':
      return [makeField('content', 'texto', 'text', element.content)];
    case 'title':
      return [
        makeField('text', 'titulo', 'text', element.text),
        ...(element.subtitle ? [makeField('subtitle', 'subtitulo', 'text', element.subtitle)] : []),
      ];
    case 'info':
      return [
        ...(element.title ? [makeField('title', 'titulo', 'text', element.title)] : []),
        makeField('body', 'texto', 'text', element.body),
      ];
    case 'number':
      return [
        makeField('value', 'valor', 'number', element.value),
        ...(element.showLabel ? [makeField('label', 'rotulo', 'text', element.label)] : []),
      ];
    case 'marker':
      return [makeField('symbol', 'simbolo', 'text', element.symbol), makeField('label', 'rotulo', 'text', element.label)];
    case 'bar':
      return [makeField('value', 'valor', 'number', element.value), makeField('label', 'rotulo', 'text', element.label)];
    case 'counter':
      return [makeField('value', 'valor', 'number', element.value)];
    case 'seal':
      return [makeField('label', 'rotulo', 'text', element.label)];
    case 'die':
      return [makeField('value', 'valor', 'number', element.value)];
    case 'image':
    case 'portrait':
      return [makeField('src', 'imagem', 'image', element.src)];
    case 'icon':
      return [makeField('iconName', 'icone', 'icon', element.iconName)];
    case 'shape':
      return [makeField('fill', 'cor', 'color', element.fill)];
    default:
      return [];
  }
}

function getTemplateElementFillValue(element: CardElement) {
  switch (element.type) {
    case 'text':
      return element.content;
    case 'title':
      return element.text;
    case 'info':
      return element.body || element.title;
    case 'number':
      return element.value;
    case 'marker':
      return element.label || element.symbol;
    case 'bar':
    case 'counter':
      return String(element.value);
    case 'seal':
      return element.label;
    case 'die':
      return element.value;
    case 'image':
    case 'portrait':
      return element.src;
    case 'icon':
      return element.customSrc || element.iconName;
    case 'shape':
      return element.fill;
    default:
      return element.name;
  }
}

function getBoundFieldSample(template: CardTemplate, key: string, fallback: string) {
  const normalizedKey = normalizeKey(key);
  const element = template.card.elements.find((candidate) =>
    candidate.binding && normalizeKey(candidate.binding.key) === normalizedKey
  );
  return element ? getTemplateElementFillValue(element) : fallback;
}

function getTemplateFillFields(template: CardTemplate | null): TemplateFillField[] {
  if (!template) return [];

  const boundFields = extractTemplateFields(template);
  if (boundFields.length > 0) {
    return boundFields.map((field) => ({
      id: `binding:${field.key}`,
      key: field.key,
      label: field.key,
      kind: preferredFillKind(field.kinds),
      kinds: field.kinds,
      sample: getBoundFieldSample(template, field.key, field.sample),
      source: 'binding',
    }));
  }

  const usedKeys = new Set<string>();
  return template.card.elements.flatMap((element) => inferElementFields(element, usedKeys));
}

function assetMatches(asset: GraphicAsset, value: string) {
  const wanted = normalizeKey(value);
  return normalizeKey(asset.id) === wanted ||
    normalizeKey(asset.name) === wanted ||
    normalizeKey(asset.name.replace(/\.[a-z0-9]+$/i, '')) === wanted ||
    asset.src === value;
}

function resolveAssetSource(value: string, assets: GraphicAsset[]) {
  const clean = value.trim();
  if (!clean) return '';
  if (/^(https?:|data:image\/|blob:)/i.test(clean)) return clean;
  return assets.find((asset) => assetMatches(asset, clean))?.src ?? clean;
}

function isEmbeddedImageValue(value: string) {
  return /^data:image\//i.test(value.trim());
}

function normalizeColorInputValue(value: string, fallback = '#ffffff') {
  const clean = value.trim();
  const expand = (hex: string) => `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  if (/^#[0-9a-f]{3}$/i.test(clean)) return expand(clean);
  if (/^#[0-9a-f]{6}$/i.test(clean)) return clean;
  const fallbackClean = fallback.trim();
  if (/^#[0-9a-f]{3}$/i.test(fallbackClean)) return expand(fallbackClean);
  if (/^#[0-9a-f]{6}$/i.test(fallbackClean)) return fallbackClean;
  return '#ffffff';
}

function resolveAssetPreviewSource(value: string, assets: GraphicAsset[]) {
  const clean = value.trim();
  if (!clean) return '';
  if (/^(https?:|data:image\/|blob:)/i.test(clean)) return clean;
  return assets.find((asset) => assetMatches(asset, clean))?.src ?? '';
}

function resolveBuiltInIconName(value: string) {
  const normalized = normalizeKey(value);
  return ICON_CATALOG.find((icon) =>
    normalizeKey(icon.name) === normalized ||
    normalizeKey(icon.label) === normalized
  )?.name ?? null;
}

function resolveIconFill(value: string, assets: GraphicAsset[]) {
  const clean = value.trim();
  if (!clean) return null;

  const builtIn = resolveBuiltInIconName(clean);
  if (builtIn) return { iconName: builtIn, customSrc: undefined };

  const assetSrc = resolveAssetPreviewSource(clean, assets);
  if (assetSrc) return { iconName: undefined, customSrc: assetSrc };

  if (/^(https?:|data:image\/|blob:)/i.test(clean)) {
    return { iconName: undefined, customSrc: clean };
  }

  return null;
}

function patchAutoField(element: CardElement, field: TemplateFillField, value: string, assets: GraphicAsset[]): CardElement {
  if (!field.property || element.id !== field.elementId) return element;
  const patch: Record<string, unknown> = {};
  if (field.kind === 'image') patch[field.property] = resolveAssetSource(value, assets);
  else if (field.kind === 'color') patch[field.property] = value.trim() || field.sample;
  else if (field.kind === 'icon' && element.type === 'icon') {
    const icon = resolveIconFill(value, assets);
    if (icon?.iconName) {
      patch.iconName = icon.iconName;
      patch.customSrc = undefined;
    } else if (icon?.customSrc) {
      patch.customSrc = icon.customSrc;
    } else {
      patch.iconName = value.trim() || element.iconName;
      patch.customSrc = undefined;
    }
  }
  else if (field.property === 'value' && (element.type === 'bar' || element.type === 'counter')) {
    const numeric = Number(value.replace(',', '.'));
    patch.value = Number.isFinite(numeric) ? numeric : element.value;
  } else {
    patch[field.property] = value;
  }
  return { ...element, ...patch } as CardElement;
}

function resolveCardNameFromFill(template: CardTemplate, fields: TemplateFillField[], values: Record<string, string>, cardName: string) {
  const typedName = cardName.trim();
  if (typedName && typedName !== template.name) return typedName;

  const nameField =
    fields.find((field) => ['nome', 'name', 'titulo', 'title'].includes(normalizeKey(field.key)) && field.kind === 'text') ??
    fields.find((field) => ['nome', 'name', 'titulo', 'title'].some((needle) => normalizeKey(field.label).includes(needle)) && field.kind === 'text') ??
    fields.find((field) => field.kind === 'text');

  const fieldValue = nameField ? values[nameField.id]?.trim() : '';
  return fieldValue || typedName || template.name;
}

function createCardFromFillValues(
  template: CardTemplate,
  fields: TemplateFillField[],
  values: Record<string, string>,
  assets: GraphicAsset[],
  cardName: string,
): CardDocument {
  const resolvedName = resolveCardNameFromFill(template, fields, values, cardName);

  if (fields.some((field) => field.source === 'binding')) {
    const row = Object.fromEntries(fields.map((field) => [field.key, values[field.id] ?? field.sample])) as Record<string, string>;
    const mapping = Object.fromEntries(fields.map((field) => [field.key, field.key]));
    return {
      ...createCardFromTemplateRow(template, row, mapping, assets, 0),
      name: resolvedName,
    };
  }

  return {
    ...template.card,
    id: createId(),
    name: resolvedName,
    elements: template.card.elements.map((element) => {
      const next = { ...element, id: createId() };
      const sourceId = element.id;
      return fields
        .filter((field) => field.elementId === sourceId)
        .reduce<CardElement>(
          (current, field) => patchAutoField(current, { ...field, elementId: next.id }, values[field.id] ?? field.sample, assets),
          next,
        );
    }),
  };
}

interface FillFieldControlProps {
  assets: GraphicAsset[];
  field: TemplateFillField;
  onChange: (value: string) => void;
  value: string;
}

function FillFieldControl({ assets, field, onChange, value }: FillFieldControlProps) {
  const kindLabel = field.kinds.map((kind) => TEMPLATE_FILL_KIND_LABELS[kind]).join(' / ');
  const sourceLabel = field.source === 'auto' ? 'detectado no modelo' : 'campo dinamico';
  const imageAssets = assets.filter((asset) => asset.kind !== 'icon');
  const iconAssets = assets.filter((asset) => asset.kind === 'icon');

  if (field.kind === 'image') {
    const previewSrc = resolveAssetPreviewSource(value, assets);
    const isEmbedded = isEmbeddedImageValue(value);
    return (
      <div className="fill-field fill-field--wide fill-field--media">
        <div className="fill-field__head">
          <span>{field.label}</span>
          <small>{kindLabel} - {sourceLabel}</small>
        </div>

        <div className="fill-media-picker">
          <div className="fill-media-picker__preview">
            {previewSrc ? <img src={previewSrc} alt="" loading="lazy" /> : <span>Imagem</span>}
          </div>
          <div className="fill-media-picker__body">
            <div className="fill-choice-grid fill-choice-grid--images">
              {imageAssets.length === 0 ? (
                <div className="fill-choice-empty">Sem assets de imagem neste projeto.</div>
              ) : imageAssets.map((asset) => {
                const selected = assetMatches(asset, value);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={selected ? 'fill-asset-choice fill-asset-choice--active' : 'fill-asset-choice'}
                    title={asset.name}
                    onClick={() => onChange(asset.name)}
                  >
                    <img src={asset.src} alt="" loading="lazy" />
                    <span>{asset.name}</span>
                  </button>
                );
              })}
            </div>
            {isEmbedded ? (
              <div className="fill-current-source">
                <span>Imagem embutida do modelo mantida.</span>
                <button type="button" onClick={() => onChange('')}>Limpar</button>
              </div>
            ) : (
              <label className="fill-source-input">
                <span>URL ou nome do asset</span>
                <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="imagem.png ou https://..." />
              </label>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (field.kind === 'icon') {
    const selectedBuiltIn = resolveBuiltInIconName(value);
    const selectedCustomSrc = resolveIconFill(value, assets)?.customSrc;
    const isEmbedded = isEmbeddedImageValue(value);
    return (
      <div className="fill-field fill-field--wide fill-field--icon">
        <div className="fill-field__head">
          <span>{field.label}</span>
          <small>{kindLabel} - {sourceLabel}</small>
        </div>

        <div className="fill-icon-panel">
          <div className="fill-choice-grid fill-choice-grid--icons">
            {ICON_CATALOG.map((icon) => {
              const Icon = icon.icon;
              const selected = selectedBuiltIn === icon.name;
              return (
                <button
                  key={icon.name}
                  type="button"
                  className={selected ? 'fill-icon-choice fill-icon-choice--active' : 'fill-icon-choice'}
                  onClick={() => onChange(icon.name)}
                  title={icon.label}
                >
                  <Icon size={18} />
                  <span>{icon.label}</span>
                </button>
              );
            })}
          </div>

          {iconAssets.length > 0 ? (
            <>
              <div className="fill-picker-subtitle">Assets de icone</div>
              <div className="fill-choice-grid fill-choice-grid--asset-icons">
                {iconAssets.map((asset) => {
                  const selected = assetMatches(asset, value);
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      className={selected ? 'fill-asset-choice fill-asset-choice--active' : 'fill-asset-choice'}
                      title={asset.name}
                      onClick={() => onChange(asset.name)}
                    >
                      <img src={asset.src} alt="" loading="lazy" />
                      <span>{asset.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {selectedCustomSrc ? (
            <div className="fill-custom-icon-preview">
              <img src={selectedCustomSrc} alt="" loading="lazy" />
              <span>Icone customizado selecionado</span>
            </div>
          ) : null}

          {isEmbedded ? (
            <div className="fill-current-source">
              <span>Icone embutido do modelo mantido.</span>
              <button type="button" onClick={() => onChange('')}>Limpar</button>
            </div>
          ) : (
            <label className="fill-source-input">
              <span>Nome do icone, asset ou URL</span>
              <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="flame, shield, icone.png..." />
            </label>
          )}
        </div>
      </div>
    );
  }

  if (field.kind === 'number') {
    return (
      <label className="fill-field">
        <span>
          {field.label}
          <small>{kindLabel} - {sourceLabel}</small>
        </span>
        <input
          type="number"
          value={value}
          placeholder={field.sample}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (field.kind === 'color') {
    return (
      <label className="fill-field fill-field--color">
        <span>
          {field.label}
          <small>{kindLabel} - {sourceLabel}</small>
        </span>
        <div className="fill-color-control">
          <input
            type="color"
            value={normalizeColorInputValue(value, field.sample)}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`Cor de ${field.label}`}
          />
          <input
            value={value}
            placeholder={field.sample || '#f6a823'}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
      </label>
    );
  }

  const shouldUseTextarea = value.includes('\n') || field.sample.length > 72 || ['body', 'descricao', 'efeito'].some((key) => normalizeKey(field.key).includes(key));
  return (
    <label className={shouldUseTextarea ? 'fill-field fill-field--wide' : 'fill-field'}>
      <span>
        {field.label}
        <small>{kindLabel} - {sourceLabel}</small>
      </span>
      {shouldUseTextarea ? (
        <textarea
          value={value}
          placeholder={field.sample}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value}
          placeholder={field.sample}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

interface TemplateFillModalProps {
  snapshot: ProjectSnapshot;
  decks: Deck[];
  initialTemplateId?: string | null;
  onClose: () => void;
  onBlankCard: () => void;
  onOpenDeck: (deckId: string) => void;
}

function TemplateFillModal({ snapshot, decks, initialTemplateId, onClose, onBlankCard, onOpenDeck }: TemplateFillModalProps) {
  const templates = snapshot.templates ?? [];
  const firstTemplate = templates.find((template) => template.id === initialTemplateId) ?? templates[0] ?? null;
  const [templateId, setTemplateId] = useState(firstTemplate?.id ?? '');
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? firstTemplate;
  const fields = useMemo(() => getTemplateFillFields(selectedTemplate), [selectedTemplate]);
  const [targetDeckId, setTargetDeckId] = useState(decks[0]?.id ?? '');
  const [cardName, setCardName] = useState(firstTemplate?.name ?? 'Nova carta');
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(getTemplateFillFields(firstTemplate).map((field) => [field.id, field.sample])),
  );

  const selectTemplate = (template: CardTemplate) => {
    const nextFields = getTemplateFillFields(template);
    setTemplateId(template.id);
    setCardName(template.name);
    setValues(Object.fromEntries(nextFields.map((field) => [field.id, field.sample])));
  };

  const previewCard = useMemo(() => {
    if (!selectedTemplate) return null;
    return createCardFromFillValues(selectedTemplate, fields, values, snapshot.graphics ?? [], cardName);
  }, [selectedTemplate, fields, values, snapshot.graphics, cardName]);

  const createCard = () => {
    if (!selectedTemplate || !previewCard || !targetDeckId) return;
    const nextCard = { ...previewCard, id: createId() };
    const nextDecks = decks.map((deck) =>
      deck.id === targetDeckId ? { ...deck, cards: [nextCard, ...deck.cards] } : deck,
    );
    saveProject({
      ...snapshot,
      decks: nextDecks,
      cards: [],
      templates,
      graphics: snapshot.graphics ?? [],
      assetFolders: snapshot.assetFolders ?? [],
      fonts: snapshot.fonts ?? [],
    });
    onOpenDeck(targetDeckId);
  };

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div className="ps-modal fill-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ps-modal__head batch-modal__head">
          <div>
            <span className="batch-eyebrow">Criar carta</span>
            <h2>Preencher modelo</h2>
          </div>
          <button type="button" className="batch-close" onClick={onClose}>Fechar</button>
        </div>

        {templates.length === 0 ? (
          <div className="batch-empty">
            <BookMarked size={22} />
            <strong>Nenhum modelo salvo.</strong>
            <span>Crie um modelo ou comece em branco.</span>
            <button type="button" className="batch-generate" onClick={onBlankCard}>Comecar em branco</button>
          </div>
        ) : (
          <div className="fill-layout">
            <aside className="batch-sidebar">
              <div className="batch-section-title">1. Modelo</div>
              <div className="batch-template-list">
                {templates.map((template) => {
                  const templateFields = getTemplateFillFields(template);
                  const isActive = selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      className={isActive ? 'batch-template batch-template--active' : 'batch-template'}
                      onClick={() => selectTemplate(template)}
                    >
                      <span className="batch-template__thumb">
                        {template.thumbnail ? <img src={template.thumbnail} alt={template.name} /> : <BookMarked size={16} />}
                      </span>
                      <span>
                        <strong>{template.name}</strong>
                        <small>{templateFields.length} campo{templateFields.length === 1 ? '' : 's'} {templateFields.some((field) => field.source === 'auto') ? 'detectado(s)' : 'marcado(s)'}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button type="button" className="fill-blank-btn" onClick={onBlankCard}>Carta em branco</button>
            </aside>

            <main className="batch-main">
              <section className="batch-panel">
                <div className="batch-panel__head">
                  <div>
                    <span className="batch-section-title">2. Conteudo</span>
                    <p>Preencha os campos e veja o resultado antes de criar a carta.</p>
                  </div>
                </div>

                <div className="fill-fields">
                  <label className="fill-field">
                    <span>Nome da carta</span>
                    <input value={cardName} onChange={(event) => setCardName(event.target.value)} />
                  </label>

                  <label className="fill-field">
                    <span>Baralho de destino</span>
                    <select value={targetDeckId} onChange={(event) => setTargetDeckId(event.target.value)}>
                      {decks.map((deck) => (
                        <option key={deck.id} value={deck.id}>{deck.name}</option>
                      ))}
                    </select>
                  </label>

                  {fields.length === 0 ? (
                    <div className="batch-empty-inline">
                      <AlertTriangle size={16} />
                      Este modelo nao tem texto, imagem ou numero editavel detectavel.
                    </div>
                  ) : fields.map((field) => (
                    <FillFieldControl
                      key={field.id}
                      field={field}
                      value={values[field.id] ?? ''}
                      assets={snapshot.graphics ?? []}
                      onChange={(nextValue) => setValues((current) => ({ ...current, [field.id]: nextValue }))}
                    />
                  ))}
                </div>
              </section>
            </main>

            <aside className="batch-preview">
              <div className="batch-section-title">3. Preview</div>
              <div className="batch-preview__surface">
                {previewCard ? <StaticCardPreview card={previewCard} /> : (
                  <div className="batch-preview__empty">
                    <WandSparkles size={24} />
                    <span>Escolha um modelo para ver a carta.</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="batch-generate"
                disabled={!selectedTemplate || !targetDeckId}
                onClick={createCard}
              >
                <WandSparkles size={15} />
                Criar carta e abrir
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

interface BatchDeckModalProps {
  snapshot: ProjectSnapshot;
  decks: Deck[];
  onClose: () => void;
  onOpenDeck: (deckId: string) => void;
}

function BatchDeckModal({ snapshot, decks, onClose, onOpenDeck }: BatchDeckModalProps) {
  const templates = snapshot.templates ?? [];
  const firstTemplate = templates[0] ?? null;
  const [templateId, setTemplateId] = useState(firstTemplate?.id ?? '');
  const selectedTemplate = templates.find((template) => template.id === templateId) ?? firstTemplate;
  const [tableText, setTableText] = useState('');
  const [deckName, setDeckName] = useState(() => selectedTemplate ? `Baralho - ${selectedTemplate.name}` : 'Baralho gerado');
  const [previewIndex, setPreviewIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fields = useMemo(
    () => (selectedTemplate ? extractTemplateFields(selectedTemplate) : []),
    [selectedTemplate],
  );
  const parsed = useMemo(() => parseBatchTable(tableText), [tableText]);

  const defaultMapping = useMemo(
    () => createDefaultMapping(fields, parsed.headers),
    [fields, parsed.headers],
  );
  const mapping = defaultMapping;

  const issues = useMemo(
    () => validateBatch(selectedTemplate ?? null, fields, parsed.headers, parsed.rows, mapping, snapshot.graphics),
    [selectedTemplate, fields, parsed.headers, parsed.rows, mapping, snapshot.graphics],
  );
  const hasErrors = issues.some((issue) => issue.tone === 'error');
  const canGenerate = !hasErrors && parsed.rows.length > 0;

  const safePreviewIndex = Math.min(previewIndex, Math.max(parsed.rows.length - 1, 0));
  const previewCard = useMemo(() => {
    if (!selectedTemplate || hasErrors || parsed.rows.length === 0) return null;
    return createCardFromTemplateRow(
      selectedTemplate,
      parsed.rows[safePreviewIndex],
      mapping,
      snapshot.graphics,
      safePreviewIndex,
    );
  }, [selectedTemplate, hasErrors, parsed.rows, safePreviewIndex, mapping, snapshot.graphics]);

  const importTableFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await readFileAsText(file);
    setTableText(text);
    setPreviewIndex(0);
  };

  const chooseTemplate = (template: CardTemplate) => {
    setTemplateId(template.id);
    setTableText('');
    setDeckName(`Baralho - ${template.name}`);
    setPreviewIndex(0);
  };

  const generateDeck = () => {
    if (!selectedTemplate || !canGenerate) return;
    const newDeck = createDeckFromTemplateRows(
      selectedTemplate,
      parsed.rows,
      mapping,
      snapshot.graphics,
      deckName,
      decks.length,
    );
    saveProject({
      ...snapshot,
      decks: [...decks, newDeck],
      cards: [],
      templates,
      graphics: snapshot.graphics ?? [],
      assetFolders: snapshot.assetFolders ?? [],
      fonts: snapshot.fonts ?? [],
    });
    onOpenDeck(newDeck.id);
  };

  return (
    <div className="ps-modal-backdrop" onClick={onClose}>
      <div className="ps-modal batch-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ps-modal__head batch-modal__head">
          <div>
            <span className="batch-eyebrow">Geracao em lote</span>
            <h2>Criar baralho com tabela</h2>
          </div>
          <button type="button" className="batch-close" onClick={onClose}>Fechar</button>
        </div>

        {templates.length === 0 ? (
          <div className="batch-empty">
            <BookMarked size={22} />
            <strong>Nenhum modelo salvo.</strong>
            <span>Crie um modelo primeiro e marque elementos como campo de Planilha no inspector.</span>
          </div>
        ) : (
          <div className="batch-layout">
            <aside className="batch-sidebar">
              <div className="batch-section-title">Modelo</div>
              <div className="batch-template-list">
                {templates.map((template) => {
                  const templateFields = extractTemplateFields(template);
                  const isActive = selectedTemplate?.id === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      className={isActive ? 'batch-template batch-template--active' : 'batch-template'}
                      onClick={() => chooseTemplate(template)}
                    >
                      <span className="batch-template__thumb">
                        {template.thumbnail ? <img src={template.thumbnail} alt={template.name} /> : <BookMarked size={16} />}
                      </span>
                      <span>
                        <strong>{template.name}</strong>
                        <small>{templateFields.length} coluna{templateFields.length === 1 ? '' : 's'} esperada{templateFields.length === 1 ? '' : 's'}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="batch-main">
              <section className="batch-summary">
                <div>
                  <span>Modelo</span>
                  <strong>{selectedTemplate?.name ?? 'Nenhum'}</strong>
                </div>
                <div>
                  <span>Linhas</span>
                  <strong>{parsed.rows.length}</strong>
                </div>
                <div>
                  <span>Colunas</span>
                  <strong>{parsed.headers.length}</strong>
                </div>
                <div className={canGenerate ? 'batch-summary__state batch-summary__state--ready' : 'batch-summary__state'}>
                  {canGenerate ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <strong>{canGenerate ? 'Pronto' : 'Pendente'}</strong>
                </div>
              </section>

              <section className="batch-panel batch-panel--data">
                <div className="batch-panel__head">
                  <div>
                    <span className="batch-section-title">Dados da planilha</span>
                    <p>Use cabecalho na primeira linha. Pode colar do Excel, Google Sheets ou CSV.</p>
                  </div>
                  <div className="batch-actions">
                    <button
                      type="button"
                      disabled={!selectedTemplate || fields.length === 0}
                      onClick={() => downloadTemplateCsv(selectedTemplate)}
                    >
                      <Download size={13} />
                      Modelo CSV
                    </button>
                    <button type="button" onClick={() => fileInputRef.current?.click()}>
                      <FileUp size={13} />
                      Importar
                    </button>
                  </div>
                </div>

                <div className="batch-table-shell">
                  <textarea
                    className="batch-table-input"
                    value={tableText}
                    onChange={(event) => {
                      setTableText(event.target.value);
                      setPreviewIndex(0);
                    }}
                    spellCheck={false}
                    placeholder={'nome\tvida\timagem\nDragao\t8\tdragao.png'}
                  />
                </div>

                <div className="batch-status-row">
                  <span>{parsed.rows.length} linha{parsed.rows.length === 1 ? '' : 's'}</span>
                  <span>{parsed.headers.length} coluna{parsed.headers.length === 1 ? '' : 's'}</span>
                  {parsed.warnings.map((warning) => <span key={warning} className="batch-warning-inline">{warning}</span>)}
                </div>
              </section>
              {fields.length === 0 ? (
                <div className="batch-empty-inline">
                  <AlertTriangle size={16} />
                  Modelo sem campos dinamicos.
                </div>
              ) : null}

              {issues.length > 0 ? (
                <div className="batch-issues">
                  {issues.map((issue) => (
                    <div key={issue.message} className={`batch-issue batch-issue--${issue.tone}`}>
                      {issue.tone === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                      <span>{issue.message}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="batch-ready">
                  <CheckCircle2 size={14} />
                  Pronto para gerar.
                </div>
              )}
            </main>

            <aside className="batch-preview">
              <div className="batch-preview__head">
                <div>
                  <span className="batch-section-title">Preview</span>
                  {previewCard ? <small>Carta gerada da linha {safePreviewIndex + 1}</small> : null}
                </div>
              </div>

              <label className="batch-deck-name">
                <span>Nome do baralho</span>
                <input value={deckName} onChange={(event) => setDeckName(event.target.value)} />
              </label>

              <div className="batch-preview__surface">
                {previewCard ? <StaticCardPreview card={previewCard} /> : (
                  <div className="batch-preview__empty">
                    <WandSparkles size={24} />
                    <span>Preview aparece quando modelo, tabela e campos estiverem prontos.</span>
                  </div>
                )}
              </div>
              {previewCard ? (
                <div className="batch-preview__nav">
                  <button
                    type="button"
                    disabled={safePreviewIndex === 0}
                    onClick={() => setPreviewIndex((index) => Math.max(0, index - 1))}
                  >
                    Anterior
                  </button>
                  <span>{safePreviewIndex + 1} / {parsed.rows.length}</span>
                  <button
                    type="button"
                    disabled={safePreviewIndex >= parsed.rows.length - 1}
                    onClick={() => setPreviewIndex((index) => Math.min(parsed.rows.length - 1, index + 1))}
                  >
                    Proxima
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                className="batch-generate"
                disabled={!canGenerate}
                onClick={generateDeck}
              >
                <WandSparkles size={15} />
                Gerar {parsed.rows.length || ''} carta{parsed.rows.length === 1 ? '' : 's'}
              </button>
            </aside>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,text/csv,text/tab-separated-values,text/plain"
          hidden
          onChange={async (event) => {
            await importTableFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

export function ProjectScreen({ projectId, onGoHome, onOpenEditor }: ProjectScreenProps) {
  const [showCreateCards, setShowCreateCards] = useState(false);
  const [createCardsTemplateId, setCreateCardsTemplateId] = useState<string | null>(null);
  const [showBatchDeck, setShowBatchDeck] = useState(false);

  const snapshot = loadProject(projectId);
  const library = loadLibrary();
  const decks = useMemo(() => resolveDecks(snapshot), [snapshot]);
  const templates = snapshot?.templates ?? [];
  const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
  const firstDeckId = decks[0]?.id ?? null;
  const updatedAt = library.projects.find((project) => project.id === projectId)?.updatedAt;

  if (!snapshot) {
    return (
      <div className="ps ps--empty">
        <button type="button" className="ps-back" onClick={onGoHome}>
          <ArrowLeft size={15} />
          Voltar
        </button>
        <div className="ps-empty-card">
          <h1>Projeto nao encontrado</h1>
          <p>Este projeto nao esta mais disponivel no navegador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ps">
      <header className="ps-topbar">
        <div className="ps-topbar__brand">
          <button type="button" className="ps-back" onClick={onGoHome}>
            <ArrowLeft size={15} />
            Projetos
          </button>
          <div>
            <div className="ps-topbar__eyebrow">Pasta do projeto</div>
            <h1>{snapshot.name ?? 'Projeto'}</h1>
            <p>{snapshot.description || 'Organize baralhos, modelos e geracao em lote a partir daqui.'}</p>
          </div>
        </div>

        <div className="ps-topbar__stats">
          <div>
            <span>Baralhos</span>
            <strong>{decks.length}</strong>
          </div>
          <div>
            <span>Cartas</span>
            <strong>{totalCards}</strong>
          </div>
          <div>
            <span>Modelos</span>
            <strong>{templates.length}</strong>
          </div>
        </div>
      </header>

      <main className="ps-content">
        <section className="ps-actions">
          <button
            type="button"
            className="ps-action ps-action--primary"
            onClick={() => onOpenEditor({ mode: 'template', initialDeckId: firstDeckId })}
          >
            <PencilRuler size={18} />
            <div>
              <strong>Criar modelo</strong>
              <span>Entrar no editor com foco em montar um layout-base reutilizavel.</span>
            </div>
          </button>

          <button
            type="button"
            className="ps-action"
            onClick={() => {
              setCreateCardsTemplateId(null);
              setShowCreateCards(true);
            }}
          >
            <Shapes size={18} />
            <div>
              <strong>Criar cartas</strong>
              <span>Escolher um modelo, preencher campos, ver preview e criar a carta pronta.</span>
            </div>
          </button>

          <button
            type="button"
            className="ps-action"
            onClick={() => setShowBatchDeck(true)}
          >
            <FileSpreadsheet size={18} />
            <div>
              <strong>Criar baralho com planilha</strong>
              <span>Escolher modelo, colar dados e gerar cartas diferentes em lote.</span>
            </div>
          </button>
        </section>

        <section className="ps-grid">
          <div className="ps-panel">
            <div className="ps-panel__head">
              <div>
                <span className="ps-panel__eyebrow">Baralhos</span>
                <h2>{decks.length} baralho{decks.length === 1 ? '' : 's'}</h2>
              </div>
              <span className="ps-panel__meta">Atualizado {formatUpdated(updatedAt)}</span>
            </div>

            <div className="ps-deck-list">
              {decks.map((deck) => (
                <article key={deck.id} className="ps-deck-card">
                  <div className="ps-deck-card__swatch" style={{ background: deck.color }} />
                  <div className="ps-deck-card__body">
                    <strong>{deck.name}</strong>
                    <span>{deck.cards.length} carta{deck.cards.length === 1 ? '' : 's'} - {deck.cardWidth}x{deck.cardHeight}px</span>
                  </div>
                  <button
                    type="button"
                    className="ps-inline-btn"
                    onClick={() => onOpenEditor({ mode: 'manual', initialDeckId: deck.id })}
                  >
                    <FolderOpen size={13} />
                    Abrir
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="ps-panel">
            <div className="ps-panel__head">
              <div>
                <span className="ps-panel__eyebrow">Modelos</span>
                <h2>{templates.length} modelo{templates.length === 1 ? '' : 's'}</h2>
              </div>
              <button
                type="button"
                className="ps-inline-btn"
                onClick={() => onOpenEditor({ mode: 'template', initialDeckId: firstDeckId })}
              >
                <Plus size={13} />
                Novo modelo
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="ps-empty-state">
                <BookMarked size={20} />
                <p>Nenhum modelo salvo ainda.</p>
              </div>
            ) : (
              <div className="ps-template-list">
                {templates.map((template) => (
                  <article key={template.id} className="ps-template-card">
                    <div className="ps-template-card__thumb">
                      {template.thumbnail ? <img src={template.thumbnail} alt={template.name} /> : <span>BCS</span>}
                    </div>
                    <div className="ps-template-card__body">
                      <strong>{template.name}</strong>
                      <span>{template.description || 'Modelo pronto para servir de base no editor ou em lote.'}</span>
                      <div className="ps-template-card__actions">
                        <button
                          type="button"
                          className="ps-inline-btn"
                          onClick={() => onOpenEditor({ mode: 'template', initialDeckId: firstDeckId, launchTemplateId: template.id })}
                        >
                          <PencilRuler size={13} />
                          Editar
                        </button>
                        <button
                          type="button"
                          className="ps-inline-btn"
                          onClick={() => {
                            setCreateCardsTemplateId(template.id);
                            setShowCreateCards(true);
                          }}
                        >
                          <Layers3 size={13} />
                          Criar carta
                        </button>
                        <button
                          type="button"
                          className="ps-inline-btn"
                          disabled={extractTemplateFields(template).length === 0}
                          onClick={() => downloadTemplateCsv(template)}
                        >
                          <Download size={13} />
                          Planilha
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {showCreateCards && (
        <TemplateFillModal
          snapshot={snapshot}
          decks={decks}
          initialTemplateId={createCardsTemplateId}
          onClose={() => setShowCreateCards(false)}
          onBlankCard={() => onOpenEditor({ mode: 'manual', initialDeckId: firstDeckId })}
          onOpenDeck={(deckId) => onOpenEditor({ mode: 'manual', initialDeckId: deckId })}
        />
      )}

      {showBatchDeck && (
        <BatchDeckModal
          snapshot={snapshot}
          decks={decks}
          onClose={() => setShowBatchDeck(false)}
          onOpenDeck={(deckId) => onOpenEditor({ mode: 'manual', initialDeckId: deckId })}
        />
      )}
    </div>
  );
}
