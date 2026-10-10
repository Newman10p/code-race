import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeRunner } from "@/components/code/CodeRunner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Clock, Send, Trophy } from "lucide-react";

export const Route = createFileRoute("/competitions/$id")({
  head: () => ({
    meta: [
      { title: "Competition Arena | CodeRace" },
      { name: "description", content: "Take part in a scheduled CodeRace championship." },
      { property: "og:title", content: "Competition Arena | CodeRace" },
      { property: "og:description", content: "Live scheduled championship on CodeRace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Arena,
});

type Answer = { choice?: number; text?: string; code?: string; passed?: number; total?: number };

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return `${d ? d + "d " : ""}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
};

function Arena() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const [comp, setComp] = useState<any>(null);
  const [missing, setMissing] = useState(false);
  const [qs, setQs] = useState<any[]>([]);
  const [sub, setSub] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const dirty = useRef(false);
  const submitting = useRef(false);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (loading || !user) return;
    supabase.from("competitions").select("*").eq("id", id).maybeSingle().then(({ data }) => (data ? setComp(data) : setMissing(true)));
    supabase.from("competition_submissions").select("*").eq("competition_id", id).eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) { setSub(data); setAnswers((data.answers as any) || {}); } });
  }, [id, user, loading]);

  const starts = comp ? new Date(comp.starts_at).getTime() : 0;
  const ends = comp ? new Date(comp.ends_at).getTime() : 0;
  const live = comp && now >= starts && now < ends;
  const deadline = useMemo(() => {
    if (!comp) return 0;
    if (sub && comp.duration_minutes) return Math.min(ends, new Date(sub.started_at).getTime() + comp.duration_minutes * 60000);
    return ends;
  }, [comp, sub, ends]);

  // Load questions once open (the database only releases them after the start time).
  useEffect(() => {
    if (!comp || now < starts || qs.length) return;
    supabase.from("competition_questions").select("*").eq("competition_id", id).order("order_index").then(({ data }) => setQs(data || []));
  }, [comp, now >= starts]);

  // Autosave answers every 10s.
  useEffect(() => {
    const t = setInterval(async () => {
      if (!dirty.current || !sub || sub.submitted_at) return;
      dirty.current = false;
      await supabase.from("competition_submissions").update({ answers: answers as any }).eq("id", sub.id);
    }, 10000);
    return () => clearInterval(t);
  }, [answers, sub]);

  const submit = async (auto = false) => {
    if (!sub || sub.submitted_at || submitting.current) return;
    if (!auto && !confirm("Submit your answers? You can't change them afterwards.")) return;
    submitting.current = true; setBusy(true);
    try {
      if (now < ends) await supabase.from("competition_submissions").update({ answers: answers as any }).eq("id", sub.id);
      const { error } = await supabase.rpc("submit_competition", { _comp: id });
      if (error) throw error;
      const { data } = await supabase.from("competition_submissions").select("*").eq("id", sub.id).single();
      setSub(data);
      toast.success(auto ? "Time's up — your answers were submitted." : "Submitted!");
    } catch (e: any) { toast.error(e.message); submitting.current = false; }
    finally { setBusy(false); }
  };

  // Auto-submit when the personal or global deadline passes.
  useEffect(() => { if (sub && !sub.submitted_at && deadline && now >= deadline) submit(true); }, [now >= deadline]);

  const enter = async () => {
    if (!user) return;
    setBusy(true);
    const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "Player";
    const { data, error } = await supabase.from("competition_submissions")
      .insert({ competition_id: id, user_id: user.id, display_name: name }).select("*").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setSub(data);
  };

  const setA = (qid: string, p: Answer) => { dirty.current = true; setAnswers((a) => ({ ...a, [qid]: { ...a[qid], ...p } })); };

  const shell = (body: React.ReactNode) => (
    <HoneycombLayout><Navbar />
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <Link to="/competitions" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All competitions</Link>
        {body}
      </div>
    </HoneycombLayout>
  );

  if (!loading && !user) return shell(<GlowCard className="p-6 text-center">Please <Link to="/login" className="text-primary underline">sign in</Link> to take part.</GlowCard>);
  if (missing) return shell(<GlowCard className="p-6 text-center text-muted-foreground">This competition isn't available to you.</GlowCard>);
  if (!comp) return shell(<p className="text-muted-foreground">Loading…</p>);

  const header = (
    <GlowCard className="p-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Trophy className="h-6 w-6 text-primary" />{comp.title}</h1>
      {comp.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{comp.description}</p>}
      <p className="mt-2 text-xs text-muted-foreground">{new Date(comp.starts_at).toLocaleString()} – {new Date(comp.ends_at).toLocaleString()}
        {comp.duration_minutes ? ` · ${comp.duration_minutes} min once you start` : ""}</p>
    </GlowCard>
  );

  if (sub?.submitted_at) return shell(<>{header}<GlowCard className="p-6 text-center">
    <p className="text-lg font-semibold">Your answers are in.</p>
    <p className="mt-1 text-3xl font-bold text-primary">{Number(sub.total_score)} pts</p>
    <p className="mt-1 text-sm text-muted-foreground">Final rankings appear when the competition closes.</p>
    <Link to="/competition-results/$id" params={{ id }} className="mt-3 inline-block text-sm text-primary underline">View leaderboard</Link>
  </GlowCard></>);

  if (now < starts) return shell(<>{header}<GlowCard className="p-8 text-center">
    <p className="text-sm text-muted-foreground">Opens in</p>
    <p className="font-mono text-4xl font-bold text-primary">{fmt(starts - now)}</p>
  </GlowCard></>);

  if (now >= ends && !sub) return shell(<>{header}<GlowCard className="p-6 text-center text-muted-foreground">This competition has closed.</GlowCard></>);

  if (!sub) return shell(<>{header}<GlowCard className="p-6 text-center">
    <p className="mb-3">{qs.length} questions. {comp.duration_minutes ? `Your ${comp.duration_minutes}-minute timer starts when you enter.` : "Submit before the competition closes."}</p>
    <Button size="lg" onClick={enter} disabled={busy || !live}>Start competition</Button>
  </GlowCard></>);

  return (
    <HoneycombLayout><Navbar />
      <div className="sticky top-14 z-40 border-b border-border/50 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between p-3">
          <span className="truncate font-semibold">{comp.title}</span>
          <span className={`flex items-center gap-1 font-mono text-lg ${deadline - now < 60000 ? "text-destructive" : "text-primary"}`}><Clock className="h-4 w-4" />{fmt(deadline - now)}</span>
          <Button onClick={() => submit(false)} disabled={busy}><Send className="mr-1 h-4 w-4" />Submit</Button>
        </div>
      </div>
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        {qs.map((q, i) => {
          const a = answers[q.id] || {};
          return (
            <GlowCard key={q.id} className="space-y-3 p-5">
              <div className="flex justify-between text-sm"><span className="font-semibold">Question {i + 1}</span><span className="text-muted-foreground">{q.points} pts</span></div>
              <p className="whitespace-pre-wrap">{q.content}</p>
              {q.type === "mcq" && (q.options || []).map((o: string, j: number) => (
                <button key={j} onClick={() => setA(q.id, { choice: j })}
                  className={`block w-full rounded-lg border p-3 text-left text-sm ${a.choice === j ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}>{o}</button>
              ))}
              {q.type === "short_text" && <Input placeholder="Your answer" value={a.text || ""} onChange={(e) => setA(q.id, { text: e.target.value })} />}
              {q.type === "code" && (
                <CodeRunner language={q.language} testMode={q.test_mode === "assert" ? "assert" : "io"}
                  code={a.code ?? q.starter_code ?? ""} onCodeChange={(v) => setA(q.id, { code: v })}
                  tests={q.visible_test_cases || []}
                  onResult={(r) => setA(q.id, { passed: r.passed, total: r.total })} />
              )}
            </GlowCard>
          );
        })}
        <Button className="w-full" size="lg" onClick={() => submit(false)} disabled={busy}><Send className="mr-1 h-4 w-4" />Submit answers</Button>
      </div>
    </HoneycombLayout>
  );
}
