/**
 * useMetadataSync Hook
 * Provides metadata reading, writing, and sync functionality
 */

import { useCallback } from 'react';
import { useSettings } from '@/app/contexts/SettingsContext';
import { readMetadata, writeMetadata, writeMetadataBulk, closeExifTool } from './metadataService';
import type { ImageMetadata, WriteMetadataOptions, BulkOperationProgress } from './types';
import { toast } from 'sonner';

export function useMetadataSync() {
  const { embedded, generated, selectedFile } = useSettings();

  /**
   * Read embedded metadata from a file and update state
   */
  const readFromFile = useCallback(async (file: File, filePath: string) => {
    try {
      embedded.setSyncStatus(file, 'reading');
      embedded.setFilePath(file, filePath);
      
      const metadata = await readMetadata(filePath);
      embedded.setEmbeddedMetadata(file, metadata);
      
      // Also populate the generated metadata if empty
      const existingGenerated = generated.getMetadata(file);
      if (!existingGenerated?.title && !existingGenerated?.description && !existingGenerated?.keywords) {
        if (metadata.title || metadata.description || metadata.keywords) {
          generated.setMetadata(file, {
            title: metadata.title,
            description: metadata.description,
            keywords: metadata.keywords,
          });
          toast.success(`Loaded existing metadata from ${file.name}`);
        }
      }
      
      return metadata;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      embedded.setSyncStatus(file, 'error', errorMessage);
      console.error(`Failed to read metadata from ${file.name}:`, error);
      throw error;
    }
  }, [embedded, generated]);

  /**
   * Write metadata to a file
   */
  const writeToFile = useCallback(async (
    file: File,
    metadata: ImageMetadata,
    options?: WriteMetadataOptions
  ) => {
    const embeddedState = embedded.getEmbedded(file);
    const filePath = embeddedState?.filePath;
    
    if (!filePath) {
      embedded.setSyncStatus(file, 'no-file-path');
      throw new Error('File path not available for writing');
    }

    try {
      embedded.setSyncStatus(file, 'writing');
      
      const result = await writeMetadata(filePath, metadata, options);
      
      if (result.success) {
        embedded.setSyncStatus(file, 'synced');
        toast.success(`Metadata written to ${file.name}`);
        return result;
      } else {
        embedded.setSyncStatus(file, 'error', result.error);
        throw new Error(result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      embedded.setSyncStatus(file, 'error', errorMessage);
      console.error(`Failed to write metadata to ${file.name}:`, error);
      throw error;
    }
  }, [embedded]);

  /**
   * Sync current UI metadata to file (for the selected file)
   */
  const syncSelectedFile = useCallback(async () => {
    if (!selectedFile) {
      toast.error('No file selected');
      return;
    }

    const metadata = generated.getMetadata(selectedFile);
    if (!metadata) {
      toast.error('No metadata to sync');
      return;
    }

    await writeToFile(selectedFile, metadata);
  }, [selectedFile, generated, writeToFile]);

  /**
   * Write metadata to multiple files in bulk
   */
  const writeBulk = useCallback(async (
    items: Array<{ file: File; filePath: string; metadata: ImageMetadata }>,
    options?: WriteMetadataOptions,
    onProgress?: (progress: BulkOperationProgress) => void
  ) => {
    // Update sync status for all files
    items.forEach(({ file }) => embedded.setSyncStatus(file, 'writing'));

    const bulkItems = items.map(({ filePath, metadata }) => ({ filePath, metadata }));
    
    const result = await writeMetadataBulk(bulkItems, options, onProgress);

    // Update sync status based on results
    result.successful.forEach((res) => {
      const item = items.find((i) => i.filePath === res.filePath);
      if (item) embedded.setSyncStatus(item.file, 'synced');
    });

    result.failed.forEach((res) => {
      const item = items.find((i) => i.filePath === res.filePath);
      if (item) embedded.setSyncStatus(item.file, 'error', res.error);
    });

    if (result.failed.length === 0) {
      toast.success(`Successfully wrote metadata to ${result.successful.length} files`);
    } else {
      toast.error(`Failed to write metadata to ${result.failed.length} files`);
    }

    return result;
  }, [embedded]);

  /**
   * Mark a file as needing sync (unsynced)
   */
  const markUnsyncedFile = useCallback((file: File) => {
    embedded.setSyncStatus(file, 'unsynced');
  }, [embedded]);

  /**
   * Cleanup ExifTool on unmount
   */
  const cleanup = useCallback(async () => {
    await closeExifTool();
  }, []);

  return {
    readFromFile,
    writeToFile,
    syncSelectedFile,
    writeBulk,
    markUnsyncedFile,
    cleanup,
    autoSyncEnabled: embedded.autoSyncEnabled,
    setAutoSyncEnabled: embedded.setAutoSyncEnabled,
  };
}

