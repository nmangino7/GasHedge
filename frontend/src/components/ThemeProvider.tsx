"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  resolved: Resolved;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "gashedge-theme";

function resolve(theme: Theme): Resolved {
  if (theme === "system") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<Resolved>("light");

  // Load saved preference
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setThemeState(stored);
      setResolved(resolve(stored));
    } else {
      setResolved(resolve("system"));
    }
  }, []);

  // Apply theme to <html>
  useEffect(() => {
    const r = resolve(theme);
    setResolved(r);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", r);
      document.documentElement.style.colorScheme = r;
    }
  }, [theme]);

  // Track system changes when set to system
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const r = resolve("system");
      setResolved(r);
      document.documentElement.setAttribute("data-theme", r);
      document.documentElement.style.colorScheme = r;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  function setTheme(t: Theme) {
    setThemeState(t);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, t);
  }

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return { theme: "system", resolved: "light", setTheme: () => {} };
  }
  return ctx;
}

// Inline script to set the theme before React hydration — prevents flash
export const THEME_INIT_SCRIPT = `
(function(){try{
  var s = localStorage.getItem('${STORAGE_KEY}');
  var t = (s === 'light' || s === 'dark') ? s : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.style.colorScheme = t;
}catch(e){}})();
`;
