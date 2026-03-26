import { ScrollArea } from "@/components/ui/scroll-area";
import { useConsoleLogs } from "./ConsoleContext";
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Search, Copy } from "lucide-react";
import type { ConsoleLog } from "./ConsoleContext";

const colorMap = {
  log: { bg: "bg-background hover:bg-accent", icon: "text-muted-foreground" },
  info: { bg: "bg-background hover:bg-accent", icon: "text-muted-foreground" },
  warn: { bg: "bg-background hover:bg-accent", icon: "text-muted-foreground" },
  error: { bg: "bg-background hover:bg-accent", icon: "text-muted-foreground" },
};

const badgeVariantMap = {
  log: "secondary",
  info: "default",
  warn: "outline",
  error: "destructive",
} as const;

// Module-level cache so the same message is never highlighted twice
const highlightCache = new Map<string, JSX.Element>();

// Syntax highlighting for console messages
function highlightSyntax(message: string): JSX.Element {
  const cached = highlightCache.get(message);
  if (cached) return cached;

  let result: JSX.Element;
  // Try to detect if it's JSON
  const trimmed = message.trim();
  const isJSON = (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                 (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (isJSON) {
    try {
      const parsed = JSON.parse(trimmed);
      const formatted = JSON.stringify(parsed, null, 2);
      result = highlightJSON(formatted);
    } catch {
      result = highlightText(message);
    }
  } else {
    result = highlightText(message);
  }

  // Prevent unbounded cache growth
  if (highlightCache.size > 2000) highlightCache.clear();
  highlightCache.set(message, result);
  return result;
}

function highlightJSON(json: string): JSX.Element {
  const parts: JSX.Element[] = [];
  let currentIndex = 0;

  // Regex patterns for different JSON elements
  const patterns = [
    { regex: /"([^"\\]|\\.)*"(?=\s*:)/g, className: "text-purple-400" }, // Keys
    { regex: /"([^"\\]|\\.)*"(?!\s*:)/g, className: "text-green-400" }, // String values
    { regex: /\b(true|false|null)\b/g, className: "text-orange-400" }, // Booleans and null
    { regex: /\b-?\d+\.?\d*\b/g, className: "text-cyan-400" }, // Numbers
  ];

  const matches: Array<{ index: number; length: number; text: string; className: string }> = [];

  patterns.forEach(({ regex, className }) => {
    let match;
    while ((match = regex.exec(json)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
        className,
      });
    }
  });

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Build the highlighted output
  matches.forEach((match, i) => {
    // Add text before this match
    if (match.index > currentIndex) {
      parts.push(
        <span key={`text-${i}`} className="text-gray-400">
          {json.substring(currentIndex, match.index)}
        </span>
      );
    }

    // Add the highlighted match
    parts.push(
      <span key={`match-${i}`} className={match.className}>
        {match.text}
      </span>
    );

    currentIndex = match.index + match.length;
  });

  // Add remaining text
  if (currentIndex < json.length) {
    parts.push(
      <span key="text-end" className="text-gray-400">
        {json.substring(currentIndex)}
      </span>
    );
  }

  return <>{parts}</>;
}

function highlightText(text: string): JSX.Element {
  const parts: JSX.Element[] = [];
  let currentIndex = 0;

  // Patterns for non-JSON text
  const patterns = [
    { regex: /"([^"\\]|\\.)*"/g, className: "text-green-400" }, // Strings
    { regex: /\b(true|false|null|undefined)\b/g, className: "text-orange-400" }, // Booleans
    { regex: /\b-?\d+\.?\d*\b/g, className: "text-cyan-400" }, // Numbers
    { regex: /\b(Error|Warning|Success|Info):/gi, className: "text-yellow-300 font-semibold" }, // Keywords
  ];

  const matches: Array<{ index: number; length: number; text: string; className: string }> = [];

  patterns.forEach(({ regex, className }) => {
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
        className,
      });
    }
  });

  // Sort and remove overlapping matches
  matches.sort((a, b) => a.index - b.index);
  const filteredMatches = matches.filter((match, i) => {
    if (i === 0) return true;
    const prev = matches[i - 1];
    return match.index >= prev.index + prev.length;
  });

  // Build the highlighted output
  filteredMatches.forEach((match, i) => {
    if (match.index > currentIndex) {
      parts.push(
        <span key={`text-${i}`}>
          {text.substring(currentIndex, match.index)}
        </span>
      );
    }

    parts.push(
      <span key={`match-${i}`} className={match.className}>
        {match.text}
      </span>
    );

    currentIndex = match.index + match.length;
  });

  if (currentIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.substring(currentIndex)}
      </span>
    );
  }

  return <>{parts}</>;
}

