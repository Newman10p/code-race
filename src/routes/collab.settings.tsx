import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ensureDeviceKeys, exportDeviceKeyBundle, importDeviceKeyBundle } from "@/lib/e2ee";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/collab/settings")({
  head: () => ({
    meta: [
      { title: "Hub settings — Student Hub | CodeRace" },
      { name: "description", content: "Personalise your chat appearance and manage the encryption key that protects your private conversations." },
      { property: "og:title", content: "Hub settings — Student Hub | CodeRace" },
      { property: "og:description", content: "Chat appearance and encryption key management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HubSettings,
});

const THEMES = ["default", "midnight", "forest", "sunset", "mono"];
const DENSITY = ["comfortable", "compact"];
const BUBBLES = ["rounded", "square", "minimal"];

function HubSettings() {
  const { user } = useAuth();
  const [fp, setFp] = useState("");
  const [bundle, setBundle] = useState("");
  const [prefs, setPrefs] = useState({ theme: "default", density: "comfortable", bubble_style: "rounded" });

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const k = await ensureDeviceKeys(user.id);
      setFp(k.fp);
      const { data } = await supabase.from("chat_appearance").select("theme, density, bubble_style").eq("user_id", user.id).maybeSingle();
      if (data) setPrefs({ theme: data.theme, density: data.density, bubble_style: data.bubble_style });
    })();
  }, [user]);

  const save = async (next: typeof prefs) => {
    if (!user) return;
    setPrefs(next);
    const { error } = await supabase.from("chat_appearance").upsert({ user_id: user.id, ...next });
    if (error) toast.error(error.message);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border hub-border hub-surface p-4">
        <h2 className="mb-3 font-semibold hub-text">Chat appearance</h2>
        <div className="space-y-4">
          {([["theme", THEMES], ["density", DENSITY], ["bubble_style", BUBBLES]] as const).map(([key, opts]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={key}>{key.replace("_", " ")}</Label>
              <select
                id={key}
                value={prefs[key]}
                onChange={(e) => save({ ...prefs, [key]: e.target.value })}
                className="w-full rounded-md border hub-border hub-deep px-3 py-2 text-sm hub-text"
              >
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border hub-border hub-surface p-4">
        <h2 className="mb-1 font-semibold hub-text">Encryption key</h2>
        <p className="mb-3 text-sm hub-text-dim">
          Your private key lives only on this device. Copy the bundle below to read your private messages on another device.
        </p>
        <p className="mb-3 font-mono text-xs text-primary">Fingerprint: {fp}</p>
        <div className="space-y-2">
          <Button size="sm" variant="outline" onClick={() => setBundle(exportDeviceKeyBundle(user!.id) || "")}>Show key bundle</Button>
          <Textarea value={bundle} onChange={(e) => setBundle(e.target.value)} className="min-h-[100px] font-mono text-[10px]" aria-label="Key bundle" />
          <Button
            size="sm"
            variant="neon"
            onClick={() => {
              try {
                importDeviceKeyBundle(user!.id, bundle);
                toast.success("Key restored on this device.");
              } catch {
                toast.error("That does not look like a valid key bundle.");
              }
            }}
          >
            Restore key on this device
          </Button>
        </div>
      </section>
    </div>
  );
}