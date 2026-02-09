import { useState, useCallback, useMemo, useRef } from 'react';
import { VIRTUALIZATION_CONFIG } from '../utils';

interface UseVirtualizationOptions {
  files: File[];
  selectedFile: File | null;
}

export const useVirtualization = ({ files, selectedFile }: UseVirtualizationOptions) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const throttledScrollRef = useRef<number | null>(null);

  // Handle scroll to update visible range (throttled)
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollLeft = container.scrollLeft;
    const containerWidth = container.clientWidth;

    const itemWidth = VIRTUALIZATION_CONFIG.ITEM_WIDTH;
    const buffer = VIRTUALIZATION_CONFIG.BUFFER_SIZE;

    const startIndex = Math.max(0, Math.floor(scrollLeft / itemWidth) - buffer);
    const visibleCount = Math.ceil(containerWidth / itemWidth);
    const endIndex = Math.min(
      (files?.length || 0) - 1,
      startIndex + visibleCount + buffer * 2
    );

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [files?.length]);

  // Throttled scroll handler
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (throttledScrollRef.current) return;

    throttledScrollRef.current = window.setTimeout(() => {
      handleScroll(e);
      throttledScrollRef.current = null;
    }, VIRTUALIZATION_CONFIG.SCROLL_THROTTLE);
  }, [handleScroll]);

  // Ensure selected file is in visible range
  const updateVisibleRangeForSelection = useCallback(() => {
    if (selectedFile && files) {
      const selectedIndex = files.indexOf(selectedFile);
      if (selectedIndex !== -1 && (selectedIndex < visibleRange.start || selectedIndex > visibleRange.end)) {
        const buffer = VIRTUALIZATION_CONFIG.BUFFER_SIZE;
        setVisibleRange({
          start: Math.max(0, selectedIndex - buffer),
          end: Math.min(files.length - 1, selectedIndex + buffer * 2)
        });
      }
    }
  }, [selectedFile, files, visibleRange.start, visibleRange.end]);

  // Get files to render (virtualized)
  const filesToRender = useMemo(() => {
    if (!files || files.length === 0) return [];

    // For small lists, render all
    if (files.length <= 100) {
      return files.map((file, index) => ({ file, index }));
    }

    // For large lists, only render visible + buffer
    const result: { file: File; index: number }[] = [];
    for (let i = visibleRange.start; i <= Math.min(visibleRange.end, files.length - 1); i++) {
      result.push({ file: files[i], index: i });
    }
    return result;
  }, [files, visibleRange.start, visibleRange.end]);

  // Calculate total width for proper scrolling
  const totalWidth = useMemo(() => {
    if (!files) return 0;
    return files.length * VIRTUALIZATION_CONFIG.ITEM_WIDTH;
  }, [files]);

  // Calculate left offset for virtualized items
  const leftOffset = useMemo(() => {
    if (!files || files.length <= 100) return 0;
    return visibleRange.start * VIRTUALIZATION_CONFIG.ITEM_WIDTH;
  }, [files, visibleRange.start]);

  return {
    filesToRender,
    totalWidth,
    leftOffset,
    onScroll,
    updateVisibleRangeForSelection,
    shouldVirtualize: files?.length > 100,
  };
};
