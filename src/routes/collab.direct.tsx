import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ensureDeviceKeys, encryptMessage, decryptMessage } from "@/lib/e2ee";
import { ChatSurface } from "@/components/chat/ChatSurface";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatAppearanceButton } from "@/components/chat/ChatAppearanceButton";
import { useChatAppearance } from "@/hooks/useChatAppearance";
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
  const { prefs, update } = useChatAppearance();
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

      <ChatSurface prefs={prefs} className="min-h-[55vh]">
        {!active ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm chat-dim">Select a conversation.</p>
          </div>
        ) : (
          <>
            <header className="chat-header">
              <Lock className="h-4 w-4" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold chat-strong">{other(active).name || "Student"}</p>
                <p className="truncate text-xs chat-dim">Encrypted in your browser — the server stores ciphertext only.</p>
              </div>
              <ChatAppearanceButton prefs={prefs} onChange={update} />
            </header>
            <div className="chat-scroll">
              {items.map((m) => (
                <ChatBubble
                  key={m.id}
                  mine={m.sender_id === user?.id}
                  name={m.sender_id === user?.id ? "You" : other(active).name || "Student"}
                  time={new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                >
                  {m.text ?? <span className="italic opacity-70">Cannot decrypt on this device</span>}
                </ChatBubble>
              ))}
              {items.length === 0 && <p className="py-10 text-center text-sm chat-dim">No messages yet.</p>}
            </div>
            <div className="chat-composer">
              <div className="flex items-end gap-2">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
                  }}
                  placeholder="Encrypted message…"
                  className="chat-input min-h-[52px]"
                  aria-label="Message"
                />
                <button type="button" onClick={send} disabled={!body.trim() || !peerKey} aria-label="Send" className="chat-send">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </ChatSurface>
    </div>
  );
}
