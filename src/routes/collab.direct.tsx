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
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-indigo-500" />
          Conversations
        </h2>
        {convos.length === 0 && (
          <div className="text-center py-8">
            <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Accepted chat requests appear here</p>
          </div>
        )}
        <ul className="space-y-1.5">
          {convos.map((c) => (
            <li key={c.id}>
              <button 
                onClick={() => openConvo(c)} 
                className={`w-full truncate rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                  active?.id === c.id 
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/20" 
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${active?.id === c.id ? "bg-white" : "bg-indigo-500"}`} />
                  {other(c).name || "Student"}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="flex min-h-[60vh] flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        {!active ? (
          <div className="m-auto text-center py-20">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-500 dark:text-slate-400">Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md">
                <Lock className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{other(active).name || "Student"}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    End-to-end encrypted
                  </span>
                </p>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto p-5 bg-slate-50 dark:bg-slate-900/50">
              {items.map((m, idx) => {
                const isMine = m.sender_id === user?.id;
                const showAvatar = idx === 0 || items[idx - 1]?.sender_id !== m.sender_id;
                return (
                  <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`flex items-end gap-2 max-w-[75%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                      {showAvatar && (
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isMine 
                            ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white" 
                            : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        }`}>
                          {(other(active).name || "S").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                        isMine 
                          ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-br-md" 
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md"
                      }`}>
                        {m.text ?? (
                          <span className="italic opacity-70 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Cannot decrypt
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet — say hello! 👋</p>
                </div>
              )}
            </div>
            <div className="flex items-end gap-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <Textarea 
                value={body} 
                onChange={(e) => setBody(e.target.value)} 
                placeholder="Type your encrypted message..." 
                className="min-h-[56px] flex-1 resize-none border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl" 
                aria-label="Message"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button 
                
                onClick={send} 
                disabled={!body.trim() || !peerKey} 
                aria-label="Send"
                className="h-[56px] w-[56px] rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 shadow-lg shadow-indigo-500/25"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}