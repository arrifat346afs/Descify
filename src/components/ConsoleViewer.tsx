import { ScrollArea } from "@/components/ui/scroll-area";
import { useConsoleLogs } from "./ConsoleContext";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Search, Copy } from "lucide-react";

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

// Syntax highlighting for console messages
function highlightSyntax(message: string) {
  // Try to detect if it's JSON
  const trimmed = message.trim();
  const isJSON = (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
                 (trimmed.startsWith('[') && trimmed.endsWith(']'));

  if (isJSON) {
    try {
      // Parse and re-stringify to ensure valid JSON
      const parsed = JSON.parse(trimmed);
      const formatted = JSON.stringify(parsed, null, 2);
      return highlightJSON(formatted);
    } catch {
      // If parsing fails, fall back to basic highlighting
      return highlightText(message);
    }
  }

  return highlightText(message);
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

export function ConsoleViewer() {
  const { logs, clear } = useConsoleLogs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "log" | "info" | "warn" | "error">("all");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [logs]);

  // Filter logs based on search and type
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || log.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Get log counts
  const logCounts = {
    all: logs.length,
    log: logs.filter((l) => l.type === "log").length,
    info: logs.filter((l) => l.type === "info").length,
    warn: logs.filter((l) => l.type === "warn").length,
    error: logs.filter((l) => l.type === "error").length,
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search logs..."
          className="pl-8 h-8 text-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Tabs for filtering */}
      <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as any)}>
        <TabsList className="w-full grid grid-cols-5 h-8">
          <TabsTrigger value="all" className="text-xs">
            All <Badge variant="secondary" className="ml-1 h-5">{logCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="log" className="text-xs">
            Log <Badge variant="secondary" className="ml-1 h-5">{logCounts.log}</Badge>
          </TabsTrigger>
          <TabsTrigger value="info" className="text-xs">
            Info <Badge variant="default" className="ml-1 h-5">{logCounts.info}</Badge>
          </TabsTrigger>
          <TabsTrigger value="warn" className="text-xs">
            Warn <Badge className="ml-1 h-5 bg-amber-500 hover:bg-amber-600">{logCounts.warn}</Badge>
          </TabsTrigger>
          <TabsTrigger value="error" className="text-xs">
            Error <Badge variant="destructive" className="ml-1 h-5">{logCounts.error}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="m-0 flex-1">
          <ScrollArea className="h-96 w-full rounded-lg border bg-card">
            <div className="p-3 space-y-2">
              {filteredLogs.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  {logs.length === 0 ? "No logs yet. Open the console to see logs here." : "No logs matching your search."}
                </div>
              ) : (
                filteredLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`group relative rounded-md p-2 border border-border hover:border-primary/50 transition-all ${colorMap[log.type].bg}`}
                  >
                    <div className="flex items-start gap-2">
                      {/* Type Badge */}
                      <Badge variant={badgeVariantMap[log.type]} className="shrink-0 mt-0.5 uppercase text-xs font-bold">
                        {log.type}
                      </Badge>

                      {/* Time */}
                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{log.time}</span>

                      {/* Message */}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono wrap-break-word whitespace-pre-wrap text-foreground">
                          {highlightSyntax(log.message)}
                        </div>
                      </div>

                      {/* Copy Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                        onClick={() => copyToClipboard(log.message, i)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {copiedIndex === i && (
                      <span className="absolute top-0 right-0 text-xs text-muted-foreground">Copied!</span>
                    )}
                  </div>
                ))
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer with Clear Button */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-xs text-muted-foreground">
          {filteredLogs.length} of {logs.length} logs
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={clear}
          className="h-7 text-xs gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Clear All
        </Button>
      </div>
    </div>
  );
}
