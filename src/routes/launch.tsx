import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { useState, useEffect } from "react";
import { Copy, Users, Zap, Trophy, AlertTriangle, Clock } from "lucide-react";
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
}

interface QuestionData {
  id: string;
  content: string;
  type: string;
  points: number;
}

function LaunchRoom() {
  const { sessionId } = Route.useSearch();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("lobby");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(0);

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
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const loadSession = async () => {
    const { data: session } = await supabase.from("game_sessions").select("*").eq("id", sessionId).single();
    if (!session) return;
    setPin(session.pin_code);
    setStatus(session.status);

    const { data: qs } = await supabase
      .from("questions")
      .select("id, content, type, points")
      .eq("quiz_id", session.quiz_id)
      .order("order_index");
    setQuestions(qs || []);
    loadParticipants();
  };

  const loadParticipants = async () => {
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("current_score", { ascending: false });
    setParticipants(data || []);
  };

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRace = async () => {
    await supabase.from("game_sessions").update({
      status: "active",
      current_question_index: 0,
      duration_minutes: durationMinutes,
    } as any).eq("id", sessionId);
    setStatus("active");
  };

  const endRace = async () => {
    await supabase.from("game_sessions").update({ status: "finished" }).eq("id", sessionId);
    setStatus("finished");
  };

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

            <GlowCard className="mx-auto max-w-md">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{participants.length} Players Joined</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {participants.map((p) => (
                  <span key={p.id} className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{p.student_name}</span>
                ))}
                {participants.length === 0 && <p className="text-sm text-muted-foreground">Waiting for students to join...</p>}
              </div>

              {/* Duration setting */}
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                <Clock className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">Overall Quiz Duration</label>
                  <div className="flex items-center gap-2 mt-1">
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

              <Button variant="neon" size="xl" className="w-full" onClick={startRace} disabled={participants.length === 0}>
                <Zap className="h-5 w-5" /> Start Race ({questions.length} questions)
              </Button>
            </GlowCard>
          </div>
        )}

        {(status === "active" || status === "finished") && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                {status === "finished" ? (
                  <><Trophy className="inline h-5 w-5 text-primary mr-2" />Race Complete</>
                ) : (
                  <>🏁 Race In Progress</>
                )}
              </h2>
              {status === "active" && (
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm text-primary">
                    <Users className="h-3 w-3" /> {participants.length} racers
                  </span>
                  <Button variant="destructive" size="sm" onClick={endRace}>End Race</Button>
                </div>
              )}
            </div>

            <GlowCard className="mb-6">
              <p className="text-sm text-muted-foreground mb-2">
                {status === "active"
                  ? "Students are self-pacing through questions. Monitor the leaderboard below."
                  : "The race has ended. Final results are below."}
              </p>
            </GlowCard>

            {/* Leaderboard */}
            <GlowCard>
              <h3 className="mb-3 font-semibold flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Leaderboard
              </h3>
              <div className="space-y-2">
                {participants.map((p, i) => (
                  <div key={p.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${i === 0 ? "border-primary/50 bg-primary/5" : "border-border bg-card"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                      <span className="font-medium">{p.student_name}</span>
                      {p.is_flagged && <span title={`Tab switches: ${p.tab_switch_count}`}><AlertTriangle className="h-4 w-4 text-destructive" /></span>}
                    </div>
                    <div className="flex items-center gap-1 font-mono text-sm font-bold text-primary">
                      <Zap className="h-3 w-3" />{p.current_score}
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>
          </>
        )}
      </main>
    </HoneycombLayout>
  );
}
