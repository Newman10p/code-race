import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChatPrefs, DEFAULT_CHAT_PREFS, normalisePrefs } from "@/lib/chat-theme";

const LOCAL_KEY = "coderace-chat-appearance";

function readLocal(): ChatPrefs {
  if (typeof window === "undefined") return DEFAULT_CHAT_PREFS;
  try {
    return normalisePrefs(JSON.parse(localStorage.getItem(LOCAL_KEY) || "null"));
  } catch {
    return DEFAULT_CHAT_PREFS;
  }
}

export function useChatAppearance() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<ChatPrefs>(DEFAULT_CHAT_PREFS);

  useEffect(() => {
    setPrefs(readLocal());
  }, []);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("chat_appearance")
        .select("theme, wallpaper, density, bubble_style, accent, custom_wallpaper_path")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const path = data.custom_wallpaper_path;
        const { data: signed } = path
          ? await supabase.storage.from("chat-wallpapers").createSignedUrl(path, 60 * 60 * 24 * 7)
          : { data: null };
        const next = normalisePrefs({
          ...(data as Record<string, string>),
          custom_wallpaper_url: signed?.signedUrl || undefined,
        });
        setPrefs(next);
        localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...next, custom_wallpaper_url: null }));
      }
    })();
  }, [user]);

  const update = useCallback(
    async (patch: Partial<ChatPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...next, custom_wallpaper_url: null }));
        if (user) {
          const { custom_wallpaper_url: _temporaryUrl, ...saved } = next;
          void supabase.from("chat_appearance").upsert({ user_id: user.id, ...saved });
        }
        return next;
      });
    },
    [user],
  );

  const uploadWallpaper = useCallback(async (file: File) => {
    if (!user) throw new Error("Sign in to upload a wallpaper.");
    if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Choose an image smaller than 5 MB.");

    const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${user.id}/wallpaper.${extension}`;
    if (prefs.custom_wallpaper_path && prefs.custom_wallpaper_path !== path) {
      await supabase.storage.from("chat-wallpapers").remove([prefs.custom_wallpaper_path]);
    }
    const { error } = await supabase.storage.from("chat-wallpapers").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });
    if (error) throw error;
    const { data, error: signedError } = await supabase.storage.from("chat-wallpapers").createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signedError || !data?.signedUrl) throw signedError || new Error("Could not display the uploaded wallpaper.");
    await update({ wallpaper: "custom", custom_wallpaper_path: path, custom_wallpaper_url: data.signedUrl });
  }, [prefs.custom_wallpaper_path, update, user]);

  const removeWallpaper = useCallback(async () => {
    if (prefs.custom_wallpaper_path) {
      const { error } = await supabase.storage.from("chat-wallpapers").remove([prefs.custom_wallpaper_path]);
      if (error) throw error;
    }
    await update({ wallpaper: "grid", custom_wallpaper_path: null, custom_wallpaper_url: null });
  }, [prefs.custom_wallpaper_path, update]);

  return { prefs, update, uploadWallpaper, removeWallpaper };
}
