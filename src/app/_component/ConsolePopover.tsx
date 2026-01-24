import { ConsoleViewer } from "@/components/ConsoleViewer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Terminal } from "lucide-react";

export function ConsolePopover() {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
    };
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5 text-primary" />
            <DialogTitle className="text-lg font-semibold">Debug Console</DialogTitle>
            <span className="ml-auto text-xs text-muted-foreground">Press Ctrl+I to toggle</span>
          </div>
        </DialogHeader>
        <div className="w-full flex-1 overflow-hidden">
          <ConsoleViewer />
        </div>
      </DialogContent>
    </Dialog>
  );
}
