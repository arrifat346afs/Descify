import { useEffect, useState } from "react";
import { check, Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { platform } from "@tauri-apps/plugin-os";
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

type Status =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "error";

export function UpdateChecker() {
  const [open, setOpen] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [osInfo, setOsInfo] = useState<{
    platform: string;
    fileType: string;
    osName: string;
  } | null>(null);

  // check on app start
  useEffect(() => {
    detectOS();
    checkForUpdates();
  }, []);

  const detectOS = async () => {
    try {
      const platformType = await platform();
      
      let fileType = "";
      let osName = "";
      
      switch (platformType) {
        case "linux":
          // Check which package format based on common patterns
          osName = "Linux";
          fileType = ".deb / .rpm / .AppImage";
          break;
        case "windows":
          osName = "Windows";
          fileType = ".exe / .msi";
          break;
        case "macos":
          osName = "macOS";
          fileType = ".dmg / .app";
          break;
        default:
          osName = platformType;
          fileType = "Unknown";
      }
      
      setOsInfo({ platform: platformType, fileType, osName });
    } catch (err) {
      console.error("Failed to detect OS:", err);
    }
  };

  const checkForUpdates = async () => {
    try {
      setStatus("checking");
      const result = await check();
      if (result) {
        setUpdate(result);
        setStatus("available");
        setOpen(true);
        console.log("Update result:", result);
      } else {
        setStatus("idle");
      }
    } catch (err) {
      setError(String(err));
      setStatus("error");
      setOpen(true);
    }
  };

  const updateNow = async () => {
    if (!update) return;

    let downloaded = 0;
    let contentLength: number | undefined;

    try {
      setStatus("downloading");
      setProgress(0);

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            contentLength = event.data.contentLength;
            break;

          case "Progress":
            downloaded += event.data.chunkLength;

            if (contentLength && contentLength > 0) {
              const percent = Math.round((downloaded / contentLength) * 100);
              setProgress(percent);
            }
            break;

          case "Finished":
            setProgress(100);
            setStatus("installing");
            break;
        }
      });

      await relaunch();
    } catch (err) {
      setError(String(err));
      setStatus("error");
    }
  };

  // ---- UI ----
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={status !== "downloading" && status !== "installing"}
      >
        <DialogHeader>
          <DialogTitle>
            {status === "error" ? "Update Failed" : "Update Available"}
          </DialogTitle>

          <DialogDescription>
            {status === "available" && update && (
              <>
                A new version <strong>{update.version}</strong> is available.
                {osInfo && (
                  <span className="block mt-2 text-xs">
                    Detected OS: <strong>{osInfo.osName}</strong> ({osInfo.fileType})
                  </span>
                )}
              </>
            )}

            {status === "downloading" && "Downloading update…"}
            {status === "installing" && "Installing update…"}
            {status === "error" && error}
          </DialogDescription>
        </DialogHeader>

        {update?.body && status === "available" && (
          <div className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-sm">
            {update.body}
          </div>
        )}

        {(status === "downloading" || status === "installing") && (
          <div className="space-y-2">
            <Progress value={progress} />
            {progress > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {progress}%
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          {status === "available" && (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Later
              </Button>
              <Button onClick={updateNow}>Update & Restart</Button>
            </>
          )}

          {status === "error" && (
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}