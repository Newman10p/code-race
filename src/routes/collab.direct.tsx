import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ensureDeviceKeys, encryptMessage, decryptMessage } from "@/lib/e2ee";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/collab/direct")({
  head: () => ({
    meta: [
      { title: "Private messages — Student Hub | CodeRace" },
      { name: "description", content: "End-to-end encrypted one-to-one conversations: messages are encrypted in your browser and stored as ciphertext only." },
      { property: "og:title", content: "Private messages — Student Hub | CodeRace" },
      { property: "og:description", content: "Encrypted one-to-one student conversations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DirectPage,
});

interface Convo { id: string; user_a: string; user_b: string; user_a_name: string | null; user_b_name: string | null }

function DirectPage() {
  const { user } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [active, setActive] = useState<Convo | null>(null);
  const [keys, setKeys] = useState<{ privateKey: CryptoKey; fp: string } | null>(null);
  const [peerKey, setPeerKey] = useState<JsonWebKey | null>(null);
  const [items, setItems] = useState<{ id: string; sender_id: string; text: string | null; created_at: string }[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const k = await ensureDeviceKeys(user.id);
      setKeys({ privateKey: k.privateKey, fp: k.fp });
      await supabase.from("user_public_keys").upsert({ user_id: user.id, public_key: k.publicKey as never, fingerprint: k.fp });
      const { data } = await supabase.from("dm_conversations").select("*").order("last_message_at", { ascending: false });
      setConvos((data || []) as Convo[]);
    })();
  }, [user]);

  const other = (c: Convo) => (c.user_a === user?.id ? { id: c.user_b, name: c.user_b_name } : { id: c.user_a, name: c.user_a_name });

  const openConvo = useCallback(async (c: Convo) => {
    setActive(c);
    const peer = other(c);
    const { data: pk } = await supabase.from("user_public_keys").select("public_key").eq("user_id", peer.id).maybeSingle();
    setPeerKey((pk?.public_key as JsonWebKey) ?? null);
    const { data: msgs } = await supabase.from("dm_messages").select("*").eq("conversation_id", c.id).order("created_at", { ascending: true });
    if (!keys || !pk?.public_key) { setItems([]); return; }
    const decoded = await Promise.all((msgs || []).map(async (m) => ({
      id: m.id,
      sender_id: m.sender_id,
      created_at: m.created_at,
      text: await decryptMessage(keys.privateKey, pk.public_key as JsonWebKey, m.ciphertext, m.iv),
    })));
    setItems(decoded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, user]);

  const send = async () => {
    if (!active || !keys || !peerKey || !body.trim() || !user) return;
    const { ciphertext, iv } = await encryptMessage(keys.privateKey, peerKey, body.trim());
    const { error } = await supabase.from("dm_messages").insert({ conversation_id: active.id, sender_id: user.id, ciphertext, iv });
    if (error) return toast.error(error.message);
    setBody("");
    void openConvo(active);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-xl border hub-border hub-surface p-3">
        <h2 className="mb-2 text-sm font-semibold hub-text">Conversations</h2>
        {convos.length === 0 && <p className="text-sm hub-text-dim">Accepted chat requests appear here.</p>}
        <ul className="space-y-1">
          {convos.map((c) => (
            <li key={c.id}>
              <button onClick={() => openConvo(c)} className={`w-full truncate rounded px-2 py-1.5 text-left text-sm ${active?.id === c.id ? "bg-primary/15 text-primary" : "hub-text-dim hover:bg-white/5"}`}>
                {other(c).name || "Student"}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-[55vh] flex-col rounded-xl border hub-border hub-surface">
        {!active ? (
          <p className="m-auto text-sm hub-text-dim">Select a conversation.</p>
        ) : (
          <>
            <header className="flex items-center gap-2 border-b hub-border px-4 py-3">
              <Lock className="h-4 w-4 text-primary" aria-hidden />
              <div>
                <p className="text-sm font-semibold hub-text">{other(active).name || "Student"}</p>
                <p className="text-xs hub-text-dim">Encrypted in your browser — the server stores ciphertext only.</p>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {items.map((m) => (
                <div key={m.id} className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${m.sender_id === user?.id ? "ml-auto bg-primary text-primary-foreground" : "hub-elevated hub-text"}`}>
                  {m.text ?? <span className="italic opacity-70">Cannot decrypt on this device</span>}
                </div>
              ))}
              {items.length === 0 && <p className="text-sm hub-text-dim">No messages yet.</p>}
            </div>
            <div className="flex items-end gap-2 border-t hub-border p-3">
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Encrypted message…" className="min-h-[52px]" aria-label="Message" />
              <Button variant="neon" onClick={send} disabled={!body.trim() || !peerKey} aria-label="Send"><Send className="h-4 w-4" /></Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}