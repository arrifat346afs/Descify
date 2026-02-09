import { useEffect, useRef } from 'react';

interface UseAutoScrollOptions {
  selectedFile: File | null;
  autoSelectEnabled: boolean;
  thumbnailRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

export const useAutoScroll = ({
  selectedFile,
  autoSelectEnabled,
  thumbnailRefs,
}: UseAutoScrollOptions) => {
  const lastScrolledFileRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scrollDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only auto-scroll if auto-select is enabled (for AI generation)
    if (!autoSelectEnabled) {
      return;
    }

    if (selectedFile) {
      const fileName = selectedFile.name;

      // Skip if we just scrolled to this file
      if (lastScrolledFileRef.current === fileName) {
        return;
      }

      const thumbnailElement = thumbnailRefs.current.get(fileName);

      if (thumbnailElement) {
        // Clear any pending scroll operations
        if (scrollDebounceRef.current) {
          clearTimeout(scrollDebounceRef.current);
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        console.log("📜 Auto-scrolling to:", fileName);

        // Debounce scroll operation to avoid excessive layout calculations
        scrollDebounceRef.current = setTimeout(() => {
          const container = thumbnailElement.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;

          if (container) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = thumbnailElement.getBoundingClientRect();

            const currentScrollLeft = container.scrollLeft;
            // Calculate target to center the element
            const offset = elementRect.left - containerRect.left;
            const targetOffset = (containerRect.width / 2) - (elementRect.width / 2);
            const scrollChange = offset - targetOffset;
            let targetScrollLeft = currentScrollLeft + scrollChange;

            // Ensure we don't scroll past the left boundary (minimum scroll position is 0)
            const maxScrollLeft = container.scrollWidth - container.clientWidth;
            targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScrollLeft));

            const start = currentScrollLeft;
            const change = targetScrollLeft - start;

            // Reduce animation duration for snappier feel
            const duration = 300;
            const startTime = performance.now();

            const animate = (currentTime: number) => {
              const elapsed = currentTime - startTime;
              if (elapsed < duration) {
                const t = elapsed / duration;
                // Ease out cubic for smooth deceleration
                const ease = 1 - Math.pow(1 - t, 3);
                container.scrollLeft = start + change * ease;
                animationFrameRef.current = requestAnimationFrame(animate);
              } else {
                container.scrollLeft = targetScrollLeft;
                animationFrameRef.current = null;
              }
            };

            animationFrameRef.current = requestAnimationFrame(animate);
          } else {
            // Fallback if container not found
            thumbnailElement.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "center",
            });
          }

          lastScrolledFileRef.current = fileName;

          // Reset after a delay to allow future scrolls
          setTimeout(() => {
            lastScrolledFileRef.current = null;
          }, 500);
        }, 50);
      }
    }

    return () => {
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedFile, autoSelectEnabled, thumbnailRefs]);
};
