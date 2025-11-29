import { useEffect, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, RefreshCw } from "lucide-react";

export function UpdateChecker() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkForUpdates = async () => {
    setError(null);
    try {
      const updateResult = await check();
      if (updateResult) {
        setUpdate(updateResult);
        setShowDialog(true);
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      setError(err instanceof Error ? err.message : "Failed to check for updates");
    }
  };

  // Check for updates on app start
  useEffect(() => {
    checkForUpdates();
  }, []);

  const handleDownloadAndInstall = async () => {
    if (!update) return;

    setIsDownloading(true);
    setError(null);

    try {
      let downloaded = 0;
      let contentLength = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength || 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            if (contentLength > 0) {
              setDownloadProgress(Math.round((downloaded / contentLength) * 100));
            }
            break;
          case "Finished":
            setDownloadProgress(100);
            break;
        }
      });

      // Relaunch the app after update
      await relaunch();
    } catch (err) {
      console.error("Failed to download/install update:", err);
      setError(err instanceof Error ? err.message : "Failed to install update");
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    if (!isDownloading) {
      setShowDialog(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={handleClose}>
      <DialogContent showCloseButton={!isDownloading}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Update Available
          </DialogTitle>
          <DialogDescription>
            {update && (
              <>
                A new version <strong>{update.version}</strong> is available.
                {update.body && (
                  <div className="mt-2 max-h-32 overflow-y-auto text-left text-xs bg-muted p-2 rounded">
                    {update.body}
                  </div>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isDownloading && (
          <div className="space-y-2">
            <Progress value={downloadProgress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              Downloading... {downloadProgress}%
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <DialogFooter>
          {!isDownloading && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Later
              </Button>
              <Button onClick={handleDownloadAndInstall}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Now
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

