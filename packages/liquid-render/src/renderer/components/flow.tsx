// Flow Component - Node-based flow/diagram editor view (read-only display)
import React, { useMemo } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, isBrowser } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

type NodeType = 'input' | 'output' | 'process' | 'decision' | 'default';

interface FlowNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type?: NodeType;
}

interface FlowEdge {
  source: string;
  target: string;
}

interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
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
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  svgContainer: {
    width: '100%',
    minHeight: '300px',
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  } as React.CSSProperties,

  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
  } as React.CSSProperties,

  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.md,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

/** Node dimensions */
const NODE_WIDTH = 140;
const NODE_HEIGHT = 50;
const NODE_RADIUS = 8;
const DECISION_SIZE = 60;

/** Get color for node type */
function getNodeColor(type: NodeType): { fill: string; stroke: string } {
  switch (type) {
    case 'input':
      return { fill: '#dcfce7', stroke: '#22c55e' }; // green
    case 'output':
      return { fill: '#fef3c7', stroke: '#f59e0b' }; // amber
    case 'process':
      return { fill: '#dbeafe', stroke: '#3b82f6' }; // blue
    case 'decision':
      return { fill: '#fae8ff', stroke: '#d946ef' }; // fuchsia
    default:
      return { fill: '#f5f5f5', stroke: '#737373' }; // neutral
  }
}

/** Normalize raw data to FlowData format */
function normalizeFlowData(raw: unknown): FlowData | null {
  if (!raw || typeof raw !== 'object') return null;

  const data = raw as Record<string, unknown>;
  const nodes = Array.isArray(data.nodes) ? data.nodes : [];
  const edges = Array.isArray(data.edges) ? data.edges : [];

  const normalizedNodes: FlowNode[] = nodes
    .filter((n): n is Record<string, unknown> => n !== null && typeof n === 'object')
    .map(n => ({
      id: String(n.id ?? ''),
      x: typeof n.x === 'number' ? n.x : 0,
      y: typeof n.y === 'number' ? n.y : 0,
      label: String(n.label ?? n.id ?? ''),
      type: (n.type as NodeType) || 'default',
    }))
    .filter(n => n.id);

  const normalizedEdges: FlowEdge[] = edges
    .filter((e): e is Record<string, unknown> => e !== null && typeof e === 'object')
    .map(e => ({
      source: String(e.source ?? e.from ?? ''),
      target: String(e.target ?? e.to ?? ''),
    }))
    .filter(e => e.source && e.target);

  if (normalizedNodes.length === 0) return null;

  return { nodes: normalizedNodes, edges: normalizedEdges };
}

/** Calculate SVG viewBox based on node positions */
function calculateViewBox(nodes: FlowNode[]): { minX: number; minY: number; width: number; height: number } {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, width: 400, height: 300 };
  }

  const padding = 40;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);

  const minX = Math.min(...xs) - padding;
  const minY = Math.min(...ys) - padding;
  const maxX = Math.max(...xs) + NODE_WIDTH + padding;
  const maxY = Math.max(...ys) + NODE_HEIGHT + padding;

  return {
    minX,
    minY,
    width: Math.max(maxX - minX, 400),
    height: Math.max(maxY - minY, 300),
  };
}

