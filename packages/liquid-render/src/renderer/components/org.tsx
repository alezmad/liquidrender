// Org Component - Organization chart / hierarchy visualization
// DSL: Or :binding [layout:vertical|horizontal]
// Data: nested { name, title, avatar?, children?: [...] }

import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, generateId, formatDisplayValue } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface OrgNode {
  name: string;
  title?: string;
  avatar?: string;
  children?: OrgNode[];
  [key: string]: unknown;
}

type LayoutDirection = 'vertical' | 'horizontal';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.lg,
    overflow: 'auto',
  }) as React.CSSProperties,

  header: {
    marginBottom: tokens.spacing.md,
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  tree: {
    display: 'flex',
    justifyContent: 'center',
  } as React.CSSProperties,

  treeVertical: {
    flexDirection: 'column',
    alignItems: 'center',
  } as React.CSSProperties,

  treeHorizontal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  } as React.CSSProperties,

  nodeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
  } as React.CSSProperties,

  nodeContainerHorizontal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  } as React.CSSProperties,

  node: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: tokens.spacing.md,
    minWidth: '140px',
    maxWidth: '180px',
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    boxShadow: tokens.shadow.sm,
    cursor: 'default',
    transition: `all ${tokens.transition.fast}`,
    position: 'relative',
    zIndex: 1,
  } as React.CSSProperties,

  nodeHover: {
    boxShadow: tokens.shadow.md,
    borderColor: tokens.colors.primary,
  } as React.CSSProperties,

  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
    overflow: 'hidden',
    fontSize: tokens.fontSize.lg,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as React.CSSProperties,

  name: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    textAlign: 'center',
    marginBottom: tokens.spacing.xs,
    wordBreak: 'break-word',
  } as React.CSSProperties,

  title: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    textAlign: 'center',
    wordBreak: 'break-word',
  } as React.CSSProperties,

  expandButton: {
    position: 'absolute',
    bottom: '-12px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '24px',
    height: '24px',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.background,
    border: `1px solid ${tokens.colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    zIndex: 2,
    transition: `all ${tokens.transition.fast}`,
  } as React.CSSProperties,

  expandButtonHorizontal: {
    bottom: 'auto',
    left: 'auto',
    right: '-12px',
    top: '50%',
    transform: 'translateY(-50%)',
  } as React.CSSProperties,

  childrenContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.md,
    position: 'relative',
    paddingTop: tokens.spacing.xl,
  } as React.CSSProperties,

  childrenContainerHorizontal: {
    flexDirection: 'column',
    paddingTop: 0,
    paddingLeft: tokens.spacing.xl,
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  // Connector lines (CSS-based)
  connector: {
    position: 'absolute',
    backgroundColor: tokens.colors.border,
  } as React.CSSProperties,

  // Vertical connectors for vertical layout
  connectorVertical: {
    width: '1px',
    height: tokens.spacing.lg,
    left: '50%',
    transform: 'translateX(-50%)',
    top: '100%',
  } as React.CSSProperties,

  // Horizontal connectors for horizontal layout
  connectorHorizontal: {
    height: '1px',
    width: tokens.spacing.lg,
    top: '50%',
    transform: 'translateY(-50%)',
    left: '100%',
  } as React.CSSProperties,

  // Horizontal bar connecting siblings (vertical layout)
  siblingBar: {
    position: 'absolute',
    height: '1px',
    backgroundColor: tokens.colors.border,
    top: 0,
    left: 0,
    right: 0,
  } as React.CSSProperties,

  // Child connector line from bar to node (vertical layout)
  childConnector: {
    position: 'absolute',
    width: '1px',
    height: tokens.spacing.md,
    backgroundColor: tokens.colors.border,
    top: 0,
    left: '50%',
    transform: 'translateX(-50%)',
  } as React.CSSProperties,

  childConnectorHorizontal: {
    width: tokens.spacing.md,
    height: '1px',
    top: '50%',
    left: 0,
    transform: 'translateY(-50%)',
  } as React.CSSProperties,

  empty: {
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center',
    padding: tokens.spacing.lg,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get initials from a name for avatar fallback
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

/**
 * Normalize data to OrgNode structure
 */
function normalizeOrgData(data: unknown): OrgNode | null {
  if (!data || typeof data !== 'object') return null;

  const obj = data as Record<string, unknown>;

  // Must have at least a name
  const name = obj.name || obj.label || obj.title;
  if (!name || typeof name !== 'string') return null;

  const node: OrgNode = {
    name,
    title: typeof obj.title === 'string' && obj.title !== name ? obj.title :
           typeof obj.role === 'string' ? obj.role :
           typeof obj.position === 'string' ? obj.position : undefined,
    avatar: typeof obj.avatar === 'string' ? obj.avatar :
            typeof obj.image === 'string' ? obj.image :
            typeof obj.photo === 'string' ? obj.photo : undefined,
  };

  // Handle children
  const childrenData = obj.children || obj.reports || obj.subordinates;
  if (Array.isArray(childrenData)) {
    const children = childrenData
      .map(child => normalizeOrgData(child))
      .filter((child): child is OrgNode => child !== null);
    if (children.length > 0) {
      node.children = children;
    }
  }

  return node;
}

// ============================================================================
// Sub-components
// ============================================================================

interface OrgNodeProps {
  node: OrgNode;
  layout: LayoutDirection;
  level: number;
  collapsedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  nodeId: string;
}

function OrgNodeComponent({
  node,
  layout,
  level,
  collapsedNodes,
  onToggle,
  nodeId,
}: OrgNodeProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isCollapsed = collapsedNodes.has(nodeId);
  const isVertical = layout === 'vertical';

  const nodeStyle = mergeStyles(
    styles.node,
    isHovered ? styles.nodeHover : {}
  );

  const expandButtonStyle = mergeStyles(
    styles.expandButton,
    !isVertical ? styles.expandButtonHorizontal : {}
  );

  const childrenContainerStyle = mergeStyles(
    styles.childrenContainer,
    !isVertical ? styles.childrenContainerHorizontal : {}
  );

  const nodeContainerStyle = mergeStyles(
    styles.nodeContainer,
    !isVertical ? styles.nodeContainerHorizontal : {}
  );

  return (
    <div style={nodeContainerStyle}>
      {/* Node card */}
      <div
        style={nodeStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="treeitem"
        aria-expanded={hasChildren ? !isCollapsed : undefined}
      >
        {/* Avatar */}
        <div style={styles.avatar}>
          {node.avatar ? (
            <img
              src={node.avatar}
              alt={node.name}
              style={styles.avatarImage as React.CSSProperties}
            />
          ) : (
            getInitials(node.name)
          )}
        </div>

        {/* Name */}
        <div style={styles.name}>{formatDisplayValue(node.name)}</div>

        {/* Title */}
        {node.title && (
          <div style={styles.title}>{formatDisplayValue(node.title)}</div>
        )}

        {/* Expand/collapse button */}
        {hasChildren && (
          <button
            style={expandButtonStyle}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(nodeId);
            }}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isVertical
              ? (isCollapsed ? '+' : '-')
              : (isCollapsed ? '>' : '<')
            }
          </button>
        )}

        {/* Connector line from this node to children (when expanded) */}
        {hasChildren && !isCollapsed && (
          <div
            style={mergeStyles(
              styles.connector,
              isVertical ? styles.connectorVertical : styles.connectorHorizontal
            )}
          />
        )}
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div style={childrenContainerStyle}>
          {/* Horizontal bar connecting siblings (for vertical layout with multiple children) */}
          {isVertical && node.children!.length > 1 && (
            <div style={styles.siblingBar} />
          )}

          {node.children!.map((child, index) => (
            <div key={`${nodeId}-${index}`} style={{ position: 'relative' }}>
              {/* Connector from bar to child node */}
              <div
                style={mergeStyles(
                  isVertical ? styles.childConnector : styles.childConnectorHorizontal
                )}
              />
              <OrgNodeComponent
                node={child}
                layout={layout}
                level={level + 1}
                collapsedNodes={collapsedNodes}
                onToggle={onToggle}
                nodeId={`${nodeId}-${index}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Org({ block, data }: LiquidComponentProps): React.ReactElement {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const orgId = generateId('org');

  // Resolve binding to get org data
  const rawData = resolveBinding(block.binding, data);

  // Normalize to OrgNode structure
  const orgData = normalizeOrgData(rawData);

  // Get layout direction from block
  const layout: LayoutDirection =
    block.layout?.flex === 'row' ? 'horizontal' : 'vertical';

  // Get label
  const label = block.label;

  // Handle toggle
  const handleToggle = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Empty state
  if (!orgData) {
    return (
      <div data-liquid-type="org" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.empty}>No organization data available</div>
      </div>
    );
  }

  const treeStyle = mergeStyles(
    styles.tree,
    layout === 'vertical' ? styles.treeVertical : styles.treeHorizontal
  );

  return (
    <div data-liquid-type="org" style={styles.wrapper} role="tree" aria-label={label || 'Organization chart'}>
      {label && <div style={styles.header}>{label}</div>}
      <div style={treeStyle}>
        <OrgNodeComponent
          node={orgData}
          layout={layout}
          level={0}
          collapsedNodes={collapsedNodes}
          onToggle={handleToggle}
          nodeId={orgId}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export interface StaticOrgProps {
  /** Root node of the organization */
  data: OrgNode;
  /** Layout direction */
  layout?: LayoutDirection;
  /** Optional title/header */
  title?: string;
  /** Initially collapsed node IDs */
  defaultCollapsed?: string[];
  /** Custom wrapper styles */
  style?: React.CSSProperties;
  /** Optional className */
  className?: string;
}

export function StaticOrg({
  data,
  layout = 'vertical',
  title,
  defaultCollapsed = [],
  style: customStyle,
  className,
}: StaticOrgProps): React.ReactElement {
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(
    new Set(defaultCollapsed)
  );
  const orgId = generateId('org');

  const handleToggle = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Empty state
  if (!data || !data.name) {
    return (
      <div
        data-liquid-type="org"
        style={mergeStyles(styles.wrapper, customStyle)}
        className={className}
      >
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.empty}>No organization data available</div>
      </div>
    );
  }

  const treeStyle = mergeStyles(
    styles.tree,
    layout === 'vertical' ? styles.treeVertical : styles.treeHorizontal
  );

  return (
    <div
      data-liquid-type="org"
      style={mergeStyles(styles.wrapper, customStyle)}
      className={className}
      role="tree"
      aria-label={title || 'Organization chart'}
    >
      {title && <div style={styles.header}>{title}</div>}
      <div style={treeStyle}>
        <OrgNodeComponent
          node={data}
          layout={layout}
          level={0}
          collapsedNodes={collapsedNodes}
          onToggle={handleToggle}
          nodeId={orgId}
        />
      </div>
    </div>
  );
}

export default Org;
