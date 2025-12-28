// Video Component - HTML5 video player with custom controls overlay
// DSL: Vd :srcBinding or Vd "url"

import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { LiquidComponentProps } from './utils';
import {
  tokens,
  cardStyles,
  mergeStyles,
  buttonStyles,
  getLayoutStyles,
  isBrowser,
} from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface VideoState {
  isPlaying: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  hasError: boolean;
  showControls: boolean;
}

type VideoFit = 'contain' | 'cover' | 'fill' | 'none';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: mergeStyles(cardStyles(), {
    position: 'relative' as const,
    overflow: 'hidden',
    backgroundColor: tokens.colors.foreground,
    width: '100%',
  }),
  video: {
    display: 'block',
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0, 0, 0, 0.7))',
    padding: tokens.spacing.md,
    transition: `opacity ${tokens.transition.fast}`,
  },
  controlsHidden: {
    opacity: 0,
    pointerEvents: 'none' as const,
  },
  controlsVisible: {
    opacity: 1,
    pointerEvents: 'auto' as const,
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  progressContainer: {
    flex: 1,
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: tokens.radius.full,
    cursor: 'pointer',
    position: 'relative' as const,
  },
  progressBar: {
    height: '100%',
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.full,
    transition: 'width 0.1s linear',
  },
  progressBuffered: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: tokens.radius.full,
  },
  controlButton: mergeStyles(buttonStyles('ghost', 'sm'), {
    color: '#ffffff',
    backgroundColor: 'transparent',
    border: 'none',
    width: '2rem',
    height: '2rem',
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.md,
  }),
  timeDisplay: {
    color: '#ffffff',
    fontSize: tokens.fontSize.xs,
    fontFamily: 'monospace',
    minWidth: '80px',
    textAlign: 'center' as const,
  },
  volumeSlider: {
    width: '60px',
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: tokens.radius.full,
    cursor: 'pointer',
    appearance: 'none' as const,
    WebkitAppearance: 'none' as const,
  },
  centerPlayButton: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '4rem',
    height: '4rem',
    borderRadius: tokens.radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: `all ${tokens.transition.fast}`,
  },
  loadingSpinner: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '3rem',
    height: '3rem',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: tokens.radius.full,
    animation: 'spin 1s linear infinite',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center' as const,
    minHeight: '200px',
    backgroundColor: tokens.colors.muted,
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center' as const,
    minHeight: '200px',
    backgroundColor: tokens.colors.muted,
  },
  ssrPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
    color: tokens.colors.mutedForeground,
    fontSize: tokens.fontSize.sm,
    textAlign: 'center' as const,
    minHeight: '200px',
    backgroundColor: tokens.colors.muted,
  },
  iconSize: {
    width: '1.25rem',
    height: '1.25rem',
  },
  largeIconSize: {
    width: '2rem',
    height: '2rem',
  },
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format time in MM:SS or HH:MM:SS format
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
 * Get video source URL from binding value
 */
function getVideoSrc(value: unknown): string | undefined {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (value && typeof value === 'object' && 'src' in value) {
    return String((value as Record<string, unknown>).src);
  }
  if (value && typeof value === 'object' && 'url' in value) {
    return String((value as Record<string, unknown>).url);
  }
  return undefined;
}

/**
 * Get poster image URL from block or value
 */