/** Calculate edge path between two nodes */
function calculateEdgePath(
  source: FlowNode,
  target: FlowNode,
  nodes: FlowNode[]
): string {
  // Source center
  const sx = source.type === 'decision'
    ? source.x + DECISION_SIZE / 2
    : source.x + NODE_WIDTH / 2;
  const sy = source.type === 'decision'
    ? source.y + DECISION_SIZE / 2
    : source.y + NODE_HEIGHT / 2;

  // Target center
  const tx = target.type === 'decision'
    ? target.x + DECISION_SIZE / 2
    : target.x + NODE_WIDTH / 2;
  const ty = target.type === 'decision'
    ? target.y + DECISION_SIZE / 2
    : target.y + NODE_HEIGHT / 2;

  // Calculate connection points on node edges
  const dx = tx - sx;
  const dy = ty - sy;

  // Determine exit/entry sides
  let startX = sx;
  let startY = sy;
  let endX = tx;
  let endY = ty;

  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal connection
    if (dx > 0) {
      startX = source.type === 'decision' ? source.x + DECISION_SIZE : source.x + NODE_WIDTH;
      endX = target.type === 'decision' ? target.x : target.x;
    } else {
      startX = source.type === 'decision' ? source.x : source.x;
      endX = target.type === 'decision' ? target.x + DECISION_SIZE : target.x + NODE_WIDTH;
    }
    startY = sy;
    endY = ty;
  } else {
    // Vertical connection
    if (dy > 0) {
      startY = source.type === 'decision' ? source.y + DECISION_SIZE : source.y + NODE_HEIGHT;
      endY = target.type === 'decision' ? target.y : target.y;
    } else {
      startY = source.type === 'decision' ? source.y : source.y;
      endY = target.type === 'decision' ? target.y + DECISION_SIZE : target.y + NODE_HEIGHT;
    }
    startX = sx;
    endX = tx;
  }

  // Simple bezier curve
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  if (Math.abs(dx) > Math.abs(dy)) {
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  } else {
    return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;
  }
}

// ============================================================================
// Sub-components
// ============================================================================

interface FlowNodeProps {
  node: FlowNode;
}

function FlowNodeShape({ node }: FlowNodeProps): React.ReactElement {
  const colors = getNodeColor(node.type || 'default');

  if (node.type === 'decision') {
    // Diamond shape for decisions
    const cx = node.x + DECISION_SIZE / 2;
    const cy = node.y + DECISION_SIZE / 2;
    const half = DECISION_SIZE / 2;

    return (
      <g>
        <polygon
          points={`${cx},${node.y} ${node.x + DECISION_SIZE},${cy} ${cx},${node.y + DECISION_SIZE} ${node.x},${cy}`}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={11}
          fontWeight={500}
          fill={tokens.colors.foreground}
        >
          {node.label.length > 10 ? node.label.substring(0, 10) + '...' : node.label}
        </text>
      </g>
    );
  }

  if (node.type === 'input' || node.type === 'output') {
    // Rounded pill for input/output
    return (
      <g>
        <rect
          x={node.x}
          y={node.y}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx={NODE_HEIGHT / 2}
          ry={NODE_HEIGHT / 2}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
        />
        <text
          x={node.x + NODE_WIDTH / 2}
          y={node.y + NODE_HEIGHT / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12}
          fontWeight={500}
          fill={tokens.colors.foreground}
        >
          {node.label.length > 16 ? node.label.substring(0, 16) + '...' : node.label}
        </text>
      </g>
    );
  }

  // Default rectangle for process nodes
  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={NODE_WIDTH}
        height={NODE_HEIGHT}
        rx={NODE_RADIUS}
        ry={NODE_RADIUS}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={2}
      />
      <text
        x={node.x + NODE_WIDTH / 2}
        y={node.y + NODE_HEIGHT / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
        fill={tokens.colors.foreground}
      >
        {node.label.length > 16 ? node.label.substring(0, 16) + '...' : node.label}
      </text>
    </g>
  );
}

interface FlowEdgePathProps {
  edge: FlowEdge;
  nodes: FlowNode[];
}

