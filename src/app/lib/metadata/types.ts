/**
 * Metadata Types Module
 * Types for embedded image metadata (EXIF, IPTC, XMP)
 */

// Core metadata fields that we work with
export interface ImageMetadata {
  // Title/Headline
  title: string;
  // Description/Caption
  description: string;
  // Keywords (comma-separated string for compatibility)
  keywords: string;
}

// Extended metadata from EXIF/IPTC/XMP
export interface EmbeddedMetadata extends ImageMetadata {
  // Source information
  source: 'exif' | 'iptc' | 'xmp' | 'mixed' | 'none';
  // Raw EXIF fields
  exif?: {
    imageDescription?: string;
    userComment?: string;
    xpTitle?: string;
    xpComment?: string;
    xpKeywords?: string;
    xpSubject?: string;
  };
  // Raw IPTC fields
  iptc?: {
    headline?: string;
    caption?: string;
    keywords?: string[];
    objectName?: string;
    specialInstructions?: string;
  };
  // Raw XMP fields
  xmp?: {
    title?: string;
    description?: string;
    subject?: string[];
    headline?: string;
  };
}

// Sync status for tracking metadata state
export type MetadataSyncStatus = 
  | 'unsynced'      // UI has changes not written to file
  | 'synced'        // UI matches embedded metadata
  | 'reading'       // Currently reading from file
  | 'writing'       // Currently writing to file
  | 'error'         // Error occurred during read/write
  | 'no-file-path'; // File doesn't have a path (e.g., from clipboard)

// File metadata state with sync tracking
export interface FileMetadataState {
  file: File;
  filePath?: string; // File path for writing (if available)
  metadata: ImageMetadata;
  embeddedMetadata?: EmbeddedMetadata;
  syncStatus: MetadataSyncStatus;
  lastSyncError?: string;
  lastSyncTime?: Date;
}

// Options for writing metadata
export interface WriteMetadataOptions {
  // Which metadata standards to write to
  writeExif?: boolean;
  writeIptc?: boolean;
  writeXmp?: boolean;
  // Whether to preserve existing metadata not being updated
  preserveExisting?: boolean;
  // Create backup before writing
  createBackup?: boolean;
}

// Result of a metadata operation
export interface MetadataOperationResult {
  success: boolean;
  filePath: string;
  error?: string;
}

// Bulk operation progress callback
export type BulkOperationProgress = {
  completed: number;
  total: number;
  currentFile: string;
  status: 'reading' | 'writing' | 'complete' | 'error';
};

// Bulk operation result
export interface BulkOperationResult {
  successful: MetadataOperationResult[];
  failed: MetadataOperationResult[];
  totalProcessed: number;
}

// Default write options
export const DEFAULT_WRITE_OPTIONS: WriteMetadataOptions = {
  writeExif: true,
  writeIptc: true,
  writeXmp: true,
  preserveExisting: true,
  createBackup: false,
};

