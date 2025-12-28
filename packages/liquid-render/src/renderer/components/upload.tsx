// Upload Component - Drag and drop file upload with previews
import React, { useState, useCallback, useRef } from 'react';
import type { LiquidComponentProps } from './utils';
import { tokens, cardStyles, mergeStyles, buttonStyles, generateId } from './utils';
import { resolveBinding } from '../data-context';

// ============================================================================
// Types
// ============================================================================

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  preview?: string;
  error?: string;
}

type UploadVariant = 'default' | 'compact';

export interface StaticUploadProps {
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number; // in bytes
  variant?: UploadVariant;
  disabled?: boolean;
  onFilesChange?: (files: File[]) => void;
  onUpload?: (file: File) => Promise<void>;
  className?: string;
}

// ============================================================================
// Styles
// ============================================================================

const styles = {
  wrapper: mergeStyles(cardStyles(), {
    padding: tokens.spacing.md,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.md,
  }),

  label: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    marginBottom: tokens.spacing.xs,
  } as React.CSSProperties,

  dropZone: (isDragging: boolean, disabled: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
    border: `2px dashed ${isDragging ? tokens.colors.primary : tokens.colors.border}`,
    borderRadius: tokens.radius.lg,
    backgroundColor: isDragging ? tokens.colors.accent : tokens.colors.background,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: `all ${tokens.transition.fast}`,
    minHeight: '120px',
  }),

  dropZoneCompact: (isDragging: boolean, disabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.md,
    border: `2px dashed ${isDragging ? tokens.colors.primary : tokens.colors.border}`,
    borderRadius: tokens.radius.md,
    backgroundColor: isDragging ? tokens.colors.accent : tokens.colors.background,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: `all ${tokens.transition.fast}`,
  }),

  dropZoneIcon: {
    width: '48px',
    height: '48px',
    color: tokens.colors.mutedForeground,
    marginBottom: tokens.spacing.sm,
  } as React.CSSProperties,

  dropZoneIconCompact: {
    width: '24px',
    height: '24px',
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  dropZoneText: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  dropZoneTextCompact: {
    fontSize: tokens.fontSize.sm,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  browseLink: {
    color: tokens.colors.primary,
    fontWeight: tokens.fontWeight.medium,
    cursor: 'pointer',
    textDecoration: 'underline',
  } as React.CSSProperties,

  fileList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.sm,
  } as React.CSSProperties,

  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    backgroundColor: tokens.colors.muted,
    borderRadius: tokens.radius.md,
  } as React.CSSProperties,

  filePreview: {
    width: '40px',
    height: '40px',
    borderRadius: tokens.radius.sm,
    objectFit: 'cover' as const,
    backgroundColor: tokens.colors.secondary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as React.CSSProperties,

  fileIcon: {
    width: '20px',
    height: '20px',
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  fileInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  } as React.CSSProperties,

  fileName: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
    color: tokens.colors.foreground,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  fileSize: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
  } as React.CSSProperties,

  fileError: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.error,
  } as React.CSSProperties,

  progressBar: {
    width: '100%',
    height: '4px',
    backgroundColor: tokens.colors.secondary,
    borderRadius: tokens.radius.full,
    overflow: 'hidden',
    marginTop: '4px',
  } as React.CSSProperties,

  progressFill: (progress: number): React.CSSProperties => ({
    height: '100%',
    width: `${progress}%`,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.radius.full,
    transition: `width ${tokens.transition.fast}`,
  }),

  removeButton: mergeStyles(buttonStyles('ghost', 'sm'), {
    padding: tokens.spacing.xs,
    height: 'auto',
    minWidth: 'auto',
    color: tokens.colors.mutedForeground,
    flexShrink: 0,
  }),

  hint: {
    fontSize: tokens.fontSize.xs,
    color: tokens.colors.mutedForeground,
    textAlign: 'center' as const,
  } as React.CSSProperties,

  hiddenInput: {
    display: 'none',
  } as React.CSSProperties,
};

