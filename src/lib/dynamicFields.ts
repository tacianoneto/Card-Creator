import { ICON_CATALOG } from '../iconCatalog';
import type {
  CardDocument,
  CardElement,
  ElementBindingKind,
  GraphicAsset,
} from '../types';
import { normalizeKey } from './batch';

export interface DynamicField {
  key: string;
  kind: ElementBindingKind;
  elementIds: string[];
  elementNames: string[];
  value: string;
}

export const DYNAMIC_KIND_LABELS: Record<ElementBindingKind, string> = {
  text: 'Texto',
  image: 'Imagem',
  icon: 'Icone',
  number: 'Numero',
  color: 'Cor',
};

const BUILT_IN_ICON_BY_KEY = new Map(
  ICON_CATALOG.flatMap((icon) => [
    [normalizeKey(icon.name), icon.name],
    [normalizeKey(icon.label), icon.name],
  ]),
);

const CARD_NAME_KEYS = new Set(['nome', 'name', 'titulo', 'title']);

function assetMatches(asset: GraphicAsset, value: string) {
  const wanted = normalizeKey(value);
  return (
    normalizeKey(asset.id) === wanted ||
    normalizeKey(asset.name) === wanted ||
    normalizeKey(asset.name.replace(/\.[a-z0-9]+$/i, '')) === wanted ||
    asset.src === value
  );
}

function resolveAsset(value: string, assets: GraphicAsset[]) {
  const clean = value.trim();
  if (!clean) return '';
  if (/^(https?:|data:image\/|blob:)/i.test(clean)) return clean;
  return assets.find((asset) => assetMatches(asset, clean))?.src ?? '';
}

function resolveIcon(value: string, assets: GraphicAsset[]) {
  const clean = value.trim();
  if (!clean) return null;

  const builtIn = BUILT_IN_ICON_BY_KEY.get(normalizeKey(clean));
  if (builtIn) return { iconName: builtIn, customSrc: undefined };

  const assetSrc = resolveAsset(clean, assets);
  if (assetSrc) return { iconName: undefined, customSrc: assetSrc };

  return null;
}

function numericValue(value: string, fallback: number) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getElementDynamicValue(element: CardElement) {
  switch (element.type) {
    case 'text':
      return element.content;
    case 'title':
      return element.text;
    case 'info':
      return element.body;
    case 'number':
      return element.value;
    case 'marker':
    case 'seal':
      return element.label;
    case 'bar':
    case 'counter':
      return String(element.value);
    case 'die':
      return element.value;
    case 'image':
    case 'portrait':
      return element.src;
    case 'icon':
      return element.customSrc ?? element.iconName;
    case 'shape':
      return element.fill;
    default:
      return element.name;
  }
}

export function getDynamicFields(card: CardDocument): DynamicField[] {
  const fields = new Map<string, DynamicField>();

  card.elements.forEach((element) => {
    const binding = element.binding;
    if (!binding) return;

    const key = binding.key.trim();
    if (!key) return;

    const normalized = normalizeKey(key) || key;
    const value = getElementDynamicValue(element);
    const current = fields.get(normalized);

    if (current) {
      current.elementIds.push(element.id);
      current.elementNames.push(element.name);
      if (!current.value && value) current.value = value;
      return;
    }

    fields.set(normalized, {
      key,
      kind: binding.kind,
      elementIds: [element.id],
      elementNames: [element.name],
      value,
    });
  });

  return [...fields.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function applyDynamicValueToElement(
  element: CardElement,
  value: string,
  assets: GraphicAsset[] = [],
): CardElement {
  const binding = element.binding;
  if (!binding) return element;

  switch (binding.kind) {
    case 'image': {
      const src = resolveAsset(value, assets) || value;
      if (element.type === 'image') return { ...element, src };
      if (element.type === 'portrait') return { ...element, src };
      if (element.type === 'icon') return { ...element, customSrc: src };
      return element;
    }

    case 'icon': {
      const icon = resolveIcon(value, assets);
      if (element.type !== 'icon' || !icon) return element;
      return {
        ...element,
        iconName: icon.iconName ?? element.iconName,
        customSrc: icon.customSrc,
      };
    }

    case 'number': {
      if (element.type === 'number') return { ...element, value };
      if (element.type === 'counter') return { ...element, value: numericValue(value, element.value) };
      if (element.type === 'bar') return { ...element, value: numericValue(value, element.value) };
      if (element.type === 'die') return { ...element, value };
      if (element.type === 'text') return { ...element, content: value, richContent: undefined };
      if (element.type === 'title') return { ...element, text: value };
      if (element.type === 'marker') return { ...element, label: value };
      if (element.type === 'seal') return { ...element, label: value };
      return element;
    }

    case 'color':
      if (element.type === 'shape') return { ...element, fill: value };
      return element;

    case 'text':
    default:
      if (element.type === 'text') return { ...element, content: value, richContent: undefined };
      if (element.type === 'title') return { ...element, text: value };
      if (element.type === 'info') return { ...element, body: value };
      if (element.type === 'number') return { ...element, value };
      if (element.type === 'marker') return { ...element, label: value };
      if (element.type === 'seal') return { ...element, label: value };
      if (element.type === 'separator') return { ...element };
      if (element.type === 'die') return { ...element, value };
      return element;
  }
}

export function applyDynamicFieldValue(
  card: CardDocument,
  key: string,
  value: string,
  assets: GraphicAsset[] = [],
): CardDocument {
  const normalizedKey = normalizeKey(key);
  let changed = false;

  const elements = card.elements.map((element) => {
    if (!element.binding || normalizeKey(element.binding.key) !== normalizedKey) return element;
    const nextElement = applyDynamicValueToElement(element, value, assets);
    if (nextElement !== element) changed = true;
    return nextElement;
  });

  if (!changed) return card;

  const cleanValue = value.trim();
  return {
    ...card,
    name: cleanValue && CARD_NAME_KEYS.has(normalizedKey) ? cleanValue : card.name,
    elements,
  };
}
