import { useEffect, useRef, useMemo } from "react";
import { useSettings } from "@/app/contexts/SettingsContext";
import { ScrollArea, ScrollBar } from "../../../components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
// import { NoSuchToolError } from "ai";
import { MdOutlineImageNotSupported } from "react-icons/md";
// import { Card } from "@/components/ui/card";
type ThumbnailSectionProps = {
  onSelectFile: (file: File) => void;
};

const ThumbnailSection = ({ onSelectFile }: ThumbnailSectionProps) => {
  const {
    files,
    thumbnails: thumbsCtx,
    generated,
    hasAttemptedGeneration,
    selectedFile,
  } = useSettings();
  const thumbnails = thumbsCtx.items;
  const thumbnailRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollTimeoutRef = useRef<number | null>(null);
  const lastScrolledFileRef = useRef<string | null>(null);

  console.log(
    "ThumbnailSection render - files:",
    files?.length,
    "thumbnails:",
    thumbnails?.length
  );

  // Auto-scroll to selected thumbnail (debounced to prevent excessive scrolling)
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (selectedFile) {
      const fileName = selectedFile.name;

      // Skip if we just scrolled to this file
      if (lastScrolledFileRef.current === fileName) {
        return;
      }

      const thumbnailElement = thumbnailRefs.current.get(fileName);

      if (thumbnailElement) {
        // Clear any pending scroll
        if (scrollTimeoutRef.current) {
          cancelAnimationFrame(scrollTimeoutRef.current);
        }

        console.log("📜 Auto-scrolling to:", fileName);

        // Use requestAnimationFrame to batch scroll operations
        scrollTimeoutRef.current = requestAnimationFrame(() => {
          const container = thumbnailElement.closest('[data-slot="scroll-area-viewport"]') as HTMLElement;

          if (container) {
            const containerRect = container.getBoundingClientRect();
            const elementRect = thumbnailElement.getBoundingClientRect();

            const currentScrollLeft = container.scrollLeft;
            // Calculate target to center the element
            // offset = distance from container left to element left
            // We want this distance to be (containerWidth / 2) - (elementWidth / 2)
            const offset = elementRect.left - containerRect.left;
            const targetOffset = (containerRect.width / 2) - (elementRect.width / 2);
            const scrollChange = offset - targetOffset;
            const targetScrollLeft = currentScrollLeft + scrollChange;

            const start = currentScrollLeft;
            const change = targetScrollLeft - start;
            const duration = 800; // ms
            const startTime = performance.now();

            if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
            }

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
          }, 1000);
        });
      }
    }

    return () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [selectedFile]);



  // Create lookup maps for O(1) access
  const thumbnailMap = useMemo(() => {
    const map = new Map();
    thumbnails.forEach(t => map.set(t.file, t));
    return map;
  }, [thumbnails]);

  const metadataMap = useMemo(() => {
    const map = new Map();
    // We need to access generated.items directly or create a map from it
    // Since generated.getMetadata is a function, we can't easily map it without access to the underlying array
    // But we can use the generated.items array if available, or we can optimize by memoizing the result for each file if the list is stable
    // However, generated.items is available in the context
    if (generated.items) {
      generated.items.forEach(item => map.set(item.file, true));
    }
    return map;
  }, [generated.items]);

  return (
    <div className="w-full ">
      {(!files || files.length === 0) && (
        <div className="p-2">
          <div className="h-[20vh] w-[17vw] border-2 rounded-md flex justify-center items-center text-7xl ">
            <MdOutlineImageNotSupported />
          </div>
        </div>
      )}

      {files && files.length > 0 && (
        <ScrollArea className="p-2 w-full overflow-hidden">
          <div className="flex space-x-4 px-2 py-2 w-max pb-4">
            {files.map((file, index) => {
              const thumbnail = thumbnailMap.get(file);
              const isGenerating = !thumbnail && thumbsCtx.isGenerating;

              // Check if this file has generated metadata
              // Use the optimized map lookup instead of calling getMetadata which might do a find()
              const hasMetadata = metadataMap.has(file);

              // Check if this file is currently selected
              const isSelected = selectedFile === file;

              // Border styling based on selection and metadata status
              // Selected state: thick blue border with ring effect
              // Metadata status: thin colored border (green/red/gray)
              let borderClass = "";
              let ringClass = "";

              if (isSelected) {
                // Selected: thick blue border with ring
                borderClass = "border-2 border-blue-500";
                // ringClass = "ring-2 ring-blue-300 ring-offset-2";
              } else if (hasMetadata) {
                // Has metadata: thin green border
                borderClass = "border-1 border-green-500";
              } else if (hasAttemptedGeneration) {
                // Missing metadata after generation attempt: thin red border
                borderClass = "border-1 border-red-500";
              } else {
                // Default: thin gray border
                borderClass = "border-2";
              }

              return (
                <div
                  key={index}
                  ref={(el) => {
                    if (el) {
                      thumbnailRefs.current.set(file.name, el);
                    } else {
                      thumbnailRefs.current.delete(file.name);
                    }
                  }}
                  onClick={() => onSelectFile(file)}
                  className={`${borderClass} ${ringClass} rounded-md shadow overflow-hidden cursor-pointer transition-all duration-200 w-[28vh] shrink-0`}
                >
                  <AspectRatio ratio={12 / 9} className="hover:border-2 hover:border-blue-500">
                    {thumbnail ? (
                      <img
                        src={thumbnail.thumbnailUrl}
                        alt={file.name}
                        className="w-full h-45 object-fill"
                      />
                    ) : isGenerating ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          <p className="text-xs text-gray-400">Generating...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800">
                        <MdOutlineImageNotSupported className="text-4xl text-gray-500" />
                      </div>
                    )}
                    <p className="absolute bottom-0 left-0 right-0 p-2 text-sm truncate text-center text-gray-300">
                      {file.name}
                    </p>
                  </AspectRatio>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  );
};

export default ThumbnailSection;
