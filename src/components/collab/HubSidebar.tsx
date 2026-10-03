import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/lib/chat-theme";
import { cn } from "@/lib/utils";
import { Search, Users, Lock } from "lucide-react";

type Item = { key: string; kind: "group" | "dm"; name: string; id: string; at: string };

export function HubSidebar({ className }: { className?: string }) {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "group" | "dm">("all");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data: mem } = await supabase.from("collab_group_members").select("group_id").eq("user_id", user.id);
      const ids = (mem || []).map((m) => m.group_id);
      const { data: groups } = ids.length
        ? await supabase.from("collab_groups").select("id, name, updated_at").in("id", ids)
        : { data: [] as { id: string; name: string; updated_at: string }[] };
      const { data: dms } = await supabase.from("dm_conversations").select("*").order("last_message_at", { ascending: false });
      const list: Item[] = [
        ...(groups || []).map((g) => ({ key: `g${g.id}`, kind: "group" as const, name: g.name, id: g.id, at: g.updated_at })),
        ...(dms || []).map((c) => {
          const mineA = c.user_a === user.id;
          return { key: `d${c.id}`, kind: "dm" as const, name: (mineA ? c.user_b_name : c.user_a_name) || "Student", id: mineA ? c.user_b : c.user_a, at: c.last_message_at };
        }),
      ].sort((a, b) => b.at.localeCompare(a.at));
      setItems(list);
    })();
  }, [user, pathname]);

  const activeUser = (search as { user?: string }).user;
  const shown = items.filter((i) => (filter === "all" || i.kind === filter) && i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <aside className={cn("flex min-h-0 flex-col rounded-2xl border hub-border hub-surface", className)}>
      <div className="space-y-3 border-b hub-border p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 hub-text-dim" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats…" aria-label="Search chats"
            className="w-full rounded-full border hub-border hub-deep py-2 pl-9 pr-3 text-sm hub-text outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <div className="flex gap-2">
          {(["all", "group", "dm"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={cn("rounded-full px-3 py-1 text-xs font-medium", filter === f ? "hub-tab-active" : "hub-text-dim hover:text-primary")}>
              {f === "all" ? "All" : f === "group" ? "Groups" : "Direct"}
            </button>
          ))}
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto p-2">
        {shown.length === 0 && <li className="p-6 text-center text-sm hub-text-dim">No chats yet. Join a group or start a conversation.</li>}
        {shown.map((i) => {
          const active = i.kind === "group" ? pathname === `/collab/g/${i.id}` : pathname.startsWith("/collab/direct") && activeUser === i.id;
          const inner = (
            <>
              <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold text-primary-foreground",
                i.kind === "group" ? "bg-gradient-to-br from-primary to-emerald-500" : "bg-gradient-to-br from-amber-500 to-primary",
                active && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>{initials(i.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold hub-text">{i.name}</span>
                <span className="flex items-center gap-1 text-xs hub-text-dim">
                  {i.kind === "group" ? <Users className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                  {i.kind === "group" ? "Group chat" : "Encrypted chat"}
                </span>
              </span>
              <time className="shrink-0 text-[10px] hub-text-dim">{new Date(i.at).toLocaleDateString([], { month: "short", day: "numeric" })}</time>
            </>
          );
          const cls = cn("flex items-center gap-3 rounded-xl p-2 transition-colors", active ? "bg-primary/15" : "hover:bg-primary/5");
          return (
            <li key={i.key}>
              {i.kind === "group"
                ? <Link to="/collab/g/$groupId" params={{ groupId: i.id }} className={cls}>{inner}</Link>
                : <Link to="/collab/direct" search={{ user: i.id }} className={cls}>{inner}</Link>}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
