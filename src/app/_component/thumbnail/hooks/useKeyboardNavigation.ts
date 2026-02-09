import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationOptions {
  files: File[];
  selectedFile: File | null;
  onSelectFile: (file: File) => void;
  onIndexChange?: (index: number) => void;
  enabled?: boolean;
}

export const useKeyboardNavigation = ({
  files,
  selectedFile,
  onSelectFile,
  onIndexChange,
  enabled = true,
}: UseKeyboardNavigationOptions) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle arrow keys
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
      return;
    }

    // Don't navigate if no files
    if (!files || files.length === 0) {
      return;
    }

    // Prevent default browser scrolling
    e.preventDefault();

    // Find current index
    let currentIndex: number;
    if (selectedFile) {
      currentIndex = files.findIndex(f => f.name === selectedFile.name);
      if (currentIndex === -1) {
        // Selected file not in list, start from beginning
        currentIndex = 0;
      }
    } else {
      // No file selected, start from beginning
      currentIndex = 0;
    }

    let newIndex: number;

    if (e.key === 'ArrowLeft') {
      // Navigate to previous (with wrap-around)
      newIndex = currentIndex === 0 ? files.length - 1 : currentIndex - 1;
    } else {
      // Navigate to next (with wrap-around)
      newIndex = currentIndex === files.length - 1 ? 0 : currentIndex + 1;
    }

    const newFile = files[newIndex];
    
    console.log(`⌨️ Keyboard navigation: ${e.key} → index ${newIndex} (${newFile.name})`);
    
    // Update virtualization if callback provided
    if (onIndexChange) {
      onIndexChange(newIndex);
    }

    // Select the new file
    onSelectFile(newFile);
  }, [files, selectedFile, onSelectFile, onIndexChange]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Add global keydown listener
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
};
