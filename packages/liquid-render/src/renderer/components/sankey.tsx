// Sankey Component - Flow diagram showing relationships between nodes
import React, { useMemo } from 'react';
import {
  Sankey as RechartsSankey,
  Tooltip,
  Layer,
  Rectangle,
  ResponsiveContainer,
} from 'recharts';
import type { LiquidComponentProps } from './utils';
import {
  tokens,
  chartColors,
  cardStyles,
  mergeStyles,
  isBrowser,
  formatDisplayValue,
} from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface SankeyNode {
  name: string;
  [key: string]: unknown;
}

interface SankeyLink {
  source: number;
  target: number;
  value: number;
  [key: string]: unknown;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface NodePayload {
  name: string;
  value: number;
  depth: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
}

interface LinkPayload {
  source: NodePayload;
  target: NodePayload;
  value: number;
  sy: number;
  ty: number;
  dy: number;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    minHeight: '320px',
    outline: 'none',
  }),

  header: {
    fontSize: tokens.fontSize.base,
    fontWeight: tokens.fontWeight.medium,
    marginBottom: tokens.spacing.sm,
    color: tokens.colors.foreground,
  } as React.CSSProperties,

  placeholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '260px',
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center',
  } as React.CSSProperties,

  srOnly: {
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

  tooltip: {
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    fontSize: tokens.fontSize.sm,
    boxShadow: tokens.shadow.md,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function isSankeyData(data: unknown): data is SankeyData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return Array.isArray(d.nodes) && Array.isArray(d.links);
}

function getNodeColor(depth: number): string {
  return chartColors[depth % chartColors.length] || chartColors[0];
}

function generateChartDescription(
  data: SankeyData,
  label?: string
): string {
  const nodeCount = data.nodes.length;
  const linkCount = data.links.length;
  const baseDesc = label ? `${label}: ` : '';

  if (nodeCount === 0) return `${baseDesc}Empty Sankey diagram`;

  const nodeNames = data.nodes.slice(0, 3).map(n => n.name).join(', ');
  const moreNodes = nodeCount > 3 ? `, and ${nodeCount - 3} more` : '';

  return `${baseDesc}Sankey diagram with ${nodeCount} nodes (${nodeNames}${moreNodes}) and ${linkCount} flows`;
}

// ============================================================================
// Sub-components
// ============================================================================

interface CustomNodeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
  payload: NodePayload;
  containerWidth: number;
}

function CustomNode({
  x,
  y,
  width,
  height,
  index,
  payload,
  containerWidth,
}: CustomNodeProps): React.ReactElement {
  const isOutsideRight = x + width + 6 > containerWidth;
  const nodeColor = getNodeColor(payload.depth);

  return (
    <Layer key={`node-${index}`}>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={nodeColor}
        fillOpacity={1}
        rx={2}
        ry={2}
      />
      <text
        textAnchor={isOutsideRight ? 'end' : 'start'}
        x={isOutsideRight ? x - 6 : x + width + 6}
        y={y + height / 2}
        dy="0.35em"
        fontSize={tokens.fontSize.xs}
        fill={tokens.colors.foreground}
      >
        {payload.name}
      </text>
    </Layer>
  );
}

interface CustomLinkProps {
  sourceX: number;
  targetX: number;
  sourceY: number;
  targetY: number;
  sourceControlX: number;
  targetControlX: number;
  linkWidth: number;
  index: number;
  payload: LinkPayload;
}

