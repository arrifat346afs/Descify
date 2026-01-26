import  { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";

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

// Use a shared store to persist logs across component re-renders
const sharedLogsStore = {
  logs: [] as ConsoleLog[],
  listeners: new Set<(logs: ConsoleLog[]) => void>(),
  addLog(log: ConsoleLog) {
    this.logs = [...this.logs, log].slice(-500);
    this.listeners.forEach(listener => listener(this.logs));
  },
  clear() {
    this.logs = [];
    this.listeners.forEach(listener => listener(this.logs));
  },
  subscribe(listener: (logs: ConsoleLog[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
};

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const original = useRef<Partial<typeof console>>({});
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Subscribe to shared logs store
    const unsubscribe = sharedLogsStore.subscribe((newLogs) => {
      setLogs([...newLogs]);
    });

    // Initialize console interception once globally
    if (!hasInitialized.current) {
      hasInitialized.current = true;

      const methods: LogType[] = ["log", "info", "warn", "error"];

      methods.forEach((type) => {
        original.current[type] = console[type];

        console[type] = (...args: any[]) => {
          const message = args
            .map((a) =>
              typeof a === "object"
                ? JSON.stringify(a, null, 2)
                : String(a)
            )
            .join(" ");

          sharedLogsStore.addLog({
            type,
            time: new Date().toLocaleTimeString(),
            message,
          });

          original.current[type]?.apply(console, args);
        };
      });
    }

    // Cleanup
    return () => {
      unsubscribe();
    };
  }, []);

  const clear = useCallback(() => {
    sharedLogsStore.clear();
  }, []);

  return (
    <ConsoleContext.Provider value={{ logs, clear }}>
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
