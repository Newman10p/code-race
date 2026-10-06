import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Trophy, Save, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/competitions/manage")({
  head: () => ({
    meta: [
      { title: "Competition Scheduler | CodeRace" },
      { name: "description", content: "Schedule championships with appearance, start and end times, mixed questions and school restrictions." },
      { property: "og:title", content: "Competition Scheduler | CodeRace" },
      { property: "og:description", content: "Host scheduled multi-school competitions with MCQ, short answer and code questions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManagePage,
});

type QType = "mcq" | "short_text" | "code";
interface Q {
  id?: string; type: QType; content: string; points: number;
  options: string[]; correct: number; accepted: string;
  language: string; starter: string; solution: string; tests: string;
}
interface Comp {
  id?: string; title: string; description: string; visibility: "public" | "school_restricted";
  status: "draft" | "published" | "archived"; appearance_at: string; starts_at: string; ends_at: string;
  duration_minutes: string; scoring_mode: "points_and_speed" | "strict_points"; show_leaderboard_during: boolean;
}

const toLocal = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const blank = (): Comp => {
  const now = Date.now();
  return { title: "", description: "", visibility: "public", status: "draft",
    appearance_at: toLocal(new Date(now).toISOString()), starts_at: toLocal(new Date(now + 864e5).toISOString()),
    ends_at: toLocal(new Date(now + 864e5 + 72e5).toISOString()), duration_minutes: "",
    scoring_mode: "points_and_speed", show_leaderboard_during: false };
};
const blankQ = (type: QType): Q => ({ type, content: "", points: 10, options: ["", ""], correct: 0, accepted: "",
  language: "javascript", starter: "", solution: "", tests: '[{"stdin":"","expected":"","is_hidden":false}]' });

function ManagePage() {
  const { user } = useAuth();
  const { isSetter, isAdmin, loading } = useUserRole();
  const [list, setList] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; school_name: string }[]>([]);
  const [comp, setComp] = useState<Comp>(blank());
  const [qs, setQs] = useState<Q[]>([]);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loadList = async () => {
    const { data } = await supabase.from("competitions").select("*").order("starts_at", { ascending: false });
    setList(data || []);
  };
  useEffect(() => {
    if (!isSetter && !isAdmin) return;
    loadList();
    supabase.from("organizations").select("id, school_name").eq("status", "active").then(({ data }) => setOrgs(data || []));
  }, [isSetter, isAdmin]);

  const open = async (c: any) => {
    setComp({ ...c, description: c.description || "", duration_minutes: c.duration_minutes?.toString() || "",
      appearance_at: toLocal(c.appearance_at), starts_at: toLocal(c.starts_at), ends_at: toLocal(c.ends_at) });
    const [{ data: qd }, { data: ao }] = await Promise.all([
      supabase.from("competition_questions").select("*, competition_question_keys(*)").eq("competition_id", c.id).order("order_index"),
      supabase.from("competition_allowed_orgs").select("organization_id").eq("competition_id", c.id),
    ]);
    setAllowed((ao || []).map((a) => a.organization_id));
    setQs((qd || []).map((q: any) => {
      const k = Array.isArray(q.competition_question_keys) ? q.competition_question_keys[0] : q.competition_question_keys;
      return { id: q.id, type: q.type, content: q.content, points: q.points, options: q.options || ["", ""],
        correct: k?.correct_option ?? 0, accepted: (k?.accepted_answers || []).join("\n"), language: q.language,
        starter: q.starter_code || "", solution: k?.solution || "",
        tests: JSON.stringify([...(q.visible_test_cases || []), ...(k?.hidden_test_cases || [])], null, 1) };
    }));
  };

  const save = async () => {
    if (!user || !comp.title.trim()) return toast.error("Add a title first.");
    const a = new Date(comp.appearance_at), s = new Date(comp.starts_at), e = new Date(comp.ends_at);
    if (!(a <= s && s < e)) return toast.error("Appearance must be before start, and start before end.");
    let tests: any[][] = [];
    try { tests = qs.map((q) => (q.type === "code" ? JSON.parse(q.tests || "[]") : [])); }
    catch { return toast.error("A code question has invalid test-case JSON."); }
    setSaving(true);
    try {
      const row = { title: comp.title.trim(), description: comp.description || null, visibility: comp.visibility,
        status: comp.status, appearance_at: a.toISOString(), starts_at: s.toISOString(), ends_at: e.toISOString(),
        duration_minutes: comp.duration_minutes ? Number(comp.duration_minutes) : null,
        scoring_mode: comp.scoring_mode, show_leaderboard_during: comp.show_leaderboard_during };
      let id = comp.id;
      if (id) { const { error } = await supabase.from("competitions").update(row).eq("id", id); if (error) throw error; }
      else {
        const { data, error } = await supabase.from("competitions").insert({ ...row, created_by: user.id }).select("id").single();
        if (error) throw error; id = data.id;
      }
      await supabase.from("competition_allowed_orgs").delete().eq("competition_id", id!);
      if (comp.visibility === "school_restricted" && allowed.length) {
        const { error } = await supabase.from("competition_allowed_orgs").insert(allowed.map((o) => ({ competition_id: id!, organization_id: o })));
        if (error) throw error;
      }
      await supabase.from("competition_questions").delete().eq("competition_id", id!);
      for (let i = 0; i < qs.length; i++) {
        const q = qs[i]; const t = tests[i];
        const { data: qrow, error } = await supabase.from("competition_questions").insert({
          competition_id: id!, order_index: i, type: q.type, content: q.content, points: q.points,
          options: q.type === "mcq" ? q.options : null, language: q.language,
          starter_code: q.type === "code" ? q.starter : null,
          visible_test_cases: t.filter((x: any) => !(x.is_hidden ?? x.hidden)),
        }).select("id").single();
        if (error) throw error;
        const { error: ke } = await supabase.from("competition_question_keys").insert({
          question_id: qrow.id, correct_option: q.type === "mcq" ? q.correct : null,
          accepted_answers: q.type === "short_text" ? q.accepted.split("\n").map((x) => x.trim()).filter(Boolean) : [],
          solution: q.type === "code" ? q.solution : null,
          hidden_test_cases: t.filter((x: any) => x.is_hidden ?? x.hidden),
        });
        if (ke) throw ke;
      }
      toast.success("Competition saved.");
      setComp((c) => ({ ...c, id }));
      loadList();
    } catch (err: any) { toast.error(err.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const remove = async () => {
    if (!comp.id || !confirm("Delete this competition and all its entries?")) return;
    const { error } = await supabase.from("competitions").delete().eq("id", comp.id);
    if (error) return toast.error(error.message);
    setComp(blank()); setQs([]); setAllowed([]); loadList();
  };

  const upQ = (i: number, p: Partial<Q>) => setQs((a) => a.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const field = "rounded-md border border-border bg-background px-2 py-1.5 text-sm";

  if (loading) return <HoneycombLayout><Navbar /></HoneycombLayout>;
  if (!isSetter && !isAdmin) return <HoneycombLayout><Navbar /><p className="p-10 text-center text-muted-foreground">Only setters can schedule competitions.</p></HoneycombLayout>;

  return (
    <HoneycombLayout>
      <Navbar />
      <div className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[280px_1fr]">
        <GlowCard className="h-fit p-4">
          <Button className="mb-3 w-full" onClick={() => { setComp(blank()); setQs([]); setAllowed([]); }}><Plus className="mr-1 h-4 w-4" />New competition</Button>
          {list.length === 0 && <p className="text-sm text-muted-foreground">No competitions yet.</p>}
          {list.map((c) => (
            <button key={c.id} onClick={() => open(c)} className={`mb-1 w-full rounded-lg p-2 text-left text-sm hover:bg-muted ${comp.id === c.id ? "bg-primary/10 text-primary" : ""}`}>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-muted-foreground">{c.status} · {new Date(c.starts_at).toLocaleString()}</div>
            </button>
          ))}
        </GlowCard>

        <div className="space-y-4">
          <GlowCard className="space-y-3 p-5">
            <h1 className="flex items-center gap-2 text-xl font-bold"><Trophy className="h-5 w-5 text-primary" />{comp.id ? "Edit competition" : "New competition"}</h1>
            <Input placeholder="Title" value={comp.title} onChange={(e) => setComp({ ...comp, title: e.target.value })} />
            <Textarea placeholder="Description / rules" value={comp.description} onChange={(e) => setComp({ ...comp, description: e.target.value })} />
            <div className="grid gap-3 sm:grid-cols-3">
              {(["appearance_at", "starts_at", "ends_at"] as const).map((k) => (
                <label key={k} className="text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{k === "appearance_at" ? "Appears on" : k === "starts_at" ? "Opens at" : "Closes at"}</span>
                  <Input type="datetime-local" value={comp[k]} onChange={(e) => setComp({ ...comp, [k]: e.target.value })} />
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-xs text-muted-foreground">Personal time limit (min, optional)
                <Input type="number" min={1} value={comp.duration_minutes} onChange={(e) => setComp({ ...comp, duration_minutes: e.target.value })} /></label>
              <label className="text-xs text-muted-foreground">Status
                <select className={`${field} w-full`} value={comp.status} onChange={(e) => setComp({ ...comp, status: e.target.value as any })}>
                  <option value="draft">Draft (hidden)</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
              <label className="text-xs text-muted-foreground">Scoring
                <select className={`${field} w-full`} value={comp.scoring_mode} onChange={(e) => setComp({ ...comp, scoring_mode: e.target.value as any })}>
                  <option value="points_and_speed">Points, then speed</option><option value="strict_points">Points only</option></select></label>
              <label className="text-xs text-muted-foreground">Who can enter
                <select className={`${field} w-full`} value={comp.visibility} onChange={(e) => setComp({ ...comp, visibility: e.target.value as any })}>
                  <option value="public">Everyone</option><option value="school_restricted">Selected schools</option></select></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={comp.show_leaderboard_during} onCheckedChange={(v) => setComp({ ...comp, show_leaderboard_during: v })} />Show live leaderboard while open</label>
            {comp.visibility === "school_restricted" && (
              <div className="flex flex-wrap gap-2">
                {orgs.length === 0 && <span className="text-sm text-muted-foreground">No active schools yet.</span>}
                {orgs.map((o) => (
                  <button key={o.id} onClick={() => setAllowed((a) => (a.includes(o.id) ? a.filter((x) => x !== o.id) : [...a, o.id]))}
                    className={`rounded-full border px-3 py-1 text-xs ${allowed.includes(o.id) ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>{o.school_name}</button>
                ))}
              </div>
            )}
          </GlowCard>

          {qs.map((q, i) => (
            <GlowCard key={i} className="space-y-2 p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Q{i + 1}</span>
                <select className={field} value={q.type} onChange={(e) => upQ(i, { type: e.target.value as QType })}>
                  <option value="mcq">Multiple choice</option><option value="short_text">Short answer</option><option value="code">Code</option></select>
                <Input type="number" className="w-24" value={q.points} onChange={(e) => upQ(i, { points: Number(e.target.value) || 0 })} />
                <span className="text-xs text-muted-foreground">pts</span>
                <Button variant="ghost" size="icon" className="ml-auto" onClick={() => setQs((a) => a.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <Textarea placeholder="Question" value={q.content} onChange={(e) => upQ(i, { content: e.target.value })} />
              {q.type === "mcq" && (
                <div className="space-y-1">
                  {q.options.map((o, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <input type="radio" checked={q.correct === j} onChange={() => upQ(i, { correct: j })} title="Correct answer" />
                      <Input value={o} placeholder={`Option ${j + 1}`} onChange={(e) => upQ(i, { options: q.options.map((x, k) => (k === j ? e.target.value : x)) })} />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => upQ(i, { options: [...q.options, ""] })}>Add option</Button>
                </div>
              )}
              {q.type === "short_text" && <Textarea placeholder="Accepted answers, one per line (not case-sensitive)" value={q.accepted} onChange={(e) => upQ(i, { accepted: e.target.value })} />}
              {q.type === "code" && (
                <div className="grid gap-2 md:grid-cols-2">
                  <select className={field} value={q.language} onChange={(e) => upQ(i, { language: e.target.value })}>
                    <option value="javascript">JavaScript</option><option value="python">Python</option></select>
                  <span />
                  <Textarea className="font-mono text-xs" rows={5} placeholder="Starter code" value={q.starter} onChange={(e) => upQ(i, { starter: e.target.value })} />
                  <Textarea className="font-mono text-xs" rows={5} placeholder="Reference solution (kept secret)" value={q.solution} onChange={(e) => upQ(i, { solution: e.target.value })} />
                  <Textarea className="font-mono text-xs md:col-span-2" rows={4} value={q.tests} onChange={(e) => upQ(i, { tests: e.target.value })} />
                  <p className="text-xs text-muted-foreground md:col-span-2">Test cases as JSON. Set "is_hidden": true to keep a case secret from students.</p>
                </div>
              )}
            </GlowCard>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setQs([...qs, blankQ("mcq")])}><Plus className="mr-1 h-4 w-4" />Multiple choice</Button>
            <Button variant="outline" onClick={() => setQs([...qs, blankQ("short_text")])}><Plus className="mr-1 h-4 w-4" />Short answer</Button>
            <Button variant="outline" onClick={() => setQs([...qs, blankQ("code")])}><Plus className="mr-1 h-4 w-4" />Code</Button>
            <div className="ml-auto flex gap-2">
              {comp.id && <Button variant="destructive" onClick={remove}><Trash2 className="mr-1 h-4 w-4" />Delete</Button>}
              <Button onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" />{saving ? "Saving…" : "Save competition"}</Button>
            </div>
          </div>
        </div>
      </div>
    </HoneycombLayout>
  );
}
