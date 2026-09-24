/**
 * Shared black & white chat theming: surfaces, wallpapers, bubbles.
 * Used by the Student Hub (groups + direct messages) and the setter/patron room.
 */

export type ChatThemeId = "onyx" | "graphite" | "paper" | "newsprint" | "contrast";
export type WallpaperId = "none" | "grid" | "dots" | "hex" | "diagonal" | "arcs" | "noise" | "custom";
export type DensityId = "comfortable" | "compact";
export type BubbleId = "rounded" | "square" | "minimal";
export type AccentId = "mono" | "primary";

export interface ChatPrefs {
  theme: ChatThemeId;
  wallpaper: WallpaperId;
  density: DensityId;
  bubble_style: BubbleId;
  accent: AccentId;
  custom_wallpaper_path: string | null;
  custom_wallpaper_url: string | null;
}

export const DEFAULT_CHAT_PREFS: ChatPrefs = {
  theme: "onyx",
  wallpaper: "grid",
  density: "comfortable",
  bubble_style: "rounded",
  accent: "mono",
  custom_wallpaper_path: null,
  custom_wallpaper_url: null,
};

interface ThemeDef {
  label: string;
  hint: string;
  dark: boolean;
  swatch: [string, string, string];
  vars: Record<string, string>;
}

export const CHAT_THEMES: Record<ChatThemeId, ThemeDef> = {
  onyx: {
    label: "Onyx",
    hint: "Pure black, white ink",
    dark: true,
    swatch: ["#000000", "#141414", "#FFFFFF"],
    vars: {
      "--chat-bg": "#000000",
      "--chat-panel": "#0A0A0A",
      "--chat-panel-2": "#121212",
      "--chat-border": "rgba(255,255,255,0.10)",
      "--chat-text": "#FFFFFF",
      "--chat-dim": "rgba(255,255,255,0.58)",
      "--chat-me-bg": "#FFFFFF",
      "--chat-me-fg": "#000000",
      "--chat-you-bg": "#161616",
      "--chat-you-fg": "#F2F2F2",
      "--chat-ink": "rgba(255,255,255,0.07)",
      "--chat-shadow": "0 10px 30px rgba(0,0,0,0.55)",
      "--chat-mono": "#FFFFFF",
      "--chat-mono-fg": "#000000",
    },
  },
  graphite: {
    label: "Graphite",
    hint: "Soft charcoal, low glare",
    dark: true,
    swatch: ["#0E0F10", "#1B1D1F", "#EDEDED"],
    vars: {
      "--chat-bg": "#0E0F10",
      "--chat-panel": "#141618",
      "--chat-panel-2": "#1B1D1F",
      "--chat-border": "rgba(255,255,255,0.12)",
      "--chat-text": "#EDEDED",
      "--chat-dim": "rgba(237,237,237,0.55)",
      "--chat-me-bg": "#E9E9E9",
      "--chat-me-fg": "#111111",
      "--chat-you-bg": "#222527",
      "--chat-you-fg": "#EDEDED",
      "--chat-ink": "rgba(255,255,255,0.06)",
      "--chat-shadow": "0 10px 30px rgba(0,0,0,0.45)",
      "--chat-mono": "#EDEDED",
      "--chat-mono-fg": "#111111",
    },
  },
  paper: {
    label: "Paper",
    hint: "Clean white, black ink",
    dark: false,
    swatch: ["#FFFFFF", "#F2F2F2", "#000000"],
    vars: {
      "--chat-bg": "#FFFFFF",
      "--chat-panel": "#FBFBFB",
      "--chat-panel-2": "#F2F2F2",
      "--chat-border": "rgba(0,0,0,0.10)",
      "--chat-text": "#0B0B0B",
      "--chat-dim": "rgba(0,0,0,0.55)",
      "--chat-me-bg": "#0B0B0B",
      "--chat-me-fg": "#FFFFFF",
      "--chat-you-bg": "#F0F0F0",
      "--chat-you-fg": "#111111",
      "--chat-ink": "rgba(0,0,0,0.07)",
      "--chat-shadow": "0 8px 24px rgba(0,0,0,0.10)",
      "--chat-mono": "#0B0B0B",
      "--chat-mono-fg": "#FFFFFF",
    },
  },
  newsprint: {
    label: "Newsprint",
    hint: "Warm off-white",
    dark: false,
    swatch: ["#F7F5F1", "#EAE7E1", "#1A1A18"],
    vars: {
      "--chat-bg": "#F7F5F1",
      "--chat-panel": "#FCFBF8",
      "--chat-panel-2": "#EAE7E1",
      "--chat-border": "rgba(26,26,24,0.12)",
      "--chat-text": "#1A1A18",
      "--chat-dim": "rgba(26,26,24,0.58)",
      "--chat-me-bg": "#1A1A18",
      "--chat-me-fg": "#FAF8F4",
      "--chat-you-bg": "#EDEAE3",
      "--chat-you-fg": "#1A1A18",
      "--chat-ink": "rgba(26,26,24,0.07)",
      "--chat-shadow": "0 8px 24px rgba(26,26,24,0.10)",
      "--chat-mono": "#1A1A18",
      "--chat-mono-fg": "#FAF8F4",
    },
  },
  contrast: {
    label: "High contrast",
    hint: "Maximum legibility",
    dark: true,
    swatch: ["#000000", "#000000", "#FFFFFF"],
    vars: {
      "--chat-bg": "#000000",
      "--chat-panel": "#000000",
      "--chat-panel-2": "#0A0A0A",
      "--chat-border": "rgba(255,255,255,0.32)",
      "--chat-text": "#FFFFFF",
      "--chat-dim": "rgba(255,255,255,0.78)",
      "--chat-me-bg": "#FFFFFF",
      "--chat-me-fg": "#000000",
      "--chat-you-bg": "#000000",
      "--chat-you-fg": "#FFFFFF",
      "--chat-ink": "rgba(255,255,255,0.14)",
      "--chat-shadow": "none",
      "--chat-mono": "#FFFFFF",
      "--chat-mono-fg": "#000000",
    },
  },
};

