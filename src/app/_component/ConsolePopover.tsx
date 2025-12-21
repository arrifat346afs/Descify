import { ConsoleViewer } from "@/components/ConsoleViewer";
import { Button } from "@/components/ui/button";
import { Terminal } from "lucide-react";
// import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ConsolePopover() {
  return (
    <div>
      <Popover>
        <PopoverTrigger>
          <Button variant="ghost" size="icon">
            <Terminal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <ConsoleViewer />
        </PopoverContent>
      </Popover>
    </div>
  );
}
