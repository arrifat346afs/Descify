import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ThemeId, ColorMode, ThemeDefinition, discoverThemes } from "@/lib/themes";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: ThemeId;
  defaultMode?: ColorMode;
  storageKey?: string;
  modeStorageKey?: string;
};

type ThemeProviderState = {
  theme: ThemeId;
  mode: ColorMode;
  themes: ThemeDefinition[];
  setTheme: (theme: ThemeId) => void;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
};

const initialState: ThemeProviderState = {
  theme: "default",
  mode: "light",
  themes: [],
  setTheme: () => null,
  setMode: () => null,
  toggleMode: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "default",
  defaultMode = "light",
  storageKey = "descify-theme-id",
  modeStorageKey = "descify-theme-mode",
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    return localStorage.getItem(storageKey) || defaultTheme;
  });

  const [mode, setModeState] = useState<ColorMode>(() => {
    return (localStorage.getItem(modeStorageKey) as ColorMode) || defaultMode;
  });

  // Themes are discovered from [data-theme='...'] selectors in App.css —
  // no manual list needed. We populate after mount when styles are ready.
  const [themes, setThemes] = useState<ThemeDefinition[]>([]);

  useEffect(() => {
    setThemes(discoverThemes());
  }, []);

  const applyTheme = useCallback((themeId: ThemeId, colorMode: ColorMode) => {
    const root = window.document.documentElement;

    // Set the data-theme attribute — CSS [data-theme='...'] rules handle the rest
    root.setAttribute("data-theme", themeId);

    // Toggle the .dark class for dark mode support
    root.classList.toggle("dark", colorMode === "dark");
  }, []);

  useEffect(() => {
    applyTheme(theme, mode);
  }, [theme, mode, applyTheme]);

  const setTheme = useCallback(
    (newTheme: ThemeId) => {
      localStorage.setItem(storageKey, newTheme);
      setThemeState(newTheme);
    },
    [storageKey]
  );

  const setMode = useCallback(
    (newMode: ColorMode) => {
      localStorage.setItem(modeStorageKey, newMode);
      setModeState(newMode);
    },
    [modeStorageKey]
  );

  const toggleMode = useCallback(() => {
    setMode(mode === "light" ? "dark" : "light");
  }, [mode, setMode]);

  const value: ThemeProviderState = {
    theme,
    mode,
    themes,
    setTheme,
    setMode,
    toggleMode,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);
  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");
  return context;
};