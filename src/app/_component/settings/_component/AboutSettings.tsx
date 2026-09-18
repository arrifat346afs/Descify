import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@/components/ui/button";
import { ExternalLink, Loader2 } from "lucide-react";
import logo from "@/assets/descify.svg";

const GITHUB_URL = "https://github.com/arrifat346afs/Descify";

const AboutSettings = () => {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
      }
    };
    loadVersion();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">About</h3>
        <p className="text-sm text-muted-foreground">
          Information about Descify.
        </p>
      </div>

      {/* App identity */}
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <img
          src={logo}
          alt="Descify logo"
          className="w-24 h-auto"
        />
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">Descify</h2>
          {version !== null ? (
            <p className="text-sm text-muted-foreground">Version {version}</p>
          ) : (
            <p className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading version…
            </p>
          )}
        </div>
      </div>

      {/* App info */}
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          Descify is an AI powered image metadata manager. Generate, edit and
          organize metadata for your images with the help of AI models.
        </p>
        <p className="text-sm text-muted-foreground">
          Made by <span className="font-medium text-foreground">arrifat346afs</span>
        </p>
      </div>

      {/* Links */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={() => openUrl(GITHUB_URL)}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View on GitHub
        </Button>
      </div>
    </div>
  );
};

export default AboutSettings;
