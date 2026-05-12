import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject, WheelEvent as ReactWheelEvent } from 'react';
import { Component, memo, useEffect, useMemo, useRef, useState } from 'react';
import { BringToFront, Copy, Crop, FlipHorizontal2, FlipVertical2, Lock, RotateCcw, SendToBack, Trash2 } from 'lucide-react';
import { Rnd } from 'react-rnd';

import { CardElementView } from './CardElementView';
import { getBackgroundStyle, getGroupColor, getTextureStyle } from '../lib/editor';
import type { CardDocument, CardElement, CardElementPatch, TextElement, TextStyleSpan } from '../types';

interface RubberBand { x1: number; y1: number; x2: number; y2: number }
interface SmartGuideState { vertical: number[]; horizontal: number[] }
interface TransformHudState { x: number; y: number; label: string }
interface Bounds { x: number; y: number; width: number; height: number }
interface VisualBounds extends Bounds { isInset: boolean }
interface NaturalSize { width: number; height: number }
interface GroupTransformStartState {
  bounds: Bounds;
  elements: CardElement[];
}
type FreeTransformHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const SMART_GUIDE_THRESHOLD = 6;
const MIN_TRANSFORM_SIZE = 4;
const FREE_TRANSFORM_HANDLES: FreeTransformHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
let measureCanvas: HTMLCanvasElement | null = null;

class ElementErrorBoundary extends Component<
  { children: ReactNode; elementName: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[canvas] element render failed:', this.props.elementName, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="canvas-node__error">
          Elemento com erro
        </div>
      );
    }
    return this.props.children;
  }
}

const CanvasVisualNode = memo(function CanvasVisualNode({ element }: { element: CardElement }) {
  return (
    <div
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
        <ElementErrorBoundary key={element.id} elementName={element.name}>
          <CardElementView element={element} />
        </ElementErrorBoundary>
      </div>
    </div>
  );
});

