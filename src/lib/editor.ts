import type { CSSProperties } from 'react';

import type {
  BarElement,
  BarVariant,
  CardBackground,
  CardDocument,
  CardElement,
  CardElementType,
  FrameElement,
  FrameVariant,
  FontAsset,
  GraphicAsset,
  IconVariant,
  IconElement,
  ImageElement,
  InfoElement,
  InfoVariant,
  MarkerElement,
  MarkerVariant,
  NumberElement,
  NumberVariant,
  ProjectSnapshot,
  ShapeElement,
  TextElement,
  TexturePattern,
  TitleElement,
  TitleVariant,
  CounterElement,
  CounterVariant,
  DieElement,
  DieSides,
  DieVariant,
  SealElement,
  SealVariant,
  SeparatorElement,
  SeparatorVariant,
  PortraitElement,
  PortraitVariant,
} from '../types';

export interface CardPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

export interface StarterDesign {
  name: string;
  id?: string;
  category?: string;
  description?: string;
  previewLayout?:
    | 'hero'
    | 'spell'
    | 'tech'
    | 'relic'
    | 'beast'
    | 'omen'
    | 'decree'
    | 'elemental'
    | 'quest';
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  background: CardBackground;
  elements: CardElement[];
}

export interface StarterTemplateOption {
  id: string;
  name: string;
  category: string;
  description: string;
  previewLayout:
    | 'hero'
    | 'spell'
    | 'tech'
    | 'relic'
    | 'beast'
    | 'omen'
    | 'decree'
    | 'elemental'
    | 'quest';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
}

export const DEFAULT_FONTS = [
  'Poppins',
  'Montserrat',
  'Sora',
  'Bebas Neue',
  'Literata',
  'Alegreya Sans SC',
  'Cinzel',
  'Cormorant Garamond',
  'Merriweather',
  'Playfair Display',
  'IM Fell English SC',
  'MedievalSharp',
  'Uncial Antiqua',
  'Grenze Gotisch',
  'Special Elite',
  'Oswald',
  'Anton',
  'Teko',
  'Barlow Condensed',
  'Rajdhani',
  'Orbitron',
  'Oxanium',
  'Rubik Mono One',
  'Permanent Marker',
  'Caveat',
  'Nunito Sans',
];

export const SYSTEM_FONT_FALLBACKS = [
  'Arial',
  'Arial Black',
  'Bahnschrift',
  'Calibri',
  'Cambria',
  'Candara',
  'Consolas',
  'Constantia',
  'Corbel',
  'Courier New',
  'Franklin Gothic Medium',
  'Garamond',
  'Georgia',
  'Impact',
  'Lucida Console',
  'Segoe UI',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
];

export const CARD_PRESETS: CardPreset[] = [
  { id: 'standard', label: 'Standard 63 x 88 mm', width: 744, height: 1038 },
  { id: 'tarot', label: 'Tarot 70 x 120 mm', width: 826, height: 1417 },
  { id: 'mini', label: 'Mini 44 x 67 mm', width: 519, height: 791 },
  { id: 'mini-usa', label: 'Mini USA 41 x 63 mm', width: 484, height: 744 },
  { id: 'mini-euro', label: 'Mini Euro 44 x 68 mm', width: 520, height: 803 },
  { id: 'mini-chimera', label: 'Mini Chimera 43 x 65 mm', width: 508, height: 768 },
  { id: 'dixit', label: 'Dixit 80 x 120 mm', width: 945, height: 1417 },
  { id: 'square', label: 'Quadrada 70 x 70 mm', width: 900, height: 900 },
];

export const STARTER_TEMPLATE_OPTIONS: StarterTemplateOption[] = [
  {
    id: 'heroic-unit',
    name: 'Guerreiro',
    category: 'Criatura',
    description: 'Carta de criatura clássica: arte dominante, nome em destaque e ataque/defesa no rodapé.',
    previewLayout: 'hero',
    primaryColor: '#1c0208',
    secondaryColor: '#0d010c',
    accentColor: '#f5b942',
    textColor: '#fff6e0',
  },
  {
    id: 'spell-scroll',
    name: 'Feitiço',
    category: 'Magia',
    description: 'Sem stats de criatura: foco total no efeito, arte pequena no topo e texto amplo embaixo.',
    previewLayout: 'spell',
    primaryColor: '#03091a',
    secondaryColor: '#071530',
    accentColor: '#4f7dff',
    textColor: '#dce9ff',
  },
  {
    id: 'cyber-op',
    name: 'Agente Cyber',
    category: 'Tecnologia',
    description: 'Visual hacker e angular: terminal, hexágonos, dados técnicos e neon frio.',
    previewLayout: 'tech',
    primaryColor: '#020e18',
    secondaryColor: '#041c30',
    accentColor: '#00e5ff',
    textColor: '#e0faff',
  },
  {
    id: 'artifact-relic',
    name: 'Artefato',
    category: 'Equipamento',
    description: 'Arte em moldura circular, texto de descrição de item e custo em moeda.',
    previewLayout: 'relic',
    primaryColor: '#0d0a08',
    secondaryColor: '#1e1308',
    accentColor: '#f9d66a',
    textColor: '#fff8e0',
  },
  {
    id: 'beast-fullart',
    name: 'Arte Total',
    category: 'Personagem',
    description: 'Arte preenche 58% da carta. Nome e stats em overlay no rodapé, sem frame pesado.',
    previewLayout: 'beast',
    primaryColor: '#071510',
    secondaryColor: '#020b07',
    accentColor: '#3dff9a',
    textColor: '#efffef',
  },
  {
    id: 'arcane-omen',
    name: 'Encantamento',
    category: 'Encantamento',
    description: 'Arte oval ao centro, aura luminosa e caixa de texto estilo manuscrito mágico.',
    previewLayout: 'omen',
    primaryColor: '#0f0520',
    secondaryColor: '#04010c',
    accentColor: '#c084fc',
    textColor: '#f5eeff',
  },
  {
    id: 'royal-decree',
    name: 'Grande Evento',
    category: 'Evento',
    description: 'Sem arte: carta dominada por texto, ideal para eventos, feitiços globais e decretos.',
    previewLayout: 'decree',
    primaryColor: '#f0e6c8',
    secondaryColor: '#d4c090',
    accentColor: '#7c1020',
    textColor: '#280e0a',
  },
  {
    id: 'elemental-clash',
    name: 'Monstro',
    category: 'Monstro',
    description: 'Arte massiva, atributos agressivos e paleta sombria para criaturas ameaçadoras.',
    previewLayout: 'elemental',
    primaryColor: '#060d0a',
    secondaryColor: '#020807',
    accentColor: '#1eff78',
    textColor: '#efffef',
  },
  {
    id: 'comic-quest',
    name: 'Missão',
    category: 'Missão',
    description: 'Título em ribbon, ilustração central e marcadores de recompensa e progresso.',
    previewLayout: 'quest',
    primaryColor: '#1a0c04',
    secondaryColor: '#100805',
    accentColor: '#f9a825',
    textColor: '#fff8e6',
  },
];

export const FRAME_VARIANTS: Array<{ value: FrameVariant; label: string }> = [
  { value: 'ornate', label: 'Ornate' },
  { value: 'double', label: 'Double line' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'tech', label: 'Tech corners' },
  { value: 'gothic', label: 'Gothic' },
  { value: 'arcane', label: 'Arcane' },
  { value: 'banner', label: 'Hero banner' },
  { value: 'cornerTabs', label: 'Corner tabs' },
  { value: 'heroPanel', label: 'Hero panel' },
  { value: 'elementalRails', label: 'Elemental rails' },
  { value: 'foil', label: 'Foil holográfico' },
  { value: 'notebook', label: 'Caderno / prototipo' },
  { value: 'blueprint', label: 'Blueprint tecnico' },
  { value: 'tileBorder', label: 'Tabuleiro modular' },
];

export const INFO_VARIANTS: Array<{ value: InfoVariant; label: string }> = [
  { value: 'panel', label: 'Panel' },
  { value: 'split', label: 'Split title' },
  { value: 'twoCol', label: 'Two columns' },
  { value: 'angled', label: 'Angled header' },
  { value: 'codex', label: 'Codex page' },
  { value: 'ribbon', label: 'Ribbon box' },
  { value: 'comicQuest', label: 'Comic quest' },
  { value: 'quote', label: 'Quote card' },
  { value: 'glass', label: 'Glass panel' },
  { value: 'notched', label: 'Notched panel' },
  { value: 'statBlock', label: 'Stat block' },
  { value: 'arcaneManuscript', label: 'Arcane manuscript' },
  { value: 'battleBrief', label: 'Battle brief' },
  { value: 'terminalLog', label: 'Terminal log' },
  { value: 'handNote', label: 'Hand note' },
  { value: 'royalDecree', label: 'Royal decree' },
  { value: 'bare', label: 'Sem fundo' },
  { value: 'woodPlank', label: 'Madeira' },
  { value: 'fabricPatch', label: 'Retalho de tecido' },
  { value: 'tornPaper', label: 'Papel rasgado' },
  { value: 'leatherBound', label: 'Couro costurado' },
  { value: 'chalkboard', label: 'Lousa' },
  { value: 'abilityCard', label: 'Habilidade pronta' },
  { value: 'recipe', label: 'Receita / crafting' },
  { value: 'warning', label: 'Alerta / regra' },
];

export const NUMBER_VARIANTS: Array<{ value: NumberVariant; label: string }> = [
  { value: 'comic',    label: 'Comic' },
  { value: 'shadowText', label: 'Sombreado' },
  { value: 'sticker',  label: 'Adesivo' },
  { value: 'neon',     label: 'Neon' },
  { value: 'arcade',   label: 'Arcade' },
  { value: 'ink',      label: 'Tinta' },
  { value: 'chrome',   label: 'Cromado' },
  { value: 'ember',    label: 'Brasa' },
  { value: 'badge',    label: 'Badge' },
  { value: 'shield',   label: 'Shield' },
  { value: 'hex',      label: 'Hex token' },
  { value: 'ticket',   label: 'Ticket' },
  { value: 'orb',      label: 'Orb' },
  { value: 'coin',     label: 'Coin' },
  { value: 'rune',     label: 'Rune' },
  { value: 'square',   label: 'Square' },
  { value: 'corner',   label: 'Corner tab' },
  { value: 'sunburst', label: 'Sunburst' },
  { value: 'gemstone', label: 'Gemstone' },
  { value: 'blackSeal',label: 'Black seal' },
  { value: 'laurel',   label: 'Laurel' },
  { value: 'splitStat',label: 'Split stat' },
  { value: 'dial',     label: 'Marcador circular' },
  { value: 'capsule',  label: 'Capsula de valor' },
  { value: 'resource', label: 'Recurso' },
];

export const MARKER_VARIANTS: Array<{ value: MarkerVariant; label: string }> = [
  { value: 'pill',        label: 'Pill' },
  { value: 'tag',         label: 'Tag' },
  { value: 'plate',       label: 'Plate' },
  { value: 'diamond',     label: 'Diamond' },
  { value: 'slash',       label: 'Slash label' },
  { value: 'notch',       label: 'Notched tag' },
  { value: 'crest',       label: 'Crest' },
  { value: 'ruleDot',     label: 'Rule dot' },
  // ── type tags ──
  { value: 'typeRound',   label: 'Tag redonda' },
  { value: 'typeFlag',    label: 'Tag bandeira' },
  { value: 'typeHex',     label: 'Tag hexagonal' },
  { value: 'typeShield',  label: 'Tag escudo' },
  { value: 'typeBanner',  label: 'Tag estandarte' },
  { value: 'tabLeft',     label: 'Aba lateral' },
  { value: 'miniCard',    label: 'Mini carta' },
];

export const COUNTER_VARIANTS: Array<{ value: CounterVariant; label: string }> = [
  { value: 'circles',  label: 'Círculos' },
  { value: 'gems',     label: 'Gemas' },
  { value: 'coins',    label: 'Moedas' },
  { value: 'hearts',   label: 'Corações' },
  { value: 'diamonds', label: 'Diamantes' },
  { value: 'stars',    label: 'Estrelas' },
  { value: 'shields',  label: 'Escudos' },
  { value: 'crystals', label: 'Cristais' },
  { value: 'checks',   label: 'Caixas marcadas' },
  { value: 'charges',  label: 'Cargas' },
  { value: 'skulls',   label: 'Perigo' },
];

export const PORTRAIT_VARIANTS: Array<{ value: PortraitVariant; label: string }> = [
  { value: 'plain',   label: 'Retângulo' },
  { value: 'circle',  label: 'Círculo' },
  { value: 'oval',    label: 'Oval' },
  { value: 'hex',     label: 'Hexágono' },
  { value: 'diamond', label: 'Losango' },
  { value: 'shield',  label: 'Escudo' },
  { value: 'arch',    label: 'Arco' },
  { value: 'frame',   label: 'Moldura ornada' },
];

export const SEAL_VARIANTS: Array<{ value: SealVariant; label: string }> = [
  { value: 'common',    label: 'Comum' },
  { value: 'rare',      label: 'Raro' },
  { value: 'epic',      label: 'Épico' },
  { value: 'legendary', label: 'Lendário' },
  { value: 'wax',       label: 'Lacre de cera' },
  { value: 'emblem',    label: 'Emblema heráldico' },
  { value: 'faction',   label: 'Facção' },
  { value: 'rosette',   label: 'Roseta' },
  { value: 'medal',     label: 'Medalha' },
  { value: 'hexSigil',  label: 'Sigilo hexagonal' },
  { value: 'cornerStamp', label: 'Carimbo de canto' },
];

export const SEPARATOR_VARIANTS: Array<{ value: SeparatorVariant; label: string }> = [
  { value: 'line', label: 'Linha' },
  { value: 'double', label: 'Linha dupla' },
  { value: 'ornament', label: 'Ornamento' },
  { value: 'ribbon', label: 'Fita' },
  { value: 'tech', label: 'Tech' },
  { value: 'chain', label: 'Corrente' },
  { value: 'stars', label: 'Estrelas' },
  { value: 'wave', label: 'Onda' },
  { value: 'slashes', label: 'Cortes' },
  { value: 'brackets', label: 'Colchetes' },
  { value: 'dots', label: 'Pontilhado' },
  { value: 'scallop', label: 'Escamas' },
];

export const DIE_VARIANTS: Array<{ value: DieVariant; label: string }> = [
  { value: 'flat', label: 'Plano' },
  { value: 'rounded', label: 'Arredondado' },
  { value: 'gem', label: 'Gema' },
  { value: 'outline', label: 'Contorno' },
  { value: 'rune', label: 'Runa' },
];

