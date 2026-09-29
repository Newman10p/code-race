import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { ensureDeviceKeys, encryptMessage, decryptMessage } from "@/lib/e2ee";
import { ChatSurface } from "@/components/chat/ChatSurface";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatAppearanceButton } from "@/components/chat/ChatAppearanceButton";
import { useChatAppearance } from "@/hooks/useChatAppearance";
import { Lock, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/collab/direct")({
  validateSearch: (search: Record<string, unknown>) => ({ user: typeof search.user === "string" ? search.user : undefined }),
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
  const { isSetter, isAdmin, isPatron } = useUserRole();
  const { user: requestedUser } = Route.useSearch();
  const { prefs, update, uploadWallpaper, removeWallpaper } = useChatAppearance();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [active, setActive] = useState<Convo | null>(null);
  const [keys, setKeys] = useState<{ privateKey: CryptoKey; fp: string } | null>(null);
  const [peerKey, setPeerKey] = useState<JsonWebKey | null>(null);
  const [items, setItems] = useState<{ id: string; sender_id: string; text: string | null; created_at: string }[]>([]);
  const [body, setBody] = useState("");
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const k = await ensureDeviceKeys(user.id);
      setKeys({ privateKey: k.privateKey, fp: k.fp });
      await supabase.from("user_public_keys").upsert({ user_id: user.id, public_key: k.publicKey as never, fingerprint: k.fp });
      const { data } = await supabase.from("dm_conversations").select("*").order("last_message_at", { ascending: false });
      setConvos((data || []) as Convo[]);
      if (isSetter || isAdmin) {
        const { data: members } = await supabase.from("collab_group_members").select("user_id, display_name");
        const unique = new Map((members || []).filter((m) => m.user_id !== user.id).map((m) => [m.user_id, { id: m.user_id, name: m.display_name || "Student" }]));
        setPeople([...unique.values()]);
      } else if (isPatron) {
        const { data: orgs } = await supabase.from("organizations").select("id").eq("patron_user_id", user.id);
        const ids = (orgs || []).map((o) => o.id);
        if (ids.length) {
          const { data: members } = await supabase.from("organization_members").select("user_id, full_name, email").in("organization_id", ids).not("user_id", "is", null);
          const unique = new Map((members || []).filter((m) => m.user_id && m.user_id !== user.id).map((m) => [m.user_id as string, { id: m.user_id as string, name: m.full_name || m.email }]));
          setPeople([...unique.values()]);
        }
      }
    })();
  }, [user, isSetter, isAdmin, isPatron]);

  useEffect(() => {
    if (!user) return;
    const ids = [...new Set([...convos.flatMap((c) => [c.user_a, c.user_b]), ...people.map((p) => p.id)])];
    void Promise.all(ids.map(async (id) => {
      const { data } = await supabase.rpc("chat_role_label", { _user: id });
      return [id, data] as const;
    })).then((entries) => setLabels(Object.fromEntries(entries.map(([id, label]) => [id, label ?? ""]))));
  }, [user, convos, people]);

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

  const startChat = async (id: string) => {
    if (!user || opening || id === user.id) return;
    const existing = convos.find((c) => (c.user_a === id && c.user_b === user.id) || (c.user_b === id && c.user_a === user.id));
    if (existing) { await openConvo(existing); return; }
    setOpening(true);
    const person = people.find((p) => p.id === id);
    const mine = user.user_metadata?.display_name || user.email || "User";
    const [a, b] = [user.id, id].sort();
    const { data, error } = await supabase.from("dm_conversations").insert({ user_a: a, user_b: b, user_a_name: a === user.id ? mine : person?.name || "Student", user_b_name: b === user.id ? mine : person?.name || "Student" }).select("*").single();
    if (error) {
      // Another device may have created the same conversation concurrently.
      const { data: found } = await supabase.from("dm_conversations").select("*").eq("user_a", a).eq("user_b", b).maybeSingle();
      if (found) { setConvos((prev) => [found as Convo, ...prev]); await openConvo(found as Convo); }
      else toast.error(error.message);
    } else if (data) { setConvos((prev) => [data as Convo, ...prev]); await openConvo(data as Convo); }
    setOpening(false);
  };

  useEffect(() => {
    if (requestedUser && (isSetter || isAdmin || isPatron) && people.some((p) => p.id === requestedUser)) void startChat(requestedUser);
    // A requested conversation should open only once when the directory arrives.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedUser, people.length]);

  useEffect(() => {
    if (!active) return;
    const channel = supabase.channel(`dm_${active.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${active.id}` }, () => void openConvo(active)).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [active, openConvo]);

  const send = async () => {
    if (!active || !keys || !peerKey || !body.trim() || !user) return;
    const text = body.trim();
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, sender_id: user.id, text, created_at: new Date().toISOString() }]);
    setBody("");
    const { ciphertext, iv } = await encryptMessage(keys.privateKey, peerKey, text);
    const { error } = await supabase.from("dm_messages").insert({ id, conversation_id: active.id, sender_id: user.id, ciphertext, iv });
    if (error) {
      setItems((prev) => prev.filter((m) => m.id !== id));
      setBody(text);
      toast.error(error.message);
    }
  };

  return (
    <div className="grid min-h-[65vh] gap-0 overflow-hidden rounded-lg border hub-border lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="border-b border-r-0 hub-border hub-surface p-3 lg:border-b-0 lg:border-r">
        <h2 className="mb-3 text-sm font-semibold hub-text">Private messages</h2>
        {(isSetter || isAdmin || isPatron) && <Input aria-label="Find a person" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a person…" className="mb-3" />}
        {people.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) && !convos.some((c) => c.user_a === p.id || c.user_b === p.id)).slice(0, 30).map((p) => (
          <Button key={p.id} variant="ghost" className="mb-1 w-full justify-start truncate" disabled={opening} onClick={() => void startChat(p.id)} title={`Message ${p.name}`}>
            <span className="truncate">{p.name}</span>{labels[p.id] && <span className="ml-auto shrink-0 text-xs text-primary">{labels[p.id]}</span>}
          </Button>
        ))}
        {convos.length === 0 && <p className="text-sm hub-text-dim">Accepted chat requests appear here.</p>}
        <ul className="space-y-1">
          {convos.map((c) => (
            <li key={c.id}>
              <Button variant="ghost" onClick={() => openConvo(c)} className={`w-full justify-start truncate text-left text-sm ${active?.id === c.id ? "bg-primary/15 text-primary" : "hub-text-dim"}`}>
                <span className="truncate">{other(c).name || "Student"}</span>
                {labels[other(c).id] && <ShieldCheck className="ml-auto h-4 w-4 shrink-0 text-primary" aria-label={labels[other(c).id]} />}
              </Button>
            </li>
          ))}
        </ul>
      </aside>

      <ChatSurface prefs={prefs} flat className="min-h-[60vh]">
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
                 {labels[other(active).id] && <p className="text-xs font-semibold text-primary">Verified {labels[other(active).id]}</p>}
              </div>
              <ChatAppearanceButton prefs={prefs} onChange={update} onUploadWallpaper={uploadWallpaper} onRemoveWallpaper={removeWallpaper} />
            </header>
             {(labels[other(active).id] || labels[user?.id || ""]) && <p className="border-b border-border bg-primary/10 px-4 py-2 text-xs text-foreground">Official communication · School conduct guidelines apply to everyone in this conversation.</p>}
            <div className="chat-scroll">
              {items.map((m) => (
                <ChatBubble
                  key={m.id}
                  mine={m.sender_id === user?.id}
                  name={m.sender_id === user?.id ? "You" : other(active).name || "Student"}
                   meta={labels[m.sender_id] ? <span className="chat-chip chat-chip--on">{labels[m.sender_id]}</span> : null}
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
                 <Button type="button" onClick={send} disabled={!body.trim() || !peerKey} aria-label="Send" size="icon" variant="neon" className="chat-send">
                  <Send className="h-4 w-4" />
                 </Button>
              </div>
            </div>
          </>
        )}
      </ChatSurface>
    </div>
  );
}
