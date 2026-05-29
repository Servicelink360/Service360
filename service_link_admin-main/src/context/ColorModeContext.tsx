import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type AppColorMode = "light" | "dark";

const STORAGE_KEY = "serviceLinkColorMode";

function readStoredMode(): AppColorMode {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
}

function applyDocumentColorMode(mode: AppColorMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-color-mode", mode);
}

type ColorModeContextValue = {
  mode: AppColorMode;
  isDark: boolean;
  setMode: (mode: AppColorMode) => void;
  toggle: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<AppColorMode>(() => {
    const initial = readStoredMode();
    applyDocumentColorMode(initial);
    return initial;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    applyDocumentColorMode(mode);
  }, [mode]);

  const setMode = useCallback((next: AppColorMode) => {
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "dark",
      setMode,
      toggle,
    }),
    [mode, setMode, toggle],
  );

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error("useColorMode must be used within ColorModeProvider");
  }
  return ctx;
}

/** Safe when provider is missing (returns light). */
export function useColorModeOptional(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  const fallback = useMemo(
    () => ({
      mode: "light" as AppColorMode,
      isDark: false,
      setMode: () => undefined,
      toggle: () => undefined,
    }),
    [],
  );
  return ctx ?? fallback;
}
