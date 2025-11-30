/**
 * Metadata Service Module
 * Handles all ExifTool operations for reading/writing image metadata
 */

import { ExifTool, Tags } from 'exiftool-vendored';
import type {
  ImageMetadata,
  EmbeddedMetadata,
  WriteMetadataOptions,
  MetadataOperationResult,
  BulkOperationResult,
  BulkOperationProgress,
} from './types';
import { DEFAULT_WRITE_OPTIONS } from './types';

// Singleton ExifTool instance for better performance
let exifToolInstance: ExifTool | null = null;

/**
 * Get or create the ExifTool instance
 */
export function getExifTool(): ExifTool {
  if (!exifToolInstance) {
    exifToolInstance = new ExifTool({
      maxProcs: 4, // Allow parallel processing
      taskTimeoutMillis: 30000, // 30 second timeout per task
    });
  }
  return exifToolInstance;
}

/**
 * Close the ExifTool instance (call on app shutdown)
 */
export async function closeExifTool(): Promise<void> {
  if (exifToolInstance) {
    await exifToolInstance.end();
    exifToolInstance = null;
  }
}

/**
 * Extract normalized metadata from ExifTool tags
 */
function extractMetadataFromTags(tags: Tags): EmbeddedMetadata {
  // Extract title from various sources (priority: XMP > IPTC > EXIF)
  const title = 
    tags.Title?.toString() ||
    tags.Headline?.toString() ||
    tags.ObjectName?.toString() ||
    tags.ImageDescription?.toString() ||
    '';

  // Extract description from various sources
  const description = 
    tags.Description?.toString() ||
    tags.Caption?.toString() ||
    tags['Caption-Abstract']?.toString() ||
    tags.ImageDescription?.toString() ||
    '';

  // Extract keywords from various sources
  let keywordsArray: string[] = [];
  if (tags.Keywords) {
    keywordsArray = Array.isArray(tags.Keywords) 
      ? tags.Keywords.map(k => String(k))
      : [String(tags.Keywords)];
  } else if (tags.Subject) {
    keywordsArray = Array.isArray(tags.Subject)
      ? tags.Subject.map(k => String(k))
      : [String(tags.Subject)];
  }
  const keywords = keywordsArray.join(', ');

  // Determine source
  let source: EmbeddedMetadata['source'] = 'none';
  const hasXmp = !!(tags.Title || tags.Description || tags.Subject);
  const hasIptc = !!(tags.Headline || tags.Caption || tags.Keywords);
  const hasExif = !!(tags.ImageDescription);
  
  if (hasXmp && hasIptc) source = 'mixed';
  else if (hasXmp) source = 'xmp';
  else if (hasIptc) source = 'iptc';
  else if (hasExif) source = 'exif';

  return {
    title,
    description,
    keywords,
    source,
    exif: {
      imageDescription: tags.ImageDescription?.toString(),
      userComment: tags.UserComment?.toString(),
    },
    iptc: {
      headline: tags.Headline?.toString(),
      caption: tags['Caption-Abstract']?.toString(),
      keywords: keywordsArray,
      objectName: tags.ObjectName?.toString(),
    },
    xmp: {
      title: tags.Title?.toString(),
      description: tags.Description?.toString(),
      subject: Array.isArray(tags.Subject) ? tags.Subject.map(String) : undefined,
      headline: tags.Headline?.toString(),
    },
  };
}

/**
 * Read metadata from an image file
 */
export async function readMetadata(filePath: string): Promise<EmbeddedMetadata> {
  const exiftool = getExifTool();
  
  try {
    const tags = await exiftool.read(filePath);
    return extractMetadataFromTags(tags);
  } catch (error) {
    console.error(`Failed to read metadata from ${filePath}:`, error);
    throw new Error(`Failed to read metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Write metadata to an image file
 */
export async function writeMetadata(
  filePath: string,
  metadata: ImageMetadata,
  options: WriteMetadataOptions = {}
): Promise<MetadataOperationResult> {
  const exiftool = getExifTool();
  const opts = { ...DEFAULT_WRITE_OPTIONS, ...options };
  
  try {
    // Prepare keywords as array
    const keywordsArray = metadata.keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    // Build the tags to write
    const tagsToWrite: Partial<Tags> = {};

    // Write to XMP (most universal and modern)
    if (opts.writeXmp) {
      tagsToWrite.Title = metadata.title;
      tagsToWrite.Description = metadata.description;
      tagsToWrite.Subject = keywordsArray;
    }

    // Write to IPTC (widely supported by stock sites)
    if (opts.writeIptc) {
      tagsToWrite.Headline = metadata.title;
      tagsToWrite['Caption-Abstract'] = metadata.description;
      tagsToWrite.Keywords = keywordsArray;
      tagsToWrite.ObjectName = metadata.title.substring(0, 64); // IPTC limit
    }

    // Write to EXIF
    if (opts.writeExif) {
      tagsToWrite.ImageDescription = metadata.title;
    }

    // Write the metadata
    await exiftool.write(filePath, tagsToWrite, {
      writeArgs: ['-overwrite_original'], // Don't create backup file
    });

    return {
      success: true,
      filePath,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Failed to write metadata to ${filePath}:`, error);
    return {
      success: false,
      filePath,
      error: errorMessage,
    };
  }
}

/**
 * Read metadata from multiple files in bulk
 */
export async function readMetadataBulk(
  filePaths: string[],
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<Map<string, EmbeddedMetadata>> {
  const results = new Map<string, EmbeddedMetadata>();
  const total = filePaths.length;

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const fileName = filePath.split(/[/\\]/).pop() || filePath;

    onProgress?.({
      completed: i,
      total,
      currentFile: fileName,
      status: 'reading',
    });

    try {
      const metadata = await readMetadata(filePath);
      results.set(filePath, metadata);
    } catch (error) {
      console.error(`Failed to read ${filePath}:`, error);
      // Store empty metadata for failed reads
      results.set(filePath, {
        title: '',
        description: '',
        keywords: '',
        source: 'none',
      });
    }
  }

  onProgress?.({
    completed: total,
    total,
    currentFile: '',
    status: 'complete',
  });

  return results;
}

/**
 * Write metadata to multiple files in bulk
 */
export async function writeMetadataBulk(
  items: Array<{ filePath: string; metadata: ImageMetadata }>,
  options: WriteMetadataOptions = {},
  onProgress?: (progress: BulkOperationProgress) => void
): Promise<BulkOperationResult> {
  const successful: MetadataOperationResult[] = [];
  const failed: MetadataOperationResult[] = [];
  const total = items.length;

  for (let i = 0; i < items.length; i++) {
    const { filePath, metadata } = items[i];
    const fileName = filePath.split(/[/\\]/).pop() || filePath;

    onProgress?.({
      completed: i,
      total,
      currentFile: fileName,
      status: 'writing',
    });

    const result = await writeMetadata(filePath, metadata, options);

    if (result.success) {
      successful.push(result);
    } else {
      failed.push(result);
    }
  }

  onProgress?.({
    completed: total,
    total,
    currentFile: '',
    status: 'complete',
  });

  return {
    successful,
    failed,
    totalProcessed: total,
  };
}

/**
 * Check if a file has embedded metadata
 */
export async function hasEmbeddedMetadata(filePath: string): Promise<boolean> {
  try {
    const metadata = await readMetadata(filePath);
    return !!(metadata.title || metadata.description || metadata.keywords);
  } catch {
    return false;
  }
}

