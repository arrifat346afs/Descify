import { useEffect, useRef, useMemo, useState, useCallback, memo } from "react";
import { useSettings } from "@/app/contexts/SettingsContext";
import { ScrollArea, ScrollBar } from "../../../components/ui/scroll-area";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MdOutlineImageNotSupported } from "react-icons/md";
import { Trash2, FileEdit, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomInstructionDialog } from "./CustomInstructionDialog";
import { generateMetadata } from "@/app/lib/ai";

// Configuration for virtualization
const VIRTUALIZATION_CONFIG = {
  // Show this many items on each side of visible area
  BUFFER_SIZE: 10,
  // Thumbnail width including margins (approx)
  ITEM_WIDTH: 200,
  // Throttle scroll events (ms)
  SCROLL_THROTTLE: 100,
};

type ThumbnailSectionProps = {
  onSelectFile: (file: File) => void;
};

// Memoized thumbnail item to prevent unnecessary re-renders
const ThumbnailItem = memo(({
  file,
  thumbnail,
  isGenerating,
  isSelected,
  hasMetadata,
  hasAttemptedGeneration,
  hasCustomInstruction,
  isRegenerating,
  onSelect,
  onRef,
  onDelete,
  onOpenCustomInstruction,
  onRegenerate,
}: {
  file: File;
  thumbnail: { thumbnailUrl: string } | undefined;
  isGenerating: boolean;
  isSelected: boolean;
  hasMetadata: boolean;
  hasAttemptedGeneration: boolean;
  hasCustomInstruction: boolean;
  isRegenerating: boolean;
  onSelect: () => void;
  onRef: (el: HTMLDivElement | null) => void;
  onDelete: () => void;
  onOpenCustomInstruction: () => void;
  onRegenerate: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  let borderClass = "";

  if (isSelected) {
    borderClass = "border-2 border-primary";
  } else if (hasMetadata) {
    borderClass = "border-1 border-green-500 dark:border-green-400";
  } else if (hasAttemptedGeneration) {
    borderClass = "border-1 border-destructive";
  } else {
    borderClass = "border-2 border-border";
  }

  return (
    <div
      ref={onRef}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`${borderClass} rounded-md shadow overflow-hidden cursor-pointer transition-all duration-200 w-[28vh] shrink-0 relative group`}
    >
      <AspectRatio ratio={12 / 9} className="hover:border-2 hover:border-primary">
        {thumbnail ? (
          <img
            src={thumbnail.thumbnailUrl}
            alt={file.name}
            className="w-full h-45 object-fill"
            loading="lazy"
          />
        ) : isGenerating ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-xs text-muted-foreground">Generating...</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <MdOutlineImageNotSupported className="text-4xl text-muted-foreground" />
          </div>
        )}
        <p className="absolute bottom-0 left-0 right-0 p-2 text-sm truncate text-center bg-black/50 text-foreground">
          {file.name}
        </p>

        {/* Custom instruction indicator badge */}
        {hasCustomInstruction && !isHovered && (
          <div className="absolute bottom-12 right-2 z-10">
            <Badge variant="secondary" className="text-xs shadow-lg">
              <FileEdit className="h-3 w-3 mr-1" />
              Custom
            </Badge>
          </div>
        )}
      </AspectRatio>

      {/* Action buttons - shown on hover */}
      {isHovered && (
        <>
          {/* Custom Instruction button */}
          <div className="absolute top-2 left-2 z-10">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent selecting the thumbnail
                onOpenCustomInstruction();
              }}
              className="shadow-lg"
              title="Add custom instruction"
            >
              <FileEdit className="h-4 w-4" />
            </Button>
          </div>

          {/* Regenerate button */}
          <div className="absolute bottom-2 right-2 z-10">
            <Button
              variant="default"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent selecting the thumbnail
                onRegenerate();
              }}
              className="shadow-lg"
              title="Regenerate metadata"
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Delete button */}
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation(); // Prevent selecting the thumbnail
                onDelete();
              }}
              className="shadow-lg"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
});
ThumbnailItem.displayName = 'ThumbnailItem';

