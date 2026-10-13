import { useState, useEffect, useMemo, useCallback } from "react";
import { ThemeContext } from "./themeContextDef.js";

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") {
        return stored;
      }
    } catch {
      // Storage unavailable or disabled
    }
    return "system";
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemIsDark(e.matches);

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const isDark = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return systemIsDark;
  }, [theme, systemIsDark]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      meta.content = theme === "system" ? "light dark" : theme;
    }
  }, [isDark, theme]);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try {
      if (newTheme === "system") {
        localStorage.removeItem("theme");
      } else {
        localStorage.setItem("theme", newTheme);
      }
    } catch {
      // Storage unavailable or disabled
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [theme, isDark, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
