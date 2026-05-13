export type SidebarTab = 'elements' | 'templates' | 'assets' | 'layers';
export type AlignmentMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type FlipAxis = 'x' | 'y';
export type EditorMode = 'manual' | 'template';
export type ElementBindingKind = 'text' | 'image' | 'icon' | 'number' | 'color';

export type CardElementType =
  | 'text'
  | 'image'
  | 'icon'
  | 'shape'
  | 'frame'
  | 'info'
  | 'number'
  | 'marker'
  | 'bar'
  | 'title'
  | 'counter'
  | 'seal'
  | 'separator'
  | 'die'
  | 'portrait';

export type PortraitVariant = 'plain' | 'circle' | 'oval' | 'hex' | 'diamond' | 'shield' | 'arch' | 'frame';
export type BarVariant = 'standard' | 'segments' | 'gradient' | 'neon';
export type TitleVariant =
  | 'nameplate'
  | 'banner'
  | 'scroll'
  | 'arcane'
  | 'minimal'
  | 'epic'
  | 'gothic'
  | 'laurel'
  | 'inset'
  | 'stamp'
  | 'chapterTitle'
  | 'glassTab'
  | 'questTitle';

export type TextAlign = 'left' | 'center' | 'right';
export type TextTransform = 'none' | 'uppercase' | 'capitalize';
export interface TextStyleSpan {
  text: string;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
  fontFamily?: string;
}
export type ShapeKind =
  | 'rectangle'
  | 'circle'
  | 'diamond'
  | 'hexagon'
  | 'octagon'
  | 'capsule'
  | 'parallelogram'
  | 'banner'
  | 'chevron'
  | 'starburst'
  | 'triangle'
  | 'cross'
  | 'arrow';
export type TexturePattern =
  | 'none'
  | 'grid'
  | 'dots'
  | 'burst'
  | 'paper'
  | 'linen'
  | 'diagonal'
  | 'stars'
  | 'waves'
  | 'rings';
export type ImageFitMode = 'cover' | 'contain';
export type FrameVariant =
  | 'ornate'
  | 'double'
  | 'banner'
  | 'tech'
  | 'minimal'
  | 'gothic'
  | 'arcane'
  | 'cornerTabs'
  | 'scrollwork'
  | 'blackCore'
  | 'storyFrame'
  | 'costSocket'
  | 'heroPanel'
  | 'elementalRails'
  | 'printPlay'
  | 'foil'
  | 'notebook'
  | 'blueprint'
  | 'tileBorder';
export type InfoVariant =
  | 'panel'
  | 'scroll'
  | 'split'
  | 'ribbon'
  | 'parchment'
  | 'quote'
  | 'statBlock'
  | 'glass'
  | 'rulebook'
  | 'chapter'
  | 'lore'
  | 'quest'
  | 'notched'
  | 'arcaneManuscript'
  | 'battleBrief'
  | 'terminalLog'
  | 'handNote'
  | 'royalDecree'
  | 'comicQuest'
  | 'twoCol'
  | 'angled'
  | 'codex'
  | 'bare'
  | 'woodPlank'
  | 'fabricPatch'
  | 'tornPaper'
  | 'leatherBound'
  | 'chalkboard'
  | 'abilityCard'
  | 'recipe'
  | 'warning';
export type NumberVariant =
  | 'sticker'
  | 'comic'
  | 'shadowText'
  | 'neon'
  | 'arcade'
  | 'ink'
  | 'chrome'
  | 'ember'
  | 'badge'
  | 'shield'
  | 'hex'
  | 'ticket'
  | 'orb'
  | 'coin'
  | 'rune'
  | 'square'
  | 'corner'
  | 'sunburst'
  | 'gemstone'
  | 'blackSeal'
  | 'laurel'
  | 'splitStat'
  | 'dial'
  | 'capsule'
  | 'resource';
export type MarkerVariant =
  | 'pill'
  | 'tag'
  | 'plate'
  | 'diamond'
  | 'slash'
  | 'notch'
  | 'crest'
  | 'pip'
  | 'ruleDot'
  | 'typeRound'
  | 'typeFlag'
  | 'typeHex'
  | 'typeShield'
  | 'typeBanner'
  | 'tabLeft'
  | 'miniCard';
export type CounterVariant =
  | 'circles'
  | 'gems'
  | 'coins'
  | 'hearts'
  | 'diamonds'
  | 'stars'
  | 'shields'
  | 'crystals'
  | 'checks'
  | 'charges'
  | 'skulls';
export type SealVariant =
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'wax'
  | 'emblem'
  | 'faction'
  | 'rosette'
  | 'medal'
  | 'hexSigil'
  | 'cornerStamp';
export type SeparatorVariant =
  | 'line'
  | 'double'
  | 'ornament'
  | 'ribbon'
  | 'tech'
  | 'chain'
  | 'stars'
  | 'wave'
  | 'slashes'
  | 'brackets'
  | 'dots'
  | 'scallop';
