/**
 * BulkWriteButton Component
 * Writes metadata to all files that have generated metadata
 */

import { Button } from "@/components/ui/button";
import { useSettings } from "@/app/contexts/SettingsContext";
import { useMetadataSync } from "@/app/lib/metadata/useMetadataSync";
import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export function BulkWriteButton() {
  const { files, generated, embedded } = useSettings();
  const { writeBulk } = useMetadataSync();
  const [isWriting, setIsWriting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Get files that have both metadata and file paths
  const getWritableFiles = () => {
    return files.filter((file) => {
      const metadata = generated.getMetadata(file);
      const embeddedState = embedded.getEmbedded(file);
      return metadata && embeddedState?.filePath;
    });
  };

  const writableFiles = getWritableFiles();
  const hasWritableFiles = writableFiles.length > 0;

  const handleBulkWrite = async () => {
    if (!hasWritableFiles) return;

    setIsWriting(true);
    setProgress(0);

    try {
      const items = writableFiles.map((file) => ({
        file,
        filePath: embedded.getEmbedded(file)!.filePath!,
        metadata: generated.getMetadata(file)!,
      }));

      await writeBulk(items, {}, (progressInfo) => {
        const percent = Math.round(
          ((progressInfo.completed + progressInfo.failed) / progressInfo.total) * 100
        );
        setProgress(percent);
      });

      setDialogOpen(false);
    } catch (error) {
      console.error("Bulk write failed:", error);
    } finally {
      setIsWriting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          disabled={!hasWritableFiles}
          title={hasWritableFiles ? `Write metadata to ${writableFiles.length} files` : "No files ready to write"}
        >
          <Save className="h-4 w-4 mr-1" />
          Write All
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Write Metadata to Files</DialogTitle>
          <DialogDescription>
            This will embed the generated metadata into {writableFiles.length} image file(s).
            The original files will be modified.
          </DialogDescription>
        </DialogHeader>

        {isWriting && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground text-center">
              Writing metadata... {progress}%
            </p>
          </div>
        )}

        <div className="max-h-48 overflow-y-auto">
          <ul className="text-sm space-y-1">
            {writableFiles.map((file, index) => (
              <li key={index} className="truncate text-muted-foreground">
                • {file.name}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isWriting}>
            Cancel
          </Button>
          <Button onClick={handleBulkWrite} disabled={isWriting}>
            {isWriting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Writing...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Write to {writableFiles.length} Files
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

