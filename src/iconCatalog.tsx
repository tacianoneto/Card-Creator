import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Castle,
  CircleDollarSign,
  Coins,
  Compass,
  Crosshair,
  Crown,
  Dices,
  Droplets,
  Eye,
  Feather,
  Flame,
  Gem,
  Heart,
  Leaf,
  MoonStar,
  PawPrint,
  ScrollText,
  Shield,
  ShieldPlus,
  Skull,
  Sparkles,
  Star,
  SunMedium,
  Sword,
  Swords,
  Target,
  Trophy,
  WandSparkles,
  Zap,
} from 'lucide-react';

export type BuiltInIconName =
  | 'sparkles'
  | 'shield'
  | 'flame'
  | 'skull'
  | 'zap'
  | 'crown'
  | 'gem'
  | 'leaf'
  | 'droplets'
  | 'sun'
  | 'moon'
  | 'star'
  | 'scroll'
  | 'compass'
  | 'sword'
  | 'swords'
  | 'heart'
  | 'target'
  | 'eye'
  | 'dice'
  | 'coins'
  | 'wand'
  | 'paw'
  | 'book'
  | 'feather'
  | 'castle'
  | 'bounty'
  | 'shieldPlus'
  | 'trophy'
  | 'crosshair';

export interface IconCatalogItem {
  name: BuiltInIconName;
  label: string;
  icon: LucideIcon;
}

export const ICON_CATALOG: IconCatalogItem[] = [
  { name: 'sparkles', label: 'Magico', icon: Sparkles },
  { name: 'shield', label: 'Defesa', icon: Shield },
  { name: 'flame', label: 'Fogo', icon: Flame },
  { name: 'skull', label: 'Risco', icon: Skull },
  { name: 'zap', label: 'Energia', icon: Zap },
  { name: 'crown', label: 'Raro', icon: Crown },
  { name: 'gem', label: 'Tesouro', icon: Gem },
  { name: 'leaf', label: 'Natureza', icon: Leaf },
  { name: 'droplets', label: 'Agua', icon: Droplets },
  { name: 'sun', label: 'Luz', icon: SunMedium },
  { name: 'moon', label: 'Sombrio', icon: MoonStar },
  { name: 'star', label: 'Estrela', icon: Star },
  { name: 'scroll', label: 'Pergaminho', icon: ScrollText },
  { name: 'compass', label: 'Exploracao', icon: Compass },
  { name: 'sword', label: 'Espada', icon: Sword },
  { name: 'swords', label: 'Combate', icon: Swords },
  { name: 'heart', label: 'Vida', icon: Heart },
  { name: 'target', label: 'Alvo', icon: Target },
  { name: 'eye', label: 'Visao', icon: Eye },
  { name: 'dice', label: 'Dados', icon: Dices },
  { name: 'coins', label: 'Moedas', icon: Coins },
  { name: 'wand', label: 'Varinha', icon: WandSparkles },
  { name: 'paw', label: 'Fera', icon: PawPrint },
  { name: 'book', label: 'Livro', icon: BookOpen },
  { name: 'feather', label: 'Pena', icon: Feather },
  { name: 'castle', label: 'Fortaleza', icon: Castle },
  { name: 'bounty', label: 'Recurso', icon: CircleDollarSign },
  { name: 'shieldPlus', label: 'Protecao', icon: ShieldPlus },
  { name: 'trophy', label: 'Vitoria', icon: Trophy },
  { name: 'crosshair', label: 'Precisao', icon: Crosshair },
];

export const ICON_MAP = Object.fromEntries(
  ICON_CATALOG.map((item) => [item.name, item.icon]),
) as Record<BuiltInIconName, LucideIcon>;
