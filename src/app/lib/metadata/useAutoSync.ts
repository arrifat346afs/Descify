/**
 * useAutoSync Hook
 * Automatically syncs metadata to files when changes are detected
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSettings } from '@/app/contexts/SettingsContext';
import { writeMetadata } from './metadataService';
import type { ImageMetadata } from './types';
import { toast } from 'sonner';

// Debounce delay in milliseconds
const AUTO_SYNC_DEBOUNCE_MS = 2000;

export function useAutoSync() {
  const { embedded, generated, selectedFile } = useSettings();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedMetadataRef = useRef<Map<File, string>>(new Map());

  /**
   * Perform auto-sync for a file
   */
  const performAutoSync = useCallback(async (file: File, metadata: ImageMetadata) => {
    const embeddedState = embedded.getEmbedded(file);
    const filePath = embeddedState?.filePath;

    if (!filePath) {
      console.log(`Auto-sync skipped for ${file.name}: no file path`);
      return;
    }

    // Check if metadata has actually changed
    const metadataHash = JSON.stringify(metadata);
    const lastHash = lastSyncedMetadataRef.current.get(file);
    
    if (lastHash === metadataHash) {
      console.log(`Auto-sync skipped for ${file.name}: no changes`);
      return;
    }

    try {
      embedded.setSyncStatus(file, 'writing');
      
      const result = await writeMetadata(filePath, metadata);
      
      if (result.success) {
        embedded.setSyncStatus(file, 'synced');
        lastSyncedMetadataRef.current.set(file, metadataHash);
        toast.success(`Auto-synced metadata to ${file.name}`, { duration: 2000 });
      } else {
        embedded.setSyncStatus(file, 'error', result.error);
        console.error(`Auto-sync failed for ${file.name}:`, result.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      embedded.setSyncStatus(file, 'error', errorMessage);
      console.error(`Auto-sync error for ${file.name}:`, error);
    }
  }, [embedded]);

  /**
   * Schedule auto-sync with debouncing
   */
  const scheduleAutoSync = useCallback((file: File, metadata: ImageMetadata) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Mark as unsynced immediately
    embedded.setSyncStatus(file, 'unsynced');

    // Schedule sync after debounce delay
    debounceTimerRef.current = setTimeout(() => {
      performAutoSync(file, metadata);
    }, AUTO_SYNC_DEBOUNCE_MS);
  }, [embedded, performAutoSync]);

  // Watch for metadata changes on the selected file when auto-sync is enabled
  useEffect(() => {
    if (!embedded.autoSyncEnabled || !selectedFile) {
      return;
    }

    const metadata = generated.getMetadata(selectedFile);
    if (!metadata) {
      return;
    }

    // Check if we have a file path
    const embeddedState = embedded.getEmbedded(selectedFile);
    if (!embeddedState?.filePath) {
      return;
    }

    // Schedule auto-sync
    scheduleAutoSync(selectedFile, metadata);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [
    embedded.autoSyncEnabled,
    selectedFile,
    // We need to watch for metadata changes
    // Using generated.getMetadata in the effect body handles this
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    scheduleAutoSync,
    performAutoSync,
  };
}