interface LogItemProps {
  log: ConsoleLog;
  index: number;
  isCopied: boolean;
  onCopy: (text: string, index: number) => void;
}

const LogItem = memo(function LogItem({ log, index, isCopied, onCopy }: LogItemProps) {
  return (
    <div
      className={`group relative rounded-md p-1.5 border border-border hover:border-primary/50 transition-all ${colorMap[log.type].bg}`}
    >
      <div className="flex items-start gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 p-0"
          onClick={() => onCopy(log.message, index)}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Badge variant={badgeVariantMap[log.type]} className="shrink-0 mt-0.5 uppercase text-[9px] font-bold">
          {log.type}
        </Badge>
        <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">{log.time}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono wrap-break-word whitespace-pre-wrap text-foreground break-all">
            {highlightSyntax(log.message)}
          </div>
        </div>
      </div>
      {isCopied && (
        <span className="absolute top-0 right-0 text-[10px] text-muted-foreground">Copied!</span>
      )}
    </div>
  );
});

export function ConsoleViewer() {
  const { logs, clear } = useConsoleLogs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "log" | "info" | "warn" | "error">("all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-scroll to bottom when new logs are added (instant to avoid expensive smooth animation)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "instant", block: "end" });
    }
  }, [logs]);

  // Memoized filtering so it doesn't recompute on every render
  const filteredLogs = useMemo(() => logs.filter((log) => {
    const matchesSearch = searchQuery === "" || log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || log.type === selectedType;
    return matchesSearch && matchesType;
  }), [logs, searchQuery, selectedType]);

  // Memoized counts - single pass instead of 4 separate filter calls
  const logCounts = useMemo(() => {
    const counts = { all: logs.length, log: 0, info: 0, warn: 0, error: 0 };
    for (const l of logs) counts[l.type]++;
    return counts;
  }, [logs]);

  const copyToClipboard = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-2 overflow-hidden">
      {/* Search Bar */}
      <div className="relative shrink-0">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          className="pl-8 h-8 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs for filtering */}
      <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as any)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <TabsList className="w-full grid grid-cols-5 h-7 text-[10px] shrink-0">
          <TabsTrigger value="all" className="text-[10px] py-0.5 px-1">
            All <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{logCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="log" className="text-[10px] py-0.5 px-1">
            Log <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{logCounts.log}</Badge>
          </TabsTrigger>
          <TabsTrigger value="info" className="text-[10px] py-0.5 px-1">
            Info <Badge variant="default" className="ml-1 h-4 text-[10px]">{logCounts.info}</Badge>
          </TabsTrigger>
          <TabsTrigger value="warn" className="text-[10px] py-0.5 px-1">
            Warn <Badge className="ml-1 h-4 text-[10px] bg-amber-500 hover:bg-amber-600">{logCounts.warn}</Badge>
          </TabsTrigger>
          <TabsTrigger value="error" className="text-[10px] py-0.5 px-1">
            Error <Badge variant="destructive" className="ml-1 h-4 text-[10px]">{logCounts.error}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="mt-2 flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full w-full rounded-lg border bg-card">
            <div className="p-2 space-y-1.5">
              {filteredLogs.length === 0 ? (
                <div className="flex items-center justify-center h-20 text-muted-foreground text-xs">
                  {logs.length === 0 ? "No logs yet. Open the console to see logs here." : "No logs matching your search."}
                </div>
              ) : (
                filteredLogs.map((log, i) => (
                  <LogItem
                    key={i}
                    log={log}
                    index={i}
                    isCopied={copiedIndex === i}
                    onCopy={copyToClipboard}
                  />
                ))
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer with Clear Button */}
      <div className="flex items-center justify-between pt-1 border-t shrink-0">
        <span className="text-[10px] text-muted-foreground">
          {filteredLogs.length} of {logs.length} logs
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={clear}
          className="h-6 text-[10px] gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </Button>
      </div>
    </div>
  );
}
