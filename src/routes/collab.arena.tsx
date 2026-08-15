import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { myDisplayName } from "@/lib/collab";
import { CodeRunner } from "@/components/code/CodeRunner";
import { CodeBlock } from "@/components/collab/CodeBlock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Flag, Medal, Plus, Timer, Trophy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/collab/arena")({
  head: () => ({
    meta: [
      { title: "Code arena — Student Hub | CodeRace" },
      { name: "description", content: "Run mini coding competitions with your group: timed sprints, live leaderboards and XP badges." },
      { property: "og:title", content: "Code arena — Student Hub | CodeRace" },
      { property: "og:description", content: "Timed group coding sprints with live leaderboards and XP." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Arena,
});

interface Comp {
  id: string;
  group_id: string;
  created_by: string;
  creator_name: string;
  title: string;
  brief: string;
  language: string;
  starter_code: string;
  duration_minutes: number;
  status: string;
  started_at: string | null;
  ends_at: string | null;
}

interface Entry {
  id: string;
  competition_id: string;
  user_id: string;
  user_name: string;
  code: string;
  output: string | null;
  passed: boolean;
  score: number;
  elapsed_seconds: number;
  submitted_at: string | null;
}

const STARTERS: Record<string, string> = {
  javascript: "// Solve the brief, run it, then submit.\n",
  python: "# Solve the brief, run it, then submit.\n",
  html: "<!doctype html>\n<html>\n  <body>\n  </body>\n</html>\n",
};

function fmt(sec: number) {
  const m = Math.max(0, Math.floor(sec / 60));
  const s = Math.max(0, sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Arena() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<{ id: string; name: string; role: string }[]>([]);
  const [comps, setComps] = useState<Comp[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [points, setPoints] = useState<{ user_id: string; display_name: string; xp: number; badges: string[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now());

  const [form, setForm] = useState({ group_id: "", title: "", brief: "", language: "javascript", duration_minutes: 15 });
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: mem } = await supabase
      .from("collab_group_members")
      .select("group_id, role")
      .eq("user_id", user.id);
    const ids = (mem || []).map((m) => m.group_id);
    if (!ids.length) {
      setGroups([]);
      setComps([]);
      setLoading(false);
      return;
    }
    const [{ data: gs }, { data: cs }, { data: pts }] = await Promise.all([
      supabase.from("collab_groups").select("id, name").in("id", ids),
      supabase.from("collab_competitions").select("*").in("group_id", ids).order("created_at", { ascending: false }),
      supabase.from("collab_points").select("user_id, display_name, xp, badges").order("xp", { ascending: false }).limit(10),
    ]);
    const withRole = (gs || []).map((g) => ({
      id: g.id,
      name: g.name,
      role: (mem || []).find((m) => m.group_id === g.id)?.role || "member",
    }));
    setGroups(withRole);
    setComps((cs || []) as Comp[]);
    setPoints(((pts || []) as any[]).map((p) => ({ ...p, badges: Array.isArray(p.badges) ? p.badges : [] })));
    const compIds = (cs || []).map((c) => c.id);
    if (compIds.length) {
      const { data: es } = await supabase.from("collab_competition_entries").select("*").in("competition_id", compIds);
      setEntries((es || []) as Entry[]);
    } else {
      setEntries([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("collab_arena")
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_competitions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "collab_competition_entries" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [load]);

  const open = comps.find((c) => c.id === openId) || null;
  const myEntry = open ? entries.find((e) => e.competition_id === open.id && e.user_id === user?.id) || null : null;

  useEffect(() => {
    if (open) setCode(myEntry?.code || open.starter_code || STARTERS[open.language] || "");
  }, [openId]); // eslint-disable-line react-hooks/exhaustive-deps

  const manages = (groupId: string) => {
    const r = groups.find((g) => g.id === groupId)?.role;
    return r === "owner" || r === "moderator" || r === "patron";
  };

  const create = async () => {
    if (!user || !form.group_id || !form.title.trim()) return;
    const name = await myDisplayName(user.id, user.email);
    const { error } = await supabase.from("collab_competitions").insert({
      group_id: form.group_id,
      created_by: user.id,
      creator_name: name,
      title: form.title.trim(),
      brief: form.brief.trim(),
      language: form.language,
      starter_code: STARTERS[form.language] || "",
      duration_minutes: Number(form.duration_minutes) || 15,
      status: "draft",
    });
    if (error) return toast.error(error.message);
    setCreating(false);
    setForm({ group_id: form.group_id, title: "", brief: "", language: "javascript", duration_minutes: 15 });
    toast.success("Competition created — start it when everyone is ready.");
    void load();
  };

  const start = async (c: Comp) => {
    const startedAt = new Date();
    const ends = new Date(startedAt.getTime() + c.duration_minutes * 60000);
    const { error } = await supabase
      .from("collab_competitions")
      .update({ status: "live", started_at: startedAt.toISOString(), ends_at: ends.toISOString() })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    void load();
  };

  const end = async (c: Comp) => {
    const { error } = await supabase.from("collab_competitions").update({ status: "ended" }).eq("id", c.id);
    if (error) return toast.error(error.message);
    void load();
  };

  const submit = async () => {
    if (!user || !open) return;
    if (open.status !== "live") return toast.error("This sprint is not live.");
    setSubmitting(true);
    const name = await myDisplayName(user.id, user.email);
    const started = open.started_at ? new Date(open.started_at).getTime() : Date.now();
    const elapsed = Math.max(1, Math.round((Date.now() - started) / 1000));
    const cleanRun = !!output && !/error/i.test(output);
    const speedBonus = Math.max(0, 100 - Math.floor(elapsed / Math.max(1, open.duration_minutes * 60 / 100)));
    const score = (cleanRun ? 100 : 40) + speedBonus;

    const { error } = await supabase.from("collab_competition_entries").upsert(
      {
        competition_id: open.id,
        user_id: user.id,
        user_name: name,
        code,
        output: output.slice(0, 4000),
        passed: cleanRun,
        score,
        elapsed_seconds: elapsed,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "competition_id,user_id" },
    );
    if (error) {
      setSubmitting(false);
      return toast.error(error.message);
    }

    const { data: existing } = await supabase.from("collab_points").select("xp, badges").eq("user_id", user.id).maybeSingle();
    const gained = cleanRun ? 50 : 20;
    const badges: string[] = Array.isArray(existing?.badges) ? (existing!.badges as string[]) : [];
    const isFirst = !entries.some((e) => e.competition_id === open.id && e.submitted_at);
    if (isFirst && !badges.includes("First finisher")) badges.push("First finisher");
    if (!badges.includes("Sprinter")) badges.push("Sprinter");
    await supabase.from("collab_points").upsert(
      { user_id: user.id, display_name: name, xp: (existing?.xp ?? 0) + gained, badges },
      { onConflict: "user_id" },
    );

    setSubmitting(false);
    toast.success(`Submitted — +${gained} XP`);
    void load();
  };

  const board = useMemo(() => {
    if (!open) return [] as Entry[];
    return entries
      .filter((e) => e.competition_id === open.id && e.submitted_at)
      .sort((a, b) => b.score - a.score || a.elapsed_seconds - b.elapsed_seconds);
  }, [entries, open]);

  const remaining = open?.ends_at ? Math.round((new Date(open.ends_at).getTime() - now) / 1000) : 0;

  if (loading) return <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">Loading the arena…</p>;

  if (open) {
    const liveOver = open.status === "live" && remaining <= 0;
    return (
      <div className="space-y-4">
        <button onClick={() => setOpenId(null)} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to arena
        </button>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{open.title}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {groups.find((g) => g.id === open.group_id)?.name} · set by {open.creator_name} · {open.language}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {open.status === "live" && !liveOver && (
                <span className="flex items-center gap-1 rounded-full border border-indigo-500/50 px-3 py-1 text-sm font-mono text-indigo-600 dark:text-indigo-400">
                  <Timer className="h-4 w-4" aria-hidden /> {fmt(remaining)}
                </span>
              )}
              {open.status === "draft" && manages(open.group_id) && (
                <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25" size="sm" onClick={() => start(open)}>Start sprint</Button>
              )}
              {open.status === "live" && manages(open.group_id) && (
                <Button className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700" size="sm" onClick={() => end(open)}><Flag className="h-4 w-4" /> End</Button>
              )}
              {open.status === "ended" && <span className="text-xs uppercase text-slate-500 dark:text-slate-400">Ended</span>}
            </div>
          </div>
          {open.brief && <p className="mt-3 whitespace-pre-wrap text-sm text-slate-500 dark:text-slate-400">{open.brief}</p>}
        </div>

        {open.status !== "draft" && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <CodeRunner
              language={open.language}
              code={code}
              onCodeChange={setCode}
              tests={[]}
              testMode="io"
              height="360px"
              showPreview={open.language === "html"}
              disabled={open.status !== "live" || liveOver}
              onResult={() => undefined}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Textarea
                value={output}
                onChange={(e) => setOutput(e.target.value)}
                placeholder="Paste your run output here before submitting (helps peers review your result)"
                className="min-h-[52px] flex-1 font-mono text-xs"
                aria-label="Run output"
              />
              <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25" onClick={submit} disabled={submitting || open.status !== "live" || liveOver}>
                {myEntry ? "Resubmit" : "Submit entry"}
              </Button>
            </div>
            {myEntry && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Your score: {myEntry.score} · finished in {fmt(myEntry.elapsed_seconds)}</p>}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100"><Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden /> Leaderboard</h3>
          {board.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No submissions yet.</p>}
          <ol className="space-y-3">
            {board.map((e, i) => (
              <li key={e.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{i + 1}. {e.user_name}</span>
                  <span className="text-slate-500 dark:text-slate-400">{e.score} pts · {fmt(e.elapsed_seconds)}</span>
                </div>
                {open.status === "ended" && <div className="mt-2"><CodeBlock code={e.code} language={open.language} filename={null} /></div>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Code arena</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Mini coding competitions inside your groups — timed sprints, live leaderboards and XP.</p>
        </div>
        <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25" onClick={() => setCreating(true)} disabled={!groups.some((g) => manages(g.id))}>
          <Plus className="h-4 w-4" /> New competition
        </Button>
      </div>

      {groups.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Join a group first to take part in competitions.</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {comps.map((c) => {
          const count = entries.filter((e) => e.competition_id === c.id && e.submitted_at).length;
          return (
            <button
              key={c.id}
              onClick={() => setOpenId(c.id)}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-left transition-colors hover:border-primary/60"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate font-semibold text-slate-800 dark:text-slate-100">{c.title}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase ${c.status === "live" ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {c.status}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{c.brief || "No brief provided."}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {groups.find((g) => g.id === c.group_id)?.name} · {c.language} · {c.duration_minutes} min · {count} submissions
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100"><Medal className="h-4 w-4 text-indigo-600 dark:text-indigo-400" aria-hidden /> Hub XP leaders</h3>
        {points.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No XP earned yet — be the first to finish a sprint.</p>}
        <ol className="space-y-2">
          {points.map((p, i) => (
            <li key={p.user_id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-slate-800 dark:text-slate-100">{i + 1}. {p.display_name}</span>
              <span className="text-slate-500 dark:text-slate-400">{p.xp} XP{p.badges.length ? ` · ${p.badges.join(", ")}` : ""}</span>
            </li>
          ))}
        </ol>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New mini competition</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cg">Group</Label>
              <select
                id="cg"
                value={form.group_id}
                onChange={(e) => setForm({ ...form, group_id: e.target.value })}
                className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
              >
                <option value="">Select a group…</option>
                {groups.filter((g) => manages(g.id)).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct">Title</Label>
              <Input id="ct" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cb">Brief</Label>
              <Textarea id="cb" value={form.brief} onChange={(e) => setForm({ ...form, brief: e.target.value })} maxLength={2000} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cl">Language</Label>
                <select
                  id="cl"
                  value={form.language}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                  className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="html">HTML / CSS</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cd">Duration (minutes)</Label>
                <Input id="cd" type="number" min={3} max={120} value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
              </div>
            </div>
            <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white shadow-lg shadow-indigo-500/25" className="w-full" onClick={create} disabled={!form.group_id || !form.title.trim()}>
              Create competition
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
