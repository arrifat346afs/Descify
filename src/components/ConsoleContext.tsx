import  { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";

export type LogType = "log" | "info" | "warn" | "error";

export interface ConsoleLog {
  type: LogType;
  message: string;
  time: string;
}

interface ConsoleContextType {
  logs: ConsoleLog[];
  clear: () => void;
}

const ConsoleContext = createContext<ConsoleContextType | undefined>(undefined);

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const original = useRef<Partial<typeof console>>({});
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize console interception once, on mount
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const methods: LogType[] = ["log", "info", "warn", "error"];
    const limit = 500;

    methods.forEach((type) => {
      original.current[type] = console[type];

      console[type] = (...args: any[]) => {
        setLogs((prev) => {
          const next = [
            ...prev,
            {
              type,
              time: new Date().toLocaleTimeString(),
              message: args
                .map((a) =>
                  typeof a === "object"
                    ? JSON.stringify(a, null, 2)
                    : String(a)
                )
                .join(" "),
            },
          ];
          return next.slice(-limit);
        });

        original.current[type]?.apply(console, args);
      };
    });

    // Cleanup only on unmount
    return () => {
      methods.forEach((type) => {
        if (original.current[type]) {
          console[type] = original.current[type] as any;
        }
      });
    };
  }, []); // Empty dependency array - run only once

  return (
    <ConsoleContext.Provider value={{ logs, clear: () => setLogs([]) }}>
      {children}
    </ConsoleContext.Provider>
  );
}

export function useConsoleLogs() {
  const context = useContext(ConsoleContext);
  if (!context) {
    throw new Error("useConsoleLogs must be used within ConsoleProvider");
  }
  return context;
}
