import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFullscreen, isMobile, isPageUnloading } from "@/hooks/useFullscreen";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeRunner } from "@/components/code/CodeRunner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Clock, Send, Trophy, ShieldAlert, Maximize } from "lucide-react";

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
  const clock = useRef<{ server: number; tick: number } | null>(null);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(0);
  const [qStart, setQStart] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const fs = useFullscreen();
  const dirty = useRef(false);
  const submitting = useRef(false);
  const [warningUntil, setWarningUntil] = useState<number | null>(null);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [securityBusy, setSecurityBusy] = useState(false);
  const fullscreenQueue = useRef(Promise.resolve());
  const currentTime = () => clock.current ? clock.current.server + performance.now() - clock.current.tick : 0;

  // Server time plus monotonic elapsed time; never use the device wall clock.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      const t0 = performance.now();
      const { data } = await supabase.rpc("server_now");
      const t1 = performance.now();
      if (cancelled || !data) return;
      clock.current = { server: new Date(data).getTime() + (t1 - t0) / 2, tick: t1 };
      setNow(currentTime());
    };
    void sync();
    const heartbeat = setInterval(sync, 30000);
    const t = setInterval(() => { if (clock.current) setNow(currentTime()); }, 250);
    return () => { cancelled = true; clearInterval(t); clearInterval(heartbeat); };
  }, []);

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
    if (!comp || !now || now < starts || qs.length) return;
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
    if (isMobile()) return toast.error("Competitions must be taken on a computer.");
    await fs.enter();
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      return toast.error("Allow fullscreen before starting the competition.");
    }
    setBusy(true);
    const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "Player";
    const { data, error } = await supabase.from("competition_submissions")
      .insert({ competition_id: id, user_id: user.id, display_name: name }).select("*").single();
    setBusy(false);
    if (error) return toast.error(error.message);
    setSub(data); setIdx(0); setQStart(currentTime());
  };

  const active = !!sub && !sub.submitted_at;
  // Tab strikes remain separate from the two-exit fullscreen limit.
  const strike = async (why: string) => {
    if (!active || isPageUnloading() || submitting.current) return;
    const { data } = await supabase.rpc("record_competition_strike", { _comp: id });
    const n = Number(data) || strikes + 1;
    setStrikes(n);
    if (n >= 3) { toast.error("3 strikes — you have been disqualified and your answers submitted."); submit(true); }
    else toast.warning(`Strike ${n}/3: ${why}`);
  };
  useEffect(() => {
    if (!active) return;
    setStrikes(sub.strikes_count || 0);
    const vis = () => { if (document.hidden) strike("you left the competition tab"); };
    const noCopy = (e: Event) => e.preventDefault();
    document.addEventListener("visibilitychange", vis);
    document.addEventListener("copy", noCopy);
    document.addEventListener("paste", noCopy);
    return () => { document.removeEventListener("visibilitychange", vis); document.removeEventListener("copy", noCopy); document.removeEventListener("paste", noCopy); };
  }, [active]);
  const wasFs = useRef(false);
  const fullscreenEvent = (event: "exit" | "return" | "timeout") => {
    setSecurityBusy(true);
    fullscreenQueue.current = fullscreenQueue.current.then(async () => {
      const { data, error } = await supabase.rpc("record_competition_fullscreen", { _comp: id, _event: event });
      if (error) { toast.error("Security check could not be saved. Please reconnect and return to fullscreen."); return; }
      const result = data as { exits: number; disqualified: boolean; warning_at?: string | null };
      setFullscreenExits(result.exits);
      if (result.disqualified) {
        setStrikes(3);
        setWarningUntil(null);
        const { data: attempt } = await supabase.from("competition_submissions").select("*").eq("competition_id", id).eq("user_id", user?.id || "").single();
        if (attempt) setSub(attempt);
        toast.error("Disqualified — your competition attempt has been closed.");
      } else if (event === "return") {
        setWarningUntil(null);
      } else if (result.warning_at) {
        setWarningUntil(new Date(result.warning_at).getTime() + 10000);
      }
    }).catch(() => toast.error("Security check failed. Please reconnect.")).finally(() => setSecurityBusy(false));
  };
  useEffect(() => {
    if (!active) return;
    if (fs.isFullscreen) {
      wasFs.current = true;
      if (warningUntil !== null) fullscreenEvent("return");
    } else if (wasFs.current && !isPageUnloading()) {
      wasFs.current = false;
      setWarningUntil(currentTime() + 10000);
      fullscreenEvent("exit");
    }
  }, [fs.isFullscreen, active]);
  useEffect(() => {
    if (!active || !sub) return;
    setFullscreenExits(sub.fullscreen_exits || 0);
    if (sub.fullscreen_warning_at) setWarningUntil(new Date(sub.fullscreen_warning_at).getTime() + 10000);
    else if (!fs.isFullscreen && !isMobile()) setWarningUntil(currentTime() + 10000);
  }, [active]);
  const warningLeft = warningUntil === null ? null : Math.max(0, Math.ceil((warningUntil - now) / 1000));
  useEffect(() => {
    if (active && warningLeft === 0 && !securityBusy) fullscreenEvent("timeout");
  }, [warningLeft, securityBusy, active]);

  // Strict per-question timer: when time runs out, move on (no going back).
  const cur = qs[idx];
  const qLeft = cur?.time_limit_seconds ? qStart + cur.time_limit_seconds * 1000 - now : null;
  const next = () => {
    if (idx < qs.length - 1) { setIdx(idx + 1); setQStart(currentTime()); }
    else submit(true);
  };
  useEffect(() => { if (active && qLeft !== null && qLeft <= 0) next(); }, [qLeft !== null && qLeft <= 0]);
  useEffect(() => { if (active && !qStart && now) setQStart(currentTime()); }, [active, now, qStart]);

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
  if (!comp || !now) return shell(<p className="text-muted-foreground">Synchronising competition time…</p>);

  const header = (
    <GlowCard className="p-5">
      <h1 className="flex items-center gap-2 text-2xl font-bold"><Trophy className="h-6 w-6 text-primary" />{comp.title}</h1>
      {comp.description && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{comp.description}</p>}
      <p className="mt-2 text-xs text-muted-foreground">{new Date(comp.starts_at).toLocaleString()} – {new Date(comp.ends_at).toLocaleString()}
        {comp.duration_minutes ? ` · ${comp.duration_minutes} min once you start` : ""}</p>
    </GlowCard>
  );

  // Anyone who already attended only sees their past attempt — even if the competition is edited or reopened later.
  if (sub?.submitted_at || (sub && now >= ends)) return shell(<>{header}<GlowCard className="p-6 text-center">
    <p className="text-lg font-semibold">You have already taken part in this competition.</p>
    <p className="mt-1 text-3xl font-bold text-primary">{Number(sub.total_score)} pts</p>
    <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2 text-sm sm:grid-cols-4">
      {[["Status", sub.strikes_count >= 3 ? "Disqualified" : sub.submitted_at ? "Submitted" : "Not submitted"],
        ["Time", `${Math.floor(sub.time_spent_seconds / 60)}m ${sub.time_spent_seconds % 60}s`],
        ["Tests passed", sub.test_cases_passed], ["Strikes", sub.strikes_count]].map(([k, v]) => (
        <div key={k as string} className="rounded-lg border border-border bg-card p-2"><p className="text-xs text-muted-foreground">{k}</p><p className="font-semibold">{v}</p></div>
      ))}
    </div>
    {sub.submitted_at && <p className="mt-3 text-xs text-muted-foreground">Submitted {new Date(sub.submitted_at).toLocaleString()}. Re-taking is not allowed.</p>}
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
      <div className="border-b border-border/50 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 p-3">
          <span className="min-w-0 break-words font-semibold">{comp.title}</span>
          <span className={`flex items-center gap-1 font-mono text-lg ${deadline - now < 60000 ? "text-destructive" : "text-primary"}`}><Clock className="h-4 w-4" />{fmt(deadline - now)}</span>
          <span className="text-xs text-muted-foreground">Tab strikes {strikes}/3 · Fullscreen exits {fullscreenExits}/2</span>
          <Button onClick={() => submit(false)} disabled={busy}><Send className="mr-1 h-4 w-4" />Submit</Button>
        </div>
        <progress aria-label="Question progress" className="mx-auto block h-1 w-full max-w-5xl accent-primary" max={Math.max(qs.length, 1)} value={idx + 1} />
      </div>
      <main className="mx-auto flex min-h-[calc(100dvh-10rem)] w-full max-w-5xl min-w-0 items-center px-4 py-6">
        {(!fs.isFullscreen || warningUntil !== null) && !isMobile() && (
          <div role="alertdialog" aria-modal="true" aria-labelledby="fullscreen-warning-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
            <GlowCard className="w-full max-w-md border border-destructive p-6 text-center">
              <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-destructive" />
              <h2 id="fullscreen-warning-title" className="text-xl font-semibold">Return to fullscreen</h2>
              <p className="my-3 text-sm text-muted-foreground">Return within 10 seconds to stay in the competition. A second exit disqualifies you immediately.</p>
              <p aria-live="polite" className="mb-4 font-mono text-4xl font-bold text-destructive">{warningLeft ?? 10}s</p>
              <Button disabled={securityBusy} onClick={async () => { await fs.enter(); if (document.fullscreenElement || (document as any).webkitFullscreenElement) fullscreenEvent("return"); }}><Maximize className="mr-2 h-4 w-4" />Return to fullscreen</Button>
            </GlowCard>
          </div>
        )}
        <div className="w-full min-w-0 space-y-4">
        {cur && (() => {
          const q = cur; const a = answers[q.id] || {};
          return (
            <GlowCard key={q.id} className="w-full min-w-0 space-y-4 overflow-hidden p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-8 motion-safe:duration-500">
              <div className="flex justify-between text-sm"><span className="font-semibold">Question {idx + 1} of {qs.length}</span>
                <span className="text-muted-foreground">{q.points} pts{qLeft !== null && <span className={`ml-3 font-mono ${qLeft < 10000 ? "text-destructive" : "text-primary"}`}>{fmt(qLeft)}</span>}</span></div>
              <p className="break-words whitespace-pre-wrap select-none">{q.content}</p>
              {q.type === "mcq" && (q.options || []).map((o: string, j: number) => (
                <Button variant="outline" key={j} onClick={() => setA(q.id, { choice: j })}
                  className={`h-auto min-h-12 w-full justify-start whitespace-normal break-words p-3 text-left text-sm ${a.choice === j ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}>{o}</Button>
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
        })()}
        <p className="text-center text-xs text-muted-foreground">You can't go back to a question once you move on.</p>
        <Button className="w-full" size="lg" onClick={() => (idx < qs.length - 1 ? next() : submit(false))} disabled={busy}>
          {idx < qs.length - 1 ? "Next question →" : <><Send className="mr-1 h-4 w-4" />Submit answers</>}
        </Button>
        </div>
      </main>
    </HoneycombLayout>
  );
}
