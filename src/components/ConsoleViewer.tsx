import { ScrollArea } from "@/components/ui/scroll-area";
import { useConsoleLogs } from "./useConsoleLogs";

const colorMap = {
  log: "text-muted-foreground",
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export function ConsoleViewer() {
  const { logs, clear } = useConsoleLogs();

  return (
    <div className="w-[420px]">
      <div className="flex items-center justify-between border-b pb-2 mb-2">
        <span className="text-sm font-semibold">Console Logs</span>
        <button
          onClick={clear}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <ScrollArea className="h-64 rounded-md border bg-black p-2">
        <div className="space-y-1 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className={colorMap[log.type]}>
              <span className="opacity-50">[{log.time}]</span>{" "}
              <span className="uppercase">[{log.type}]</span>{" "}
              {log.message}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
