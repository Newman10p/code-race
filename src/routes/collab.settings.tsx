import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ensureDeviceKeys, exportDeviceKeyBundle, importDeviceKeyBundle } from "@/lib/e2ee";
import { ChatAppearancePanel } from "@/components/chat/ChatAppearancePanel";
import { ChatSurface } from "@/components/chat/ChatSurface";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { useChatAppearance } from "@/hooks/useChatAppearance";
import { Button } from "@/components/ui/button";
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

function HubSettings() {
  const { user } = useAuth();
  const { prefs, update, uploadWallpaper, removeWallpaper } = useChatAppearance();
  const [fp, setFp] = useState("");
  const [bundle, setBundle] = useState("");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const k = await ensureDeviceKeys(user.id);
      setFp(k.fp);
    })();
  }, [user]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border hub-border hub-surface p-4">
        <h2 className="mb-1 font-semibold hub-text">Chat appearance</h2>
        <p className="mb-4 text-sm hub-text-dim">These settings follow you across every chat in the hub.</p>
        <ChatAppearancePanel prefs={prefs} onChange={update} onUploadWallpaper={uploadWallpaper} onRemoveWallpaper={removeWallpaper} />
      </section>

      <div className="space-y-6">
        <section className="rounded-xl border hub-border hub-surface p-4">
          <h2 className="mb-3 font-semibold hub-text">Live preview</h2>
          <ChatSurface prefs={prefs} className="h-[260px]">
            <div className="chat-scroll">
              <ChatBubble mine={false} name="Amina K" time="09:12">
                Did you finish the loops exercise?
              </ChatBubble>
              <ChatBubble mine name="You" time="09:13">
                Almost — my while loop never stops 😅
              </ChatBubble>
              <ChatBubble mine={false} name="Amina K" time="09:14">
                Check your counter, you never increase it.
              </ChatBubble>
            </div>
          </ChatSurface>
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
    </div>
  );
}
