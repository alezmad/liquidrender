// Kanban Component - Column-based board layout with drag and drop
import React, { useState, useCallback, useRef } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, buttonStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  avatar?: string;
  avatarAlt?: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

interface KanbanData {
  columns: KanbanColumn[];
}

interface DragState {
  cardId: string | null;
  sourceColumnId: string | null;
  targetColumnId: string | null;
  targetIndex: number | null;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    overflow: 'hidden',
  }),

  header: {
    marginBottom: tokens.spacing.md,
    fontWeight: tokens.fontWeight.semibold,
    fontSize: tokens.fontSize.lg,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  board: {
    display: 'flex',
    gap: tokens.spacing.md,
    overflowX: 'auto',
    paddingBottom: tokens.spacing.sm,
  } as React.CSSProperties,

  column: {
    minWidth: '280px',
    maxWidth: '320px',
    flexShrink: 0,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.lg,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '70vh',
  } as React.CSSProperties,

  columnDragOver: {
    outline: `2px dashed ${tokens.colors.primary}`,
    outlineOffset: '-2px',
  } as React.CSSProperties,

  columnHeader: {
    padding: tokens.spacing.md,
    fontWeight: tokens.fontWeight.medium,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.foreground,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  columnCount: {
    backgroundColor: tokens.colors.secondary,
    color: tokens.colors.secondaryForeground,
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    borderRadius: tokens.radius.full,
    minWidth: '24px',
    textAlign: 'center',
  } as React.CSSProperties,

  columnBody: {
    flex: 1,
    padding: tokens.spacing.sm,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  card: {
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    cursor: 'grab',
    transition: `all ${tokens.transition.fast}`,
    boxShadow: tokens.shadow.sm,
  } as React.CSSProperties,

  cardDragging: {
    opacity: 0.5,
    transform: 'rotate(3deg)',
  } as React.CSSProperties,

  cardHover: {
    boxShadow: tokens.shadow.md,
    borderColor: tokens.colors.primary,
  } as React.CSSProperties,

  cardTitle: {
    fontWeight: tokens.fontWeight.medium,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.xs,
    wordBreak: 'break-word',
  } as React.CSSProperties,

  cardDescription: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    marginBottom: tokens.spacing.sm,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  } as React.CSSProperties,

  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
    flex: 1,
  } as React.CSSProperties,

  tag: {
    fontSize: tokens.fontSize.xs,
    padding: `2px ${tokens.spacing.sm}`,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.colors.accent,
    color: tokens.colors.accentForeground,
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  avatar: {
    width: '24px',
    height: '24px',
    borderRadius: tokens.radius.full,
    objectFit: 'cover',
    flexShrink: 0,
    border: `2px solid ${tokens.colors.background}`,
    boxShadow: tokens.shadow.sm,
  } as React.CSSProperties,

  avatarPlaceholder: {
    width: '24px',
    height: '24px',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.secondaryForeground,
    flexShrink: 0,
  } as React.CSSProperties,

  addButton: mergeStyles(buttonStyles('ghost', 'sm'), {
    width: '100%',
    justifyContent: 'flex-start',
    gap: tokens.spacing.sm,
    color: tokens.colors.mutedForeground,
    margin: tokens.spacing.sm,
    marginTop: 0,
  }),

  dropIndicator: {
    height: '2px',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.full,
    margin: `${tokens.spacing.xs} 0`,
  } as React.CSSProperties,

  empty: {
    padding: tokens.spacing['2xl'],
    textAlign: 'center',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
  } as React.CSSProperties,

  emptyColumn: {
    padding: tokens.spacing.lg,
    textAlign: 'center',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.xs,
    fontStyle: 'italic',
  } as React.CSSProperties,

  visuallyHidden: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function parseKanbanData(raw: unknown): KanbanData | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  if (!Array.isArray(data.columns)) return null;

  return {
    columns: data.columns.map((col: unknown) => {
      const column = col as Record<string, unknown>;
      return {
        id: String(column.id || generateId('col')),
        title: String(column.title || 'Untitled'),
        cards: Array.isArray(column.cards)
          ? column.cards.map((card: unknown) => {
              const c = card as Record<string, unknown>;
              return {
                id: String(c.id || generateId('card')),
                title: String(c.title || 'Untitled'),
                description: c.description ? String(c.description) : undefined,
                tags: Array.isArray(c.tags) ? c.tags.map(String) : undefined,
                avatar: c.avatar ? String(c.avatar) : undefined,
                avatarAlt: c.avatarAlt ? String(c.avatarAlt) : undefined,
              };
            })
          : [],
      };
    }),
  };
}

// ============================================================================
// Sub-components
// ============================================================================

interface CardAvatarProps {
  src?: string;
  alt?: string;
}

function CardAvatar({ src, alt }: CardAvatarProps): React.ReactElement | null {
  if (!src && !alt) return null;

  if (src) {
    return (
      <img
        src={src}
        alt={alt || 'Avatar'}
        style={styles.avatar as React.CSSProperties}
      />
    );
  }

  return (
    <div style={styles.avatarPlaceholder}>
      {getInitials(alt || '?')}
    </div>
  );
}

interface KanbanCardItemProps {
  card: KanbanCard;
  columnId: string;
  isDragging: boolean;
  isHovered: boolean;
  onDragStart: (cardId: string, columnId: string) => void;
  onDragEnd: () => void;
  onHover: (cardId: string | null) => void;
  instructionsId: string;
}

function KanbanCardItem({
  card,
  columnId,
  isDragging,
  isHovered,
  onDragStart,
  onDragEnd,
  onHover,
  instructionsId,
}: KanbanCardItemProps): React.ReactElement {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    onDragStart(card.id, columnId);
  };

  return (
    <div
      draggable
      role="listitem"
      aria-roledescription="draggable item"
      aria-grabbed={isDragging}
      aria-describedby={instructionsId}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => onHover(card.id)}
      onMouseLeave={() => onHover(null)}
      style={mergeStyles(
        styles.card,
        isDragging ? styles.cardDragging : undefined,
        isHovered && !isDragging ? styles.cardHover : undefined
      )}
    >
      <div style={styles.cardTitle}>{card.title}</div>
      {card.description && (
        <div style={styles.cardDescription}>{card.description}</div>
      )}
      {((card.tags && card.tags.length > 0) || card.avatar || card.avatarAlt) && (
        <div style={styles.cardFooter}>
          {card.tags && card.tags.length > 0 && (
            <div style={styles.tagContainer}>
              {card.tags.slice(0, 3).map((tag, i) => (
                <span key={i} style={styles.tag}>{tag}</span>
              ))}
              {card.tags.length > 3 && (
                <span style={styles.tag}>+{card.tags.length - 3}</span>
              )}
            </div>
          )}
          <CardAvatar src={card.avatar} alt={card.avatarAlt} />
        </div>
      )}
    </div>
  );
}

