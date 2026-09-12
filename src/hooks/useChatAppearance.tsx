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
        .select("theme, wallpaper, density, bubble_style, accent")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const next = normalisePrefs(data as Record<string, string>);
        setPrefs(next);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
      }
    })();
  }, [user]);

  const update = useCallback(
    async (patch: Partial<ChatPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        if (user) void supabase.from("chat_appearance").upsert({ user_id: user.id, ...next });
        return next;
      });
    },
    [user],
  );

  return { prefs, update };
}
