// Map Component - Geographic map display with markers and popups
import React, { useState } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, isBrowser, formatDisplayValue, fieldToLabel } from './utils';
import { resolveBinding, type DataContext } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface Marker {
  id?: string | number;
  lat: number;
  lng: number;
  label?: string;
  title?: string;
  description?: string;
  color?: string;
}

interface MapData {
  center?: [number, number];
  zoom?: number;
  markers?: Marker[];
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    position: 'relative' as const,
    overflow: 'hidden',
  }),

  header: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.sm,
  } as React.CSSProperties,

  mapContainer: {
    position: 'relative' as const,
    width: '100%',
    height: '300px',
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    border: `1px solid ${tokens.colors.border}`,
  } as React.CSSProperties,

  mapPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    background: `
      linear-gradient(${tokens.colors.border} 1px, transparent 1px),
      linear-gradient(90deg, ${tokens.colors.border} 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px',
  } as React.CSSProperties,

  mapIcon: {
    width: '48px',
    height: '48px',
    color: tokens.colors.mutedForeground,
    opacity: 0.5,
  } as React.CSSProperties,

  coordinates: {
    fontFamily: 'monospace',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    backgroundColor: tokens.colors.background,
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    borderRadius: tokens.radius.sm,
  } as React.CSSProperties,

  markersOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none' as const,
  } as React.CSSProperties,

  marker: (color?: string): React.CSSProperties => ({
    position: 'absolute' as const,
    transform: 'translate(-50%, -100%)',
    cursor: 'pointer',
    pointerEvents: 'auto' as const,
    transition: `transform ${tokens.transition.fast}`,
  }),

  markerPin: (color?: string): React.CSSProperties => ({
    width: '24px',
    height: '32px',
    color: color || tokens.colors.primary,
    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.2))',
  }),

  popup: {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    marginBottom: tokens.spacing.xs,
    backgroundColor: tokens.colors.card,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    boxShadow: tokens.shadow.md,
    minWidth: '120px',
    maxWidth: '200px',
    zIndex: 10,
    pointerEvents: 'auto' as const,
  } as React.CSSProperties,

  popupTitle: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.semibold,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  popupDescription: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    lineHeight: 1.4,
  } as React.CSSProperties,

  controls: {
    position: 'absolute' as const,
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
    zIndex: 5,
  } as React.CSSProperties,

  controlButton: {
    width: '28px',
    height: '28px',
    backgroundColor: tokens.colors.background,
    border: `1px solid ${tokens.colors.border}`,
    borderRadius: tokens.radius.sm,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: tokens.fontSize.lg,
    color: tokens.colors.foreground,
    transition: `background-color ${tokens.transition.fast}`,
  } as React.CSSProperties,

  markersList: {
    marginTop: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.sm,
    maxHeight: '100px',
    overflowY: 'auto' as const,
  } as React.CSSProperties,

  markersListTitle: {
    fontSize: tokens.fontSize.xs,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.mutedForeground,
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  markersListItem: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.foreground,
    padding: `${tokens.spacing.xs} 0`,
    borderBottom: `1px solid ${tokens.colors.border}`,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  empty: {
    padding: tokens.spacing.lg,
    textAlign: 'center' as const,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
  } as React.CSSProperties,

  ssrPlaceholder: {
    padding: tokens.spacing.lg,
    textAlign: 'center' as const,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.md,
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function normalizeMapData(value: unknown): MapData {
  if (!value || typeof value !== 'object') {
    return { center: [0, 0], zoom: 2, markers: [] };
  }

  const obj = value as Record<string, unknown>;

  // Extract center
  let center: [number, number] = [0, 0];
  if (Array.isArray(obj.center) && obj.center.length >= 2) {
    center = [Number(obj.center[0]), Number(obj.center[1])];
  } else if (obj.lat !== undefined && obj.lng !== undefined) {
    center = [Number(obj.lat), Number(obj.lng)];
  }

  // Extract zoom
  const zoom = typeof obj.zoom === 'number' ? obj.zoom : 10;

  // Extract markers
  let markers: Marker[] = [];
  if (Array.isArray(obj.markers)) {
    markers = obj.markers
      .filter((m): m is Record<string, unknown> => m && typeof m === 'object')
      .map((m, index) => ({
        id: m.id !== undefined ? m.id : index,
        lat: Number(m.lat ?? m.latitude ?? 0),
        lng: Number(m.lng ?? m.longitude ?? m.lon ?? 0),
        label: typeof m.label === 'string' ? m.label : undefined,
        title: typeof m.title === 'string' ? m.title : typeof m.name === 'string' ? m.name : undefined,
        description: typeof m.description === 'string' ? m.description : undefined,
        color: typeof m.color === 'string' ? m.color : undefined,
      })) as Marker[];
  }

  return { center, zoom, markers };
}

function formatCoordinate(value: number, type: 'lat' | 'lng'): string {
  const absValue = Math.abs(value);
  const direction = type === 'lat'
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W');
  return `${absValue.toFixed(4)}${direction}`;
}

// Calculate marker position as percentage (simplified projection)
function getMarkerPosition(
  lat: number,
  lng: number,
  center: [number, number],
  zoom: number
): { x: number; y: number } {
  // Simple linear projection for placeholder visualization
  const scale = Math.pow(2, zoom - 10) * 50;
  const x = 50 + (lng - center[1]) * scale;
  const y = 50 - (lat - center[0]) * scale;
  return {
    x: Math.max(5, Math.min(95, x)),
    y: Math.max(10, Math.min(90, y)),
  };
}

// ============================================================================
// Sub-components
// ============================================================================

function MapIcon(): React.ReactElement {
  return (
    <svg style={styles.mapIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function MarkerPinIcon({ color }: { color?: string }): React.ReactElement {
  return (
    <svg style={styles.markerPin(color)} viewBox="0 0 24 32" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12zm0 16c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z" />
    </svg>
  );
}

interface MarkerComponentProps {
  marker: Marker;
  position: { x: number; y: number };
  isSelected: boolean;
  onSelect: () => void;
}

function MarkerComponent({ marker, position, isSelected, onSelect }: MarkerComponentProps): React.ReactElement {
  return (
    <div
      style={{
        ...styles.marker(marker.color),
        left: `${position.x}%`,
        top: `${position.y}%`,
      }}
      onClick={onSelect}
      title={marker.title || marker.label || `${formatCoordinate(marker.lat, 'lat')}, ${formatCoordinate(marker.lng, 'lng')}`}
    >
      <MarkerPinIcon color={marker.color} />
      {isSelected && (marker.title || marker.description) && (
        <div style={styles.popup}>
          {marker.title && <div style={styles.popupTitle}>{marker.title}</div>}
          {marker.description && <div style={styles.popupDescription}>{marker.description}</div>}
        </div>
      )}
    </div>
  );
}

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

function ZoomControls({ zoom, onZoomIn, onZoomOut }: ZoomControlsProps): React.ReactElement {
  return (
    <div style={styles.controls}>
      <button
        style={styles.controlButton}
        onClick={onZoomIn}
        title="Zoom in"
        disabled={zoom >= 18}
      >
        +
      </button>
      <button
        style={styles.controlButton}
        onClick={onZoomOut}
        title="Zoom out"
        disabled={zoom <= 1}
      >
        -
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Map({ block, data }: LiquidComponentProps): React.ReactElement {
  const value = resolveBinding(block.binding, data);
  const label = block.label || '';
  const mapData = normalizeMapData(value);

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | number | null>(null);
  const [currentZoom, setCurrentZoom] = useState(mapData.zoom || 10);

  // SSR handling
  if (!isBrowser) {
    return (
      <div data-liquid-type="map" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.ssrPlaceholder}>
          [Map: {formatCoordinate(mapData.center?.[0] || 0, 'lat')}, {formatCoordinate(mapData.center?.[1] || 0, 'lng')} - {mapData.markers?.length || 0} markers]
        </div>
      </div>
    );
  }

  // Empty state
  if (!mapData.center && (!mapData.markers || mapData.markers.length === 0)) {
    return (
      <div data-liquid-type="map" style={styles.wrapper}>
        {label && <div style={styles.header}>{label}</div>}
        <div style={styles.empty}>No map data available</div>
      </div>
    );
  }

  const center = mapData.center || [0, 0];
  const markers = mapData.markers || [];

  const handleZoomIn = () => setCurrentZoom(z => Math.min(18, z + 1));
  const handleZoomOut = () => setCurrentZoom(z => Math.max(1, z - 1));
  const handleMarkerClick = (id: string | number | undefined) => {
    if (id === undefined) return;
    setSelectedMarkerId(prev => prev === id ? null : id);
  };

  return (
    <div data-liquid-type="map" style={styles.wrapper}>
      {label && <div style={styles.header}>{label}</div>}

      <div style={styles.mapContainer}>
        <div style={styles.mapPlaceholder}>
          <MapIcon />
          <div>Map View</div>
          <div style={styles.coordinates}>
            {formatCoordinate(center[0], 'lat')}, {formatCoordinate(center[1], 'lng')} (zoom: {currentZoom})
          </div>
        </div>

        {/* Markers overlay */}
        <div style={styles.markersOverlay}>
          {markers.map((marker, index) => {
            const position = getMarkerPosition(marker.lat, marker.lng, center, currentZoom);
            const markerId = marker.id ?? index;
            return (
              <MarkerComponent
                key={markerId}
                marker={marker}
                position={position}
                isSelected={selectedMarkerId === markerId}
                onSelect={() => handleMarkerClick(markerId)}
              />
            );
          })}
        </div>

        {/* Zoom controls */}
        <ZoomControls
          zoom={currentZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      </div>

      {/* Markers list */}
      {markers.length > 0 && (
        <div style={styles.markersList}>
          <div style={styles.markersListTitle}>Markers ({markers.length})</div>
          {markers.map((marker, index) => (
            <div key={marker.id ?? index} style={styles.markersListItem}>
              <MarkerPinIcon color={marker.color} />
              <span>
                {marker.title || marker.label || `${formatCoordinate(marker.lat, 'lat')}, ${formatCoordinate(marker.lng, 'lng')}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