export const DIE_SIDES: Array<{ value: DieSides; label: string }> = [
  { value: 4, label: 'D4' },
  { value: 6, label: 'D6' },
  { value: 8, label: 'D8' },
  { value: 10, label: 'D10' },
  { value: 12, label: 'D12' },
  { value: 20, label: 'D20' },
];

export const ICON_VARIANTS: Array<{ value: IconVariant; label: string }> = [
  { value: 'plain', label: 'Plain' },
  { value: 'token', label: 'Round token' },
  { value: 'crest', label: 'Crest' },
  { value: 'diamond', label: 'Diamond gem' },
  { value: 'burst', label: 'Burst' },
  { value: 'corner', label: 'Corner badge' },
  { value: 'aura', label: 'Aura' },
];

export const BAR_VARIANTS: Array<{ value: BarVariant; label: string }> = [
  { value: 'standard', label: 'Standard' },
  { value: 'segments', label: 'Segmentos' },
  { value: 'gradient', label: 'Gradiente' },
  { value: 'neon', label: 'Neon' },
];

export const TITLE_VARIANTS: Array<{ value: TitleVariant; label: string }> = [
  { value: 'nameplate', label: 'Placa metálica' },
  { value: 'banner',    label: 'Estandarte' },
  { value: 'scroll',    label: 'Pergaminho' },
  { value: 'arcane',    label: 'Arcano' },
  { value: 'minimal',   label: 'Minimalista' },
  { value: 'epic',      label: 'Épico' },
  { value: 'gothic',    label: 'Gótico' },
  { value: 'laurel',    label: 'Louros' },
  { value: 'inset',     label: 'Tech / Inset' },
  { value: 'stamp',     label: 'Carimbo' },
  { value: 'chapterTitle', label: 'Capitulo' },
  { value: 'glassTab',  label: 'Aba translucida' },
  { value: 'questTitle', label: 'Missao' },
];

export const DEFAULT_BACKGROUND: CardBackground = {
  primaryColor: '#2f2032',
  secondaryColor: '#0f1728',
  gradientAngle: 145,
  texture: 'burst',
  imageOpacity: 0.24,
  imageFit: 'cover',
};

export const createId = () =>
  globalThis.crypto?.randomUUID() ?? `card-${Math.random().toString(36).slice(2)}`;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const createEmptyCard = (name = 'Carta 1', width?: number, height?: number): CardDocument => ({
  id: createId(),
  name,
  width: width ?? CARD_PRESETS[0].width,
  height: height ?? CARD_PRESETS[0].height,
  background: { ...DEFAULT_BACKGROUND },
  elements: [],
});

export const DECK_COLORS = [
  '#f6a823', // gold (default)
  '#4d9fff', // blue
  '#4caf6e', // green
  '#e05252', // red
  '#9c6cf0', // purple
  '#ff8c42', // orange
  '#20c997', // teal
  '#e879f9', // pink
];

export const createEmptyDeck = (
  name = 'Baralho',
  cardWidth = CARD_PRESETS[0].width,
  cardHeight = CARD_PRESETS[0].height,
  colorIndex = 0,
): import('../types').Deck => ({
  id: createId(),
  name,
  color: DECK_COLORS[colorIndex % DECK_COLORS.length],
  cardWidth,
  cardHeight,
  cards: [createEmptyCard('Carta 1', cardWidth, cardHeight)],
  description: '',
});

const centeredRect = (
  card: Pick<CardDocument, 'width' | 'height'>,
  width: number,
  height: number,
  yOffset = 0,
) => ({
  x: Math.round((card.width - width) / 2),
  y: Math.round((card.height - height) / 2) + yOffset,
  width,
  height,
});

export function createElement(
  type: 'text',
  card: Pick<CardDocument, 'width' | 'height'>,
): TextElement;
export function createElement(
  type: 'image',
  card: Pick<CardDocument, 'width' | 'height'>,
): ImageElement;
export function createElement(
  type: 'icon',
  card: Pick<CardDocument, 'width' | 'height'>,
): IconElement;
export function createElement(
  type: 'shape',
  card: Pick<CardDocument, 'width' | 'height'>,
): ShapeElement;
export function createElement(
  type: 'frame',
  card: Pick<CardDocument, 'width' | 'height'>,
): FrameElement;
export function createElement(
  type: 'info',
  card: Pick<CardDocument, 'width' | 'height'>,
): InfoElement;
export function createElement(
  type: 'number',
  card: Pick<CardDocument, 'width' | 'height'>,
): NumberElement;
export function createElement(
  type: 'marker',
  card: Pick<CardDocument, 'width' | 'height'>,
): MarkerElement;
export function createElement(
  type: 'separator',
  card: Pick<CardDocument, 'width' | 'height'>,
): SeparatorElement;
export function createElement(
  type: 'die',
  card: Pick<CardDocument, 'width' | 'height'>,
): DieElement;
export function createElement(
  type: CardElementType,
  card: Pick<CardDocument, 'width' | 'height'>,
): CardElement;
export function createElement(
  type: CardElementType,
  card: Pick<CardDocument, 'width' | 'height'>,
): CardElement {
  switch (type) {
    case 'text': {
      const rect = centeredRect(card, Math.min(card.width - 120, 460), 120, -280);
      return {
        id: createId(),
        type,
        name: 'Titulo',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        content: 'Nome da carta',
        color: '#f8f5ea',
        fontFamily: DEFAULT_FONTS[1],
        fontSize: 58,
        fontWeight: 700,
        align: 'center',
        lineHeight: 0.95,
        letterSpacing: 2,
        textTransform: 'none',
        textStrokeEnabled: false,
        textStrokeColor: '#111111',
        textStrokeWidth: 2,
        glowEnabled: false,
        glowColor: '#f8f5ea',
      };
    }

    case 'image': {
      const rect = centeredRect(card, card.width - 120, Math.round(card.height * 0.34), -110);
      return {
        id: createId(),
        type,
        name: 'Arte',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        src: '',
        fit: 'contain',
        borderRadius: 0,
        strokeColor: 'rgba(255,255,255,0.18)',
        strokeWidth: 0,
        shadow: 0,
        glowEnabled: false,
        glowColor: '#ffffff',
      };
    }

    case 'icon': {
      const rect = centeredRect(card, 96, 96, -330);
      return {
        id: createId(),
        type,
        name: 'Icone',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'plain',
        iconName: 'sparkles',
        color: '#f2c96e',
        fillColor: 'transparent',
        strokeWidth: 1.7,
        glowEnabled: false,
        glowColor: '#f2c96e',
      };
    }

    case 'shape': {
      const rect = centeredRect(card, card.width - 110, 140, 300);
      return {
        id: createId(),
        type,
        name: 'Forma',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        shape: 'rectangle',
        fill: 'rgba(255, 255, 255, 0.08)',
        strokeColor: 'rgba(255, 255, 255, 0.24)',
        strokeWidth: 2,
        radius: 24,
        glowEnabled: false,
        glowColor: 'rgba(255,255,255,0.5)',
      };
    }

    case 'frame':
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Moldura',
        x: 26,
        y: 26,
        width: card.width - 52,
        height: card.height - 52,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'ornate',
        strokeColor: '#f7d27d',
        strokeWidth: 4,
        accentColor: 'rgba(255, 255, 255, 0.68)',
        inset: 18,
        radius: 34,
        cornerSize: 58,
        glowEnabled: false,
        glowColor: 'rgba(255,255,255,0.68)',
      });

    case 'info': {
      const rect = centeredRect(card, card.width - 120, 248, 236);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Caixa de texto',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'panel',
        title: 'Habilidade',
        body: 'Descreva o efeito da carta, custos, gatilhos ou qualquer regra que o jogador precise ler rapidamente.',
        fill: 'rgba(7, 14, 24, 0.72)',
        accentColor: '#f0b967',
        titleColor: '#fff7d4',
        bodyColor: '#e4edf7',
        radius: 28,
        padding: 28,
        glowEnabled: false,
        glowColor: '#f0b967',
        titleFontFamily: 'Alegreya Sans SC',
        bodyFontFamily: 'Sora',
        titleFontSize: 28,
        bodyFontSize: 23,
        titleFontWeight: 800,
        titleAlign: 'left',
        bodyAlign: 'left',
        bodyLineHeight: 1.4,
        bodyLetterSpacing: 0,
      });
    }

    case 'number': {
      const rect = centeredRect(card, 128, 128, -346);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Numero',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'badge',
        value: '3',
        label: 'Custo',
        showLabel: true,
        fill: '#f08c4d',
        secondaryColor: '#111827',
        accentColor: '#22c55e',
        color: '#fffaf1',
        fontSize: 66,
        valueFontFamily: 'Bebas Neue',
        labelFontFamily: 'Sora',
        labelFontSize: 18,
        labelColor: '#fffaf1',
        glowEnabled: false,
        glowColor: '#f08c4d',
      });
    }

    case 'marker': {
      const rect = centeredRect(card, 210, 86, 380);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Marcador',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'pill',
        symbol: 'ATK',
        label: 'Ataque',
        fill: 'rgba(255, 255, 255, 0.12)',
        color: '#fff6db',
        fontSize: 28,
        symbolFontFamily: 'Sora',
        labelFontFamily: 'Sora',
        symbolFontSize: 28,
        labelFontSize: 22,
        labelColor: '#fff6db',
        glowEnabled: false,
        glowColor: '#ffffff',
      });
    }

    case 'bar': {
      const rect = centeredRect(card, card.width - 120, 72, 200);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Barra de status',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'standard',
        value: 7,
        maxValue: 10,
        showValues: true,
        label: 'HP',
        fill: '#22c55e',
        trackColor: 'rgba(0,0,0,0.45)',
        accentColor: '#4ade80',
        color: '#ffffff',
        radius: 999,
        glowEnabled: false,
        glowColor: '#22c55e',
      });
    }

    case 'portrait': {
      const size  = Math.min(card.width * 0.55, card.height * 0.42);
      const rect  = centeredRect(card, size, size * 1.28, 120);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Retrato',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'plain',
        src: '',
        focalX: 50,
        focalY: 25,
        strokeColor: '#c0a060',
        strokeWidth: 3,
        accentColor: '#d4af37',
        shadow: 16,
        glowEnabled: false,
        glowColor: '#d4af37',
      });
    }

    case 'counter': {
      const rect = centeredRect(card, 280, 44, 160);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Contador',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'circles',
        value: 3,
        maxValue: 5,
        fill: '#22c55e',
        emptyColor: 'rgba(255,255,255,0.18)',
        accentColor: '#86efac',
        color: '#ffffff',
        unitSize: 32,
        gap: 8,
        arrangement: 'row',
        columns: 5,
        glowEnabled: false,
        glowColor: '#22c55e',
      });
    }

    case 'seal': {
      const rect = centeredRect(card, 110, 110, 160);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Selo',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'common',
        label: 'C',
        fill: '#374151',
        accentColor: '#9ca3af',
        color: '#f3f4f6',
        fontSize: 28,
        fontFamily: 'Cinzel',
        showLabel: true,
        glowEnabled: false,
        glowColor: '#9ca3af',
      });
    }

    case 'separator': {
      const rect = centeredRect(card, Math.min(card.width - 120, 520), 34, -170);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Separador',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'ornament',
        lineColor: '#f0d060',
        accentColor: '#ffffff',
        thickness: 3,
        ornamentSize: 18,
        dash: 0,
        glowEnabled: false,
        glowColor: '#f0d060',
      });
    }

    case 'die': {
      const rect = centeredRect(card, 118, 118, -330);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Dado',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'rounded',
        sides: 6,
        value: '6',
        displayMode: 'number',
        fill: '#f8fafc',
        accentColor: '#f59e0b',
        color: '#111827',
        fontFamily: 'Bebas Neue',
        fontSize: 54,
        showSides: true,
        glowEnabled: false,
        glowColor: '#f59e0b',
      });
    }

    case 'title': {
      const rect = centeredRect(card, card.width - 80, 68, 160);
      return applyVariantDefaults({
        id: createId(),
        type,
        name: 'Título da carta',
        ...rect,
        rotation: 0,
        opacity: 1,
        flipX: false,
        flipY: false,
        locked: false,
        zIndex: 1,
        variant: 'nameplate',
        text: 'Nome da Carta',
        subtitle: 'Tipo · Subtipo',
        color: '#f0d060',
        accentColor: '#d4af37',
        fill: '#1a1a2e',
        fontFamily: 'Cinzel',
        fontSize: 30,
        fontWeight: 700,
        align: 'center',
        letterSpacing: 2,
        textTransform: 'uppercase',
        radius: 4,
        subtitleColor: '#f0d060',
        subtitleFontFamily: 'Cinzel',
        subtitleFontSize: 13,
        subtitleFontWeight: 400,
        subtitleLetterSpacing: 2.6,
        glowEnabled: false,
        glowColor: '#d4af37',
      });
    }
  }
}

