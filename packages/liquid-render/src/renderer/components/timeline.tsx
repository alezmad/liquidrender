// Timeline Component - Event timeline with connecting lines and markers
import React from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, baseStyles, formatDisplayValue, fieldToLabel, chartColors } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

export interface TimelineEvent {
  /** Event date/time */
  date?: string | Date;
  /** Event title */
  title?: string;
  /** Event description */
  description?: string;
  /** Event type for color coding */
  type?: string;
  /** Custom icon (emoji or text) */
  icon?: string;
  /** Event status */
  status?: 'completed' | 'current' | 'pending';
}

type TimelineOrientation = 'vertical' | 'horizontal';
type TimelineLayout = 'left' | 'right' | 'alternate';

// Event type to color mapping
const eventTypeColors: Record<string, string> = {
  success: tokens.colors.success,
  error: tokens.colors.error,
  warning: tokens.colors.warning,
  info: tokens.colors.info,
  primary: tokens.colors.primary,
  default: tokens.colors.mutedForeground,
};

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
  }),

  container: {
    display: 'flex',
    position: 'relative' as const,
  },

  containerVertical: {
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
  },

  containerHorizontal: {
    flexDirection: 'row' as const,
    gap: tokens.spacing.md,
    overflowX: 'auto' as const,
    paddingBottom: tokens.spacing.sm,
  },

  header: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.md,
  } as React.CSSProperties,

  empty: {
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center' as const,
    padding: tokens.spacing.lg,
  } as React.CSSProperties,

  // Vertical timeline item
  timelineItem: {
    display: 'flex',
    position: 'relative' as const,
    paddingBottom: tokens.spacing.lg,
  } as React.CSSProperties,

  timelineItemLast: {
    paddingBottom: 0,
  } as React.CSSProperties,

  // Marker and line container
  markerContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flexShrink: 0,
    width: '2.5rem',
  } as React.CSSProperties,

  // Dot marker
  dot: {
    width: '1rem',
    height: '1rem',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primary,
    border: `2px solid ${tokens.colors.background}`,
    boxShadow: `0 0 0 2px ${tokens.colors.border}`,
    zIndex: 1,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.5rem',
  } as React.CSSProperties,

  dotCompleted: {
    backgroundColor: tokens.colors.success,
    boxShadow: `0 0 0 2px ${tokens.colors.success}`,
  } as React.CSSProperties,

  dotCurrent: {
    backgroundColor: tokens.colors.primary,
    boxShadow: `0 0 0 3px ${tokens.colors.primary}`,
    width: '1.25rem',
    height: '1.25rem',
  } as React.CSSProperties,

  dotPending: {
    backgroundColor: tokens.colors.muted,
    boxShadow: `0 0 0 2px ${tokens.colors.border}`,
  } as React.CSSProperties,

  // Connecting line
  line: {
    width: '2px',
    flex: 1,
    backgroundColor: tokens.colors.border,
    marginTop: tokens.spacing.xs,
  } as React.CSSProperties,

  lineCompleted: {
    backgroundColor: tokens.colors.success,
  } as React.CSSProperties,

  // Content area
  content: {
    flex: 1,
    paddingLeft: tokens.spacing.md,
    minWidth: 0,
  } as React.CSSProperties,

  contentRight: {
    paddingLeft: 0,
    paddingRight: tokens.spacing.md,
    textAlign: 'right' as const,
  } as React.CSSProperties,

  date: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  title: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  description: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    lineHeight: 1.5,
  } as React.CSSProperties,

  // Alternate layout styles
  alternateItem: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: tokens.spacing.sm,
    position: 'relative' as const,
    paddingBottom: tokens.spacing.lg,
  } as React.CSSProperties,

  alternateSpacer: {
    minWidth: 0,
  } as React.CSSProperties,

  // Horizontal timeline styles
  horizontalItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    minWidth: '150px',
    position: 'relative' as const,
  } as React.CSSProperties,

  horizontalMarkerContainer: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
    position: 'relative' as const,
    marginBottom: tokens.spacing.sm,
  } as React.CSSProperties,

  horizontalLine: {
    position: 'absolute' as const,
    top: '50%',
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: tokens.colors.border,
    transform: 'translateY(-50%)',
    zIndex: 0,
  } as React.CSSProperties,

  horizontalContent: {
    textAlign: 'center' as const,
    padding: `0 ${tokens.spacing.sm}`,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get dot color based on event type or status
 */
function getDotColor(event: TimelineEvent): string {
  if (event.type) {
    const color = eventTypeColors[event.type];
    if (color) return color;
  }
  return chartColors[0];
}

/**
 * Format date for display
 */
function formatEventDate(date: string | Date | undefined): string {
  if (!date) return '';
  if (date instanceof Date) {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  // Try to parse string date
  const parsed = new Date(date);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return String(date);
}

/**
 * Parse events from binding data
 */
function parseEvents(data: unknown): TimelineEvent[] {
  if (!Array.isArray(data)) return [];
  return data.map((item) => {
    if (typeof item === 'object' && item !== null) {
      return item as TimelineEvent;
    }
    // Handle simple string arrays
    return { title: String(item) };
  });
}

// ============================================================================
// Sub-components
// ============================================================================

interface TimelineMarkerProps {
  event: TimelineEvent;
  isLast: boolean;
  showLine?: boolean;
}

function TimelineMarker({ event, isLast, showLine = true }: TimelineMarkerProps): React.ReactElement {
  const dotColor = getDotColor(event);

  const dotStyle = mergeStyles(
    styles.dot,
    { backgroundColor: dotColor, boxShadow: `0 0 0 2px ${dotColor}40` },
    event.status === 'completed' ? styles.dotCompleted : {},
    event.status === 'current' ? styles.dotCurrent : {},
    event.status === 'pending' ? styles.dotPending : {}
  );

  const lineStyle = mergeStyles(
    styles.line,
    event.status === 'completed' ? styles.lineCompleted : {}
  );

  return (
    <div style={styles.markerContainer}>
      <div style={dotStyle}>
        {event.icon && <span>{event.icon}</span>}
      </div>
      {showLine && !isLast && <div style={lineStyle} />}
    </div>
  );
}

interface TimelineContentProps {
  event: TimelineEvent;
  alignment?: 'left' | 'right';
}

function TimelineContent({ event, alignment = 'left' }: TimelineContentProps): React.ReactElement {
  const contentStyle = mergeStyles(
    styles.content,
    alignment === 'right' ? styles.contentRight : {}
  );

  return (
    <div style={contentStyle}>
      {event.date && (
        <div style={styles.date}>{formatEventDate(event.date)}</div>
      )}
      {event.title && (
        <div style={styles.title}>{event.title}</div>
      )}
      {event.description && (
        <div style={styles.description}>{event.description}</div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Timeline({ block, data }: LiquidComponentProps): React.ReactElement {
  // Resolve binding to get events array
  const rawData = resolveBinding(block.binding, data);
  const events = parseEvents(rawData);

  // Get orientation from block props (default: vertical)
  const orientation: TimelineOrientation =
    (block.props?.orientation as TimelineOrientation) || 'vertical';

  // Get layout for vertical timeline (default: left)
  const layout: TimelineLayout =
    (block.props?.layout as TimelineLayout) || 'left';

  // Get label
  const label = block.label;

  // Handle empty state
  if (events.length === 0) {
    return (
      <div data-liquid-type="timeline" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.empty}>No events to display</div>
      </div>
    );
  }

  // Render horizontal timeline
  if (orientation === 'horizontal') {
    return (
      <div data-liquid-type="timeline" data-orientation="horizontal" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={mergeStyles(styles.container, styles.containerHorizontal)}>
          {events.map((event, index) => (
            <div key={index} style={styles.horizontalItem}>
              <div style={styles.horizontalMarkerContainer}>
                {index > 0 && <div style={styles.horizontalLine} />}
                <TimelineMarker event={event} isLast={true} showLine={false} />
              </div>
              <div style={styles.horizontalContent}>
                {event.date && (
                  <div style={styles.date}>{formatEventDate(event.date)}</div>
                )}
                {event.title && (
                  <div style={styles.title}>{event.title}</div>
                )}
                {event.description && (
                  <div style={styles.description}>{event.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render alternate layout
  if (layout === 'alternate') {
    return (
      <div data-liquid-type="timeline" data-layout="alternate" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={mergeStyles(styles.container, styles.containerVertical)}>
          {events.map((event, index) => {
            const isLeft = index % 2 === 0;
            const isLast = index === events.length - 1;

            return (
              <div
                key={index}
                style={mergeStyles(
                  styles.alternateItem,
                  isLast ? styles.timelineItemLast : {}
                )}
              >
                {isLeft ? (
                  <>
                    <TimelineContent event={event} alignment="right" />
                    <TimelineMarker event={event} isLast={isLast} />
                    <div style={styles.alternateSpacer} />
                  </>
                ) : (
                  <>
                    <div style={styles.alternateSpacer} />
                    <TimelineMarker event={event} isLast={isLast} />
                    <TimelineContent event={event} alignment="left" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render standard vertical timeline (left or right aligned)
  return (
    <div
      data-liquid-type="timeline"
      data-orientation="vertical"
      data-layout={layout}
      style={styles.wrapper}
    >
      {label && <div style={styles.header}>{label}</div>}
      <div style={mergeStyles(styles.container, styles.containerVertical)}>
        {events.map((event, index) => {
          const isLast = index === events.length - 1;

          return (
            <div
              key={index}
              style={mergeStyles(
                styles.timelineItem,
                isLast ? styles.timelineItemLast : {}
              )}
            >
              {layout === 'right' ? (
                <>
                  <TimelineContent event={event} alignment="right" />
                  <TimelineMarker event={event} isLast={isLast} />
                </>
              ) : (
                <>
                  <TimelineMarker event={event} isLast={isLast} />
                  <TimelineContent event={event} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export interface StaticTimelineProps {
  /** Array of timeline events */
  events: TimelineEvent[];
  /** Timeline orientation */
  orientation?: TimelineOrientation;
  /** Content layout for vertical timeline */
  layout?: TimelineLayout;
  /** Optional title */
  title?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Optional className */
  className?: string;
}

export function StaticTimeline({
  events,
  orientation = 'vertical',
  layout = 'left',
  title,
  style: customStyle,
  className,
}: StaticTimelineProps): React.ReactElement {
  // Handle empty state
  if (!events || events.length === 0) {
    return (
      <div
        data-liquid-type="timeline"
        style={mergeStyles(styles.wrapper, customStyle)}
        className={className}
      >
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.empty}>No events to display</div>
      </div>
    );
  }

  // Render horizontal timeline
  if (orientation === 'horizontal') {
    return (
      <div
        data-liquid-type="timeline"
        data-orientation="horizontal"
        style={mergeStyles(styles.wrapper, customStyle)}
        className={className}
      >
        {title && <div style={styles.header}>{title}</div>}
        <div style={mergeStyles(styles.container, styles.containerHorizontal)}>
          {events.map((event, index) => (
            <div key={index} style={styles.horizontalItem}>
              <div style={styles.horizontalMarkerContainer}>
                {index > 0 && <div style={styles.horizontalLine} />}
                <TimelineMarker event={event} isLast={true} showLine={false} />
              </div>
              <div style={styles.horizontalContent}>
                {event.date && (
                  <div style={styles.date}>{formatEventDate(event.date)}</div>
                )}
                {event.title && (
                  <div style={styles.title}>{event.title}</div>
                )}
                {event.description && (
                  <div style={styles.description}>{event.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Render alternate layout
  if (layout === 'alternate') {
    return (
      <div
        data-liquid-type="timeline"
        data-layout="alternate"
        style={mergeStyles(styles.wrapper, customStyle)}
        className={className}
      >
        {title && <div style={styles.header}>{title}</div>}
        <div style={mergeStyles(styles.container, styles.containerVertical)}>
          {events.map((event, index) => {
            const isLeft = index % 2 === 0;
            const isLast = index === events.length - 1;

            return (
              <div
                key={index}
                style={mergeStyles(
                  styles.alternateItem,
                  isLast ? styles.timelineItemLast : {}
                )}
              >
                {isLeft ? (
                  <>
                    <TimelineContent event={event} alignment="right" />
                    <TimelineMarker event={event} isLast={isLast} />
                    <div style={styles.alternateSpacer} />
                  </>
                ) : (
                  <>
                    <div style={styles.alternateSpacer} />
                    <TimelineMarker event={event} isLast={isLast} />
                    <TimelineContent event={event} alignment="left" />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Render standard vertical timeline
  return (
    <div
      data-liquid-type="timeline"
      data-orientation="vertical"
      data-layout={layout}
      style={mergeStyles(styles.wrapper, customStyle)}
      className={className}
    >
      {title && <div style={styles.header}>{title}</div>}
      <div style={mergeStyles(styles.container, styles.containerVertical)}>
        {events.map((event, index) => {
          const isLast = index === events.length - 1;

          return (
            <div
              key={index}
              style={mergeStyles(
                styles.timelineItem,
                isLast ? styles.timelineItemLast : {}
              )}
            >
              {layout === 'right' ? (
                <>
                  <TimelineContent event={event} alignment="right" />
                  <TimelineMarker event={event} isLast={isLast} />
                </>
              ) : (
                <>
                  <TimelineMarker event={event} isLast={isLast} />
                  <TimelineContent event={event} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Timeline;