// ============================================================================
// Helpers
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function isImageFile(type: string): boolean {
  return type.startsWith('image/');
}

function createFilePreview(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!isImageFile(file.type)) {
      resolve(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };
    reader.onerror = () => {
      resolve(undefined);
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// Sub-components
// ============================================================================

function UploadIcon({ compact }: { compact?: boolean }): React.ReactElement {
  const style = compact ? styles.dropZoneIconCompact : styles.dropZoneIcon;
  return (
    <svg
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function FileIcon(): React.ReactElement {
  return (
    <svg
      style={styles.fileIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function CloseIcon(): React.ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

interface FileItemComponentProps {
  uploadedFile: UploadedFile;
  onRemove: (id: string) => void;
}

function FileItemComponent({ uploadedFile, onRemove }: FileItemComponentProps): React.ReactElement {
  const { id, name, size, status, progress, preview, error } = uploadedFile;
  const isUploading = status === 'uploading';
  const hasError = status === 'error';

  return (
    <div style={styles.fileItem}>
      <div style={styles.filePreview}>
        {preview ? (
          <img
            src={preview}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: tokens.radius.sm }}
          />
        ) : (
          <FileIcon />
        )}
      </div>
      <div style={styles.fileInfo}>
        <div style={styles.fileName} title={name}>
          {name}
        </div>
        <div style={hasError ? styles.fileError : styles.fileSize}>
          {hasError ? error : formatFileSize(size)}
        </div>
        {isUploading && (
          <div style={styles.progressBar}>
            <div style={styles.progressFill(progress)} />
          </div>
        )}
      </div>
      <button
        type="button"
        style={styles.removeButton}
        onClick={() => onRemove(id)}
        aria-label={`Remove ${name}`}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Upload({ block, data }: LiquidComponentProps): React.ReactElement {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve bindings for configuration
  const configValue = resolveBinding(block.binding, data);
  const config = typeof configValue === 'object' && configValue !== null
    ? configValue as Record<string, unknown>
    : {};

  const label = block.label;
  const accept = (config.accept as string) || '*';
  const multiple = (config.multiple as boolean) ?? true;
  const maxFiles = (config.maxFiles as number) || 10;
  const maxSize = (config.maxSize as number) || 10 * 1024 * 1024; // 10MB default
  const disabled = (config.disabled as boolean) || false;
  const variant: UploadVariant = (config.variant as UploadVariant) || 'default';

  const inputId = generateId('upload');

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    // Limit number of files
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);

    const uploadedFiles: UploadedFile[] = await Promise.all(
      filesToAdd.map(async (file) => {
        const preview = await createFilePreview(file);
        const isOversized = file.size > maxSize;

        return {
          id: generateId('file'),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: isOversized ? 0 : 100,
          status: isOversized ? 'error' as const : 'complete' as const,
          preview,
          error: isOversized ? `File exceeds ${formatFileSize(maxSize)} limit` : undefined,
        };
      })
    );

    setFiles((prev) => [...prev, ...uploadedFiles]);
  }, [files.length, maxFiles, maxSize]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [disabled, addFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  }, [addFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, [disabled]);

  const isCompact = variant === 'compact';
  const dropZoneStyle = isCompact
    ? styles.dropZoneCompact(isDragging, disabled)
    : styles.dropZone(isDragging, disabled);

  const canAddMore = files.length < maxFiles;

  return (
    <div data-liquid-type="upload" style={styles.wrapper}>
      {label && <div style={styles.label}>{label}</div>}

      {canAddMore && (
        <div
          style={dropZoneStyle}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload files"
        >
          <UploadIcon compact={isCompact} />
          <div style={isCompact ? styles.dropZoneTextCompact : styles.dropZoneText}>
            {isCompact ? (
              <>Drop files or <span style={styles.browseLink}>browse</span></>
            ) : (
              <>
                <p>Drag and drop files here, or</p>
                <span style={styles.browseLink}>click to browse</span>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        style={styles.hiddenInput}
        disabled={disabled}
        aria-hidden="true"
      />

      {files.length > 0 && (
        <div style={styles.fileList}>
          {files.map((uploadedFile) => (
            <FileItemComponent
              key={uploadedFile.id}
              uploadedFile={uploadedFile}
              onRemove={removeFile}
            />
          ))}
        </div>
      )}

      {!isCompact && (
        <div style={styles.hint}>
          Max {maxFiles} files, up to {formatFileSize(maxSize)} each
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Static Component (standalone usage)
// ============================================================================

export function StaticUpload({
  label,
  accept = '*',
  multiple = true,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024,
  variant = 'default',
  disabled = false,
  onFilesChange,
  onUpload,
  className,
}: StaticUploadProps): React.ReactElement {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const inputId = generateId('upload');

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);

    // Limit number of files
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);

    const uploadedFiles: UploadedFile[] = await Promise.all(
      filesToAdd.map(async (file) => {
        const preview = await createFilePreview(file);
        const isOversized = file.size > maxSize;

        const uploadedFile: UploadedFile = {
          id: generateId('file'),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: isOversized ? 'error' : 'pending',
          preview,
          error: isOversized ? `File exceeds ${formatFileSize(maxSize)} limit` : undefined,
        };

        // If onUpload is provided and file is valid, start upload
        if (onUpload && !isOversized) {
          uploadedFile.status = 'uploading';
          uploadedFile.progress = 50; // Simulate progress

          try {
            await onUpload(file);
            uploadedFile.status = 'complete';
            uploadedFile.progress = 100;
          } catch (err) {
            uploadedFile.status = 'error';
            uploadedFile.error = err instanceof Error ? err.message : 'Upload failed';
          }
        } else if (!isOversized) {
          uploadedFile.status = 'complete';
          uploadedFile.progress = 100;
        }

        return uploadedFile;
      })
    );

    const newFileList = [...files, ...uploadedFiles];
    setFiles(newFileList);

    // Notify parent of file changes
    if (onFilesChange) {
      onFilesChange(newFileList.filter((f) => f.status === 'complete').map((f) => f.file));
    }
  }, [files, maxFiles, maxSize, onUpload, onFilesChange]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      const newFiles = prev.filter((f) => f.id !== id);

      if (onFilesChange) {
        onFilesChange(newFiles.filter((f) => f.status === 'complete').map((f) => f.file));
      }

      return newFiles;
    });
  }, [onFilesChange]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }, [disabled, addFiles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    e.target.value = '';
  }, [addFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  }, [disabled]);

  const isCompact = variant === 'compact';
  const dropZoneStyle = isCompact
    ? styles.dropZoneCompact(isDragging, disabled)
    : styles.dropZone(isDragging, disabled);

  const canAddMore = files.length < maxFiles;

  return (
    <div data-liquid-type="upload" style={styles.wrapper} className={className}>
      {label && <div style={styles.label}>{label}</div>}

      {canAddMore && (
        <div
          style={dropZoneStyle}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="Upload files"
        >
          <UploadIcon compact={isCompact} />
          <div style={isCompact ? styles.dropZoneTextCompact : styles.dropZoneText}>
            {isCompact ? (
              <>Drop files or <span style={styles.browseLink}>browse</span></>
            ) : (
              <>
                <p>Drag and drop files here, or</p>
                <span style={styles.browseLink}>click to browse</span>
              </>
            )}
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        style={styles.hiddenInput}
        disabled={disabled}
        aria-hidden="true"
      />

      {files.length > 0 && (
        <div style={styles.fileList}>
          {files.map((uploadedFile) => (
            <FileItemComponent
              key={uploadedFile.id}
              uploadedFile={uploadedFile}
              onRemove={removeFile}
            />
          ))}
        </div>
      )}

      {!isCompact && (
        <div style={styles.hint}>
          Max {maxFiles} files, up to {formatFileSize(maxSize)} each
        </div>
      )}
    </div>
  );
}

export default Upload;
