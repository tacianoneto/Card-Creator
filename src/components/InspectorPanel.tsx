import { useMemo, type ReactNode } from 'react';

import { Layers2 } from 'lucide-react';

import { ICON_CATALOG } from '../iconCatalog';
import {
  applyVariantDefaults,
  BAR_VARIANTS,
  CARD_PRESETS,
  clampCardDimension,
  COUNTER_VARIANTS,
  detectPresetId,
  DIE_SIDES,
  DIE_VARIANTS,
  FRAME_VARIANTS,
  INFO_VARIANTS,
  ICON_VARIANTS,
  MARKER_VARIANTS,
  NUMBER_VARIANTS,
  PORTRAIT_VARIANTS,
  SEAL_VARIANTS,
  SEPARATOR_VARIANTS,
  TITLE_VARIANTS,
} from '../lib/editor';
import {
  DYNAMIC_KIND_LABELS,
  getDynamicFields,
  type DynamicField,
} from '../lib/dynamicFields';
import type {
  BarVariant,
  CardBackground,
  CardDocument,
  CardElement,
  CardElementPatch,
  EditorMode,
  ElementBindingKind,
  CounterVariant,
  DieDisplayMode,
  DieSides,
  DieVariant,
  FrameVariant,
  GraphicAsset,
  IconVariant,
  ImageMaskShape,
  InfoVariant,
  MarkerVariant,
  NumberVariant,
  PortraitVariant,
  SealVariant,
  SeparatorVariant,
  ShapeKind,
  TexturePattern,
  TitleVariant,
} from '../types';

