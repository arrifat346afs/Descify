import { useEffect, useRef } from 'react';
import scrollIntoView from 'smooth-scroll-into-view-if-needed';

interface UseKeyboardAutoScrollOptions {
  selectedFile: File | null;
  thumbnailRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

export const useKeyboardAutoScroll = ({
  selectedFile,
  thumbnailRefs,
}: UseKeyboardAutoScrollOptions) => {
  const lastScrolledFileRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedFile) {
      const fileName = selectedFile.name;
      
      // Skip if we just scrolled to this file
      if (lastScrolledFileRef.current === fileName) {
        return;
      }

      const thumbnailElement = thumbnailRefs.current.get(fileName);

      if (thumbnailElement) {
        console.log("⌨️ Keyboard auto-scrolling to:", fileName);
        
        // Use smooth-scroll-into-view-if-needed with center alignment
        scrollIntoView(thumbnailElement, {
          behavior: 'smooth',
          block: 'nearest', // Only scroll horizontally
          inline: 'center',  // Center horizontally
          scrollMode: 'if-needed', // Only scroll if not already visible
        });

        lastScrolledFileRef.current = fileName;
        
        // Reset after delay to allow future scrolls
        setTimeout(() => {
          lastScrolledFileRef.current = null;
        }, 100);
      }
    }
  }, [selectedFile, thumbnailRefs]);
};