const INLINE_TEXT_WEIGHTS = [
  { value: 100, label: 'Thin' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Reg' },
  { value: 500, label: 'Med' },
  { value: 600, label: 'Semi' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra' },
  { value: 900, label: 'Black' },
] as const;

interface CanvasStageProps {
  card: CardDocument;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  showGrid: boolean;
  snapToGrid: boolean;
  selectedElementIds: string[];
  isExporting: boolean;
  editingElementId: string | null;
  onSelectElement: (elementId: string | null, additive?: boolean) => void;
  onSelectElements: (ids: string[]) => void;
  onUpdateElement: (elementId: string, patch: CardElementPatch) => void;
  onUpdateElements: (updates: Array<{ id: string; patch: CardElementPatch }>) => void;
  onBeginElementMove: (elementId: string, duplicateOnDrag?: boolean) => void;
  onMoveElement: (elementId: string, x: number, y: number) => void;
  onEndElementMove: () => void;
  onStartEditElement: (id: string) => void;
  onCommitEdit: (id: string, content: string, richContent?: TextStyleSpan[]) => void;
  onCancelEdit: () => void;
  onElementContextMenu: (elementId: string, x: number, y: number) => void;
  onDuplicateSelection: () => void;
  onDeleteSelection: () => void;
  onBringSelectionToFront: () => void;
  onSendSelectionToBack: () => void;
  onLockSelection: () => void;
  onFlipSelectionX: () => void;
  onFlipSelectionY: () => void;
  onResetSelectionRotation: () => void;
  cardRef: RefObject<HTMLDivElement | null>;
  showTemplateBindings?: boolean;
  interactionDisabled?: boolean;
}

export function CanvasStage({
  card,
  zoom,
  onZoomChange,
  showGrid,
  snapToGrid,
  selectedElementIds,
  isExporting,
  editingElementId,
  onSelectElement,
  onSelectElements,
  onUpdateElement,
  onUpdateElements,
  onBeginElementMove,
  onMoveElement,
  onEndElementMove,
  onStartEditElement,
  onCommitEdit,
  onCancelEdit,
  onElementContextMenu,
  onDuplicateSelection,
  onDeleteSelection,
  onBringSelectionToFront,
  onSendSelectionToBack,
  onLockSelection,
  onFlipSelectionX,
  onFlipSelectionY,
  onResetSelectionRotation,
  cardRef,
  showTemplateBindings = false,
  interactionDisabled = false,
}: CanvasStageProps) {
  // useMemo: avoids re-sorting on every render when elements haven't changed
  const orderedElements = useMemo(
    () => [...card.elements].filter((el) => !el.hidden).sort((a, b) => a.zIndex - b.zIndex),
    [card.elements],
  );
  const selectedElementIdSet = useMemo(() => new Set(selectedElementIds), [selectedElementIds]);
  const selectedTransformElements = useMemo(
    () => card.elements.filter((el) => selectedElementIdSet.has(el.id) && !el.locked && !el.hidden),
    [card.elements, selectedElementIdSet],
  );
  const selectionBounds = useMemo(() => getBounds(selectedTransformElements), [selectedTransformElements]);
  const [imageSizes, setImageSizes] = useState<Record<string, NaturalSize>>({});
  const imageSrcs = useMemo(
    () => Array.from(new Set(card.elements
      .filter((element) => element.type === 'image' && element.src)
      .map((element) => element.type === 'image' ? element.src : ''))),
    [card.elements],
  );
  const toolbarBounds = useMemo(() => {
    if (selectedTransformElements.length !== 1) return selectionBounds;
    const element = selectedTransformElements[0];
    return getElementVisualWorldBounds(element, element.type === 'image' ? imageSizes[element.src] : undefined);
  }, [imageSizes, selectedTransformElements, selectionBounds]);
  const canFitSelectionToContent = useMemo(
    () => selectedTransformElements.some((element) => {
      const visualBox = getElementVisualBox(element, element.type === 'image' ? imageSizes[element.src] : undefined);
      return visualBox.isInset;
    }),
    [imageSizes, selectedTransformElements],
  );
  const showContextToolbar = Boolean(toolbarBounds && selectedTransformElements.length > 0 && !isExporting && !editingElementId);
  const contextToolbarWidth = canFitSelectionToContent ? 362 : 328;

  // Rubber band: fully imperative — no React state, zero re-renders during mousemove
  const rubberBandDivRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rbState = useRef<RubberBand | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const [committedPan, setCommittedPan] = useState({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [isShiftDown, setIsShiftDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [smartGuides, setSmartGuides] = useState<SmartGuideState>({ vertical: [], horizontal: [] });
  const [transformHud, setTransformHud] = useState<TransformHudState | null>(null);
  const isSpaceDownRef = useRef(false);
  const isPanningRef = useRef(false);
  const groupTransformStartRef = useRef<GroupTransformStartState | null>(null);
  const clampZoom = (value: number) => Math.min(3, Math.max(0.1, value));
  const applyStagePan = (nextPan = panRef.current) => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.transform = `translate(-50%, -50%) translate(${nextPan.x}px, ${nextPan.y}px)`;
  };

  useEffect(() => {
    let cancelled = false;
    imageSrcs.forEach((src) => {
      if (!src || imageSizes[src]) return;
      const image = new Image();
      image.onload = () => {
        if (cancelled || image.naturalWidth <= 0 || image.naturalHeight <= 0) return;
        setImageSizes((current) => current[src] ? current : {
          ...current,
          [src]: { width: image.naturalWidth, height: image.naturalHeight },
        });
      };
      image.src = src;
    });
    return () => {
      cancelled = true;
    };
  }, [imageSizes, imageSrcs]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftDown(true);
      }
      if (event.code !== 'Space' || isTypingTarget(event.target)) return;
      event.preventDefault();
      isSpaceDownRef.current = true;
      setIsSpaceDown(true);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftDown(false);
      }
      if (event.code !== 'Space') return;
      isSpaceDownRef.current = false;
      setIsSpaceDown(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const onArrowKey = (event: KeyboardEvent) => {
      if (!event.key.startsWith('Arrow') || isTypingTarget(event.target) || selectedElementIds.length === 0) return;
      event.preventDefault();
      const distance = event.shiftKey ? 10 : 1;
      const dx = event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0;
      const dy = event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0;
      onBeginElementMove(selectedElementIds[0]);
      selectedElementIds.forEach((id) => {
        const element = card.elements.find((item) => item.id === id && !item.locked);
        if (!element) return;
        onMoveElement(id, element.x + dx, element.y + dy);
      });
      onEndElementMove();
    };

    window.addEventListener('keydown', onArrowKey);
    return () => window.removeEventListener('keydown', onArrowKey);
  }, [card.elements, onBeginElementMove, onEndElementMove, onMoveElement, selectedElementIds]);

  const zoomAtPoint = (clientX: number, clientY: number, nextZoom: number) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      onZoomChange(nextZoom);
      return;
    }
    const rect = viewport.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentPan = panRef.current;
    const cardX = (clientX - centerX + (card.width * zoom) / 2 - currentPan.x) / zoom;
    const cardY = (clientY - centerY + (card.height * zoom) / 2 - currentPan.y) / zoom;
    const clampedZoom = clampZoom(nextZoom);
    const nextPan = {
      x: clientX - centerX + (card.width * clampedZoom) / 2 - cardX * clampedZoom,
      y: clientY - centerY + (card.height * clampedZoom) / 2 - cardY * clampedZoom,
    };
    panRef.current = nextPan;
    applyStagePan(nextPan);
    setCommittedPan(nextPan);
    onZoomChange(clampedZoom);
  };

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const precision = event.ctrlKey || event.metaKey ? 0.0015 : 0.0035;
    const nextZoom = zoom * Math.exp(-event.deltaY * precision);
    zoomAtPoint(event.clientX, event.clientY, nextZoom);
  };

  const beginPan = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 1 && !isSpaceDownRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startPan = panRef.current;
    isPanningRef.current = true;
    setIsPanning(true);

    const handleMove = (moveEvent: MouseEvent) => {
      if (!isPanningRef.current) return;
      const nextPan = {
        x: startPan.x + moveEvent.clientX - startX,
        y: startPan.y + moveEvent.clientY - startY,
      };
      panRef.current = nextPan;
      applyStagePan(nextPan);
    };

    const stopPan = () => {
      isPanningRef.current = false;
      setCommittedPan(panRef.current);
      setIsPanning(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopPan);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopPan);
  };

  const handleCardMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isSpaceDownRef.current) return;
    if (e.target !== e.currentTarget) return;
    onSelectElement(null);

    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x1 = (e.clientX - rect.left) / zoom;
    const y1 = (e.clientY - rect.top) / zoom;
    rbState.current = { x1, y1, x2: x1, y2: y1 };

    const rb = rubberBandDivRef.current;
    if (rb) {
      rb.style.display = 'block';
      rb.style.left = `${x1}px`;
      rb.style.top = `${y1}px`;
      rb.style.width = '0px';
      rb.style.height = '0px';
    }

    const onMove = (ev: MouseEvent) => {
      const r = cardRef.current?.getBoundingClientRect();
      if (!r || !rbState.current) return;
      const x2 = Math.min(Math.max((ev.clientX - r.left) / zoom, 0), card.width);
      const y2 = Math.min(Math.max((ev.clientY - r.top) / zoom, 0), card.height);
      rbState.current = { ...rbState.current, x2, y2 };
      // Direct DOM update — no React setState, no re-render
      if (rb) {
        rb.style.left   = `${Math.min(rbState.current.x1, x2)}px`;
        rb.style.top    = `${Math.min(rbState.current.y1, y2)}px`;
        rb.style.width  = `${Math.abs(x2 - rbState.current.x1)}px`;
        rb.style.height = `${Math.abs(y2 - rbState.current.y1)}px`;
      }
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      if (rb) rb.style.display = 'none';
      const state = rbState.current;
      rbState.current = null;
      if (state) {
        const minX = Math.min(state.x1, state.x2);
        const maxX = Math.max(state.x1, state.x2);
        const minY = Math.min(state.y1, state.y2);
        const maxY = Math.max(state.y1, state.y2);
        if (maxX - minX > 4 || maxY - minY > 4) {
          const ids = card.elements
            .filter((el) => !el.locked && !el.hidden)
            .filter((el) => el.x < maxX && el.x + el.width > minX && el.y < maxY && el.y + el.height > minY)
            .map((el) => el.id);
          if (ids.length > 0) onSelectElements(ids);
        }
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const buildTransformHud = (element: CardElement, x: number, y: number, width = element.width, height = element.height, rotation = element.rotation): TransformHudState => ({
    x: Math.min(card.width - 80, Math.max(4, x + width + 10)),
    y: Math.max(4, y - 32),
    label: `X ${Math.round(x)}  Y ${Math.round(y)}  W ${Math.round(width)}  H ${Math.round(height)}  ${Math.round(rotation)}deg`,
  });

  const buildBoundsHud = (bounds: Bounds, labelSuffix = ''): TransformHudState => ({
    x: Math.min(card.width - 100, Math.max(4, bounds.x + bounds.width + 10)),
    y: Math.max(4, bounds.y - 32),
    label: `X ${Math.round(bounds.x)}  Y ${Math.round(bounds.y)}  W ${Math.round(bounds.width)}  H ${Math.round(bounds.height)}${labelSuffix}`,
  });

  const snapBoundsPosition = (bounds: Bounds, excludeIds: Set<string>) => {
    if (!snapToGrid) return { x: bounds.x, y: bounds.y, guides: { vertical: [], horizontal: [] } as SmartGuideState };

    const movingX = [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width];
    const movingY = [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height];
    const targetX = [0, card.width / 2, card.width];
    const targetY = [0, card.height / 2, card.height];

    card.elements.forEach((item) => {
      if (excludeIds.has(item.id) || item.hidden) return;
      targetX.push(item.x, item.x + item.width / 2, item.x + item.width);
      targetY.push(item.y, item.y + item.height / 2, item.y + item.height);
    });

    let bestXDelta: number | null = null;
    let bestXGuide: number | null = null;
    let bestYDelta: number | null = null;
    let bestYGuide: number | null = null;

    movingX.forEach((value) => {
      targetX.forEach((target) => {
        const delta = target - value;
        if (Math.abs(delta) <= SMART_GUIDE_THRESHOLD && (bestXDelta === null || Math.abs(delta) < Math.abs(bestXDelta))) {
          bestXDelta = delta;
          bestXGuide = target;
        }
      });
    });

    movingY.forEach((value) => {
      targetY.forEach((target) => {
        const delta = target - value;
        if (Math.abs(delta) <= SMART_GUIDE_THRESHOLD && (bestYDelta === null || Math.abs(delta) < Math.abs(bestYDelta))) {
          bestYDelta = delta;
          bestYGuide = target;
        }
      });
    });

    return {
      x: bestXDelta !== null ? bounds.x + bestXDelta : bounds.x,
      y: bestYDelta !== null ? bounds.y + bestYDelta : bounds.y,
      guides: {
        vertical: bestXGuide !== null ? [bestXGuide] : [],
        horizontal: bestYGuide !== null ? [bestYGuide] : [],
      },
    };
  };

  const snapElementPosition = (element: CardElement, x: number, y: number) =>
    snapBoundsPosition({ x, y, width: element.width, height: element.height }, new Set([element.id]));

  const beginFreeResize = (event: ReactMouseEvent<HTMLButtonElement>, element: CardElement, handle: FreeTransformHandle) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const signs = handleSigns(handle);
    const start = { ...element };
    const startVisualBox = getElementVisualBox(start, start.type === 'image' ? imageSizes[start.src] : undefined);
    const radians = start.rotation * (Math.PI / 180);
    const startCenter = getLocalBoxWorldCenter(start, startVisualBox);
    const ratio = startVisualBox.width / Math.max(startVisualBox.height, 1);
    const anchorLocal = {
      x: signs.x === 0 ? 0 : -signs.x * startVisualBox.width / 2,
      y: signs.y === 0 ? 0 : -signs.y * startVisualBox.height / 2,
    };
    const anchorWorld = {
      x: startCenter.x + rotateX(anchorLocal.x, anchorLocal.y, radians),
      y: startCenter.y + rotateY(anchorLocal.x, anchorLocal.y, radians),
    };

    onBeginElementMove(element.id);

    const updateFromPointer = (moveEvent: MouseEvent) => {
      const pointer = {
        x: (moveEvent.clientX - rect.left) / zoom,
        y: (moveEvent.clientY - rect.top) / zoom,
      };
      const fromCenter = moveEvent.altKey;
      const origin = fromCenter ? startCenter : anchorWorld;
      const local = inverseRotate(pointer.x - origin.x, pointer.y - origin.y, radians);

      let width = signs.x === 0
        ? startVisualBox.width
        : Math.max(MIN_TRANSFORM_SIZE, Math.abs(local.x * (fromCenter ? 2 : 1)));
      let height = signs.y === 0
        ? startVisualBox.height
        : Math.max(MIN_TRANSFORM_SIZE, Math.abs(local.y * (fromCenter ? 2 : 1)));

      if (moveEvent.shiftKey && signs.x !== 0 && signs.y !== 0) {
        if (width / height > ratio) width = height * ratio;
        else height = width / ratio;
      }

      let center = startCenter;
      if (!fromCenter) {
        const centerFromAnchor = {
          x: signs.x === 0 ? 0 : signs.x * width / 2,
          y: signs.y === 0 ? 0 : signs.y * height / 2,
        };
        center = {
          x: anchorWorld.x + rotateX(centerFromAnchor.x, centerFromAnchor.y, radians),
          y: anchorWorld.y + rotateY(centerFromAnchor.x, centerFromAnchor.y, radians),
        };
      }

      const next = {
        x: center.x - width / 2,
        y: center.y - height / 2,
        width,
        height,
      };
      onUpdateElement(element.id, next);
      setTransformHud(buildTransformHud(element, next.x, next.y, next.width, next.height));
    };

    const stopResize = () => {
      setTransformHud(null);
      onEndElementMove();
      window.removeEventListener('mousemove', updateFromPointer);
      window.removeEventListener('mouseup', stopResize);
    };

    window.addEventListener('mousemove', updateFromPointer);
    window.addEventListener('mouseup', stopResize);
  };

  const fitSelectionToVisualContent = () => {
    const updates = selectedTransformElements
      .map((element) => {
        const visualBox = getElementVisualBox(element, element.type === 'image' ? imageSizes[element.src] : undefined);
        if (!visualBox.isInset) return null;
        const center = getLocalBoxWorldCenter(element, visualBox);
        return {
          id: element.id,
          patch: {
            x: center.x - visualBox.width / 2,
            y: center.y - visualBox.height / 2,
            width: visualBox.width,
            height: visualBox.height,
          } as CardElementPatch,
        };
      })
      .filter((update): update is { id: string; patch: CardElementPatch } => Boolean(update));

    if (updates.length === 0) return;
    onBeginElementMove(updates[0].id);
    onUpdateElements(updates);
    onEndElementMove();
  };

  const applyGroupMove = (nextX: number, nextY: number) => {
    const start = groupTransformStartRef.current;
    if (!start) return;
    const snapped = snapBoundsPosition(
      { ...start.bounds, x: nextX, y: nextY },
      new Set(start.elements.map((element) => element.id)),
    );
    const dx = snapped.x - start.bounds.x;
    const dy = snapped.y - start.bounds.y;
    onUpdateElements(start.elements.map((element) => ({
      id: element.id,
      patch: { x: element.x + dx, y: element.y + dy },
    })));
    setSmartGuides(snapped.guides);
    setTransformHud(buildBoundsHud({ ...start.bounds, x: snapped.x, y: snapped.y }, `  ${start.elements.length} itens`));
  };

  const applyGroupResize = (nextBounds: Bounds, fromCenter: boolean) => {
    const start = groupTransformStartRef.current;
    if (!start || start.bounds.width === 0 || start.bounds.height === 0) return;
    let bounds = { ...nextBounds };
    if (fromCenter) {
      const cx = start.bounds.x + start.bounds.width / 2;
      const cy = start.bounds.y + start.bounds.height / 2;
      bounds = { ...bounds, x: cx - bounds.width / 2, y: cy - bounds.height / 2 };
    }
    const scaleX = bounds.width / start.bounds.width;
    const scaleY = bounds.height / start.bounds.height;
    onUpdateElements(start.elements.map((element) => ({
      id: element.id,
      patch: {
        x: bounds.x + (element.x - start.bounds.x) * scaleX,
        y: bounds.y + (element.y - start.bounds.y) * scaleY,
        width: Math.max(4, element.width * scaleX),
        height: Math.max(4, element.height * scaleY),
      },
    })));
    setTransformHud(buildBoundsHud(bounds, `  ${start.elements.length} itens`));
  };

  const beginGroupRotate = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectionBounds || selectedTransformElements.length < 2) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const startElements = selectedTransformElements.map((element) => ({ ...element }));
    const centerX = selectionBounds.x + selectionBounds.width / 2;
    const centerY = selectionBounds.y + selectionBounds.height / 2;
    const startAngle = pointerAngle(event.clientX, event.clientY, rect, zoom, centerX, centerY);
    onBeginElementMove(startElements[0].id);

    const handleMove = (moveEvent: MouseEvent) => {
      let delta = pointerAngle(moveEvent.clientX, moveEvent.clientY, rect, zoom, centerX, centerY) - startAngle;
      if (moveEvent.shiftKey) delta = Math.round(delta / 15) * 15;
      const rad = delta * (Math.PI / 180);
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      onUpdateElements(startElements.map((element) => {
        const elementCenterX = element.x + element.width / 2;
        const elementCenterY = element.y + element.height / 2;
        const dx = elementCenterX - centerX;
        const dy = elementCenterY - centerY;
        const nextCenterX = centerX + dx * cos - dy * sin;
        const nextCenterY = centerY + dx * sin + dy * cos;
        return {
          id: element.id,
          patch: {
            x: nextCenterX - element.width / 2,
            y: nextCenterY - element.height / 2,
            rotation: normalizeAngle(element.rotation + delta),
          },
        };
      }));
      setTransformHud(buildBoundsHud(selectionBounds, `  ${Math.round(delta)}deg  ${startElements.length} itens`));
    };

    const stopRotate = () => {
      setTransformHud(null);
      onEndElementMove();
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopRotate);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopRotate);
  };

  const beginRotate = (event: ReactMouseEvent<HTMLButtonElement>, element: CardElement) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    onBeginElementMove(element.id);

    const centerX = element.x + element.width / 2;
    const centerY = element.y + element.height / 2;

    const getAngle = (clientX: number, clientY: number) => {
      const pointerX = (clientX - rect.left) / zoom;
      const pointerY = (clientY - rect.top) / zoom;
      const angle = Math.atan2(pointerY - centerY, pointerX - centerX) * (180 / Math.PI) + 90;
      return ((angle + 180) % 360 + 360) % 360 - 180;
    };

    const handleMove = (moveEvent: MouseEvent) => {
      let nextRotation = getAngle(moveEvent.clientX, moveEvent.clientY);
      if (moveEvent.shiftKey) {
        nextRotation = Math.round(nextRotation / 15) * 15;
      }
      setTransformHud(buildTransformHud(element, element.x, element.y, element.width, element.height, nextRotation));
      onUpdateElement(element.id, { rotation: nextRotation });
    };

    const stopRotate = () => {
      setTransformHud(null);
      onEndElementMove();
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopRotate);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopRotate);
  };

  return (
    <div className="canvas-panel">
      <div className="canvas-bar">
        <div className="canvas-bar__info">
          <span className="canvas-bar__name">{card.name}</span>
          <span className="canvas-bar__chip">{card.width} × {card.height} px</span>
          <span className="canvas-bar__chip">{card.elements.length} elementos</span>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={[
          'canvas-scroll',
          isSpaceDown ? 'canvas-scroll--pan-ready' : '',
          isPanning ? 'canvas-scroll--panning' : '',
        ].filter(Boolean).join(' ')}
        onWheel={handleWheel}
        onMouseDown={beginPan}
      >
        <div
          ref={stageRef}
          className="canvas-stage"
          style={{
            width: card.width * zoom,
            height: card.height * zoom,
            transform: `translate(-50%, -50%) translate(${committedPan.x}px, ${committedPan.y}px)`,
          }}
        >
          <div
            className="canvas-stage__scaled"
            style={{
              width: card.width,
              height: card.height,
              transform: `scale(${zoom})`,
            }}
          >
            <div
              ref={cardRef}
              className={[
                'card-surface',
                isExporting ? 'card-surface--exporting' : '',
              ].filter(Boolean).join(' ')}
              onMouseDown={handleCardMouseDown}
              style={{ width: card.width, height: card.height }}
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
                  <div
                    className="card-surface__background card-surface__background--texture"
                    style={getTextureStyle(card.background.texture)}
                  />
                ) : null}

                {showGrid ? <div className="card-surface__grid" /> : null}

                {orderedElements.map((element) => {
                  if (editingElementId === element.id) return null;
                  return <CanvasVisualNode key={`visual-${element.id}`} element={element} />;
                })}
              </div>

              {/* Rubber band — always mounted, shown/hidden + positioned imperatively */}
              <div
                ref={rubberBandDivRef}
                className="canvas-rubber-band"
                style={{ position: 'absolute', display: 'none', pointerEvents: 'none', zIndex: 99999 }}
              />

              {smartGuides.vertical.map((x) => (
                <span
                  key={`v-${x}`}
                  className="canvas-smart-guide canvas-smart-guide--vertical"
                  style={{ left: x }}
                />
              ))}
              {smartGuides.horizontal.map((y) => (
                <span
                  key={`h-${y}`}
                  className="canvas-smart-guide canvas-smart-guide--horizontal"
                  style={{ top: y }}
                />
              ))}
              {transformHud ? (
                <div
                  className="canvas-transform-hud"
                  style={{ left: transformHud.x, top: transformHud.y }}
                >
                  {transformHud.label}
                </div>
              ) : null}

              {showContextToolbar && toolbarBounds ? (
                <div
                  className="canvas-context-toolbar"
                  style={{
                    left: Math.min(card.width - contextToolbarWidth, Math.max(4, toolbarBounds.x + toolbarBounds.width / 2 - contextToolbarWidth / 2)),
                    top: Math.max(4, toolbarBounds.y - 62),
                  }}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <ToolbarButton title="Duplicar" onClick={onDuplicateSelection}>
                    <Copy size={14} />
                  </ToolbarButton>
                  <ToolbarButton title="Excluir" onClick={onDeleteSelection} tone="danger">
                    <Trash2 size={14} />
                  </ToolbarButton>
                  <span className="canvas-context-toolbar__sep" />
                  <ToolbarButton title="Trazer para frente" onClick={onBringSelectionToFront}>
                    <BringToFront size={14} />
                  </ToolbarButton>
                  <ToolbarButton title="Enviar para tras" onClick={onSendSelectionToBack}>
                    <SendToBack size={14} />
                  </ToolbarButton>
                  <span className="canvas-context-toolbar__sep" />
                  <ToolbarButton title="Inverter horizontal" onClick={onFlipSelectionX}>
                    <FlipHorizontal2 size={14} />
                  </ToolbarButton>
                  <ToolbarButton title="Inverter vertical" onClick={onFlipSelectionY}>
                    <FlipVertical2 size={14} />
                  </ToolbarButton>
                  <ToolbarButton title="Resetar rotacao" onClick={onResetSelectionRotation}>
                    <RotateCcw size={14} />
                  </ToolbarButton>
                  {canFitSelectionToContent ? (
                    <ToolbarButton title="Ajustar ao conteudo" onClick={fitSelectionToVisualContent}>
                      <Crop size={14} />
                    </ToolbarButton>
                  ) : null}
                  <span className="canvas-context-toolbar__sep" />
                  <ToolbarButton title="Bloquear selecao" onClick={onLockSelection}>
                    <Lock size={14} />
                  </ToolbarButton>
                </div>
              ) : null}

              {!isExporting && !interactionDisabled ? orderedElements.map((element) => {
                const isLocked = element.locked === true;
                const isSelected = !isLocked && selectedElementIdSet.has(element.id);
                const isEditing = editingElementId === element.id && element.type === 'text';
                const allowResize = isSelected && selectedElementIds.length === 1 && !isEditing;
                const showSingleSelectionFrame = allowResize;
                const visualBox = showSingleSelectionFrame
                  ? getElementVisualBox(element, element.type === 'image' ? imageSizes[element.src] : undefined)
                  : null;
                const groupColor = getGroupColor(element.groupId);
                const className = [
                  'canvas-node',
                  isSelected ? 'canvas-node--selected' : '',
                  isLocked ? 'canvas-node--locked' : '',
                  element.groupId ? 'canvas-node--grouped' : '',
                  isEditing ? 'canvas-node--editing' : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <Rnd
                    key={element.id}
                    scale={zoom}
                    className={className}
                    size={{ width: element.width, height: element.height }}
                    position={{ x: element.x, y: element.y }}
                    disableDragging={isLocked || isEditing || isSpaceDown}
                    cancel="textarea,input,select,[contenteditable='true']"
                    enableUserSelectHack={!isEditing}
                    dragGrid={undefined}
                    resizeGrid={undefined}
                    lockAspectRatio={false}
                    enableResizing={false}
                    onMouseDown={(event) => {
                      if (isLocked) return;
                      if (event.button === 1 || isSpaceDownRef.current) return;
                      event.stopPropagation();
                      if (!isEditing) onSelectElement(element.id, event.shiftKey || event.ctrlKey || event.metaKey);
                    }}
                    onDoubleClick={(event: ReactMouseEvent) => {
                      if (isLocked || element.type !== 'text') return;
                      event.stopPropagation();
                      onStartEditElement(element.id);
                    }}
                    onContextMenu={(event: ReactMouseEvent) => {
                      if (isLocked) return;
                      event.preventDefault();
                      event.stopPropagation();
                      onSelectElement(element.id, false);
                      onElementContextMenu(element.id, event.clientX, event.clientY);
                    }}
                    onDragStart={(event) => {
                      if (isLocked) return;
                      onBeginElementMove(element.id, event.altKey);
                    }}
                    onDrag={(_, data) => {
                      if (isLocked) return;
                      const snapped = snapElementPosition(element, data.x, data.y);
                      setSmartGuides(snapped.guides);
                      setTransformHud(buildTransformHud(element, snapped.x, snapped.y));
                      onMoveElement(element.id, snapped.x, snapped.y);
                    }}
                    onDragStop={(_, data) => {
                      if (isLocked) return;
                      const snapped = snapElementPosition(element, data.x, data.y);
                      onMoveElement(element.id, snapped.x, snapped.y);
                      setSmartGuides({ vertical: [], horizontal: [] });
                      setTransformHud(null);
                      onEndElementMove();
                    }}
                    style={{
                      zIndex: element.zIndex,
                      pointerEvents: isLocked ? 'none' : 'auto',
                      '--group-color': groupColor,
                    } as CSSProperties}
                  >
                    <div
                      className="canvas-node__content"
                      style={{
                        rotate: `${element.rotation}deg`,
                        transformOrigin: 'center center',
                      }}
                    >
                      {isEditing ? (
                        <InlineTextEditor
                          element={element as TextElement}
                          onCommit={(content, richContent) => onCommitEdit(element.id, content, richContent)}
                          onCancel={onCancelEdit}
                        />
                      ) : null}
                      {showTemplateBindings && element.binding ? (
                        <span className="canvas-node__binding-badge">
                          {element.binding.key || element.binding.kind}
                        </span>
                      ) : null}
                      {showSingleSelectionFrame ? (
                        <div
                          className="canvas-selection-frame"
                          style={{
                            left: visualBox?.x ?? 0,
                            top: visualBox?.y ?? 0,
                            width: visualBox?.width ?? element.width,
                            height: visualBox?.height ?? element.height,
                          }}
                        >
                          {FREE_TRANSFORM_HANDLES.map((handle) => (
                            <button
                              key={handle}
                              type="button"
                              className={`canvas-free-transform__handle canvas-free-transform__handle--${handle}`}
                              title="Arrastar para redimensionar. Segure Shift para proporcao e Alt para centro."
                              aria-label={`Redimensionar ${handle}`}
                              onMouseDown={(event) => beginFreeResize(event, element, handle)}
                            />
                          ))}
                          <button
                            type="button"
                            className="canvas-node__rotate-handle"
                            title="Arrastar para rotacionar. Segure Shift para travar em 15 graus."
                            aria-label="Rotacionar elemento"
                            onMouseDown={(event) => beginRotate(event, element)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </Rnd>
                );
              }) : null}

              {selectionBounds && selectedTransformElements.length > 1 && !isExporting ? (
                <Rnd
                  scale={zoom}
                  className="canvas-group-transform"
                  size={{ width: selectionBounds.width, height: selectionBounds.height }}
                  position={{ x: selectionBounds.x, y: selectionBounds.y }}
                  disableDragging={isSpaceDown}
                  lockAspectRatio={isShiftDown ? selectionBounds.width / selectionBounds.height : false}
                  enableResizing={{ top: true, right: true, bottom: true, left: true, topRight: true, bottomRight: true, bottomLeft: true, topLeft: true }}
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                  onDragStart={() => {
                    groupTransformStartRef.current = {
                      bounds: selectionBounds,
                      elements: selectedTransformElements.map((element) => ({ ...element })),
                    };
                    onBeginElementMove(selectedTransformElements[0].id);
                  }}
                  onDrag={(_, data) => applyGroupMove(data.x, data.y)}
                  onDragStop={(_, data) => {
                    applyGroupMove(data.x, data.y);
                    groupTransformStartRef.current = null;
                    setSmartGuides({ vertical: [], horizontal: [] });
                    setTransformHud(null);
                    onEndElementMove();
                  }}
                  onResizeStart={() => {
                    groupTransformStartRef.current = {
                      bounds: selectionBounds,
                      elements: selectedTransformElements.map((element) => ({ ...element })),
                    };
                    onBeginElementMove(selectedTransformElements[0].id);
                  }}
                  onResize={(event, __, ref, ___, position) => {
                    applyGroupResize(
                      { x: position.x, y: position.y, width: ref.offsetWidth, height: ref.offsetHeight },
                      'altKey' in event && event.altKey,
                    );
                  }}
                  onResizeStop={(event, __, ref, ___, position) => {
                    applyGroupResize(
                      { x: position.x, y: position.y, width: ref.offsetWidth, height: ref.offsetHeight },
                      'altKey' in event && event.altKey,
                    );
                    groupTransformStartRef.current = null;
                    setSmartGuides({ vertical: [], horizontal: [] });
                    setTransformHud(null);
                    onEndElementMove();
                  }}
                >
                  <button
                    type="button"
                    className="canvas-node__rotate-handle canvas-group-transform__rotate"
                    title="Rotacionar selecao. Segure Shift para travar em 15 graus."
                    aria-label="Rotacionar selecao"
                    onMouseDown={beginGroupRotate}
                  />
                  <span className="canvas-group-transform__count">{selectedTransformElements.length} itens</span>
                </Rnd>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineTextEditor({
  element,
  onCommit,
  onCancel,
}: {
  element: TextElement;
  onCommit: (content: string, richContent?: TextStyleSpan[]) => void;
  onCancel: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectionRangeRef = useRef<Range | null>(null);
  const committedRef = useRef(false);
  const initialElementRef = useRef(element);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.innerHTML = serializeRichText(initialElementRef.current);
    editor.focus();
  }, []);

  const commit = () => {
    if (committedRef.current) return;
    const editor = editorRef.current;
    if (!editor) return;
    committedRef.current = true;
    const content = editor.innerText.replace(/\r/g, '');
    const richContent = parseRichText(editor, element);
    onCommit(content, richContent);
  };

  const keepEditing = (event: ReactMouseEvent) => {
    saveSelection();
    event.preventDefault();
    event.stopPropagation();
  };

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      selectionRangeRef.current = range.cloneRange();
    }
  };

  const applyInlineWeight = (fontWeight: number) => {
    selectionRangeRef.current = applyInlineStyle(editorRef.current, { fontWeight }, selectionRangeRef.current);
    editorRef.current?.focus();
  };

  const applyInlineCommand = (command: 'italic' | 'underline') => {
    selectionRangeRef.current = applyInlineStyle(
      editorRef.current,
      command === 'italic' ? { fontStyle: 'italic' } : { textDecoration: 'underline' },
      selectionRangeRef.current,
    );
    editorRef.current?.focus();
  };

  return (
    <div ref={wrapperRef} className="inline-rich-editor">
      <div className="inline-rich-editor__toolbar" onMouseDown={keepEditing}>
        {INLINE_TEXT_WEIGHTS.map(({ value, label }) => (
          <button key={value} type="button" onClick={() => applyInlineWeight(value)}>
            {label}
          </button>
        ))}
        <button type="button" onClick={() => applyInlineCommand('italic')}>I</button>
        <button type="button" onClick={() => applyInlineCommand('underline')}>U</button>
      </div>
      <div
        ref={editorRef}
        className="inline-rich-editor__surface"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        draggable={false}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onMouseUp={(e) => { e.stopPropagation(); saveSelection(); }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onKeyUp={saveSelection}
        onBlur={() => {
          window.setTimeout(() => {
            if (!wrapperRef.current?.contains(document.activeElement)) commit();
          }, 0);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          const shortcutKey = e.key.toLowerCase();
          if ((e.ctrlKey || e.metaKey) && shortcutKey === 'b') {
            e.preventDefault();
            applyInlineWeight(700);
          }
          if ((e.ctrlKey || e.metaKey) && shortcutKey === 'i') {
            e.preventDefault();
            applyInlineCommand('italic');
          }
          if ((e.ctrlKey || e.metaKey) && shortcutKey === 'u') {
            e.preventDefault();
            applyInlineCommand('underline');
          }
        }}
        style={{
          color: element.color,
          fontFamily: element.fontFamily,
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle ?? 'normal',
          textDecoration: element.textDecoration ?? 'none',
          lineHeight: element.lineHeight,
          letterSpacing: `${element.letterSpacing}px`,
          textAlign: element.align,
          textTransform: element.textTransform as CSSProperties['textTransform'],
          WebkitTextStroke: element.textStrokeEnabled && (element.textStrokeWidth ?? 0) > 0
            ? `${element.textStrokeWidth ?? 2}px ${element.textStrokeColor ?? '#111111'}`
            : undefined,
          paintOrder: element.textStrokeEnabled ? 'stroke fill' : undefined,
          caretColor: element.color,
        }}
      />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  title,
  tone,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      className={tone === 'danger' ? 'canvas-context-toolbar__button canvas-context-toolbar__button--danger' : 'canvas-context-toolbar__button'}
      title={title}
      aria-label={title}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </button>
  );
}

function serializeRichText(element: TextElement) {
  const spans = element.richContent?.length
    ? element.richContent
    : [{ text: element.content }];

  return spans
    .map((span) => {
      const style = [
        span.fontWeight ? `font-weight:${span.fontWeight}` : '',
        span.fontStyle && span.fontStyle !== 'normal' ? `font-style:${span.fontStyle}` : '',
        span.textDecoration && span.textDecoration !== 'none' ? `text-decoration:${span.textDecoration}` : '',
        span.color ? `color:${span.color}` : '',
        span.fontFamily ? `font-family:${span.fontFamily}` : '',
      ].filter(Boolean).join(';');
      return `<span${style ? ` style="${style}"` : ''}>${escapeHtml(span.text)}</span>`;
    })
    .join('');
}

function parseRichText(root: HTMLElement, element: TextElement): TextStyleSpan[] | undefined {
  const spans: TextStyleSpan[] = [];
  const walk = (node: Node, inherited: TextStyleSpan = { text: '' }) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (!text) return;
      spans.push({ ...inherited, text });
      return;
    }
    if (node instanceof HTMLBRElement) {
      spans.push({ ...inherited, text: '\n' });
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    const style = window.getComputedStyle(node);
    const next: TextStyleSpan = {
      ...inherited,
      text: '',
      fontWeight: Number(style.fontWeight) !== element.fontWeight ? Number(style.fontWeight) : inherited.fontWeight,
      fontStyle: style.fontStyle !== (element.fontStyle ?? 'normal') ? style.fontStyle as TextStyleSpan['fontStyle'] : inherited.fontStyle,
      textDecoration: style.textDecorationLine.includes('underline')
        ? 'underline'
        : style.textDecorationLine.includes('line-through')
          ? 'line-through'
          : inherited.textDecoration,
      color: style.color !== element.color ? style.color : inherited.color,
      fontFamily: cleanFontFamily(style.fontFamily) !== element.fontFamily ? cleanFontFamily(style.fontFamily) : inherited.fontFamily,
    };
    node.childNodes.forEach((child) => walk(child, next));
  };

  root.childNodes.forEach((child) => walk(child));
  const normalized = mergeRichSpans(spans.filter((span) => span.text.length > 0));
  return normalized.some((span) => span.fontWeight || span.fontStyle || span.textDecoration || span.color || span.fontFamily)
    ? normalized
    : undefined;
}

function applyInlineStyle(root: HTMLElement | null, style: Omit<TextStyleSpan, 'text'>, savedRange: Range | null) {
  if (!root) return savedRange;
  const selection = window.getSelection();
  const liveRange = selection && selection.rangeCount > 0 && !selection.isCollapsed
    ? selection.getRangeAt(0)
    : null;
  const range = liveRange && root.contains(liveRange.commonAncestorContainer)
    ? liveRange
    : savedRange;
  if (!range || !root.contains(range.commonAncestorContainer)) return savedRange;

  const span = document.createElement('span');
  if (style.fontWeight) span.style.fontWeight = String(style.fontWeight);
  if (style.fontStyle) span.style.fontStyle = style.fontStyle;
  if (style.textDecoration) span.style.textDecoration = style.textDecoration;
  if (style.color) span.style.color = style.color;
  if (style.fontFamily) span.style.fontFamily = style.fontFamily;
  span.append(range.extractContents());
  range.insertNode(span);

  if (!selection) return savedRange;
  selection.removeAllRanges();
  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  selection.addRange(nextRange);
  return nextRange.cloneRange();
}

function mergeRichSpans(spans: TextStyleSpan[]) {
  return spans.reduce<TextStyleSpan[]>((merged, span) => {
    const last = merged[merged.length - 1];
    const key = JSON.stringify({ ...span, text: '' });
    const lastKey = last ? JSON.stringify({ ...last, text: '' }) : '';
    if (last && key === lastKey) {
      last.text += span.text;
    } else {
      merged.push({ ...span });
    }
    return merged;
  }, []);
}

function cleanFontFamily(fontFamily: string) {
  return fontFamily.split(',')[0].replace(/["']/g, '').trim();
}

function getBounds(elements: CardElement[]): Bounds | null {
  if (elements.length === 0) return null;
  const minX = Math.min(...elements.map((element) => element.x));
  const minY = Math.min(...elements.map((element) => element.y));
  const maxX = Math.max(...elements.map((element) => element.x + element.width));
  const maxY = Math.max(...elements.map((element) => element.y + element.height));
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function getElementVisualBox(element: CardElement, naturalSize?: NaturalSize): VisualBounds {
  if (element.type === 'text') {
    return getTextElementVisualBox(element);
  }

  if (element.type !== 'image' || element.fit !== 'contain' || !naturalSize || naturalSize.width <= 0 || naturalSize.height <= 0) {
    return { x: 0, y: 0, width: element.width, height: element.height, isInset: false };
  }

  const elementRatio = element.width / Math.max(element.height, 1);
  const imageRatio = naturalSize.width / Math.max(naturalSize.height, 1);
  let width = element.width;
  let height = element.height;

  if (imageRatio > elementRatio) {
    height = width / imageRatio;
  } else {
    width = height * imageRatio;
  }

  const x = (element.width - width) / 2;
  const y = (element.height - height) / 2;
  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
    isInset: Math.abs(x) > 0.5 || Math.abs(y) > 0.5 || Math.abs(width - element.width) > 0.5 || Math.abs(height - element.height) > 0.5,
  };
}

function getTextElementVisualBox(element: TextElement): VisualBounds {
  const contentWidth = element.autoFitFont ? element.width : measureTextOverflowWidth(element);
  const lineCount = Math.max(1, getTextPlainContent(element).split('\n').length);
  const textHeight = Math.max(1, lineCount * element.fontSize * element.lineHeight);
  const padding = getTextVisualPadding(element);
  const width = Math.max(element.width, contentWidth + padding * 2);
  const height = Math.max(element.height, textHeight + padding * 2);
  const x = width > element.width
    ? element.align === 'right'
      ? element.width - width
      : element.align === 'left'
        ? 0
        : (element.width - width) / 2
    : 0;
  const y = height > element.height ? (element.height - height) / 2 : 0;
  return {
    x,
    y,
    width,
    height,
    isInset: Math.abs(x) > 0.5 || Math.abs(y) > 0.5 || Math.abs(width - element.width) > 0.5 || Math.abs(height - element.height) > 0.5,
  };
}

function getTextPlainContent(element: TextElement) {
  return element.richContent?.length
    ? element.richContent.map((span) => span.text).join('')
    : element.content;
}

function getTextVisualPadding(element: TextElement) {
  const stroke = element.textStrokeEnabled ? element.textStrokeWidth ?? 2 : 0;
  const shadow = element.shadowEnabled
    ? Math.max(
      Math.abs(element.shadowOffsetX ?? 2),
      Math.abs(element.shadowOffsetY ?? 2),
    ) + (element.shadowBlur ?? 8)
    : 0;
  const glow = element.glowEnabled ? element.glowIntensity ?? 10 : 0;
  return Math.ceil(Math.max(1, stroke, shadow * 0.45, glow * 0.35));
}

function measureTextOverflowWidth(element: TextElement) {
  const content = transformText(getTextPlainContent(element), element.textTransform);
  return Math.max(...content.split('\n').map((line) => measureLongestUnbreakableText(line, element)), 1);
}

function measureLongestUnbreakableText(line: string, element: TextElement) {
  const tokens = line.split(/\s+/).filter(Boolean);
  const candidates = tokens.length > 0 ? tokens : [line];
  return Math.max(...candidates.map((token) => {
    const characters = Array.from(token).length;
    return measureText(token, {
      fontFamily: element.fontFamily,
      fontSize: element.fontSize,
      fontStyle: element.fontStyle ?? 'normal',
      fontWeight: element.fontWeight,
    }) + Math.max(0, characters - 1) * element.letterSpacing;
  }), 1);
}

function transformText(text: string, transform: TextElement['textTransform']) {
  if (transform === 'uppercase') return text.toUpperCase();
  if (transform === 'capitalize') return text.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
  return text;
}

function measureText(
  text: string,
  font: { fontFamily: string; fontSize: number; fontStyle: string; fontWeight: number },
) {
  const context = getMeasureContext();
  if (!context) return Array.from(text).length * font.fontSize * 0.62;
  context.font = `${font.fontStyle} ${font.fontWeight} ${font.fontSize}px ${formatCanvasFontFamily(font.fontFamily)}`;
  return context.measureText(text).width;
}

function getMeasureContext() {
  if (typeof document === 'undefined') return null;
  measureCanvas ??= document.createElement('canvas');
  return measureCanvas.getContext('2d');
}

function formatCanvasFontFamily(fontFamily: string) {
  return fontFamily
    .split(',')
    .map((family) => {
      const clean = family.trim();
      if (!clean || clean.startsWith('"') || clean.startsWith("'") || /^[a-z-]+$/i.test(clean)) return clean;
      return `"${clean.replace(/"/g, '')}"`;
    })
    .join(', ');
}

function getLocalBoxWorldCenter(element: CardElement, box: Bounds) {
  const radians = element.rotation * (Math.PI / 180);
  const elementCenter = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const localCenter = {
    x: box.x + box.width / 2 - element.width / 2,
    y: box.y + box.height / 2 - element.height / 2,
  };
  return {
    x: elementCenter.x + rotateX(localCenter.x, localCenter.y, radians),
    y: elementCenter.y + rotateY(localCenter.x, localCenter.y, radians),
  };
}

function getElementVisualWorldBounds(element: CardElement, naturalSize?: NaturalSize): Bounds {
  const box = getElementVisualBox(element, naturalSize);
  const radians = element.rotation * (Math.PI / 180);
  const elementCenter = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
  const corners = [
    { x: box.x, y: box.y },
    { x: box.x + box.width, y: box.y },
    { x: box.x + box.width, y: box.y + box.height },
    { x: box.x, y: box.y + box.height },
  ].map((corner) => {
    const localX = corner.x - element.width / 2;
    const localY = corner.y - element.height / 2;
    return {
      x: elementCenter.x + rotateX(localX, localY, radians),
      y: elementCenter.y + rotateY(localX, localY, radians),
    };
  });
  const minX = Math.min(...corners.map((corner) => corner.x));
  const minY = Math.min(...corners.map((corner) => corner.y));
  const maxX = Math.max(...corners.map((corner) => corner.x));
  const maxY = Math.max(...corners.map((corner) => corner.y));
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function pointerAngle(clientX: number, clientY: number, rect: DOMRect, zoom: number, centerX: number, centerY: number) {
  const pointerX = (clientX - rect.left) / zoom;
  const pointerY = (clientY - rect.top) / zoom;
  return Math.atan2(pointerY - centerY, pointerX - centerX) * (180 / Math.PI);
}

function handleSigns(handle: FreeTransformHandle) {
  return {
    x: handle.includes('w') ? -1 : handle.includes('e') ? 1 : 0,
    y: handle.includes('n') ? -1 : handle.includes('s') ? 1 : 0,
  };
}

function rotateX(x: number, y: number, radians: number) {
  return x * Math.cos(radians) - y * Math.sin(radians);
}

function rotateY(x: number, y: number, radians: number) {
  return x * Math.sin(radians) + y * Math.cos(radians);
}

function inverseRotate(x: number, y: number, radians: number) {
  return {
    x: x * Math.cos(radians) + y * Math.sin(radians),
    y: -x * Math.sin(radians) + y * Math.cos(radians),
  };
}

function normalizeAngle(angle: number) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}
