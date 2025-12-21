import { ScrollArea } from "@/components/ui/scroll-area";
import { useConsoleLogs } from "./useConsoleLogs";
import { useEffect, useRef } from "react";

const colorMap = {
  log: "text-muted-foreground",
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

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

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [logs]);

  return (
    <div className="w-full">
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
              {/* <span className="opacity-50">[{log.time}]</span>{" "} */}
              <span className="uppercase font-semibold">[{log.type}]</span>{" "}
              <span className="whitespace-pre-wrap">{highlightSyntax(log.message)}</span>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
