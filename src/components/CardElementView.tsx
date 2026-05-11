import { memo } from 'react';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ImageOff } from 'lucide-react';

import { ICON_MAP } from '../iconCatalog';
import type { BarElement, CardElement, CounterElement, DieElement, FrameElement, ImageMaskShape, InfoElement, MarkerElement, NumberElement, PortraitElement, SealElement, SeparatorElement, ShapeKind, TextElement, TextStyleSpan, TitleElement } from '../types';

const IMAGE_MASK_CLIPS: Record<Exclude<ImageMaskShape, 'none'>, string> = {
  circle:  'circle(50%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  shield:  'polygon(50% 0%, 100% 15%, 100% 65%, 50% 100%, 0% 65%, 0% 15%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  star:    'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
  arch:    'polygon(0% 100%, 0% 38%, 10% 14%, 25% 4%, 50% 0%, 75% 4%, 90% 14%, 100% 38%, 100% 100%)',
};

function buildTextStyles(element: TextElement, fontSize: number): CSSProperties {
  const strokeEnabled = element.textStrokeEnabled && (element.textStrokeWidth ?? 0) > 0;
  return {
    color: element.color,
    fontFamily: element.fontFamily,
    fontSize: fontSize,
    fontWeight: element.fontWeight,
    fontStyle: element.fontStyle ?? 'normal',
    textDecoration: element.textDecoration ?? 'none',
    lineHeight: element.lineHeight,
    letterSpacing: `${element.letterSpacing}px`,
    textAlign: element.align,
    textTransform: element.textTransform,
    WebkitTextStroke: strokeEnabled
      ? `${element.textStrokeWidth ?? 2}px ${element.textStrokeColor ?? '#111111'}`
      : undefined,
    paintOrder: strokeEnabled ? 'stroke fill' : undefined,
    textWrap: 'balance',
    whiteSpace: 'pre-wrap',
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      element.align === 'left' ? 'flex-start' : element.align === 'right' ? 'flex-end' : 'center',
  };
}

function TextElementView({ element, wrapperStyle }: { element: TextElement; wrapperStyle: CSSProperties }) {
  const textShadow = element.shadowEnabled
    ? `${element.shadowOffsetX ?? 2}px ${element.shadowOffsetY ?? 2}px ${element.shadowBlur ?? 8}px ${element.shadowColor ?? '#000000'}`
    : 'none';

  const curve = element.textCurve ?? 0;
  const strokeEnabled = element.textStrokeEnabled && (element.textStrokeWidth ?? 0) > 0;

  if (curve !== 0) {
    const w = element.width;
    const h = element.height;
    const abs = Math.abs(curve);
    const halfAngleRad = (abs * Math.PI) / 360;
    const sinH = Math.max(Math.sin(halfAngleRad), 0.001);
    const r = (w / 2) / sinH;
    const sagitta = r * (1 - Math.cos(halfAngleRad));

    let pathD: string;
    if (curve > 0) {
      const arcEndY = h / 2 + sagitta;
      pathD = `M 0,${arcEndY} A ${r},${r} 0 0,0 ${w},${arcEndY}`;
    } else {
      const arcEndY = h / 2 - sagitta;
      pathD = `M 0,${arcEndY} A ${r},${r} 0 0,1 ${w},${arcEndY}`;
    }

    const pathId = `cpath-${element.id}`;
    const shadowFilter = element.shadowEnabled
      ? `drop-shadow(${element.shadowOffsetX ?? 2}px ${element.shadowOffsetY ?? 2}px ${element.shadowBlur ?? 8}px ${element.shadowColor ?? '#000000'})`
      : undefined;

    return (
      <svg width={w} height={h} style={{ ...wrapperStyle, overflow: 'visible' }}>
        <defs>
          <path id={pathId} d={pathD} fill="none" />
        </defs>
        <text
          fill={element.color}
          stroke={strokeEnabled ? element.textStrokeColor ?? '#111111' : undefined}
          strokeWidth={strokeEnabled ? element.textStrokeWidth ?? 2 : undefined}
          paintOrder={strokeEnabled ? 'stroke fill' : undefined}
          fontFamily={element.fontFamily}
          fontSize={element.fontSize}
          fontWeight={element.fontWeight}
          fontStyle={element.fontStyle ?? 'normal'}
          textAnchor="middle"
          style={{
            textDecoration: element.textDecoration ?? 'none',
            textTransform: element.textTransform as CSSProperties['textTransform'],
            letterSpacing: `${element.letterSpacing}px`,
            filter: shadowFilter,
          }}
        >
          <textPath href={`#${pathId}`} startOffset="50%">
            {element.content}
          </textPath>
        </text>
      </svg>
    );
  }

  if (element.autoFitFont) {
    return <AutoFitTextView element={element} wrapperStyle={wrapperStyle} textShadow={textShadow} />;
  }

  if (element.richContent?.length) {
    return (
      <div style={{ ...wrapperStyle, ...buildTextStyles(element, element.fontSize), textShadow }}>
        <span style={{ display: 'block', width: '100%' }}>
          {renderRichContent(element.richContent)}
        </span>
      </div>
    );
  }

  return (
    <div style={{ ...wrapperStyle, ...buildTextStyles(element, element.fontSize), textShadow }}>
      {element.content}
    </div>
  );
}

function renderRichContent(richContent: TextStyleSpan[]) {
  return richContent.map((span, index) => (
    <span
      key={`${index}-${span.text}`}
      style={{
        fontWeight: span.fontWeight,
        fontStyle: span.fontStyle,
        textDecoration: span.textDecoration,
        color: span.color,
        fontFamily: span.fontFamily,
      }}
    >
      {span.text}
    </span>
  ));
}

function AutoFitTextView({
  element,
  wrapperStyle,
  textShadow,
}: {
  element: TextElement;
  wrapperStyle: CSSProperties;
  textShadow: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fittedSize, setFittedSize] = useState(element.fontSize);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let lo = 6, hi = element.fontSize, best = 6;
    for (let i = 0; i < 14; i++) {
      const mid = Math.floor((lo + hi) / 2);
      el.style.fontSize = `${mid}px`;
      if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    el.style.fontSize = '';
    setFittedSize(best);
  }, [element.content, element.fontSize, element.fontFamily, element.fontWeight, element.lineHeight, element.letterSpacing, element.width, element.height]);

  return (
    <div
      ref={containerRef}
      style={{ ...wrapperStyle, ...buildTextStyles(element, fittedSize), textShadow, overflow: 'hidden' }}
    >
      {element.content}
    </div>
  );
}

const shapeClipMap: Record<ShapeKind, string | undefined> = {
  rectangle: undefined,
  circle: undefined,
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
  octagon: 'polygon(30% 0, 70% 0, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0 70%, 0 30%)',
  capsule: undefined,
  parallelogram: 'polygon(16% 0, 100% 0, 84% 100%, 0 100%)',
  banner: 'polygon(0 0, 100% 0, 90% 50%, 100% 100%, 0 100%, 10% 50%)',
  chevron: 'polygon(0 0, 78% 0, 100% 50%, 78% 100%, 0 100%, 20% 50%)',
  starburst:
    'polygon(50% 0, 60% 25%, 85% 15%, 75% 40%, 100% 50%, 75% 60%, 85% 85%, 60% 75%, 50% 100%, 40% 75%, 15% 85%, 25% 60%, 0 50%, 25% 40%, 15% 15%, 40% 25%)',
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  cross: 'polygon(33% 0,67% 0,67% 33%,100% 33%,100% 67%,67% 67%,67% 100%,33% 100%,33% 67%,0 67%,0 33%,33% 33%)',
  arrow: 'polygon(0 28%, 62% 28%, 62% 0, 100% 50%, 62% 100%, 62% 72%, 0 72%)',
};

// ─── Visual helpers ──────────────────────────────────────────────────────────

/** Layered drop-shadow filter for outer glow effect */
function glowFilter(color: string, size = 10): string {
  return `drop-shadow(0 0 ${size}px ${color}) drop-shadow(0 0 ${Math.round(size * 0.35)}px ${color})`;
}

function glowSize(element: CardElement, fallback: number): number {
  return element.glowIntensity ?? fallback;
}

/** Top-edge highlight + bottom-edge shadow that simulate metallic surface */
const METALLIC_INSET = 'inset 0 1px 0 rgba(255,255,255,0.44), inset 0 -1px 0 rgba(0,0,0,0.28)';

// ─────────────────────────────────────────────────────────────────────────────

interface CardElementViewProps {
  element: CardElement;
}