function getPosterSrc(block: { poster?: string }, value: unknown): string | undefined {
  if (block.poster) {
    return block.poster;
  }
  if (value && typeof value === 'object' && 'poster' in value) {
    return String((value as Record<string, unknown>).poster);
  }
  if (value && typeof value === 'object' && 'thumbnail' in value) {
    return String((value as Record<string, unknown>).thumbnail);
  }
  return undefined;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Play Icon
 */
function PlayIcon({ style }: { style?: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      style={mergeStyles(styles.iconSize, style)}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/**
 * Pause Icon
 */
function PauseIcon({ style }: { style?: React.CSSProperties }): React.ReactElement {
  return (
    <svg
      style={mergeStyles(styles.iconSize, style)}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

/**
 * Volume Icon
 */
function VolumeIcon({ muted, style }: { muted: boolean; style?: React.CSSProperties }): React.ReactElement {
  if (muted) {
    return (
      <svg
        style={mergeStyles(styles.iconSize, style)}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
      </svg>
    );
  }
  return (
    <svg
      style={mergeStyles(styles.iconSize, style)}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
    </svg>
  );
}

/**
 * Fullscreen Icon
 */
function FullscreenIcon({ isFullscreen, style }: { isFullscreen: boolean; style?: React.CSSProperties }): React.ReactElement {
  if (isFullscreen) {
    return (
      <svg
        style={mergeStyles(styles.iconSize, style)}
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
      </svg>
    );
  }
  return (
    <svg
      style={mergeStyles(styles.iconSize, style)}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
    </svg>
  );
}

/**
 * Video Error Icon
 */
function VideoErrorIcon(): React.ReactElement {
  return (
    <svg
      style={{ width: '3rem', height: '3rem', marginBottom: tokens.spacing.sm }}
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  );
}

/**
 * Progress Bar component
 */
interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps): React.ReactElement {
  const progressRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    onSeek(Math.max(0, Math.min(newTime, duration)));
  }, [duration, onSeek]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={progressRef}
      style={styles.progressContainer}
      onClick={handleClick}
      role="slider"
      aria-label="Video progress"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      tabIndex={0}
    >
      <div
        style={mergeStyles(styles.progressBar, { width: `${progressPercent}%` })}
      />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Video component for HTML5 video playback with custom controls.
 *
 * The Video component renders an HTML5 video player with a custom controls
 * overlay including play/pause, volume, progress bar, and fullscreen.
 *
 * @example DSL Usage
 * ```liquid
 * Vd :videoUrl                      # Video from data binding
 * Vd "https://example.com/video.mp4" # Video from literal URL
 * ```
 */
export function Video({ block, data }: LiquidComponentProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Extract props from block.props (video-specific options)
  const props = block.props as {
    muted?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    controls?: boolean;
    fit?: VideoFit;
    poster?: string;
    aspectRatio?: string;
  } | undefined;

  const [state, setState] = useState<VideoState>({
    isPlaying: false,
    isMuted: props?.muted ?? false,
    isFullscreen: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isLoading: true,
    hasError: false,
    showControls: true,
  });

  // Resolve the binding to get the video source
  const bindingValue = resolveBinding(block.binding, data);
  const src = getVideoSrc(bindingValue);
  const poster = getPosterSrc({ poster: props?.poster }, bindingValue);

  // Extract options from block.props
  const autoplay = props?.autoplay ?? false;
  const loop = props?.loop ?? false;
  const controls = props?.controls !== false; // Default to true
  const objectFit: VideoFit = props?.fit ?? 'contain';

  // Container styles with layout
  const aspectRatio = props?.aspectRatio ?? (block.style?.color ? undefined : '16 / 9');
  const containerStyle = mergeStyles(
    styles.container,
    getLayoutStyles(block),
    aspectRatio ? { aspectRatio } : { aspectRatio: '16 / 9' }
  );

  // Video element styles
  const videoStyle = mergeStyles(styles.video, {
    objectFit,
  });

  // Reset controls hide timeout
  const resetHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    setState(prev => ({ ...prev, showControls: true }));

    if (state.isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, showControls: false }));
      }, 3000);
    }
  }, [state.isPlaying]);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state.isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {
        // Autoplay may be blocked
      });
    }
  }, [state.isPlaying]);

  // Mute toggle
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setState(prev => ({ ...prev, isMuted: video.muted }));
  }, []);

  // Volume change
  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(event.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;
    setState(prev => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }));
  }, []);

  // Seek
  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {
        // Fullscreen may not be supported
      });
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }));
    const handlePause = () => setState(prev => ({ ...prev, isPlaying: false, showControls: true }));
    const handleTimeUpdate = () => setState(prev => ({ ...prev, currentTime: video.currentTime }));
    const handleDurationChange = () => setState(prev => ({ ...prev, duration: video.duration }));
    const handleLoadedData = () => setState(prev => ({ ...prev, isLoading: false }));
    const handleWaiting = () => setState(prev => ({ ...prev, isLoading: true }));
    const handleCanPlay = () => setState(prev => ({ ...prev, isLoading: false }));
    const handleError = () => setState(prev => ({ ...prev, hasError: true, isLoading: false }));
    const handleVolumeChangeEvent = () => setState(prev => ({
      ...prev,
      volume: video.volume,
      isMuted: video.muted,
    }));

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('volumechange', handleVolumeChangeEvent);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('volumechange', handleVolumeChangeEvent);
    };
  }, []);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  // SSR placeholder
  if (!isBrowser) {
    return (
      <div data-liquid-type="video" style={containerStyle}>
        <div style={styles.ssrPlaceholder}>
          [Video player - {src ? 'ready' : 'no source'}]
        </div>
      </div>
    );
  }

  // Empty state - no source
  if (!src) {
    return (
      <div data-liquid-type="video" style={containerStyle}>
        <div style={styles.emptyState}>
          No video source available
        </div>
      </div>
    );
  }

  // Error state
  if (state.hasError) {
    return (
      <div data-liquid-type="video" style={containerStyle}>
        <div style={styles.errorState}>
          <VideoErrorIcon />
          <span>Unable to load video</span>
        </div>
      </div>
    );
  }

  const controlsStyle = mergeStyles(
    styles.controlsOverlay,
    state.showControls || !state.isPlaying ? styles.controlsVisible : styles.controlsHidden
  );

  return (
    <div
      ref={containerRef}
      data-liquid-type="video"
      style={containerStyle}
      onMouseMove={resetHideControlsTimeout}
      onMouseLeave={() => state.isPlaying && setState(prev => ({ ...prev, showControls: false }))}
    >
      <video
        ref={videoRef}
        style={videoStyle}
        src={src}
        poster={poster}
        autoPlay={autoplay}
        loop={loop}
        muted={state.isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* Loading spinner */}
      {state.isLoading && (
        <div style={styles.loadingSpinner} aria-label="Loading video" />
      )}

      {/* Center play button (when paused) */}
      {!state.isPlaying && !state.isLoading && (
        <button
          type="button"
          style={styles.centerPlayButton}
          onClick={togglePlay}
          aria-label="Play video"
        >
          <PlayIcon style={styles.largeIconSize} />
        </button>
      )}

      {/* Controls overlay */}
      {controls && (
        <div style={controlsStyle}>
          <div style={styles.controlsRow}>
            {/* Play/Pause */}
            <button
              type="button"
              style={styles.controlButton}
              onClick={togglePlay}
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Volume */}
            <button
              type="button"
              style={styles.controlButton}
              onClick={toggleMute}
              aria-label={state.isMuted ? 'Unmute' : 'Mute'}
            >
              <VolumeIcon muted={state.isMuted} />
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={state.isMuted ? 0 : state.volume}
              onChange={handleVolumeChange}
              style={styles.volumeSlider}
              aria-label="Volume"
            />

            {/* Progress bar */}
            <ProgressBar
              currentTime={state.currentTime}
              duration={state.duration}
              onSeek={handleSeek}
            />

            {/* Time display */}
            <span style={styles.timeDisplay}>
              {formatTime(state.currentTime)} / {formatTime(state.duration)}
            </span>

            {/* Fullscreen */}
            <button
              type="button"
              style={styles.controlButton}
              onClick={toggleFullscreen}
              aria-label={state.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <FullscreenIcon isFullscreen={state.isFullscreen} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Video (standalone usage without LiquidUI)
// ============================================================================

interface StaticVideoProps {
  /** Video source URL */
  src: string;
  /** Poster image URL */
  poster?: string;
  /** Auto-play the video */
  autoPlay?: boolean;
  /** Loop the video */
  loop?: boolean;
  /** Start muted */
  muted?: boolean;
  /** Show custom controls (default: true) */
  controls?: boolean;
  /** Object-fit for the video */
  objectFit?: VideoFit;
  /** Aspect ratio (e.g., "16 / 9") */
  aspectRatio?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Optional className */
  className?: string;
  /** Accessible label */
  label?: string;
  /** Callback when video ends */
  onEnded?: () => void;
  /** Callback when video plays */
  onPlay?: () => void;
  /** Callback when video pauses */
  onPause?: () => void;
  /** Callback for time updates */
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

/**
 * Static Video component for standalone usage outside LiquidUI.
 *
 * @example
 * ```tsx
 * <StaticVideo
 *   src="https://example.com/video.mp4"
 *   poster="https://example.com/poster.jpg"
 *   controls
 *   autoPlay={false}
 * />
 * ```
 */
export function StaticVideo({
  src,
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
  controls = true,
  objectFit = 'contain',
  aspectRatio = '16 / 9',
  style: customStyle,
  className,
  label = 'Video player',
  onEnded,
  onPlay,
  onPause,
  onTimeUpdate,
}: StaticVideoProps): React.ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<VideoState>({
    isPlaying: false,
    isMuted: muted,
    isFullscreen: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isLoading: true,
    hasError: false,
    showControls: true,
  });

  // Container styles
  const containerStyle = mergeStyles(
    styles.container,
    { aspectRatio },
    customStyle
  );

  // Video element styles
  const videoStyle = mergeStyles(styles.video, {
    objectFit,
  });

  // Reset controls hide timeout
  const resetHideControlsTimeout = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    setState(prev => ({ ...prev, showControls: true }));

    if (state.isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, showControls: false }));
      }, 3000);
    }
  }, [state.isPlaying]);

  // Play/Pause toggle
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state.isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {
        // Autoplay may be blocked
      });
    }
  }, [state.isPlaying]);

  // Mute toggle
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setState(prev => ({ ...prev, isMuted: video.muted }));
  }, []);

  // Volume change
  const handleVolumeChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(event.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;
    setState(prev => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }));
  }, []);

  // Seek
  const handleSeek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = time;
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {
        // Fullscreen may not be supported
      });
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlayEvent = () => {
      setState(prev => ({ ...prev, isPlaying: true }));
      onPlay?.();
    };
    const handlePauseEvent = () => {
      setState(prev => ({ ...prev, isPlaying: false, showControls: true }));
      onPause?.();
    };
    const handleTimeUpdateEvent = () => {
      setState(prev => ({ ...prev, currentTime: video.currentTime }));
      onTimeUpdate?.(video.currentTime, video.duration);
    };
    const handleDurationChange = () => setState(prev => ({ ...prev, duration: video.duration }));
    const handleLoadedData = () => setState(prev => ({ ...prev, isLoading: false }));
    const handleWaiting = () => setState(prev => ({ ...prev, isLoading: true }));
    const handleCanPlay = () => setState(prev => ({ ...prev, isLoading: false }));
    const handleError = () => setState(prev => ({ ...prev, hasError: true, isLoading: false }));
    const handleEndedEvent = () => onEnded?.();
    const handleVolumeChangeEvent = () => setState(prev => ({
      ...prev,
      volume: video.volume,
      isMuted: video.muted,
    }));

    video.addEventListener('play', handlePlayEvent);
    video.addEventListener('pause', handlePauseEvent);
    video.addEventListener('timeupdate', handleTimeUpdateEvent);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEndedEvent);
    video.addEventListener('volumechange', handleVolumeChangeEvent);

    return () => {
      video.removeEventListener('play', handlePlayEvent);
      video.removeEventListener('pause', handlePauseEvent);
      video.removeEventListener('timeupdate', handleTimeUpdateEvent);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ended', handleEndedEvent);
      video.removeEventListener('volumechange', handleVolumeChangeEvent);
    };
  }, [onPlay, onPause, onTimeUpdate, onEnded]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setState(prev => ({ ...prev, isFullscreen: !!document.fullscreenElement }));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  // SSR placeholder
  if (!isBrowser) {
    return (
      <div data-liquid-type="video" style={containerStyle} className={className}>
        <div style={styles.ssrPlaceholder}>
          [Video player]
        </div>
      </div>
    );
  }

  // Empty state - no source
  if (!src) {
    return (
      <div data-liquid-type="video" style={containerStyle} className={className}>
        <div style={styles.emptyState}>
          No video source available
        </div>
      </div>
    );
  }

  // Error state
  if (state.hasError) {
    return (
      <div data-liquid-type="video" style={containerStyle} className={className}>
        <div style={styles.errorState}>
          <VideoErrorIcon />
          <span>Unable to load video</span>
        </div>
      </div>
    );
  }

  const controlsStyle = mergeStyles(
    styles.controlsOverlay,
    state.showControls || !state.isPlaying ? styles.controlsVisible : styles.controlsHidden
  );

  return (
    <div
      ref={containerRef}
      data-liquid-type="video"
      style={containerStyle}
      className={className}
      onMouseMove={resetHideControlsTimeout}
      onMouseLeave={() => state.isPlaying && setState(prev => ({ ...prev, showControls: false }))}
      aria-label={label}
    >
      <video
        ref={videoRef}
        style={videoStyle}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={state.isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* Loading spinner */}
      {state.isLoading && (
        <div style={styles.loadingSpinner} aria-label="Loading video" />
      )}

      {/* Center play button (when paused) */}
      {!state.isPlaying && !state.isLoading && (
        <button
          type="button"
          style={styles.centerPlayButton}
          onClick={togglePlay}
          aria-label="Play video"
        >
          <PlayIcon style={styles.largeIconSize} />
        </button>
      )}

      {/* Controls overlay */}
      {controls && (
        <div style={controlsStyle}>
          <div style={styles.controlsRow}>
            {/* Play/Pause */}
            <button
              type="button"
              style={styles.controlButton}
              onClick={togglePlay}
              aria-label={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Volume */}
            <button
              type="button"
              style={styles.controlButton}
              onClick={toggleMute}
              aria-label={state.isMuted ? 'Unmute' : 'Mute'}
            >
              <VolumeIcon muted={state.isMuted} />
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={state.isMuted ? 0 : state.volume}
              onChange={handleVolumeChange}
              style={styles.volumeSlider}
              aria-label="Volume"
            />

            {/* Progress bar */}
            <ProgressBar
              currentTime={state.currentTime}
              duration={state.duration}
              onSeek={handleSeek}
            />

            {/* Time display */}
            <span style={styles.timeDisplay}>
              {formatTime(state.currentTime)} / {formatTime(state.duration)}
            </span>

            {/* Fullscreen */}
            <button
              type="button"
              style={styles.controlButton}
              onClick={toggleFullscreen}
              aria-label={state.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              <FullscreenIcon isFullscreen={state.isFullscreen} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default Video;