const TEXT_WEIGHT_OPTIONS = [
  { value: 100, label: 'Thin' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Reg' },
  { value: 500, label: 'Med' },
  { value: 600, label: 'Semi' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra' },
  { value: 900, label: 'Black' },
] as const;

interface InspectorPanelProps {
  card: CardDocument;
  selectedElement: CardElement | null;
  selectedElements: CardElement[];
  graphics: GraphicAsset[];
  fontOptions: string[];
  onLoadSystemFonts?: () => void;
  onUpdateCard: (patch: Partial<CardDocument>) => void;
  onUpdateBackground: (patch: Partial<CardBackground>) => void;
  onUpdateElement: (elementId: string, patch: CardElementPatch) => void;
  dataEditMode?: boolean;
  onUpdateDynamicField?: (key: string, value: string) => void;
  onExitDataEditMode?: () => void;
  mode?: EditorMode;
}

export function InspectorPanel({
  card,
  selectedElement,
  selectedElements,
  graphics,
  fontOptions,
  onLoadSystemFonts,
  onUpdateCard,
  onUpdateBackground,
  onUpdateElement,
  dataEditMode = false,
  onUpdateDynamicField,
  onExitDataEditMode,
  mode = 'manual',
}: InspectorPanelProps) {
  const presetId = detectPresetId(card.width, card.height);
  const hasSelection = selectedElements.length > 0;
  const isTemplateMode = mode === 'template';
  const dynamicFields = useMemo(() => getDynamicFields(card), [card]);

  if (dataEditMode) {
    return (
      <aside className="inspector inspector--data">
        <div className="inspector__header">
          <div>
            <span className="eyebrow">Dados da carta</span>
            <h2>{card.name}</h2>
          </div>
          {onExitDataEditMode ? (
            <button
              type="button"
              className="inspector__header-action"
              onClick={onExitDataEditMode}
            >
              Layout
            </button>
          ) : (
            <span className="inspector__badge">
              <Layers2 size={12} />
              dados
            </span>
          )}
        </div>

        <DataFieldsSection
          fields={dynamicFields}
          graphics={graphics}
          onUpdate={onUpdateDynamicField}
        />
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <div className="inspector__header">
        <div>
          <span className="eyebrow">
            {selectedElement ? 'Elemento' : hasSelection ? 'Seleção' : 'Carta'}
          </span>
          <h2>{selectedElement ? selectedElement.name : hasSelection ? `${selectedElements.length} elementos` : card.name}</h2>
        </div>
        <span className="inspector__badge">
          <Layers2 size={12} />
          {selectedElement ? selectedElement.type : hasSelection ? 'multi' : 'card'}
        </span>
      </div>

      {!selectedElement && !hasSelection ? (
        <>
          <Section title="Documento">
            <Field label="Nome">
              <input
                value={card.name}
                onChange={(e) => onUpdateCard({ name: e.target.value })}
              />
            </Field>
            <Field label="Formato">
              <select
                value={presetId}
                onChange={(e) => {
                  const preset = CARD_PRESETS.find((p) => p.id === e.target.value);
                  if (preset) onUpdateCard({ width: preset.width, height: preset.height });
                }}
              >
                {CARD_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
                <option value="custom">Personalizado</option>
              </select>
            </Field>
            <div className="inspector__grid inspector__grid--two">
              <Field label="Largura">
                <input
                  type="number"
                  value={card.width}
                  min={240}
                  max={2000}
                  onChange={(e) => onUpdateCard({ width: clampCardDimension(Number(e.target.value)) })}
                />
              </Field>
              <Field label="Altura">
                <input
                  type="number"
                  value={card.height}
                  min={240}
                  max={2000}
                  onChange={(e) => onUpdateCard({ height: clampCardDimension(Number(e.target.value)) })}
                />
              </Field>
            </div>
          </Section>

          <Section title="Fundo">
            <div className="inspector__grid inspector__grid--two">
              <Field label="Cor principal">
                <input
                  type="color"
                  value={card.background.primaryColor}
                  onChange={(e) => onUpdateBackground({ primaryColor: e.target.value })}
                />
              </Field>
              <Field label="Cor secundária">
                <input
                  type="color"
                  value={card.background.secondaryColor}
                  onChange={(e) => onUpdateBackground({ secondaryColor: e.target.value })}
                />
              </Field>
            </div>

            <RangeField
              label="Ângulo do degradê"
              value={card.background.gradientAngle}
              min={0} max={360} step={1}
              onChange={(v) => onUpdateBackground({ gradientAngle: v })}
            />

            <Field label="Textura">
              <select
                value={card.background.texture}
                onChange={(e) => onUpdateBackground({ texture: e.target.value as TexturePattern })}
              >
                <option value="burst">Brilho atmosférico</option>
                <option value="grid">Grade</option>
                <option value="dots">Pontilhado</option>
                <option value="paper">Papel</option>
                <option value="linen">Linho</option>
                <option value="diagonal">Diagonal</option>
                <option value="stars">Estrelas</option>
                <option value="waves">Ondas</option>
                <option value="rings">Aneis</option>
                <option value="none">Sem textura</option>
              </select>
            </Field>

            <Field label="Imagem de fundo">
              <select
                value={card.background.imageSrc ?? ''}
                onChange={(e) => onUpdateBackground({ imageSrc: e.target.value || undefined })}
              >
                <option value="">Nenhuma</option>
                {graphics.map((a) => (
                  <option key={a.id} value={a.src}>{a.name}</option>
                ))}
              </select>
            </Field>

            {card.background.imageSrc ? (
              <>
                <RangeField
                  label="Opacidade da imagem"
                  value={card.background.imageOpacity}
                  min={0} max={1} step={0.01}
                  onChange={(v) => onUpdateBackground({ imageOpacity: v })}
                />
                <Field label="Ajuste">
                  <select
                    value={card.background.imageFit}
                    onChange={(e) => onUpdateBackground({ imageFit: e.target.value as 'cover' | 'contain' })}
                  >
                    <option value="cover">Preencher</option>
                    <option value="contain">Conter</option>
                  </select>
                </Field>
              </>
            ) : null}
          </Section>
        </>
      ) : selectedElement ? (
        <>
          <Section title="Geral">
            <Field label="Nome interno">
              <input
                value={selectedElement.name}
                onChange={(e) => onUpdateElement(selectedElement.id, { name: e.target.value })}
              />
            </Field>

            <div className="inspector__grid inspector__grid--two">
              <Field label="X">
                <input type="number" value={selectedElement.x}
                  onChange={(e) => onUpdateElement(selectedElement.id, { x: Number(e.target.value) })} />
              </Field>
              <Field label="Y">
                <input type="number" value={selectedElement.y}
                  onChange={(e) => onUpdateElement(selectedElement.id, { y: Number(e.target.value) })} />
              </Field>
            </div>

            <div className="inspector__grid inspector__grid--two">
              <Field label="Largura">
                <input type="number" min={24} value={selectedElement.width}
                  onChange={(e) => onUpdateElement(selectedElement.id, { width: Math.max(24, Number(e.target.value)) })} />
              </Field>
              <Field label="Altura">
                <input type="number" min={24} value={selectedElement.height}
                  onChange={(e) => onUpdateElement(selectedElement.id, { height: Math.max(24, Number(e.target.value)) })} />
              </Field>
            </div>

            <RangeField label="Rotação"
              value={selectedElement.rotation} min={-180} max={180} step={1}
              onChange={(v) => onUpdateElement(selectedElement.id, { rotation: v })} />

            <RangeField label="Opacidade"
              value={selectedElement.opacity} min={0.05} max={1} step={0.01}
              onChange={(v) => onUpdateElement(selectedElement.id, { opacity: v })} />
          </Section>

          {isTemplateMode && (
            <BindingSection
              element={selectedElement}
              onUpdate={(patch) => onUpdateElement(selectedElement.id, patch)}
            />
          )}

          {renderElementControls({
            element: selectedElement,
            graphics,
            fontOptions,
            onLoadSystemFonts,
            onUpdate: (patch) => onUpdateElement(selectedElement.id, patch),
          })}
        </>
      ) : null}

      {!selectedElement && hasSelection ? (
        <>
          <Section title="Seleção múltipla">
            <p className="inspector__hint">
              {selectedElements.length} elementos selecionados. O alinhamento usa o grupo como
              referência; com apenas um elemento, usa a página da carta.
            </p>
          </Section>
        </>
      ) : null}
    </aside>
  );
}

function renderElementControls({
  element,
  graphics,
  fontOptions,
  onLoadSystemFonts,
  onUpdate,
}: {
  element: CardElement;
  graphics: GraphicAsset[];
  fontOptions: string[];
  onLoadSystemFonts?: () => void;
  onUpdate: (patch: CardElementPatch) => void;
}) {
  const iconAssets = graphics.filter((asset) => asset.kind === 'icon');

  switch (element.type) {
    case 'portrait':
      return (
        <Section title="Retrato">
          <Field label="Forma">
            <select
              value={element.variant ?? 'plain'}
              onChange={(e) =>
                onUpdate(applyVariantDefaults({ ...element, variant: e.target.value as PortraitVariant }) as CardElementPatch)
              }
            >
              {PORTRAIT_VARIANTS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Imagem">
            <select value={element.src}
              onChange={(e) => onUpdate({ src: e.target.value })}>
              <option value="">— Placeholder —</option>
              {graphics.map((a) => <option key={a.id} value={a.src}>{a.name}</option>)}
            </select>
          </Field>
          {element.src ? (
            <>
              <div className="inspector__sub-label">Ponto focal</div>
              <div className="inspector__grid inspector__grid--two">
                <RangeField label="Focal X" value={element.focalX} min={0} max={100} step={1}
                  onChange={(v) => onUpdate({ focalX: v })} />
                <RangeField label="Focal Y" value={element.focalY} min={0} max={100} step={1}
                  onChange={(v) => onUpdate({ focalY: v })} />
              </div>
            </>
          ) : null}
          <div className="inspector__divider" />
          <div className="inspector__grid inspector__grid--two">
            <Field label="Borda">
              <input type="color" value={toHexColor(element.strokeColor)}
                onChange={(e) => onUpdate({ strokeColor: e.target.value })} />
            </Field>
            <Field label="Espessura">
              <input type="number" min={0} max={20} value={element.strokeWidth}
                onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Cor de destaque">
            <input type="color" value={toHexColor(element.accentColor)}
              onChange={(e) => onUpdate({ accentColor: e.target.value })} />
          </Field>
          <RangeField label="Sombra" value={element.shadow} min={0} max={48} step={1}
            onChange={(v) => onUpdate({ shadow: v })} />
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'text':
      return (
        <Section title="Texto">
          <Field label="Conteúdo">
            <textarea value={element.content} onChange={(e) => onUpdate({ content: e.target.value })} />
          </Field>
          <Field label="Fonte">
            <select value={element.fontFamily} onChange={(e) => onUpdate({ fontFamily: e.target.value })}>
              {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            {onLoadSystemFonts ? (
              <button
                type="button"
                className="inspector__mini-action"
                onClick={onLoadSystemFonts}
              >
                Buscar fontes locais
              </button>
            ) : null}
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Cor">
              <input type="color" value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} />
            </Field>
            <Field label="Tamanho">
              <input type="number" min={8} max={240} value={element.fontSize} disabled={element.autoFitFont}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Auto-fit">
            <select value={element.autoFitFont ? 'on' : 'off'}
              onChange={(e) => onUpdate({ autoFitFont: e.target.value === 'on' })}>
              <option value="off">Manual (tamanho fixo)</option>
              <option value="on">Auto-fit (ajusta ao contêiner)</option>
            </select>
          </Field>
          <Field label="Estilo">
            <div className="inspector__btn-row">
              {TEXT_WEIGHT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`inspector__style-btn${element.fontWeight === value ? ' inspector__style-btn--active' : ''}`}
                  style={{ fontWeight: value }}
                  onClick={() => onUpdate({ fontWeight: value })}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className={`inspector__style-btn${(element.fontStyle ?? 'normal') === 'italic' ? ' inspector__style-btn--active' : ''}`}
                style={{ fontStyle: 'italic' }}
                onClick={() => onUpdate({ fontStyle: (element.fontStyle ?? 'normal') === 'italic' ? 'normal' : 'italic' })}
              >I</button>
              <button
                type="button"
                className={`inspector__style-btn${(element.textDecoration ?? 'none') === 'underline' ? ' inspector__style-btn--active' : ''}`}
                style={{ textDecoration: 'underline' }}
                onClick={() => onUpdate({ textDecoration: (element.textDecoration ?? 'none') === 'underline' ? 'none' : 'underline' })}
              >U</button>
              <button
                type="button"
                className={`inspector__style-btn${(element.textDecoration ?? 'none') === 'line-through' ? ' inspector__style-btn--active' : ''}`}
                style={{ textDecoration: 'line-through' }}
                onClick={() => onUpdate({ textDecoration: (element.textDecoration ?? 'none') === 'line-through' ? 'none' : 'line-through' })}
              >S</button>
            </div>
          </Field>
          <Field label="Alinhamento">
            <select value={element.align} onChange={(e) => onUpdate({ align: e.target.value as 'left' | 'center' | 'right' })}>
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Entrelinhas">
              <input type="number" min={0.7} max={2} step={0.05} value={element.lineHeight}
                onChange={(e) => onUpdate({ lineHeight: Number(e.target.value) })} />
            </Field>
            <Field label="Espaçamento">
              <input type="number" min={-4} max={16} step={0.2} value={element.letterSpacing}
                onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Transformação">
            <select value={element.textTransform}
              onChange={(e) => onUpdate({ textTransform: e.target.value as 'none' | 'uppercase' | 'capitalize' })}>
              <option value="none">Normal</option>
              <option value="uppercase">Maiúsculas</option>
              <option value="capitalize">Capitalizar</option>
            </select>
          </Field>
          <RangeField label="Curvar texto" value={element.textCurve ?? 0} min={-180} max={180} step={1}
            onChange={(v) => onUpdate({ textCurve: v })} />
          <div className="inspector__divider" />
          <p className="inspector__sub-label">Contorno</p>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Contorno">
              <select
                value={element.textStrokeEnabled ? 'on' : 'off'}
                onChange={(e) => onUpdate({ textStrokeEnabled: e.target.value === 'on' })}
              >
                <option value="off">Desativado</option>
                <option value="on">Ativo</option>
              </select>
            </Field>
            {element.textStrokeEnabled ? (
              <Field label="Cor">
                <input
                  type="color"
                  value={element.textStrokeColor ?? '#111111'}
                  onChange={(e) => onUpdate({ textStrokeColor: e.target.value })}
                />
              </Field>
            ) : null}
          </div>
          {element.textStrokeEnabled ? (
            <RangeField
              label="Espessura"
              value={element.textStrokeWidth ?? 2}
              min={0}
              max={16}
              step={0.5}
              onChange={(v) => onUpdate({ textStrokeWidth: v })}
            />
          ) : null}
          <div className="inspector__divider" />
          <p className="inspector__sub-label">Sombra</p>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Sombra">
              <select
                value={element.shadowEnabled ? 'on' : 'off'}
                onChange={(e) => onUpdate({ shadowEnabled: e.target.value === 'on' })}
              >
                <option value="off">Desativada</option>
                <option value="on">Ativa</option>
              </select>
            </Field>
            {element.shadowEnabled ? (
              <Field label="Cor">
                <input type="color"
                  value={element.shadowColor ?? '#000000'}
                  onChange={(e) => onUpdate({ shadowColor: e.target.value })} />
              </Field>
            ) : null}
          </div>
          {element.shadowEnabled ? (
            <>
              <div className="inspector__grid inspector__grid--two">
                <Field label="Offset X">
                  <input type="number" min={-40} max={40} value={element.shadowOffsetX ?? 2}
                    onChange={(e) => onUpdate({ shadowOffsetX: Number(e.target.value) })} />
                </Field>
                <Field label="Offset Y">
                  <input type="number" min={-40} max={40} value={element.shadowOffsetY ?? 2}
                    onChange={(e) => onUpdate({ shadowOffsetY: Number(e.target.value) })} />
                </Field>
              </div>
              <RangeField label="Blur" value={element.shadowBlur ?? 8} min={0} max={60} step={1}
                onChange={(v) => onUpdate({ shadowBlur: v })} />
            </>
          ) : null}
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'image': {
      const masks: { value: ImageMaskShape; label: string }[] = [
        { value: 'none',    label: 'Livre' },
        { value: 'circle',  label: 'Círculo' },
        { value: 'hexagon', label: 'Hex' },
        { value: 'shield',  label: 'Escudo' },
        { value: 'diamond', label: 'Losango' },
        { value: 'star',    label: 'Estrela' },
        { value: 'arch',    label: 'Arco' },
      ];
      const activeMask = element.maskShape ?? 'none';
      return (
        <Section title="Imagem">
          <Field label="Asset">
            <select value={element.src} onChange={(e) => onUpdate({ src: e.target.value })}>
              <option value="">Sem imagem</option>
              {graphics.map((a) => <option key={a.id} value={a.src}>{a.name}</option>)}
            </select>
          </Field>
          <Field label="Ajuste">
            <select value={element.fit} onChange={(e) => onUpdate({ fit: e.target.value as 'cover' | 'contain' })}>
              <option value="cover">Preencher</option>
              <option value="contain">Conter</option>
            </select>
          </Field>
          <Field label="Máscara">
            <div className="inspector__btn-row">
              {masks.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`inspector__style-btn${activeMask === value ? ' inspector__style-btn--active' : ''}`}
                  onClick={() => onUpdate({ maskShape: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          {activeMask === 'none' ? (
            <Field label="Raio">
              <input type="number" min={0} max={120} value={element.borderRadius}
                onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })} />
            </Field>
          ) : null}
          <div className="inspector__grid inspector__grid--two">
            <Field label="Borda">
              <input type="color" value={toHexColor(element.strokeColor)}
                onChange={(e) => onUpdate({ strokeColor: e.target.value })} />
            </Field>
            <Field label="Espessura">
              <input type="number" min={0} max={24} value={element.strokeWidth}
                onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })} />
            </Field>
          </div>
          <RangeField label="Sombra" value={element.shadow} min={0} max={48} step={1}
            onChange={(v) => onUpdate({ shadow: v })} />
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );
    }

    case 'icon':
      return (
        <Section title="Ícone">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'plain'}
              onChange={(e) =>
                onUpdate(
                  applyVariantDefaults({
                    ...element,
                    variant: e.target.value as IconVariant,
                  }) as CardElementPatch,
                )
              }
            >
              {ICON_VARIANTS.map((variant) => (
                <option key={variant.value} value={variant.value}>
                  {variant.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Modelo">
            <select
              value={element.iconName}
              onChange={(e) => {
                const value = e.target.value;
                const asset = value.startsWith('asset:')
                  ? iconAssets.find((item) => item.id === value.slice(6))
                  : undefined;
                onUpdate({ iconName: value, customSrc: asset?.src });
              }}
            >
              {ICON_CATALOG.map((ic) => <option key={ic.name} value={ic.name}>{ic.label}</option>)}
              {iconAssets.length > 0 ? (
                <optgroup label="Assets">
                  {iconAssets.map((asset) => (
                    <option key={asset.id} value={`asset:${asset.id}`}>{asset.name}</option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Traço">
              <input type="color" value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} />
            </Field>
            <Field label="Preenchimento">
              <input type="color"
                value={element.fillColor === 'transparent' ? '#ffffff' : element.fillColor}
                onChange={(e) => onUpdate({ fillColor: e.target.value })} />
            </Field>
          </div>
          <Field label="Espessura do traço">
            <input type="number" min={0.8} max={4} step={0.1} value={element.strokeWidth}
              onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })} />
          </Field>
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'shape':
      return (
        <Section title="Forma">
          <Field label="Modelo">
            <select value={element.shape} onChange={(e) => onUpdate({ shape: e.target.value as ShapeKind })}>
              <option value="rectangle">Retângulo</option>
              <option value="circle">Círculo</option>
              <option value="capsule">Cápsula</option>
              <option value="triangle">Triângulo</option>
              <option value="diamond">Losango</option>
              <option value="hexagon">Hexágono</option>
              <option value="octagon">Octógono</option>
              <option value="parallelogram">Paralelogramo</option>
              <option value="cross">Cruz</option>
              <option value="arrow">Seta</option>
              <option value="banner">Bandeira</option>
              <option value="chevron">Chevron</option>
              <option value="starburst">Explosão</option>
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Preenchimento">
              <input type="color" value={toHexColor(element.fill)}
                onChange={(e) => onUpdate({ fill: e.target.value })} />
            </Field>
            <Field label="Borda">
              <input type="color" value={toHexColor(element.strokeColor)}
                onChange={(e) => onUpdate({ strokeColor: e.target.value })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Espessura">
              <input type="number" min={0} max={24} value={element.strokeWidth}
                onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })} />
            </Field>
            <Field label="Raio">
              <input type="number" min={0} max={120} value={element.radius}
                onChange={(e) => onUpdate({ radius: Number(e.target.value) })} />
            </Field>
          </div>
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'frame':
      return (
        <Section title="Moldura">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'ornate'}
              onChange={(e) =>
                onUpdate(
                  applyVariantDefaults({
                    ...element,
                    variant: e.target.value as FrameVariant,
                  }) as CardElementPatch,
                )
              }
            >
              {FRAME_VARIANTS.map((variant) => (
                <option key={variant.value} value={variant.value}>
                  {variant.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Traço">
              <input type="color" value={toHexColor(element.strokeColor)}
                onChange={(e) => onUpdate({ strokeColor: e.target.value })} />
            </Field>
            <Field label="Canto">
              <input type="color" value={toHexColor(element.accentColor)}
                onChange={(e) => onUpdate({ accentColor: e.target.value })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Espessura">
              <input type="number" min={1} max={24} value={element.strokeWidth}
                onChange={(e) => onUpdate({ strokeWidth: Number(e.target.value) })} />
            </Field>
            <Field label="Inset">
              <input type="number" min={0} max={120} value={element.inset}
                onChange={(e) => onUpdate({ inset: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Raio">
              <input type="number" min={0} max={120} value={element.radius}
                onChange={(e) => onUpdate({ radius: Number(e.target.value) })} />
            </Field>
            <Field label="Cantos">
              <input type="number" min={0} max={160} value={element.cornerSize}
                onChange={(e) => onUpdate({ cornerSize: Number(e.target.value) })} />
            </Field>
          </div>
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'info':
      return (
        <Section title="Caixa de info">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'panel'}
              onChange={(e) =>
                onUpdate(
                  applyVariantDefaults({
                    ...element,
                    variant: e.target.value as InfoVariant,
                  }) as CardElementPatch,
                )
              }
            >
              {INFO_VARIANTS.map((variant) => (
                <option key={variant.value} value={variant.value}>
                  {variant.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Título">
            <input value={element.title} onChange={(e) => onUpdate({ title: e.target.value })} />
          </Field>
          <Field label="Texto">
            <textarea value={element.body} onChange={(e) => onUpdate({ body: e.target.value })} />
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Fundo">
              <input type="color" value={toHexColor(element.fill)}
                onChange={(e) => onUpdate({ fill: e.target.value })} />
            </Field>
            <Field label="Faixa">
              <input type="color" value={element.accentColor}
                onChange={(e) => onUpdate({ accentColor: e.target.value })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Cor título">
              <input type="color" value={element.titleColor}
                onChange={(e) => onUpdate({ titleColor: e.target.value })} />
            </Field>
            <Field label="Cor texto">
              <input type="color" value={element.bodyColor}
                onChange={(e) => onUpdate({ bodyColor: e.target.value })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Raio">
              <input type="number" min={0} max={80} value={element.radius}
                onChange={(e) => onUpdate({ radius: Number(e.target.value) })} />
            </Field>
            <Field label="Padding">
              <input type="number" min={0} max={80} value={element.padding}
                onChange={(e) => onUpdate({ padding: Number(e.target.value) })} />
            </Field>
          </div>

          {/* ── Tipografia do título ── */}
          <div className="inspector__divider" />
          <p className="inspector__sub-label">Título</p>
          <Field label="Fonte do título">
            <select
              value={element.titleFontFamily ?? 'Alegreya Sans SC'}
              onChange={(e) => onUpdate({ titleFontFamily: e.target.value })}
            >
              {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Tamanho">
              <input
                type="number" min={8} max={120}
                value={element.titleFontSize ?? 28}
                onChange={(e) => onUpdate({ titleFontSize: Number(e.target.value) })}
              />
            </Field>
            <Field label="Peso">
              <input
                type="number" min={100} max={900} step={100}
                value={element.titleFontWeight ?? 800}
                onChange={(e) => onUpdate({ titleFontWeight: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Alinhamento do título">
            <select
              value={element.titleAlign ?? 'left'}
              onChange={(e) => onUpdate({ titleAlign: e.target.value as 'left' | 'center' | 'right' })}
            >
              <option value="left">Esquerda</option>
              <option value="center">Centro</option>
              <option value="right">Direita</option>
            </select>
          </Field>

          {/* ── Tipografia do corpo ── */}
          <div className="inspector__divider" />
          <p className="inspector__sub-label">Corpo</p>
          <Field label="Fonte do corpo">
            <select
              value={element.bodyFontFamily ?? ''}
              onChange={(e) => onUpdate({ bodyFontFamily: e.target.value || undefined })}
            >
              <option value="">Padrão</option>
              {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Tamanho">
              <input
                type="number" min={8} max={120}
                value={element.bodyFontSize ?? 23}
                onChange={(e) => onUpdate({ bodyFontSize: Number(e.target.value) })}
              />
            </Field>
            <Field label="Alinhamento">
              <select
                value={element.bodyAlign ?? 'left'}
                onChange={(e) => onUpdate({ bodyAlign: e.target.value as 'left' | 'center' | 'right' })}
              >
                <option value="left">Esq.</option>
                <option value="center">Centro</option>
                <option value="right">Dir.</option>
              </select>
            </Field>
          </div>
          <RangeField
            label="Entrelinhas"
            value={element.bodyLineHeight ?? 1.4}
            min={0.9} max={2.5} step={0.05}
            onChange={(v) => onUpdate({ bodyLineHeight: v })}
          />
          <RangeField
            label="Espaçamento entre letras"
            value={element.bodyLetterSpacing ?? 0}
            min={-2} max={10} step={0.5}
            onChange={(v) => onUpdate({ bodyLetterSpacing: v })}
          />
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'number':
      return (
        <Section title="Número">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'badge'}
              onChange={(e) =>
                onUpdate(
                  applyVariantDefaults({
                    ...element,
                    variant: e.target.value as NumberVariant,
                  }) as CardElementPatch,
                )
              }
            >
              {NUMBER_VARIANTS.map((variant) => (
                <option key={variant.value} value={variant.value}>
                  {variant.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Conteúdo exibido">
            <select
              value={element.showLabel === false ? 'value' : 'value-label'}
              onChange={(e) => onUpdate({ showLabel: e.target.value === 'value-label' })}
            >
              <option value="value-label">Número e legenda</option>
              <option value="value">Somente número</option>
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Valor">
              <input value={element.value} onChange={(e) => onUpdate({ value: e.target.value })} />
            </Field>
            {element.showLabel === false ? null : (
              <Field label="Legenda">
                <input value={element.label} onChange={(e) => onUpdate({ label: e.target.value })} />
              </Field>
            )}
          </div>
          {element.variant === 'splitStat' ? (
            <>
              <div className="inspector__grid inspector__grid--two">
                <Field label="Lado esquerdo">
                  <input
                    type="color"
                    value={toHexColor(element.fill)}
                    onChange={(e) => onUpdate({ fill: e.target.value })}
                  />
                </Field>
                <Field label="Lado direito">
                  <input
                    type="color"
                    value={toHexColor(element.secondaryColor ?? '#0f172a')}
                    onChange={(e) => onUpdate({ secondaryColor: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Cor da fonte">
                <input
                  type="color"
                  value={toHexColor(element.color)}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                />
              </Field>
            </>
          ) : element.variant === 'laurel' ? (
            <>
              <div className="inspector__grid inspector__grid--two">
                <Field label="Fundo">
                  <input
                    type="color"
                    value={toHexColor(element.fill)}
                    onChange={(e) => onUpdate({ fill: e.target.value })}
                  />
                </Field>
                <Field label="Bordas">
                  <input
                    type="color"
                    value={toHexColor(element.accentColor ?? '#22c55e')}
                    onChange={(e) => onUpdate({ accentColor: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Cor da fonte">
                <input
                  type="color"
                  value={toHexColor(element.color)}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                />
              </Field>
            </>
          ) : (
            <div className="inspector__grid inspector__grid--two">
              <Field label="Fundo">
                <input type="color" value={toHexColor(element.fill)} onChange={(e) => onUpdate({ fill: e.target.value })} />
              </Field>
              <Field label="Cor">
                <input type="color" value={toHexColor(element.color)} onChange={(e) => onUpdate({ color: e.target.value })} />
              </Field>
            </div>
          )}
          <Field label="Tamanho">
            <input type="number" min={24} max={180} value={element.fontSize}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} />
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Fonte do valor">
              <select value={element.valueFontFamily ?? 'Bebas Neue'} onChange={(e) => onUpdate({ valueFontFamily: e.target.value })}>
                {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
              </select>
            </Field>
            <Field label="Fonte da legenda">
              <select value={element.labelFontFamily ?? 'Sora'} onChange={(e) => onUpdate({ labelFontFamily: e.target.value })}>
                {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
              </select>
            </Field>
          </div>
          {element.showLabel !== false ? (
            <div className="inspector__grid inspector__grid--two">
              <Field label="Tamanho legenda">
                <input type="number" min={8} max={80} value={element.labelFontSize ?? 18}
                  onChange={(e) => onUpdate({ labelFontSize: Number(e.target.value) })} />
              </Field>
              <Field label="Cor legenda">
                <input type="color" value={toHexColor(element.labelColor ?? element.color)}
                  onChange={(e) => onUpdate({ labelColor: e.target.value })} />
              </Field>
            </div>
          ) : null}
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'marker':
      return (
        <Section title="Marcador">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'pill'}
              onChange={(e) =>
                onUpdate(
                  applyVariantDefaults({
                    ...element,
                    variant: e.target.value as MarkerVariant,
                  }) as CardElementPatch,
                )
              }
            >
              {MARKER_VARIANTS.map((variant) => (
                <option key={variant.value} value={variant.value}>
                  {variant.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Símbolo">
              <input value={element.symbol} onChange={(e) => onUpdate({ symbol: e.target.value })} />
            </Field>
            <Field label="Legenda">
              <input value={element.label} onChange={(e) => onUpdate({ label: e.target.value })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Fundo">
              <input type="color" value={toHexColor(element.fill)}
                onChange={(e) => onUpdate({ fill: e.target.value })} />
            </Field>
            <Field label="Cor">
              <input type="color" value={element.color} onChange={(e) => onUpdate({ color: e.target.value })} />
            </Field>
          </div>
          <Field label="Tamanho">
            <input type="number" min={14} max={72} value={element.fontSize}
              onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} />
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Tam. simbolo">
              <input type="number" min={8} max={96} value={element.symbolFontSize ?? element.fontSize}
                onChange={(e) => onUpdate({ symbolFontSize: Number(e.target.value) })} />
            </Field>
            <Field label="Tam. legenda">
              <input type="number" min={8} max={96} value={element.labelFontSize ?? Math.round(element.fontSize * 0.8)}
                onChange={(e) => onUpdate({ labelFontSize: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Fonte simbolo">
              <select value={element.symbolFontFamily ?? 'Sora'} onChange={(e) => onUpdate({ symbolFontFamily: e.target.value })}>
                {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
              </select>
            </Field>
            <Field label="Fonte legenda">
              <select value={element.labelFontFamily ?? 'Sora'} onChange={(e) => onUpdate({ labelFontFamily: e.target.value })}>
                {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Cor da legenda">
            <input type="color" value={toHexColor(element.labelColor ?? element.color)}
              onChange={(e) => onUpdate({ labelColor: e.target.value })} />
          </Field>
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'bar':
      return (
        <Section title="Barra de progresso">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'standard'}
              onChange={(e) =>
                onUpdate(
                  applyVariantDefaults({
                    ...element,
                    variant: e.target.value as BarVariant,
                  }) as CardElementPatch,
                )
              }
            >
              {BAR_VARIANTS.map((variant) => (
                <option key={variant.value} value={variant.value}>
                  {variant.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Legenda">
            <input value={element.label} onChange={(e) => onUpdate({ label: e.target.value })} />
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Valor atual">
              <input
                type="number"
                min={0}
                max={element.maxValue}
                value={element.value}
                onChange={(e) => onUpdate({ value: Number(e.target.value) })}
              />
            </Field>
            <Field label="Valor máximo">
              <input
                type="number"
                min={1}
                max={100}
                value={element.maxValue}
                onChange={(e) => onUpdate({ maxValue: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Exibir valores">
            <select
              value={element.showValues ? 'yes' : 'no'}
              onChange={(e) => onUpdate({ showValues: e.target.value === 'yes' })}
            >
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Preenchimento">
              <input
                type="color"
                value={toHexColor(element.fill)}
                onChange={(e) => onUpdate({ fill: e.target.value })}
              />
            </Field>
            <Field label="Trilha">
              <input
                type="color"
                value={toHexColor(element.trackColor)}
                onChange={(e) => onUpdate({ trackColor: e.target.value })}
              />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Destaque">
              <input
                type="color"
                value={toHexColor(element.accentColor)}
                onChange={(e) => onUpdate({ accentColor: e.target.value })}
              />
            </Field>
            <Field label="Texto">
              <input
                type="color"
                value={toHexColor(element.color)}
                onChange={(e) => onUpdate({ color: e.target.value })}
              />
            </Field>
          </div>
          <RangeField
            label="Raio"
            value={element.radius}
            min={0}
            max={40}
            step={1}
            onChange={(v) => onUpdate({ radius: v })}
          />
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'counter':
      return (
        <Section title="Contador">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'circles'}
              onChange={(e) =>
                onUpdate(applyVariantDefaults({ ...element, variant: e.target.value as CounterVariant }) as CardElementPatch)
              }
            >
              {COUNTER_VARIANTS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Valor atual">
              <input type="number" min={0} max={element.maxValue} value={element.value}
                onChange={(e) => onUpdate({ value: Number(e.target.value) })} />
            </Field>
            <Field label="Máximo">
              <input type="number" min={1} max={30} value={element.maxValue}
                onChange={(e) => onUpdate({ maxValue: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Cor preenchida">
              <input type="color" value={toHexColor(element.fill)}
                onChange={(e) => onUpdate({ fill: e.target.value })} />
            </Field>
            <Field label="Cor vazia">
              <input type="color"
                value={toHexColor(element.emptyColor.startsWith('rgba') ? '#888888' : element.emptyColor)}
                onChange={(e) => onUpdate({ emptyColor: e.target.value })} />
            </Field>
          </div>
          <Field label="Brilho / borda">
            <input type="color" value={toHexColor(element.accentColor)}
              onChange={(e) => onUpdate({ accentColor: e.target.value })} />
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Tamanho da unidade">
              <input type="number" min={12} max={80} value={element.unitSize}
                onChange={(e) => onUpdate({ unitSize: Number(e.target.value) })} />
            </Field>
            <Field label="Espaçamento">
              <input type="number" min={0} max={24} value={element.gap}
                onChange={(e) => onUpdate({ gap: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Disposição">
            <select value={element.arrangement}
              onChange={(e) => onUpdate({ arrangement: e.target.value as 'row' | 'grid' })}>
              <option value="row">Fileira</option>
              <option value="grid">Grade</option>
            </select>
          </Field>
          {element.arrangement === 'grid' ? (
            <Field label="Colunas">
              <input type="number" min={1} max={10} value={element.columns}
                onChange={(e) => onUpdate({ columns: Number(e.target.value) })} />
            </Field>
          ) : null}
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'seal':
      return (
        <Section title="Selo">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'common'}
              onChange={(e) =>
                onUpdate(applyVariantDefaults({ ...element, variant: e.target.value as SealVariant }) as CardElementPatch)
              }
            >
              {SEAL_VARIANTS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="Texto / símbolo">
            <input value={element.label} onChange={(e) => onUpdate({ label: e.target.value })} />
          </Field>
          <Field label="Exibir texto">
            <select value={element.showLabel ? 'yes' : 'no'}
              onChange={(e) => onUpdate({ showLabel: e.target.value === 'yes' })}>
              <option value="yes">Sim</option>
              <option value="no">Não</option>
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Fundo">
              <input type="color" value={toHexColor(element.fill)}
                onChange={(e) => onUpdate({ fill: e.target.value })} />
            </Field>
            <Field label="Destaque">
              <input type="color" value={toHexColor(element.accentColor)}
                onChange={(e) => onUpdate({ accentColor: e.target.value })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Cor do texto">
              <input type="color" value={toHexColor(element.color)}
                onChange={(e) => onUpdate({ color: e.target.value })} />
            </Field>
            <Field label="Tamanho">
              <input type="number" min={10} max={80} value={element.fontSize}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Fonte do texto">
            <select value={element.fontFamily ?? 'Cinzel'} onChange={(e) => onUpdate({ fontFamily: e.target.value })}>
              {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
          </Field>
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'separator':
      return (
        <Section title="Separador">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'ornament'}
              onChange={(e) =>
                onUpdate(applyVariantDefaults({ ...element, variant: e.target.value as SeparatorVariant }) as CardElementPatch)
              }
            >
              {SEPARATOR_VARIANTS.map((variant) => (
                <option key={variant.value} value={variant.value}>{variant.label}</option>
              ))}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Linha">
              <input type="color" value={toHexColor(element.lineColor)}
                onChange={(e) => onUpdate({ lineColor: e.target.value })} />
            </Field>
            <Field label="Destaque">
              <input type="color" value={toHexColor(element.accentColor)}
                onChange={(e) => onUpdate({ accentColor: e.target.value })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Espessura">
              <input type="number" min={1} max={42} value={element.thickness}
                onChange={(e) => onUpdate({ thickness: Number(e.target.value) })} />
            </Field>
            <Field label="Ornamento">
              <input type="number" min={0} max={80} value={element.ornamentSize}
                onChange={(e) => onUpdate({ ornamentSize: Number(e.target.value) })} />
            </Field>
          </div>
          <RangeField label="Tracejado" value={element.dash} min={0} max={28} step={1}
            onChange={(v) => onUpdate({ dash: v })} />
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'die':
      return (
        <Section title="Dado">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'rounded'}
              onChange={(e) =>
                onUpdate(applyVariantDefaults({ ...element, variant: e.target.value as DieVariant }) as CardElementPatch)
              }
            >
              {DIE_VARIANTS.map((variant) => (
                <option key={variant.value} value={variant.value}>{variant.label}</option>
              ))}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Valor">
              <input value={element.value} onChange={(e) => onUpdate({ value: e.target.value })} />
            </Field>
            <Field label="Tipo">
              <select value={element.sides} onChange={(e) => onUpdate({ sides: Number(e.target.value) as DieSides })}>
                {DIE_SIDES.map((side) => (
                  <option key={side.value} value={side.value}>{side.label}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Exibicao">
            <select value={element.displayMode ?? 'number'} onChange={(e) => onUpdate({ displayMode: e.target.value as DieDisplayMode })}>
              <option value="number">Numero</option>
              <option value="pips">Pontos</option>
            </select>
          </Field>
          <Field label="Mostrar tipo">
            <select value={element.showSides ? 'yes' : 'no'} onChange={(e) => onUpdate({ showSides: e.target.value === 'yes' })}>
              <option value="yes">Sim</option>
              <option value="no">Nao</option>
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Fundo">
              <input type="color" value={toHexColor(element.fill)}
                onChange={(e) => onUpdate({ fill: e.target.value })} />
            </Field>
            <Field label="Borda">
              <input type="color" value={toHexColor(element.accentColor)}
                onChange={(e) => onUpdate({ accentColor: e.target.value })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Texto">
              <input type="color" value={toHexColor(element.color)}
                onChange={(e) => onUpdate({ color: e.target.value })} />
            </Field>
            <Field label="Tamanho">
              <input type="number" min={10} max={140} value={element.fontSize}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Fonte">
            <select value={element.fontFamily} onChange={(e) => onUpdate({ fontFamily: e.target.value })}>
              {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
          </Field>
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    case 'title':
      return (
        <Section title="Título da carta">
          <Field label="Estilo">
            <select
              value={element.variant ?? 'nameplate'}
              onChange={(e) =>
                onUpdate(
                  applyVariantDefaults({
                    ...element,
                    variant: e.target.value as TitleVariant,
                  }) as CardElementPatch,
                )
              }
            >
              {TITLE_VARIANTS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Título">
            <input value={element.text} onChange={(e) => onUpdate({ text: e.target.value })} />
          </Field>
          <Field label="Subtítulo / tipo">
            <input value={element.subtitle} onChange={(e) => onUpdate({ subtitle: e.target.value })} />
          </Field>
          <Field label="Fonte">
            <select value={element.fontFamily} onChange={(e) => onUpdate({ fontFamily: e.target.value })}>
              {fontOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Cor do texto">
              <input type="color" value={toHexColor(element.color)}
                onChange={(e) => onUpdate({ color: e.target.value })} />
            </Field>
            <Field label="Destaque / ornamento">
              <input type="color" value={toHexColor(element.accentColor)}
                onChange={(e) => onUpdate({ accentColor: e.target.value })} />
            </Field>
          </div>
          <Field label="Fundo">
            <input
              type="color"
              value={toHexColor(element.fill === 'transparent' ? '#000000' : element.fill)}
              onChange={(e) => onUpdate({ fill: e.target.value })}
            />
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Tamanho">
              <input type="number" min={12} max={120} value={element.fontSize}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })} />
            </Field>
            <Field label="Peso">
              <input type="number" min={100} max={900} step={100} value={element.fontWeight}
                onChange={(e) => onUpdate({ fontWeight: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Alinhamento">
              <select value={element.align}
                onChange={(e) => onUpdate({ align: e.target.value as 'left' | 'center' | 'right' })}>
                <option value="left">Esq.</option>
                <option value="center">Centro</option>
                <option value="right">Dir.</option>
              </select>
            </Field>
            <Field label="Espaçamento">
              <input type="number" min={-4} max={24} step={0.5} value={element.letterSpacing}
                onChange={(e) => onUpdate({ letterSpacing: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Transformação">
            <select value={element.textTransform}
              onChange={(e) => onUpdate({ textTransform: e.target.value as 'none' | 'uppercase' | 'capitalize' })}>
              <option value="none">Normal</option>
              <option value="uppercase">Maiúsculas</option>
              <option value="capitalize">Capitalizar</option>
            </select>
          </Field>          <div className="inspector__divider" />
          <div className="inspector__grid inspector__grid--two">
            <Field label="Tam. subtitulo">
              <input type="number" min={8} max={80} value={element.subtitleFontSize ?? 13}
                onChange={(e) => onUpdate({ subtitleFontSize: Number(e.target.value) })} />
            </Field>
            <Field label="Peso subtitulo">
              <input type="number" min={100} max={900} step={100} value={element.subtitleFontWeight ?? 400}
                onChange={(e) => onUpdate({ subtitleFontWeight: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Fonte subtitulo">
            <select value={element.subtitleFontFamily ?? element.fontFamily} onChange={(e) => onUpdate({ subtitleFontFamily: e.target.value })}>
              {fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
          </Field>
          <div className="inspector__grid inspector__grid--two">
            <Field label="Cor subtitulo">
              <input type="color" value={toHexColor(element.subtitleColor ?? element.color)}
                onChange={(e) => onUpdate({ subtitleColor: e.target.value })} />
            </Field>
            <Field label="Esp. subtitulo">
              <input type="number" min={-2} max={16} step={0.2} value={element.subtitleLetterSpacing ?? 2.6}
                onChange={(e) => onUpdate({ subtitleLetterSpacing: Number(e.target.value) })} />
            </Field>
          </div>
          <Field label="Raio da borda">
            <input type="number" min={0} max={80} value={element.radius}
              onChange={(e) => onUpdate({ radius: Number(e.target.value) })} />
          </Field>
          <GlowFields element={element} onUpdate={onUpdate} />
        </Section>
      );

    default:
      return null;
  }
}

function getBindingKinds(element: CardElement): ElementBindingKind[] {
  switch (element.type) {
    case 'image':
    case 'portrait':
      return ['image'];
    case 'icon':
      return ['icon'];
    case 'shape':
      return ['color'];
    case 'number':
    case 'counter':
    case 'bar':
    case 'die':
      return ['number', 'text'];
    case 'text':
    case 'title':
    case 'info':
    case 'marker':
    case 'seal':
    case 'separator':
      return ['text', 'number'];
    default:
      return ['text'];
  }
}

const BINDING_KIND_LABELS: Record<ElementBindingKind, string> = {
  text: 'Texto',
  image: 'Imagem',
  icon: 'Icone',
  number: 'Numero',
  color: 'Cor',
};

function normalizeBindingKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
}

function defaultBindingKey(element: CardElement) {
  return normalizeBindingKey(element.name) || element.type;
}

function getBindingSample(element: CardElement) {
  switch (element.type) {
    case 'text':
      return element.content;
    case 'title':
      return element.subtitle ? `${element.text} / ${element.subtitle}` : element.text;
    case 'info':
      return element.body || element.title;
    case 'number':
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
      return element.src ? 'imagem atual' : 'sem imagem';
    case 'icon':
      return element.iconName;
    case 'shape':
      return element.fill;
    default:
      return element.name;
  }
}

function getBindingHint(kind: ElementBindingKind) {
  switch (kind) {
    case 'image':
      return 'Aceita URL, data:image ou nome de asset importado.';
    case 'icon':
      return 'Aceita nome de icone ou asset marcado como icone.';
    case 'number':
      return 'Aceita numero ou texto numerico vindo da tabela.';
    case 'color':
      return 'Aceita cor CSS, como #ffcc00, red ou rgba(...).';
    case 'text':
    default:
      return 'Aceita texto livre vindo de uma coluna.';
  }
}

function getQuickBindingKeys(element: CardElement) {
  const keys = new Set<string>([defaultBindingKey(element)]);
  if (['text', 'title'].includes(element.type)) {
    keys.add('nome');
    keys.add('titulo');
    keys.add('tipo');
  }
  if (['info', 'text'].includes(element.type)) {
    keys.add('descricao');
    keys.add('efeito');
  }
  if (['image', 'portrait'].includes(element.type)) keys.add('imagem');
  if (element.type === 'icon') keys.add('icone');
  if (element.type === 'shape') {
    keys.add('cor');
    keys.add('cor_forma');
    keys.add('fill');
  }
  if (['number', 'bar', 'counter', 'die'].includes(element.type)) {
    keys.add('custo');
    keys.add('valor');
  }
  if (element.type === 'marker') {
    keys.add('ataque');
    keys.add('defesa');
    keys.add('raridade');
  }
  return [...keys].filter(Boolean).slice(0, 6);
}

function BindingSection({
  element,
  onUpdate,
}: {
  element: CardElement;
  onUpdate: (patch: CardElementPatch) => void;
}) {
  const kinds = getBindingKinds(element);
  const binding = element.binding;
  const activeKind = binding?.kind ?? kinds[0];
  const suggestedKey = defaultBindingKey(element);
  const sample = getBindingSample(element);
  const quickKeys = getQuickBindingKeys(element);

  const activateBinding = (key = suggestedKey, kind = activeKind) => {
    onUpdate({
      binding: {
        key: normalizeBindingKey(key) || suggestedKey,
        kind,
      },
    });
  };

  return (
    <section className={binding ? 'binding-card binding-card--active' : 'binding-card'}>
      <div className="binding-card__head">
        <div>
          <span className="binding-card__eyebrow">Campo dinamico</span>
          <strong>{binding ? binding.key || 'campo_sem_nome' : suggestedKey}</strong>
        </div>
        <button
          type="button"
          className={binding ? 'binding-card__toggle binding-card__toggle--on' : 'binding-card__toggle'}
          onClick={() => {
            if (binding) {
              onUpdate({ binding: undefined });
              return;
            }
            activateBinding();
          }}
        >
          {binding ? 'Remover' : 'Marcar'}
        </button>
      </div>

      <p className="binding-card__summary">
        {binding ? getBindingHint(binding.kind) : 'Transforme este elemento em campo preenchivel por tabela.'}
      </p>

      {binding ? (
        <div className="binding-card__body binding-card__body--stack">
          <label className="binding-card__field binding-card__field--key">
            <span>Nome do campo / coluna</span>
            <input
              value={binding.key}
              placeholder="nome"
              onChange={(e) => {
                const key = normalizeBindingKey(e.target.value);
                onUpdate({ binding: { ...binding, key } });
              }}
            />
          </label>
          <label className="binding-card__field">
            <span>Tipo</span>
            <select
              value={binding.kind}
              onChange={(e) => onUpdate({
                binding: { ...binding, kind: e.target.value as ElementBindingKind },
              })}
            >
              {kinds.map((kind) => (
                <option key={kind} value={kind}>{BINDING_KIND_LABELS[kind]}</option>
              ))}
            </select>
          </label>
          <div className="binding-card__sample">
            <span>Amostra atual</span>
            <strong>{sample || 'vazio'}</strong>
          </div>
          <div className="binding-card__quick">
            {quickKeys.map((key) => (
              <button
                key={key}
                type="button"
                className={binding.key === key ? 'binding-card__quick-btn binding-card__quick-btn--active' : 'binding-card__quick-btn'}
                onClick={() => onUpdate({ binding: { ...binding, key } })}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <p className="binding-card__hint">
            Sugestao: <strong>{suggestedKey}</strong> como {BINDING_KIND_LABELS[activeKind].toLowerCase()}.
          </p>
          <div className="binding-card__quick">
            {quickKeys.map((key) => (
              <button
                key={key}
                type="button"
                className="binding-card__quick-btn"
                onClick={() => activateBinding(key)}
              >
                {key}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function DataFieldsSection({
  fields,
  graphics,
  onUpdate,
}: {
  fields: DynamicField[];
  graphics: GraphicAsset[];
  onUpdate?: (key: string, value: string) => void;
}) {
  const imageAssets = graphics.filter((asset) => asset.kind !== 'icon');
  const iconAssets = graphics.filter((asset) => asset.kind === 'icon');

  return (
    <Section title="Campos dinamicos" defaultOpen>
      {fields.length === 0 ? (
        <p className="data-fields__empty">
          Esta carta nao tem campos dinamicos marcados no modelo.
        </p>
      ) : (
        <div className="data-fields">
          {fields.map((field) => {
            const updateValue = (value: string) => onUpdate?.(field.key, value);
            const assetsForField = field.kind === 'icon' ? iconAssets : imageAssets;
            const useTextarea = field.kind === 'text' || field.value.length > 64;

            return (
              <div className="data-field" key={field.key}>
                <div className="data-field__head">
                  <div>
                    <strong>{field.key}</strong>
                    <span>{DYNAMIC_KIND_LABELS[field.kind]} - {field.elementIds.length} elemento{field.elementIds.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {useTextarea ? (
                  <textarea
                    className="data-field__control"
                    value={field.value}
                    rows={Math.min(6, Math.max(2, Math.ceil(field.value.length / 56)))}
                    onChange={(e) => updateValue(e.target.value)}
                  />
                ) : (
                  <input
                    className="data-field__control"
                    type="text"
                    inputMode={field.kind === 'number' ? 'decimal' : undefined}
                    value={field.value}
                    placeholder={field.kind === 'number' ? '0' : 'Valor'}
                    onChange={(e) => updateValue(e.target.value)}
                  />
                )}

                {field.kind === 'icon' ? (
                  <select
                    className="data-field__asset-select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) updateValue(e.target.value);
                    }}
                  >
                    <option value="">Usar icone pronto...</option>
                    {ICON_CATALOG.map((icon) => (
                      <option key={icon.name} value={icon.name}>{icon.label}</option>
                    ))}
                  </select>
                ) : null}

                {(field.kind === 'image' || field.kind === 'icon') && assetsForField.length > 0 ? (
                  <select
                    className="data-field__asset-select"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) updateValue(e.target.value);
                    }}
                  >
                    <option value="">Usar asset importado...</option>
                    {assetsForField.map((asset) => (
                      <option key={asset.id} value={asset.src}>{asset.name}</option>
                    ))}
                  </select>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function GlowFields({
  element,
  onUpdate,
}: {
  element: CardElement;
  onUpdate: (patch: CardElementPatch) => void;
}) {
  return (
    <div className="inspector__stack">
      <div className="inspector__grid inspector__grid--two">
        <Field label="Glow">
          <select
            value={element.glowEnabled === true ? 'on' : 'off'}
            onChange={(e) => onUpdate({ glowEnabled: e.target.value === 'on' })}
          >
            <option value="on">Ativo</option>
            <option value="off">Desativado</option>
          </select>
        </Field>
        {element.glowEnabled === true ? (
        <Field label="Cor do glow">
          <input
            type="color"
            value={toHexColor(element.glowColor ?? '#ffffff')}
            onChange={(e) => onUpdate({ glowColor: e.target.value })}
          />
        </Field>
        ) : null}
      </div>
      {element.glowEnabled === true ? (
        <RangeField
          label="Intensidade do glow"
          value={element.glowIntensity ?? 10}
          min={0}
          max={32}
          step={1}
          onChange={(value) => onUpdate({ glowIntensity: value })}
        />
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const initiallyOpen = defaultOpen ?? !['Geral', 'Fundo'].includes(title);

  return (
    <details className="inspector__section" open={initiallyOpen}>
      <summary>
        <span>{title}</span>
      </summary>
      <div className="inspector__stack">{children}</div>
    </details>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="inspector__field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="inspector__field">
      <span className="inspector__range-label">
        {label}
        <strong>{Number.isInteger(value) ? value : value.toFixed(2)}</strong>
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function toHexColor(value: string) {
  if (value.startsWith('#')) return value;
  const match = value.match(/\d+/g);
  if (!match || match.length < 3) return '#ffffff';
  return `#${match.slice(0, 3).map((p) => Number(p).toString(16).padStart(2, '0')).join('')}`;
}