interface WallpaperDef {
  label: string;
  image: string;
  size?: string;
  opacity: number;
}

export const CHAT_WALLPAPERS: Record<WallpaperId, WallpaperDef> = {
  none: { label: "Plain", image: "none", opacity: 0 },
  grid: {
    label: "Grid",
    image:
      "linear-gradient(var(--chat-ink) 1px, transparent 1px), linear-gradient(90deg, var(--chat-ink) 1px, transparent 1px)",
    size: "34px 34px, 34px 34px",
    opacity: 1,
  },
  dots: {
    label: "Dots",
    image: "radial-gradient(var(--chat-ink) 1.5px, transparent 1.6px)",
    size: "22px 22px",
    opacity: 1,
  },
  hex: {
    label: "Honeycomb",
    image:
      "repeating-linear-gradient(60deg, transparent, transparent 26px, var(--chat-ink) 26px, var(--chat-ink) 27px), repeating-linear-gradient(120deg, transparent, transparent 26px, var(--chat-ink) 26px, var(--chat-ink) 27px), repeating-linear-gradient(0deg, transparent, transparent 26px, var(--chat-ink) 26px, var(--chat-ink) 27px)",
    opacity: 1,
  },
  diagonal: {
    label: "Pinstripe",
    image:
      "repeating-linear-gradient(45deg, var(--chat-ink) 0 1px, transparent 1px 14px)",
    opacity: 1,
  },
  arcs: {
    label: "Arcs",
    image:
      "radial-gradient(circle at 0% 100%, transparent 58px, var(--chat-ink) 59px, transparent 60px), radial-gradient(circle at 100% 0%, transparent 58px, var(--chat-ink) 59px, transparent 60px)",
    size: "120px 120px",
    opacity: 1,
  },
  noise: {
    label: "Static",
    image:
      "radial-gradient(var(--chat-ink) 0.7px, transparent 0.8px), radial-gradient(var(--chat-ink) 0.7px, transparent 0.8px)",
    size: "9px 9px, 13px 13px",
    opacity: 1,
  },
  custom: { label: "My photo", image: "none", opacity: 1 },
};

export const DENSITY_OPTIONS: { id: DensityId; label: string }[] = [
  { id: "comfortable", label: "Comfortable" },
  { id: "compact", label: "Compact" },
];

export const BUBBLE_OPTIONS: { id: BubbleId; label: string }[] = [
  { id: "rounded", label: "Rounded" },
  { id: "square", label: "Squared" },
  { id: "minimal", label: "Minimal" },
];

export const ACCENT_OPTIONS: { id: AccentId; label: string }[] = [
  { id: "mono", label: "Monochrome" },
  { id: "primary", label: "Signature colour" },
];

export function normalisePrefs(raw: Partial<Record<keyof ChatPrefs, string>> | null | undefined): ChatPrefs {
  const pick = <K extends keyof ChatPrefs>(key: K, valid: readonly string[]): ChatPrefs[K] => {
    const v = raw?.[key];
    return (v && valid.includes(v) ? v : DEFAULT_CHAT_PREFS[key]) as ChatPrefs[K];
  };
  return {
    theme: pick("theme", Object.keys(CHAT_THEMES)),
    wallpaper: pick("wallpaper", Object.keys(CHAT_WALLPAPERS)),
    density: pick("density", DENSITY_OPTIONS.map((d) => d.id)),
    bubble_style: pick("bubble_style", BUBBLE_OPTIONS.map((b) => b.id)),
    accent: pick("accent", ACCENT_OPTIONS.map((a) => a.id)),
    custom_wallpaper_path: raw?.custom_wallpaper_path || null,
    custom_wallpaper_url: raw?.custom_wallpaper_url || null,
  };
}

/** Inline CSS custom properties for a chat surface. */
export function chatVars(prefs: ChatPrefs): React.CSSProperties {
  const theme = CHAT_THEMES[prefs.theme];
  const accent =
    prefs.accent === "primary"
      ? { "--chat-accent": "var(--primary)", "--chat-accent-fg": "var(--primary-foreground)" }
      : { "--chat-accent": "var(--chat-mono)", "--chat-accent-fg": "var(--chat-mono-fg)" };
  return { ...theme.vars, ...accent } as React.CSSProperties;
}

export function wallpaperStyle(prefs: ChatPrefs): React.CSSProperties {
  if (prefs.wallpaper === "custom") {
    if (!prefs.custom_wallpaper_url) return { display: "none" };
    return {
      backgroundImage: `linear-gradient(var(--chat-ink), var(--chat-ink)), url(${JSON.stringify(prefs.custom_wallpaper_url)})`,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
      opacity: 0.72,
    };
  }
  const wp = CHAT_WALLPAPERS[prefs.wallpaper];
  if (wp.image === "none") return { display: "none" };
  return { backgroundImage: wp.image, backgroundSize: wp.size, opacity: wp.opacity };
}

export function initials(name: string | null | undefined) {
  const n = (name || "?").trim();
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