export const applyVariantDefaults = (element: CardElement): CardElement => {
  switch (element.type) {
    case 'frame':
      switch (element.variant) {
        case 'double':
          return {
            ...element,
            strokeColor: '#dfe8ff',
            accentColor: 'rgba(246, 184, 92, 0.88)',
            strokeWidth: 2,
            inset: 28,
            radius: 26,
            cornerSize: 0,
          };
        case 'banner':
          return {
            ...element,
            strokeColor: '#f4c56d',
            accentColor: 'rgba(255, 255, 255, 0.84)',
            strokeWidth: 5,
            inset: 12,
            radius: 42,
            cornerSize: 82,
          };
        case 'tech':
          return {
            ...element,
            strokeColor: '#78cbff',
            accentColor: 'rgba(120, 203, 255, 0.86)',
            strokeWidth: 3,
            inset: 24,
            radius: 16,
            cornerSize: 44,
          };
        case 'minimal':
          return {
            ...element,
            strokeColor: 'rgba(255, 255, 255, 0.74)',
            accentColor: 'rgba(255, 255, 255, 0.34)',
            strokeWidth: 2,
            inset: 14,
            radius: 22,
            cornerSize: 0,
          };
        case 'gothic':
          return {
            ...element,
            strokeColor: '#d3b26f',
            accentColor: '#8a2f45',
            strokeWidth: 5,
            inset: 26,
            radius: 12,
            cornerSize: 72,
          };
        case 'arcane':
          return {
            ...element,
            strokeColor: '#b981ff',
            accentColor: '#75e5ff',
            strokeWidth: 3,
            inset: 22,
            radius: 36,
            cornerSize: 64,
          };
        case 'cornerTabs':
          return {
            ...element,
            strokeColor: 'rgba(255, 255, 255, 0.52)',
            accentColor: '#f6b85c',
            strokeWidth: 2,
            inset: 18,
            radius: 24,
            cornerSize: 92,
          };
        case 'scrollwork':
          return {
            ...element,
            strokeColor: '#f4d39b',
            accentColor: '#fff4cd',
            strokeWidth: 4,
            inset: 30,
            radius: 46,
            cornerSize: 70,
          };
        case 'blackCore':
          return {
            ...element,
            strokeColor: '#050505',
            accentColor: '#f7f0d7',
            strokeWidth: 10,
            inset: 18,
            radius: 20,
            cornerSize: 70,
          };
        case 'storyFrame':
          return {
            ...element,
            strokeColor: '#f2d999',
            accentColor: '#7f1d1d',
            strokeWidth: 6,
            inset: 34,
            radius: 24,
            cornerSize: 58,
          };
        case 'costSocket':
          return {
            ...element,
            strokeColor: '#111827',
            accentColor: '#f5d477',
            strokeWidth: 7,
            inset: 24,
            radius: 28,
            cornerSize: 94,
          };
        case 'heroPanel':
          return {
            ...element,
            strokeColor: '#0b0f18',
            accentColor: '#d73b48',
            strokeWidth: 8,
            inset: 14,
            radius: 18,
            cornerSize: 110,
          };
        case 'elementalRails':
          return {
            ...element,
            strokeColor: '#d9f4ff',
            accentColor: '#2dd4bf',
            strokeWidth: 3,
            inset: 22,
            radius: 30,
            cornerSize: 52,
          };
        case 'printPlay':
          return {
            ...element,
            strokeColor: '#f8fafc',
            accentColor: '#1f2937',
            strokeWidth: 3,
            inset: 10,
            radius: 10,
            cornerSize: 28,
          };
        case 'foil':
          return {
            ...element,
            strokeColor: 'rgba(255,255,255,0.65)',
            accentColor: '#e879f9',
            strokeWidth: 3,
            inset: 18,
            radius: 32,
            cornerSize: 70,
          };
        case 'notebook':
          return {
            ...element,
            strokeColor: '#1f2937',
            accentColor: '#ef4444',
            strokeWidth: 2,
            inset: 18,
            radius: 12,
            cornerSize: 34,
          };
        case 'blueprint':
          return {
            ...element,
            strokeColor: '#7dd3fc',
            accentColor: '#22d3ee',
            strokeWidth: 2,
            inset: 22,
            radius: 8,
            cornerSize: 42,
          };
        case 'tileBorder':
          return {
            ...element,
            strokeColor: '#f8fafc',
            accentColor: '#f59e0b',
            strokeWidth: 3,
            inset: 16,
            radius: 18,
            cornerSize: 46,
          };
        case 'ornate':
        default:
          return {
            ...element,
            strokeColor: '#f7d27d',
            accentColor: 'rgba(255, 255, 255, 0.68)',
            strokeWidth: 4,
            inset: 18,
            radius: 34,
            cornerSize: 58,
          };
      }

    case 'icon':
      switch (element.variant ?? 'plain') {
        case 'token':
          return {
            ...element,
            fillColor: '#111827',
            color: '#f7d477',
            strokeWidth: 2,
          };
        case 'crest':
          return {
            ...element,
            fillColor: '#7f1d1d',
            color: '#fff7d6',
            strokeWidth: 2.3,
          };
        case 'diamond':
          return {
            ...element,
            fillColor: '#14365f',
            color: '#bff3ff',
            strokeWidth: 2,
          };
        case 'burst':
          return {
            ...element,
            fillColor: '#f6c35f',
            color: '#2d1604',
            strokeWidth: 2.5,
          };
        case 'corner':
          return {
            ...element,
            fillColor: '#050505',
            color: '#f8fafc',
            strokeWidth: 1.8,
          };
        case 'aura':
          return {
            ...element,
            fillColor: 'transparent',
            color: '#a78bfa',
            strokeWidth: 1.5,
          };
        case 'plain':
        default:
          return {
            ...element,
            fillColor: 'transparent',
            color: '#f2c96e',
            strokeWidth: 1.7,
          };
      }

    case 'info':
      switch (element.variant) {
        case 'scroll':
          return {
            ...element,
            fill: 'rgba(60, 44, 28, 0.86)',
            accentColor: '#f2d4a3',
            titleColor: '#fff6df',
            bodyColor: '#f7eed9',
            radius: 20,
            padding: 30,
          };
        case 'split':
          return {
            ...element,
            fill: 'rgba(7, 14, 24, 0.8)',
            accentColor: '#78cbff',
            titleColor: '#f8fbff',
            bodyColor: '#d7e8f7',
            radius: 24,
            padding: 24,
          };
        case 'ribbon':
          return {
            ...element,
            fill: 'rgba(32, 18, 38, 0.82)',
            accentColor: '#f6b85c',
            titleColor: '#fff7dc',
            bodyColor: '#efe8ff',
            radius: 30,
            padding: 26,
          };
        case 'parchment':
          return {
            ...element,
            fill: 'rgba(238, 205, 145, 0.9)',
            accentColor: '#7a4a22',
            titleColor: '#392512',
            bodyColor: '#402c17',
            radius: 14,
            padding: 32,
          };
        case 'quote':
          return {
            ...element,
            fill: 'rgba(255, 255, 255, 0.08)',
            accentColor: '#f6b85c',
            titleColor: '#fff7dd',
            bodyColor: '#eef4ff',
            radius: 34,
            padding: 34,
            bodyFontFamily: 'Literata',
            bodyFontSize: 26,
            bodyLineHeight: 1.48,
          };
        case 'statBlock':
          return {
            ...element,
            fill: 'rgba(4, 10, 20, 0.86)',
            accentColor: '#78cbff',
            titleColor: '#dff5ff',
            bodyColor: '#c8d8ec',
            radius: 12,
            padding: 22,
          };
        case 'glass':
          return {
            ...element,
            fill: 'rgba(255, 255, 255, 0.12)',
            accentColor: '#ffffff',
            titleColor: '#ffffff',
            bodyColor: '#eaf5ff',
            radius: 30,
            padding: 28,
          };
        case 'rulebook':
          return {
            ...element,
            fill: '#f6e8b8',
            accentColor: '#111827',
            titleColor: '#18120a',
            bodyColor: '#22180e',
            radius: 10,
            padding: 26,
          };
        case 'chapter':
          return {
            ...element,
            fill: 'rgba(248, 250, 252, 0.88)',
            accentColor: '#b91c1c',
            titleColor: '#ffffff',
            bodyColor: '#241610',
            radius: 18,
            padding: 24,
          };
        case 'lore':
          return {
            ...element,
            fill: 'rgba(255, 246, 217, 0.94)',
            accentColor: '#172554',
            titleColor: '#172554',
            bodyColor: '#2f2213',
            radius: 6,
            padding: 32,
          };
        case 'quest':
          return {
            ...element,
            fill: 'rgba(5, 10, 22, 0.84)',
            accentColor: '#facc15',
            titleColor: '#fff7d6',
            bodyColor: '#dbeafe',
            radius: 16,
            padding: 24,
          };
        case 'notched':
          return {
            ...element,
            fill: 'rgba(17, 24, 39, 0.86)',
            accentColor: '#38bdf8',
            titleColor: '#e0f2fe',
            bodyColor: '#e5e7eb',
            radius: 8,
            padding: 24,
          };
        case 'arcaneManuscript':
          return {
            ...element,
            fill: 'rgba(43, 28, 62, 0.9)',
            accentColor: '#c084fc',
            titleColor: '#f5e8ff',
            bodyColor: '#eadcff',
            radius: 26,
            padding: 30,
            titleFontFamily: 'Uncial Antiqua',
            bodyFontFamily: 'Cormorant Garamond',
            bodyFontSize: 24,
            bodyLineHeight: 1.46,
          };
        case 'battleBrief':
          return {
            ...element,
            fill: 'rgba(18, 24, 33, 0.92)',
            accentColor: '#ef4444',
            titleColor: '#fff1f2',
            bodyColor: '#d8e1ec',
            radius: 8,
            padding: 24,
            titleFontFamily: 'Oswald',
            bodyFontFamily: 'Rajdhani',
          };
        case 'terminalLog':
          return {
            ...element,
            fill: 'rgba(2, 8, 23, 0.92)',
            accentColor: '#22d3ee',
            titleColor: '#ccfbf1',
            bodyColor: '#a7f3d0',
            radius: 14,
            padding: 24,
            titleFontFamily: 'Orbitron',
            bodyFontFamily: 'Oxanium',
            bodyLineHeight: 1.28,
          };
        case 'handNote':
          return {
            ...element,
            fill: 'rgba(255, 248, 214, 0.94)',
            accentColor: '#f59e0b',
            titleColor: '#7c2d12',
            bodyColor: '#422006',
            radius: 18,
            padding: 30,
            titleFontFamily: 'Permanent Marker',
            bodyFontFamily: 'Caveat',
            titleFontWeight: 500,
            bodyFontSize: 26,
            bodyLineHeight: 1.48,
          };
        case 'royalDecree':
          return {
            ...element,
            fill: 'rgba(252, 244, 218, 0.95)',
            accentColor: '#8b5a2b',
            titleColor: '#442607',
            bodyColor: '#3a2816',
            radius: 4,
            padding: 34,
            titleFontFamily: 'Cinzel',
            bodyFontFamily: 'Playfair Display',
            bodyLineHeight: 1.48,
          };
        case 'comicQuest':
          return {
            ...element,
            fill: 'rgba(255, 255, 255, 0.92)',
            accentColor: '#2563eb',
            titleColor: '#ffffff',
            bodyColor: '#111827',
            radius: 24,
            padding: 24,
            titleFontFamily: 'Barlow Condensed',
            bodyFontFamily: 'Nunito Sans',
          };
        case 'bare':
          return {
            ...element,
            fill: 'transparent',
            accentColor: '#f0b967',
            titleColor: '#ffffff',
            bodyColor: '#e4edf7',
            radius: 0,
            padding: 20,
          };
        case 'woodPlank':
          return {
            ...element,
            fill: '#5c3412',
            accentColor: '#d4a574',
            titleColor: '#faf0e0',
            bodyColor: '#ede0cc',
            radius: 12,
            padding: 26,
          };
        case 'fabricPatch':
          return {
            ...element,
            fill: 'rgba(72, 44, 96, 0.92)',
            accentColor: '#e8d5b7',
            titleColor: '#f5f0e8',
            bodyColor: '#e2dbd0',
            radius: 16,
            padding: 28,
          };
        case 'tornPaper':
          return {
            ...element,
            fill: 'rgba(242, 229, 200, 0.97)',
            accentColor: '#8b6914',
            titleColor: '#2a1a08',
            bodyColor: '#3a2a14',
            radius: 0,
            padding: 34,
            titleFontFamily: 'Literata',
            bodyFontFamily: 'Literata',
            bodyLineHeight: 1.46,
          };
        case 'leatherBound':
          return {
            ...element,
            fill: '#2c1a0e',
            accentColor: '#c89850',
            titleColor: '#faf0dc',
            bodyColor: '#eadfc8',
            radius: 14,
            padding: 30,
          };
        case 'chalkboard':
          return {
            ...element,
            fill: '#1a2a1e',
            accentColor: '#8b7355',
            titleColor: '#f5f0e8',
            bodyColor: '#e8e4d8',
            radius: 8,
            padding: 28,
            titleFontFamily: 'Permanent Marker',
            bodyFontFamily: 'Caveat',
            bodyFontSize: 26,
          };
        case 'abilityCard':
          return {
            ...element,
            fill: 'rgba(15, 23, 42, 0.9)',
            accentColor: '#22c55e',
            titleColor: '#ecfdf5',
            bodyColor: '#d1fae5',
            radius: 18,
            padding: 24,
            titleFontFamily: 'Sora',
            bodyFontFamily: 'Nunito Sans',
            titleFontSize: 24,
            bodyFontSize: 22,
            bodyLineHeight: 1.35,
          };
        case 'recipe':
          return {
            ...element,
            fill: 'rgba(250, 241, 211, 0.95)',
            accentColor: '#b45309',
            titleColor: '#78350f',
            bodyColor: '#3f2f16',
            radius: 14,
            padding: 28,
            titleFontFamily: 'Literata',
            bodyFontFamily: 'Nunito Sans',
            bodyFontSize: 21,
            bodyLineHeight: 1.42,
          };
        case 'warning':
          return {
            ...element,
            fill: 'rgba(69, 10, 10, 0.92)',
            accentColor: '#facc15',
            titleColor: '#fef3c7',
            bodyColor: '#fee2e2',
            radius: 10,
            padding: 24,
            titleFontFamily: 'Oswald',
            bodyFontFamily: 'Barlow Condensed',
            titleFontSize: 28,
            bodyFontSize: 23,
            bodyLineHeight: 1.28,
          };
        case 'panel':
        default:
          return {
            ...element,
            fill: 'rgba(7, 14, 24, 0.72)',
            accentColor: '#f0b967',
            titleColor: '#fff7d4',
            bodyColor: '#e4edf7',
            radius: 28,
            padding: 28,
          };
      }

    case 'number':
      switch (element.variant) {
        case 'shield':
          return {
            ...element,
            fill: '#3461c9',
            secondaryColor: '#111827',
            accentColor: '#dfe8ff',
            color: '#f7fbff',
            fontSize: 58,
            showLabel: true,
          };
        case 'hex':
          return {
            ...element,
            fill: '#8b4fe8',
            secondaryColor: '#1a1038',
            accentColor: '#d8b4fe',
            color: '#fff8ff',
            fontSize: 54,
            showLabel: true,
          };
        case 'ticket':
          return {
            ...element,
            fill: '#f0dfb2',
            secondaryColor: '#7c4a18',
            accentColor: '#392814',
            color: '#392814',
            fontSize: 46,
            showLabel: true,
          };
        case 'orb':
          return {
            ...element,
            fill: '#41c9ff',
            secondaryColor: '#0f3150',
            accentColor: '#ffffff',
            color: '#ffffff',
            fontSize: 74,
            showLabel: false,
          };
        case 'coin':
          return {
            ...element,
            fill: '#f6c35f',
            secondaryColor: '#9a5f16',
            accentColor: '#fff4c7',
            color: '#3d2609',
            fontSize: 70,
            showLabel: false,
          };
        case 'rune':
          return {
            ...element,
            fill: '#1a2538',
            secondaryColor: '#0f172a',
            accentColor: '#75e5ff',
            color: '#bff3ff',
            fontSize: 68,
            showLabel: false,
          };
        case 'square':
          return {
            ...element,
            fill: '#e8eef8',
            secondaryColor: '#94a3b8',
            accentColor: '#172337',
            color: '#172337',
            fontSize: 56,
            showLabel: true,
          };
        case 'corner':
          return {
            ...element,
            fill: '#111827',
            secondaryColor: '#374151',
            accentColor: '#fff3c7',
            color: '#fff3c7',
            fontSize: 62,
            showLabel: false,
          };
        case 'sunburst':
          return {
            ...element,
            fill: '#f97316',
            secondaryColor: '#7c2d12',
            accentColor: '#fff7ed',
            color: '#fff7ed',
            fontSize: 64,
            showLabel: false,
          };
        case 'gemstone':
          return {
            ...element,
            fill: '#0ea5e9',
            secondaryColor: '#082f49',
            accentColor: '#bae6fd',
            color: '#ecfeff',
            fontSize: 66,
            showLabel: false,
          };
        case 'blackSeal':
          return {
            ...element,
            fill: '#050505',
            secondaryColor: '#1f2937',
            accentColor: '#f8fafc',
            color: '#f8fafc',
            fontSize: 60,
            showLabel: false,
          };
        case 'laurel':
          return {
            ...element,
            fill: '#f8fafc',
            secondaryColor: '#dcfce7',
            accentColor: '#22c55e',
            color: '#111827',
            fontSize: 58,
            showLabel: true,
          };
        case 'splitStat':
          return {
            ...element,
            fill: '#e5e7eb',
            secondaryColor: '#0f172a',
            accentColor: '#94a3b8',
            color: '#111827',
            fontSize: 54,
            showLabel: true,
          };
        case 'sticker':
          return {
            ...element,
            fill: 'transparent',
            secondaryColor: '#303030',
            accentColor: '#ffffff',
            color: '#f06a3d',
            valueFontFamily: 'Bebas Neue',
            fontSize: 76,
            showLabel: false,
          };
        case 'comic':
          return {
            ...element,
            fill: 'transparent',
            secondaryColor: '#363636',
            accentColor: '#fff5cf',
            color: '#ffe94d',
            valueFontFamily: 'Anton',
            fontSize: 72,
            showLabel: false,
          };
        case 'shadowText':
          return {
            ...element,
            fill: 'transparent',
            secondaryColor: '#1f2937',
            accentColor: '#ffffff',
            color: '#3eb8ff',
            valueFontFamily: 'Barlow Condensed',
            fontSize: 78,
            showLabel: false,
          };
        case 'neon':
          return {
            ...element,
            fill: 'transparent',
            secondaryColor: '#0b1020',
            accentColor: '#8ff7ff',
            color: '#38dfff',
            valueFontFamily: 'Orbitron',
            fontSize: 72,
            showLabel: false,
          };
        case 'arcade':
          return {
            ...element,
            fill: 'transparent',
            secondaryColor: '#2b1b4d',
            accentColor: '#fff176',
            color: '#ff4fd8',
            valueFontFamily: 'Press Start 2P',
            fontSize: 46,
            showLabel: false,
          };
        case 'ink':
          return {
            ...element,
            fill: 'transparent',
            secondaryColor: '#111827',
            accentColor: '#f8fafc',
            color: '#111827',
            valueFontFamily: 'Permanent Marker',
            fontSize: 74,
            showLabel: false,
          };
        case 'chrome':
          return {
            ...element,
            fill: 'transparent',
            secondaryColor: '#243040',
            accentColor: '#ffffff',
            color: '#d7ecff',
            valueFontFamily: 'Bebas Neue',
            fontSize: 78,
            showLabel: false,
          };
        case 'ember':
          return {
            ...element,
            fill: 'transparent',
            secondaryColor: '#4a1607',
            accentColor: '#fff2b8',
            color: '#ff8a2a',
            valueFontFamily: 'Anton',
            fontSize: 74,
            showLabel: false,
          };
        case 'dial':
          return {
            ...element,
            fill: '#0f172a',
            secondaryColor: '#334155',
            accentColor: '#38bdf8',
            color: '#e0f2fe',
            fontSize: 58,
            showLabel: false,
          };
        case 'capsule':
          return {
            ...element,
            fill: '#f8fafc',
            secondaryColor: '#1e293b',
            accentColor: '#f97316',
            color: '#111827',
            fontSize: 48,
            showLabel: true,
          };
        case 'resource':
          return {
            ...element,
            fill: '#14532d',
            secondaryColor: '#052e16',
            accentColor: '#86efac',
            color: '#f0fdf4',
            fontSize: 56,
            showLabel: true,
          };
        case 'badge':
        default:
          return {
            ...element,
            fill: '#f08c4d',
            secondaryColor: '#111827',
            accentColor: '#fffaf1',
            color: '#fffaf1',
            fontSize: 66,
            showLabel: true,
          };
      }

    case 'marker':
      switch (element.variant) {
        case 'tag':
          return {
            ...element,
            fill: 'rgba(246, 184, 92, 0.18)',
            color: '#fff4d6',
            fontSize: 24,
          };
        case 'plate':
          return {
            ...element,
            fill: 'rgba(10, 18, 34, 0.7)',
            color: '#dff2ff',
            fontSize: 26,
          };
        case 'diamond':
          return {
            ...element,
            fill: 'rgba(139, 79, 232, 0.2)',
            color: '#faf3ff',
            fontSize: 22,
          };
        case 'slash':
          return {
            ...element,
            fill: 'rgba(190, 24, 93, 0.78)',
            color: '#fff7fb',
            fontSize: 26,
          };
        case 'notch':
          return {
            ...element,
            fill: 'rgba(234, 179, 8, 0.82)',
            color: '#1f1300',
            fontSize: 24,
          };
        case 'crest':
          return {
            ...element,
            fill: '#0f172a',
            color: '#f8fafc',
            fontSize: 26,
          };
        case 'pip':
          return {
            ...element,
            fill: 'rgba(255, 255, 255, 0.08)',
            color: '#fef3c7',
            fontSize: 24,
          };
        case 'ruleDot':
          return {
            ...element,
            fill: 'rgba(248, 250, 252, 0.92)',
            color: '#111827',
            fontSize: 22,
          };
        case 'tabLeft':
          return {
            ...element,
            fill: '#111827',
            accentColor: '#f59e0b',
            color: '#fff7ed',
            fontSize: 24,
          };
        case 'miniCard':
          return {
            ...element,
            fill: 'rgba(255, 255, 255, 0.92)',
            accentColor: '#2563eb',
            color: '#111827',
            fontSize: 22,
          };
        case 'pill':
        default:
          return {
            ...element,
            fill: 'rgba(255, 255, 255, 0.12)',
            color: '#fff6db',
            fontSize: 28,
          };
      }

    case 'bar':
      switch ((element as BarElement).variant) {
        case 'segments':
          return {
            ...element,
            fill: '#3b82f6',
            trackColor: 'rgba(0,0,0,0.5)',
            accentColor: '#93c5fd',
            color: '#ffffff',
            radius: 6,
          };
        case 'gradient':
          return {
            ...element,
            fill: '#22c55e',
            trackColor: 'rgba(0,0,0,0.4)',
            accentColor: '#86efac',
            color: '#dcfce7',
            radius: 999,
          };
        case 'neon':
          return {
            ...element,
            fill: '#00e5ff',
            trackColor: 'rgba(0,20,30,0.85)',
            accentColor: '#67e8f9',
            color: '#e0fffe',
            radius: 6,
          };
        case 'standard':
        default:
          return {
            ...element,
            fill: '#22c55e',
            trackColor: 'rgba(0,0,0,0.42)',
            accentColor: '#4ade80',
            color: '#ffffff',
            radius: 999,
          };
      }

    case 'portrait': {
      const el = element as PortraitElement;
      switch (el.variant) {
        case 'circle':
          return { ...el, strokeColor: '#d4af37', strokeWidth: 3, accentColor: '#d4af37', glowColor: '#d4af37' };
        case 'oval':
          return { ...el, strokeColor: '#c084fc', strokeWidth: 2, accentColor: '#a855f7', glowColor: '#a855f7' };
        case 'hex':
          return { ...el, strokeColor: '#818cf8', strokeWidth: 2, accentColor: '#6366f1', glowColor: '#6366f1' };
        case 'diamond':
          return { ...el, strokeColor: '#f59e0b', strokeWidth: 2, accentColor: '#f59e0b', glowColor: '#f59e0b' };
        case 'shield':
          return { ...el, strokeColor: '#60a5fa', strokeWidth: 2, accentColor: '#3b82f6', glowColor: '#3b82f6' };
        case 'arch':
          return { ...el, strokeColor: '#4ade80', strokeWidth: 2, accentColor: '#22c55e', glowColor: '#22c55e' };
        case 'frame':
          return { ...el, strokeColor: '#d4af37', strokeWidth: 5, accentColor: '#f0d060', glowColor: '#d4af37' };
        case 'plain':
        default:
          return { ...el, strokeColor: '#c0a060', strokeWidth: 3, accentColor: '#d4af37', glowColor: '#d4af37' };
      }
    }

    case 'counter': {
      const el = element as CounterElement;
      switch (el.variant) {
        case 'gems':
          return { ...el, fill: '#818cf8', emptyColor: 'rgba(255,255,255,0.15)', accentColor: '#a5b4fc', color: '#c7d2fe', glowColor: '#818cf8' };
        case 'coins':
          return { ...el, fill: '#f59e0b', emptyColor: 'rgba(255,255,255,0.12)', accentColor: '#fcd34d', color: '#fef3c7', glowColor: '#f59e0b' };
        case 'hearts':
          return { ...el, fill: '#ef4444', emptyColor: 'rgba(255,255,255,0.18)', accentColor: '#fca5a5', color: '#fee2e2', glowColor: '#ef4444' };
        case 'diamonds':
          return { ...el, fill: '#38bdf8', emptyColor: 'rgba(255,255,255,0.15)', accentColor: '#7dd3fc', color: '#e0f2fe', glowColor: '#38bdf8' };
        case 'stars':
          return { ...el, fill: '#fbbf24', emptyColor: 'rgba(255,255,255,0.15)', accentColor: '#fde68a', color: '#fef9c3', glowColor: '#fbbf24' };
        case 'shields':
          return { ...el, fill: '#6366f1', emptyColor: 'rgba(255,255,255,0.12)', accentColor: '#a5b4fc', color: '#e0e7ff', glowColor: '#6366f1' };
        case 'crystals':
          return { ...el, fill: '#06b6d4', emptyColor: 'rgba(255,255,255,0.15)', accentColor: '#67e8f9', color: '#cffafe', glowColor: '#06b6d4' };
        case 'checks':
          return { ...el, fill: '#22c55e', emptyColor: 'rgba(15,23,42,0.35)', accentColor: '#bbf7d0', color: '#dcfce7', glowColor: '#22c55e' };
        case 'charges':
          return { ...el, fill: '#f97316', emptyColor: 'rgba(255,255,255,0.14)', accentColor: '#fed7aa', color: '#ffedd5', glowColor: '#f97316' };
        case 'skulls':
          return { ...el, fill: '#e5e7eb', emptyColor: 'rgba(255,255,255,0.12)', accentColor: '#ef4444', color: '#fee2e2', glowColor: '#ef4444' };
        case 'circles':
        default:
          return { ...el, fill: '#22c55e', emptyColor: 'rgba(255,255,255,0.18)', accentColor: '#86efac', color: '#dcfce7', glowColor: '#22c55e' };
      }
    }

    case 'seal': {
      const el = element as SealElement;
      switch (el.variant) {
        case 'rare':
          return { ...el, fill: '#1e40af', accentColor: '#93c5fd', color: '#dbeafe', label: el.label || 'R', glowColor: '#3b82f6' };
        case 'epic':
          return { ...el, fill: '#581c87', accentColor: '#c084fc', color: '#f3e8ff', label: el.label || 'E', glowColor: '#a855f7' };
        case 'legendary':
          return { ...el, fill: '#78350f', accentColor: '#fcd34d', color: '#fef9c3', label: el.label || 'L', glowColor: '#f59e0b' };
        case 'wax':
          return { ...el, fill: '#991b1b', accentColor: '#fca5a5', color: '#fff1f2', label: el.label || '✦', glowColor: '#ef4444' };
        case 'emblem':
          return { ...el, fill: '#0c1a2e', accentColor: '#c0a060', color: '#fde68a', label: el.label || '⚜', glowColor: '#d4af37' };
        case 'faction':
          return { ...el, fill: '#0f172a', accentColor: '#38bdf8', color: '#e0f2fe', label: el.label || '◈', glowColor: '#38bdf8' };
        case 'rosette':
          return { ...el, fill: '#4c1d95', accentColor: '#e879f9', color: '#fdf4ff', label: el.label || '✿', glowColor: '#d946ef' };
        case 'medal':
          return { ...el, fill: '#92400e', accentColor: '#fbbf24', color: '#fffbeb', label: el.label || 'I', glowColor: '#f59e0b' };
        case 'hexSigil':
          return { ...el, fill: '#172554', accentColor: '#67e8f9', color: '#ecfeff', label: el.label || 'S', glowColor: '#06b6d4' };
        case 'cornerStamp':
          return { ...el, fill: '#7f1d1d', accentColor: '#fecaca', color: '#fff1f2', label: el.label || 'OK', glowColor: '#ef4444' };
        case 'common':
        default:
          return { ...el, fill: '#374151', accentColor: '#9ca3af', color: '#f3f4f6', label: el.label || 'C', glowColor: '#9ca3af' };
      }
    }

    case 'separator': {
      const el = element as SeparatorElement;
      switch (el.variant) {
        case 'line':
          return { ...el, lineColor: '#e5e7eb', accentColor: '#ffffff', thickness: 2, ornamentSize: 0, dash: 0, glowColor: '#e5e7eb' };
        case 'double':
          return { ...el, lineColor: '#f0d060', accentColor: '#ffffff', thickness: 2, ornamentSize: 8, dash: 0, glowColor: '#f0d060' };
        case 'ribbon':
          return { ...el, lineColor: '#7b1d1d', accentColor: '#fbbf24', thickness: 16, ornamentSize: 12, dash: 0, glowColor: '#f59e0b' };
        case 'tech':
          return { ...el, lineColor: '#38bdf8', accentColor: '#e0f2fe', thickness: 3, ornamentSize: 14, dash: 9, glowColor: '#38bdf8' };
        case 'chain':
          return { ...el, lineColor: '#94a3b8', accentColor: '#f8fafc', thickness: 2, ornamentSize: 18, dash: 0, glowColor: '#94a3b8' };
        case 'stars':
          return { ...el, lineColor: '#fbbf24', accentColor: '#fef3c7', thickness: 1, ornamentSize: 16, dash: 0, glowColor: '#fbbf24' };
        case 'wave':
          return { ...el, lineColor: '#67e8f9', accentColor: '#0ea5e9', thickness: 3, ornamentSize: 16, dash: 0, glowColor: '#06b6d4' };
        case 'slashes':
          return { ...el, lineColor: '#f97316', accentColor: '#fed7aa', thickness: 4, ornamentSize: 18, dash: 0, glowColor: '#f97316' };
        case 'brackets':
          return { ...el, lineColor: '#c084fc', accentColor: '#f5d0fe', thickness: 3, ornamentSize: 18, dash: 0, glowColor: '#a855f7' };
        case 'dots':
          return { ...el, lineColor: '#e5e7eb', accentColor: '#f59e0b', thickness: 4, ornamentSize: 10, dash: 0, glowColor: '#f59e0b' };
        case 'scallop':
          return { ...el, lineColor: '#60a5fa', accentColor: '#dbeafe', thickness: 2, ornamentSize: 18, dash: 0, glowColor: '#3b82f6' };
        case 'ornament':
        default:
          return { ...el, lineColor: '#f0d060', accentColor: '#ffffff', thickness: 3, ornamentSize: 18, dash: 0, glowColor: '#f0d060' };
      }
    }

    case 'die': {
      const el = element as DieElement;
      switch (el.variant) {
        case 'flat':
          return { ...el, fill: '#f8fafc', accentColor: '#94a3b8', color: '#111827', glowColor: '#94a3b8' };
        case 'gem':
          return { ...el, fill: '#0f172a', accentColor: '#67e8f9', color: '#ecfeff', glowColor: '#06b6d4' };
        case 'outline':
          return { ...el, fill: 'transparent', accentColor: '#f8fafc', color: '#f8fafc', glowColor: '#f8fafc' };
        case 'rune':
          return { ...el, fill: '#1f1300', accentColor: '#fbbf24', color: '#fef3c7', fontFamily: 'Uncial Antiqua', glowColor: '#f59e0b' };
        case 'rounded':
        default:
          return { ...el, fill: '#f8fafc', accentColor: '#f59e0b', color: '#111827', glowColor: '#f59e0b' };
      }
    }

    case 'title': {
      const el = element as TitleElement;
      switch (el.variant) {
        case 'nameplate':
          return { ...el, color: '#f0d060', accentColor: '#d4af37', fill: '#1a1a2e', fontFamily: 'Cinzel', fontSize: 30, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', radius: 4 };
        case 'banner':
          return { ...el, color: '#ffffff', accentColor: '#e05c3a', fill: '#7b1d1d', fontFamily: 'Alegreya Sans SC', fontSize: 30, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', radius: 0 };
        case 'scroll':
          return { ...el, color: '#3a2510', accentColor: '#8b6914', fill: '#e8d5a3', fontFamily: 'Cormorant Garamond', fontSize: 32, fontWeight: 700, letterSpacing: 1, textTransform: 'none', radius: 4 };
        case 'arcane':
          return { ...el, color: '#c4b5fd', accentColor: '#7c3aed', fill: '#0d0d1a', fontFamily: 'Uncial Antiqua', fontSize: 26, fontWeight: 400, letterSpacing: 3, textTransform: 'none', radius: 0 };
        case 'minimal':
          return { ...el, color: '#f8fafc', accentColor: '#22c55e', fill: 'transparent', fontFamily: 'Raleway', fontSize: 32, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase', radius: 0 };
        case 'epic':
          return { ...el, color: '#ffffff', accentColor: '#f59e0b', fill: '#0f172a', fontFamily: 'Barlow Condensed', fontSize: 38, fontWeight: 900, letterSpacing: 2, textTransform: 'uppercase', radius: 3 };
        case 'gothic':
          return { ...el, color: '#d97706', accentColor: '#7c2d12', fill: '#0f0a04', fontFamily: 'Cinzel', fontSize: 26, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', radius: 0 };
        case 'laurel':
          return { ...el, color: '#14532d', accentColor: '#16a34a', fill: 'transparent', fontFamily: 'Playfair Display', fontSize: 30, fontWeight: 700, letterSpacing: 1, textTransform: 'none', radius: 0 };
        case 'inset':
          return { ...el, color: '#e0f2fe', accentColor: '#38bdf8', fill: '#0f172a', fontFamily: 'Orbitron', fontSize: 22, fontWeight: 700, letterSpacing: 5, textTransform: 'uppercase', radius: 3 };
        case 'stamp':
          return { ...el, color: '#3730a3', accentColor: '#7c3aed', fill: '#fff7ed', fontFamily: 'Permanent Marker', fontSize: 30, fontWeight: 400, letterSpacing: 1, textTransform: 'none', radius: 4 };
        case 'chapterTitle':
          return { ...el, color: '#3f2f16', accentColor: '#b45309', fill: '#f8ecd0', fontFamily: 'Literata', fontSize: 28, fontWeight: 800, letterSpacing: 0.4, textTransform: 'none', radius: 10 };
        case 'glassTab':
          return { ...el, color: '#f8fafc', accentColor: '#7dd3fc', fill: 'rgba(15, 23, 42, 0.46)', fontFamily: 'Sora', fontSize: 28, fontWeight: 700, letterSpacing: 0.5, textTransform: 'none', radius: 18 };
        case 'questTitle':
          return { ...el, color: '#1f1300', accentColor: '#f59e0b', fill: '#fef3c7', fontFamily: 'Barlow Condensed', fontSize: 34, fontWeight: 900, letterSpacing: 1.2, textTransform: 'uppercase', radius: 16 };
        default:
          return el;
      }
    }

    default:
      return element;
  }
};

export const createModularTitleGroup = (
  card: Pick<CardDocument, 'width' | 'height'>,
): CardElement[] => {
  const groupId = createId();
  const width = Math.min(card.width - 80, 560);
  const x = Math.round((card.width - width) / 2);
  const y = 58;

  const base = createElement('shape', card);
  base.name = 'Titulo - base';
  base.groupId = groupId;
  base.x = x;
  base.y = y;
  base.width = width;
  base.height = 78;
  base.shape = 'rectangle';
  base.fill = 'rgba(15, 23, 42, 0.82)';
  base.strokeColor = 'rgba(240, 208, 96, 0.78)';
  base.strokeWidth = 2;
  base.radius = 12;

  const title = createElement('text', card);
  title.name = 'Titulo - texto';
  title.groupId = groupId;
  title.x = x + 28;
  title.y = y + 9;
  title.width = width - 56;
  title.height = 42;
  title.content = 'Nome da Carta';
  title.color = '#fff7d4';
  title.fontFamily = 'Cinzel';
  title.fontSize = 31;
  title.fontWeight = 800;
  title.align = 'center';
  title.lineHeight = 1;
  title.letterSpacing = 1.2;
  title.textTransform = 'uppercase';
  title.autoFitFont = true;

  const subtitle = createElement('text', card);
  subtitle.name = 'Titulo - subtitulo';
  subtitle.groupId = groupId;
  subtitle.x = x + 52;
  subtitle.y = y + 49;
  subtitle.width = width - 104;
  subtitle.height = 18;
  subtitle.content = 'Tipo - Subtipo';
  subtitle.color = 'rgba(255, 247, 212, 0.76)';
  subtitle.fontFamily = 'Sora';
  subtitle.fontSize = 11;
  subtitle.fontWeight = 600;
  subtitle.align = 'center';
  subtitle.lineHeight = 1;
  subtitle.letterSpacing = 2;
  subtitle.textTransform = 'uppercase';
  subtitle.autoFitFont = true;

  return [base, title, subtitle];
};

const backgroundFor = (
  primaryColor: string,
  secondaryColor: string,
  texture: TexturePattern,
  gradientAngle = 145,
): CardBackground => ({
  primaryColor,
  secondaryColor,
  gradientAngle,
  texture,
  imageOpacity: 0.24,
  imageFit: 'cover',
});

export const createStarterLayout = (
  card: Pick<CardDocument, 'width' | 'height'>,
  variantIndex: number | string = 0,
): StarterDesign => {
  const selectedTemplate =
    typeof variantIndex === 'string'
      ? STARTER_TEMPLATE_OPTIONS.find((template) => template.id === variantIndex) ?? STARTER_TEMPLATE_OPTIONS[0]
      : STARTER_TEMPLATE_OPTIONS[Math.abs(variantIndex) % STARTER_TEMPLATE_OPTIONS.length];

  const finalizeStarter = (background: CardBackground, elements: CardElement[]): StarterDesign => ({
    ...selectedTemplate,
    background,
    elements: normalizeZOrder(elements),
  });

  const framePreset = createElement('frame', card);
  const titlePreset = createElement('text', card);
  const titleShapePreset = createElement('shape', card);
  const artPreset = createElement('image', card);
  const boxPreset = createElement('info', card);
  const costPreset = createElement('number', card);
  const leftMarkerPreset = createElement('marker', card);
  const rightMarkerPreset = createElement('marker', card);
  const accentShapePreset = createElement('shape', card);
  const iconPreset = createElement('icon', card);

  titlePreset.lineHeight = 0.9;
  artPreset.fit = 'cover';
  artPreset.shadow = 0;
  artPreset.strokeWidth = 0;
  artPreset.borderRadius = 28;
  accentShapePreset.name = 'Painel decorativo';
  accentShapePreset.strokeWidth = 0;
  iconPreset.name = 'Selo';
  iconPreset.width = 72;
  iconPreset.height = 72;

  switch (selectedTemplate.id) {
    case 'heroic-unit': {
      const frame = framePreset;
      const title = titlePreset;
      const titleShape = titleShapePreset;
      const art = artPreset;
      const box = boxPreset;
      const cost = costPreset;
      const leftMarker = leftMarkerPreset;
      const rightMarker = rightMarkerPreset;
      const accentShape = accentShapePreset;
      const icon = iconPreset;

      frame.variant = 'heroPanel';
      Object.assign(frame, applyVariantDefaults(frame));
      frame.strokeColor = '#13070a';
      frame.accentColor = '#d94545';

      accentShape.x = 58;
      accentShape.y = 64;
      accentShape.width = card.width - 116;
      accentShape.height = 132;
      accentShape.radius = 30;
      accentShape.fill = 'rgba(39, 9, 12, 0.68)';

      titleShape.x = 82;
      titleShape.y = 90;
      titleShape.width = card.width - 164;
      titleShape.height = 84;
      titleShape.radius = 999;
      titleShape.fill = 'rgba(246, 181, 93, 0.18)';
      titleShape.strokeColor = 'rgba(246, 181, 93, 0.72)';

      title.x = 108;
      title.y = 98;
      title.width = card.width - 216;
      title.height = 64;
      title.content = 'Capita da Aurora';
      title.fontFamily = 'Bebas Neue';
      title.fontSize = 54;
      title.letterSpacing = 1.5;
      title.color = '#fff4e2';

      art.x = 56;
      art.y = 208;
      art.width = card.width - 112;
      art.height = Math.round(card.height * 0.43);
      art.borderRadius = 26;

      box.variant = 'battleBrief';
      Object.assign(box, applyVariantDefaults(box));
      box.x = 56;
      box.y = card.height - 314;
      box.width = card.width - 112;
      box.height = 196;
      box.title = 'Talento';
      box.body = 'Quando entrar em campo, conceda +1 ataque a um aliado adjacente.';

      cost.variant = 'shield';
      Object.assign(cost, applyVariantDefaults(cost));
      cost.x = 44;
      cost.y = 42;
      cost.value = '5';
      cost.label = 'Mana';
      cost.showLabel = false;

      leftMarker.variant = 'plate';
      rightMarker.variant = 'plate';
      Object.assign(leftMarker, applyVariantDefaults(leftMarker));
      Object.assign(rightMarker, applyVariantDefaults(rightMarker));
      leftMarker.x = 78;
      rightMarker.x = card.width - rightMarker.width - 78;
      leftMarker.y = rightMarker.y = card.height - 104;
      leftMarker.symbol = 'ATK';
      leftMarker.label = '4';
      rightMarker.symbol = 'DEF';
      rightMarker.label = '7';

      icon.variant = 'crest';
      Object.assign(icon, applyVariantDefaults(icon));
      icon.x = card.width - 118;
      icon.y = 56;
      icon.iconName = 'sword';
      icon.fillColor = '#52131a';
      icon.color = '#ffd996';

      return finalizeStarter(
        backgroundFor('#451313', '#120d16', 'burst', 145),
        [frame, accentShape, art, titleShape, title, box, cost, leftMarker, rightMarker, icon],
      );
    }

    case 'spell-scroll': {
      const frame = framePreset;
      const title = titlePreset;
      const titleShape = titleShapePreset;
      const art = artPreset;
      const box = boxPreset;
      const cost = costPreset;
      const leftMarker = leftMarkerPreset;
      const rightMarker = rightMarkerPreset;
      const accentShape = accentShapePreset;

      frame.variant = 'minimal';
      Object.assign(frame, applyVariantDefaults(frame));
      frame.strokeColor = 'rgba(29, 54, 87, 0.45)';
      frame.accentColor = 'rgba(255, 255, 255, 0.78)';

      titleShape.x = 48;
      titleShape.y = 46;
      titleShape.width = card.width - 184;
      titleShape.height = 102;
      titleShape.radius = 24;
      titleShape.fill = 'rgba(255, 255, 255, 0.74)';
      titleShape.strokeColor = 'rgba(31, 79, 143, 0.28)';

      title.x = 74;
      title.y = 58;
      title.width = card.width - 236;
      title.height = 72;
      title.content = 'Resposta Imediata';
      title.fontFamily = 'Sora';
      title.fontSize = 36;
      title.fontWeight = 700;
      title.letterSpacing = 0;
      title.textTransform = 'none';
      title.align = 'left';
      title.color = '#18304d';

      art.x = 56;
      art.y = 178;
      art.width = card.width - 112;
      art.height = Math.round(card.height * 0.31);
      art.borderRadius = 22;

      accentShape.x = 56;
      accentShape.y = art.y + art.height + 22;
      accentShape.width = card.width - 112;
      accentShape.height = 18;
      accentShape.radius = 999;
      accentShape.fill = 'rgba(31, 79, 143, 0.22)';

      box.variant = 'rulebook';
      Object.assign(box, applyVariantDefaults(box));
      box.x = 56;
      box.y = art.y + art.height + 52;
      box.width = card.width - 112;
      box.height = 278;
      box.title = 'Resolucao';
      box.body = 'Anule um efeito rapido. Se voce controlar um erudito, compre 1 carta.';

      cost.variant = 'square';
      Object.assign(cost, applyVariantDefaults(cost));
      cost.x = card.width - 146;
      cost.y = 42;
      cost.value = '2';
      cost.label = 'AP';
      cost.showLabel = true;

      leftMarker.variant = 'notch';
      rightMarker.variant = 'notch';
      Object.assign(leftMarker, applyVariantDefaults(leftMarker));
      Object.assign(rightMarker, applyVariantDefaults(rightMarker));
      leftMarker.x = 56;
      rightMarker.x = card.width - rightMarker.width - 56;
      leftMarker.y = rightMarker.y = card.height - 114;
      leftMarker.symbol = 'Tipo';
      leftMarker.label = 'Magia';
      rightMarker.symbol = 'Janela';
      rightMarker.label = 'Rapida';

      return finalizeStarter(
        backgroundFor('#f4ecdf', '#cfddea', 'paper', 130),
        [frame, titleShape, title, art, accentShape, box, cost, leftMarker, rightMarker],
      );
    }

    case 'cyber-op': {
      const frame = framePreset;
      const title = titlePreset;
      const titleShape = titleShapePreset;
      const art = artPreset;
      const box = boxPreset;
      const cost = costPreset;
      const leftMarker = leftMarkerPreset;
      const rightMarker = rightMarkerPreset;
      const accentShape = accentShapePreset;
      const icon = iconPreset;

      frame.variant = 'tech';
      Object.assign(frame, applyVariantDefaults(frame));

      titleShape.shape = 'hexagon';
      titleShape.x = 60;
      titleShape.y = 48;
      titleShape.width = card.width - 172;
      titleShape.height = 110;
      titleShape.radius = 0;
      titleShape.fill = 'rgba(2, 12, 21, 0.82)';
      titleShape.strokeColor = '#7de3ff';

      title.x = 92;
      title.y = 66;
      title.width = card.width - 234;
      title.height = 74;
      title.content = 'OPERADOR VANTA';
      title.fontFamily = 'Rajdhani';
      title.fontSize = 42;
      title.letterSpacing = 3;
      title.color = '#eafcff';

      art.x = 64;
      art.y = 186;
      art.width = card.width - 128;
      art.height = Math.round(card.height * 0.34);
      art.borderRadius = 18;

      accentShape.shape = 'hexagon';
      accentShape.x = 84;
      accentShape.y = art.y + art.height + 24;
      accentShape.width = card.width - 168;
      accentShape.height = 64;
      accentShape.fill = 'rgba(7, 35, 52, 0.9)';
      accentShape.strokeColor = '#7de3ff';
      accentShape.strokeWidth = 2;

      box.variant = 'terminalLog';
      Object.assign(box, applyVariantDefaults(box));
      box.x = 58;
      box.y = art.y + art.height + 102;
      box.width = card.width - 116;
      box.height = 244;
      box.title = 'Execucao';
      box.body = 'Escaneie 2 setores. Depois, se houver sinal aliado, recarregue 1 energia.';

      cost.variant = 'corner';
      Object.assign(cost, applyVariantDefaults(cost));
      cost.x = 48;
      cost.y = 42;
      cost.value = '7';
      cost.showLabel = false;

      leftMarker.variant = 'tag';
      rightMarker.variant = 'tag';
      Object.assign(leftMarker, applyVariantDefaults(leftMarker));
      Object.assign(rightMarker, applyVariantDefaults(rightMarker));
      leftMarker.x = 66;
      rightMarker.x = card.width - rightMarker.width - 66;
      leftMarker.y = rightMarker.y = card.height - 106;
      leftMarker.symbol = 'CPU';
      leftMarker.label = '3';
      rightMarker.symbol = 'ARM';
      rightMarker.label = '1';

      icon.variant = 'diamond';
      Object.assign(icon, applyVariantDefaults(icon));
      icon.x = card.width - 110;
      icon.y = 48;
      icon.iconName = 'zap';
      icon.color = '#d9f9ff';
      icon.fillColor = '#103145';

      return finalizeStarter(
        backgroundFor('#06111f', '#103a5a', 'diagonal', 158),
        [frame, titleShape, title, art, accentShape, box, cost, leftMarker, rightMarker, icon],
      );
    }

    case 'artifact-relic': {
      const frame = framePreset;
      const title = titlePreset;
      const titleShape = titleShapePreset;
      const art = artPreset;
      const box = boxPreset;
      const cost = costPreset;
      const leftMarker = leftMarkerPreset;
      const rightMarker = rightMarkerPreset;
      const accentShape = accentShapePreset;

      frame.variant = 'banner';
      Object.assign(frame, applyVariantDefaults(frame));
      frame.strokeColor = '#f2cf8a';
      frame.accentColor = '#fff2c9';

      titleShape.x = 82;
      titleShape.y = 66;
      titleShape.width = card.width - 164;
      titleShape.height = 88;
      titleShape.radius = 999;
      titleShape.fill = 'rgba(42, 22, 12, 0.65)';
      titleShape.strokeColor = 'rgba(242, 207, 138, 0.74)';

      title.x = 118;
      title.y = 78;
      title.width = card.width - 236;
      title.height = 64;
      title.content = 'Relicario Solar';
      title.fontFamily = 'Cinzel';
      title.fontSize = 36;
      title.fontWeight = 700;
      title.textTransform = 'none';
      title.letterSpacing = 0;
      title.color = '#fff3d9';

      art.x = 118;
      art.y = 192;
      art.width = card.width - 236;
      art.height = Math.round(card.height * 0.34);
      art.borderRadius = 999;

      accentShape.x = 76;
      accentShape.y = 170;
      accentShape.width = card.width - 152;
      accentShape.height = Math.round(card.height * 0.42);
      accentShape.radius = 44;
      accentShape.fill = 'rgba(255, 245, 219, 0.08)';
      accentShape.strokeColor = 'rgba(242, 207, 138, 0.32)';
      accentShape.strokeWidth = 2;

      box.variant = 'handNote';
      Object.assign(box, applyVariantDefaults(box));
      box.x = 72;
      box.y = art.y + art.height + 52;
      box.width = card.width - 144;
      box.height = 234;
      box.title = 'Uso';
      box.body = 'Equipe em uma unidade. Ela recebe +2 alcance enquanto estiver pronta.';

      cost.variant = 'coin';
      Object.assign(cost, applyVariantDefaults(cost));
      cost.x = 62;
      cost.y = 56;
      cost.value = '3';
      cost.showLabel = false;

      leftMarker.variant = 'crest';
      rightMarker.variant = 'crest';
      Object.assign(leftMarker, applyVariantDefaults(leftMarker));
      Object.assign(rightMarker, applyVariantDefaults(rightMarker));
      leftMarker.x = 82;
      rightMarker.x = card.width - rightMarker.width - 82;
      leftMarker.y = rightMarker.y = card.height - 108;
      leftMarker.symbol = 'Tipo';
      leftMarker.label = 'Item';
      rightMarker.symbol = 'Slot';
      rightMarker.label = 'Mao';

      return finalizeStarter(
        backgroundFor('#6b3a10', '#22150d', 'linen', 124),
        [frame, accentShape, art, titleShape, title, box, cost, leftMarker, rightMarker],
      );
    }

    case 'beast-fullart': {
      const frame = framePreset;
      const title = titlePreset;
      const titleShape = titleShapePreset;
      const art = artPreset;
      const box = boxPreset;
      const cost = costPreset;
      const leftMarker = leftMarkerPreset;
      const rightMarker = rightMarkerPreset;
      const accentShape = accentShapePreset;

      frame.variant = 'cornerTabs';
      Object.assign(frame, applyVariantDefaults(frame));
      frame.accentColor = '#f3d77e';

      art.x = 50;
      art.y = 48;
      art.width = card.width - 100;
      art.height = Math.round(card.height * 0.56);
      art.borderRadius = 26;

      accentShape.x = 52;
      accentShape.y = card.height - 288;
      accentShape.width = card.width - 104;
      accentShape.height = 160;
      accentShape.radius = 28;
      accentShape.fill = 'rgba(8, 18, 20, 0.54)';
      accentShape.strokeColor = 'rgba(243, 215, 126, 0.26)';
      accentShape.strokeWidth = 2;

      titleShape.x = 58;
      titleShape.y = card.height - 266;
      titleShape.width = card.width - 116;
      titleShape.height = 92;
      titleShape.radius = 18;
      titleShape.fill = 'rgba(135, 36, 21, 0.88)';
      titleShape.strokeColor = 'rgba(255, 255, 255, 0.12)';

      title.x = 82;
      title.y = card.height - 252;
      title.width = card.width - 164;
      title.height = 56;
      title.content = 'Lobo da Neblina';
      title.fontFamily = 'Anton';
      title.fontSize = 42;
      title.letterSpacing = 0.6;
      title.textTransform = 'none';
      title.align = 'left';
      title.color = '#fff8e7';

      box.variant = 'split';
      Object.assign(box, applyVariantDefaults(box));
      box.x = 58;
      box.y = card.height - 166;
      box.width = card.width - 116;
      box.height = 108;
      box.title = 'Instinto';
      box.body = 'Ao atacar sozinho, cause +1 dano.';

      cost.variant = 'rune';
      Object.assign(cost, applyVariantDefaults(cost));
      cost.x = 44;
      cost.y = 40;
      cost.value = '6';
      cost.showLabel = false;

      leftMarker.variant = 'plate';
      rightMarker.variant = 'plate';
      Object.assign(leftMarker, applyVariantDefaults(leftMarker));
      Object.assign(rightMarker, applyVariantDefaults(rightMarker));
      leftMarker.x = 72;
      rightMarker.x = card.width - rightMarker.width - 72;
      leftMarker.y = rightMarker.y = card.height - 84;
      leftMarker.symbol = 'ATK';
      leftMarker.label = '5';
      rightMarker.symbol = 'HP';
      rightMarker.label = '8';

      return finalizeStarter(
        backgroundFor('#1b3d32', '#091116', 'waves', 142),
        [frame, art, accentShape, titleShape, title, box, cost, leftMarker, rightMarker],
      );
    }

    case 'arcane-omen': {
      const frame = framePreset;
      const title = titlePreset;
      const titleShape = titleShapePreset;
      const art = artPreset;
      const box = boxPreset;
      const cost = costPreset;
      const leftMarker = leftMarkerPreset;
      const rightMarker = rightMarkerPreset;
      const accentShape = accentShapePreset;
      const icon = iconPreset;

      frame.variant = 'arcane';
      Object.assign(frame, applyVariantDefaults(frame));

      accentShape.shape = 'diamond';
      accentShape.x = 124;
      accentShape.y = 64;
      accentShape.width = card.width - 248;
      accentShape.height = 132;
      accentShape.radius = 0;
      accentShape.fill = 'rgba(202, 150, 255, 0.16)';
      accentShape.strokeColor = 'rgba(202, 150, 255, 0.7)';
      accentShape.strokeWidth = 2;

      titleShape.x = 148;
      titleShape.y = 88;
      titleShape.width = card.width - 296;
      titleShape.height = 84;
      titleShape.radius = 0;
      titleShape.fill = 'rgba(5, 5, 18, 0.55)';
      titleShape.strokeColor = 'rgba(117, 229, 255, 0.34)';

      title.x = 132;
      title.y = 100;
      title.width = card.width - 264;
      title.height = 60;
      title.content = 'Voto do Eclipse';
      title.fontFamily = 'Alegreya Sans SC';
      title.fontSize = 48;
      title.letterSpacing = 1;
      title.color = '#fbf2ff';

      art.x = 108;
      art.y = 224;
      art.width = card.width - 216;
      art.height = Math.round(card.height * 0.27);

      box.variant = 'arcaneManuscript';
      Object.assign(box, applyVariantDefaults(box));
      box.x = 72;
      box.y = art.y + art.height + 38;
      box.width = card.width - 144;
      box.height = 286;
      box.title = 'Conjuracao';
      box.body = 'Escolha um jogador. Ele descarta 1 carta ou perde 2 pontos de vontade.';

      cost.variant = 'orb';
      Object.assign(cost, applyVariantDefaults(cost));
      cost.x = card.width - 166;
      cost.y = 58;
      cost.value = '8';
      cost.showLabel = false;

      leftMarker.variant = 'pill';
      rightMarker.variant = 'pill';
      Object.assign(leftMarker, applyVariantDefaults(leftMarker));
      Object.assign(rightMarker, applyVariantDefaults(rightMarker));
      leftMarker.x = 92;
      rightMarker.x = card.width - rightMarker.width - 92;
      leftMarker.y = rightMarker.y = card.height - 110;
      leftMarker.symbol = 'LUA';
      leftMarker.label = '+2';
      rightMarker.symbol = 'SOL';
      rightMarker.label = '-1';

      icon.variant = 'burst';
      Object.assign(icon, applyVariantDefaults(icon));
      icon.x = 56;
      icon.y = 58;
      icon.iconName = 'moon';
      icon.fillColor = '#211039';
      icon.color = '#f7ddff';

      return finalizeStarter(
        backgroundFor('#28113d', '#08101c', 'stars', 152),
        [frame, accentShape, titleShape, title, art, box, cost, leftMarker, rightMarker, icon],
      );
    }

    case 'royal-decree': {
      const frame = framePreset;
      const title = titlePreset;
      const titleShape = titleShapePreset;
      const art = artPreset;
      const box = boxPreset;
      const cost = costPreset;
      const leftMarker = leftMarkerPreset;
      const rightMarker = rightMarkerPreset;
      const icon = iconPreset;

      frame.variant = 'gothic';
      Object.assign(frame, applyVariantDefaults(frame));
      frame.strokeColor = '#6d1c24';
      frame.accentColor = '#f1dca8';

      titleShape.x = 68;
      titleShape.y = 56;
      titleShape.width = card.width - 136;
      titleShape.height = 102;
      titleShape.radius = 18;
      titleShape.fill = 'rgba(126, 31, 42, 0.9)';
      titleShape.strokeColor = 'rgba(241, 220, 168, 0.4)';

      title.x = 96;
      title.y = 72;
      title.width = card.width - 192;
      title.height = 64;
      title.content = 'Edicto do Conselho';
      title.fontFamily = 'Cormorant Garamond';
      title.fontSize = 40;
      title.fontWeight = 700;
      title.textTransform = 'none';
      title.letterSpacing = 0;
      title.color = '#fff4d6';

      art.x = 150;
      art.y = 184;
      art.width = card.width - 300;
      art.height = 158;
      art.borderRadius = 999;

      box.variant = 'royalDecree';
      Object.assign(box, applyVariantDefaults(box));
      box.x = 64;
      box.y = 374;
      box.width = card.width - 128;
      box.height = 360;
      box.title = 'Determinacao';
      box.body = 'Cada aliado recebe +1 defesa ate o fim da rodada. Depois, compre 1 carta.';

      cost.variant = 'laurel';
      Object.assign(cost, applyVariantDefaults(cost));
      cost.x = 52;
      cost.y = 48;
      cost.value = '4';
      cost.label = 'Selos';
      cost.showLabel = true;
      cost.fill = '#f6e5bd';
      cost.accentColor = '#7e1f2a';

      leftMarker.variant = 'crest';
      rightMarker.variant = 'crest';
      Object.assign(leftMarker, applyVariantDefaults(leftMarker));
      Object.assign(rightMarker, applyVariantDefaults(rightMarker));
      leftMarker.x = 76;
      rightMarker.x = card.width - rightMarker.width - 76;
      leftMarker.y = rightMarker.y = card.height - 104;
      leftMarker.symbol = 'Classe';
      leftMarker.label = 'Evento';
      rightMarker.symbol = 'Duracao';
      rightMarker.label = '1 turno';

      icon.variant = 'crest';
      Object.assign(icon, applyVariantDefaults(icon));
      icon.x = Math.round((card.width - icon.width) / 2);
      icon.y = 176;
      icon.iconName = 'crown';
      icon.fillColor = '#6d1c24';
      icon.color = '#fbeab8';

      return finalizeStarter(
        backgroundFor('#efe0b8', '#bea46d', 'linen', 118),
        [frame, titleShape, title, icon, art, box, cost, leftMarker, rightMarker],
      );
    }

    case 'elemental-clash': {
      const frame = framePreset;
      const title = titlePreset;
      const titleShape = titleShapePreset;
      const art = artPreset;
      const box = boxPreset;
      const cost = costPreset;
      const leftMarker = leftMarkerPreset;
      const rightMarker = rightMarkerPreset;
      const accentShape = accentShapePreset;
      const icon = iconPreset;

      frame.variant = 'elementalRails';
      Object.assign(frame, applyVariantDefaults(frame));

      accentShape.x = 52;
      accentShape.y = 52;
      accentShape.width = card.width - 104;
      accentShape.height = 126;
      accentShape.radius = 32;
      accentShape.fill = 'rgba(11, 34, 56, 0.58)';
      accentShape.strokeColor = 'rgba(110, 240, 211, 0.38)';
      accentShape.strokeWidth = 2;

      titleShape.x = 78;
      titleShape.y = 74;
      titleShape.width = card.width - 156;
      titleShape.height = 82;
      titleShape.radius = 18;
      titleShape.fill = 'rgba(9, 20, 35, 0.76)';
      titleShape.strokeColor = 'rgba(255, 255, 255, 0.14)';

      title.x = 104;
      title.y = 86;
      title.width = card.width - 208;
      title.height = 58;
      title.content = 'Duelista da Tempestade';
      title.fontFamily = 'Teko';
      title.fontSize = 46;
      title.letterSpacing = 1.4;
      title.textTransform = 'uppercase';
      title.color = '#efffff';

      art.x = 58;
      art.y = 198;
      art.width = card.width - 116;
      art.height = Math.round(card.height * 0.36);

      box.variant = 'comicQuest';
      Object.assign(box, applyVariantDefaults(box));
      box.x = 60;
      box.y = art.y + art.height + 28;
      box.width = card.width - 120;
      box.height = 226;
      box.title = 'Carga';
      box.body = 'Ao vencer um duelo, energize um marcador e cause 1 dano adicional.';

      cost.variant = 'splitStat';
      Object.assign(cost, applyVariantDefaults(cost));
      cost.x = card.width - 176;
      cost.y = 48;
      cost.width = 132;
      cost.height = 132;
      cost.value = '3';
      cost.label = '6';
      cost.showLabel = true;
      cost.fill = '#1c88b5';
      cost.secondaryColor = '#34d399';
      cost.color = '#ffffff';

      leftMarker.variant = 'slash';
      rightMarker.variant = 'slash';
      Object.assign(leftMarker, applyVariantDefaults(leftMarker));
      Object.assign(rightMarker, applyVariantDefaults(rightMarker));
      leftMarker.x = 72;
      rightMarker.x = card.width - rightMarker.width - 72;
      leftMarker.y = rightMarker.y = card.height - 104;
      leftMarker.symbol = 'ATK';
      leftMarker.label = '6';
      rightMarker.symbol = 'SPD';
      rightMarker.label = '3';

      icon.variant = 'diamond';
      Object.assign(icon, applyVariantDefaults(icon));
      icon.x = 48;
      icon.y = 54;
      icon.iconName = 'zap';
      icon.color = '#efffff';
      icon.fillColor = '#11344f';

      return finalizeStarter(
        backgroundFor('#0d3f58', '#122036', 'waves', 138),
        [frame, accentShape, titleShape, title, art, box, cost, leftMarker, rightMarker, icon],
      );
    }

    case 'comic-quest': {
      const frame = framePreset;
      const title = titlePreset;
      const titleShape = titleShapePreset;
      const art = artPreset;
      const box = boxPreset;
      const cost = costPreset;
      const leftMarker = leftMarkerPreset;
      const rightMarker = rightMarkerPreset;
      const accentShape = accentShapePreset;
      const icon = iconPreset;

      frame.variant = 'double';
      Object.assign(frame, applyVariantDefaults(frame));
      frame.strokeColor = '#fff8ef';
      frame.accentColor = '#b21f3a';

      titleShape.x = 54;
      titleShape.y = 56;
      titleShape.width = card.width - 108;
      titleShape.height = 98;
      titleShape.radius = 24;
      titleShape.fill = 'rgba(255, 255, 255, 0.78)';
      titleShape.strokeColor = 'rgba(178, 31, 58, 0.26)';

      title.x = 84;
      title.y = 66;
      title.width = card.width - 168;
      title.height = 64;
      title.content = 'Missao da Manha';
      title.fontFamily = 'Nunito Sans';
      title.fontSize = 36;
      title.fontWeight = 800;
      title.textTransform = 'none';
      title.letterSpacing = 0;
      title.align = 'left';
      title.color = '#2a1a14';

      art.x = 58;
      art.y = 178;
      art.width = card.width - 116;
      art.height = Math.round(card.height * 0.29);
      art.borderRadius = 24;

      accentShape.x = 72;
      accentShape.y = art.y + art.height + 24;
      accentShape.width = card.width - 144;
      accentShape.height = 20;
      accentShape.radius = 999;
      accentShape.fill = 'rgba(178, 31, 58, 0.25)';

      box.variant = 'comicQuest';
      Object.assign(box, applyVariantDefaults(box));
      box.x = 56;
      box.y = art.y + art.height + 52;
      box.width = card.width - 112;
      box.height = 278;
      box.title = 'Objetivo';
      box.body = 'Visite 2 locais diferentes. Quando concluir, receba 1 recompensa e compre 1 carta.';

      cost.variant = 'badge';
      Object.assign(cost, applyVariantDefaults(cost));
      cost.x = card.width - 152;
      cost.y = 42;
      cost.value = '1';
      cost.label = 'XP';
      cost.showLabel = true;

      leftMarker.variant = 'notch';
      rightMarker.variant = 'notch';
      Object.assign(leftMarker, applyVariantDefaults(leftMarker));
      Object.assign(rightMarker, applyVariantDefaults(rightMarker));
      leftMarker.x = 68;
      rightMarker.x = card.width - rightMarker.width - 68;
      leftMarker.y = rightMarker.y = card.height - 106;
      leftMarker.symbol = 'Classe';
      leftMarker.label = 'Quest';
      rightMarker.symbol = 'Premio';
      rightMarker.label = '1 item';

      icon.variant = 'plain';
      Object.assign(icon, applyVariantDefaults(icon));
      icon.x = 64;
      icon.y = 188;
      icon.iconName = 'map';
      icon.color = '#b21f3a';

      return finalizeStarter(
        backgroundFor('#fff2cf', '#f29d4b', 'rings', 132),
        [frame, titleShape, title, art, icon, accentShape, box, cost, leftMarker, rightMarker],
      );
    }
  }

  const design = Math.abs(typeof variantIndex === 'number' ? variantIndex : 0) % 6;

  const frame = createElement('frame', card);
  const title = createElement('text', card);
  const titleShape = createElement('shape', card);
  const art = createElement('image', card);
  const box = createElement('info', card);
  const cost = createElement('number', card);
  const leftMarker = createElement('marker', card);
  const rightMarker = createElement('marker', card);

  const baseElements = [frame, titleShape, title, art, box, cost, leftMarker, rightMarker];

  if (design === 0) {
    frame.variant = 'ornate';
    Object.assign(frame, applyVariantDefaults(frame));

    titleShape.name = 'Faixa do titulo';
    titleShape.x = 64;
    titleShape.y = 56;
    titleShape.width = card.width - 128;
    titleShape.height = 136;
    titleShape.fill = 'rgba(13, 21, 35, 0.72)';
    titleShape.strokeColor = 'rgba(255, 219, 161, 0.65)';
    titleShape.radius = 30;

    title.x = 94;
    title.y = 78;
    title.width = card.width - 188;
    title.height = 96;
    title.content = 'Guardiao Astral';

    art.x = 66;
    art.y = 212;
    art.width = card.width - 132;
    art.height = Math.round(card.height * 0.34);

    box.variant = 'panel';
    Object.assign(box, applyVariantDefaults(box));
    box.x = 64;
    box.y = art.y + art.height + 34;
    box.width = card.width - 128;
    box.height = Math.round(card.height * 0.25);
    box.body = 'Quando entrar em jogo, compre 1 carta.\nSe voce controlar luz, receba +2 defesa.';

    cost.value = '4';
    cost.label = 'Custo';
    leftMarker.symbol = 'ATK';
    leftMarker.label = '4';
    rightMarker.symbol = 'DEF';
    rightMarker.label = '6';

    leftMarker.x = 72;
    rightMarker.x = card.width - rightMarker.width - 72;
    leftMarker.y = rightMarker.y = card.height - 152;

    return {
      name: 'Fantasia arcana',
      background: backgroundFor('#2f2032', '#0f1728', 'burst'),
      elements: normalizeZOrder(baseElements),
    };
  }

  if (design === 1) {
    frame.variant = 'minimal';
    Object.assign(frame, applyVariantDefaults(frame));

    titleShape.x = 48;
    titleShape.y = 48;
    titleShape.width = card.width - 96;
    titleShape.height = 108;
    titleShape.fill = 'rgba(250, 250, 247, 0.86)';
    titleShape.strokeColor = 'rgba(35, 35, 35, 0.18)';
    titleShape.radius = 18;

    title.x = 76;
    title.y = 60;
    title.width = card.width - 152;
    title.height = 82;
    title.content = 'Carta Tática';
    title.color = '#16202e';
    title.fontFamily = 'Sora';
    title.fontSize = 42;
    title.letterSpacing = 0;
    title.textTransform = 'none';

    art.x = 80;
    art.y = 196;
    art.width = card.width - 160;
    art.height = Math.round(card.height * 0.38);

    box.variant = 'glass';
    Object.assign(box, applyVariantDefaults(box));
    box.x = 80;
    box.y = art.y + art.height + 34;
    box.width = card.width - 160;
    box.height = 246;
    box.title = 'Efeito';
    box.body = 'Resolva uma acao rapida e mova um marcador para qualquer zona adjacente.';

    cost.variant = 'square';
    Object.assign(cost, applyVariantDefaults(cost));
    cost.x = card.width - 154;
    cost.y = 48;
    cost.value = '2';
    cost.label = 'AP';

    leftMarker.variant = 'plate';
    rightMarker.variant = 'plate';
    Object.assign(leftMarker, applyVariantDefaults(leftMarker));
    Object.assign(rightMarker, applyVariantDefaults(rightMarker));
    leftMarker.x = 80;
    rightMarker.x = card.width - rightMarker.width - 80;
    leftMarker.y = rightMarker.y = card.height - 136;
    leftMarker.symbol = '+';
    leftMarker.label = 'Movimento';
    rightMarker.symbol = '!';
    rightMarker.label = 'Reacao';

    return {
      name: 'Editorial claro',
      background: backgroundFor('#f5f1e7', '#dfe8f4', 'paper', 130),
      elements: normalizeZOrder(baseElements),
    };
  }

  if (design === 2) {
    frame.variant = 'tech';
    Object.assign(frame, applyVariantDefaults(frame));

    titleShape.shape = 'hexagon';
    titleShape.x = 56;
    titleShape.y = 52;
    titleShape.width = card.width - 112;
    titleShape.height = 116;
    titleShape.fill = 'rgba(3, 12, 24, 0.74)';
    titleShape.strokeColor = '#78cbff';
    titleShape.radius = 0;

    title.x = 92;
    title.y = 70;
    title.width = card.width - 184;
    title.height = 78;
    title.content = 'PROTOCOLO X7';
    title.color = '#dff6ff';
    title.fontFamily = 'Sora';
    title.fontSize = 38;
    title.letterSpacing = 3;

    art.x = 74;
    art.y = 206;
    art.width = card.width - 148;
    art.height = Math.round(card.height * 0.32);

    box.variant = 'statBlock';
    Object.assign(box, applyVariantDefaults(box));
    box.x = 70;
    box.y = art.y + art.height + 28;
    box.width = card.width - 140;
    box.height = 278;
    box.title = 'Rotina';
    box.body = 'Ative: escaneie 2 setores.\nDepois, ganhe +1 energia se houver uma unidade aliada.';

    cost.variant = 'corner';
    Object.assign(cost, applyVariantDefaults(cost));
    cost.x = 52;
    cost.y = 48;
    cost.value = '7';

    leftMarker.variant = 'tag';
    rightMarker.variant = 'tag';
    Object.assign(leftMarker, applyVariantDefaults(leftMarker));
    Object.assign(rightMarker, applyVariantDefaults(rightMarker));
    leftMarker.x = 78;
    rightMarker.x = card.width - rightMarker.width - 78;
    leftMarker.y = rightMarker.y = card.height - 144;
    leftMarker.symbol = 'CPU';
    leftMarker.label = '3';
    rightMarker.symbol = 'SYS';
    rightMarker.label = '1';

    return {
      name: 'Sci-fi operacional',
      background: backgroundFor('#07111f', '#0f3150', 'diagonal', 160),
      elements: normalizeZOrder(baseElements),
    };
  }

  if (design === 3) {
    frame.variant = 'scrollwork';
    Object.assign(frame, applyVariantDefaults(frame));

    titleShape.x = 86;
    titleShape.y = 70;
    titleShape.width = card.width - 172;
    titleShape.height = 96;
    titleShape.fill = 'rgba(92, 58, 29, 0.32)';
    titleShape.strokeColor = '#7a4a22';
    titleShape.radius = 999;

    title.x = 112;
    title.y = 82;
    title.width = card.width - 224;
    title.height = 72;
    title.content = 'Mapa Antigo';
    title.color = '#3c2916';
    title.fontFamily = 'Literata';
    title.fontSize = 42;
    title.textTransform = 'none';
    title.letterSpacing = 0;

    art.x = 80;
    art.y = 204;
    art.width = card.width - 160;
    art.height = Math.round(card.height * 0.3);

    box.variant = 'parchment';
    Object.assign(box, applyVariantDefaults(box));
    box.x = 78;
    box.y = art.y + art.height + 42;
    box.width = card.width - 156;
    box.height = 292;
    box.title = 'Descoberta';
    box.body = 'Revele 1 local. Se houver tesouro, marque-o e compre uma carta de destino.';

    cost.variant = 'coin';
    Object.assign(cost, applyVariantDefaults(cost));
    cost.x = 64;
    cost.y = 54;
    cost.value = '5';

    leftMarker.variant = 'diamond';
    rightMarker.variant = 'diamond';
    Object.assign(leftMarker, applyVariantDefaults(leftMarker));
    Object.assign(rightMarker, applyVariantDefaults(rightMarker));
    leftMarker.x = 80;
    rightMarker.x = card.width - rightMarker.width - 80;
    leftMarker.y = rightMarker.y = card.height - 150;
    leftMarker.symbol = 'R';
    leftMarker.label = 'Raro';
    rightMarker.symbol = '$';
    rightMarker.label = '2';

    return {
      name: 'Pergaminho aventureiro',
      background: backgroundFor('#f5deb3', '#caa36a', 'linen', 115),
      elements: normalizeZOrder(baseElements),
    };
  }

  if (design === 4) {
    frame.variant = 'arcane';
    Object.assign(frame, applyVariantDefaults(frame));

    titleShape.shape = 'diamond';
    titleShape.x = 122;
    titleShape.y = 70;
    titleShape.width = card.width - 244;
    titleShape.height = 128;
    titleShape.fill = 'rgba(160, 104, 255, 0.24)';
    titleShape.strokeColor = '#b981ff';

    title.x = 116;
    title.y = 96;
    title.width = card.width - 232;
    title.height = 72;
    title.content = 'Eclipse';
    title.color = '#ffffff';
    title.fontFamily = 'Alegreya Sans SC';
    title.fontSize = 56;

    art.x = 110;
    art.y = 242;
    art.width = card.width - 220;
    art.height = Math.round(card.height * 0.28);

    box.variant = 'quote';
    Object.assign(box, applyVariantDefaults(box));
    box.x = 74;
    box.y = art.y + art.height + 42;
    box.width = card.width - 148;
    box.height = 290;
    box.title = 'Pressagio';
    box.body = 'Escolha um jogador. Ele descarta 1 carta ou perde 2 pontos de vontade.';

    cost.variant = 'orb';
    Object.assign(cost, applyVariantDefaults(cost));
    cost.x = card.width - 168;
    cost.y = 62;
    cost.value = '8';

    leftMarker.variant = 'pill';
    rightMarker.variant = 'pill';
    Object.assign(leftMarker, applyVariantDefaults(leftMarker));
    Object.assign(rightMarker, applyVariantDefaults(rightMarker));
    leftMarker.x = 92;
    rightMarker.x = card.width - rightMarker.width - 92;
    leftMarker.y = rightMarker.y = card.height - 148;
    leftMarker.symbol = 'LUA';
    leftMarker.label = '+2';
    rightMarker.symbol = 'SOL';
    rightMarker.label = '-1';

    return {
      name: 'Arcano noturno',
      background: backgroundFor('#140d24', '#061426', 'stars', 155),
      elements: normalizeZOrder(baseElements),
    };
  }

  frame.variant = 'cornerTabs';
  Object.assign(frame, applyVariantDefaults(frame));

  titleShape.x = 48;
  titleShape.y = card.height - 196;
  titleShape.width = card.width - 96;
  titleShape.height = 118;
  titleShape.fill = 'rgba(255, 255, 255, 0.78)';
  titleShape.strokeColor = 'rgba(20, 30, 42, 0.16)';
  titleShape.radius = 24;

  title.x = 82;
  title.y = card.height - 176;
  title.width = card.width - 164;
  title.height = 76;
  title.content = 'Criatura';
  title.color = '#12202f';
  title.fontFamily = 'Sora';
  title.fontSize = 44;
  title.textTransform = 'none';
  title.letterSpacing = 0;

  art.x = 58;
  art.y = 70;
  art.width = card.width - 116;
  art.height = Math.round(card.height * 0.48);

  box.variant = 'split';
  Object.assign(box, applyVariantDefaults(box));
  box.x = 64;
  box.y = art.y + art.height + 28;
  box.width = card.width - 128;
  box.height = 212;
  box.title = 'Instinto';
  box.body = 'Ao atacar, role 1 dado. Em 5+, esta carta causa dano adicional.';

  cost.variant = 'rune';
  Object.assign(cost, applyVariantDefaults(cost));
  cost.x = 54;
  cost.y = 52;
  cost.value = '6';

  leftMarker.variant = 'plate';
  rightMarker.variant = 'plate';
  Object.assign(leftMarker, applyVariantDefaults(leftMarker));
  Object.assign(rightMarker, applyVariantDefaults(rightMarker));
  leftMarker.x = 82;
  rightMarker.x = card.width - rightMarker.width - 82;
  leftMarker.y = rightMarker.y = card.height - 76;
  leftMarker.symbol = 'ATK';
  leftMarker.label = '5';
  rightMarker.symbol = 'HP';
  rightMarker.label = '9';

  return {
    name: 'Bestiario claro',
    background: backgroundFor('#fffaf0', '#cfe7d6', 'rings', 135),
    elements: normalizeZOrder(baseElements),
  };
};

export const normalizeZOrder = (elements: CardElement[]) =>
  [...elements]
    .sort((left, right) => left.zIndex - right.zIndex)
    .map((element, index) => ({ ...element, zIndex: index + 1 }));

const assignZOrder = (elements: CardElement[]) =>
  elements.map((element, index) => ({ ...element, zIndex: index + 1 }));

export const moveElementLayer = (
  elements: CardElement[],
  elementId: string,
  direction: 'forward' | 'backward',
) => {
  const ordered = normalizeZOrder(elements);
  const index = ordered.findIndex((element) => element.id === elementId);

  if (index === -1) {
    return ordered;
  }

  const swapWith = direction === 'forward' ? index + 1 : index - 1;

  if (swapWith < 0 || swapWith >= ordered.length) {
    return ordered;
  }

  const next = [...ordered];
  [next[index], next[swapWith]] = [next[swapWith], next[index]];
  return assignZOrder(next);
};

export const reorderElementLayer = (
  elements: CardElement[],
  draggedId: string,
  targetId: string,
) => {
  if (draggedId === targetId) {
    return normalizeZOrder(elements);
  }

  const visualOrder = normalizeZOrder(elements).sort((a, b) => b.zIndex - a.zIndex);
  const fromIndex = visualOrder.findIndex((element) => element.id === draggedId);
  const targetIndex = visualOrder.findIndex((element) => element.id === targetId);

  if (fromIndex === -1 || targetIndex === -1) {
    return visualOrder.reverse().map((element, index) => ({ ...element, zIndex: index + 1 }));
  }

  const nextVisualOrder = [...visualOrder];
  const [dragged] = nextVisualOrder.splice(fromIndex, 1);
  const insertIndex = nextVisualOrder.findIndex((element) => element.id === targetId);
  nextVisualOrder.splice(insertIndex, 0, dragged);

  return nextVisualOrder.reverse().map((element, index) => ({ ...element, zIndex: index + 1 }));
};

export const duplicateElement = (element: CardElement, zIndex: number): CardElement => ({
  ...element,
  id: createId(),
  name: `${element.name} copia`,
  x: element.x + 18,
  y: element.y + 18,
  locked: false,
  groupId: undefined,
  zIndex,
});

export const getNextZIndex = (elements: CardElement[]) =>
  elements.reduce((highest, element) => Math.max(highest, element.zIndex), 0) + 1;

export const GROUP_COLORS = [
  '#38bdf8',
  '#f97316',
  '#a78bfa',
  '#22c55e',
  '#f43f5e',
  '#eab308',
  '#14b8a6',
  '#ec4899',
];

export const getGroupColor = (groupId?: string) => {
  if (!groupId) return GROUP_COLORS[0];

  const hash = [...groupId].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );

  return GROUP_COLORS[hash % GROUP_COLORS.length];
};

const backgroundStyleCache = new Map<string, CSSProperties>();
const textureStyleCache = new Map<TexturePattern, CSSProperties>();

export const getBackgroundStyle = (background: CardBackground): CSSProperties => {
  const key = `${background.gradientAngle}|${background.primaryColor}|${background.secondaryColor}`;
  const cached = backgroundStyleCache.get(key);
  if (cached) return cached;
  const style = {
    background: `linear-gradient(${background.gradientAngle}deg, ${background.primaryColor} 0%, ${background.secondaryColor} 100%)`,
  };
  backgroundStyleCache.set(key, style);
  return style;
};

export const getTextureStyle = (texture: TexturePattern): CSSProperties => {
  const cached = textureStyleCache.get(texture);
  if (cached) return cached;

  let style: CSSProperties;
  switch (texture) {
    case 'grid':
      style = {
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
        backgroundSize: '38px 38px',
      };
      break;
    case 'dots':
      style = {
        backgroundImage:
          'radial-gradient(circle at center, rgba(255,255,255,0.22) 0 1.2px, transparent 1.2px)',
        backgroundSize: '24px 24px',
      };
      break;
    case 'burst':
      style = {
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 28%), radial-gradient(circle at 80% 0%, rgba(255,196,123,0.16), transparent 22%), radial-gradient(circle at 50% 100%, rgba(116,210,255,0.18), transparent 24%)',
      };
      break;
    case 'paper':
      style = {
        backgroundImage:
          'radial-gradient(circle at 18% 24%, rgba(0,0,0,0.05) 0 1px, transparent 1px), radial-gradient(circle at 72% 64%, rgba(255,255,255,0.28) 0 1px, transparent 1px)',
        backgroundSize: '18px 18px, 26px 26px',
        opacity: 0.72,
      };
      break;
    case 'linen':
      style = {
        backgroundImage:
          'linear-gradient(0deg, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
        opacity: 0.55,
      };
      break;
    case 'diagonal':
      style = {
        backgroundImage:
          'repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 14px)',
      };
      break;
    case 'stars':
      style = {
        backgroundImage:
          'radial-gradient(circle at 12% 22%, rgba(255,255,255,0.9) 0 1px, transparent 1.4px), radial-gradient(circle at 70% 18%, rgba(255,255,255,0.65) 0 1px, transparent 1.3px), radial-gradient(circle at 42% 76%, rgba(255,255,255,0.75) 0 1px, transparent 1.4px)',
        backgroundSize: '82px 82px, 118px 118px, 96px 96px',
      };
      break;
    case 'waves':
      style = {
        backgroundImage:
          'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12), transparent 38%), repeating-radial-gradient(ellipse at center, transparent 0 16px, rgba(255,255,255,0.06) 17px 19px)',
      };
      break;
    case 'rings':
      style = {
        backgroundImage:
          'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.12) 0 2px, transparent 2px 34px)',
      };
      break;
    case 'none':
    default:
      style = {};
  }

  textureStyleCache.set(texture, style);
  return style;
};

export const downloadDataUrl = (filename: string, href: string) => {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  anchor.click();
};

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Nao foi possivel ler o arquivo.'));
    reader.readAsDataURL(file);
  });

const readBlobAsDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Nao foi possivel ler o arquivo.'));
    reader.readAsDataURL(blob);
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });

interface OptimizedImageReadResult {
  src: string;
  optimized: boolean;
  originalBytes: number;
  storedBytes: number;
  outputType: string;
  width?: number;
  height?: number;
}

export async function readImageFileAsOptimizedDataUrl(
  file: File,
  options: { maxDimension?: number; quality?: number; minBytes?: number } = {},
) {
  return (await readImageFileAsOptimizedDataUrlWithMeta(file, options)).src;
}

export async function readImageFileAsOptimizedDataUrlWithMeta(
  file: File,
  options: { maxDimension?: number; quality?: number; minBytes?: number } = {},
): Promise<OptimizedImageReadResult> {
  if (!file.type.startsWith('image/') || /svg|gif/i.test(file.type)) {
    return {
      src: await readFileAsDataUrl(file),
      optimized: false,
      originalBytes: file.size,
      storedBytes: file.size,
      outputType: file.type,
    };
  }

  const minBytes = options.minBytes ?? 220 * 1024;
  if (file.size < minBytes) {
    return {
      src: await readFileAsDataUrl(file),
      optimized: false,
      originalBytes: file.size,
      storedBytes: file.size,
      outputType: file.type,
    };
  }

  try {
    const bitmap = await createImageBitmap(file);
    const sourceWidth = bitmap.width;
    const sourceHeight = bitmap.height;
    const maxDimension = options.maxDimension ?? 1600;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      bitmap.close();
      return {
        src: await readFileAsDataUrl(file),
        optimized: false,
        originalBytes: file.size,
        storedBytes: file.size,
        outputType: file.type,
        width: sourceWidth,
        height: sourceHeight,
      };
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const optimized = await canvasToBlob(canvas, 'image/webp', options.quality ?? 0.84);
    if (!optimized || optimized.size >= file.size * 0.96) {
      return {
        src: await readFileAsDataUrl(file),
        optimized: false,
        originalBytes: file.size,
        storedBytes: file.size,
        outputType: file.type,
        width: sourceWidth,
        height: sourceHeight,
      };
    }
    return {
      src: await readBlobAsDataUrl(optimized),
      optimized: true,
      originalBytes: file.size,
      storedBytes: optimized.size,
      outputType: 'image/webp',
      width,
      height,
    };
  } catch {
    return {
      src: await readFileAsDataUrl(file),
      optimized: false,
      originalBytes: file.size,
      storedBytes: file.size,
      outputType: file.type,
    };
  }
}

export const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Nao foi possivel ler o arquivo.'));
    reader.readAsText(file);
  });

export const inferFontFamily = (fileName: string) =>
  fileName
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const registerFontAsset = async (font: Pick<FontAsset, 'family' | 'src'>) => {
  const fontFace = new FontFace(font.family, `url(${font.src})`);
  await fontFace.load();
  document.fonts.add(fontFace);
};

export const serializeProject = (
  cards: CardDocument[],
  graphics: GraphicAsset[],
  fonts: FontAsset[],
  meta?: Partial<Pick<ProjectSnapshot, 'id' | 'name' | 'description' | 'templates'>>,
): ProjectSnapshot => ({
  version: 1,
  ...meta,
  cards,
  graphics,
  fonts,
});

export const isProjectSnapshot = (value: unknown): value is ProjectSnapshot => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ProjectSnapshot>;
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.cards) &&
    Array.isArray(candidate.graphics) &&
    Array.isArray(candidate.fonts)
  );
};

export const detectPresetId = (width: number, height: number) =>
  CARD_PRESETS.find((preset) => preset.width === width && preset.height === height)?.id ?? 'custom';

export const clampCardDimension = (value: number) => clamp(Math.round(value), 240, 2000);


