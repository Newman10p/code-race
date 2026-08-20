import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Megaphone, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Announcement {
  id: string;
  title: string;
  body: string;
  created_at: string;
}

/**
 * Global popup. Shows the latest active announcement the current user
 * has not yet dismissed. Once "OK" is clicked, it is recorded and never
 * shown to that user again.
 */
export function AnnouncementBanner() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<Announcement | null>(null);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data: active } = await (supabase as any)
        .from("announcements")
        .select("id, title, body, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (!active || active.length === 0) return;

      const { data: dismissed } = await (supabase as any)
        .from("announcement_dismissals")
        .select("announcement_id")
        .eq("user_id", user.id);
      const dismissedSet = new Set((dismissed || []).map((d: any) => d.announcement_id));

      const next = active.find((a: any) => !dismissedSet.has(a.id));
      if (next && mounted) setCurrent(next);
    })();
    return () => {
      mounted = false;
    };
  }, [user]);

  const dismiss = async () => {
    if (!current || !user) return;
    await (supabase as any)
      .from("announcement_dismissals")
      .insert({ user_id: user.id, announcement_id: current.id });
    setCurrent(null);
  };

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl glow-card"
          >
            <button
              onClick={dismiss}
              className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mb-3 flex items-center gap-2 text-primary">
              <Megaphone className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                Announcement
              </span>
            </div>
            <h2 className="mb-2 text-xl font-bold">{current.title}</h2>
            <p className="mb-6 whitespace-pre-wrap text-sm text-muted-foreground">
              {current.body}
            </p>
            <Button variant="neon" size="lg" className="w-full" onClick={dismiss}>
              OK, got it
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}