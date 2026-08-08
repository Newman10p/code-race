import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { myDisplayName, REPORT_CATEGORIES } from "@/lib/collab";
import { CodeBlock, detectLanguage } from "@/components/collab/CodeBlock";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Code2, CornerUpLeft, Flag, Pin, Send, Smile, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/collab/g/$groupId")({
  head: () => ({
    meta: [
      { title: "Group chat — Student Hub | CodeRace" },
      { name: "description", content: "Chat with your group, share runnable code snippets, pin key answers and collaborate on projects." },
      { property: "og:title", content: "Group chat — Student Hub | CodeRace" },
      { property: "og:description", content: "Share code, pin answers and collaborate with your class." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupChat,
});

interface Msg {
  id: string;
  body: string;
  kind: string;
  code_language: string | null;
  code_filename: string | null;
  sender_id: string;
  sender_name: string;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  is_pinned: boolean;
  reply_to_id: string | null;
}

const EMOJI = ["👍", "🎉", "🔥", "💡", "❓", "✅"];

function GroupChat() {
  const { groupId } = Route.useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState<{ name: string; status: string; description: string | null } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [reactions, setReactions] = useState<{ message_id: string; emoji: string; user_id: string }[]>([]);
  const [members, setMembers] = useState<{ user_id: string; display_name: string | null; role: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [body, setBody] = useState("");
  const [codeMode, setCodeMode] = useState(false);
  const [filename, setFilename] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [sending, setSending] = useState(false);
  const [reportOn, setReportOn] = useState<Msg | null>(null);
  const [reportCat, setReportCat] = useState<string>(REPORT_CATEGORIES[0]);
  const [reportNote, setReportNote] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const isMod = role === "owner" || role === "moderator" || role === "patron";

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: g }, { data: mem }, { data: msgs }] = await Promise.all([
      supabase.from("collab_groups").select("name, status, description").eq("id", groupId).maybeSingle(),
      supabase.from("collab_group_members").select("user_id, display_name, role").eq("group_id", groupId),
      supabase.from("collab_messages").select("*").eq("group_id", groupId).order("created_at", { ascending: true }).limit(300),
    ]);
    setGroup(g ?? null);
    setMembers(mem || []);
    setRole((mem || []).find((m) => m.user_id === user.id)?.role ?? null);
    setMessages((msgs || []) as Msg[]);
    const ids = (msgs || []).map((m) => m.id);
    if (ids.length) {
      const { data: rx } = await supabase.from("collab_reactions").select("message_id, emoji, user_id").in("message_id", ids);
      setReactions(rx || []);
    }
    setLoading(false);
  }, [groupId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`collab_group_${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_messages", filter: `group_id=eq.${groupId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_reactions" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [groupId, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    if (!body.trim() || !user) return;
    setSending(true);
    const name = await myDisplayName(user.id, user.email);
    const fenced = body.trim().match(/^```(\w+)?\n([\s\S]*?)```$/);
    const isCode = codeMode || !!fenced;
    const text = fenced ? fenced[2] : body.trim();
    const { error } = await supabase.from("collab_messages").insert({
      group_id: groupId,
      sender_id: user.id,
      sender_name: name,
      body: text,
      kind: isCode ? "code" : "text",
      code_language: isCode ? (fenced?.[1] || detectLanguage(text)) : null,
      code_filename: isCode && filename.trim() ? filename.trim() : null,
      reply_to_id: replyTo?.id ?? null,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setBody("");
    setFilename("");
    setReplyTo(null);
    setCodeMode(false);
  };

  const react = async (messageId: string, emoji: string) => {
    if (!user) return;
    const mine = reactions.find((r) => r.message_id === messageId && r.emoji === emoji && r.user_id === user.id);
    if (mine) {
      await supabase.from("collab_reactions").delete().eq("message_id", messageId).eq("emoji", emoji).eq("user_id", user.id);
    } else {
      await supabase.from("collab_reactions").insert({ message_id: messageId, emoji, user_id: user.id });
    }
    void load();
  };

  const togglePin = async (m: Msg) => {
    await supabase.from("collab_messages").update({ is_pinned: !m.is_pinned }).eq("id", m.id);
    void load();
  };

  const remove = async (m: Msg) => {
    await supabase.from("collab_messages").update({ deleted_at: new Date().toISOString() }).eq("id", m.id);
    void load();
  };

  const submitReport = async () => {
    if (!reportOn || !user) return;
    const name = await myDisplayName(user.id, user.email);
    const { error } = await supabase.from("collab_reports").insert({
      reporter_id: user.id,
      reporter_name: name,
      category: reportCat,
      description: reportNote.trim() || null,
      evidence: reportOn.body.slice(0, 2000),
      evidence_submitted_by_reporter: true,
      target_type: "message",
      target_id: reportOn.id,
      target_label: `${reportOn.sender_name} in ${group?.name ?? "group"}`,
      severity: "normal",
    });
    if (error) return toast.error(error.message);
    setReportOn(null);
    setReportNote("");
    toast.success("Report sent to your school administrator.");
  };

  if (loading) return <p className="py-16 text-center text-sm hub-text-dim">Loading conversation…</p>;
  if (!group) return <p className="py-16 text-center text-sm hub-text-dim">This group is not available to you.</p>;

  const pinned = messages.filter((m) => m.is_pinned && !m.deleted_at);
  const frozen = group.status === "frozen";

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="flex min-h-[60vh] flex-col rounded-xl border hub-border hub-surface">
        <header className="flex items-center gap-3 border-b hub-border px-4 py-3">
          <Link to="/collab/groups" aria-label="Back to groups" className="rounded p-1 hub-text-dim hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h2 className="truncate font-semibold hub-text">{group.name}</h2>
            <p className="truncate text-xs hub-text-dim">{members.length} members{frozen ? " · messaging restricted" : ""}</p>
          </div>
        </header>

        {pinned.length > 0 && (
          <div className="border-b hub-border px-4 py-2">
            <p className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Pin className="h-3 w-3" aria-hidden /> Pinned
            </p>
            {pinned.slice(-2).map((m) => (
              <p key={m.id} className="truncate text-xs hub-text-dim">{m.sender_name}: {m.body}</p>
            ))}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 && <p className="py-10 text-center text-sm hub-text-dim">No messages yet — start the conversation.</p>}
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            const parent = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;
            const mrx = reactions.filter((r) => r.message_id === m.id);
            if (m.deleted_at) {
              return <p key={m.id} className="text-xs italic hub-text-dim">Message removed.</p>;
            }
            return (
              <article key={m.id} className="group">
                <div className="flex items-baseline gap-2">
                  <span className={`text-sm font-semibold ${mine ? "text-primary" : "hub-text"}`}>{m.sender_name}</span>
                  <time className="text-[11px] hub-text-dim">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
                  {m.edited_at && <span className="text-[11px] hub-text-dim">(edited)</span>}
                </div>
                {parent && (
                  <p className="mt-1 border-l-2 border-primary/40 pl-2 text-xs hub-text-dim">
                    replying to {parent.sender_name}: {parent.body.slice(0, 80)}
                  </p>
                )}
                {m.kind === "code" ? (
                  <CodeBlock code={m.body} language={m.code_language} filename={m.code_filename} />
                ) : (
                  <p className="whitespace-pre-wrap text-sm hub-text">{m.body}</p>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {EMOJI.map((e) => {
                    const count = mrx.filter((r) => r.emoji === e).length;
                    if (!count) return null;
                    const active = mrx.some((r) => r.emoji === e && r.user_id === user?.id);
                    return (
                      <button key={e} onClick={() => react(m.id, e)} aria-label={`React ${e}`} className={`rounded-full border px-2 py-0.5 text-xs ${active ? "border-primary text-primary" : "hub-border hub-text-dim"}`}>
                        {e} {count}
                      </button>
                    );
                  })}
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    {EMOJI.map((e) => (
                      <button key={e} onClick={() => react(m.id, e)} aria-label={`Add reaction ${e}`} className="rounded p-1 text-xs hover:bg-white/10">{e}</button>
                    ))}
                    <button onClick={() => setReplyTo(m)} aria-label="Reply" className="rounded p-1 hub-text-dim hover:bg-white/10 hover:text-white"><CornerUpLeft className="h-3.5 w-3.5" /></button>
                    {isMod && <button onClick={() => togglePin(m)} aria-label="Pin message" className="rounded p-1 hub-text-dim hover:bg-white/10 hover:text-white"><Pin className="h-3.5 w-3.5" /></button>}
                    {(mine || isMod) && <button onClick={() => remove(m)} aria-label="Delete message" className="rounded p-1 hub-text-dim hover:bg-white/10 hover:text-white"><Trash2 className="h-3.5 w-3.5" /></button>}
                    {!mine && <button onClick={() => setReportOn(m)} aria-label="Report message" className="rounded p-1 hub-text-dim hover:bg-white/10 hover:text-white"><Flag className="h-3.5 w-3.5" /></button>}
                  </div>
                </div>
              </article>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="border-t hub-border p-3">
          {replyTo && (
            <div className="mb-2 flex items-center justify-between rounded border hub-border px-2 py-1 text-xs hub-text-dim">
              <span className="truncate">Replying to {replyTo.sender_name}</span>
              <button onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X className="h-3 w-3" /></button>
            </div>
          )}
          {codeMode && (
            <Input value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="filename (optional), e.g. solution.py" className="mb-2" />
          )}
          <div className="flex items-end gap-2">
            <Button type="button" size="sm" variant={codeMode ? "neon" : "outline"} onClick={() => setCodeMode((v) => !v)} aria-pressed={codeMode}>
              <Code2 className="h-4 w-4" /> Code
            </Button>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !codeMode) {
                  e.preventDefault();
                  void send();
                }
              }}
              disabled={frozen && !isMod}
              placeholder={frozen && !isMod ? "Messaging is temporarily restricted" : codeMode ? "Paste your code…" : "Message your group… (``` for code)"}
              className={codeMode ? "min-h-[120px] font-mono text-xs" : "min-h-[52px]"}
              aria-label="Message"
            />
            <Button variant="neon" onClick={send} disabled={sending || !body.trim() || (frozen && !isMod)} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <aside className="h-fit rounded-xl border hub-border hub-surface p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold hub-text"><Smile className="h-4 w-4 text-primary" aria-hidden /> Members</h3>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate hub-text">{m.display_name || "Student"}</span>
              {m.role !== "member" && <span className="shrink-0 text-[10px] uppercase text-primary">{m.role}</span>}
            </li>
          ))}
        </ul>
      </aside>

      <Dialog open={!!reportOn} onOpenChange={(o) => !o && setReportOn(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report this message</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="rc">Category</Label>
              <Select value={reportCat} onValueChange={setReportCat}>
                <SelectTrigger id="rc"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REPORT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rn">What happened?</Label>
              <Textarea id="rn" value={reportNote} onChange={(e) => setReportNote(e.target.value)} maxLength={1000} />
            </div>
            <p className="text-xs hub-text-dim">Your report goes to your school administrator. The reported message is attached as evidence.</p>
            <Button variant="neon" className="w-full" onClick={submitReport}>Send report</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}