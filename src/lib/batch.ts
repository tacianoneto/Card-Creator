import { ICON_CATALOG } from '../iconCatalog';
import type {
  CardDocument,
  CardElement,
  CardTemplate,
  Deck,
  ElementBindingKind,
  GraphicAsset,
} from '../types';
import { createId, DECK_COLORS } from './editor';

export type BatchRow = Record<string, string>;
export type BatchMapping = Record<string, string>;

export interface BatchField {
  key: string;
  kinds: ElementBindingKind[];
  elementCount: number;
  sample: string;
}

export interface ParsedBatchTable {
  headers: string[];
  rows: BatchRow[];
  delimiter: string;
  warnings: string[];
}

export interface BatchIssue {
  tone: 'error' | 'warning';
  message: string;
}

const BUILT_IN_ICON_BY_KEY = new Map(
  ICON_CATALOG.flatMap((icon) => [
    [normalizeKey(icon.name), icon.name],
    [normalizeKey(icon.label), icon.name],
  ]),
);

export function normalizeKey(value: string) {
  return value
    .replace(/^\ufeff/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0;
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') quoted = !quoted;
    if (!quoted && char === delimiter) count += 1;
  }
  return count;
}

function detectDelimiter(line: string) {
  const choices = ['\t', ';', ','];
  return choices
    .map((delimiter) => ({ delimiter, count: countDelimiter(line, delimiter) }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ',';
}

function parseDelimitedRows(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);

  return rows
    .map((cells) => cells.map((value) => value.trim()))
    .filter((cells) => cells.some((value) => value.length > 0));
}

export function parseBatchTable(text: string): ParsedBatchTable {
  const clean = text.trim();
  if (!clean) {
    return { headers: [], rows: [], delimiter: ',', warnings: ['Cole ou importe uma tabela com cabecalho.'] };
  }

  const firstLine = clean.split(/\r?\n/).find((line) => line.trim()) ?? '';
  const delimiter = detectDelimiter(firstLine);
  const rawRows = parseDelimitedRows(clean, delimiter);
  const warnings: string[] = [];

  if (rawRows.length < 2) {
    return { headers: rawRows[0] ?? [], rows: [], delimiter, warnings: ['A tabela precisa de cabecalho e ao menos uma linha.'] };
  }

  const headerCounts = new Map<string, number>();
  const headers = rawRows[0].map((header, index) => {
    const fallback = `coluna_${index + 1}`;
    const base = header.replace(/^\ufeff/, '').trim() || fallback;
    const seen = headerCounts.get(base) ?? 0;
    headerCounts.set(base, seen + 1);
    return seen === 0 ? base : `${base}_${seen + 1}`;
  });

  const rows = rawRows.slice(1).map((cells) => {
    const row: BatchRow = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? '';
    });
    return row;
  });

  const shortRows = rawRows.slice(1).filter((cells) => cells.length < headers.length).length;
  if (shortRows > 0) warnings.push(`${shortRows} linha(s) tem menos colunas que o cabecalho.`);

  return { headers, rows, delimiter, warnings };
}

function elementSample(element: CardElement) {
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
      return element.src ? 'imagem' : '';
    case 'icon':
      return element.iconName;
    case 'shape':
      return element.fill;
    default:
      return element.name;
  }
}