export type DieVariant = 'flat' | 'rounded' | 'gem' | 'outline' | 'rune';
export type DieSides = 4 | 6 | 8 | 10 | 12 | 20;
export type DieDisplayMode = 'number' | 'pips';
export type IconVariant = 'plain' | 'token' | 'crest' | 'diamond' | 'burst' | 'corner' | 'aura';

export interface CardBackground {
  primaryColor: string;
  secondaryColor: string;
  gradientAngle: number;
  texture: TexturePattern;
  imageSrc?: string;
  imageOpacity: number;
  imageFit: ImageFitMode;
}

export interface CardElementBase {
  id: string;
  type: CardElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  flipX: boolean;
  flipY: boolean;
  locked: boolean;
  hidden?: boolean;
  groupId?: string;
  zIndex: number;
  /** Whether the outer glow effect is shown. Defaults to false when undefined. */
  glowEnabled?: boolean;
  /** CSS color for the outer glow. Falls back to the element's primary color when undefined. */
  glowColor?: string;
  /** Outer glow blur radius in pixels. */
  glowIntensity?: number;
  /** Template placeholder metadata used by spreadsheet generation. */
  binding?: {
    key: string;
    kind: ElementBindingKind;
  };
}

export interface TextElement extends CardElementBase {
  type: 'text';
  content: string;
  richContent?: TextStyleSpan[];
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  align: TextAlign;
  lineHeight: number;
  letterSpacing: number;
  textTransform: TextTransform;
  shadowEnabled?: boolean;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  shadowColor?: string;
  textStrokeEnabled?: boolean;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  autoFitFont?: boolean;
  textCurve?: number;
}

export interface PortraitElement extends CardElementBase {
  type: 'portrait';
  variant: PortraitVariant;
  src: string;           // empty string = placeholder
  focalX: number;        // 0–100 object-position X
  focalY: number;        // 0–100 object-position Y
  strokeColor: string;
  strokeWidth: number;
  accentColor: string;
  shadow: number;
}

export type ImageMaskShape = 'none' | 'circle' | 'hexagon' | 'shield' | 'diamond' | 'star' | 'arch';

export interface ImageElement extends CardElementBase {
  type: 'image';
  src: string;
  fit: ImageFitMode;
  borderRadius: number;
  strokeColor: string;
  strokeWidth: number;
  shadow: number;
  maskShape?: ImageMaskShape;
}

export interface IconElement extends CardElementBase {
  type: 'icon';
  variant: IconVariant;
  iconName: string;
  customSrc?: string;
  color: string;
  fillColor: string;
  strokeWidth: number;
}

export interface ShapeElement extends CardElementBase {
  type: 'shape';
  shape: ShapeKind;
  fill: string;
  strokeColor: string;
  strokeWidth: number;
  radius: number;
}

export interface FrameElement extends CardElementBase {
  type: 'frame';
  variant: FrameVariant;
  strokeColor: string;
  strokeWidth: number;
  accentColor: string;
  inset: number;
  radius: number;
  cornerSize: number;
}

export interface InfoElement extends CardElementBase {
  type: 'info';
  variant: InfoVariant;
  title: string;
  body: string;
  fill: string;
  accentColor: string;
  titleColor: string;
  bodyColor: string;
  radius: number;
  padding: number;
  // Typography — all optional for backward compatibility
  titleFontFamily?: string;
  bodyFontFamily?: string;
  titleFontSize?: number;
  bodyFontSize?: number;
  titleFontWeight?: number;
  titleAlign?: TextAlign;
  bodyAlign?: TextAlign;
  bodyLineHeight?: number;
  bodyLetterSpacing?: number;
}

export interface NumberElement extends CardElementBase {
  type: 'number';
  variant: NumberVariant;
  value: string;
  maxValue?: number;
  label: string;
  showLabel: boolean;
  fill: string;
  secondaryColor: string;
  accentColor: string;
  color: string;
  fontSize: number;
  valueFontFamily?: string;
  labelFontFamily?: string;
  labelFontSize?: number;
  labelColor?: string;
}

export interface MarkerElement extends CardElementBase {
  type: 'marker';
  variant: MarkerVariant;
  symbol: string;
  label: string;
  fill: string;
  accentColor?: string;  // used by type-tag variants
  color: string;
  fontSize: number;
  symbolFontFamily?: string;
  labelFontFamily?: string;
  symbolFontSize?: number;
  labelFontSize?: number;
  labelColor?: string;
}

export interface CounterElement extends CardElementBase {
  type: 'counter';
  variant: CounterVariant;
  value: number;
  maxValue: number;
  fill: string;
  emptyColor: string;
  accentColor: string;
  color: string;
  unitSize: number;
  gap: number;
  arrangement: 'row' | 'grid';
  columns: number;
}