function FlowEdgePath({ edge, nodes }: FlowEdgePathProps): React.ReactElement | null {
  const source = nodes.find(n => n.id === edge.source);
  const target = nodes.find(n => n.id === edge.target);

  if (!source || !target) return null;

  const path = calculateEdgePath(source, target, nodes);

  return (
    <path
      d={path}
      fill="none"
      stroke={tokens.colors.border}
      strokeWidth={2}
      markerEnd="url(#arrowhead)"
    />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Flow({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const rawData = resolveBinding(block.binding, context);
  const label = block.label as string | undefined;
  const props = block.props ?? {};
  const width = props.width as string | number | undefined;
  const height = props.height as number | undefined;

  // Normalize flow data
  const flowData = useMemo(() => normalizeFlowData(rawData), [rawData]);

  // Calculate viewBox
  const viewBox = useMemo(
    () => (flowData ? calculateViewBox(flowData.nodes) : { minX: 0, minY: 0, width: 400, height: 300 }),
    [flowData]
  );

  // SSR fallback
  if (!isBrowser) {
    return (
      <div data-liquid-type="flow" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Flow diagram - {flowData?.nodes.length || 0} nodes]
        </div>
      </div>
    );
  }

  // Empty state
  if (!flowData || flowData.nodes.length === 0) {
    return (
      <div data-liquid-type="flow" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.empty}>No flow data available</div>
      </div>
    );
  }

  const containerStyle = mergeStyles(styles.svgContainer, {
    width: width ?? '100%',
    height: height ?? Math.max(viewBox.height, 300),
  });

  return (
    <div data-liquid-type="flow" style={styles.wrapper}>
      {label && <div style={styles.header}>{label}</div>}
      <div style={containerStyle}>
        <svg
          width="100%"
          height="100%"
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={tokens.colors.border}
              />
            </marker>
          </defs>

          {/* Edges (rendered first so nodes are on top) */}
          <g className="flow-edges">
            {flowData.edges.map((edge, i) => (
              <FlowEdgePath key={`${edge.source}-${edge.target}-${i}`} edge={edge} nodes={flowData.nodes} />
            ))}
          </g>

          {/* Nodes */}
          <g className="flow-nodes">
            {flowData.nodes.map(node => (
              <FlowNodeShape key={node.id} node={node} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticFlowProps {
  /** Flow data with nodes and edges */
  data: FlowData;
  /** Optional title/label */
  label?: string;
  /** Container width */
  width?: string | number;
  /** Container height */
  height?: number;
  /** Custom styles */
  style?: React.CSSProperties;
}

export function StaticFlow({
  data,
  label,
  width,
  height,
  style: customStyle,
}: StaticFlowProps): React.ReactElement {
  // Normalize data
  const flowData = useMemo(() => {
    if (!data || !Array.isArray(data.nodes)) return null;
    return normalizeFlowData(data);
  }, [data]);

  // Calculate viewBox
  const viewBox = useMemo(
    () => (flowData ? calculateViewBox(flowData.nodes) : { minX: 0, minY: 0, width: 400, height: 300 }),
    [flowData]
  );

  // SSR fallback
  if (!isBrowser) {
    return (
      <div style={mergeStyles(styles.wrapper, customStyle)}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Flow diagram - {flowData?.nodes.length || 0} nodes]
        </div>
      </div>
    );
  }

  // Empty state
  if (!flowData || flowData.nodes.length === 0) {
    return (
      <div style={mergeStyles(styles.wrapper, customStyle)}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.empty}>No flow data available</div>
      </div>
    );
  }

  const containerStyle = mergeStyles(styles.svgContainer, {
    width: width ?? '100%',
    height: height ?? Math.max(viewBox.height, 300),
  });

  return (
    <div style={mergeStyles(styles.wrapper, customStyle)}>
      {label && <div style={styles.header}>{label}</div>}
      <div style={containerStyle}>
        <svg
          width="100%"
          height="100%"
          viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead-static"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={tokens.colors.border}
              />
            </marker>
          </defs>

          {/* Edges */}
          <g className="flow-edges">
            {flowData.edges.map((edge, i) => {
              const source = flowData.nodes.find(n => n.id === edge.source);
              const target = flowData.nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;

              const path = calculateEdgePath(source, target, flowData.nodes);
              return (
                <path
                  key={`${edge.source}-${edge.target}-${i}`}
                  d={path}
                  fill="none"
                  stroke={tokens.colors.border}
                  strokeWidth={2}
                  markerEnd="url(#arrowhead-static)"
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g className="flow-nodes">
            {flowData.nodes.map(node => (
              <FlowNodeShape key={node.id} node={node} />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default Flow;