export const CardElementView = memo(function CardElementView({ element }: CardElementViewProps) {
  const wrapperStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    opacity: element.opacity,
    transform: `scaleX(${element.flipX ? -1 : 1}) scaleY(${element.flipY ? -1 : 1})`,
    transformOrigin: 'center center',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    pointerEvents: 'none',
    touchAction: 'none',
  };

  switch (element.type) {
    case 'text':
      return <TextElementView element={element} wrapperStyle={wrapperStyle} />;

    case 'image': {
      const mask = element.maskShape && element.maskShape !== 'none'
        ? IMAGE_MASK_CLIPS[element.maskShape]
        : undefined;
      return (
        <div
          style={{
            ...wrapperStyle,
            borderRadius: mask ? 0 : element.borderRadius,
            overflow: 'hidden',
            border: !mask && element.strokeWidth > 0 ? `${element.strokeWidth}px solid ${element.strokeColor}` : 'none',
            boxShadow: element.shadow > 0 ? `0 18px ${element.shadow}px rgba(0, 0, 0, 0.34)` : 'none',
            background: 'transparent',
            clipPath: mask,
          }}
        >
          {element.src ? (
            <img
              src={element.src}
              alt={element.name}
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              style={{
                width: '100%',
                height: '100%',
                objectFit: element.fit,
                objectPosition: 'center',
                display: 'block',
                background: 'transparent',
              }}
            />
          ) : (
            <div className="element-placeholder">
              <ImageOff size={28} />
              <span>Solte uma arte aqui ou escolha um asset</span>
            </div>
          )}
        </div>
      );
    }

    case 'icon': {
      const Icon = ICON_MAP[element.iconName as keyof typeof ICON_MAP] ?? ICON_MAP.sparkles;
      const variant = element.variant ?? 'plain';
      const customIcon = element.customSrc;

      // ⑤ Aura variant — pulsing halo glow, no background shape
      if (variant === 'aura') {
        return (
          <div
            style={{
              ...wrapperStyle,
              display: 'grid',
              placeItems: 'center',
              filter: element.glowEnabled === true ? glowFilter(element.glowColor ?? element.color, glowSize(element, 16)) : undefined,
            }}
          >
            {/* outer halo */}
            <div
              style={{
                position: 'absolute',
                inset: '6%',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${element.color}28 0%, ${element.color}08 55%, transparent 72%)`,
                animation: 'auraBreath 3s ease-in-out infinite',
              }}
            />
            {/* ring */}
            <div
              style={{
                position: 'absolute',
                inset: '20%',
                borderRadius: '50%',
                border: `1px solid ${element.color}55`,
                boxShadow: `0 0 18px ${element.color}33`,
              }}
            />
            {customIcon ? (
              <img
                src={customIcon}
                alt={element.name}
                draggable={false}
                style={{ width: '58%', height: '58%', objectFit: 'contain', position: 'relative', zIndex: 1 }}
              />
            ) : (
              <Icon
                style={{
                  width: '58%',
                  height: '58%',
                  color: element.color,
                  fill: 'transparent',
                  position: 'relative',
                  zIndex: 1,
                }}
                strokeWidth={element.strokeWidth}
              />
            )}
          </div>
        );
      }

      const tokenShape =
        variant === 'diamond'
          ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'
          : variant === 'crest'
            ? 'polygon(50% 0, 92% 18%, 84% 78%, 50% 100%, 16% 78%, 8% 18%)'
            : variant === 'burst'
              ? shapeClipMap.starburst
              : variant === 'corner'
                ? 'polygon(0 0, 100% 0, 100% 72%, 72% 100%, 0 100%)'
                : undefined;
      const tokenRadius = variant === 'plain' ? 28 : variant === 'token' ? '50%' : 18;

      return (
        <div
          style={{
            ...wrapperStyle,
            display: 'grid',
            placeItems: 'center',
            // ① Glow on non-plain icons (user-controlled)
            filter: (variant !== 'plain' && element.glowEnabled === true) ? glowFilter(element.glowColor ?? element.color, glowSize(element, 8)) : undefined,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: tokenRadius,
              clipPath: tokenShape,
              display: 'grid',
              placeItems: 'center',
              background:
                variant === 'plain'
                  ? element.fillColor
                  : variant === 'burst'
                    ? `radial-gradient(circle at 34% 30%, rgba(255,255,255,0.72), ${element.fillColor} 42%, rgba(0,0,0,0.22))`
                    : variant === 'diamond'
                      ? `linear-gradient(135deg, rgba(255,255,255,0.52), ${element.fillColor} 34%, rgba(0,0,0,0.44))`
                      : element.fillColor,
              border: variant === 'plain' ? 'none' : '2px solid rgba(255,255,255,0.26)',
              // ② Metallic inset on all shaped icons
              boxShadow:
                variant === 'plain'
                  ? 'none'
                  : `${METALLIC_INSET}, inset 0 0 0 1px rgba(255,255,255,0.1), 0 12px 22px rgba(0,0,0,0.32)`,
            }}
          >
            {customIcon ? (
              <img
                src={customIcon}
                alt={element.name}
                draggable={false}
                style={{
                  width: variant === 'corner' ? '58%' : '68%',
                  height: variant === 'corner' ? '58%' : '68%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <Icon
                style={{
                  width: variant === 'corner' ? '58%' : '68%',
                  height: variant === 'corner' ? '58%' : '68%',
                  color: element.color,
                  fill: variant === 'plain' ? element.fillColor : 'transparent',
                }}
                strokeWidth={element.strokeWidth}
              />
            )}
          </div>
        </div>
      );
    }

    case 'shape':
      return (
        <div
          style={{
            ...wrapperStyle,
            background: element.fill,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            borderRadius:
              element.shape === 'circle'
                ? '50%'
                : element.shape === 'capsule'
                  ? 999
                  : element.radius,
            clipPath: shapeClipMap[element.shape],
            // ③ Metallic inset + optional glow
            boxShadow:
              element.strokeWidth > 0
                ? `${METALLIC_INSET}, inset 0 0 0 1px rgba(255,255,255,0.06)`
                : 'inset 0 1px 0 rgba(255,255,255,0.12)',
            filter: element.glowEnabled === true ? glowFilter(element.glowColor ?? element.strokeColor, glowSize(element, 5)) : undefined,
          }}
        />
      );

    case 'frame':
      return <FrameView element={element} wrapperStyle={wrapperStyle} />;

    case 'info':
      return <InfoView element={element} wrapperStyle={wrapperStyle} />;

    case 'number':
      return <NumberView element={element} wrapperStyle={wrapperStyle} />;

    case 'marker':
      return <MarkerView element={element} wrapperStyle={wrapperStyle} />;

    case 'bar':
      return <BarView element={element} wrapperStyle={wrapperStyle} />;

    case 'title':
      return <TitleView element={element} wrapperStyle={wrapperStyle} />;

    case 'portrait':
      return <PortraitView element={element} wrapperStyle={wrapperStyle} />;

    case 'counter':
      return <CounterView element={element} wrapperStyle={wrapperStyle} />;

    case 'seal':
      return <SealView element={element} wrapperStyle={wrapperStyle} />;

    case 'separator':
      return <SeparatorView element={element} wrapperStyle={wrapperStyle} />;

    case 'die':
      return <DieView element={element} wrapperStyle={wrapperStyle} />;

    default:
      return null;
  }
});

// ─── FrameView ────────────────────────────────────────────────────────────────

function FrameView({
  element,
  wrapperStyle,
}: {
  element: FrameElement;
  wrapperStyle: CSSProperties;
}) {
  const variant = element.variant ?? 'ornate';
  const cornerPositions = [
    { top: 0, left: 0 },
    { top: 0, right: 0 },
    { bottom: 0, left: 0 },
    { bottom: 0, right: 0 },
  ];

  // ① All frames receive a soft outer glow (user-controlled)
  const framedStyle: CSSProperties = {
    ...wrapperStyle,
    filter: element.glowEnabled === true ? glowFilter(element.glowColor ?? element.accentColor, glowSize(element, 8)) : undefined,
  };

  // ④ Foil holographic variant
  if (variant === 'notebook') {
    return (
      <div style={framedStyle}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: element.radius,
          border: `${element.strokeWidth}px solid ${element.strokeColor}`,
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 29px, rgba(31,41,55,0.24) 30px), linear-gradient(90deg, transparent 0 46px, rgba(239,68,68,0.45) 47px, transparent 48px)',
          boxShadow: METALLIC_INSET,
        }} />
        <div style={{
          position: 'absolute',
          left: element.inset,
          top: element.inset,
          bottom: element.inset,
          width: 8,
          borderRadius: 999,
          background: `repeating-linear-gradient(0deg, ${element.accentColor}, ${element.accentColor} 5px, transparent 5px, transparent 16px)`,
        }} />
      </div>
    );
  }

  if (variant === 'blueprint') {
    return (
      <div style={framedStyle}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: element.radius,
          border: `${element.strokeWidth}px solid ${element.strokeColor}`,
          backgroundImage: 'linear-gradient(rgba(125,211,252,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.16) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          boxShadow: `${METALLIC_INSET}, inset 0 0 28px rgba(34,211,238,0.14)`,
        }} />
        <div style={{ position: 'absolute', inset: element.inset, border: `1px dashed ${element.accentColor}`, borderRadius: Math.max(0, element.radius - 6) }} />
        {cornerPositions.map((position, index) => (
          <div key={index} style={{
            position: 'absolute',
            width: element.cornerSize,
            height: element.cornerSize,
            borderColor: element.accentColor,
            borderStyle: 'solid',
            borderWidth: 0,
            ...position,
            ...(position.top !== undefined ? { borderTopWidth: 3 } : { borderBottomWidth: 3 }),
            ...(position.left !== undefined ? { borderLeftWidth: 3 } : { borderRightWidth: 3 }),
          }} />
        ))}
      </div>
    );
  }

  if (variant === 'tileBorder') {
    return (
      <div style={framedStyle}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: element.radius,
          border: `${element.strokeWidth}px solid ${element.strokeColor}`,
          boxShadow: METALLIC_INSET,
        }} />
        {['top', 'bottom'].map((side) => (
          <div key={side} style={{
            position: 'absolute',
            left: element.inset,
            right: element.inset,
            [side]: element.inset * 0.6,
            height: Math.max(10, element.strokeWidth * 4),
            background: `repeating-linear-gradient(90deg, ${element.accentColor}, ${element.accentColor} 18px, transparent 18px, transparent 28px)`,
            opacity: 0.9,
          }} />
        ))}
        {['left', 'right'].map((side) => (
          <div key={side} style={{
            position: 'absolute',
            top: element.inset,
            bottom: element.inset,
            [side]: element.inset * 0.6,
            width: Math.max(10, element.strokeWidth * 4),
            background: `repeating-linear-gradient(0deg, ${element.accentColor}, ${element.accentColor} 18px, transparent 18px, transparent 28px)`,
            opacity: 0.9,
          }} />
        ))}
      </div>
    );
  }

  if (variant === 'foil') {
    return (
      <div
        style={{
          ...wrapperStyle,
          filter: element.glowEnabled === true
            ? glowFilter(element.glowColor ?? 'rgba(180,100,255,0.8)', glowSize(element, 10))
            : undefined,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid rgba(255,255,255,0.55)`,
            boxShadow: `${METALLIC_INSET}, inset 0 0 28px rgba(255,255,255,0.08), 0 24px 36px rgba(0,0,0,0.3)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: element.inset,
            borderRadius: Math.max(element.radius - 8, 0),
            border: '1px solid rgba(255,255,255,0.28)',
          }}
        />
        {/* Holographic shimmer overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(105deg, transparent 18%, rgba(255,80,220,0.24) 28%, rgba(80,180,255,0.24) 44%, rgba(255,230,80,0.22) 60%, rgba(180,80,255,0.22) 76%, transparent 86%)',
              backgroundSize: '300% 100%',
              animation: 'foilShimmer 2.8s ease-in-out infinite',
            }}
          />
        </div>
        {cornerPositions.map((position, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: element.cornerSize,
              height: element.cornerSize,
              borderRadius: '38% 62% 38% 62%',
              border: `${Math.max(2, element.strokeWidth - 1)}px solid rgba(255,255,255,0.42)`,
              transform: `rotate(${index * 90}deg)`,
              ...position,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'minimal') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            // ② Metallic inset highlight
            boxShadow: METALLIC_INSET,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: element.inset,
            borderRadius: Math.max(element.radius - 8, 0),
            border: `1px solid ${element.accentColor}`,
          }}
        />
      </div>
    );
  }

  if (variant === 'gothic') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            clipPath:
              'polygon(4% 0, 96% 0, 100% 6%, 100% 94%, 96% 100%, 4% 100%, 0 94%, 0 6%)',
            boxShadow: METALLIC_INSET,
          }}
        />
        {cornerPositions.map((position, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: element.cornerSize,
              height: element.cornerSize,
              background: `radial-gradient(circle at ${position.left !== undefined ? '0' : '100%'} ${position.top !== undefined ? '0' : '100%'}, ${element.accentColor}, transparent 62%)`,
              borderColor: element.strokeColor,
              borderStyle: 'solid',
              borderWidth: 0,
              ...position,
              ...(position.top !== undefined ? { borderTopWidth: 3 } : { borderBottomWidth: 3 }),
              ...(position.left !== undefined ? { borderLeftWidth: 3 } : { borderRightWidth: 3 }),
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'arcane') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: `${METALLIC_INSET}, inset 0 0 28px ${element.accentColor}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: element.inset,
            borderRadius: Math.max(element.radius - 10, 0),
            border: `1px dashed ${element.accentColor}`,
          }}
        />
        {cornerPositions.map((position, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: element.cornerSize,
              height: element.cornerSize,
              borderRadius: '50%',
              border: `2px solid ${element.accentColor}`,
              transform: `rotate(${45 + index * 45}deg)`,
              ...position,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'cornerTabs') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: METALLIC_INSET,
          }}
        />
        {cornerPositions.map((position, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: element.cornerSize,
              height: element.cornerSize * 0.34,
              background: element.accentColor,
              borderRadius: 999,
              transform: `rotate(${position.left !== undefined ? -45 : 45}deg)`,
              transformOrigin: 'center',
              boxShadow: `0 3px 10px rgba(0,0,0,0.35)`,
              ...position,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'scrollwork') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px double ${element.strokeColor}`,
            boxShadow: METALLIC_INSET,
          }}
        />
        {['top', 'bottom'].map((side) => (
          <div
            key={side}
            style={{
              position: 'absolute',
              left: '18%',
              right: '18%',
              [side]: element.inset,
              height: 18,
              borderTop: `2px solid ${element.accentColor}`,
              borderBottom: `2px solid ${element.accentColor}`,
              borderRadius: 999,
            }}
          />
        ))}
        {cornerPositions.map((position, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: element.cornerSize,
              height: element.cornerSize,
              borderRadius: '50%',
              border: `3px double ${element.accentColor}`,
              ...position,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'blackCore') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: `${METALLIC_INSET}, inset 0 0 0 2px rgba(255,255,255,0.22)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: element.inset,
            right: element.inset,
            bottom: element.inset,
            height: Math.max(26, element.cornerSize * 0.35),
            borderRadius: '12px 12px 20px 20px',
            background: element.strokeColor,
            borderTop: `2px solid ${element.accentColor}`,
          }}
        />
        {['left', 'right'].map((side) => (
          <div
            key={side}
            style={{
              position: 'absolute',
              [side]: element.inset * 0.7,
              top: '14%',
              bottom: '18%',
              width: 6,
              borderRadius: 999,
              background: `linear-gradient(180deg, transparent, ${element.accentColor}, transparent)`,
              opacity: 0.8,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'storyFrame') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: `${METALLIC_INSET}, inset 0 0 0 3px ${element.accentColor}, inset 0 0 0 ${element.inset}px rgba(255,255,255,0.1)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '8%',
            right: '8%',
            bottom: element.inset,
            height: Math.max(34, element.cornerSize * 0.55),
            background: element.accentColor,
            clipPath: 'polygon(0 0, 100% 0, 96% 100%, 4% 100%)',
            borderTop: `2px solid ${element.strokeColor}`,
          }}
        />
      </div>
    );
  }

  if (variant === 'costSocket') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: METALLIC_INSET,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: element.cornerSize,
            height: element.cornerSize,
            left: -element.strokeWidth,
            top: -element.strokeWidth,
            borderRadius: '50%',
            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.72), ${element.accentColor} 34%, ${element.strokeColor})`,
            border: `${Math.max(3, element.strokeWidth - 2)}px solid ${element.strokeColor}`,
            boxShadow: '0 10px 18px rgba(0,0,0,0.35)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: element.inset,
            borderRadius: Math.max(0, element.radius - 10),
            border: `1px solid ${element.accentColor}`,
          }}
        />
      </div>
    );
  }

  if (variant === 'heroPanel') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: METALLIC_INSET,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: '22%',
            height: Math.max(40, element.cornerSize * 0.42),
            background: `linear-gradient(90deg, ${element.accentColor}, rgba(255,255,255,0.12))`,
            transform: 'skewY(-4deg)',
            transformOrigin: 'left center',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: element.inset,
            right: element.inset,
            top: element.inset,
            bottom: element.inset,
            border: '1px solid rgba(255,255,255,0.18)',
          }}
        />
      </div>
    );
  }

  if (variant === 'elementalRails') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: METALLIC_INSET,
          }}
        />
        {['left', 'right'].map((side) => (
          <div
            key={side}
            style={{
              position: 'absolute',
              [side]: 0,
              top: element.inset,
              bottom: element.inset,
              width: Math.max(14, element.cornerSize * 0.22),
              borderRadius: side === 'left' ? '0 999px 999px 0' : '999px 0 0 999px',
              background: `linear-gradient(180deg, transparent, ${element.accentColor}, transparent)`,
            }}
          />
        ))}
        {cornerPositions.map((position, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: element.cornerSize,
              height: element.cornerSize,
              borderRadius: '50%',
              border: `2px solid ${element.accentColor}`,
              opacity: 0.72,
              ...position,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'printPlay') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: `${METALLIC_INSET}, inset 0 0 0 ${element.inset}px rgba(0,0,0,0.72)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: element.inset * 2,
            right: element.inset * 2,
            bottom: element.inset * 2,
            height: Math.max(18, element.cornerSize),
            borderTop: `2px solid ${element.strokeColor}`,
            borderBottom: `2px solid ${element.strokeColor}`,
          }}
        />
      </div>
    );
  }

  if (variant === 'double') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: METALLIC_INSET,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: element.inset,
            borderRadius: Math.max(element.radius - 8, 0),
            border: `${Math.max(1, element.strokeWidth)}px solid ${element.accentColor}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: element.inset + 16,
            borderRadius: Math.max(element.radius - 18, 0),
            border: '1px dashed rgba(255,255,255,0.32)',
          }}
        />
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            boxShadow: `${METALLIC_INSET}, inset 0 0 0 2px rgba(255,255,255,0.12), 0 22px 34px rgba(0,0,0,0.22)`,
          }}
        />
        {['top', 'bottom'].map((side) => (
          <div
            key={side}
            style={{
              position: 'absolute',
              left: '14%',
              right: '14%',
              [side]: element.inset,
              height: 12,
              borderRadius: 999,
              background: `linear-gradient(90deg, transparent, ${element.accentColor}, transparent)`,
            }}
          />
        ))}
        {cornerPositions.map((position, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: element.cornerSize,
              height: element.cornerSize,
              borderRadius: '38% 62% 38% 62%',
              border: `${Math.max(2, element.strokeWidth - 1)}px solid ${element.accentColor}`,
              transform: `rotate(${index * 90}deg)`,
              ...position,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'tech') {
    return (
      <div style={framedStyle}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: element.radius,
            border: `${element.strokeWidth}px solid ${element.strokeColor}`,
            clipPath:
              'polygon(8% 0, 92% 0, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0 92%, 0 8%)',
            boxShadow: METALLIC_INSET,
          }}
        />
        {cornerPositions.map((position, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              width: element.cornerSize,
              height: element.cornerSize,
              borderColor: element.accentColor,
              borderStyle: 'solid',
              borderWidth: 0,
              ...position,
              ...(position.top !== undefined ? { borderTopWidth: 4 } : { borderBottomWidth: 4 }),
              ...(position.left !== undefined ? { borderLeftWidth: 4 } : { borderRightWidth: 4 }),
            }}
          />
        ))}
      </div>
    );
  }

  // ornate (default)
  return (
    <div style={framedStyle}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: element.radius,
          border: `${element.strokeWidth}px solid ${element.strokeColor}`,
          boxShadow: `${METALLIC_INSET}, inset 0 0 0 1px rgba(255,255,255,0.12), 0 22px 34px rgba(0,0,0,0.24)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: element.inset,
          borderRadius: Math.max(element.radius - element.inset / 2, 0),
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      />
      {cornerPositions.map((position, index) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            width: element.cornerSize,
            height: element.cornerSize,
            borderColor: element.accentColor,
            borderStyle: 'solid',
            borderWidth: 0,
            ...position,
            ...(position.top !== undefined
              ? { borderTopWidth: element.strokeWidth + 2 }
              : { borderBottomWidth: element.strokeWidth + 2 }),
            ...(position.left !== undefined
              ? { borderLeftWidth: element.strokeWidth + 2 }
              : { borderRightWidth: element.strokeWidth + 2 }),
            borderRadius: 18,
          }}
        />
      ))}
    </div>
  );
}

// ─── InfoView ─────────────────────────────────────────────────────────────────

function InfoView({
  element,
  wrapperStyle,
}: {
  element: InfoElement;
  wrapperStyle: CSSProperties;
}) {
  const variant = element.variant ?? 'panel';
  const isSplit = variant === 'split';
  const isRibbon = variant === 'ribbon';
  const isScroll = variant === 'scroll';
  const isParchment = variant === 'parchment';
  const isQuote = variant === 'quote';
  const isStatBlock = variant === 'statBlock';
  const isGlass = variant === 'glass';
  const isRulebook = variant === 'rulebook';
  const isChapter = variant === 'chapter';
  const isLore = variant === 'lore';
  const isQuest = variant === 'quest';
  const isNotched = variant === 'notched';
  const isArcaneManuscript = variant === 'arcaneManuscript';
  const isBattleBrief = variant === 'battleBrief';
  const isTerminalLog = variant === 'terminalLog';
  const isHandNote = variant === 'handNote';
  const isRoyalDecree = variant === 'royalDecree';
  const isComicQuest = variant === 'comicQuest';
  const isTwoCol = variant === 'twoCol';
  const isAngled = variant === 'angled';
  const isCodex = variant === 'codex';
  const isBare = variant === 'bare';
  const isWoodPlank = variant === 'woodPlank';
  const isFabricPatch = variant === 'fabricPatch';
  const isTornPaper = variant === 'tornPaper';
  const isLeatherBound = variant === 'leatherBound';
  const isChalkboard = variant === 'chalkboard';

  if (isTwoCol) {
    return (
      <div
        style={{
          ...wrapperStyle,
          display: 'flex',
          overflow: 'hidden',
          borderRadius: element.radius,
          boxShadow: '0 16px 32px rgba(0,0,0,0.28)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div
          style={{
            width: '36%',
            background: element.accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: element.padding / 2,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              color: element.titleColor,
              fontWeight: element.titleFontWeight ?? 900,
              fontSize: element.titleFontSize ?? 20,
              textTransform: 'uppercase',
              letterSpacing: 2.5,
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              fontFamily: element.titleFontFamily || 'Alegreya Sans SC',
              lineHeight: 1.1,
            }}
          >
            {element.title}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: element.fill,
            padding: element.padding,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderLeft: `3px solid rgba(255,255,255,0.1)`,
          }}
        >
          <div
            style={{
              color: element.bodyColor,
              fontSize: element.bodyFontSize ?? 23,
              lineHeight: element.bodyLineHeight ?? 1.4,
              letterSpacing: element.bodyLetterSpacing != null ? `${element.bodyLetterSpacing}px` : undefined,
              textAlign: element.bodyAlign ?? 'left',
              fontFamily: element.bodyFontFamily || undefined,
              whiteSpace: 'pre-wrap',
            }}
          >
            {element.body}
          </div>
        </div>
      </div>
    );
  }

  if (isAngled) {
    return (
      <div
        style={{
          ...wrapperStyle,
          background: element.fill,
          borderRadius: element.radius,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: `2px solid ${element.accentColor}`,
          boxShadow: `0 16px 32px rgba(0,0,0,0.28), 0 0 20px ${element.accentColor}18`,
        }}
      >
        <div
          style={{
            background: element.accentColor,
            padding: `${element.padding}px ${element.padding}px ${element.padding + 18}px`,
            clipPath: 'polygon(0 0, 100% 0, 100% 62%, 0 100%)',
            flexShrink: 0,
            minHeight: 72,
          }}
        >
          <div
            style={{
              color: element.titleColor,
              fontWeight: element.titleFontWeight ?? 800,
              fontSize: element.titleFontSize ?? 26,
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              textAlign: element.titleAlign ?? 'left',
              fontFamily: element.titleFontFamily || 'Alegreya Sans SC',
              textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}
          >
            {element.title}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: `${element.padding * 0.5}px ${element.padding}px ${element.padding}px`,
            color: element.bodyColor,
            fontSize: element.bodyFontSize ?? 23,
            lineHeight: element.bodyLineHeight ?? 1.4,
            letterSpacing: element.bodyLetterSpacing != null ? `${element.bodyLetterSpacing}px` : undefined,
            textAlign: element.bodyAlign ?? 'left',
            fontFamily: element.bodyFontFamily || undefined,
            whiteSpace: 'pre-wrap',
            marginTop: -14,
          }}
        >
          {element.body}
        </div>
      </div>
    );
  }

  if (isCodex) {
    return (
      <div
        style={{
          ...wrapperStyle,
          display: 'flex',
          overflow: 'hidden',
          borderRadius: element.radius,
          boxShadow: `0 16px 32px rgba(0,0,0,0.28), 0 0 16px ${element.accentColor}14`,
        }}
      >
        <div
          style={{
            width: Math.max(14, element.padding * 0.55),
            background: `linear-gradient(180deg, ${element.accentColor}, color-mix(in srgb, ${element.accentColor} 65%, #000))`,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            flex: 1,
            background: element.fill,
            display: 'flex',
            flexDirection: 'column',
            padding: element.padding,
            gap: 12,
            border: `1px solid ${element.accentColor}`,
            borderLeft: 'none',
            borderRadius: `0 ${element.radius}px ${element.radius}px 0`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 0,
              height: 0,
              borderStyle: 'solid',
              borderWidth: `24px 24px 0 0`,
              borderColor: `${element.accentColor} transparent transparent transparent`,
            }}
          />
          <div
            style={{
              color: element.titleColor,
              fontWeight: element.titleFontWeight ?? 800,
              fontSize: element.titleFontSize ?? 24,
              fontFamily: element.titleFontFamily || 'Alegreya Sans SC',
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              textAlign: element.titleAlign ?? 'left',
              borderBottom: `2px solid ${element.accentColor}`,
              paddingBottom: 8,
              paddingRight: 28,
            }}
          >
            {element.title}
          </div>
          <div
            style={{
              color: element.bodyColor,
              fontSize: element.bodyFontSize ?? 22,
              lineHeight: element.bodyLineHeight ?? 1.4,
              letterSpacing: element.bodyLetterSpacing != null ? `${element.bodyLetterSpacing}px` : undefined,
              textAlign: element.bodyAlign ?? 'left',
              fontFamily: element.bodyFontFamily || undefined,
              whiteSpace: 'pre-wrap',
            }}
          >
            {element.body}
          </div>
        </div>
      </div>
    );
  }

  // ── bare ─────────────────────────────────────────────────────────────────────
  if (isBare) {
    return (
      <div
        style={{
          ...wrapperStyle,
          padding: `0 ${element.padding}px`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${element.accentColor}, transparent)`,
            borderRadius: 999,
          }}
        />
        {element.title ? (
          <div
            style={{
              color: element.titleColor,
              fontFamily: element.titleFontFamily || undefined,
              fontWeight: element.titleFontWeight ?? 800,
              fontSize: element.titleFontSize ?? 27,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              textAlign: element.titleAlign ?? 'left',
              textShadow: '0 2px 14px rgba(0,0,0,0.96), 0 0 30px rgba(0,0,0,0.7)',
            }}
          >
            {element.title}
          </div>
        ) : null}
        <div
          style={{
            color: element.bodyColor,
            fontFamily: element.bodyFontFamily || undefined,
            fontSize: element.bodyFontSize ?? 23,
            lineHeight: element.bodyLineHeight ?? 1.44,
            letterSpacing: element.bodyLetterSpacing != null ? `${element.bodyLetterSpacing}px` : undefined,
            textAlign: element.bodyAlign ?? 'left',
            whiteSpace: 'pre-wrap',
            textShadow: '0 1px 8px rgba(0,0,0,0.92), 0 0 20px rgba(0,0,0,0.6)',
          }}
        >
          {element.body}
        </div>
        <div
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${element.accentColor}, transparent)`,
            borderRadius: 999,
          }}
        />
      </div>
    );
  }

  // ── woodPlank ─────────────────────────────────────────────────────────────────
  if (isWoodPlank) {
    return (
      <div
        style={{
          ...wrapperStyle,
          background: [
            'repeating-linear-gradient(88deg, rgba(0,0,0,0.045) 0px, rgba(0,0,0,0.045) 1px, transparent 1px, transparent 22px)',
            'repeating-linear-gradient(92deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 30px)',
            `linear-gradient(90deg, rgba(0,0,0,0.22) 0%, ${element.fill} 10%, rgba(255,255,255,0.1) 36%, ${element.fill} 54%, rgba(0,0,0,0.18) 72%, ${element.fill} 88%, rgba(255,255,255,0.08) 100%)`,
          ].join(', '),
          borderRadius: element.radius,
          border: `3px solid ${element.accentColor}`,
          boxShadow: `inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -3px 0 rgba(0,0,0,0.4), 0 16px 32px rgba(0,0,0,0.44)`,
          padding: element.padding,
          boxSizing: 'border-box' as const,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 12,
          overflow: 'hidden',
        }}
      >
        {/* End-grain knot decoration */}
        <div
          style={{
            position: 'absolute',
            right: 18,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 38,
            height: 52,
            borderRadius: '50%',
            border: `1px solid rgba(255,255,255,0.06)`,
            boxShadow: `0 0 0 6px rgba(255,255,255,0.03), 0 0 0 12px rgba(0,0,0,0.04)`,
            opacity: 0.7,
          }}
        />
        {element.title ? (
          <div
            style={{
              color: element.titleColor,
              fontFamily: element.titleFontFamily || undefined,
              fontWeight: element.titleFontWeight ?? 800,
              fontSize: element.titleFontSize ?? 26,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              textAlign: element.titleAlign ?? 'left',
              textShadow: '0 1px 6px rgba(0,0,0,0.7)',
              borderBottom: `2px solid ${element.accentColor}66`,
              paddingBottom: 8,
              position: 'relative',
            }}
          >
            {element.title}
          </div>
        ) : null}
        <div
          style={{
            color: element.bodyColor,
            fontFamily: element.bodyFontFamily || undefined,
            fontSize: element.bodyFontSize ?? 22,
            lineHeight: element.bodyLineHeight ?? 1.42,
            letterSpacing: element.bodyLetterSpacing != null ? `${element.bodyLetterSpacing}px` : undefined,
            textAlign: element.bodyAlign ?? 'left',
            whiteSpace: 'pre-wrap',
            position: 'relative',
          }}
        >
          {element.body}
        </div>
      </div>
    );
  }

  // ── fabricPatch ───────────────────────────────────────────────────────────────
  if (isFabricPatch) {
    return (
      <div
        style={{
          ...wrapperStyle,
          background: [
            'repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 8px)',
            'repeating-linear-gradient(-45deg, rgba(255,255,255,0.044) 0px, rgba(255,255,255,0.044) 1px, transparent 1px, transparent 8px)',
            `linear-gradient(155deg, color-mix(in srgb, ${element.fill} 78%, white), ${element.fill})`,
          ].join(', '),
          borderRadius: element.radius,
          border: `3px dashed ${element.accentColor}`,
          outline: `3px solid ${element.accentColor}1a`,
          outlineOffset: '4px',
          boxShadow: `0 14px 26px rgba(0,0,0,0.36), inset 0 1px 0 rgba(255,255,255,0.14)`,
          padding: element.padding,
          boxSizing: 'border-box' as const,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 10,
        }}
      >
        {element.title ? (
          <div
            style={{
              color: element.titleColor,
              fontFamily: element.titleFontFamily || undefined,
              fontWeight: element.titleFontWeight ?? 700,
              fontSize: element.titleFontSize ?? 26,
              letterSpacing: 1,
              textAlign: element.titleAlign ?? 'left',
              textShadow: '0 1px 5px rgba(0,0,0,0.6)',
              borderBottom: `2px dashed ${element.accentColor}88`,
              paddingBottom: 8,
            }}
          >
            {element.title}
          </div>
        ) : null}
        <div
          style={{
            color: element.bodyColor,
            fontFamily: element.bodyFontFamily || undefined,
            fontSize: element.bodyFontSize ?? 22,
            lineHeight: element.bodyLineHeight ?? 1.44,
            letterSpacing: element.bodyLetterSpacing != null ? `${element.bodyLetterSpacing}px` : undefined,
            textAlign: element.bodyAlign ?? 'left',
            whiteSpace: 'pre-wrap',
          }}
        >
          {element.body}
        </div>
      </div>
    );
  }

  // ── tornPaper ─────────────────────────────────────────────────────────────────
  if (isTornPaper) {
    const tornPath =
      'polygon(0% 7%, 3.5% 0%, 7% 7%, 10.5% 1%, 14% 6%, 17.5% 0%, 21% 7.5%, 24.5% 1%, 28% 7%, 31.5% 0%, 35% 6.5%, 38.5% 1%, 42% 7%, 45.5% 0.5%, 49% 7%, 52.5% 1%, 56% 6.5%, 59.5% 0%, 63% 7%, 66.5% 1%, 70% 6%, 73.5% 0.5%, 77% 7.5%, 80.5% 0%, 84% 6.5%, 87.5% 1%, 91% 7%, 94.5% 0.5%, 98% 6%, 100% 7%, 100% 93%, 96.5% 100%, 93% 93.5%, 89.5% 100%, 86% 93%, 82.5% 99.5%, 79% 93%, 75.5% 100%, 72% 93.5%, 68.5% 100%, 65% 93%, 61.5% 99.5%, 58% 93%, 54.5% 100%, 51% 93.5%, 47.5% 100%, 44% 93%, 40.5% 99%, 37% 93.5%, 33.5% 100%, 30% 93%, 26.5% 99.5%, 23% 93%, 19.5% 100%, 16% 93.5%, 12.5% 100%, 9% 93%, 5.5% 99.5%, 2% 93%, 0% 93%)';
    return (
      <div
        style={{
          ...wrapperStyle,
          background: [
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.028) 0px, rgba(0,0,0,0.028) 1px, transparent 1px, transparent 26px)',
            `linear-gradient(178deg, rgba(255,255,255,0.16) 0%, ${element.fill} 18%, color-mix(in srgb, ${element.fill} 90%, rgba(180,140,80,0.3)) 100%)`,
          ].join(', '),
          clipPath: tornPath,
          padding: `${element.padding + 6}px ${element.padding}px`,
          boxSizing: 'border-box' as const,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 10,
        }}
      >
        {element.title ? (
          <div
            style={{
              color: element.titleColor,
              fontFamily: element.titleFontFamily || 'Literata, Georgia, serif',
              fontWeight: element.titleFontWeight ?? 800,
              fontSize: element.titleFontSize ?? 26,
              letterSpacing: 1.2,
              textAlign: element.titleAlign ?? 'left',
              textShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }}
          >
            {element.title}
          </div>
        ) : null}
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, transparent, ${element.accentColor}88, transparent)`,
          }}
        />
        <div
          style={{
            color: element.bodyColor,
            fontFamily: element.bodyFontFamily || 'Literata, Georgia, serif',
            fontSize: element.bodyFontSize ?? 22,
            lineHeight: element.bodyLineHeight ?? 1.44,
            letterSpacing: element.bodyLetterSpacing != null ? `${element.bodyLetterSpacing}px` : undefined,
            textAlign: element.bodyAlign ?? 'left',
            whiteSpace: 'pre-wrap',
          }}
        >
          {element.body}
        </div>
      </div>
    );
  }

  // ── leatherBound ──────────────────────────────────────────────────────────────
  if (isLeatherBound) {
    return (
      <div
        style={{
          ...wrapperStyle,
          position: 'relative',
          background: [
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, rgba(0,0,0,0.022) 1px, rgba(0,0,0,0.022) 3px)',
            `linear-gradient(150deg, color-mix(in srgb, ${element.fill} 65%, white) 0%, ${element.fill} 40%, color-mix(in srgb, ${element.fill} 55%, black) 100%)`,
          ].join(', '),
          borderRadius: element.radius,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.45), 0 18px 34px rgba(0,0,0,0.48)`,
          padding: element.padding,
          boxSizing: 'border-box' as const,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 10,
          overflow: 'visible',
        }}
      >
        {/* Stitching border */}
        <div
          style={{
            position: 'absolute',
            inset: 8,
            borderRadius: Math.max(0, element.radius - 6),
            border: `2px dashed ${element.accentColor}`,
            pointerEvents: 'none',
          }}
        />
        {element.title ? (
          <div
            style={{
              color: element.titleColor,
              fontFamily: element.titleFontFamily || undefined,
              fontWeight: element.titleFontWeight ?? 700,
              fontSize: element.titleFontSize ?? 26,
              letterSpacing: 1.2,
              textAlign: element.titleAlign ?? 'left',
              textShadow: '0 1px 7px rgba(0,0,0,0.8)',
              borderBottom: `1px solid ${element.accentColor}55`,
              paddingBottom: 8,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {element.title}
          </div>
        ) : null}
        <div
          style={{
            color: element.bodyColor,
            fontFamily: element.bodyFontFamily || undefined,
            fontSize: element.bodyFontSize ?? 22,
            lineHeight: element.bodyLineHeight ?? 1.44,
            letterSpacing: element.bodyLetterSpacing != null ? `${element.bodyLetterSpacing}px` : undefined,
            textAlign: element.bodyAlign ?? 'left',
            whiteSpace: 'pre-wrap',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {element.body}
        </div>
      </div>
    );
  }

  // ── chalkboard ────────────────────────────────────────────────────────────────
  if (isChalkboard) {
    return (
      <div
        style={{
          ...wrapperStyle,
          background: [
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.014) 0px, rgba(255,255,255,0.014) 1px, transparent 1px, transparent 14px)',
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.008) 0px, rgba(255,255,255,0.008) 1px, transparent 1px, transparent 14px)',
            `linear-gradient(135deg, ${element.fill}, color-mix(in srgb, ${element.fill} 80%, black))`,
          ].join(', '),
          borderRadius: element.radius,
          border: `5px solid ${element.accentColor}`,
          boxShadow: `inset 0 0 44px rgba(0,0,0,0.46), 0 18px 36px rgba(0,0,0,0.46)`,
          padding: element.padding,
          boxSizing: 'border-box' as const,
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 14,
        }}
      >
        {element.title ? (
          <div
            style={{
              color: element.titleColor,
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: 2.4,
              textTransform: 'uppercase',
              textShadow: '0 0 8px rgba(255,255,255,0.2)',
              borderBottom: `2px solid ${element.accentColor}55`,
              paddingBottom: 10,
              fontFamily: 'Permanent Marker, cursive',
            }}
          >
            {element.title}
          </div>
        ) : null}
        <div
          style={{
            color: element.bodyColor,
            fontSize: 26,
            lineHeight: 1.44,
            whiteSpace: 'pre-wrap',
            fontFamily: 'Caveat, cursive',
            textShadow: '0 0 4px rgba(255,255,255,0.12)',
          }}
        >
          {element.body}
        </div>
      </div>
    );
  }

  const hasStatementType =
    isArcaneManuscript ||
    isBattleBrief ||
    isTerminalLog ||
    isHandNote ||
    isRoyalDecree ||
    isComicQuest;

  // Typography — use element props (set per-variant in applyVariantDefaults) with sensible fallbacks
  const titleFont = element.titleFontFamily || 'Alegreya Sans SC';
  const bodyFont  = element.bodyFontFamily  || (isQuote || isParchment || isRulebook || isLore ? 'Literata' : undefined);
  const titleSize = element.titleFontSize   ?? (isQuote || isRulebook || isQuest || isBattleBrief || isTerminalLog ? 26 : isHandNote ? 34 : 28);
  const bodySize  = element.bodyFontSize    ?? (isQuote || isLore || isHandNote ? 26 : isStatBlock || isRulebook || isQuest || isBattleBrief || isTerminalLog ? 22 : 23);
  const bodyLH    = element.bodyLineHeight  ?? (isQuote || isLore || isHandNote || isRoyalDecree ? 1.48 : isTerminalLog ? 1.28 : 1.36);
  const titleWt   = element.titleFontWeight ?? (isHandNote ? 500 : 800);
  const titleAl   = element.titleAlign      ?? 'left';
  const bodyAl    = element.bodyAlign       ?? 'left';
  const bodyLS    = element.bodyLetterSpacing != null ? `${element.bodyLetterSpacing}px` : undefined;

  // ⑥ Enhanced glow on selected info variants (user-controlled)
  const glowC = element.glowColor ?? element.accentColor;
  const extraGlow = element.glowEnabled === true
    ? isArcaneManuscript
      ? `, 0 0 36px ${glowC}20`
      : isTerminalLog
        ? `, 0 0 24px ${glowC}26`
        : isBattleBrief
          ? `, 0 0 18px ${glowC}1a`
          : isGlass
            ? `, 0 0 20px ${glowC}12`
            : ''
    : '';

  return (
    <div
      style={{
        ...wrapperStyle,
        background: isGlass
          ? `linear-gradient(135deg, ${element.fill}, rgba(255,255,255,0.04))`
          : isParchment || isRulebook || isLore
            ? `linear-gradient(135deg, ${element.fill}, rgba(255,255,255,0.28))`
            : isArcaneManuscript
              ? `radial-gradient(circle at 20% 0%, rgba(192,132,252,0.28), transparent 36%), linear-gradient(135deg, ${element.fill}, rgba(15,23,42,0.32))`
            : isBattleBrief
              ? `linear-gradient(90deg, ${element.accentColor} 0 8px, ${element.fill} 8px 100%)`
            : isTerminalLog
              ? `linear-gradient(135deg, ${element.fill}, rgba(34,211,238,0.08))`
            : isHandNote
              ? `linear-gradient(135deg, ${element.fill}, rgba(255,255,255,0.38))`
            : isRoyalDecree
              ? `linear-gradient(135deg, ${element.fill}, rgba(139,90,43,0.14))`
            : isComicQuest
              ? `linear-gradient(180deg, ${element.accentColor} 0 34%, ${element.fill} 34% 100%)`
            : isChapter
              ? `linear-gradient(180deg, ${element.accentColor} 0 28%, ${element.fill} 28% 100%)`
              : isQuest
                ? `linear-gradient(135deg, ${element.fill}, rgba(250,204,21,0.08))`
            : isScroll
          ? `linear-gradient(135deg, ${element.fill}, rgba(246, 216, 172, 0.14))`
          : element.fill,
        borderRadius: isStatBlock ? Math.max(4, element.radius) : element.radius,
        padding: element.padding,
        boxSizing: 'border-box',
        clipPath: isNotched
          ? 'polygon(6% 0, 94% 0, 100% 18%, 100% 82%, 94% 100%, 6% 100%, 0 82%, 0 18%)'
          : undefined,
        border: isScroll || isParchment || isRulebook || isLore || isArcaneManuscript || isRoyalDecree
          ? `2px solid ${element.accentColor}`
          : isGlass
            ? '1px solid rgba(255,255,255,0.36)'
          : isNotched
            ? `2px solid ${element.accentColor}`
          : isStatBlock
            ? `1px solid ${element.accentColor}`
          : isTerminalLog
            ? `1px solid ${element.accentColor}`
          : isBattleBrief || isComicQuest || isHandNote
            ? '2px solid rgba(0,0,0,0.18)'
          : '1px solid rgba(255,255,255,0.14)',
        boxShadow: isGlass
          ? `inset 0 1px 0 rgba(255,255,255,0.3), 0 16px 32px rgba(0,0,0,0.22)${extraGlow}`
          : isTerminalLog
            ? `inset 0 0 28px rgba(34,211,238,0.14), 0 16px 32px rgba(0,0,0,0.26)${extraGlow}`
          : isHandNote
            ? '0 14px 24px rgba(60,40,10,0.25)'
          : `0 16px 32px rgba(0,0,0,0.22)${extraGlow}`,
        display: 'flex',
        flexDirection: 'column',
        gap: isSplit || isChapter || isComicQuest ? 0 : isStatBlock || isQuest || isBattleBrief || isTerminalLog ? 10 : 16,
        backdropFilter: isGlass ? 'blur(12px)' : undefined,
        WebkitBackdropFilter: isGlass ? 'blur(12px)' : undefined,
      }}
    >
      {isTerminalLog ? (
        <div
          style={{
            position: 'absolute',
            inset: 12,
            opacity: 0.28,
            backgroundImage:
              'linear-gradient(rgba(34,211,238,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.18) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
      ) : null}

      {isRoyalDecree ? (
        <div
          style={{
            position: 'absolute',
            inset: element.padding / 2,
            border: `1px double ${element.accentColor}`,
            borderRadius: Math.max(0, element.radius + 4),
          }}
        />
      ) : null}

      {isArcaneManuscript ? (
        <div
          style={{
            position: 'absolute',
            right: element.padding,
            top: element.padding,
            width: 52,
            height: 52,
            borderRadius: '50%',
            border: `1px dashed ${element.accentColor}`,
            opacity: 0.5,
          }}
        />
      ) : null}

      {isQuote ? (
        <div
          style={{
            position: 'absolute',
            right: element.padding,
            top: element.padding - 16,
            color: element.accentColor,
            fontFamily: 'Literata',
            fontSize: 88,
            lineHeight: 1,
            opacity: 0.35,
          }}
        >
          &quot;
        </div>
      ) : null}

      {isStatBlock ? (
        <div
          style={{
            position: 'absolute',
            inset: element.padding / 2,
            border: `1px dashed ${element.accentColor}`,
            borderRadius: Math.max(4, element.radius - 4),
          }}
        />
      ) : null}

      {isLore ? (
        <div
          style={{
            position: 'absolute',
            left: element.padding,
            right: element.padding,
            top: element.height * 0.48,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${element.accentColor}, transparent)`,
          }}
        />
      ) : null}

      {isQuest ? (
        <div
          style={{
            position: 'absolute',
            right: element.padding,
            top: element.padding,
            bottom: element.padding,
            width: 18,
            display: 'grid',
            alignContent: 'space-between',
            color: element.accentColor,
          }}
        >
          {[0, 1, 2, 3].map((item) => (
            <span key={item} style={{ fontSize: 18, lineHeight: 1 }}>◆</span>
          ))}
        </div>
      ) : null}

      {isRibbon || isChapter || isComicQuest ? (
        <div
          style={{
            alignSelf: 'flex-start',
            padding: isChapter ? '7px 18px' : isComicQuest ? '8px 18px' : '8px 20px',
            marginLeft: isChapter || isComicQuest ? 0 : -element.padding,
            marginTop: isChapter ? -element.padding + 6 : isComicQuest ? -element.padding + 4 : 0,
            borderRadius: isChapter ? '6px' : isComicQuest ? '999px' : '0 999px 999px 0',
            background: element.accentColor,
            color: element.titleColor,
            fontFamily: titleFont,
            fontWeight: titleWt,
            fontSize: titleSize,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            textAlign: titleAl,
            position: 'relative',
            zIndex: 1,
            textShadow: '0 1px 6px rgba(0,0,0,0.45)',
          }}
        >
          {element.title}
        </div>
      ) : (
        <>
          <div
            style={{
              width: isSplit || isStatBlock || isRulebook || isQuest || hasStatementType ? '100%' : '42%',
              minWidth: 120,
              height: isSplit ? 44 : isStatBlock || isRulebook || isQuest || hasStatementType ? 2 : 6,
              borderRadius: isSplit ? 14 : 999,
              background: isSplit
                ? `linear-gradient(90deg, ${element.accentColor}, transparent)`
                : isBattleBrief || isTerminalLog
                  ? `linear-gradient(90deg, ${element.accentColor}, transparent)`
                : element.accentColor,
            }}
          />
          <div
            style={{
              color: element.titleColor,
              fontFamily: titleFont,
              fontWeight: titleWt,
              fontSize: titleSize,
              letterSpacing: isTerminalLog ? 2.4 : isHandNote ? 0.4 : 1.5,
              textTransform: 'uppercase',
              textAlign: titleAl,
              marginTop: isSplit ? -42 : 0,
              paddingLeft: isSplit ? 18 : 0,
              position: 'relative',
              zIndex: 1,
              textShadow: isHandNote ? 'none' : '0 1px 6px rgba(0,0,0,0.4)',
            }}
          >
            {element.title}
          </div>
        </>
      )}

      <div
        style={{
          color: element.bodyColor,
          fontSize: bodySize,
          lineHeight: bodyLH,
          letterSpacing: bodyLS,
          textAlign: bodyAl,
          whiteSpace: 'pre-wrap',
          marginTop: isSplit || isComicQuest ? 18 : 0,
          fontFamily: bodyFont,
          fontWeight: isBattleBrief || isTerminalLog || isComicQuest ? 600 : undefined,
          position: 'relative',
          zIndex: 1,
          paddingRight: isQuest ? 26 : 0,
        }}
      >
        {element.body}
      </div>
    </div>
  );
}

// ─── NumberView ───────────────────────────────────────────────────────────────

function NumberView({
  element,
  wrapperStyle,
}: {
  element: NumberElement;
  wrapperStyle: CSSProperties;
}) {
  const variant = element.variant ?? 'badge';
  const showLabel = element.showLabel !== false;
  const secondaryColor = element.secondaryColor ?? '#0f172a';
  const accentColor = element.accentColor ?? '#22c55e';

  if (
    variant === 'sticker' ||
    variant === 'comic' ||
    variant === 'shadowText' ||
    variant === 'neon' ||
    variant === 'arcade' ||
    variant === 'ink' ||
    variant === 'chrome' ||
    variant === 'ember'
  ) {
    const shadow =
      variant === 'comic'
        ? `3px 3px 0 ${secondaryColor}, -2px -2px 0 ${secondaryColor}, 2px -2px 0 ${secondaryColor}, -2px 2px 0 ${secondaryColor}, 6px 7px 0 rgba(0,0,0,0.42)`
      : variant === 'shadowText'
        ? `2px 2px 0 ${accentColor}, 5px 6px 0 ${secondaryColor}, 9px 10px 0 rgba(0,0,0,0.34)`
      : variant === 'neon'
        ? `0 0 4px ${accentColor}, 0 0 12px ${element.color}, 0 0 22px ${element.color}, 4px 5px 0 ${secondaryColor}`
      : variant === 'arcade'
        ? `3px 0 0 ${accentColor}, 0 3px 0 ${accentColor}, -3px 0 0 ${secondaryColor}, 0 -3px 0 ${secondaryColor}, 6px 6px 0 rgba(0,0,0,0.35)`
      : variant === 'ink'
        ? `2px 2px 0 ${accentColor}, -1px 2px 0 ${accentColor}, 5px 6px 0 rgba(0,0,0,0.22)`
      : variant === 'chrome'
        ? `2px 2px 0 ${accentColor}, -2px -2px 0 rgba(255,255,255,0.8), 5px 7px 0 ${secondaryColor}`
      : variant === 'ember'
        ? `2px 2px 0 ${accentColor}, 4px 4px 0 #d43b10, 8px 9px 0 ${secondaryColor}, 0 0 16px ${element.color}`
        : `2px 2px 0 ${accentColor}, -2px -2px 0 ${accentColor}, 2px -2px 0 ${accentColor}, -2px 2px 0 ${accentColor}, 5px 6px 0 ${secondaryColor}`;
    const color =
      variant === 'chrome'
        ? 'transparent'
        : element.color;
    const backgroundImage =
      variant === 'chrome'
        ? `linear-gradient(180deg, #ffffff 0%, ${element.color} 34%, #617084 52%, #ffffff 70%, ${element.color} 100%)`
        : variant === 'ember'
          ? `linear-gradient(180deg, #fff2b8 0%, ${element.color} 38%, #d43b10 72%, #5d1606 100%)`
          : undefined;
    return (
      <div
        style={{
          ...wrapperStyle,
          display: 'grid',
          placeItems: 'center',
          color,
          background: 'transparent',
          filter: element.glowEnabled === true ? glowFilter(element.glowColor ?? element.color, glowSize(element, 10)) : undefined,
        }}
      >
        <div
          style={{
            fontFamily: element.valueFontFamily || 'Bebas Neue',
            fontSize: element.fontSize,
            fontStyle: variant === 'arcade' || variant === 'ink' ? 'normal' : 'italic',
            fontWeight: 900,
            lineHeight: 0.82,
            letterSpacing: 0.5,
            textShadow: shadow,
            transform:
              variant === 'comic'
                ? 'rotate(-3deg)'
                : variant === 'arcade' || variant === 'ink'
                  ? 'rotate(-2deg)'
                  : 'skewX(-7deg)',
            backgroundImage,
            WebkitBackgroundClip: backgroundImage ? 'text' : undefined,
            backgroundClip: backgroundImage ? 'text' : undefined,
          }}
        >
          {element.value}
        </div>
      </div>
    );
  }

  const clipPath =
    variant === 'shield'
      ? 'polygon(50% 0, 92% 18%, 82% 82%, 50% 100%, 18% 82%, 8% 18%)'
      : variant === 'hex'
        ? 'polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%)'
        : variant === 'gemstone'
          ? 'polygon(50% 0, 92% 24%, 74% 100%, 26% 100%, 8% 24%)'
        : variant === 'sunburst'
          ? shapeClipMap.starburst
        : variant === 'rune'
          ? 'polygon(50% 0, 92% 24%, 78% 100%, 22% 100%, 8% 24%)'
          : variant === 'resource'
            ? 'polygon(50% 0, 94% 28%, 82% 100%, 18% 100%, 6% 28%)'
          : variant === 'corner'
            ? 'polygon(0 0, 100% 0, 100% 72%, 72% 100%, 0 100%)'
            : undefined;
  const borderRadius =
    variant === 'ticket'
        ? 22
      : variant === 'badge'
        ? '42%'
        : variant === 'orb' || variant === 'coin' || variant === 'blackSeal' || variant === 'laurel'
        ? '50%'
        : variant === 'dial'
          ? '50%'
        : variant === 'capsule'
          ? 999
          : variant === 'splitStat'
            ? 18
          : variant === 'square'
            ? 16
            : 0;
  const background =
    variant === 'ticket'
      ? `linear-gradient(135deg, ${element.fill}, rgba(255,255,255,0.32))`
      : variant === 'orb'
        ? `radial-gradient(circle at 28% 20%, rgba(255,255,255,0.88), ${element.fill} 28%, rgba(20,35,72,0.95))`
        : variant === 'coin'
          ? `radial-gradient(circle at 28% 22%, rgba(255,255,255,0.72), ${element.fill} 32%, #9a5f16 100%)`
          : variant === 'blackSeal'
            ? `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.2), ${element.fill} 40%, #000 100%)`
          : variant === 'laurel'
            ? `radial-gradient(circle, ${element.fill} 58%, color-mix(in srgb, ${accentColor} 22%, transparent) 60% 66%, transparent 68%)`
          : variant === 'dial'
            ? `conic-gradient(${accentColor} 0 74deg, ${element.fill} 74deg 286deg, ${secondaryColor} 286deg 360deg)`
          : variant === 'capsule'
            ? `linear-gradient(90deg, ${accentColor} 0 18%, ${element.fill} 18% 100%)`
          : variant === 'resource'
            ? `linear-gradient(145deg, rgba(255,255,255,0.22), ${element.fill} 34%, ${secondaryColor})`
          : variant === 'sunburst'
            ? `radial-gradient(circle at center, rgba(255,255,255,0.72), ${element.fill} 44%, rgba(0,0,0,0.24))`
          : variant === 'gemstone'
            ? `linear-gradient(135deg, rgba(255,255,255,0.75), ${element.fill} 28%, rgba(6,20,42,0.96))`
          : variant === 'splitStat'
            ? `linear-gradient(90deg, ${element.fill} 0 50%, ${secondaryColor} 50% 100%)`
          : variant === 'rune'
            ? `linear-gradient(135deg, ${element.fill}, rgba(120,203,255,0.2))`
            : element.fill;

  // ⑦ Specular variants that get a highlight dot
  const hasSpecular =
    variant === 'orb' ||
    variant === 'coin' ||
    variant === 'badge' ||
    variant === 'gemstone' ||
    variant === 'dial' ||
    variant === 'resource' ||
    variant === 'sunburst' ||
    variant === 'blackSeal';

  return (
    <div
      style={{
        ...wrapperStyle,
        borderRadius,
        clipPath,
        background,
        color: element.color,
        display: 'grid',
        placeItems: 'center',
        // ⑦ Upgraded shadows + metallic inset
        boxShadow:
          variant === 'orb' || variant === 'coin' || variant === 'blackSeal' || variant === 'gemstone'
            ? `${METALLIC_INSET}, inset 0 -14px 24px rgba(0,0,0,0.32), 0 18px 28px rgba(0,0,0,0.28)`
            : `${METALLIC_INSET}, 0 18px 28px rgba(0,0,0,0.28)`,
        border: clipPath ? 'none' : '2px solid rgba(255,255,255,0.22)',
        textAlign: 'center',
        position: 'relative',
        // ① Outer glow (user-controlled)
        filter: element.glowEnabled === true ? glowFilter(element.glowColor ?? element.fill, glowSize(element, 14)) : undefined,
      }}
    >
      {/* ⑦ Specular highlight — top-left bright spot simulating 3D light */}
      {hasSpecular ? (
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '14%',
            width: '32%',
            height: '22%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.65) 0%, transparent 100%)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      ) : null}

      {variant === 'blackSeal' ? (
        <div
          style={{
            position: 'absolute',
            inset: 8,
            borderRadius: '50%',
            border: '2px dashed rgba(255,255,255,0.46)',
          }}
        />
      ) : null}
      {variant === 'laurel' ? (
        <div
          style={{
            position: 'absolute',
            inset: 7,
            borderRadius: '50%',
            border: `2px solid ${accentColor}`,
          }}
        />
      ) : null}
      <div style={{ transform: showLabel ? 'translateY(-4px)' : 'translateY(0)', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontFamily: element.valueFontFamily || 'Bebas Neue',
            fontSize: showLabel ? element.fontSize : element.fontSize * 1.08,
            lineHeight: 0.85,
            letterSpacing: 1,
          }}
        >
          {element.value}
        </div>
        {showLabel ? (
          <div
            style={{
              fontFamily: element.labelFontFamily || undefined,
              color: element.labelColor ?? element.color,
              fontSize: element.labelFontSize ?? (variant === 'ticket' ? 16 : 18),
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {element.label}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── MarkerView ───────────────────────────────────────────────────────────────

function MarkerView({
  element,
  wrapperStyle,
}: {
  element: MarkerElement;
  wrapperStyle: CSSProperties;
}) {
  const variant = element.variant ?? 'pill';
  const accent = element.accentColor ?? element.color;

  // ── type tags (early return) ──────────────────────────────
  if (variant === 'typeRound' || variant === 'typeFlag' || variant === 'typeHex' ||
      variant === 'typeShield' || variant === 'typeBanner') {
    const glow = element.glowEnabled === true ? glowFilter(element.glowColor ?? element.fill, glowSize(element, 6)) : undefined;

    // shared text area
    const inner = (
      <>
        {element.symbol ? (
          <span style={{ fontFamily: element.symbolFontFamily || undefined, fontSize: element.symbolFontSize ?? element.fontSize * 0.85, lineHeight: 1, flexShrink: 0 }}>
            {element.symbol}
          </span>
        ) : null}
        <span style={{ fontFamily: element.labelFontFamily || undefined, color: element.labelColor ?? element.color, fontSize: element.labelFontSize ?? element.fontSize * 0.78, fontWeight: 700, letterSpacing: '0.06em',
          textTransform: 'uppercase', lineHeight: 1, whiteSpace: 'nowrap' }}>
          {element.label}
        </span>
      </>
    );

    if (variant === 'typeRound') {
      return (
        <div style={{ ...wrapperStyle, borderRadius: 999, background: element.fill, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          color: element.color, paddingInline: 10,
          boxShadow: `${METALLIC_INSET}, 0 3px 10px rgba(0,0,0,0.3)`,
          filter: glow }}>
          {/* accent dot */}
          <span style={{ width: element.fontSize * 0.65, height: element.fontSize * 0.65, borderRadius: '50%',
            background: accent, flexShrink: 0, display: 'inline-block' }} />
          {inner}
        </div>
      );
    }

    if (variant === 'typeFlag') {
      // flat bar with chevron point on the right
      const notchPct = 22;
      return (
        <div style={{ ...wrapperStyle, position: 'relative', overflow: 'hidden',
          clipPath: `polygon(0 0, ${100 - notchPct}% 0, 100% 50%, ${100 - notchPct}% 100%, 0 100%)`,
          background: element.fill, color: element.color,
          display: 'flex', alignItems: 'center', gap: 6,
          paddingLeft: 10, paddingRight: `${notchPct + 4}%`,
          boxShadow: METALLIC_INSET, filter: glow }}>
          {inner}
        </div>
      );
    }

    if (variant === 'typeHex') {
      return (
        <div style={{ ...wrapperStyle, background: element.fill, color: element.color,
          clipPath: 'polygon(12% 0, 88% 0, 100% 50%, 88% 100%, 12% 100%, 0 50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          paddingInline: '16%', filter: glow }}>
          {inner}
        </div>
      );
    }

    if (variant === 'typeShield') {
      return (
        <div style={{ ...wrapperStyle, background: element.fill, color: element.color,
          clipPath: 'polygon(50% 0%, 100% 18%, 100% 65%, 50% 100%, 0% 65%, 0% 18%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 2, paddingTop: '14%', filter: glow }}>
          {element.symbol ? (
            <span style={{ fontFamily: element.symbolFontFamily || undefined, fontSize: element.symbolFontSize ?? element.fontSize, lineHeight: 1 }}>{element.symbol}</span>
          ) : null}
          <span style={{ fontFamily: element.labelFontFamily || undefined, color: element.labelColor ?? element.color, fontSize: element.labelFontSize ?? element.fontSize * 0.62, fontWeight: 700,
            letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center', lineHeight: 1 }}>
            {element.label}
          </span>
        </div>
      );
    }

    // typeBanner — ribbon with indent on both ends
    return (
      <div style={{ ...wrapperStyle, position: 'relative', overflow: 'hidden',
        clipPath: 'polygon(0 50%, 8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%)',
        background: element.fill, color: element.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingInline: '12%', boxShadow: METALLIC_INSET, filter: glow }}>
        {/* top accent line */}
        <div style={{ position: 'absolute', top: '20%', left: '10%', right: '10%',
          height: 1, background: accent, opacity: 0.4 }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', right: '10%',
          height: 1, background: accent, opacity: 0.4 }} />
        {inner}
      </div>
    );
  }

  const clipPath =
    variant === 'diamond'
      ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'
      : variant === 'notch'
        ? 'polygon(0 0, 92% 0, 100% 50%, 92% 100%, 0 100%, 8% 50%)'
        : variant === 'crest'
          ? 'polygon(50% 0, 92% 18%, 82% 82%, 50% 100%, 18% 82%, 8% 18%)'
          : undefined;
  const borderRadius =
    variant === 'tag'
      ? '18px 999px 999px 18px'
      : variant === 'tabLeft'
        ? '0 999px 999px 0'
      : variant === 'miniCard'
        ? 10
      : variant === 'plate' || variant === 'slash'
        ? 12
        : variant === 'ruleDot'
          ? 8
          : 999;

  // ⑨ Metallic gradients for plate/slash, glow for crest
  const background =
    variant === 'plate'
      ? `linear-gradient(145deg, rgba(255,255,255,0.12) 0%, ${element.fill} 28%, rgba(255,255,255,0.22) 50%, ${element.fill} 72%, rgba(0,0,0,0.18) 100%)`
      : variant === 'slash'
        ? `linear-gradient(105deg, transparent 0 10%, rgba(0,0,0,0.16) 10% 22%, ${element.fill} 22% 78%, rgba(255,255,255,0.18) 78% 88%, transparent 88% 100%)`
        : variant === 'crest'
        ? `linear-gradient(145deg, rgba(255,255,255,0.2) 0%, ${element.fill} 32%, rgba(0,0,0,0.24))`
          : variant === 'tabLeft'
            ? `linear-gradient(90deg, ${element.accentColor ?? accent} 0 10px, ${element.fill} 10px 100%)`
          : variant === 'miniCard'
            ? `linear-gradient(180deg, ${element.fill} 0 72%, color-mix(in srgb, ${element.accentColor ?? accent} 16%, ${element.fill}) 72% 100%)`
          : variant === 'pip'
            ? 'transparent'
            : element.fill;

  const extraFilter = element.glowEnabled === true
    ? variant === 'crest'
      ? glowFilter(element.glowColor ?? element.fill, glowSize(element, 7))
      : variant === 'plate'
        ? glowFilter(element.glowColor ?? element.fill, glowSize(element, 4))
        : undefined
    : undefined;

  return (
    <div
      style={{
        ...wrapperStyle,
        borderRadius,
        clipPath,
        background,
        color: element.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        border: clipPath || variant === 'pip' ? 'none' : '1px solid rgba(255,255,255,0.16)',
        boxSizing: 'border-box',
        fontWeight: 700,
        letterSpacing: 0.6,
        // ⑨ Metallic inset on plate/slash/tag
        boxShadow:
          variant === 'plate' || variant === 'slash' || variant === 'tag'
            ? METALLIC_INSET
            : undefined,
        filter: extraFilter,
      }}
    >
      {variant === 'pip' ? (
        <>
          {[0, 1, 2].map((item) => (
            <span
              key={item}
              style={{
                width: element.fontSize * 0.85,
                height: element.fontSize * 0.85,
                borderRadius: '50%',
                background: element.fill,
                border: '1px solid rgba(255,255,255,0.24)',
                boxShadow: '0 6px 12px rgba(0,0,0,0.2)',
              }}
            />
          ))}
        </>
      ) : variant === 'ruleDot' ? (
        <>
          <span style={{ fontFamily: element.symbolFontFamily || undefined, fontSize: element.symbolFontSize ?? element.fontSize * 1.25, lineHeight: 1 }}>?</span>
          <span style={{ fontFamily: element.labelFontFamily || undefined, color: element.labelColor ?? element.color, fontSize: element.labelFontSize ?? element.fontSize * 0.8 }}>{element.label || element.symbol}</span>
        </>
      ) : (
        <>
          <span style={{ fontFamily: element.symbolFontFamily || undefined, fontSize: element.symbolFontSize ?? element.fontSize }}>{element.symbol}</span>
          <span style={{ fontFamily: element.labelFontFamily || undefined, color: element.labelColor ?? element.color, fontSize: element.labelFontSize ?? element.fontSize * 0.8 }}>{element.label}</span>
        </>
      )}
    </div>
  );
}

// ─── BarView ──────────────────────────────────────────────────────────────────

function BarView({
  element,
  wrapperStyle,
}: {
  element: BarElement;
  wrapperStyle: CSSProperties;
}) {
  const variant = element.variant ?? 'standard';
  const safeMaxValue = Math.max(element.maxValue, 1);
  const clampedValue = Math.max(0, Math.min(element.value, safeMaxValue));
  const pct = (clampedValue / safeMaxValue) * 100;
  const isNeon = variant === 'neon';
  const formattedValue = Number.isInteger(clampedValue) ? clampedValue : clampedValue.toFixed(1);
  const formattedMaxValue = Number.isInteger(safeMaxValue) ? safeMaxValue : safeMaxValue.toFixed(1);

  // ④ Segmented variant — discrete blocks
  if (variant === 'segments') {
    const totalSegments = Math.max(1, Math.round(safeMaxValue));
    const filledCount = Math.round((clampedValue / safeMaxValue) * totalSegments);
    return (
      <div
        style={{
          ...wrapperStyle,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          justifyContent: 'center',
        }}
      >
        {element.label ? (
          <div
            style={{
              color: element.color,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              fontFamily: 'Bebas Neue',
              textShadow: '0 1px 6px rgba(0,0,0,0.8)',
            }}
          >
            {element.label}
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: totalSegments }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 28,
                borderRadius: element.radius,
                background: i < filledCount ? element.fill : element.trackColor,
                boxShadow:
                  i < filledCount
                    ? `0 0 8px ${element.accentColor}88, ${METALLIC_INSET}`
                    : 'inset 0 1px 0 rgba(255,255,255,0.06)',
              }}
            />
          ))}
        </div>
        {element.showValues ? (
          <div
            style={{
              color: element.color,
              fontSize: 16,
              fontWeight: 600,
              opacity: 0.8,
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            }}
          >
            {formattedValue}/{formattedMaxValue}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      style={{
        ...wrapperStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        justifyContent: 'center',
        // ① Glow (user-controlled; always active for neon variant by default)
        filter: element.glowEnabled === true ? glowFilter(element.glowColor ?? element.fill, glowSize(element, 12)) : undefined,
      }}
    >
      {element.label ? (
        <div
          style={{
            color: element.color,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            fontFamily: 'Bebas Neue',
            textShadow: '0 1px 6px rgba(0,0,0,0.8)',
          }}
        >
          {element.label}
        </div>
      ) : null}
      <div
        style={{
          position: 'relative',
          background: element.trackColor,
          borderRadius: element.radius,
          overflow: 'hidden',
          height: 28,
          border: isNeon ? `1px solid ${element.fill}55` : '1px solid rgba(255,255,255,0.1)',
          boxShadow: isNeon
            ? `inset 0 0 10px rgba(0,0,0,0.55)`
            : 'inset 0 2px 4px rgba(0,0,0,0.32)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background:
              variant === 'gradient'
                ? `linear-gradient(90deg, #ef4444, #eab308 50%, #22c55e)`
                : isNeon
                  ? `linear-gradient(90deg, ${element.fill}, ${element.accentColor})`
                  : element.fill,
            borderRadius: element.radius,
            position: 'relative',
            boxShadow: `${METALLIC_INSET}`,
          }}
        >
          {/* Inner shine strip */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '48%',
              borderRadius: element.radius,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.25), transparent)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
      {element.showValues ? (
        <div
          style={{
            color: element.color,
            fontSize: 16,
            fontWeight: 600,
            opacity: 0.88,
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}
        >
          {formattedValue}/{formattedMaxValue}
        </div>
      ) : null}
    </div>
  );
}

// ─── TitleView ────────────────────────────────────────────────────────────────

function TitleView({
  element,
  wrapperStyle,
}: {
  element: TitleElement;
  wrapperStyle: CSSProperties;
}) {
  const w = element.width;
  const h = element.height;
  const { variant, text, subtitle, color, accentColor, fill, fontFamily, fontSize,
          fontWeight, align, letterSpacing, textTransform, radius } = element;

  const glow = element.glowEnabled === true
    ? glowFilter(element.glowColor ?? accentColor, glowSize(element, 10))
    : undefined;

  const flexAlign = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  const displayFontSize = Math.min(fontSize, Math.max(12, subtitle ? h * 0.42 : h * 0.62));
  const subtitleFontSize = Math.min(Math.max(9, Math.round(displayFontSize * 0.38)), Math.max(9, h * 0.18));

  const titleSt: CSSProperties = {
    fontFamily: fontFamily || undefined,
    fontSize: displayFontSize,
    fontWeight,
    color,
    letterSpacing: letterSpacing ? `${letterSpacing}px` : undefined,
    textTransform: textTransform || undefined,
    textAlign: align,
    lineHeight: 1,
    position: 'relative',
    zIndex: 1,
    width: '100%',
  };

  const subSt: CSSProperties = {
    fontFamily: element.subtitleFontFamily || fontFamily || undefined,
    fontSize: element.subtitleFontSize ?? subtitleFontSize,
    fontWeight: element.subtitleFontWeight ?? 400,
    color: element.subtitleColor ?? color,
    letterSpacing: element.subtitleLetterSpacing !== undefined ? `${element.subtitleLetterSpacing}px` : '0.18em',
    textTransform: 'uppercase',
    textAlign: align,
    opacity: 0.72,
    position: 'relative',
    zIndex: 1,
    lineHeight: 1.05,
    width: '100%',
  };

  const baseWrap: CSSProperties = {
    ...wrapperStyle,
    width: w,
    height: h,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: flexAlign,
    justifyContent: 'center',
    overflow: 'hidden',
    filter: [wrapperStyle.filter, glow].filter(Boolean).join(' ') || undefined,
  };

  const contentPad = (hPad: number): CSSProperties => ({
    paddingInline: hPad,
    display: 'flex',
    flexDirection: 'column',
    alignItems: flexAlign,
    gap: subtitle ? 3 : 0,
    width: '100%',
    boxSizing: 'border-box',
  });

  // ── nameplate ──────────────────────────────────────────────
  if (variant === 'nameplate') {
    const rv = Math.max(3, Math.min(8, h * 0.09));
    const pad = rv * 2.8;
    return (
      <div style={{ ...baseWrap, borderRadius: radius, background: fill,
        border: `2px solid ${accentColor}`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.35)` }}>
        {/* bevel overlay */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, transparent 55%, rgba(0,0,0,0.22) 100%)' }} />
        {/* corner rivets */}
        {([
          { left: pad, top: pad },
          { right: pad, top: pad },
          { left: pad, bottom: pad },
          { right: pad, bottom: pad },
        ] as CSSProperties[]).map((pos, i) => (
          <div key={i} style={{
            position: 'absolute', ...pos,
            width: rv * 2, height: rv * 2, borderRadius: '50%',
            background: `radial-gradient(circle at 36% 32%, ${accentColor}cc, ${accentColor} 50%, rgba(0,0,0,0.55) 100%)`,
            boxShadow: `0 1px 3px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.3)`,
          }} />
        ))}
        <div style={contentPad(pad * 2 + rv * 2)}>
          <div style={titleSt}>{text}</div>
          {subtitle && <div style={subSt}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  // ── banner ─────────────────────────────────────────────────
  if (variant === 'banner') {
    const notch = Math.max(12, h * 0.36);
    const pts = `${notch},0 ${w - notch},0 ${w},${h / 2} ${w - notch},${h} ${notch},${h} 0,${h / 2}`;
    return (
      <div style={{ ...baseWrap }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
          <defs>
            <linearGradient id="bnrShine" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.2)" />
              <stop offset="50%"  stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
            </linearGradient>
          </defs>
          <polygon points={pts} fill={fill} />
          <polygon points={pts} fill="url(#bnrShine)" />
          <polygon points={pts} fill="none" stroke={accentColor} strokeWidth={1.5} />
          {/* inner accent lines */}
          <line x1={notch + 6} y1={h * 0.18} x2={w - notch - 6} y2={h * 0.18} stroke={accentColor} strokeWidth={0.8} opacity={0.5} />
          <line x1={notch + 6} y1={h * 0.82} x2={w - notch - 6} y2={h * 0.82} stroke={accentColor} strokeWidth={0.8} opacity={0.5} />
        </svg>
        <div style={contentPad(notch + 14)}>
          <div style={titleSt}>{text}</div>
          {subtitle && <div style={subSt}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  // ── scroll ─────────────────────────────────────────────────
  if (variant === 'scroll') {
    const rollH = Math.max(8, Math.min(14, h * 0.16));
    return (
      <div style={{ ...baseWrap, background: fill, borderRadius: radius }}>
        {/* top roll */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: rollH,
          background: `linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 60%, transparent 100%)`,
          borderBottom: `1px solid ${accentColor}55` }} />
        {/* bottom roll */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: rollH,
          background: `linear-gradient(0deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.05) 60%, transparent 100%)`,
          borderTop: `1px solid ${accentColor}55` }} />
        {/* side edge shadows */}
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.1) 0%, transparent 12%, transparent 88%, rgba(0,0,0,0.1) 100%)' }} />
        {/* outer border */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit',
          boxShadow: `inset 0 0 0 1.5px ${accentColor}66` }} />
        <div style={{ ...contentPad(18), paddingBlock: Math.max(6, h * 0.08), gap: subtitle ? 1 : 0 } as CSSProperties}>
          <div style={titleSt}>{text}</div>
          {subtitle && <div style={subSt}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  // ── arcane ─────────────────────────────────────────────────
  if (variant === 'arcane') {
    const cx = w / 2;
    const cy = h / 2;
    const ringR = Math.min(cx - 4, cy - 4);
    const dotCount = 16;
    const dots = Array.from({ length: dotCount }, (_, i) => {
      const a = (i / dotCount) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + ringR * Math.cos(a), y: cy + ringR * Math.sin(a), i };
    });
    return (
      <div style={{ ...baseWrap, background: fill }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}
          style={{ position: 'absolute', inset: 0, opacity: 0.55 }}>
          {/* outer ring */}
          <circle cx={cx} cy={cy} r={ringR} fill="none" stroke={accentColor} strokeWidth={1} strokeDasharray="5 7" />
          {/* inner ring */}
          <circle cx={cx} cy={cy} r={ringR * 0.78} fill="none" stroke={accentColor} strokeWidth={0.6} opacity={0.4} />
          {/* dot ornaments on outer ring */}
          {dots.map(({ x, y, i: di }) => (
            <circle key={di} cx={x} cy={y} r={di % 4 === 0 ? 3 : 1.8} fill={accentColor} />
          ))}
          {/* cross lines */}
          <line x1={cx - ringR * 0.6} y1={cy} x2={cx + ringR * 0.6} y2={cy} stroke={accentColor} strokeWidth={0.5} opacity={0.3} />
          <line x1={cx} y1={cy - ringR * 0.6} x2={cx} y2={cy + ringR * 0.6} stroke={accentColor} strokeWidth={0.5} opacity={0.3} />
        </svg>
        <div style={contentPad(24)}>
          <div style={{ ...titleSt, textShadow: `0 0 18px ${accentColor}` }}>{text}</div>
          {subtitle && <div style={{ ...subSt, color: accentColor, opacity: 0.85 }}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  // ── minimal ────────────────────────────────────────────────
  if (variant === 'minimal') {
    const lineBottom = subtitle ? 1 : Math.max(3, h * 0.08);
    return (
      <div style={{ ...baseWrap }}>
        <div style={{ ...contentPad(14), transform: subtitle ? 'translateY(-5px)' : undefined }}>
          <div style={titleSt}>{text}</div>
          {subtitle && <div style={subSt}>{subtitle}</div>}
        </div>
        {/* decorative underline with center diamond */}
        <div style={{ position: 'absolute', bottom: lineBottom, left: 20, right: 20,
          height: 1.5, opacity: 0.85, background: `linear-gradient(90deg, transparent, ${accentColor} 20%, ${accentColor} 80%, transparent)` }} />
        {!subtitle && <div style={{ position: 'absolute', bottom: lineBottom - 4.5, left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: 10, height: 10, background: accentColor }} />}
      </div>
    );
  }

  // ── epic ───────────────────────────────────────────────────
  if (variant === 'epic') {
    return (
      <div style={{ ...baseWrap, borderRadius: radius,
        background: `linear-gradient(135deg, ${fill} 0%, color-mix(in srgb, ${accentColor} 30%, ${fill}) 100%)` }}>
        {/* left accent bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: accentColor }} />
        <div style={{ position: 'absolute', left: 5, top: '15%', bottom: '15%', width: 1, background: accentColor, opacity: 0.35 }} />
        {/* top edge highlight */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `${accentColor}66` }} />
        <div style={contentPad(22)}>
          <div style={{ ...titleSt, textShadow: `0 2px 20px rgba(0,0,0,0.8), 0 0 30px ${accentColor}55` }}>{text}</div>
          {subtitle && <div style={{ ...subSt, color: accentColor, opacity: 0.85 }}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  // ── gothic ─────────────────────────────────────────────────
  if (variant === 'gothic') {
    const archPct = 30;
    return (
      <div style={{ ...baseWrap, background: fill,
        clipPath: `polygon(0% 100%, 0% ${archPct}%, 50% 0%, 100% ${archPct}%, 100% 100%)` }}>
        {/* bevel */}
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.3) 100%)' }} />
        {/* arch border SVG */}
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0 }}>
          <polyline
            points={`0,${h} 0,${h * archPct / 100} ${w / 2},0 ${w},${h * archPct / 100} ${w},${h}`}
            fill="none" stroke={accentColor} strokeWidth={2} />
          {/* inner arch */}
          <polyline
            points={`8,${h} 8,${h * archPct / 100 + 6} ${w / 2},${10} ${w - 8},${h * archPct / 100 + 6} ${w - 8},${h}`}
            fill="none" stroke={accentColor} strokeWidth={0.7} opacity={0.4} />
        </svg>
        <div style={{ ...contentPad(18), paddingTop: h * archPct / 100 + 4 } as CSSProperties}>
          <div style={{ ...titleSt, textShadow: `0 0 14px ${accentColor}88` }}>{text}</div>
          {subtitle && <div style={subSt}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  // ── laurel ─────────────────────────────────────────────────
  if (variant === 'laurel') {
    const ornW = Math.min(h * 1.1, 44);
    const leafColor = accentColor;
    return (
      <div style={{ ...baseWrap }}>
        {/* left laurel */}
        <svg width={ornW} height={h} viewBox="0 0 44 60"
          style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', opacity: 0.85 }}>
          <g fill={leafColor}>
            <ellipse cx="28" cy="10" rx="11" ry="5" transform="rotate(-35 28 10)" />
            <ellipse cx="22" cy="20" rx="11" ry="5" transform="rotate(-52 22 20)" />
            <ellipse cx="17" cy="32" rx="11" ry="5" transform="rotate(-68 17 32)" />
            <ellipse cx="15" cy="45" rx="10" ry="4.5" transform="rotate(-78 15 45)" />
            <ellipse cx="16" cy="56" rx="8"  ry="3.5" transform="rotate(-85 16 56)" />
          </g>
          {/* stem */}
          <path d="M30 5 Q24 30 18 58" fill="none" stroke={leafColor} strokeWidth={1.2} opacity={0.5} />
        </svg>
        {/* right laurel (mirrored) */}
        <svg width={ornW} height={h} viewBox="0 0 44 60"
          style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%) scaleX(-1)', opacity: 0.85 }}>
          <g fill={leafColor}>
            <ellipse cx="28" cy="10" rx="11" ry="5" transform="rotate(-35 28 10)" />
            <ellipse cx="22" cy="20" rx="11" ry="5" transform="rotate(-52 22 20)" />
            <ellipse cx="17" cy="32" rx="11" ry="5" transform="rotate(-68 17 32)" />
            <ellipse cx="15" cy="45" rx="10" ry="4.5" transform="rotate(-78 15 45)" />
            <ellipse cx="16" cy="56" rx="8"  ry="3.5" transform="rotate(-85 16 56)" />
          </g>
          <path d="M30 5 Q24 30 18 58" fill="none" stroke={leafColor} strokeWidth={1.2} opacity={0.5} />
        </svg>
        <div style={contentPad(ornW + 10)}>
          <div style={titleSt}>{text}</div>
          {subtitle && <div style={subSt}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  // ── inset ──────────────────────────────────────────────────
  if (variant === 'inset') {
    return (
      <div style={{ ...baseWrap, borderRadius: radius, background: fill,
        boxShadow: `inset 0 3px 10px rgba(0,0,0,0.7), inset 0 -1px 0 rgba(255,255,255,0.07)`,
        border: `1px solid rgba(255,255,255,0.07)` }}>
        {/* scan lines */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit',
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px)' }} />
        {/* top highlight */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        {/* bottom accent bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: accentColor, opacity: 0.8 }} />
        {/* left accent */}
        <div style={{ position: 'absolute', left: 0, top: '10%', bottom: '10%', width: 2, background: accentColor, opacity: 0.5 }} />
        <div style={contentPad(14)}>
          <div style={{ ...titleSt, textShadow: `0 0 16px ${accentColor}99` }}>{text}</div>
          {subtitle && <div style={{ ...subSt, color: accentColor, opacity: 1, letterSpacing: '0.22em' }}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  // ── stamp ──────────────────────────────────────────────────
  if (variant === 'stamp') {
    return (
      <div style={{ ...baseWrap, borderRadius: radius, background: fill,
        border: `3px dashed ${accentColor}`,
        outline: `1px solid ${accentColor}44`,
        outlineOffset: '-6px' }}>
        {/* diagonal hatching */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 'inherit',
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.025) 5px, rgba(0,0,0,0.025) 6px)' }} />
        {/* corner marks */}
        {([
          { top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, left: 6 }, { bottom: 6, right: 6 },
        ] as CSSProperties[]).map((pos, i) => (
          <div key={i} style={{ position: 'absolute', ...pos,
            width: 8, height: 8, borderRadius: '50%',
            background: `${accentColor}88` }} />
        ))}
        <div style={contentPad(16)}>
          <div style={{ ...titleSt, textShadow: `1px 1px 0 ${accentColor}55` }}>{text}</div>
          {subtitle && <div style={subSt}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  // ── fallback ────────────────────────────────────────────────
  if (variant === 'chapterTitle') {
    return (
      <div style={{ ...baseWrap, borderRadius: radius, background: fill,
        border: `1px solid ${accentColor}77`, boxShadow: METALLIC_INSET }}>
        <div style={{ position: 'absolute', left: 12, right: 12, top: 3, height: 1.5, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 3, height: 1.5, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
        <div style={{ ...contentPad(24), gap: subtitle ? 1 : 0 }}>
          <div style={titleSt}>{text}</div>
          {subtitle && <div style={{ ...subSt, color: accentColor, opacity: 0.85 }}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  if (variant === 'glassTab') {
    return (
      <div style={{ ...baseWrap, borderRadius: radius,
        background: `linear-gradient(135deg, ${fill}, rgba(255,255,255,0.12))`,
        border: '1px solid rgba(255,255,255,0.26)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 14px 24px rgba(0,0,0,0.22)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, background: accentColor }} />
        <div style={contentPad(22)}>
          <div style={titleSt}>{text}</div>
          {subtitle && <div style={{ ...subSt, color: accentColor }}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  if (variant === 'questTitle') {
    return (
      <div style={{ ...baseWrap, borderRadius: radius, background: fill,
        border: `2px solid ${accentColor}`, boxShadow: METALLIC_INSET }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: h * 0.48,
          clipPath: 'polygon(0 0, 100% 50%, 0 100%)', background: accentColor }} />
        <div style={{ position: 'absolute', right: 10, top: 10, bottom: 10, width: 2, background: `${accentColor}88` }} />
        <div style={{ ...contentPad(Math.max(28, h * 0.34)), transform: subtitle ? 'translateY(-2px)' : undefined }}>
          <div style={titleSt}>{text}</div>
          {subtitle && <div style={subSt}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...baseWrap, borderRadius: radius, background: fill }}>
      <div style={contentPad(14)}>
        <div style={titleSt}>{text}</div>
        {subtitle && <div style={subSt}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── PortraitView ─────────────────────────────────────────────────────────────

function PortraitView({
  element,
  wrapperStyle,
}: {
  element: PortraitElement;
  wrapperStyle: CSSProperties;
}) {
  const { variant, src, focalX, focalY, strokeColor, strokeWidth, accentColor, shadow } = element;
  const w = element.width;

  const glow = element.glowEnabled === true
    ? glowFilter(element.glowColor ?? accentColor, glowSize(element, 12))
    : undefined;

  const shadowFilter = shadow > 0
    ? `drop-shadow(0 ${shadow * 0.4}px ${shadow}px rgba(0,0,0,0.55))`
    : undefined;

  const clipPath =
    variant === 'hex'
      ? 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)'
      : variant === 'diamond'
        ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
        : variant === 'shield'
          ? 'polygon(50% 0%, 100% 18%, 100% 65%, 50% 100%, 0% 65%, 0% 18%)'
          : undefined;

  const borderRadius: string | number =
    variant === 'circle' || variant === 'oval' ? '50%'
      : variant === 'arch' ? `${Math.round(w / 2)}px ${Math.round(w / 2)}px 10px 10px`
        : variant === 'plain' || variant === 'frame' ? 8
          : 0;

  const outerSt: CSSProperties = {
    ...wrapperStyle,
    position: 'relative',
    borderRadius,
    clipPath,
    overflow: 'hidden',
    filter: [glow, shadowFilter].filter(Boolean).join(' ') || undefined,
  };

  // ── placeholder SVG ──
  const placeholder = (
    <div style={{
      width: '100%', height: '100%',
      background: `linear-gradient(160deg, color-mix(in srgb, ${accentColor} 12%, transparent), color-mix(in srgb, ${accentColor} 30%, #1e293b))`,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 0,
    }}>
      <svg viewBox="0 0 100 130" width="55%" height="55%"
        style={{ opacity: 0.55 }}>
        {/* head */}
        <circle cx="50" cy="34" r="22" fill={accentColor} />
        {/* neck */}
        <rect x="43" y="54" width="14" height="10" rx="4" fill={accentColor} />
        {/* shoulders / body */}
        <path d="M5 130 Q5 88 24 76 Q35 68 50 66 Q65 68 76 76 Q95 88 95 130Z" fill={accentColor} />
        {/* subtle specular on head */}
        <ellipse cx="42" cy="26" rx="8" ry="6" fill="rgba(255,255,255,0.22)" />
      </svg>
      <div style={{ fontSize: Math.max(10, w * 0.065), fontWeight: 700, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: accentColor, opacity: 0.6, marginTop: -4 }}>
        Retrato
      </div>
    </div>
  );

  return (
    <div style={outerSt}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover',
            objectPosition: `${focalX}% ${focalY}%`, display: 'block' }} />
        : placeholder
      }

      {/* stroke ring overlay */}
      {strokeWidth > 0 ? (
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius,
          border: `${strokeWidth}px solid ${strokeColor}`,
          pointerEvents: 'none', zIndex: 2,
          boxShadow: METALLIC_INSET,
        }} />
      ) : null}

      {/* extra inner accent border for 'frame' */}
      {variant === 'frame' ? (
        <>
          <div style={{ position: 'absolute', inset: strokeWidth + 4, borderRadius: 4,
            border: `1px solid ${accentColor}88`, pointerEvents: 'none', zIndex: 3 }} />
          <div style={{ position: 'absolute', inset: strokeWidth + 8, borderRadius: 2,
            border: `1px solid ${accentColor}44`, pointerEvents: 'none', zIndex: 3 }} />
          {/* corner ornaments */}
          {([
            { top: strokeWidth + 2,  left:  strokeWidth + 2  },
            { top: strokeWidth + 2,  right: strokeWidth + 2  },
            { bottom: strokeWidth + 2, left: strokeWidth + 2 },
            { bottom: strokeWidth + 2, right: strokeWidth + 2 },
          ] as CSSProperties[]).map((pos, i) => (
            <div key={i} style={{ position: 'absolute', ...pos, width: 10, height: 10,
              border: `2px solid ${accentColor}`, pointerEvents: 'none', zIndex: 4 }} />
          ))}
        </>
      ) : null}

      {/* arch variant: inner arch accent line */}
      {variant === 'arch' ? (
        <div style={{ position: 'absolute', top: strokeWidth + 3,
          left: strokeWidth + 6, right: strokeWidth + 6,
          height: `${Math.round(w / 2) - strokeWidth - 3}px`,
          borderRadius: `${Math.round(w / 2)}px ${Math.round(w / 2)}px 0 0`,
          border: `1px solid ${accentColor}66`, borderBottom: 'none',
          pointerEvents: 'none', zIndex: 3 }} />
      ) : null}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SeparatorView({
  element,
  wrapperStyle,
}: {
  element: SeparatorElement;
  wrapperStyle: CSSProperties;
}) {
  const w = element.width;
  const h = element.height;
  const mid = h / 2;
  const variant = element.variant ?? 'ornament';
  const glow = element.glowEnabled === true ? glowFilter(element.glowColor ?? element.lineColor, glowSize(element, 8)) : undefined;
  const dash = element.dash > 0 ? `${element.dash} ${Math.max(4, element.dash * 0.72)}` : undefined;
  const cap = Math.max(2, element.thickness);
  const ornament = Math.max(0, element.ornamentSize);
  const cx = w / 2;

  if (variant === 'ribbon') {
    const notch = Math.min(26, w * 0.06);
    return (
      <div style={{ ...wrapperStyle, filter: glow }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
          <polygon
            points={`${notch},${mid - cap} ${w - notch},${mid - cap} ${w},${mid} ${w - notch},${mid + cap} ${notch},${mid + cap} 0,${mid}`}
            fill={element.lineColor}
            stroke={element.accentColor}
            strokeWidth={1.2}
          />
          <line x1={notch + 12} y1={mid} x2={w - notch - 12} y2={mid} stroke={element.accentColor} strokeWidth={1} opacity={0.7} />
        </svg>
      </div>
    );
  }

  if (variant === 'tech') {
    return (
      <div style={{ ...wrapperStyle, filter: glow }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
          <line x1={0} y1={mid} x2={w} y2={mid} stroke={element.lineColor} strokeWidth={element.thickness} strokeDasharray={dash} />
          <path d={`M0 ${mid - 10} H${w * 0.16} L${w * 0.22} ${mid} H${w * 0.78} L${w * 0.84} ${mid + 10} H${w}`} fill="none" stroke={element.accentColor} strokeWidth={1.4} />
          <rect x={w * 0.5 - ornament / 2} y={mid - ornament / 2} width={ornament} height={ornament} fill={element.lineColor} stroke={element.accentColor} strokeWidth={1} transform={`rotate(45 ${w * 0.5} ${mid})`} />
        </svg>
      </div>
    );
  }

  if (variant === 'chain') {
    const count = Math.max(4, Math.floor(w / Math.max(22, ornament * 1.45)));
    const gap = w / count;
    return (
      <div style={{ ...wrapperStyle, filter: glow }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
          {Array.from({ length: count }, (_, index) => {
            const x = gap * index + gap / 2;
            return (
              <ellipse
                key={index}
                cx={x}
                cy={mid}
                rx={Math.max(8, ornament * 0.55)}
                ry={Math.max(4, ornament * 0.28)}
                fill="none"
                stroke={index % 2 === 0 ? element.lineColor : element.accentColor}
                strokeWidth={element.thickness}
                transform={`rotate(${index % 2 === 0 ? -18 : 18} ${x} ${mid})`}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'stars') {
    const count = Math.max(5, Math.floor(w / Math.max(28, ornament * 1.8)));
    const gap = w / (count - 1);
    return (
      <div style={{ ...wrapperStyle, filter: glow }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
          <line x1={0} y1={mid} x2={w} y2={mid} stroke={element.lineColor} strokeWidth={element.thickness} opacity={0.42} />
          {Array.from({ length: count }, (_, index) => {
            const x = gap * index;
            const size = index === Math.floor(count / 2) ? ornament * 0.85 : ornament * 0.55;
            return (
              <polygon
                key={index}
                points={starPointsStr(x, mid, size, size * 0.42, 5)}
                fill={index === Math.floor(count / 2) ? element.accentColor : element.lineColor}
                stroke={element.accentColor}
                strokeWidth={0.7}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'wave') {
    const amp = Math.max(4, ornament * 0.35);
    const step = Math.max(28, ornament * 2.2);
    const segments = Math.ceil(w / step);
    const wavePath = Array.from({ length: segments }, (_, index) => {
      const start = index * step;
      return `C${start + step * 0.25} ${mid - amp}, ${start + step * 0.25} ${mid + amp}, ${start + step * 0.5} ${mid} C${start + step * 0.75} ${mid - amp}, ${start + step * 0.75} ${mid + amp}, ${start + step} ${mid}`;
    }).join(' ');
    return (
      <div style={{ ...wrapperStyle, filter: glow }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
          <path d={`M0 ${mid} ${wavePath}`} fill="none" stroke={element.lineColor} strokeWidth={element.thickness} strokeLinecap="round" />
          <path d={`M0 ${mid + amp * 0.7} ${wavePath}`} fill="none" stroke={element.accentColor} strokeWidth={1} opacity={0.65} strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (variant === 'slashes') {
    const count = Math.max(6, Math.floor(w / Math.max(18, ornament)));
    const gap = w / count;
    return (
      <div style={{ ...wrapperStyle, filter: glow }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
          <line x1={0} y1={mid} x2={w} y2={mid} stroke={element.accentColor} strokeWidth={1} opacity={0.55} />
          {Array.from({ length: count }, (_, index) => {
            const x = gap * index + gap / 2;
            return (
              <line
                key={index}
                x1={x - ornament * 0.34}
                y1={mid + ornament * 0.55}
                x2={x + ornament * 0.34}
                y2={mid - ornament * 0.55}
                stroke={index % 3 === 1 ? element.accentColor : element.lineColor}
                strokeWidth={element.thickness}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'brackets') {
    const size = Math.max(12, ornament);
    return (
      <div style={{ ...wrapperStyle, filter: glow }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
          <path d={`M${size} ${mid - size * 0.7} H0 V${mid + size * 0.7} H${size}`} fill="none" stroke={element.accentColor} strokeWidth={element.thickness} strokeLinejoin="round" />
          <path d={`M${w - size} ${mid - size * 0.7} H${w} V${mid + size * 0.7} H${w - size}`} fill="none" stroke={element.accentColor} strokeWidth={element.thickness} strokeLinejoin="round" />
          <line x1={size * 1.45} y1={mid} x2={w - size * 1.45} y2={mid} stroke={element.lineColor} strokeWidth={element.thickness} strokeDasharray={dash} />
          <polygon points={`${cx},${mid - size * 0.55} ${cx + size * 0.55},${mid} ${cx},${mid + size * 0.55} ${cx - size * 0.55},${mid}`} fill={element.lineColor} stroke={element.accentColor} strokeWidth={1} />
        </svg>
      </div>
    );
  }

  if (variant === 'dots') {
    const count = Math.max(7, Math.floor(w / Math.max(16, ornament * 1.4)));
    const gap = w / (count - 1);
    return (
      <div style={{ ...wrapperStyle, filter: glow }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
          {Array.from({ length: count }, (_, index) => {
            const centerIndex = Math.floor(count / 2);
            const isCenter = index === centerIndex;
            const distance = Math.abs(index - centerIndex);
            return (
              <circle
                key={index}
                cx={gap * index}
                cy={mid}
                r={Math.max(2, ornament * (isCenter ? 0.42 : distance === 1 ? 0.28 : 0.2))}
                fill={isCenter ? element.accentColor : element.lineColor}
                opacity={Math.max(0.36, 1 - distance * 0.08)}
              />
            );
          })}
        </svg>
      </div>
    );
  }

  if (variant === 'scallop') {
    const radius = Math.max(8, ornament * 0.48);
    const count = Math.ceil(w / (radius * 1.65));
    return (
      <div style={{ ...wrapperStyle, filter: glow }}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
          <line x1={0} y1={mid} x2={w} y2={mid} stroke={element.accentColor} strokeWidth={1} opacity={0.48} />
          {Array.from({ length: count }, (_, index) => {
            const x = index * radius * 1.65;
            return (
              <path
                key={index}
                d={`M${x} ${mid} A${radius} ${radius} 0 0 1 ${x + radius * 1.65} ${mid}`}
                fill="none"
                stroke={element.lineColor}
                strokeWidth={element.thickness}
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div style={{ ...wrapperStyle, filter: glow }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {variant === 'double' ? (
          <>
            <line x1={0} y1={mid - cap * 1.6} x2={w} y2={mid - cap * 1.6} stroke={element.lineColor} strokeWidth={element.thickness} strokeDasharray={dash} />
            <line x1={0} y1={mid + cap * 1.6} x2={w} y2={mid + cap * 1.6} stroke={element.lineColor} strokeWidth={element.thickness} strokeDasharray={dash} />
          </>
        ) : (
          <line x1={0} y1={mid} x2={w} y2={mid} stroke={element.lineColor} strokeWidth={element.thickness} strokeDasharray={dash} />
        )}
        {variant === 'ornament' || variant === 'double' ? (
          <>
            <circle cx={w / 2} cy={mid} r={Math.max(3, ornament * 0.34)} fill={element.accentColor} />
            <polygon
              points={`${w / 2},${mid - ornament} ${w / 2 + ornament},${mid} ${w / 2},${mid + ornament} ${w / 2 - ornament},${mid}`}
              fill="none"
              stroke={element.lineColor}
              strokeWidth={1.5}
            />
            <circle cx={Math.max(ornament, w * 0.18)} cy={mid} r={Math.max(2, ornament * 0.18)} fill={element.accentColor} />
            <circle cx={Math.min(w - ornament, w * 0.82)} cy={mid} r={Math.max(2, ornament * 0.18)} fill={element.accentColor} />
          </>
        ) : null}
      </svg>
    </div>
  );
}

function DieView({
  element,
  wrapperStyle,
}: {
  element: DieElement;
  wrapperStyle: CSSProperties;
}) {
  const w = element.width;
  const h = element.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.43;
  const variant = element.variant ?? 'rounded';
  const glow = element.glowEnabled === true ? glowFilter(element.glowColor ?? element.accentColor, glowSize(element, 10)) : undefined;
  const sidesLabel = `D${element.sides}`;
  const valueY = element.showSides ? cy + element.fontSize * 0.25 : cy + element.fontSize * 0.36;
  const labelY = Math.min(h - 10, cy + r * 0.58);
  const pipValue = Number.parseInt(element.value, 10);
  const canShowPips = element.displayMode === 'pips' && pipValue >= 1 && pipValue <= 6;

  const polygonSides = element.sides === 4 ? 3 : element.sides === 6 ? 6 : element.sides === 8 ? 8 : element.sides === 10 ? 10 : element.sides === 12 ? 12 : 20;
  const poly = Array.from({ length: polygonSides }, (_, index) => {
    const angle = (index * (360 / polygonSides) - 90) * (Math.PI / 180);
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');

  return (
    <div style={{ ...wrapperStyle, display: 'grid', placeItems: 'center', filter: glow }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        {variant === 'flat' || variant === 'rounded' ? (
          <rect
            x={w * 0.08}
            y={h * 0.08}
            width={w * 0.84}
            height={h * 0.84}
            rx={variant === 'rounded' ? Math.min(w, h) * 0.18 : Math.min(w, h) * 0.05}
            fill={element.fill}
            stroke={element.accentColor}
            strokeWidth={3}
          />
        ) : (
          <polygon
            points={poly}
            fill={variant === 'outline' ? 'none' : element.fill}
            stroke={element.accentColor}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        )}
        {variant === 'gem' ? (
          <polygon points={`${cx},${cy - r} ${cx + r * 0.58},${cy - r * 0.28} ${cx},${cy} ${cx - r * 0.58},${cy - r * 0.28}`} fill="rgba(255,255,255,0.22)" />
        ) : null}
        {variant === 'rune' ? (
          <>
            <circle cx={cx} cy={cy} r={r * 0.72} fill="none" stroke={element.accentColor} strokeWidth={1} strokeDasharray="4 4" />
            <path d={`M${cx - r * 0.46} ${cy - r * 0.48} L${cx + r * 0.46} ${cy + r * 0.48} M${cx + r * 0.46} ${cy - r * 0.48} L${cx - r * 0.46} ${cy + r * 0.48}`} stroke={element.accentColor} strokeWidth={1.1} opacity={0.55} />
          </>
        ) : null}
        {canShowPips ? renderDiePips(pipValue, cx, cy - (element.showSides ? r * 0.08 : 0), r, element.color) : (
          <text
            x={cx}
            y={valueY}
            textAnchor="middle"
            fill={element.color}
            fontFamily={element.fontFamily}
            fontSize={element.fontSize}
            fontWeight={800}
            style={{ paintOrder: 'stroke', stroke: variant === 'outline' ? 'none' : 'rgba(0,0,0,0.16)', strokeWidth: 2 }}
          >
            {element.value}
          </text>
        )}
        {element.showSides ? (
          <text x={cx} y={labelY} textAnchor="middle" fill={element.color} opacity={0.72} fontFamily="Sora, sans-serif" fontSize={Math.max(9, element.fontSize * 0.24)} fontWeight={700} letterSpacing={1.4}>
            {sidesLabel}
          </text>
        ) : null}
      </svg>
    </div>
  );
}

function renderDiePips(value: number, cx: number, cy: number, r: number, color: string) {
  const spread = r * 0.44;
  const pipR = Math.max(4, r * 0.1);
  const positions = {
    center: [cx, cy],
    topLeft: [cx - spread, cy - spread],
    topRight: [cx + spread, cy - spread],
    midLeft: [cx - spread, cy],
    midRight: [cx + spread, cy],
    bottomLeft: [cx - spread, cy + spread],
    bottomRight: [cx + spread, cy + spread],
  } as const;

  const map: Record<number, Array<keyof typeof positions>> = {
    1: ['center'],
    2: ['topLeft', 'bottomRight'],
    3: ['topLeft', 'center', 'bottomRight'],
    4: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
    5: ['topLeft', 'topRight', 'center', 'bottomLeft', 'bottomRight'],
    6: ['topLeft', 'topRight', 'midLeft', 'midRight', 'bottomLeft', 'bottomRight'],
  };

  return (
    <g>
      {map[value].map((key) => {
        const [x, y] = positions[key];
        return (
          <circle
            key={key}
            cx={x}
            cy={y}
            r={pipR}
            fill={color}
            style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.26))' }}
          />
        );
      })}
    </g>
  );
}

function starPointsStr(cx: number, cy: number, outerR: number, innerR: number, numPoints: number): string {
  return Array.from({ length: numPoints * 2 }, (_, i) => {
    const angle = (i * (180 / numPoints) - 90) * (Math.PI / 180);
    const r = i % 2 === 0 ? outerR : innerR;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(' ');
}

function hexPoints(cx: number, cy: number, r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 - 30) * (Math.PI / 180);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}

// ─── CounterView ─────────────────────────────────────────────────────────────

function CounterView({
  element,
  wrapperStyle,
}: {
  element: CounterElement;
  wrapperStyle: CSSProperties;
}) {
  const { variant, value, maxValue, fill, emptyColor, accentColor, unitSize, gap, arrangement, columns } = element;
  const glow = element.glowEnabled === true ? glowFilter(element.glowColor ?? fill, glowSize(element, 8)) : undefined;

  const cols   = arrangement === 'grid' ? Math.max(1, columns) : maxValue;
  const rows   = arrangement === 'grid' ? Math.ceil(maxValue / Math.max(1, columns)) : 1;
  const totalW = cols * unitSize + (cols - 1) * gap;
  const totalH = rows * unitSize + (rows - 1) * gap;

  const renderUnit = (ux: number, uy: number, isFilled: boolean, idx: number) => {
    const cx  = ux + unitSize / 2;
    const cy  = uy + unitSize / 2;
    const r   = unitSize / 2 - 1.5;
    const sw  = 1.5;
    const f   = isFilled ? fill : 'none';
    const s   = isFilled ? accentColor : emptyColor;

    switch (variant) {
      case 'circles':
        return <circle key={idx} cx={cx} cy={cy} r={r} fill={f} stroke={s} strokeWidth={sw} />;

      case 'gems':
      case 'diamonds':
        return (
          <polygon key={idx}
            points={`${cx},${uy + 1.5} ${ux + unitSize - 1.5},${cy} ${cx},${uy + unitSize - 1.5} ${ux + 1.5},${cy}`}
            fill={f} stroke={s} strokeWidth={sw} />
        );

      case 'coins':
        return (
          <g key={idx}>
            <circle cx={cx} cy={cy} r={r}
              fill={isFilled ? fill : 'none'} stroke={s} strokeWidth={sw} />
            {isFilled && (
              <circle cx={cx - r * 0.22} cy={cy - r * 0.22} r={r * 0.38}
                fill="rgba(255,255,255,0.42)" />
            )}
          </g>
        );

      case 'hearts': {
        const s2 = unitSize;
        const hx = ux; const hy = uy;
        const d = `M${hx + s2 * 0.5},${hy + s2 * 0.82}
          C${hx + s2 * 0.5},${hy + s2 * 0.82} ${hx},${hy + s2 * 0.52}
          ${hx},${hy + s2 * 0.34}
          C${hx},${hy + s2 * 0.14} ${hx + s2 * 0.25},${hy + s2 * 0.06}
          ${hx + s2 * 0.5},${hy + s2 * 0.25}
          C${hx + s2 * 0.75},${hy + s2 * 0.06} ${hx + s2},${hy + s2 * 0.14}
          ${hx + s2},${hy + s2 * 0.34}
          C${hx + s2},${hy + s2 * 0.52} ${hx + s2 * 0.5},${hy + s2 * 0.82}
          ${hx + s2 * 0.5},${hy + s2 * 0.82}Z`;
        return <path key={idx} d={d} fill={f} stroke={s} strokeWidth={sw} strokeLinejoin="round" />;
      }

      case 'stars':
        return (
          <polygon key={idx}
            points={starPointsStr(cx, cy, r, r * 0.42, 5)}
            fill={f} stroke={s} strokeWidth={sw} />
        );

      case 'shields':
        return (
          <polygon key={idx}
            points={`${cx},${uy + 1.5} ${ux + unitSize - 1.5},${uy + unitSize * 0.28} ${ux + unitSize - 1.5},${uy + unitSize * 0.64} ${cx},${uy + unitSize - 1.5} ${ux + 1.5},${uy + unitSize * 0.64} ${ux + 1.5},${uy + unitSize * 0.28}`}
            fill={f} stroke={s} strokeWidth={sw} />
        );

      case 'crystals':
        return (
          <polygon key={idx}
            points={hexPoints(cx, cy, r)}
            fill={f} stroke={s} strokeWidth={sw} />
        );

      case 'checks':
        return (
          <g key={idx}>
            <rect x={ux + 2} y={uy + 2} width={unitSize - 4} height={unitSize - 4}
              rx={Math.max(3, unitSize * 0.12)} fill={isFilled ? fill : 'none'} stroke={s} strokeWidth={sw} />
            {isFilled ? (
              <path d={`M${ux + unitSize * 0.25} ${uy + unitSize * 0.52} L${ux + unitSize * 0.43} ${uy + unitSize * 0.7} L${ux + unitSize * 0.78} ${uy + unitSize * 0.3}`}
                fill="none" stroke={accentColor} strokeWidth={Math.max(2, unitSize * 0.11)} strokeLinecap="round" strokeLinejoin="round" />
            ) : null}
          </g>
        );

      case 'charges':
        return (
          <g key={idx}>
            <polygon points={`${cx},${uy + 1} ${ux + unitSize * 0.78},${cy - 1} ${cx + 1},${uy + unitSize - 1} ${ux + unitSize * 0.22},${cy + 1}`}
              fill={f} stroke={s} strokeWidth={sw} />
            {isFilled ? <circle cx={cx - r * 0.18} cy={cy - r * 0.22} r={r * 0.22} fill="rgba(255,255,255,0.35)" /> : null}
          </g>
        );

      case 'skulls':
        return (
          <g key={idx}>
            <circle cx={cx} cy={cy - r * 0.12} r={r * 0.68} fill={f} stroke={s} strokeWidth={sw} />
            <rect x={cx - r * 0.42} y={cy + r * 0.28} width={r * 0.84} height={r * 0.46} rx={2}
              fill={f} stroke={s} strokeWidth={sw} />
            {isFilled ? (
              <>
                <circle cx={cx - r * 0.24} cy={cy - r * 0.14} r={r * 0.12} fill="#111827" />
                <circle cx={cx + r * 0.24} cy={cy - r * 0.14} r={r * 0.12} fill="#111827" />
                <path d={`M${cx - r * 0.26} ${cy + r * 0.44} H${cx + r * 0.26}`} stroke="#111827" strokeWidth={1.2} />
              </>
            ) : null}
          </g>
        );

      default:
        return <circle key={idx} cx={cx} cy={cy} r={r} fill={f} stroke={s} strokeWidth={sw} />;
    }
  };

  return (
    <div style={{ ...wrapperStyle, display: 'flex', alignItems: 'center',
      justifyContent: 'center', filter: glow }}>
      <svg width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`}
        style={{ overflow: 'visible' }}>
        {Array.from({ length: maxValue }, (_, i) => {
          const col = arrangement === 'grid' ? i % Math.max(1, columns) : i;
          const row = arrangement === 'grid' ? Math.floor(i / Math.max(1, columns)) : 0;
          const ux  = col * (unitSize + gap);
          const uy  = row * (unitSize + gap);
          return renderUnit(ux, uy, i < value, i);
        })}
      </svg>
    </div>
  );
}

// ─── SealView ─────────────────────────────────────────────────────────────────

function SealView({
  element,
  wrapperStyle,
}: {
  element: SealElement;
  wrapperStyle: CSSProperties;
}) {
  const { variant, label, fill, accentColor, color, fontSize, showLabel } = element;
  const w  = element.width;
  const h  = element.height;
  const cx = w / 2;
  const cy = h / 2;
  const r  = Math.min(cx, cy) * 0.9;
  const glow = element.glowEnabled === true ? glowFilter(element.glowColor ?? accentColor, glowSize(element, 14)) : undefined;

  const textEl = showLabel ? (
    <text x={cx} y={cy + fontSize * 0.38} textAnchor="middle" dominantBaseline="auto"
      fill={color} fontSize={fontSize} fontWeight={700} fontFamily={element.fontFamily || 'Cinzel, serif'}
      style={{ userSelect: 'none' }}>
      {label}
    </text>
  ) : null;

  const base: CSSProperties = { ...wrapperStyle, width: w, height: h, position: 'relative',
    display: 'block', filter: glow };

  // ── common ──
  if (variant === 'common') {
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <circle cx={cx} cy={cy} r={r} fill={fill} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={accentColor} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke={accentColor} strokeWidth={0.8} strokeDasharray="3 4" />
          {textEl}
        </svg>
      </div>
    );
  }

  // ── rare — 8-point star outline ──
  if (variant === 'rare') {
    const outerPts = starPointsStr(cx, cy, r, r * 0.82, 8);
    const innerPts = starPointsStr(cx, cy, r * 0.62, r * 0.5, 8);
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <polygon points={outerPts} fill={fill} stroke={accentColor} strokeWidth={1.2} />
          <polygon points={innerPts} fill={fill} stroke={accentColor} strokeWidth={0.8} opacity={0.7} />
          <circle cx={cx} cy={cy} r={r * 0.44} fill="none" stroke={accentColor} strokeWidth={1} />
          {textEl}
        </svg>
      </div>
    );
  }

  // ── epic — ornate octagon ──
  if (variant === 'epic') {
    const octPts = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45 - 22.5) * (Math.PI / 180);
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
    const octInner = Array.from({ length: 8 }, (_, i) => {
      const a = (i * 45 - 22.5) * (Math.PI / 180);
      return `${cx + r * 0.76 * Math.cos(a)},${cy + r * 0.76 * Math.sin(a)}`;
    }).join(' ');
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <polygon points={octPts} fill={fill} stroke={accentColor} strokeWidth={2} />
          <polygon points={octInner} fill="none" stroke={accentColor} strokeWidth={1} opacity={0.6} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * 45 - 22.5) * (Math.PI / 180);
            return <circle key={i} cx={cx + r * 0.88 * Math.cos(a)} cy={cy + r * 0.88 * Math.sin(a)}
              r={2.5} fill={accentColor} />;
          })}
          {textEl}
        </svg>
      </div>
    );
  }

  // ── legendary — sunburst ──
  if (variant === 'legendary') {
    const rays = 16;
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {/* rays */}
          {Array.from({ length: rays }, (_, i) => {
            const a  = (i * (360 / rays)) * (Math.PI / 180);
            const a2 = ((i + 0.5) * (360 / rays)) * (Math.PI / 180);
            const x1 = cx + r * 0.6 * Math.cos(a);  const y1 = cy + r * 0.6 * Math.sin(a);
            const xm = cx + r * Math.cos(a2);        const ym = cy + r * Math.sin(a2);
            const x3 = cx + r * 0.6 * Math.cos(a + 2 * Math.PI / rays);
            const y3 = cy + r * 0.6 * Math.sin(a + 2 * Math.PI / rays);
            return <polygon key={i} points={`${x1},${y1} ${xm},${ym} ${x3},${y3}`}
              fill={accentColor} opacity={0.85} />;
          })}
          {/* center disc */}
          <circle cx={cx} cy={cy} r={r * 0.58} fill={fill} stroke={accentColor} strokeWidth={2} />
          <circle cx={cx} cy={cy} r={r * 0.44} fill="none" stroke={accentColor} strokeWidth={0.8} strokeDasharray="3 3" />
          {textEl}
        </svg>
      </div>
    );
  }

  // ── wax — wax seal with drip ──
  if (variant === 'wax') {
    const blobPts = starPointsStr(cx, cy - h * 0.04, r * 0.9, r * 0.78, 12);
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {/* drip at bottom */}
          <ellipse cx={cx} cy={cy + r * 0.72} rx={r * 0.22} ry={r * 0.28} fill={fill} />
          {/* main blob */}
          <polygon points={blobPts} fill={fill} />
          <polygon points={blobPts} fill="none" stroke={accentColor} strokeWidth={1.5} opacity={0.6} />
          <circle cx={cx} cy={cy - h * 0.04} r={r * 0.55} fill="none"
            stroke={accentColor} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
          <text x={cx} y={(cy - h * 0.04) + fontSize * 0.38} textAnchor="middle"
            fill={color} fontSize={fontSize} fontWeight={700} fontFamily={element.fontFamily || 'Cinzel, serif'}
            style={{ userSelect: 'none' }}>{label}</text>
        </svg>
      </div>
    );
  }

  // ── emblem — heraldic circle ──
  if (variant === 'emblem') {
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <circle cx={cx} cy={cy} r={r} fill={fill} stroke={accentColor} strokeWidth={3} />
          <circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke={accentColor} strokeWidth={1} />
          {/* cross lines */}
          <line x1={cx - r * 0.7} y1={cy} x2={cx + r * 0.7} y2={cy} stroke={accentColor} strokeWidth={1} opacity={0.5} />
          <line x1={cx} y1={cy - r * 0.7} x2={cx} y2={cy + r * 0.7} stroke={accentColor} strokeWidth={1} opacity={0.5} />
          {/* corner dots */}
          {[0, 1, 2, 3].map((i) => {
            const a = (i * 90 + 45) * (Math.PI / 180);
            return <circle key={i} cx={cx + r * 0.62 * Math.cos(a)} cy={cy + r * 0.62 * Math.sin(a)}
              r={3} fill={accentColor} />;
          })}
          {textEl}
        </svg>
      </div>
    );
  }

  // ── faction — shield ──
  if (variant === 'faction') {
    const fx = cx; const fy = cy;
    const sw = r * 1.6; const sh = r * 1.9;
    const shieldPts = `${fx},${fy - sh * 0.5} ${fx + sw * 0.5},${fy - sh * 0.25} ${fx + sw * 0.5},${fy + sh * 0.15} ${fx},${fy + sh * 0.5} ${fx - sw * 0.5},${fy + sh * 0.15} ${fx - sw * 0.5},${fy - sh * 0.25}`;
    const innerPts  = `${fx},${fy - sh * 0.36} ${fx + sw * 0.36},${fy - sh * 0.16} ${fx + sw * 0.36},${fy + sh * 0.08} ${fx},${fy + sh * 0.36} ${fx - sw * 0.36},${fy + sh * 0.08} ${fx - sw * 0.36},${fy - sh * 0.16}`;
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <polygon points={shieldPts} fill={fill} stroke={accentColor} strokeWidth={2} />
          <polygon points={innerPts} fill="none" stroke={accentColor} strokeWidth={1} opacity={0.5} />
          {textEl}
        </svg>
      </div>
    );
  }

  // ── rosette ──
  if (variant === 'medal') {
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <path d={`M${cx - r * 0.35} ${cy + r * 0.45} L${cx - r * 0.62} ${cy + r * 1.05} L${cx} ${cy + r * 0.82} L${cx + r * 0.62} ${cy + r * 1.05} L${cx + r * 0.35} ${cy + r * 0.45}`} fill={accentColor} opacity={0.88} />
          <circle cx={cx} cy={cy} r={r * 0.78} fill={fill} stroke={accentColor} strokeWidth={3} />
          <circle cx={cx} cy={cy} r={r * 0.58} fill="none" stroke={accentColor} strokeWidth={1} strokeDasharray="4 4" />
          {textEl}
        </svg>
      </div>
    );
  }

  if (variant === 'hexSigil') {
    const outer = hexPoints(cx, cy, r);
    const inner = hexPoints(cx, cy, r * 0.68);
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <polygon points={outer} fill={fill} stroke={accentColor} strokeWidth={2.4} />
          <polygon points={inner} fill="none" stroke={accentColor} strokeWidth={1} opacity={0.65} />
          <circle cx={cx} cy={cy} r={r * 0.34} fill="none" stroke={accentColor} strokeWidth={1} />
          {textEl}
        </svg>
      </div>
    );
  }

  if (variant === 'cornerStamp') {
    return (
      <div style={base}>
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect x={w * 0.08} y={h * 0.18} width={w * 0.84} height={h * 0.64} rx={8}
            fill={fill} stroke={accentColor} strokeWidth={2.5} strokeDasharray="7 4"
            transform={`rotate(-10 ${cx} ${cy})`} />
          <text x={cx} y={cy + fontSize * 0.34} textAnchor="middle"
            fill={color} fontSize={fontSize * 0.72} fontWeight={900} fontFamily="Oswald, sans-serif"
            transform={`rotate(-10 ${cx} ${cy})`} style={{ userSelect: 'none' }}>{label}</text>
        </svg>
      </div>
    );
  }

  const petalCount = 12;
  return (
    <div style={base}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* outer petals */}
        {Array.from({ length: petalCount }, (_, i) => {
          const a = (i * (360 / petalCount)) * (Math.PI / 180);
          const px = cx + r * 0.62 * Math.cos(a);
          const py = cy + r * 0.62 * Math.sin(a);
          return <ellipse key={i} cx={px} cy={py} rx={r * 0.32} ry={r * 0.18}
            transform={`rotate(${i * (360 / petalCount)}, ${px}, ${py})`}
            fill={fill} stroke={accentColor} strokeWidth={0.8} />;
        })}
        {/* center disc */}
        <circle cx={cx} cy={cy} r={r * 0.46} fill={fill} stroke={accentColor} strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={r * 0.3}  fill="none" stroke={accentColor} strokeWidth={0.7} opacity={0.6} />
        {textEl}
      </svg>
    </div>
  );
}
