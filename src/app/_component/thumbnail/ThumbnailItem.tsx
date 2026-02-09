import { useState, memo } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { MdOutlineImageNotSupported } from "react-icons/md";
import { Trash2, FileEdit, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ThumbnailInfo {
  thumbnailUrl: string;
}

interface ThumbnailItemProps {
  file: File;
  thumbnail: ThumbnailInfo | undefined;
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
}

// Memoized thumbnail item to prevent unnecessary re-renders
export const ThumbnailItem = memo(({
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
}: ThumbnailItemProps) => {
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
      className={`${borderClass} hover:border-2 hover:border-primary rounded-md overflow-hidden cursor-pointer transition-all duration-200 w-[28vh] shrink-0 relative group`}
    >
      <AspectRatio ratio={12 / 9}>
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
        <p className="absolute bottom-0 left-0 right-0 p-1 text-sm truncate text-center bg-black/50 text-foreground">
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
          {/* Left side buttons container */}
          <div className="absolute top-2 left-2 z-10 flex gap-2">
            {/* Custom Instruction button */}
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCustomInstruction();
              }}
              className="shadow-lg"
              title="Add custom instruction"
            >
              <FileEdit className="h-4 w-4" />
            </Button>

            {/* Regenerate button */}
            <Button
              variant="default"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
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
                e.stopPropagation();
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
}, (prevProps, nextProps) => {
  // Custom comparison for memo to prevent unnecessary re-renders
  return (
    prevProps.file === nextProps.file &&
    prevProps.thumbnail === nextProps.thumbnail &&
    prevProps.isGenerating === nextProps.isGenerating &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.hasMetadata === nextProps.hasMetadata &&
    prevProps.hasAttemptedGeneration === nextProps.hasAttemptedGeneration &&
    prevProps.hasCustomInstruction === nextProps.hasCustomInstruction &&
    prevProps.isRegenerating === nextProps.isRegenerating
  );
});

ThumbnailItem.displayName = 'ThumbnailItem';