interface PlusIconProps {
  size?: number;
}

function PlusIcon({ size = 16 }: PlusIconProps): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Kanban({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const [boardData, setBoardData] = useState<KanbanData | null>(() => {
    const raw = resolveBinding(block.binding, context);
    return parseKanbanData(raw);
  });

  const [dragState, setDragState] = useState<DragState>({
    cardId: null,
    sourceColumnId: null,
    targetColumnId: null,
    targetIndex: null,
  });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const dragCounterRef = useRef<Map<string, number>>(new Map());

  const handleDragStart = useCallback((cardId: string, columnId: string) => {
    setDragState({
      cardId,
      sourceColumnId: columnId,
      targetColumnId: null,
      targetIndex: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    // Perform the move if we have a valid target
    if (
      boardData &&
      dragState.cardId &&
      dragState.sourceColumnId &&
      dragState.targetColumnId
    ) {
      setBoardData(prev => {
        if (!prev) return prev;

        const newColumns = prev.columns.map(col => ({
          ...col,
          cards: [...col.cards],
        }));

        // Find source and target columns
        const sourceCol = newColumns.find(c => c.id === dragState.sourceColumnId);
        const targetCol = newColumns.find(c => c.id === dragState.targetColumnId);

        if (!sourceCol || !targetCol) return prev;

        // Find and remove card from source
        const cardIndex = sourceCol.cards.findIndex(c => c.id === dragState.cardId);
        if (cardIndex === -1) return prev;

        const [card] = sourceCol.cards.splice(cardIndex, 1);
        if (!card) return prev;

        // Insert into target
        const insertIndex = dragState.targetIndex ?? targetCol.cards.length;
        targetCol.cards.splice(insertIndex, 0, card);

        return { columns: newColumns };
      });
    }

    setDragState({
      cardId: null,
      sourceColumnId: null,
      targetColumnId: null,
      targetIndex: null,
    });
    dragCounterRef.current.clear();
  }, [boardData, dragState]);

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    setDragState(prev => ({
      ...prev,
      targetColumnId: columnId,
    }));
  }, []);

  const handleColumnDragEnter = useCallback((columnId: string) => {
    const count = dragCounterRef.current.get(columnId) || 0;
    dragCounterRef.current.set(columnId, count + 1);
  }, []);

  const handleColumnDragLeave = useCallback((columnId: string) => {
    const count = dragCounterRef.current.get(columnId) || 0;
    if (count <= 1) {
      dragCounterRef.current.delete(columnId);
      setDragState(prev => {
        if (prev.targetColumnId === columnId) {
          return { ...prev, targetColumnId: null };
        }
        return prev;
      });
    } else {
      dragCounterRef.current.set(columnId, count - 1);
    }
  }, []);

  const handleAddCard = useCallback((columnId: string) => {
    const newCard: KanbanCard = {
      id: generateId('card'),
      title: 'New Card',
      description: 'Click to edit...',
    };

    setBoardData(prev => {
      if (!prev) return prev;
      return {
        columns: prev.columns.map(col =>
          col.id === columnId
            ? { ...col, cards: [...col.cards, newCard] }
            : col
        ),
      };
    });
  }, []);

  const label = block.label;
  const instructionsId = 'kanban-dnd-instructions';

  // Empty state
  if (!boardData || boardData.columns.length === 0) {
    return (
      <div data-liquid-type="kanban" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.empty}>No columns available</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="kanban" style={styles.wrapper}>
      {label && <div style={styles.header}>{label}</div>}
      <div id={instructionsId} style={styles.visuallyHidden}>
        Press space bar to start dragging. While dragging, use arrow keys to move the item. Press space bar again to drop the item in its new position, or press escape to cancel.
      </div>

      <div style={styles.board} role="region" aria-label={label || 'Kanban board'}>
        {boardData.columns.map(column => (
          <div
            key={column.id}
            role="group"
            aria-label={`${column.title} column, ${column.cards.length} cards`}
            aria-dropeffect={dragState.cardId ? 'move' : 'none'}
            style={mergeStyles(
              styles.column,
              dragState.targetColumnId === column.id && dragState.cardId ? styles.columnDragOver : undefined
            )}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragEnter={() => handleColumnDragEnter(column.id)}
            onDragLeave={() => handleColumnDragLeave(column.id)}
            onDrop={handleDragEnd}
          >
            <div style={styles.columnHeader}>
              <span>{column.title}</span>
              <span style={styles.columnCount as React.CSSProperties} aria-hidden="true">
                {column.cards.length}
              </span>
            </div>

            <div style={styles.columnBody as React.CSSProperties} role="list">
              {column.cards.length > 0 ? (
                column.cards.map((card) => (
                  <KanbanCardItem
                    key={card.id}
                    card={card}
                    columnId={column.id}
                    isDragging={dragState.cardId === card.id}
                    isHovered={hoveredCard === card.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onHover={setHoveredCard}
                    instructionsId={instructionsId}
                  />
                ))
              ) : (
                <div style={styles.emptyColumn as React.CSSProperties} role="listitem">
                  Drop cards here
                </div>
              )}
            </div>

            <button
              type="button"
              style={styles.addButton}
              onClick={() => handleAddCard(column.id)}
              aria-label={`Add card to ${column.title}`}
            >
              <PlusIcon size={14} />
              Add card
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticKanbanProps {
  columns: KanbanColumn[];
  title?: string;
  onCardMove?: (cardId: string, sourceColumnId: string, targetColumnId: string, targetIndex: number) => void;
  onAddCard?: (columnId: string) => void;
  style?: React.CSSProperties;
}

export function StaticKanban({
  columns: initialColumns,
  title,
  onCardMove,
  onAddCard,
  style: customStyle,
}: StaticKanbanProps): React.ReactElement {
  const [columns, setColumns] = useState<KanbanColumn[]>(initialColumns);
  const [dragState, setDragState] = useState<DragState>({
    cardId: null,
    sourceColumnId: null,
    targetColumnId: null,
    targetIndex: null,
  });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const dragCounterRef = useRef<Map<string, number>>(new Map());

  const handleDragStart = useCallback((cardId: string, columnId: string) => {
    setDragState({
      cardId,
      sourceColumnId: columnId,
      targetColumnId: null,
      targetIndex: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    if (
      dragState.cardId &&
      dragState.sourceColumnId &&
      dragState.targetColumnId
    ) {
      const targetIndex = dragState.targetIndex ??
        (columns.find(c => c.id === dragState.targetColumnId)?.cards.length ?? 0);

      if (onCardMove) {
        onCardMove(
          dragState.cardId,
          dragState.sourceColumnId,
          dragState.targetColumnId,
          targetIndex
        );
      } else {
        // Internal state update
        setColumns(prev => {
          const newColumns = prev.map(col => ({
            ...col,
            cards: [...col.cards],
          }));

          const sourceCol = newColumns.find(c => c.id === dragState.sourceColumnId);
          const targetCol = newColumns.find(c => c.id === dragState.targetColumnId);

          if (!sourceCol || !targetCol) return prev;

          const cardIndex = sourceCol.cards.findIndex(c => c.id === dragState.cardId);
          if (cardIndex === -1) return prev;

          const [card] = sourceCol.cards.splice(cardIndex, 1);
          if (!card) return prev;

          targetCol.cards.splice(targetIndex, 0, card);

          return newColumns;
        });
      }
    }

    setDragState({
      cardId: null,
      sourceColumnId: null,
      targetColumnId: null,
      targetIndex: null,
    });
    dragCounterRef.current.clear();
  }, [columns, dragState, onCardMove]);

  const handleColumnDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragState(prev => ({ ...prev, targetColumnId: columnId }));
  }, []);

  const handleColumnDragEnter = useCallback((columnId: string) => {
    const count = dragCounterRef.current.get(columnId) || 0;
    dragCounterRef.current.set(columnId, count + 1);
  }, []);

  const handleColumnDragLeave = useCallback((columnId: string) => {
    const count = dragCounterRef.current.get(columnId) || 0;
    if (count <= 1) {
      dragCounterRef.current.delete(columnId);
      setDragState(prev => {
        if (prev.targetColumnId === columnId) {
          return { ...prev, targetColumnId: null };
        }
        return prev;
      });
    } else {
      dragCounterRef.current.set(columnId, count - 1);
    }
  }, []);

  const handleAddCard = useCallback((columnId: string) => {
    if (onAddCard) {
      onAddCard(columnId);
    } else {
      const newCard: KanbanCard = {
        id: generateId('card'),
        title: 'New Card',
        description: 'Click to edit...',
      };
      setColumns(prev => prev.map(col =>
        col.id === columnId
          ? { ...col, cards: [...col.cards, newCard] }
          : col
      ));
    }
  }, [onAddCard]);

  const instructionsId = 'static-kanban-dnd-instructions';

  if (columns.length === 0) {
    return (
      <div style={mergeStyles(styles.wrapper, customStyle)}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.empty}>No columns available</div>
      </div>
    );
  }

  return (
    <div style={mergeStyles(styles.wrapper, customStyle)}>
      {title && <div style={styles.header}>{title}</div>}
      <div id={instructionsId} style={styles.visuallyHidden}>
        Press space bar to start dragging. While dragging, use arrow keys to move the item. Press space bar again to drop the item in its new position, or press escape to cancel.
      </div>

      <div style={styles.board} role="region" aria-label={title || 'Kanban board'}>
        {columns.map(column => (
          <div
            key={column.id}
            role="group"
            aria-label={`${column.title} column, ${column.cards.length} cards`}
            aria-dropeffect={dragState.cardId ? 'move' : 'none'}
            style={mergeStyles(
              styles.column,
              dragState.targetColumnId === column.id && dragState.cardId ? styles.columnDragOver : undefined
            )}
            onDragOver={(e) => handleColumnDragOver(e, column.id)}
            onDragEnter={() => handleColumnDragEnter(column.id)}
            onDragLeave={() => handleColumnDragLeave(column.id)}
            onDrop={handleDragEnd}
          >
            <div style={styles.columnHeader}>
              <span>{column.title}</span>
              <span style={styles.columnCount as React.CSSProperties} aria-hidden="true">
                {column.cards.length}
              </span>
            </div>

            <div style={styles.columnBody as React.CSSProperties} role="list">
              {column.cards.length > 0 ? (
                column.cards.map((card) => (
                  <KanbanCardItem
                    key={card.id}
                    card={card}
                    columnId={column.id}
                    isDragging={dragState.cardId === card.id}
                    isHovered={hoveredCard === card.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onHover={setHoveredCard}
                    instructionsId={instructionsId}
                  />
                ))
              ) : (
                <div style={styles.emptyColumn as React.CSSProperties} role="listitem">
                  Drop cards here
                </div>
              )}
            </div>

            <button
              type="button"
              style={styles.addButton}
              onClick={() => handleAddCard(column.id)}
              aria-label={`Add card to ${column.title}`}
            >
              <PlusIcon size={14} />
              Add card
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Kanban;
