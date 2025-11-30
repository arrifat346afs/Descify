/**
 * Metadata Service Module
 * Handles all ExifTool operations for reading/writing image metadata
 * Uses Tauri's shell command API to run ExifTool
 */

import { Command } from '@tauri-apps/plugin-shell';
import type {
  ImageMetadata,
  EmbeddedMetadata,
  WriteMetadataOptions,
  MetadataOperationResult,
  BulkOperationResult,
  BulkOperationProgress,
} from './types';
import { DEFAULT_WRITE_OPTIONS } from './types';

// ExifTool JSON output type
interface ExifToolJsonOutput {
  Title?: string;
  Headline?: string;
  ObjectName?: string;
  ImageDescription?: string;
  Description?: string;
  Caption?: string;
  'Caption-Abstract'?: string;
  Keywords?: string | string[];
  Subject?: string | string[];
  UserComment?: string;
  [key: string]: unknown;
}

/**
 * Close the ExifTool instance (no-op for shell-based implementation)
 */
export async function closeExifTool(): Promise<void> {
  // No cleanup needed for shell-based implementation
}

/**
 * Run ExifTool command and return output
 */
async function runExifTool(args: string[]): Promise<string> {
  try {
    const command = Command.create('exiftool', args);
    const output = await command.execute();

    if (output.code !== 0) {
      throw new Error(output.stderr || `ExifTool exited with code ${output.code}`);
    }

    return output.stdout;
  } catch (error) {
    console.error('ExifTool command failed:', error);
    throw error;
  }
}

/**
 * Extract normalized metadata from ExifTool JSON output
 */
function extractMetadataFromJson(data: ExifToolJsonOutput): EmbeddedMetadata {
  // Extract title from various sources (priority: XMP > IPTC > EXIF)
  const title =
    data.Title?.toString() ||
    data.Headline?.toString() ||
    data.ObjectName?.toString() ||
    data.ImageDescription?.toString() ||
    '';

  // Extract description from various sources
  const description =
    data.Description?.toString() ||
    data.Caption?.toString() ||
    data['Caption-Abstract']?.toString() ||
    data.ImageDescription?.toString() ||
    '';

  // Extract keywords from various sources
  let keywordsArray: string[] = [];
  if (data.Keywords) {
    keywordsArray = Array.isArray(data.Keywords)
      ? data.Keywords.map(k => String(k))
      : [String(data.Keywords)];
  } else if (data.Subject) {
    keywordsArray = Array.isArray(data.Subject)
      ? data.Subject.map(k => String(k))
      : [String(data.Subject)];
  }
  const keywords = keywordsArray.join(', ');

  // Determine source
  let source: EmbeddedMetadata['source'] = 'none';
  const hasXmp = !!(data.Title || data.Description || data.Subject);
  const hasIptc = !!(data.Headline || data.Caption || data.Keywords);
  const hasExif = !!(data.ImageDescription);

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
      imageDescription: data.ImageDescription?.toString(),
      userComment: data.UserComment?.toString(),
    },
    iptc: {
      headline: data.Headline?.toString(),
      caption: data['Caption-Abstract']?.toString(),
      keywords: keywordsArray,
      objectName: data.ObjectName?.toString(),
    },
    xmp: {
      title: data.Title?.toString(),
      description: data.Description?.toString(),
      subject: Array.isArray(data.Subject) ? data.Subject.map(String) : undefined,
      headline: data.Headline?.toString(),
    },
  };
}

/**
 * Read metadata from an image file
 */
export async function readMetadata(filePath: string): Promise<EmbeddedMetadata> {
  try {
    // Use ExifTool to read metadata in JSON format
    const output = await runExifTool(['-json', '-Title', '-Headline', '-ObjectName',
      '-ImageDescription', '-Description', '-Caption', '-Caption-Abstract',
      '-Keywords', '-Subject', '-UserComment', filePath]);

    const jsonData = JSON.parse(output);
    if (Array.isArray(jsonData) && jsonData.length > 0) {
      return extractMetadataFromJson(jsonData[0] as ExifToolJsonOutput);
    }

    return {
      title: '',
      description: '',
      keywords: '',
      source: 'none',
    };
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
  const opts = { ...DEFAULT_WRITE_OPTIONS, ...options };

  try {
    // Prepare keywords as array
    const keywordsArray = metadata.keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    // Build ExifTool arguments
    const args: string[] = ['-overwrite_original'];

    // Write to XMP (most universal and modern)
    if (opts.writeXmp) {
      args.push(`-XMP:Title=${metadata.title}`);
      args.push(`-XMP:Description=${metadata.description}`);
      keywordsArray.forEach(kw => args.push(`-XMP:Subject+=${kw}`));
    }

    // Write to IPTC (widely supported by stock sites)
    if (opts.writeIptc) {
      args.push(`-IPTC:Headline=${metadata.title}`);
      args.push(`-IPTC:Caption-Abstract=${metadata.description}`);
      keywordsArray.forEach(kw => args.push(`-IPTC:Keywords+=${kw}`));
      args.push(`-IPTC:ObjectName=${metadata.title.substring(0, 64)}`);
    }

    // Write to EXIF
    if (opts.writeExif) {
      args.push(`-EXIF:ImageDescription=${metadata.title}`);
    }

    // Add the file path
    args.push(filePath);

    // Run ExifTool
    await runExifTool(args);

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
  let failedCount = 0;

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const fileName = filePath.split(/[/\\]/).pop() || filePath;

    onProgress?.({
      completed: i,
      failed: failedCount,
      total,
      currentFile: fileName,
      status: 'reading',
    });

    try {
      const metadata = await readMetadata(filePath);
      results.set(filePath, metadata);
    } catch (error) {
      console.error(`Failed to read ${filePath}:`, error);
      failedCount++;
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
    failed: failedCount,
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
      completed: successful.length,
      failed: failed.length,
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
    completed: successful.length,
    failed: failed.length,
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

