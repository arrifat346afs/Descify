import { useEffect, useRef } from "react";
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

  console.log(
    "ThumbnailSection render - files:",
    files?.length,
    "thumbnails:",
    thumbnails?.length
  );

  // Auto-scroll to selected thumbnail
  useEffect(() => {
    if (selectedFile) {
      const fileName = selectedFile.name;
      const thumbnailElement = thumbnailRefs.current.get(fileName);

      if (thumbnailElement) {
        console.log("📜 Auto-scrolling to:", fileName);
        thumbnailElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [selectedFile]);

  // Generate thumbnails when files change
  useEffect(() => {
    console.log("📁 Files changed:", files?.length, "files");
    console.log("🖼️  Current thumbnails in context:", thumbsCtx.items.length);

    if (!files || files.length === 0) {
      thumbsCtx.setIsGenerating(false);
      return;
    }

    // Count how many thumbnails need to be generated
    const filesToGenerate = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const alreadyHasThumbnail = thumbnails.find((t) => t.file === file);
      return (isImage || isVideo) && !alreadyHasThumbnail;
    });

    if (filesToGenerate.length === 0) {
      thumbsCtx.setIsGenerating(false);
      return;
    }

    // Set generating state
    thumbsCtx.setIsGenerating(true);
    console.log(
      `🚀 Starting generation of ${filesToGenerate.length} thumbnails...`
    );

    // Generate thumbnails in parallel using batch processing
    // This runs asynchronously and doesn't block the UI
    (async () => {
      try {
        const { generateThumbnailsBatch } = await import("@/app/lib/thumbnailGenerator");

        const results = await generateThumbnailsBatch(
          filesToGenerate,
          (completed, total, fileName) => {
            console.log(`⚡ Progress: ${completed}/${total} - ${fileName}`);
          },
          (file, thumbnailUrl) => {
            // Update UI immediately as each thumbnail is ready
            thumbsCtx.upsert({ file, thumbnailUrl });
            console.log(`✨ Thumbnail ready: ${file.name}`);
          },
          4 // Process 4 thumbnails concurrently to avoid freezing
        );

        thumbsCtx.setIsGenerating(false);
        console.log(`✅ Completed ${results.size} thumbnails`);
      } catch (error) {
        console.error("❌ Batch thumbnail generation failed:", error);
        thumbsCtx.setIsGenerating(false);
      }
    })();
  }, [files]); // Only depend on files, not thumbnails to avoid infinite loop

  // Check if all thumbnails are done
  useEffect(() => {
    if (thumbsCtx.isGenerating && files && files.length > 0) {
      const allDone = files.every((file) => {
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        if (!isImage && !isVideo) return true; // Skip non-media files
        return thumbnails.find((t) => t.file === file) !== undefined;
      });

      if (allDone) {
        console.log("✅ All thumbnails generated!");
        thumbsCtx.setIsGenerating(false);
      }
    }
  }, [thumbnails, files, thumbsCtx.isGenerating]);

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
              const thumbnail = thumbnails.find((t) => t.file === file);
              const isGenerating = !thumbnail && thumbsCtx.isGenerating;

              // Check if this file has generated metadata
              const hasMetadata = generated.getMetadata(file) !== undefined;

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
                  className={`${borderClass} ${ringClass} rounded-md shadow overflow-hidden cursor-pointer hover:scale-105 transition-all duration-200 w-[28vh] shrink-0`}
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
          <ScrollBar orientation="horizontal"/>
        </ScrollArea>
      )}
    </div>
  );
};

export default ThumbnailSection;
