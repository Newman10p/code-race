import { createFileRoute } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { AnimatedLeaderboard } from "@/components/AnimatedLeaderboard";
import { RoundTransition } from "@/components/RoundTransition";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Clock, ChevronRight, Trophy, AlertTriangle, Maximize, Ban, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isMobile, useFullscreen } from "@/hooks/useFullscreen";

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
  round_number: number;
}

interface LeaderboardEntry {
  id: string;
  student_name: string;
  current_score: number;
  is_disqualified?: boolean;
  is_flagged?: boolean;
  tab_switch_count?: number;
}

interface RoundCfg {
  round_number: number;
  name: string;
  duration_seconds: number;
}

const STRIKE_GRACE_SECONDS = 5;

function RaceView() {
  const { sessionId, participantId } = Route.useSearch();
  const { isFullscreen, enter: enterFullscreen } = useFullscreen();

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [sessionStatus, setSessionStatus] = useState("lobby");
  const [tournamentMode, setTournamentMode] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundPaused, setRoundPaused] = useState(true);
  const [rounds, setRounds] = useState<RoundCfg[]>([]);
  const [participant, setParticipant] = useState<any>(null);

  const [selected, setSelected] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showResult, setShowResult] = useState(false);

  // Strike system
  const [hasEnteredFullscreen, setHasEnteredFullscreen] = useState(false);
  const [strikeWarning, setStrikeWarning] = useState(false);
  const [strikeCountdown, setStrikeCountdown] = useState(STRIKE_GRACE_SECONDS);
  const strikeTimerRef = useRef<number | null>(null);
  const strikeActiveRef = useRef(false);
  const enteredFullscreenOnceRef = useRef(false);
  const isMobileDevice = useRef(false);

  // Round transition animation
  const [showRoundIntro, setShowRoundIntro] = useState(false);
  const previousRoundRef = useRef(currentRound);

  useEffect(() => {
    isMobileDevice.current = isMobile();
    loadSession();
    loadLeaderboard();
  }, [sessionId]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`race-${sessionId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` }, (payload) => {
        const updated = payload.new as any;
        setSessionStatus(updated.status);
        const newRound = updated.current_round ?? 1;
        if (newRound !== previousRoundRef.current && updated.tournament_mode) {
          setShowRoundIntro(true);
          setTimeout(() => setShowRoundIntro(false), 2500);
          previousRoundRef.current = newRound;
        }
        setCurrentRound(newRound);
        setRoundPaused(updated.round_paused ?? true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` }, () => loadLeaderboard())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  // Reload participant for DQ checks
  useEffect(() => {
    const interval = setInterval(loadParticipant, 3000);
    return () => clearInterval(interval);
  }, [sessionId, participantId]);

  const loadParticipant = async () => {
    const { data } = await supabase.from("participants").select("*").eq("id", participantId).single();
    if (data) setParticipant(data);
  };

  // Reset question state when index changes
  useEffect(() => {
    if (sessionStatus !== "active") return;
    const q = questions[currentQIndex];
    if (!q) return;
    setTimer(q.time_limit);
    setCode(q.starter_code || "");
    setSelected(null);
    setSubmitted(false);
    setShowResult(false);
  }, [currentQIndex, questions, sessionStatus]);

  // Per-question countdown
  useEffect(() => {
    if (sessionStatus !== "active" || submitted || timer <= 0 || roundPaused) return;
    const interval = setInterval(() => {
      setTimer((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStatus, submitted, timer > 0, roundPaused]);

  useEffect(() => {
    if (timer === 0 && sessionStatus === "active" && !submitted && questions[currentQIndex] && !roundPaused) {
      submitAnswer(false);
    }
  }, [timer]);

  // Auto-advance after result
  useEffect(() => {
    if (!showResult) return;
    const timeout = setTimeout(() => {
      setShowResult(false);
      const nextIdx = currentQIndex + 1;
      const nextQ = questions[nextIdx];

      if (!nextQ) {
        // No more questions
        setSessionStatus("finished");
        return;
      }

      // Tournament: if next question is in a different round, pause and wait for host
      if (tournamentMode && nextQ.round_number !== currentRound) {
        // Don't advance — wait for host to start next round
        return;
      }

      setCurrentQIndex(nextIdx);
    }, 2000);
    return () => clearTimeout(timeout);
  }, [showResult, currentQIndex, questions, tournamentMode, currentRound]);

  // When host starts next round, jump to first question of that round
  useEffect(() => {
    if (!tournamentMode || sessionStatus !== "active" || roundPaused) return;
    const firstIdxOfRound = questions.findIndex((q) => q.round_number === currentRound);
    if (firstIdxOfRound !== -1 && firstIdxOfRound !== currentQIndex) {
      setCurrentQIndex(firstIdxOfRound);
    }
  }, [currentRound, roundPaused, tournamentMode, sessionStatus, questions]);

  // ─── FULLSCREEN STRIKE SYSTEM ────────────────────────────────────────
  useEffect(() => {
    if (!hasEnteredFullscreen || sessionStatus !== "active" || isMobileDevice.current) return;
    if (participant?.is_disqualified) return;

    if (isFullscreen) {
      enteredFullscreenOnceRef.current = true;
      if (strikeTimerRef.current) {
        clearInterval(strikeTimerRef.current);
        strikeTimerRef.current = null;
      }
      strikeActiveRef.current = false;
      setStrikeWarning(false);
      setStrikeCountdown(STRIKE_GRACE_SECONDS);
      return;
    }

    if (!enteredFullscreenOnceRef.current || strikeActiveRef.current) return;
    handleFullscreenExit();
  }, [isFullscreen, hasEnteredFullscreen, sessionStatus, participant?.is_disqualified]);

  const handleFullscreenExit = async () => {
    if (!participant || strikeActiveRef.current) return;
    strikeActiveRef.current = true;
    const newStrikes = (participant.strike_count || 0) + 1;

    if (newStrikes >= 2) {
      // STRIKE 2 — disqualify immediately
      await disqualifyPlayer("Exited fullscreen 2+ times");
      return;
    }

    // STRIKE 1 — show warning + countdown
    await supabase.from("participants").update({ strike_count: newStrikes, is_flagged: true } as any).eq("id", participantId);
    setStrikeWarning(true);
    setStrikeCountdown(STRIKE_GRACE_SECONDS);

    strikeTimerRef.current = window.setInterval(() => {
      setStrikeCountdown((c) => {
        if (c <= 1) {
          if (strikeTimerRef.current) clearInterval(strikeTimerRef.current);
          // Failed to return — DQ
          disqualifyPlayer("Failed to return to fullscreen within grace period");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const disqualifyPlayer = async (reason: string) => {
    await supabase.from("participants").update({
      is_disqualified: true,
      dq_reason: reason,
    } as any).eq("id", participantId);
    setStrikeWarning(false);
    if (strikeTimerRef.current) clearInterval(strikeTimerRef.current);
    strikeTimerRef.current = null;
    strikeActiveRef.current = false;
    loadParticipant();
  };

  const enterAndStart = async () => {
    if (isMobileDevice.current) return;
    await enterFullscreen();
    setHasEnteredFullscreen(true);
    if (tournamentMode) {
      setShowRoundIntro(true);
      setTimeout(() => setShowRoundIntro(false), 2500);
    }
  };
  // ─────────────────────────────────────────────────────────────────────

  const loadSession = async () => {
    const { data: session } = await supabase.from("game_sessions").select("*").eq("id", sessionId).single();
    if (!session) return;
    const s = session as any;
    setSessionStatus(session.status);
    setTournamentMode(s.tournament_mode ?? false);
    setCurrentRound(s.current_round ?? 1);
    previousRoundRef.current = s.current_round ?? 1;
    setRoundPaused(s.round_paused ?? true);

    const { data: qs } = await supabase
      .from("questions")
      .select("id, type, content, points, options, correct_option, starter_code, time_limit, round_number")
      .eq("quiz_id", session.quiz_id)
      .order("order_index");
    if (qs) {
      const mapped = qs.map((q: any) => ({
        ...q,
        options: (q.options as string[]) || [],
        correct_option: q.correct_option || 0,
        starter_code: q.starter_code || "",
        time_limit: q.time_limit ?? 30,
        round_number: q.round_number ?? 1,
      }));
      setQuestions(mapped);
      // Jump to first question of current round
      const startIdx = s.tournament_mode
        ? mapped.findIndex((q) => q.round_number === (s.current_round ?? 1))
        : (session.current_question_index ?? 0);
      setCurrentQIndex(Math.max(0, startIdx));
    }

    const { data: rs } = await (supabase as any)
      .from("quiz_rounds")
      .select("round_number, name, duration_seconds")
      .eq("quiz_id", session.quiz_id)
      .order("round_number");
    setRounds((rs as any) || []);

    loadParticipant();
  };

  const loadLeaderboard = async () => {
    const { data } = await supabase
      .from("participants")
      .select("id, student_name, current_score, is_disqualified, is_flagged, tab_switch_count")
      .eq("session_id", sessionId)
      .order("current_score", { ascending: false });
    setLeaderboard((data as any) || []);
  };

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
      const current = leaderboard.find((l) => l.id === participantId);
      await supabase.from("participants").update({
        current_score: (current?.current_score || 0) + pointsAwarded,
      }).eq("id", participantId);
    }

    loadLeaderboard();
    setShowResult(true);
  };

  const currentQ = questions[currentQIndex];
  const myRank = leaderboard.filter((l) => !l.is_disqualified).findIndex((l) => l.id === participantId) + 1;
  const myScore = leaderboard.find((l) => l.id === participantId)?.current_score || 0;
  const currentRoundCfg = rounds.find((r) => r.round_number === currentRound);
  const isWaitingForNextRound =
    tournamentMode && roundPaused && sessionStatus === "active" && hasEnteredFullscreen;

  // ─── RENDER STATES ──────────────────────────────────────────────

  // Mobile block
  if (isMobileDevice.current && sessionStatus === "active") {
    return (
      <HoneycombLayout>
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="text-center">
            <Maximize className="mx-auto mb-4 h-16 w-16 text-destructive" />
            <h1 className="mb-2 text-2xl font-bold">Desktop Required</h1>
            <p className="text-muted-foreground">
              CodeRace competitions require a desktop browser with fullscreen support.
              Please rejoin from a laptop or computer.
            </p>
          </div>
        </main>
      </HoneycombLayout>
    );
  }

  // Disqualified spectator view
  if (participant?.is_disqualified) {
    return (
      <HoneycombLayout>
        <main className="mx-auto max-w-2xl px-4 py-8">
          <GlowCard className="mb-6 border-destructive/40">
            <div className="text-center">
              <Ban className="mx-auto mb-3 h-14 w-14 text-destructive" />
              <h1 className="mb-2 text-2xl font-bold text-destructive">Disqualified</h1>
              <p className="text-sm text-muted-foreground">{participant.dq_reason || "Rule violation"}</p>
              <p className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Eye className="h-3 w-3" /> Spectator mode — you can watch but not play
              </p>
            </div>
          </GlowCard>
          <GlowCard>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-primary" /> Live Leaderboard
            </h3>
            <AnimatedLeaderboard entries={leaderboard} highlightId={participantId} />
          </GlowCard>
        </main>
      </HoneycombLayout>
    );
  }

  // Lobby
  if (sessionStatus === "lobby") {
    return (
      <HoneycombLayout>
        <main className="scan-line flex min-h-screen flex-col items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-pulse-glow mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Zap className="h-10 w-10 text-primary" />
            </div>
            <h1 className="mb-2 text-3xl font-bold">Waiting for Host...</h1>
            <p className="text-muted-foreground">The race will begin when the host starts it.</p>
          </div>
        </main>
      </HoneycombLayout>
    );
  }

  // Finished
  if (sessionStatus === "finished") {
    return (
      <HoneycombLayout>
        <main className="mx-auto max-w-2xl px-4 py-12">
          <div className="mb-8 text-center">
            <Trophy className="mx-auto mb-4 h-16 w-16 text-primary" />
            <h1 className="mb-2 text-3xl font-bold">Race Complete!</h1>
            <p className="text-muted-foreground">Your rank: #{myRank} · Score: {myScore} pts</p>
          </div>
          <GlowCard>
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Trophy className="h-4 w-4 text-primary" /> Final Leaderboard
            </h3>
            <AnimatedLeaderboard entries={leaderboard} highlightId={participantId} />
          </GlowCard>
        </main>
      </HoneycombLayout>
    );
  }

  // FULLSCREEN ENTRY GATE — must enter fullscreen before seeing first question
  if (sessionStatus === "active" && !hasEnteredFullscreen) {
    return (
      <HoneycombLayout>
        <main className="flex min-h-screen items-center justify-center px-4">
          <GlowCard className="mx-auto max-w-md text-center">
            <Maximize className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="mb-2 text-2xl font-bold">Ready to Race?</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              For competition integrity, you must enter fullscreen mode. Exiting fullscreen during the race triggers a warning, and a second exit results in disqualification.
            </p>
            <Button variant="neon" size="xl" className="w-full" onClick={enterAndStart}>
              <Maximize className="h-5 w-5" /> Enter Fullscreen & Join
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Press ESC will trigger a strike warning.</p>
          </GlowCard>
        </main>
      </HoneycombLayout>
    );
  }

  // Active race
  return (
    <HoneycombLayout>
      <RoundTransition show={showRoundIntro} roundNumber={currentRound} roundName={currentRoundCfg?.name} />

      {/* STRIKE WARNING OVERLAY */}
      <AnimatePresence>
        {strikeWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center bg-background/80 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="rounded-2xl border-2 border-destructive bg-card p-8 text-center shadow-2xl"
            >
              <AlertTriangle className="mx-auto mb-4 h-16 w-16 animate-pulse text-destructive" />
              <h2 className="mb-2 text-3xl font-black uppercase tracking-tight text-destructive">
                Warning
              </h2>
              <p className="mb-6 text-lg font-semibold">
                Return to Fullscreen or be Disqualified
              </p>
              <div className="mb-4 text-7xl font-black text-destructive">{strikeCountdown}</div>
              <Button variant="neon" size="lg" onClick={enterFullscreen}>
                <Maximize className="h-4 w-4" /> Return to Fullscreen
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {tournamentMode && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                {currentRoundCfg?.name || `R${currentRound}`}
              </span>
            )}
            <span className="text-sm font-medium text-muted-foreground">
              Q{currentQIndex + 1}/{questions.length}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 text-sm ${timer <= 5 ? "text-destructive animate-pulse" : timer <= 10 ? "text-yellow-500" : "text-muted-foreground"}`}>
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
        {/* Round paused — waiting for host */}
        {isWaitingForNextRound && (
          <GlowCard className="mb-6 text-center">
            <Trophy className="mx-auto mb-2 h-10 w-10 text-primary" />
            <h2 className="mb-1 text-xl font-bold">Round {currentRound - 1} Complete</h2>
            <p className="text-sm text-muted-foreground">
              Waiting for the host to start the next round...
            </p>
          </GlowCard>
        )}

        {!isWaitingForNextRound && currentQ && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQIndex}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
            >
              <GlowCard className="mb-6">
                <div className="mb-2 flex items-center justify-between">
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
                  {submitted && showResult
                    ? currentQ.type === "mcq" && selected === currentQ.correct_option
                      ? "✅ Correct! Moving on..."
                      : "❌ Wrong. Moving on..."
                    : ""}
                </span>
                <Button variant="neon" size="xl" onClick={() => submitAnswer(false)} disabled={submitted || (currentQ.type === "mcq" && selected === null)}>
                  {submitted ? "Next..." : "Submit Answer"}
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        <GlowCard className="mt-8">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-primary" /> Leaderboard
          </h3>
          <AnimatedLeaderboard entries={leaderboard.slice(0, 8)} highlightId={participantId} />
        </GlowCard>
      </main>
    </HoneycombLayout>
  );
}
