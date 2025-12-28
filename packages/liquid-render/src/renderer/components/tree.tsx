// Tree Component - Hierarchical tree view with expand/collapse
import React, { useState, useCallback } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, mergeStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

export interface TreeNode {
  /** Display label for the node */
  label: string;
  /** Unique identifier for the node (auto-generated if not provided) */
  id?: string;
  /** Optional icon name or React element */
  icon?: string | React.ReactNode;
  /** Child nodes */
  children?: TreeNode[];
  /** Whether the node is initially expanded */
  defaultExpanded?: boolean;
  /** Whether the node is disabled */
  disabled?: boolean;
  /** Additional data attached to the node */
  data?: unknown;
}

export interface TreeNodeState {
  expanded: Set<string>;
  selected: Set<string>;
}

type SelectionMode = 'none' | 'single' | 'multiple' | 'checkbox';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
    fontFamily: 'var(--font-sans, system-ui, -apple-system, sans-serif)',
  } as React.CSSProperties,

  header: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.sm,
  } as React.CSSProperties,

  empty: {
    padding: tokens.spacing.md,
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  nodeContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
  } as React.CSSProperties,

  nodeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    transition: `background-color ${tokens.transition.fast}`,
    userSelect: 'none' as const,
  } as React.CSSProperties,

  nodeRowHover: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  nodeRowSelected: {
    backgroundColor: tokens.colors.accent,
  } as React.CSSProperties,

  nodeRowDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  expandButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.25rem',
    height: '1.25rem',
    padding: 0,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: tokens.radius.sm,
    cursor: 'pointer',
    color: tokens.colors.mutedForeground,
    transition: `transform ${tokens.transition.fast}`,
    flexShrink: 0,
  } as React.CSSProperties,

  expandButtonExpanded: {
    transform: 'rotate(90deg)',
  } as React.CSSProperties,

  expandButtonHidden: {
    visibility: 'hidden' as const,
  } as React.CSSProperties,

  checkbox: {
    width: '1rem',
    height: '1rem',
    accentColor: tokens.colors.primary,
    cursor: 'pointer',
    flexShrink: 0,
  } as React.CSSProperties,

  nodeIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1rem',
    height: '1rem',
    color: tokens.colors.mutedForeground,
    flexShrink: 0,
  } as React.CSSProperties,

  nodeLabel: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.foreground,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  childrenContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    paddingLeft: tokens.spacing.lg,
    overflow: 'hidden',
  } as React.CSSProperties,

  childrenContainerHidden: {
    display: 'none',
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a unique ID for a tree node
 */
function generateNodeId(node: TreeNode, parentPath: string, index: number): string {
  if (node.id) return node.id;
  return `${parentPath}-${index}`;
}

/**
 * Collect all node IDs that should be expanded by default
 */
function collectDefaultExpanded(nodes: TreeNode[], parentPath: string = 'root'): string[] {
  const expandedIds: string[] = [];

  nodes.forEach((node, index) => {
    const nodeId = generateNodeId(node, parentPath, index);
    if (node.defaultExpanded && node.children && node.children.length > 0) {
      expandedIds.push(nodeId);
    }
    if (node.children) {
      expandedIds.push(...collectDefaultExpanded(node.children, nodeId));
    }
  });

  return expandedIds;
}

/**
 * Normalize tree data from various input formats
 */
function normalizeTreeData(data: unknown): TreeNode[] {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.map((item, index) => {
      if (typeof item === 'string') {
        return { label: item, id: `node-${index}` };
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return {
          label: String(obj.label || obj.name || obj.title || `Item ${index + 1}`),
          id: obj.id ? String(obj.id) : undefined,
          icon: obj.icon as string | undefined,
          children: obj.children ? normalizeTreeData(obj.children) : undefined,
          defaultExpanded: Boolean(obj.defaultExpanded || obj.expanded),
          disabled: Boolean(obj.disabled),
          data: obj.data || obj,
        };
      }
      return { label: String(item), id: `node-${index}` };
    });
  }

  return [];
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Chevron icon for expand/collapse
 */
function ChevronRightIcon(): React.ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/**
 * Default folder icon
 */
function FolderIcon({ isOpen }: { isOpen: boolean }): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {isOpen ? (
        <path d="M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5Z" />
      ) : (
        <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      )}
    </svg>
  );
}

/**
 * Default file/leaf icon
 */
function FileIcon(): React.ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

