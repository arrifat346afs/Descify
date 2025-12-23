import { ConsoleViewer } from "@/components/ConsoleViewer";
import { Button } from "@/components/ui/button";
import { Terminal } from "lucide-react";
// import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button variant="ghost" size="icon" className="hidden">
          <Terminal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <ConsoleViewer />
      </PopoverContent>
    </Popover>
  );
}
