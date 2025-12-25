import { ConsoleViewer } from "@/components/ConsoleViewer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { useEffect, useState } from "react";

export function ConsolePopover() {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const hander = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", hander);
    return () => {
      document.removeEventListener("keydown", hander);
    };
  }, []);
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <form>
        <DialogTrigger asChild>
          <div
            aria-hidden
            className="fixed inset-0 pointer-events-none opacity-0"
          />
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>console</DialogTitle>
            <ConsoleViewer />
            <DialogDescription>
              Logs 
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </form>
    </Dialog>
  );
}