interface TreeNodeItemProps {
  node: TreeNode;
  nodeId: string;
  level: number;
  expanded: Set<string>;
  selected: Set<string>;
  selectionMode: SelectionMode;
  showIcons: boolean;
  onToggleExpand: (nodeId: string) => void;
  onToggleSelect: (nodeId: string, node: TreeNode) => void;
}

function TreeNodeItem({
  node,
  nodeId,
  level,
  expanded,
  selected,
  selectionMode,
  showIcons,
  onToggleExpand,
  onToggleSelect,
}: TreeNodeItemProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false);

  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expanded.has(nodeId);
  const isSelected = selected.has(nodeId);
  const isDisabled = node.disabled;

  const handleRowClick = useCallback(() => {
    if (isDisabled) return;

    if (hasChildren) {
      onToggleExpand(nodeId);
    }

    if (selectionMode !== 'none') {
      onToggleSelect(nodeId, node);
    }
  }, [isDisabled, hasChildren, nodeId, selectionMode, onToggleExpand, onToggleSelect, node]);

  const handleExpandClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDisabled && hasChildren) {
      onToggleExpand(nodeId);
    }
  }, [isDisabled, hasChildren, nodeId, onToggleExpand]);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!isDisabled) {
      onToggleSelect(nodeId, node);
    }
  }, [isDisabled, nodeId, onToggleSelect, node]);

  // Compute row styles
  const rowStyle = mergeStyles(
    styles.nodeRow,
    isHovered && !isDisabled ? styles.nodeRowHover : {},
    isSelected ? styles.nodeRowSelected : {},
    isDisabled ? styles.nodeRowDisabled : {}
  );

  // Compute expand button styles
  const expandButtonStyle = mergeStyles(
    styles.expandButton,
    isExpanded ? styles.expandButtonExpanded : {},
    !hasChildren ? styles.expandButtonHidden : {}
  );

  // Compute children container styles
  const childrenStyle = mergeStyles(
    styles.childrenContainer,
    !isExpanded ? styles.childrenContainerHidden : {}
  );

  // Render node icon
  const renderIcon = () => {
    if (!showIcons) return null;

    if (node.icon) {
      if (typeof node.icon === 'string') {
        // String icon - could be emoji or icon name
        return <span style={styles.nodeIcon}>{node.icon}</span>;
      }
      // React element
      return <span style={styles.nodeIcon}>{node.icon}</span>;
    }

    // Default icons based on whether node has children
    return (
      <span style={styles.nodeIcon}>
        {hasChildren ? <FolderIcon isOpen={isExpanded} /> : <FileIcon />}
      </span>
    );
  };

  return (
    <div style={styles.nodeContainer}>
      <div
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        aria-disabled={isDisabled}
        aria-level={level}
        tabIndex={isDisabled ? -1 : 0}
        style={rowStyle}
        onClick={handleRowClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick();
          }
          if (e.key === 'ArrowRight' && hasChildren && !isExpanded) {
            e.preventDefault();
            onToggleExpand(nodeId);
          }
          if (e.key === 'ArrowLeft' && hasChildren && isExpanded) {
            e.preventDefault();
            onToggleExpand(nodeId);
          }
        }}
      >
        {/* Expand/collapse button */}
        <button
          type="button"
          style={expandButtonStyle}
          onClick={handleExpandClick}
          tabIndex={-1}
          aria-hidden="true"
        >
          <ChevronRightIcon />
        </button>

        {/* Checkbox for selection mode */}
        {selectionMode === 'checkbox' && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            disabled={isDisabled}
            style={styles.checkbox}
            aria-label={`Select ${node.label}`}
          />
        )}

        {/* Node icon */}
        {renderIcon()}

        {/* Node label */}
        <span style={styles.nodeLabel}>{node.label}</span>
      </div>

      {/* Children */}
      {hasChildren && (
        <div role="group" style={childrenStyle}>
          {node.children!.map((child, index) => {
            const childId = generateNodeId(child, nodeId, index);
            return (
              <TreeNodeItem
                key={childId}
                node={child}
                nodeId={childId}
                level={level + 1}
                expanded={expanded}
                selected={selected}
                selectionMode={selectionMode}
                showIcons={showIcons}
                onToggleExpand={onToggleExpand}
                onToggleSelect={onToggleSelect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Tree({ block, data }: LiquidComponentProps): React.ReactElement {
  // Resolve tree data from binding
  const rawData = resolveBinding(block.binding, data);
  const treeData = normalizeTreeData(rawData);

  // Get options from block props
  const label = block.label;
  const selectionMode = (block.props?.selectionMode as SelectionMode) || 'none';
  const showIcons = block.props?.showIcons !== false;

  // Initialize state with default expanded nodes
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return new Set(collectDefaultExpanded(treeData, 'root'));
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleToggleSelect = useCallback((nodeId: string, _node: TreeNode) => {
    setSelected(prev => {
      const next = new Set(prev);

      if (selectionMode === 'single') {
        // Single selection - clear others
        if (next.has(nodeId)) {
          next.clear();
        } else {
          next.clear();
          next.add(nodeId);
        }
      } else {
        // Multiple/checkbox selection - toggle
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
      }

      return next;
    });
  }, [selectionMode]);

  // Handle empty state
  if (!treeData || treeData.length === 0) {
    return (
      <div data-liquid-type="tree" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.empty}>No items available</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="tree" style={styles.wrapper} role="tree">
      {label && <div style={styles.header}>{label}</div>}
      {treeData.map((node, index) => {
        const nodeId = generateNodeId(node, 'root', index);
        return (
          <TreeNodeItem
            key={nodeId}
            node={node}
            nodeId={nodeId}
            level={1}
            expanded={expanded}
            selected={selected}
            selectionMode={selectionMode}
            showIcons={showIcons}
            onToggleExpand={handleToggleExpand}
            onToggleSelect={handleToggleSelect}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// Static Tree
// ============================================================================

export interface StaticTreeProps {
  /** Tree data as array of nodes */
  data: TreeNode[];
  /** Optional title for the tree */
  title?: string;
  /** Selection mode: none, single, multiple, or checkbox */
  selectionMode?: SelectionMode;
  /** Show icons next to nodes (default: true) */
  showIcons?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: string[], selectedNodes: TreeNode[]) => void;
  /** Callback when a node is expanded/collapsed */
  onToggleExpand?: (nodeId: string, isExpanded: boolean) => void;
  /** Custom styles for the wrapper */
  style?: React.CSSProperties;
}

export function StaticTree({
  data,
  title,
  selectionMode = 'none',
  showIcons = true,
  onSelectionChange,
  onToggleExpand: onToggleExpandProp,
  style: customStyle,
}: StaticTreeProps): React.ReactElement {
  const treeData = normalizeTreeData(data);

  // Initialize state with default expanded nodes
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return new Set(collectDefaultExpanded(treeData, 'root'));
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Build a node lookup for callbacks
  const nodeMap = React.useMemo(() => {
    const map = new Map<string, TreeNode>();

    function traverse(nodes: TreeNode[], parentPath: string) {
      nodes.forEach((node, index) => {
        const nodeId = generateNodeId(node, parentPath, index);
        map.set(nodeId, node);
        if (node.children) {
          traverse(node.children, nodeId);
        }
      });
    }

    traverse(treeData, 'root');
    return map;
  }, [treeData]);

  const handleToggleExpand = useCallback((nodeId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      const isExpanded = next.has(nodeId);

      if (isExpanded) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }

      onToggleExpandProp?.(nodeId, !isExpanded);
      return next;
    });
  }, [onToggleExpandProp]);

  const handleToggleSelect = useCallback((nodeId: string, node: TreeNode) => {
    setSelected(prev => {
      const next = new Set(prev);

      if (selectionMode === 'single') {
        if (next.has(nodeId)) {
          next.clear();
        } else {
          next.clear();
          next.add(nodeId);
        }
      } else {
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
      }

      // Notify selection change
      if (onSelectionChange) {
        const selectedIds = Array.from(next);
        const selectedNodes = selectedIds
          .map(id => nodeMap.get(id))
          .filter((n): n is TreeNode => n !== undefined);
        onSelectionChange(selectedIds, selectedNodes);
      }

      return next;
    });
  }, [selectionMode, onSelectionChange, nodeMap]);

  const wrapperStyle = mergeStyles(styles.wrapper, customStyle);

  // Handle empty state
  if (!treeData || treeData.length === 0) {
    return (
      <div data-liquid-type="tree" style={wrapperStyle}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.empty}>No items available</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="tree" style={wrapperStyle} role="tree">
      {title && <div style={styles.header}>{title}</div>}
      {treeData.map((node, index) => {
        const nodeId = generateNodeId(node, 'root', index);
        return (
          <TreeNodeItem
            key={nodeId}
            node={node}
            nodeId={nodeId}
            level={1}
            expanded={expanded}
            selected={selected}
            selectionMode={selectionMode}
            showIcons={showIcons}
            onToggleExpand={handleToggleExpand}
            onToggleSelect={handleToggleSelect}
          />
        );
      })}
    </div>
  );
}

export default Tree;
