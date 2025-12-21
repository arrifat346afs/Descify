import { ConsoleViewer } from "@/components/ConsoleViewer";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Terminal } from "lucide-react";


export function ConsolePopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Terminal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="top"
        className="p-3 w-auto"
      >
        <ConsoleViewer />
      </PopoverContent>
    </Popover>
  );
}