export interface SealElement extends CardElementBase {
  type: 'seal';
  variant: SealVariant;
  label: string;
  fill: string;
  accentColor: string;
  color: string;
  fontSize: number;
  fontFamily?: string;
  showLabel: boolean;
}

export interface SeparatorElement extends CardElementBase {
  type: 'separator';
  variant: SeparatorVariant;
  lineColor: string;
  accentColor: string;
  thickness: number;
  ornamentSize: number;
  dash: number;
}

export interface DieElement extends CardElementBase {
  type: 'die';
  variant: DieVariant;
  sides: DieSides;
  value: string;
  displayMode?: DieDisplayMode;
  fill: string;
  accentColor: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  showSides: boolean;
}

export interface BarElement extends CardElementBase {
  type: 'bar';
  variant: BarVariant;
  value: number;
  maxValue: number;
  showValues: boolean;
  label: string;
  fill: string;
  trackColor: string;
  accentColor: string;
  color: string;
  radius: number;
}

export interface TitleElement extends CardElementBase {
  type: 'title';
  variant: TitleVariant;
  text: string;
  subtitle: string;
  color: string;
  accentColor: string;
  fill: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  align: TextAlign;
  letterSpacing: number;
  textTransform: TextTransform;
  radius: number;
  subtitleColor?: string;
  subtitleFontFamily?: string;
  subtitleFontSize?: number;
  subtitleFontWeight?: number;
  subtitleLetterSpacing?: number;
}

export type CardElement =
  | PortraitElement
  | TextElement
  | ImageElement
  | IconElement
  | ShapeElement
  | FrameElement
  | InfoElement
  | NumberElement
  | MarkerElement
  | BarElement
  | TitleElement
  | CounterElement
  | SealElement
  | SeparatorElement
  | DieElement;

export type CardElementPatch = Partial<CardElement>;

export interface CardDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  background: CardBackground;
  elements: CardElement[];
  groupNames?: Record<string, string>;
}

export interface GraphicAsset {
  id: string;
  name: string;
  src: string;
  kind?: 'image' | 'icon';
  folderId?: string;
  optimized?: boolean;
  originalBytes?: number;
  storedBytes?: number;
}

export interface AssetFolder {
  id: string;
  name: string;
  parentId?: string;
}

export interface FontAsset {
  id: string;
  name: string;
  family: string;
  src: string;
}

// ---------------------------------------------------------------------------
// Deck — folder/subproject within a project (has its own card size)
// ---------------------------------------------------------------------------

export interface Deck {
  id: string;
  name: string;
  /** Accent color used for the deck tab indicator. */
  color: string;
  /** Default width for new cards created in this deck (px). */
  cardWidth: number;
  /** Default height for new cards created in this deck (px). */
  cardHeight: number;
  cards: CardDocument[];
  description?: string;
}

// ---------------------------------------------------------------------------
// Card Templates (per-project reusable card layouts)
// ---------------------------------------------------------------------------

export interface CardTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail: string; // base64 PNG (low-res preview)
  card: CardDocument;
  templateMode?: 'layout' | 'data';
}

// ---------------------------------------------------------------------------
// Project Snapshot — full serialisable project data
// id / name / description / templates are new; all optional for backward compat
// ---------------------------------------------------------------------------

export interface ProjectSnapshot {
  version: number;
  /** Unique project id. Generated on first save / migration. */
  id?: string;
  /** Human-readable project name. */
  name?: string;
  /** Optional short description shown on home screen. */
  description?: string;
  /**
   * NEW (multi-deck): preferred storage format.
   * Each deck is an independent folder with its own card size.
   */
  decks?: Deck[];
  /**
   * LEGACY: flat card list kept for backward compat and old file imports.
   * Migrated to a single default deck on first load.
   */
  cards: CardDocument[];
  graphics: GraphicAsset[];
  assetFolders?: AssetFolder[];
  fonts: FontAsset[];
  /** Card templates saved by the user for this project. */
  templates?: CardTemplate[];
}

// ---------------------------------------------------------------------------
// Project Library — lightweight index stored separately in localStorage.
// Does NOT contain cards/graphics/fonts — only metadata for the home screen.
// ---------------------------------------------------------------------------

export interface ProjectMeta {
  id: string;
  name: string;
  description: string;
  /** base64 PNG thumbnail of the first card (low-res). */
  thumbnail: string;
  createdAt: number; // Unix ms
  updatedAt: number; // Unix ms
  cardCount: number;
  /** Width of cards in this project (px). Used for aspect-ratio preview. */
  cardWidth: number;
  /** Height of cards in this project (px). */
  cardHeight: number;
  tags: string[];
}

export interface ProjectLibrary {
  version: 1;
  projects: ProjectMeta[];
}