export function extractTemplateFields(template: CardTemplate): BatchField[] {
  const fields = new Map<string, BatchField>();

  for (const element of template.card.elements) {
    const binding = element.binding;
    if (!binding?.key) continue;

    const current = fields.get(binding.key);
    if (current) {
      current.elementCount += 1;
      if (!current.kinds.includes(binding.kind)) current.kinds.push(binding.kind);
      continue;
    }

    fields.set(binding.key, {
      key: binding.key,
      kinds: [binding.kind],
      elementCount: 1,
      sample: elementSample(element),
    });
  }

  return [...fields.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function createDefaultMapping(fields: BatchField[], headers: string[]): BatchMapping {
  const headerByKey = new Map(headers.map((header) => [normalizeKey(header), header]));
  return Object.fromEntries(
    fields.map((field) => [field.key, headerByKey.get(normalizeKey(field.key)) ?? '']),
  );
}

function assetMatches(asset: GraphicAsset, value: string) {
  const wanted = normalizeKey(value);
  return (
    normalizeKey(asset.id) === wanted ||
    normalizeKey(asset.name) === wanted ||
    normalizeKey(asset.name.replace(/\.[a-z0-9]+$/i, '')) === wanted
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

function applyValueToElement(element: CardElement, value: string, assets: GraphicAsset[]): CardElement {
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

function getMappedValue(row: BatchRow, fieldKey: string, mapping: BatchMapping) {
  const mappedHeader = mapping[fieldKey];
  if (mappedHeader && Object.prototype.hasOwnProperty.call(row, mappedHeader)) return row[mappedHeader];
  return row[fieldKey] ?? '';
}

function cardNameFromRow(template: CardTemplate, row: BatchRow, mapping: BatchMapping) {
  const fields = extractTemplateFields(template);
  const nameField =
    fields.find((field) => ['nome', 'name', 'titulo', 'title'].includes(normalizeKey(field.key))) ??
    fields.find((field) => field.kinds.includes('text'));
  const value = nameField ? getMappedValue(row, nameField.key, mapping).trim() : '';
  return value || template.name;
}

export function createCardFromTemplateRow(
  template: CardTemplate,
  row: BatchRow,
  mapping: BatchMapping,
  assets: GraphicAsset[],
  index: number,
): CardDocument {
  return {
    ...template.card,
    id: createId(),
    name: cardNameFromRow(template, row, mapping) || `Carta ${index + 1}`,
    elements: template.card.elements.map((element) => {
      const binding = element.binding;
      const value = binding ? getMappedValue(row, binding.key, mapping) : '';
      return applyValueToElement({ ...element, id: createId() }, value, assets);
    }),
  };
}

export function createDeckFromTemplateRows(
  template: CardTemplate,
  rows: BatchRow[],
  mapping: BatchMapping,
  assets: GraphicAsset[],
  name: string,
  colorIndex: number,
): Deck {
  return {
    id: createId(),
    name: name.trim() || `Baralho - ${template.name}`,
    color: DECK_COLORS[colorIndex % DECK_COLORS.length],
    cardWidth: template.card.width,
    cardHeight: template.card.height,
    cards: rows.map((row, index) => createCardFromTemplateRow(template, row, mapping, assets, index)),
    description: `Gerado de ${template.name}`,
  };
}

export function validateBatch(
  template: CardTemplate | null,
  fields: BatchField[],
  headers: string[],
  rows: BatchRow[],
  mapping: BatchMapping,
  assets: GraphicAsset[],
): BatchIssue[] {
  const issues: BatchIssue[] = [];

  if (!template) issues.push({ tone: 'error', message: 'Escolha um modelo.' });
  if (template && fields.length === 0) {
    issues.push({ tone: 'error', message: 'Modelo sem campos dinamicos. Abra o editor de modelo e marque elementos como Planilha.' });
  }
  if (headers.length === 0 || rows.length === 0) {
    issues.push({ tone: 'error', message: 'Cole ou importe uma tabela com cabecalho e linhas.' });
  }

  const headerSet = new Set(headers);
  for (const field of fields) {
    const mapped = mapping[field.key];
    if (!mapped || !headerSet.has(mapped)) {
      issues.push({ tone: 'error', message: `Campo "${field.key}" sem coluna ligada.` });
    }
  }

  if (issues.some((issue) => issue.tone === 'error')) return issues;

  const elementsByKey = new Map<string, CardElement[]>();
  for (const element of template?.card.elements ?? []) {
    if (!element.binding?.key) continue;
    elementsByKey.set(element.binding.key, [...(elementsByKey.get(element.binding.key) ?? []), element]);
  }

  rows.forEach((row, rowIndex) => {
    for (const field of fields) {
      const value = getMappedValue(row, field.key, mapping).trim();
      if (!value) continue;
      const elements = elementsByKey.get(field.key) ?? [];
      if (elements.some((element) => element.binding?.kind === 'image') && !resolveAsset(value, assets) && !/^(https?:|data:image\/|blob:)/i.test(value)) {
        issues.push({ tone: 'warning', message: `Linha ${rowIndex + 1}: imagem "${value}" nao encontrada nos assets.` });
      }
      if (elements.some((element) => element.binding?.kind === 'icon') && !resolveIcon(value, assets)) {
        issues.push({ tone: 'warning', message: `Linha ${rowIndex + 1}: icone "${value}" nao encontrado.` });
      }
    }
  });

  return issues.slice(0, 12);
}