interface StaticMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Marker[];
  title?: string;
  height?: string | number;
  showMarkersList?: boolean;
}

export function StaticMap({
  center = [0, 0],
  zoom = 10,
  markers = [],
  title,
  height = 300,
  showMarkersList = true,
}: StaticMapProps): React.ReactElement {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | number | null>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);

  // SSR handling
  if (!isBrowser) {
    return (
      <div data-liquid-type="map" style={styles.wrapper}>
        {title && <div style={styles.header}>{title}</div>}
        <div style={styles.ssrPlaceholder}>
          [Map: {formatCoordinate(center[0], 'lat')}, {formatCoordinate(center[1], 'lng')} - {markers.length} markers]
        </div>
      </div>
    );
  }

  const handleZoomIn = () => setCurrentZoom(z => Math.min(18, z + 1));
  const handleZoomOut = () => setCurrentZoom(z => Math.max(1, z - 1));
  const handleMarkerClick = (id: string | number | undefined) => {
    if (id === undefined) return;
    setSelectedMarkerId(prev => prev === id ? null : id);
  };

  const containerStyle = {
    ...styles.mapContainer,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div data-liquid-type="map" style={styles.wrapper}>
      {title && <div style={styles.header}>{title}</div>}

      <div style={containerStyle}>
        <div style={styles.mapPlaceholder}>
          <MapIcon />
          <div>Map View</div>
          <div style={styles.coordinates}>
            {formatCoordinate(center[0], 'lat')}, {formatCoordinate(center[1], 'lng')} (zoom: {currentZoom})
          </div>
        </div>

        {/* Markers overlay */}
        <div style={styles.markersOverlay}>
          {markers.map((marker, index) => {
            const position = getMarkerPosition(marker.lat, marker.lng, center, currentZoom);
            const markerId = marker.id ?? index;
            return (
              <MarkerComponent
                key={markerId}
                marker={marker}
                position={position}
                isSelected={selectedMarkerId === markerId}
                onSelect={() => handleMarkerClick(markerId)}
              />
            );
          })}
        </div>

        {/* Zoom controls */}
        <ZoomControls
          zoom={currentZoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
        />
      </div>

      {/* Markers list */}
      {showMarkersList && markers.length > 0 && (
        <div style={styles.markersList}>
          <div style={styles.markersListTitle}>Markers ({markers.length})</div>
          {markers.map((marker, index) => (
            <div key={marker.id ?? index} style={styles.markersListItem}>
              <MarkerPinIcon color={marker.color} />
              <span>
                {marker.title || marker.label || `${formatCoordinate(marker.lat, 'lat')}, ${formatCoordinate(marker.lng, 'lng')}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Map;
