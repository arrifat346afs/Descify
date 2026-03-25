import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { Check, Moon, Sun } from "lucide-react";
import type { ThemeDefinition } from "@/lib/themes";

// CSS variable names used for the color swatches.
// They resolve from the card's own data-theme attribute — no hardcoded values needed.
const SWATCH_VARS = ["--background", "--primary", "--secondary", "--muted", "--foreground"] as const;

// ---------------------------------------------------------------------------
// Mini preview card — sets data-theme directly on the button element so that
// CSS [data-theme='...'] rules scope all var() references to this card,
// regardless of the active theme on <html>.
// ---------------------------------------------------------------------------
function ThemePreviewCard({
  themeObj,
  isSelected,
  mode,
  onClick,
}: {
  themeObj: ThemeDefinition;
  isSelected: boolean;
  mode: "light" | "dark";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-theme={themeObj.id}
      aria-label={`Select ${themeObj.label} theme`}
      className={cn(
        mode === "dark" && "dark",
        "group relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left",
        "transition-all duration-200 hover:scale-[1.03] focus-visible:outline-none"
      )}
      style={{
        background: "var(--background)",
        borderColor: isSelected ? "var(--primary)" : "transparent",
        boxShadow: isSelected ? "0 2px 8px 0 color-mix(in oklch, var(--primary) 30%, transparent)" : undefined,
      }}
    >
      {/* --- Mini UI mockup --- */}
      <div className="space-y-1.5 w-full">
        <div className="h-2 w-full rounded-sm" style={{ background: "var(--primary)", opacity: 0.9 }} />
        <div className="flex gap-1">
          <div className="h-1.5 rounded-sm" style={{ background: "var(--foreground)", opacity: 0.4, width: "60%" }} />
          <div className="h-1.5 rounded-sm" style={{ background: "var(--foreground)", opacity: 0.2, width: "30%" }} />
        </div>
        <div className="h-1.5 rounded-sm" style={{ background: "var(--foreground)", opacity: 0.2, width: "45%" }} />
        <div className="mt-1 h-3 w-12 rounded-sm" style={{ background: "var(--primary)", opacity: 0.7 }} />
      </div>

      {/* --- Color swatches (resolved from CSS variables — no hardcoded values) --- */}
      <div className="flex gap-1.5">
        {SWATCH_VARS.map((v) => (
          <div
            key={v}
            className="h-3.5 w-3.5 rounded-full"
            style={{ background: `var(${v})`, border: "1px solid color-mix(in oklch, var(--foreground) 15%, transparent)" }}
          />
        ))}
      </div>

      {/* --- Label row --- */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold leading-none" style={{ color: "var(--foreground)" }}>
            {themeObj.label}
          </p>
          {themeObj.description && (
            <p className="text-[10px] mt-0.5 leading-none" style={{ color: "var(--muted-foreground)" }}>
              {themeObj.description}
            </p>
          )}
        </div>
        {isSelected && (
          <span
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
            style={{ background: "var(--primary)" }}
          >
            <Check className="h-2.5 w-2.5" style={{ color: "var(--primary-foreground)" }} />
          </span>
        )}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Public ThemePicker component
// ---------------------------------------------------------------------------
export function ThemePicker() {
  const { theme, mode, setTheme, setMode, themes } = useTheme();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold mb-1">Theme</h3>
        <p className="text-sm text-muted-foreground">
          Pick a color palette and a display mode.
        </p>
      </div>

      {/* Mode toggle (light / dark) */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Mode</span>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setMode("light")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              mode === "light"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sun className="h-3.5 w-3.5" />
            Light
          </button>
          <button
            onClick={() => setMode("dark")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              mode === "dark"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Moon className="h-3.5 w-3.5" />
            Dark
          </button>
        </div>
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {themes.map((t) => (
          <ThemePreviewCard
            key={t.id}
            themeObj={t}
            isSelected={theme === t.id}
            mode={mode}
            onClick={() => setTheme(t.id)}
          />
        ))}
      </div>
    </div>
  );
}
