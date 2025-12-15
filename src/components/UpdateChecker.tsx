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
import { Download, RefreshCw, AlertCircle } from "lucide-react";

type DownloadEvent = {
  event: "Started" | "Progress" | "Finished";
  progress?: number;
};

export function UpdateChecker() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Checking for updates...");

  const checkForUpdates = async () => {
    setError(null);
    setStatus("Checking for updates...");
    try {
      console.log("Checking for updates...");
      const updateResult = await check();
      if (updateResult) {
        console.log("Update found:", updateResult.version);
        setStatus("Update available!");
        setUpdate(updateResult);
        setShowDialog(true);
      } else {
        console.log("No updates available");
        setStatus("No updates available");
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to check for updates";
      setError(errorMessage);
      setStatus("Error checking for updates");
      setShowDialog(true);
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
    setStatus("Preparing download...");
    console.log("Starting download and install for version:", update.version);

    try {
      setStatus("Downloading update...");
      await update.downloadAndInstall((event: DownloadEvent) => {
        console.log("Update event:", event);
        switch (event.event) {
          case "Started":
            setStatus("Downloading update...");
            break;
          case "Progress":
            // Use the progress from the event if available, otherwise estimate
            if (event.progress !== undefined) {
              setDownloadProgress(event.progress);
              setStatus(`Downloading update... ${event.progress}%`);
            }
            break;
          case "Finished":
            setDownloadProgress(100);
            console.log("Download finished");
            setStatus("Installing update...");
            break;
        }
      });

      console.log("Update installation completed successfully, attempting to relaunch...");
      setStatus("Restarting application...");
      // Relaunch the app after update
      await relaunch();
    } catch (err) {
      console.error("Failed to download/install update:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to install update";
      setError(errorMessage);
      setIsDownloading(false);
      setStatus("Update failed");
      
      // Provide more specific error messages based on common issues
      if (errorMessage.includes("permission") || errorMessage.includes("Permission")) {
        setError("Permission denied. Please try running the application as administrator or check your file permissions.");
      } else if (errorMessage.includes("network") || errorMessage.includes("Network")) {
        setError("Network error. Please check your internet connection and try again.");
      } else if (errorMessage.includes("not found") || errorMessage.includes("Not found")) {
        setError("Update file not found. Please try again later or contact support.");
      } else if (errorMessage.includes("signature") || errorMessage.includes("Signature")) {
        setError("Update signature verification failed. The update may be corrupted.");
      } else if (errorMessage.includes("install") || errorMessage.includes("Install")) {
        setError("Failed to install the update. The application may be in use. Please close any instances and try again.");
      } else if (errorMessage.includes("locked") || errorMessage.includes("in use")) {
        setError("The application is in use. Please close all instances and try again.");
      } else if (errorMessage.includes("disk") || errorMessage.includes("Disk")) {
        setError("Disk space error. Please ensure you have enough disk space for the update.");
      } else {
        setError(errorMessage);
      }
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
            {error ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            {error ? "Update Error" : "Update Available"}
          </DialogTitle>
          <DialogDescription>
            {update && !error && (
              <>
                A new version <strong>{update.version}</strong> is available.
                {update.body && (
                  <div className="mt-2 max-h-32 overflow-y-auto text-left text-xs bg-muted p-2 rounded">
                    {update.body}
                  </div>
                )}
              </>
            )}
            {error && (
              <div className="text-destructive">
                {error}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isDownloading && (
            <div className="space-y-2">
              <Progress value={downloadProgress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                {status}
              </p>
            </div>
          )}
          
          {error && (
            <div className="space-y-2">
              <p className="text-sm text-center text-destructive">
                {error}
              </p>
              <p className="text-xs text-center text-muted-foreground">
                Please check your internet connection and try again. If the problem persists, please contact support.
              </p>
            </div>
          )}
        </div>

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
