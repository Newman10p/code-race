import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { AnimatedLeaderboard } from "@/components/AnimatedLeaderboard";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Copy, Users, Zap, Trophy, Clock, Play, BarChart3, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/launch")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: (search.sessionId as string) || "",
  }),
  component: LaunchRoom,
});

interface Participant {
  id: string;
  student_name: string;
  current_score: number;
  is_flagged: boolean;
  tab_switch_count: number;
  is_disqualified: boolean;
  strike_count: number;
  round_reached: number;
  eliminated_round: number | null;
}

interface QuestionData {
  id: string;
  content: string;
  type: string;
  points: number;
  round_number: number;
}

interface RoundCfg {
  round_number: number;
  name: string;
  duration_seconds: number;
  cutoff_type: "top_n" | "top_pct";
  cutoff_value: number;
}

function LaunchRoom() {
  const { sessionId } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("lobby");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [rounds, setRounds] = useState<RoundCfg[]>([]);
  const [tournamentMode, setTournamentMode] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundPaused, setRoundPaused] = useState(true);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [quizId, setQuizId] = useState("");

  useEffect(() => {
    if (!sessionId) { navigate({ to: "/dashboard" }); return; }
    loadSession();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` }, () => loadParticipants())
      .on("postgres_changes", { event: "*", schema: "public", table: "participant_answers" }, () => loadParticipants())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${sessionId}` }, (payload) => {
        const updated = payload.new as any;
        setStatus(updated.status);
        setCurrentRound(updated.current_round ?? 1);
        setRoundPaused(updated.round_paused ?? true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const loadSession = async () => {
    const { data: session } = await supabase.from("game_sessions").select("*").eq("id", sessionId).single();
    if (!session) return;
    const s = session as any;
    setPin(session.pin_code);
    setStatus(session.status);
    setQuizId(session.quiz_id);
    setTournamentMode(s.tournament_mode ?? false);
    setCurrentRound(s.current_round ?? 1);
    setRoundPaused(s.round_paused ?? true);
    setDurationMinutes(s.duration_minutes ?? 0);

    const { data: qs } = await supabase
      .from("questions")
      .select("id, content, type, points, round_number")
      .eq("quiz_id", session.quiz_id)
      .order("order_index");
    setQuestions((qs as any) || []);

    const { data: rs } = await (supabase as any)
      .from("quiz_rounds")
      .select("*")
      .eq("quiz_id", session.quiz_id)
      .order("round_number");
    setRounds((rs as any) || []);

    loadParticipants();
  };

  const loadParticipants = async () => {
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("current_score", { ascending: false });
    setParticipants((data as any) || []);
  };

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRace = async () => {
    const update: any = {
      status: "active",
      current_question_index: 0,
      duration_minutes: durationMinutes,
      tournament_mode: tournamentMode,
      current_round: 1,
      round_paused: false,
      round_started_at: new Date().toISOString(),
    };
    await (supabase as any).from("game_sessions").update(update).eq("id", sessionId);
    setStatus("active");
    setRoundPaused(false);
  };

  const startNextRound = async () => {
    const next = currentRound + 1;
    // Apply cutoff: mark players outside top N/% as eliminated for next round
    const currentRoundCfg = rounds.find((r) => r.round_number === currentRound);
    if (currentRoundCfg) {
      const active = participants.filter((p) => !p.is_disqualified && p.round_reached >= currentRound);
      const cutoff = currentRoundCfg.cutoff_type === "top_n"
        ? currentRoundCfg.cutoff_value
        : Math.max(1, Math.ceil((active.length * currentRoundCfg.cutoff_value) / 100));
      const survivors = active.slice(0, cutoff);
      const eliminated = active.slice(cutoff);

      for (const p of survivors) {
        await supabase.from("participants").update({ round_reached: next } as any).eq("id", p.id);
      }
      for (const p of eliminated) {
        await supabase.from("participants").update({ eliminated_round: currentRound } as any).eq("id", p.id);
      }
    }

    await (supabase as any).from("game_sessions").update({
      current_round: next,
      round_paused: false,
      round_started_at: new Date().toISOString(),
    }).eq("id", sessionId);
    setCurrentRound(next);
    setRoundPaused(false);
  };

  const endRace = async () => {
    await supabase.from("game_sessions").update({ status: "finished" }).eq("id", sessionId);
    setStatus("finished");
  };

  // Compute cutoff position for current round
  const currentRoundCfg = rounds.find((r) => r.round_number === currentRound);
  const activeParticipants = participants.filter((p) => !p.is_disqualified && p.round_reached >= currentRound);
  const cutoffRank = currentRoundCfg
    ? currentRoundCfg.cutoff_type === "top_n"
      ? Math.min(currentRoundCfg.cutoff_value, activeParticipants.length)
      : Math.max(1, Math.ceil((activeParticipants.length * currentRoundCfg.cutoff_value) / 100))
    : null;

  const isLastRound = tournamentMode && rounds.length > 0 && currentRound >= rounds.length;
  const allRoundQuestionsAnswered = roundPaused && status === "active";

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {status === "lobby" && (
          <div className="text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">Game PIN</p>
            <div className="mb-4 flex items-center justify-center gap-2">
              {pin.split("").map((digit, i) => (
                <span key={i} className="pin-digit animate-pulse-glow inline-flex h-20 w-16 items-center justify-center rounded-xl border border-primary/30 bg-card">{digit}</span>
              ))}
            </div>
            <Button variant="neon-outline" size="sm" onClick={copyPin} className="mb-8">
              <Copy className="h-4 w-4" />{copied ? "Copied!" : "Copy PIN"}
            </Button>

            <GlowCard className="mx-auto max-w-md text-left">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{participants.length} Players Joined</span>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {participants.map((p) => (
                  <span key={p.id} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{p.student_name}</span>
                ))}
                {participants.length === 0 && <p className="text-sm text-muted-foreground">Waiting for students to join...</p>}
              </div>

              {/* Tournament toggle */}
              <div className="mb-3 flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Tournament Mode</p>
                    <p className="text-xs text-muted-foreground">
                      {rounds.length > 0 ? `${rounds.length} rounds configured` : "No rounds in this quiz"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={tournamentMode}
                  onCheckedChange={setTournamentMode}
                  disabled={rounds.length === 0}
                />
              </div>

              {/* Duration setting */}
              {!tournamentMode && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Overall Quiz Duration</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        type="number"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                        className="h-8 w-20 bg-background text-center"
                        min={0}
                        max={180}
                      />
                      <span className="text-sm text-muted-foreground">minutes (0 = no limit)</span>
                    </div>
                  </div>
                </div>
              )}

              <Button variant="neon" size="xl" className="w-full" onClick={startRace} disabled={participants.length === 0 || questions.length === 0}>
                <Zap className="h-5 w-5" /> Start Race ({questions.length} questions)
              </Button>
            </GlowCard>
          </div>
        )}

        {(status === "active" || status === "finished") && (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-bold">
                  {status === "finished" ? (
                    <><Trophy className="h-5 w-5 text-primary" />Race Complete</>
                  ) : tournamentMode ? (
                    <>🏆 {currentRoundCfg?.name || `Round ${currentRound}`}</>
                  ) : (
                    <>🏁 Race In Progress</>
                  )}
                </h2>
                {tournamentMode && status === "active" && (
                  <p className="text-xs text-muted-foreground">
                    Round {currentRound} of {rounds.length} · {currentRoundCfg && (currentRoundCfg.cutoff_type === "top_n" ? `Top ${currentRoundCfg.cutoff_value} advance` : `Top ${currentRoundCfg.cutoff_value}% advance`)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/standings" search={{ sessionId }}>
                  <Button variant="neon-outline" size="sm"><BarChart3 className="h-3 w-3" /> Standings</Button>
                </Link>
                <Link to="/report" search={{ sessionId }}>
                  <Button variant="neon-outline" size="sm"><FileBarChart className="h-3 w-3" /> Report</Button>
                </Link>
                <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary">
                  <Users className="h-3 w-3" /> {activeParticipants.length} active
                </span>
                {status === "active" && tournamentMode && roundPaused && !isLastRound && (
                  <Button variant="neon" size="sm" onClick={startNextRound}>
                    <Play className="h-3 w-3" /> Start Round {currentRound + 1}
                  </Button>
                )}
                {status === "active" && (
                  <Button variant="destructive" size="sm" onClick={endRace}>End Race</Button>
                )}
              </div>
            </div>

            <GlowCard className="mb-6">
              <p className="text-sm text-muted-foreground">
                {status === "finished"
                  ? "The race has ended. Final results below."
                  : tournamentMode && roundPaused
                    ? `⏸ Round ${currentRound} ended. Click "Start Round ${currentRound + 1}" when ready.`
                    : "Students are self-pacing through questions. Live leaderboard below."}
              </p>
            </GlowCard>

            <GlowCard>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Trophy className="h-4 w-4 text-primary" /> Live Leaderboard
                {tournamentMode && cutoffRank != null && status === "active" && (
                  <span className="ml-auto rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                    Cutoff at #{cutoffRank}
                  </span>
                )}
              </h3>
              <AnimatedLeaderboard
                entries={participants}
                cutoffRank={tournamentMode ? cutoffRank : null}
                showCutoffLine={tournamentMode && status === "active" && !isLastRound}
              />
            </GlowCard>
          </>
        )}
      </main>
    </HoneycombLayout>
  );
}
