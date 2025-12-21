import { useEffect, useRef, useState } from "react";

export type LogType = "log" | "info" | "warn" | "error";

export interface ConsoleLog {
  type: LogType;
  message: string;
  time: string;
}

export function useConsoleLogs(limit = 500) {
  const [logs, setLogs] = useState<ConsoleLog[]>([]);
  const original = useRef<Partial<typeof console>>({});

  useEffect(() => {
    const methods: LogType[] = ["log", "info", "warn", "error"];

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

    return () => {
      methods.forEach((type) => {
        if (original.current[type]) {
          console[type] = original.current[type] as any;
        }
      });
    };
  }, [limit]);

  return { logs, clear: () => setLogs([]) };
}
