import { createFileRoute } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Zap, Clock, ChevronRight, Trophy, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/race")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: (search.sessionId as string) || "",
    participantId: (search.participantId as string) || "",
  }),
  component: RaceView,
});

interface QuestionData {
  id: string;
  type: string;
  content: string;
  points: number;
  options: string[];
  correct_option: number;
  starter_code: string;
  time_limit: number;
}

interface LeaderboardEntry {
  id: string;
  student_name: string;
  current_score: number;
}

function RaceView() {
  const { sessionId, participantId } = Route.useSearch();
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(-1);
  const [sessionStatus, setSessionStatus] = useState("lobby");
  const [selected, setSelected] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tabWarning, setTabWarning] = useState(false);

  useEffect(() => {
    loadSession();
    loadLeaderboard();
  }, [sessionId]);

  // Realtime subscription for session updates
  useEffect(() => {
    const channel = supabase
      .channel(`race-${sessionId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` }, (payload) => {
        const updated = payload.new as any;
        setSessionStatus(updated.status);
        if (updated.current_question_index !== currentQIndex) {
          setCurrentQIndex(updated.current_question_index);
          setSelected(null);
          setCode("");
          setSubmitted(false);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` }, () => loadLeaderboard())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, currentQIndex]);

  // Anti-cheat: tab switch detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && sessionStatus === "active" && !submitted) {
        handleTabSwitch();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [sessionStatus, submitted, currentQIndex, questions]);

  // Countdown timer
  useEffect(() => {
    if (sessionStatus !== "active" || submitted) return;
    const q = questions[currentQIndex];
    if (!q) return;
    setTimer(q.time_limit);
  }, [sessionStatus, currentQIndex, questions, submitted]);

  useEffect(() => {
    if (sessionStatus !== "active" || submitted || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus, submitted, timer > 0]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timer === 0 && sessionStatus === "active" && !submitted && questions[currentQIndex]) {
      submitAnswer(false);
    }
  }, [timer]);

  const loadSession = async () => {
    const { data: session } = await supabase.from("game_sessions").select("*").eq("id", sessionId).single();
    if (!session) return;
    setSessionStatus(session.status);
    setCurrentQIndex(session.current_question_index);

    const { data: qs } = await supabase
      .from("questions")
      .select("id, type, content, points, options, correct_option, starter_code, time_limit")
      .eq("quiz_id", session.quiz_id)
      .order("order_index");
    if (qs) {
      setQuestions(qs.map(q => ({
        ...q,
        options: (q.options as string[]) || [],
        correct_option: q.correct_option || 0,
        starter_code: q.starter_code || "",
        time_limit: (q as any).time_limit ?? 30,
      })));
    }
    if (session.status === "active") {
      setCode(qs?.[session.current_question_index]?.starter_code || "");
    }
  };

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from("participants")
      .select("id, student_name, current_score")
      .eq("session_id", sessionId)
      .order("current_score", { ascending: false });
    setLeaderboard(data || []);
  };

  const handleTabSwitch = useCallback(async () => {
    setTabWarning(true);
    setTimeout(() => setTabWarning(false), 3000);

    // Auto-submit current answer
    if (questions[currentQIndex]) {
      await submitAnswer(true);
    }

    // Increment tab switch count
    const current = leaderboard.find(l => l.id === participantId);
    await supabase.from("participants").update({
      tab_switch_count: (current as any)?.tab_switch_count ? (current as any).tab_switch_count + 1 : 1,
      is_flagged: true,
    }).eq("id", participantId);
  }, [currentQIndex, questions, participantId]);

  const submitAnswer = async (isTabSwitch = false) => {
    if (submitted || !questions[currentQIndex]) return;
    setSubmitted(true);
    const q = questions[currentQIndex];
    const isCorrect = q.type === "mcq" ? selected === q.correct_option : false;
    const pointsAwarded = isCorrect ? q.points : 0;

    await supabase.from("participant_answers").insert({
      participant_id: participantId,
      question_id: q.id,
      answer: q.type === "mcq" ? { selected } : { code },
      is_correct: isCorrect,
      points_awarded: pointsAwarded,
      flagged_tab_switch: isTabSwitch,
    });

    if (pointsAwarded > 0) {
      const current = leaderboard.find(l => l.id === participantId);
      await supabase.from("participants").update({
        current_score: (current?.current_score || 0) + pointsAwarded,
      }).eq("id", participantId);
    }

    loadLeaderboard();
  };

  const currentQ = questions[currentQIndex];
  const myRank = leaderboard.findIndex(l => l.id === participantId) + 1;
  const myScore = leaderboard.find(l => l.id === participantId)?.current_score || 0;

  // Waiting for host
  if (sessionStatus === "lobby") {
    return (
      <HoneycombLayout>
        <main className="flex min-h-screen flex-col items-center justify-center px-4 scan-line">
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 animate-pulse-glow">
              <Zap className="h-10 w-10 text-primary" />
            </div>
            <h1 className="mb-2 text-3xl font-bold">Waiting for Host...</h1>
            <p className="text-muted-foreground">The race will begin when the host starts it.</p>
            <div className="mt-8 flex items-center justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-3 w-3 rounded-full bg-primary" style={{ animation: `pulse-glow 1.5s ease-in-out ${i * 0.3}s infinite` }} />
              ))}
            </div>
          </div>
        </main>
      </HoneycombLayout>
    );
  }

  // Race finished
  if (sessionStatus === "finished") {
    return (
      <HoneycombLayout>
        <main className="mx-auto max-w-2xl px-4 py-12">
          <div className="text-center mb-8">
            <Trophy className="mx-auto h-16 w-16 text-primary mb-4" />
            <h1 className="text-3xl font-bold mb-2">Race Complete!</h1>
            <p className="text-muted-foreground">Your rank: #{myRank} · Score: {myScore} pts</p>
          </div>
          <GlowCard>
            <h3 className="mb-3 font-semibold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" /> Final Leaderboard
            </h3>
            <div className="space-y-2">
              {leaderboard.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${p.id === participantId ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <span className="font-medium">{p.student_name}{p.id === participantId ? " (You)" : ""}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-primary">{p.current_score} pts</span>
                </div>
              ))}
            </div>
          </GlowCard>
        </main>
      </HoneycombLayout>
    );
  }

  // Active race
  return (
    <HoneycombLayout>
      {tabWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95">
          <div className="text-center">
            <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-bold text-destructive mb-2">Tab Switch Detected</h2>
            <p className="text-muted-foreground">Your answer was auto-submitted and flagged.</p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Q{currentQIndex + 1}/{questions.length}</span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <Zap className="h-3 w-3" />{myScore} pts
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {currentQ && (
          <>
            <GlowCard className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">{currentQ.type.toUpperCase()}</span>
                <span className="flex items-center gap-1 text-sm text-primary"><Zap className="h-3 w-3" />{currentQ.points} pts</span>
              </div>
              <p className="text-lg font-medium">{currentQ.content}</p>
            </GlowCard>

            {currentQ.type === "mcq" ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => !submitted && setSelected(i)}
                    disabled={submitted}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      submitted
                        ? i === currentQ.correct_option
                          ? "border-green-500 bg-green-500/10"
                          : selected === i
                            ? "border-destructive bg-destructive/10"
                            : "border-border bg-card opacity-50"
                        : selected === i
                          ? "border-primary bg-primary/10 glow-card"
                          : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${selected === i ? "bg-primary text-primary-foreground glow-btn" : "bg-muted text-muted-foreground"}`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="font-medium">{opt}</span>
                  </button>
                ))}
              </div>
            ) : (
              <GlowCard>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Your Code</label>
                <textarea
                  value={code}
                  onChange={(e) => !submitted && setCode(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background p-4 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={8}
                  spellCheck={false}
                  disabled={submitted}
                />
              </GlowCard>
            )}

            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {submitted ? (currentQ.type === "mcq" && selected === currentQ.correct_option ? "✅ Correct!" : "Submitted. Waiting for next question...") : ""}
              </span>
              <Button variant="neon" size="xl" onClick={() => submitAnswer(false)} disabled={submitted || (currentQ.type === "mcq" && selected === null)}>
                {submitted ? "Submitted" : "Submit Answer"}
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </>
        )}

        {/* Mini leaderboard */}
        <GlowCard className="mt-8">
          <h3 className="mb-3 text-sm font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" /> Leaderboard
          </h3>
          <div className="space-y-1">
            {leaderboard.slice(0, 5).map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between rounded px-3 py-2 text-sm ${p.id === participantId ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground"}`}>
                <span>#{i + 1} {p.student_name}{p.id === participantId ? " (You)" : ""}</span>
                <span className="font-mono">{p.current_score}</span>
              </div>
            ))}
          </div>
        </GlowCard>
      </main>
    </HoneycombLayout>
  );
}