function CustomLink({
  sourceX,
  targetX,
  sourceY,
  targetY,
  sourceControlX,
  targetControlX,
  linkWidth,
  index,
  payload,
}: CustomLinkProps): React.ReactElement {
  const linkColor = getNodeColor(payload.source.depth);

  return (
    <Layer key={`link-${index}`}>
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={linkColor}
        strokeWidth={linkWidth}
        strokeOpacity={0.3}
        strokeLinecap="butt"
      />
    </Layer>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload?: NodePayload | LinkPayload;
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps): React.ReactElement | null {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  // Check if it's a link or node
  const isLink = 'source' in data && 'target' in data;

  if (isLink) {
    const linkData = data as LinkPayload;
    return (
      <div style={styles.tooltip}>
        <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.spacing.xs }}>
          {linkData.source.name} &rarr; {linkData.target.name}
        </div>
        <div style={{ color: tokens.colors.mutedForeground }}>
          Value: {formatDisplayValue(linkData.value)}
        </div>
      </div>
    );
  }

  // Node tooltip
  const nodeData = data as NodePayload;
  return (
    <div style={styles.tooltip}>
      <div style={{ fontWeight: tokens.fontWeight.medium, marginBottom: tokens.spacing.xs }}>
        {nodeData.name}
      </div>
      <div style={{ color: tokens.colors.mutedForeground }}>
        Value: {formatDisplayValue(nodeData.value)}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Sankey({ block, data: context }: LiquidComponentProps): React.ReactElement {
  const rawData = resolveBinding(block.binding, context);
  const sankeyData = isSankeyData(rawData) ? rawData : { nodes: [], links: [] };
  const label = block.label;
  const chartId = useMemo(() => `sankey-${Math.random().toString(36).slice(2, 9)}`, []);

  // Get customization options from block
  const blockAny = block as unknown as Record<string, unknown>;
  const nodeWidth = (blockAny.nodeWidth as number | undefined) ?? 10;
  const nodePadding = (blockAny.nodePadding as number | undefined) ?? 24;
  const height = (blockAny.height as number | undefined) ?? 260;

  // Generate accessibility description
  const chartDescription = useMemo(
    () => generateChartDescription(sankeyData, label),
    [sankeyData, label]
  );

  // SSR fallback
  if (!isBrowser) {
    return (
      <div
        data-liquid-type="sankey"
        style={styles.wrapper}
        role="img"
        aria-label={chartDescription}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>
          [Sankey diagram - {sankeyData.nodes.length} nodes, {sankeyData.links.length} flows]
        </div>
      </div>
    );
  }

  if (sankeyData.nodes.length === 0) {
    return (
      <div
        data-liquid-type="sankey"
        style={styles.wrapper}
        role="img"
        aria-label={`${label ? label + ': ' : ''}Empty Sankey diagram - no data available`}
      >
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  return (
    <div
      data-liquid-type="sankey"
      style={styles.wrapper}
      role="img"
      aria-label={chartDescription}
      tabIndex={0}
      aria-describedby={`${chartId}-desc`}
    >
      {label && <div id={`${chartId}-title`} style={styles.header}>{label}</div>}
      {/* Screen reader accessible data table */}
      <table id={`${chartId}-desc`} style={styles.srOnly}>
        <caption>{chartDescription}</caption>
        <thead>
          <tr>
            <th scope="col">From</th>
            <th scope="col">To</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {sankeyData.links.map((link, i) => {
            const sourceNode = sankeyData.nodes[link.source];
            const targetNode = sankeyData.nodes[link.target];
            return (
              <tr key={i}>
                <td>{sourceNode?.name ?? `Node ${link.source}`}</td>
                <td>{targetNode?.name ?? `Node ${link.target}`}</td>
                <td>{formatDisplayValue(link.value)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsSankey
          data={sankeyData}
          nodeWidth={nodeWidth}
          nodePadding={nodePadding}
          node={<CustomNode containerWidth={800} x={0} y={0} width={0} height={0} index={0} payload={{} as NodePayload} />}
          link={<CustomLink sourceX={0} targetX={0} sourceY={0} targetY={0} sourceControlX={0} targetControlX={0} linkWidth={0} index={0} payload={{} as LinkPayload} />}
          margin={{ top: 10, right: 100, bottom: 10, left: 10 }}
        >
          <Tooltip content={<CustomTooltip />} />
        </RechartsSankey>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticSankeyProps {
  data: SankeyData;
  title?: string;
  height?: number;
  nodeWidth?: number;
  nodePadding?: number;
  colors?: string[];
  style?: React.CSSProperties;
}

export function StaticSankey({
  data,
  title,
  height = 260,
  nodeWidth = 10,
  nodePadding = 24,
  colors = chartColors as unknown as string[],
  style: customStyle,
}: StaticSankeyProps): React.ReactElement {
  const getColor = (depth: number): string => colors[depth % colors.length] ?? colors[0] ?? chartColors[0];

  if (!isBrowser) {
    return (
      <div data-liquid-type="sankey" style={mergeStyles(styles.wrapper, customStyle)}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>
          [Sankey diagram - {data.nodes.length} nodes]
        </div>
      </div>
    );
  }

  if (!data.nodes || data.nodes.length === 0) {
    return (
      <div data-liquid-type="sankey" style={mergeStyles(styles.wrapper, customStyle)}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.placeholder}>No data available</div>
      </div>
    );
  }

  const StaticCustomNode = ({
    x,
    y,
    width,
    height: nodeHeight,
    index,
    payload,
    containerWidth,
  }: CustomNodeProps): React.ReactElement => {
    const isOutsideRight = x + width + 6 > containerWidth;
    const nodeColor = getColor(payload.depth);

    return (
      <Layer key={`node-${index}`}>
        <Rectangle
          x={x}
          y={y}
          width={width}
          height={nodeHeight}
          fill={nodeColor}
          fillOpacity={1}
          rx={2}
          ry={2}
        />
        <text
          textAnchor={isOutsideRight ? 'end' : 'start'}
          x={isOutsideRight ? x - 6 : x + width + 6}
          y={y + nodeHeight / 2}
          dy="0.35em"
          fontSize={tokens.fontSize.xs}
          fill={tokens.colors.foreground}
        >
          {payload.name}
        </text>
      </Layer>
    );
  };

  const StaticCustomLink = ({
    sourceX,
    targetX,
    sourceY,
    targetY,
    sourceControlX,
    targetControlX,
    linkWidth,
    index,
    payload,
  }: CustomLinkProps): React.ReactElement => {
    const linkColor = getColor(payload.source.depth);

    return (
      <Layer key={`link-${index}`}>
        <path
          d={`
            M${sourceX},${sourceY}
            C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
          `}
          fill="none"
          stroke={linkColor}
          strokeWidth={linkWidth}
          strokeOpacity={0.3}
          strokeLinecap="butt"
        />
      </Layer>
    );
  };

  return (
    <div data-liquid-type="sankey" style={mergeStyles(styles.wrapper, customStyle)}>
      {title && <div style={styles.header}>{title}</div>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsSankey
          data={data}
          nodeWidth={nodeWidth}
          nodePadding={nodePadding}
          node={<StaticCustomNode containerWidth={800} x={0} y={0} width={0} height={0} index={0} payload={{} as NodePayload} />}
          link={<StaticCustomLink sourceX={0} targetX={0} sourceY={0} targetY={0} sourceControlX={0} targetControlX={0} linkWidth={0} index={0} payload={{} as LinkPayload} />}
          margin={{ top: 10, right: 100, bottom: 10, left: 10 }}
        >
          <Tooltip content={<CustomTooltip />} />
        </RechartsSankey>
      </ResponsiveContainer>
    </div>
  );
}

export default Sankey;
