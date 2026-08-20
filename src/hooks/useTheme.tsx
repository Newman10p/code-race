import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeColor = "cyan" | "blue" | "red" | "purple" | "yellow";

const THEME_VARS: Record<ThemeColor, { primary: string; glow: string }> = {
  cyan:   { primary: "0.78 0.15 200", glow: "0.78 0.15 200" },
  blue:   { primary: "0.55 0.22 260", glow: "0.55 0.22 260" },
  red:    { primary: "0.62 0.24 25",  glow: "0.62 0.24 25"  },
  purple: { primary: "0.60 0.25 305", glow: "0.60 0.25 305" },
  yellow: { primary: "0.85 0.18 95",  glow: "0.85 0.18 95"  },
};

interface ThemeContextValue {
  theme: ThemeColor;
  setTheme: (t: ThemeColor) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "cyan", setTheme: async () => {} });

const applyTheme = (theme: ThemeColor) => {
  const { primary } = THEME_VARS[theme];
  const root = document.documentElement;
  root.style.setProperty("--primary", `oklch(${primary})`);
  root.style.setProperty("--accent", `oklch(${primary})`);
  root.style.setProperty("--ring", `oklch(${primary})`);
  root.style.setProperty("--neon", `oklch(${primary})`);
  root.style.setProperty("--sidebar-primary", `oklch(${primary})`);
  root.style.setProperty("--sidebar-ring", `oklch(${primary})`);
  root.style.setProperty("--chart-1", `oklch(${primary})`);
  root.style.setProperty("--glow-primary", `0 0 20px oklch(${primary} / 0.4), 0 0 40px oklch(${primary} / 0.2)`);
  root.style.setProperty("--glow-primary-intense", `0 0 20px oklch(${primary} / 0.6), 0 0 60px oklch(${primary} / 0.3), 0 0 100px oklch(${primary} / 0.1)`);
  root.style.setProperty("--glow-border", `0 0 8px oklch(${primary} / 0.3)`);
  // For mouse-trail honeycomb
  root.style.setProperty("--theme-rgb-primary", primary);
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeColor>(() => {
    if (typeof window === "undefined") return "cyan";
    return (localStorage.getItem("coderace-theme") as ThemeColor) || "cyan";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Sync from server profile on mount
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("theme_color")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.theme_color && data.theme_color !== theme) {
        const t = data.theme_color as ThemeColor;
        if (THEME_VARS[t]) {
          setThemeState(t);
          localStorage.setItem("coderace-theme", t);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback(async (t: ThemeColor) => {
    setThemeState(t);
    localStorage.setItem("coderace-theme", t);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ theme_color: t }).eq("user_id", user.id);
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export const THEME_OPTIONS: { value: ThemeColor; label: string; preview: string }[] = [
  { value: "cyan",   label: "Cyber Cyan",  preview: "oklch(0.78 0.15 200)" },
  { value: "blue",   label: "Deep Blue",   preview: "oklch(0.55 0.22 260)" },
  { value: "red",    label: "Inferno Red", preview: "oklch(0.62 0.24 25)"  },
  { value: "purple", label: "Neon Purple", preview: "oklch(0.60 0.25 305)" },
  { value: "yellow", label: "Volt Yellow", preview: "oklch(0.85 0.18 95)"  },
];
