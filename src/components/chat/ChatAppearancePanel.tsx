import {
  ACCENT_OPTIONS,
  BUBBLE_OPTIONS,
  CHAT_THEMES,
  CHAT_WALLPAPERS,
  ChatPrefs,
  ChatThemeId,
  DENSITY_OPTIONS,
  WallpaperId,
  chatVars,
  wallpaperStyle,
} from "@/lib/chat-theme";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function ChatAppearancePanel({
  prefs,
  onChange,
  onUploadWallpaper,
  onRemoveWallpaper,
}: {
  prefs: ChatPrefs;
  onChange: (patch: Partial<ChatPrefs>) => void;
  onUploadWallpaper?: (file: File) => Promise<void>;
  onRemoveWallpaper?: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file || !onUploadWallpaper) return;
    setUploading(true);
    try {
      await onUploadWallpaper(file);
      toast.success("Your wallpaper is ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload that wallpaper.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!onRemoveWallpaper) return;
    setUploading(true);
    try {
      await onRemoveWallpaper();
      toast.success("Custom wallpaper removed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove that wallpaper.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Section title="Palette">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(CHAT_THEMES) as ChatThemeId[]).map((id) => {
            const t = CHAT_THEMES[id];
            const active = prefs.theme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ theme: id })}
                aria-pressed={active}
                className={cn(
                  "rounded-xl border p-3 text-left transition-all",
                  active ? "border-foreground shadow-[0_0_0_1px_var(--color-foreground)]" : "border-border hover:border-foreground/40",
                )}
              >
                <span className="mb-2 flex gap-1">
                  {t.swatch.map((c, i) => (
                    <span key={i} className="h-5 w-5 rounded-md border border-black/20" style={{ background: c }} />
                  ))}
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {t.label}
                  {active && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="block text-[11px] text-muted-foreground">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Wallpaper">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {(Object.keys(CHAT_WALLPAPERS) as WallpaperId[]).filter((id) => id !== "custom").map((id) => {
            const active = prefs.wallpaper === id;
            const preview: ChatPrefs = { ...prefs, wallpaper: id };
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChange({ wallpaper: id })}
                aria-pressed={active}
                className={cn(
                  "overflow-hidden rounded-lg border transition-all",
                  active ? "border-foreground" : "border-border hover:border-foreground/40",
                )}
              >
                <span
                  className="relative block h-12 w-full"
                  style={{ ...chatVars(preview), background: "var(--chat-bg)" } as React.CSSProperties}
                >
                  <span className="absolute inset-0" style={wallpaperStyle(preview)} />
                </span>
                <span className="block py-1 text-center text-[11px] text-muted-foreground">
                  {CHAT_WALLPAPERS[id].label}
                </span>
              </button>
            );
          })}
        </div>
        {onUploadWallpaper && (
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              aria-label="Choose custom chat wallpaper"
              onChange={(event) => void upload(event.target.files?.[0])}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <ImagePlus className="h-4 w-4" />
              {uploading ? "Saving…" : prefs.custom_wallpaper_path ? "Replace photo" : "Upload photo"}
            </Button>
            {prefs.custom_wallpaper_path && onRemoveWallpaper && (
              <Button type="button" size="sm" variant="ghost" onClick={() => void remove()} disabled={uploading}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        )}
        {prefs.custom_wallpaper_url && (
          <button
            type="button"
            onClick={() => onChange({ wallpaper: "custom" })}
            aria-pressed={prefs.wallpaper === "custom"}
            className={cn(
              "mt-2 flex w-full items-center gap-3 overflow-hidden rounded-lg border p-2 text-left transition-all",
              prefs.wallpaper === "custom" ? "border-foreground" : "border-border hover:border-foreground/40",
            )}
          >
            <span className="h-12 w-20 shrink-0 rounded-md bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(prefs.custom_wallpaper_url)})` }} />
            <span>
              <span className="flex items-center gap-1 text-sm font-semibold">My photo {prefs.wallpaper === "custom" && <Check className="h-3.5 w-3.5" />}</span>
              <span className="block text-[11px] text-muted-foreground">Private to your account</span>
            </span>
          </button>
        )}
      </Section>

      <Section title="Bubbles">
        <div className="flex flex-wrap gap-2">
          {BUBBLE_OPTIONS.map((b) => (
            <Pill key={b.id} active={prefs.bubble_style === b.id} onClick={() => onChange({ bubble_style: b.id })}>
              {b.label}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Spacing">
        <div className="flex flex-wrap gap-2">
          {DENSITY_OPTIONS.map((d) => (
            <Pill key={d.id} active={prefs.density === d.id} onClick={() => onChange({ density: d.id })}>
              {d.label}
            </Pill>
          ))}
        </div>
      </Section>

      <Section title="Accent">
        <div className="flex flex-wrap gap-2">
          {ACCENT_OPTIONS.map((a) => (
            <Pill key={a.id} active={prefs.accent === a.id} onClick={() => onChange({ accent: a.id })}>
              {a.label}
            </Pill>
          ))}
        </div>
      </Section>
    </div>
  );
}
