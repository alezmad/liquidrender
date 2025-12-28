// Audio Component - HTML5 audio player with custom controls
// DSL: Au :sourceBinding "label"
// Features: Play/pause, progress bar, volume control, time display, playlist, waveform

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import {
  tokens,
  cardStyles,
  mergeStyles,
  isBrowser,
  generateId,
  getLayoutStyles,
} from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface AudioTrack {
  src: string;
  title?: string;
  artist?: string;
  duration?: number;
}

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.sm,
  }),

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  title: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  artist: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  playButton: {
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.primaryForeground,
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: `all ${tokens.transition.fast}`,
  } as React.CSSProperties,

  playButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  } as React.CSSProperties,

  progressContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  progressTrack: {
    width: '100%',
    height: '4px',
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.full,
    cursor: 'pointer',
    position: 'relative' as const,
    overflow: 'hidden',
  } as React.CSSProperties,

  progressBar: (percentage: number): React.CSSProperties => ({
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.full,
    transition: 'width 100ms linear',
  }),

  timeDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    fontVariantNumeric: 'tabular-nums',
  } as React.CSSProperties,

  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  } as React.CSSProperties,

  volumeButton: {
    width: '2rem',
    height: '2rem',
    borderRadius: tokens.radius.md,
    backgroundColor: 'transparent',
    color: tokens.colors.foreground,
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${tokens.transition.fast}`,
  } as React.CSSProperties,

  volumeSlider: {
    width: '60px',
    height: '4px',
    appearance: 'none' as const,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.full,
    cursor: 'pointer',
    outline: 'none',
  } as React.CSSProperties,

  waveform: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    height: '24px',
    padding: `0 ${tokens.spacing.xs}`,
  } as React.CSSProperties,

  waveformBar: (isPlaying: boolean, delay: number): React.CSSProperties => ({
    width: '3px',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.sm,
    transition: `height ${tokens.transition.fast}`,
    height: isPlaying ? undefined : '4px',
    animation: isPlaying ? `waveform-animation 0.5s ease-in-out infinite alternate` : 'none',
    animationDelay: `${delay}ms`,
  }),

  playlist: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
    marginTop: tokens.spacing.sm,
    borderTop: `1px solid ${tokens.colors.border}`,
    paddingTop: tokens.spacing.sm,
    maxHeight: '150px',
    overflowY: 'auto' as const,
  } as React.CSSProperties,

  playlistItem: (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.md,
    cursor: 'pointer',
    backgroundColor: isActive ? tokens.colors.accent : 'transparent',
    transition: `all ${tokens.transition.fast}`,
  }),

  playlistItemText: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.foreground,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  playlistItemDuration: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    fontVariantNumeric: 'tabular-nums',
  } as React.CSSProperties,

  emptyState: {
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center' as const,
    padding: tokens.spacing.lg,
  } as React.CSSProperties,

  error: {
    color: tokens.colors.error,
    fontSize: tokens.fontSize.xs,
    textAlign: 'center' as const,
    padding: tokens.spacing.sm,
  } as React.CSSProperties,

  ssrPlaceholder: {
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center' as const,
    padding: tokens.spacing.md,
  } as React.CSSProperties,

  icon: {
    width: '1rem',
    height: '1rem',
  } as React.CSSProperties,
};

// Add keyframe animation for waveform
if (typeof document !== 'undefined') {
  const styleId = 'liquid-audio-animations';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      @keyframes waveform-animation {
        0% { height: 4px; }
        100% { height: 20px; }
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format time in seconds to mm:ss or hh:mm:ss
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse audio source from binding value
 */
function parseAudioSource(value: unknown): AudioTrack[] {
  if (!value) return [];

  // Single URL string
  if (typeof value === 'string') {
    return [{ src: value }];
  }

  // Single track object
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const src = obj.src ?? obj.url ?? obj.source;
    if (typeof src === 'string') {
      return [{
        src,
        title: typeof obj.title === 'string' ? obj.title : undefined,
        artist: typeof obj.artist === 'string' ? obj.artist : undefined,
        duration: typeof obj.duration === 'number' ? obj.duration : undefined,
      }];
    }
    return [];
  }

  // Array of tracks
  if (Array.isArray(value)) {
    return value
      .map(item => {
        if (typeof item === 'string') {
          return { src: item };
        }
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          const src = obj.src ?? obj.url ?? obj.source;
          if (typeof src === 'string') {
            return {
              src,
              title: typeof obj.title === 'string' ? obj.title : undefined,
              artist: typeof obj.artist === 'string' ? obj.artist : undefined,
              duration: typeof obj.duration === 'number' ? obj.duration : undefined,
            };
          }
        }
        return null;
      })
      .filter((track): track is AudioTrack => track !== null);
  }

  return [];
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Play Icon
 */
function PlayIcon(): React.ReactElement {
  return (
    <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/**
 * Pause Icon
 */
function PauseIcon(): React.ReactElement {
  return (
    <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

/**
 * Volume Icon
 */
function VolumeIcon({ muted, volume }: { muted: boolean; volume: number }): React.ReactElement {
  if (muted || volume === 0) {
    return (
      <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  if (volume < 0.5) {
    return (
      <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
      </svg>
    );
  }
  return (
    <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

/**
 * Skip Previous Icon
 */
function SkipPreviousIcon(): React.ReactElement {
  return (
    <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

/**
 * Skip Next Icon
 */
function SkipNextIcon(): React.ReactElement {
  return (
    <svg style={styles.icon} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

/**
 * Simple waveform visualization
 */
interface WaveformProps {
  isPlaying: boolean;
  barCount?: number;
}

function Waveform({ isPlaying, barCount = 5 }: WaveformProps): React.ReactElement {
  return (
    <div style={styles.waveform} aria-hidden="true">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          style={styles.waveformBar(isPlaying, i * 100)}
        />
      ))}
    </div>
  );
}

/**
 * Playlist component
 */
interface PlaylistProps {
  tracks: AudioTrack[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

function Playlist({ tracks, currentIndex, onSelect }: PlaylistProps): React.ReactElement | null {
  if (tracks.length <= 1) return null;

  return (
    <div style={styles.playlist} role="list" aria-label="Playlist">
      {tracks.map((track, index) => (
        <div
          key={index}
          role="listitem"
          style={styles.playlistItem(index === currentIndex)}
          onClick={() => onSelect(index)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(index);
            }
          }}
          tabIndex={0}
          aria-current={index === currentIndex ? 'true' : undefined}
        >
          <span style={styles.playlistItemText}>
            {track.title || `Track ${index + 1}`}
          </span>
          {track.duration && (
            <span style={styles.playlistItemDuration}>
              {formatTime(track.duration)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Audio({ block, data }: LiquidComponentProps): React.ReactElement {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const audioId = generateId('audio');

  // Parse tracks from binding
  const rawValue = resolveBinding(block.binding, data);
  const tracks = parseAudioSource(rawValue);
  const label = block.label;
  const props = block.props ?? {};
  const showWaveform = props.waveform !== false;
  const showPlaylist = props.playlist !== false;

  // Audio state
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isLoading: true,
    error: null,
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const currentTrack = tracks[currentTrackIndex];

  // Reset state when track changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isLoading: true,
      error: null,
    }));
  }, [currentTrackIndex]);

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setState(prev => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }));
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    } else {
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [currentTrackIndex, tracks.length]);

  const handleError = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: 'Failed to load audio',
    }));
  }, []);

  const handleWaiting = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
  }, []);

  const handleCanPlay = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  // Control handlers
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (state.isPlaying) {
      audio.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      audio.play().catch(() => {
        setState(prev => ({ ...prev, error: 'Playback failed' }));
      });
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.isPlaying, currentTrack]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress || !state.duration) return;

    const rect = progress.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newTime = percentage * state.duration;
    audio.currentTime = newTime;
    setState(prev => ({ ...prev, currentTime: newTime }));
  }, [state.duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setState(prev => ({
      ...prev,
      volume: newVolume,
      isMuted: newVolume === 0,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newMuted = !state.isMuted;
    audio.muted = newMuted;
    setState(prev => ({ ...prev, isMuted: newMuted }));
  }, [state.isMuted]);

  const skipPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.currentTime > 3 || currentTrackIndex === 0) {
      audio.currentTime = 0;
      setState(prev => ({ ...prev, currentTime: 0 }));
    } else {
      setCurrentTrackIndex(prev => prev - 1);
    }
  }, [currentTrackIndex]);

  const skipNext = useCallback(() => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    }
  }, [currentTrackIndex, tracks.length]);

  const handleTrackSelect = useCallback((index: number) => {
    setCurrentTrackIndex(index);
  }, []);

  // Layout styles
  const wrapperStyle = mergeStyles(styles.wrapper, getLayoutStyles(block));

  // Progress percentage
  const progressPercentage = state.duration > 0
    ? (state.currentTime / state.duration) * 100
    : 0;

  // SSR placeholder
  if (!isBrowser) {
    return (
      <div data-liquid-type="audio" style={wrapperStyle}>
        <div style={styles.ssrPlaceholder}>
          [Audio player - {tracks.length} track{tracks.length !== 1 ? 's' : ''}]
        </div>
      </div>
    );
  }

  // Empty state
  if (tracks.length === 0) {
    return (
      <div data-liquid-type="audio" style={wrapperStyle}>
        {label && <div style={styles.title}>{label}</div>}
        <div style={styles.emptyState}>No audio source</div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div data-liquid-type="audio" style={wrapperStyle}>
        {label && <div style={styles.title}>{label}</div>}
        <div style={styles.error}>{state.error}</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="audio" style={wrapperStyle}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.src}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        preload="metadata"
      />

      {/* Header with title/artist */}
      {(label || currentTrack?.title || currentTrack?.artist) && (
        <div style={styles.header}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.title}>
              {currentTrack?.title || label || 'Audio'}
            </div>
            {currentTrack?.artist && (
              <div style={styles.artist}>{currentTrack.artist}</div>
            )}
          </div>
          {showWaveform && <Waveform isPlaying={state.isPlaying} />}
        </div>
      )}

      {/* Controls */}
      <div style={styles.controls}>
        {/* Skip Previous (only show for playlists) */}
        {tracks.length > 1 && (
          <button
            type="button"
            style={styles.volumeButton}
            onClick={skipPrevious}
            aria-label="Previous track"
          >
            <SkipPreviousIcon />
          </button>
        )}

        {/* Play/Pause */}
        <button
          type="button"
          style={mergeStyles(
            styles.playButton,
            state.isLoading ? styles.playButtonDisabled : undefined
          )}
          onClick={togglePlay}
          disabled={state.isLoading}
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
          aria-controls={audioId}
        >
          {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Skip Next (only show for playlists) */}
        {tracks.length > 1 && (
          <button
            type="button"
            style={mergeStyles(
              styles.volumeButton,
              currentTrackIndex >= tracks.length - 1 ? styles.playButtonDisabled : undefined
            )}
            onClick={skipNext}
            disabled={currentTrackIndex >= tracks.length - 1}
            aria-label="Next track"
          >
            <SkipNextIcon />
          </button>
        )}

        {/* Progress */}
        <div style={styles.progressContainer}>
          <div
            ref={progressRef}
            style={styles.progressTrack}
            onClick={handleProgressClick}
            role="slider"
            aria-label="Audio progress"
            aria-valuenow={state.currentTime}
            aria-valuemin={0}
            aria-valuemax={state.duration}
            tabIndex={0}
          >
            <div style={styles.progressBar(progressPercentage)} />
          </div>
          <div style={styles.timeDisplay}>
            <span>{formatTime(state.currentTime)}</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div style={styles.volumeContainer}>
          <button
            type="button"
            style={styles.volumeButton}
            onClick={toggleMute}
            aria-label={state.isMuted ? 'Unmute' : 'Mute'}
          >
            <VolumeIcon muted={state.isMuted} volume={state.volume} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={state.isMuted ? 0 : state.volume}
            onChange={handleVolumeChange}
            style={styles.volumeSlider}
            aria-label="Volume"
          />
        </div>
      </div>

      {/* Playlist */}
      {showPlaylist && (
        <Playlist
          tracks={tracks}
          currentIndex={currentTrackIndex}
          onSelect={handleTrackSelect}
        />
      )}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export interface StaticAudioProps {
  /** Audio source URL or array of track objects */
  src: string | AudioTrack | AudioTrack[];
  /** Title for the audio */
  title?: string;
  /** Artist name */
  artist?: string;
  /** Whether to show waveform visualization */
  showWaveform?: boolean;
  /** Whether to show playlist (for multiple tracks) */
  showPlaylist?: boolean;
  /** Whether to autoplay */
  autoPlay?: boolean;
  /** Whether to loop */
  loop?: boolean;
  /** Initial volume (0-1) */
  initialVolume?: number;
  /** Callback when track changes */
  onTrackChange?: (index: number, track: AudioTrack) => void;
  /** Callback when playback state changes */
  onPlayStateChange?: (isPlaying: boolean) => void;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Optional className */
  className?: string;
}

export function StaticAudio({
  src,
  title,
  artist,
  showWaveform = true,
  showPlaylist = true,
  autoPlay = false,
  loop = false,
  initialVolume = 1,
  onTrackChange,
  onPlayStateChange,
  style: customStyle,
  className,
}: StaticAudioProps): React.ReactElement {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const audioId = generateId('audio');

  // Parse tracks
  const tracks = parseAudioSource(src);

  // Audio state
  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: initialVolume,
    isMuted: false,
    isLoading: true,
    error: null,
  });
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);

  const currentTrack = tracks[currentTrackIndex];

  // Notify on track change
  useEffect(() => {
    if (currentTrack) {
      onTrackChange?.(currentTrackIndex, currentTrack);
    }
  }, [currentTrackIndex, currentTrack, onTrackChange]);

  // Notify on play state change
  useEffect(() => {
    onPlayStateChange?.(state.isPlaying);
  }, [state.isPlaying, onPlayStateChange]);

  // Set initial volume
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = initialVolume;
    }
  }, [initialVolume]);

  // Handle autoplay
  useEffect(() => {
    const audio = audioRef.current;
    if (audio && autoPlay && currentTrack) {
      audio.play().catch(() => {
        // Autoplay blocked by browser
      });
    }
  }, [autoPlay, currentTrack]);

  // Reset state when track changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isLoading: true,
      error: null,
    }));
  }, [currentTrackIndex]);

  // Audio event handlers
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setState(prev => ({
        ...prev,
        duration: audio.duration,
        isLoading: false,
      }));
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (loop && tracks.length === 1) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play();
      }
    } else if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    } else if (loop) {
      setCurrentTrackIndex(0);
    } else {
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, [currentTrackIndex, tracks.length, loop]);

  const handleError = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: 'Failed to load audio',
    }));
  }, []);

  const handleWaiting = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }));
  }, []);

  const handleCanPlay = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  // Control handlers
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (state.isPlaying) {
      audio.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      audio.play().catch(() => {
        setState(prev => ({ ...prev, error: 'Playback failed' }));
      });
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.isPlaying, currentTrack]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress || !state.duration) return;

    const rect = progress.getBoundingClientRect();
    const percentage = (e.clientX - rect.left) / rect.width;
    const newTime = percentage * state.duration;
    audio.currentTime = newTime;
    setState(prev => ({ ...prev, currentTime: newTime }));
  }, [state.duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newVolume = parseFloat(e.target.value);
    audio.volume = newVolume;
    setState(prev => ({
      ...prev,
      volume: newVolume,
      isMuted: newVolume === 0,
    }));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const newMuted = !state.isMuted;
    audio.muted = newMuted;
    setState(prev => ({ ...prev, isMuted: newMuted }));
  }, [state.isMuted]);

  const skipPrevious = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.currentTime > 3 || currentTrackIndex === 0) {
      audio.currentTime = 0;
      setState(prev => ({ ...prev, currentTime: 0 }));
    } else {
      setCurrentTrackIndex(prev => prev - 1);
    }
  }, [currentTrackIndex]);

  const skipNext = useCallback(() => {
    if (currentTrackIndex < tracks.length - 1) {
      setCurrentTrackIndex(prev => prev + 1);
    } else if (loop) {
      setCurrentTrackIndex(0);
    }
  }, [currentTrackIndex, tracks.length, loop]);

  const handleTrackSelect = useCallback((index: number) => {
    setCurrentTrackIndex(index);
  }, []);

  // Wrapper style
  const wrapperStyle = mergeStyles(styles.wrapper, customStyle);

  // Progress percentage
  const progressPercentage = state.duration > 0
    ? (state.currentTime / state.duration) * 100
    : 0;

  // Display title/artist
  const displayTitle = currentTrack?.title || title || 'Audio';
  const displayArtist = currentTrack?.artist || artist;

  // SSR placeholder
  if (!isBrowser) {
    return (
      <div data-liquid-type="audio" style={wrapperStyle} className={className}>
        <div style={styles.ssrPlaceholder}>
          [Audio player - {tracks.length} track{tracks.length !== 1 ? 's' : ''}]
        </div>
      </div>
    );
  }

  // Empty state
  if (tracks.length === 0) {
    return (
      <div data-liquid-type="audio" style={wrapperStyle} className={className}>
        {title && <div style={styles.title}>{title}</div>}
        <div style={styles.emptyState}>No audio source</div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div data-liquid-type="audio" style={wrapperStyle} className={className}>
        {title && <div style={styles.title}>{title}</div>}
        <div style={styles.error}>{state.error}</div>
      </div>
    );
  }

  return (
    <div data-liquid-type="audio" style={wrapperStyle} className={className}>
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentTrack?.src}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        onWaiting={handleWaiting}
        onCanPlay={handleCanPlay}
        preload="metadata"
      />

      {/* Header with title/artist */}
      <div style={styles.header}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.title}>{displayTitle}</div>
          {displayArtist && <div style={styles.artist}>{displayArtist}</div>}
        </div>
        {showWaveform && <Waveform isPlaying={state.isPlaying} />}
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        {/* Skip Previous (only show for playlists) */}
        {tracks.length > 1 && (
          <button
            type="button"
            style={styles.volumeButton}
            onClick={skipPrevious}
            aria-label="Previous track"
          >
            <SkipPreviousIcon />
          </button>
        )}

        {/* Play/Pause */}
        <button
          type="button"
          style={mergeStyles(
            styles.playButton,
            state.isLoading ? styles.playButtonDisabled : undefined
          )}
          onClick={togglePlay}
          disabled={state.isLoading}
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
          aria-controls={audioId}
        >
          {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Skip Next (only show for playlists) */}
        {tracks.length > 1 && (
          <button
            type="button"
            style={mergeStyles(
              styles.volumeButton,
              !loop && currentTrackIndex >= tracks.length - 1 ? styles.playButtonDisabled : undefined
            )}
            onClick={skipNext}
            disabled={!loop && currentTrackIndex >= tracks.length - 1}
            aria-label="Next track"
          >
            <SkipNextIcon />
          </button>
        )}

        {/* Progress */}
        <div style={styles.progressContainer}>
          <div
            ref={progressRef}
            style={styles.progressTrack}
            onClick={handleProgressClick}
            role="slider"
            aria-label="Audio progress"
            aria-valuenow={state.currentTime}
            aria-valuemin={0}
            aria-valuemax={state.duration}
            tabIndex={0}
          >
            <div style={styles.progressBar(progressPercentage)} />
          </div>
          <div style={styles.timeDisplay}>
            <span>{formatTime(state.currentTime)}</span>
            <span>{formatTime(state.duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div style={styles.volumeContainer}>
          <button
            type="button"
            style={styles.volumeButton}
            onClick={toggleMute}
            aria-label={state.isMuted ? 'Unmute' : 'Mute'}
          >
            <VolumeIcon muted={state.isMuted} volume={state.volume} />
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={state.isMuted ? 0 : state.volume}
            onChange={handleVolumeChange}
            style={styles.volumeSlider}
            aria-label="Volume"
          />
        </div>
      </div>

      {/* Playlist */}
      {showPlaylist && (
        <Playlist
          tracks={tracks}
          currentIndex={currentTrackIndex}
          onSelect={handleTrackSelect}
        />
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Audio;
