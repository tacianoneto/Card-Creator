import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, GripVertical, MoveRight, Plus, Trash2 } from 'lucide-react';

import { CardElementView } from './CardElementView';
import { getBackgroundStyle, getTextureStyle } from '../lib/editor';
import type { CardDocument, Deck } from '../types';

const CARD_ITEM_WIDTH = 232;
const VIRTUAL_BUFFER = 8;

interface CardStripProps {
  cards: CardDocument[];
  activeCardId: string;
  onSelectCard: (cardId: string) => void;
  onAddCard: () => void;
  onDuplicateCard: (cardId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onRenameCard: (cardId: string, name: string) => void;
  onReorderCards: (draggedCardId: string, targetCardId: string) => void;
  onDeleteCards: (cardIds: string[]) => void;
  onMoveCardsToDeck: (cardIds: string[], targetDeckId: string) => void;
  // Deck props
  decks: Deck[];
  activeDeckId: string;
  isCanvasInteracting?: boolean;
  onSelectDeck: (deckId: string) => void;
  onAddDeck: () => void;
  onRenameDeck: (deckId: string, name: string) => void;
  onDeleteDeck: (deckId: string) => void;
}

// ── Memoized card thumbnail — only re-renders when the card data itself changes
const CardThumbnail = memo(function CardThumbnail({ card }: { card: CardDocument }) {
  const scale = Math.min(64 / card.width, 90 / card.height);
  const sortedElements = useMemo(
    () => [...card.elements].filter((el) => !el.hidden).sort((a, b) => a.zIndex - b.zIndex),
    [card.elements],
  );
  return (
    <div
      className="card-strip__preview-shell"
      style={{ width: card.width * scale, height: card.height * scale }}
    >
      <div
        className="card-strip__preview-scale"
        style={{ width: card.width, height: card.height, transform: `scale(${scale})` }}
      >
        <div className="card-surface card-surface--preview" style={{ width: card.width, height: card.height }}>
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
          {sortedElements.map((element) => (
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
});

const LightweightCardThumbnail = memo(function LightweightCardThumbnail({ card }: { card: CardDocument }) {
  const scale = Math.min(64 / card.width, 90 / card.height);
  const label = useMemo(() => {
    const firstText = card.elements.find((element) => {
      if (element.hidden) return false;
      return element.type === 'text' || element.type === 'title' || element.type === 'number';
    });
    return firstText?.type === 'text' ? firstText.content :
      firstText?.type === 'title' ? firstText.text :
      firstText?.type === 'number' ? firstText.value :
      card.name;
  }, [card.elements, card.name]);

  return (
    <div
      className="card-strip__preview-shell"
      style={{ width: card.width * scale, height: card.height * scale }}
    >
      <div
        className="card-strip__preview-lite"
        style={{
          background: getBackgroundStyle(card.background).background,
          borderColor: card.background.secondaryColor,
        }}
      >
        <strong>{label}</strong>
        <span>{card.elements.length} el.</span>
      </div>
    </div>
  );
});

export function CardStrip({
  cards,
  activeCardId,
  onSelectCard,
  onAddCard,
  onDuplicateCard,
  onDeleteCard,
  onRenameCard,
  onReorderCards,
  onDeleteCards,
  onMoveCardsToDeck,
  decks,
  activeDeckId,
  isCanvasInteracting = false,
  onSelectDeck,
  onAddDeck,
  onRenameDeck,
  onDeleteDeck,
}: CardStripProps) {
  const [renamingDeckId, setRenamingDeckId] = useState<string | null>(null);
  const [renamingCardId, setRenamingCardId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedCardState, setSelectedCardState] = useState<{ deckId: string; ids: string[] }>({
    deckId: activeDeckId,
    ids: [],
  });
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [dragOverDeckId, setDragOverDeckId] = useState<string | null>(null);
  const [scrollWindow, setScrollWindow] = useState({ start: 0, end: 36 });
  const renameInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollFrameRef = useRef<number | null>(null);

  const activeDeck = decks.find((d) => d.id === activeDeckId);
  const cardIdSet = useMemo(() => new Set(cards.map((card) => card.id)), [cards]);
  const selectedCardIds = useMemo(
    () =>
      selectedCardState.deckId === activeDeckId
        ? selectedCardState.ids.filter((id) => cardIdSet.has(id))
        : [],
    [activeDeckId, cardIdSet, selectedCardState],
  );
  const selectedCardsInDeck = selectedCardIds;
  const canBatchDelete = selectedCardsInDeck.length > 0 && cards.length - selectedCardsInDeck.length >= 1;
  const canBatchMove = selectedCardsInDeck.length > 0 && decks.length > 1 && cards.length - selectedCardsInDeck.length >= 1;
  const useLightweightPreviews = cards.length > 48;
  const shouldVirtualize = cards.length > 40;
  const visibleCards = useMemo(() => {
    if (!shouldVirtualize) return cards.map((card, index) => ({ card, index }));
    return cards.slice(scrollWindow.start, scrollWindow.end).map((card, offset) => ({
      card,
      index: scrollWindow.start + offset,
    }));
  }, [cards, scrollWindow, shouldVirtualize]);
  const leftSpacer = shouldVirtualize ? scrollWindow.start * CARD_ITEM_WIDTH : 0;
  const rightSpacer = shouldVirtualize ? Math.max(0, cards.length - scrollWindow.end) * CARD_ITEM_WIDTH : 0;

  const updateScrollWindow = useCallback(() => {
    const list = listRef.current;
    if (!list || !shouldVirtualize) return;
    const start = Math.max(0, Math.floor(list.scrollLeft / CARD_ITEM_WIDTH) - VIRTUAL_BUFFER);
    const visibleCount = Math.ceil(list.clientWidth / CARD_ITEM_WIDTH) + VIRTUAL_BUFFER * 2;
    const end = Math.min(cards.length, start + visibleCount);
    setScrollWindow((current) => (
      current.start === start && current.end === end ? current : { start, end }
    ));
  }, [cards.length, shouldVirtualize]);

  const scheduleScrollWindowUpdate = useCallback(() => {
    if (scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateScrollWindow();
    });
  }, [updateScrollWindow]);

  useEffect(() => {
    updateScrollWindow();
  }, [cards.length, shouldVirtualize, updateScrollWindow]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  useEffect(() => {
    if (!shouldVirtualize) return;
    const list = listRef.current;
    if (!list) return;
    const handleResize = () => scheduleScrollWindowUpdate();
    const observer = new ResizeObserver(handleResize);
    observer.observe(list);
    return () => observer.disconnect();
  }, [shouldVirtualize, scheduleScrollWindowUpdate]);

  function setSelectedCardIds(updater: string[] | ((current: string[]) => string[])) {
    setSelectedCardState((current) => {
      const base =
        current.deckId === activeDeckId
          ? current.ids.filter((id) => cardIdSet.has(id))
          : [];
      const ids = typeof updater === 'function' ? updater(base) : updater;
      return { deckId: activeDeckId, ids };
    });
  }

  function startDeckRename(deck: Deck) {
    setRenamingDeckId(deck.id);
    setRenamingCardId(null);
    setRenameValue(deck.name);
    setTimeout(() => renameInputRef.current?.select(), 30);
  }

  function commitDeckRename() {
    if (renamingDeckId && renameValue.trim()) {
      onRenameDeck(renamingDeckId, renameValue.trim());
    }
    setRenamingDeckId(null);
  }

  function startCardRename(card: CardDocument) {
    setRenamingCardId(card.id);
    setRenamingDeckId(null);
    setRenameValue(card.name);
    setTimeout(() => renameInputRef.current?.select(), 30);
  }

  function commitCardRename() {
    if (renamingCardId && renameValue.trim()) {
      onRenameCard(renamingCardId, renameValue.trim());
    }
    setRenamingCardId(null);
  }

  function toggleCardSelection(cardId: string, additive: boolean) {
    setSelectedCardIds((current) => {
      if (!additive) return current.includes(cardId) ? [] : [cardId];
      return current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId];
    });
  }

  function getDragCardIds(cardId: string) {
    return selectedCardsInDeck.includes(cardId) ? selectedCardsInDeck : [cardId];
  }

  function handleMoveSelection(targetDeckId: string) {
    if (targetDeckId === activeDeckId || !canBatchMove) return;
    onMoveCardsToDeck(selectedCardsInDeck, targetDeckId);
    setSelectedCardIds([]);
  }

  return (
    <section className="card-strip">
      {/* ── Deck tabs row ───────────────────────────────────────────── */}
      <div className="card-strip__decks">
        <div className="card-strip__deck-tabs">
          {decks.map((deck) => {
            const isActive = deck.id === activeDeckId;
            return (
              <div
                key={deck.id}
                className={`card-strip__deck-tab${isActive ? ' card-strip__deck-tab--active' : ''}`}
                style={{ '--deck-color': deck.color } as React.CSSProperties}
                onClick={() => onSelectDeck(deck.id)}
                onDoubleClick={() => startDeckRename(deck)}
                onDragOver={(e) => {
                  if (deck.id !== activeDeckId) {
                    e.preventDefault();
                    setDragOverDeckId(deck.id);
                  }
                }}
                onDragLeave={() => setDragOverDeckId((id) => (id === deck.id ? null : id))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverDeckId(null);
                  if (deck.id === activeDeckId) return;
                  const payload = e.dataTransfer.getData('application/x-bcs-card');
                  if (!payload) return;
                  try {
                    const parsed = JSON.parse(payload) as { cardIds?: string[] };
                    onMoveCardsToDeck(parsed.cardIds ?? [], deck.id);
                    setSelectedCardIds([]);
                  } catch {
                    // Ignore malformed drags from outside the app.
                  }
                }}
                title={deck.name}
              >
                <span
                  className="card-strip__deck-dot"
                  style={{ background: deck.color }}
                />
                {renamingDeckId === deck.id ? (
                  <input
                    ref={renameInputRef}
                    className="card-strip__deck-rename"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitDeckRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitDeckRename();
                      if (e.key === 'Escape') setRenamingDeckId(null);
                      e.stopPropagation();
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className="card-strip__deck-name">{deck.name}</span>
                )}
                <span className="card-strip__deck-count">{deck.cards.length}</span>
                {decks.length > 1 && (
                  <button
                    type="button"
                    className="card-strip__deck-delete"
                    title="Excluir baralho"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDeck(deck.id);
                    }}
                  >
                    ×
                  </button>
                )}
                {dragOverDeckId === deck.id && <span className="card-strip__deck-drop" />}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="card-strip__deck-add"
          title="Novo baralho"
          onClick={onAddDeck}
        >
          <Plus size={11} />
          <span>Novo baralho</span>
        </button>
      </div>

      {/* ── Cards header ────────────────────────────────────────────── */}
      <div className="card-strip__header">
        <span className="card-strip__header-title">
          {activeDeck ? activeDeck.name : 'Cartas'}
          {activeDeck && (
            <span className="card-strip__header-size">
              {activeDeck.cardWidth}×{activeDeck.cardHeight}px
            </span>
          )}
        </span>
        <div className="card-strip__header-actions">
          <span>
            {selectedCardsInDeck.length > 0
              ? `${selectedCardsInDeck.length} selecionada${selectedCardsInDeck.length !== 1 ? 's' : ''}`
              : `${cards.length} carta${cards.length !== 1 ? 's' : ''}`}
          </span>
          {selectedCardsInDeck.length > 0 && (
            <>
              <select
                className="card-strip__move-select"
                value=""
                onChange={(e) => {
                  handleMoveSelection(e.target.value);
                  e.currentTarget.value = '';
                }}
                disabled={!canBatchMove}
                title={canBatchMove ? 'Mover cartas selecionadas' : 'Mantenha pelo menos uma carta neste baralho'}
              >
                <option value="">Mover para...</option>
                {decks
                  .filter((deck) => deck.id !== activeDeckId)
                  .map((deck) => (
                    <option key={deck.id} value={deck.id}>{deck.name}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  onDeleteCards(selectedCardsInDeck);
                  setSelectedCardIds([]);
                }}
                disabled={!canBatchDelete}
                title={canBatchDelete ? 'Excluir cartas selecionadas' : 'Mantenha pelo menos uma carta neste baralho'}
              >
                <Trash2 size={12} />
                Excluir seleção
              </button>
            </>
          )}
          <button type="button" onClick={onAddCard}>
            <Plus size={12} />
            Nova carta
          </button>
        </div>
      </div>

      {/* ── Cards filmstrip ─────────────────────────────────────────── */}
      <div ref={listRef} className="card-strip__list" onScroll={scheduleScrollWindowUpdate}>
        {leftSpacer > 0 ? <span className="card-strip__virtual-spacer" style={{ width: leftSpacer }} /> : null}
        {visibleCards.map(({ card }) => {
          const isActive = activeCardId === card.id;
          const isSelected = selectedCardsInDeck.includes(card.id);

          return (
            <article
              key={card.id}
              className={[
                'card-strip__card',
                isActive ? 'card-strip__card--active' : '',
                isSelected ? 'card-strip__card--selected' : '',
                dragOverCardId === card.id ? 'card-strip__card--drop' : '',
              ].filter(Boolean).join(' ')}
              draggable
              onDragStart={(e) => {
                const cardIds = getDragCardIds(card.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('application/x-bcs-card', JSON.stringify({
                  fromDeckId: activeDeckId,
                  draggedCardId: card.id,
                  cardIds,
                }));
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCardId(card.id);
              }}
              onDragLeave={() => setDragOverCardId((id) => (id === card.id ? null : id))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCardId(null);
                const payload = e.dataTransfer.getData('application/x-bcs-card');
                if (!payload) return;
                try {
                  const parsed = JSON.parse(payload) as { fromDeckId?: string; draggedCardId?: string };
                  if (parsed.fromDeckId === activeDeckId && parsed.draggedCardId && parsed.draggedCardId !== card.id) {
                    onReorderCards(parsed.draggedCardId, card.id);
                  }
                } catch {
                  // Ignore malformed drags from outside the app.
                }
              }}
            >
              <button
                type="button"
                className="card-strip__drag-handle"
                title="Arrastar carta"
                aria-label="Arrastar carta"
              >
                <GripVertical size={13} />
              </button>
              <button
                type="button"
                className="card-strip__preview"
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey || e.shiftKey) {
                    toggleCardSelection(card.id, true);
                    return;
                  }
                  onSelectCard(card.id);
                }}
              >
                {(isCanvasInteracting || (useLightweightPreviews && !isActive)) ? (
                  <LightweightCardThumbnail card={card} />
                ) : (
                  <CardThumbnail card={card} />
                )}
              </button>

              <div className="card-strip__meta">
                <div>
                  <label className="card-strip__select">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCardSelection(card.id, true)}
                    />
                    <span />
                  </label>
                  {renamingCardId === card.id ? (
                    <input
                      ref={renameInputRef}
                      className="card-strip__card-rename"
                      value={renameValue}
                      maxLength={60}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitCardRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitCardRename();
                        if (e.key === 'Escape') setRenamingCardId(null);
                        e.stopPropagation();
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <strong onDoubleClick={() => startCardRename(card)} title="Duplo clique para renomear">
                      {card.name}
                    </strong>
                  )}
                  <span>{card.elements.length} el.</span>
                </div>
                <div className="card-strip__actions">
                  {selectedCardsInDeck.length > 0 && decks.length > 1 && (
                    <button
                      type="button"
                      title="Mover seleção para o próximo baralho"
                      disabled={!canBatchMove}
                      onClick={() => {
                        const targetDeck = decks.find((deck) => deck.id !== activeDeckId);
                        if (targetDeck) handleMoveSelection(targetDeck.id);
                      }}
                    >
                      <MoveRight size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="Duplicar carta"
                    onClick={() => onDuplicateCard(card.id)}
                  >
                    <Copy size={12} />
                    <span>Duplicar</span>
                  </button>
                  <button
                    type="button"
                    title="Remover carta"
                    onClick={() => onDeleteCard(card.id)}
                    disabled={cards.length === 1}
                  >
                    <Trash2 size={12} />
                    <span>Excluir</span>
                  </button>
                </div>
              </div>
            </article>
          );
        })}
        {rightSpacer > 0 ? <span className="card-strip__virtual-spacer" style={{ width: rightSpacer }} /> : null}
      </div>
    </section>
  );
}