const ThumbnailSection = ({ onSelectFile }: ThumbnailSectionProps) => {
  const {
    files,
    thumbnails: thumbsCtx,
    generated,
    hasAttemptedGeneration,
    selectedFile,
    removeFile,
    api,
    metadataLimits,
    metadataOptions,
    templateSettings,
  } = useSettings();
  const thumbnails = thumbsCtx.items;
  const thumbnailRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollTimeoutRef = useRef<number | null>(null);
  const lastScrolledFileRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Custom instruction dialog state
  const [customInstructionDialogOpen, setCustomInstructionDialogOpen] = useState(false);
  const [customInstructionFile, setCustomInstructionFile] = useState<File | null>(null);

  // Regenerating state - track which file is being regenerated
  const [regeneratingFile, setRegeneratingFile] = useState<File | null>(null);

  // Virtualization state
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });

  // Regenerate metadata handler
  const handleRegenerate = useCallback(async (file: File) => {
    const thumbnailItem = thumbnails.find(t => t.file === file);
    if (!thumbnailItem) {
      alert("Thumbnail not ready yet. Please wait.");
      return;
    }

    const model = api.selectedModel || undefined;
    const provider = api.selectedProvider || undefined;
    const apiKey = provider ? api.apiKeys[provider] : undefined;

    if (!apiKey) {
      alert('Please configure your API key in Settings');
      return;
    }

    // Get custom instruction for this file
    const customInstruction = generated.getCustomInstruction(file);

    // Get active custom template if one is selected
    const activeTemplate = templateSettings.activeTemplateId
      ? templateSettings.userTemplates.find(t => t.id === templateSettings.activeTemplateId)
      : null;
    const customTemplate = activeTemplate?.template;

    setRegeneratingFile(file);
    try {
      const result = await generateMetadata({
        file: file,
        fileNames: [file.name],
        provider,
        model,
        apiKey,
        limits: {
          titleLimit: metadataLimits.titleLimit,
          descriptionLimit: metadataLimits.descriptionLimit,
          keywordLimit: metadataLimits.keywordLimit,
        },
        includePlaceName: metadataOptions.includePlaceName,
        customTemplate: customTemplate,
        customInstruction: customInstruction,
      });

      generated.setMetadata(file, {
        title: result.title,
        description: result.description,
        keywords: result.keywords,
      });
    } catch (error) {
      console.error("Failed to generate metadata:", error);
      alert("Failed to generate metadata. Check console for details.");
    } finally {
      setRegeneratingFile(null);
    }
  }, [thumbnails, api, metadataLimits, metadataOptions, generated, templateSettings]);

  // Only log in development and throttle
  if (process.env.NODE_ENV === 'development' && files?.length !== undefined) {
    // Throttle logging to avoid console spam
    const logKey = `thumb_${files?.length}_${thumbnails?.length}`;
    const windowWithLog = window as unknown as { __lastThumbLog?: string };
    if (windowWithLog.__lastThumbLog !== logKey) {
      windowWithLog.__lastThumbLog = logKey;
      console.log(`ThumbnailSection - files: ${files?.length}, thumbnails: ${thumbnails?.length}`);
    }
  }

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
    if (generated.items) {
      generated.items.forEach(item => {
        // Only mark as having metadata if at least one field has content
        const hasContent = item.metadata.title || item.metadata.description || item.metadata.keywords;
        if (hasContent) {
          map.set(item.file, true);
        }
      });
    }
    return map;
  }, [generated.items]);

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
  const throttledScrollRef = useRef<number | null>(null);
  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (throttledScrollRef.current) return;

    throttledScrollRef.current = window.setTimeout(() => {
      handleScroll(e);
      throttledScrollRef.current = null;
    }, VIRTUALIZATION_CONFIG.SCROLL_THROTTLE);
  }, [handleScroll]);

  // Ensure selected file is in visible range
  useEffect(() => {
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

  return (
    <div className="w-full">
      {(!files || files.length === 0) && (
        <div className="p-2">
          <div className="h-[20vh] w-[17vw] border-2 rounded-md flex justify-center items-center text-7xl">
            <MdOutlineImageNotSupported />
          </div>
        </div>
      )}

      {files && files.length > 0 && (
        <ScrollArea className="p-2 w-full overflow-hidden">
          <div
            ref={scrollContainerRef}
            onScroll={files.length > 100 ? onScroll : undefined}
            className="flex space-x-4 px-2 py-2 pb-4"
            style={{
              width: files.length > 100 ? `${totalWidth}px` : 'max-content',
              paddingLeft: files.length > 100 ? `${leftOffset}px` : undefined,
            }}
          >
            {filesToRender.map(({ file, index }) => {
              const thumbnail = thumbnailMap.get(file);
              const isGenerating = !thumbnail && thumbsCtx.isGenerating;
              const hasMetadata = metadataMap.has(file);
              const isSelected = selectedFile === file;
              const hasCustomInstruction = !!generated.getCustomInstruction(file);
              const isRegenerating = regeneratingFile === file;

              return (
                <ThumbnailItem
                  key={`${file.name}-${index}`}
                  file={file}
                  thumbnail={thumbnail}
                  isGenerating={isGenerating}
                  isSelected={isSelected}
                  hasMetadata={hasMetadata}
                  hasAttemptedGeneration={hasAttemptedGeneration}
                  hasCustomInstruction={hasCustomInstruction}
                  isRegenerating={isRegenerating}
                  onSelect={() => onSelectFile(file)}
                  onDelete={() => removeFile(file)}
                  onOpenCustomInstruction={() => {
                    setCustomInstructionFile(file);
                    setCustomInstructionDialogOpen(true);
                  }}
                  onRegenerate={() => handleRegenerate(file)}
                  onRef={(el) => {
                    if (el) {
                      thumbnailRefs.current.set(file.name, el);
                    } else {
                      thumbnailRefs.current.delete(file.name);
                    }
                  }}
                />
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Progress indicator for large batches */}
      {files && files.length > 50 && thumbsCtx.isGenerating && (
        <div className="absolute bottom-2 right-2 bg-gray-800/90 text-white text-xs px-3 py-1 rounded-full">
          Generating thumbnails: {thumbnails.length}/{files.length}
        </div>
      )}

      {/* Custom Instruction Dialog */}
      <CustomInstructionDialog
        file={customInstructionFile}
        isOpen={customInstructionDialogOpen}
        onClose={() => {
          setCustomInstructionDialogOpen(false);
          setCustomInstructionFile(null);
        }}
      />
    </div>
  );
};

export default ThumbnailSection;
