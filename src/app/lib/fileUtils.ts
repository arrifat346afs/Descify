/**
 * File Utilities Module
 * Provides utilities for file handling in Tauri environment
 */

import { open } from '@tauri-apps/plugin-dialog';
import { readFile, stat } from '@tauri-apps/plugin-fs';

// Extended File type with path information
export interface FileWithPath {
  file: File;
  filePath: string;
}

/**
 * Open a file dialog and get files with their paths
 * This uses Tauri's dialog plugin to get actual file paths
 */
export async function selectFilesWithPaths(): Promise<FileWithPath[]> {
  try {
    const selectedPaths = await open({
      multiple: true,
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp'],
        },
        {
          name: 'Videos',
          extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi'],
        },
        {
          name: 'All Media',
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp', 'mp4', 'mov', 'webm', 'mkv', 'avi'],
        },
      ],
    });

    if (!selectedPaths) {
      return [];
    }

    // Handle both single and multiple file selection
    const paths = Array.isArray(selectedPaths) ? selectedPaths : [selectedPaths];

    // Convert paths to FileWithPath objects
    const filesWithPaths: FileWithPath[] = [];

    for (const filePath of paths) {
      try {
        // Read file content
        const fileContent = await readFile(filePath);
        const fileStat = await stat(filePath);
        
        // Get filename from path
        const fileName = filePath.split(/[/\\]/).pop() || 'unknown';
        
        // Determine MIME type from extension
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const mimeType = getMimeType(ext);
        
        // Create a File object from the content
        const blob = new Blob([fileContent], { type: mimeType });
        const file = new File([blob], fileName, {
          type: mimeType,
          lastModified: fileStat.mtime ? new Date(fileStat.mtime).getTime() : Date.now(),
        });

        filesWithPaths.push({
          file,
          filePath,
        });
      } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
      }
    }

    return filesWithPaths;
  } catch (error) {
    console.error('Failed to open file dialog:', error);
    return [];
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'tiff': 'image/tiff',
    'bmp': 'image/bmp',
    // Videos
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    'avi': 'video/x-msvideo',
  };

  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if a file path is a valid media file
 */
export function isMediaFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const mediaExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp',
    'mp4', 'mov', 'webm', 'mkv', 'avi',
  ];
  return mediaExtensions.includes(ext);
}

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  return filePath.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if file is an image
 */
export function isImageFile(filePath: string): boolean {
  const ext = getFileExtension(filePath);
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff', 'bmp'];
  return imageExtensions.includes(ext);
}

