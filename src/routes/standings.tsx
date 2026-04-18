import { createFileRoute, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Ban, Crown, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/standings")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: (search.sessionId as string) || "",
  }),
  component: Standings,
});

interface Standing {
  id: string;
  student_name: string;
  current_score: number;
  round_reached: number;
  eliminated_round: number | null;
  is_disqualified: boolean;
  dq_reason: string | null;
}

function Standings() {
  const { sessionId } = Route.useSearch();
  const [standings, setStandings] = useState<Standing[]>([]);
  const [rounds, setRounds] = useState<{ round_number: number; name: string }[]>([]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`standings-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const load = async () => {
    const { data: session } = await supabase.from("game_sessions").select("quiz_id").eq("id", sessionId).single();
    const { data } = await supabase
      .from("participants")
      .select("*")
      .eq("session_id", sessionId)
      .order("current_score", { ascending: false });
    setStandings((data as any) || []);
    if (session) {
      const { data: rs } = await (supabase as any)
        .from("quiz_rounds")
        .select("round_number, name")
        .eq("quiz_id", session.quiz_id)
        .order("round_number");
      setRounds((rs as any) || []);
    }
  };

  const survivors = standings.filter((s) => !s.is_disqualified && s.eliminated_round == null);
  const eliminatedByRound: Record<number, Standing[]> = {};
  for (const s of standings) {
    if (s.eliminated_round != null && !s.is_disqualified) {
      (eliminatedByRound[s.eliminated_round] ||= []).push(s);
    }
  }
  const dq = standings.filter((s) => s.is_disqualified);
  const sortedRoundNums = Object.keys(eliminatedByRound).map(Number).sort((a, b) => b - a);

  const roundName = (n: number) => rounds.find((r) => r.round_number === n)?.name || `Round ${n}`;

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/launch" search={{ sessionId }}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">
            <Trophy className="mr-2 inline h-6 w-6 text-primary" />
            Tournament Standings
          </h1>
        </div>

        {/* Survivors / Top players */}
        <GlowCard className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-primary">
            <Crown className="h-4 w-4" /> Still In The Race
          </h2>
          {survivors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active players</p>
          ) : (
            <div className="space-y-2">
              {survivors.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${i === 0 ? "border-primary/50 bg-primary/10" : "border-border bg-card"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-primary text-primary-foreground" : i < 3 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {i === 0 ? <Crown className="h-4 w-4" /> : i + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{p.student_name}</p>
                      <p className="text-xs text-muted-foreground">Reached {roundName(p.round_reached)}</p>
                    </div>
                  </div>
                  <span className="font-mono text-lg font-bold text-primary">{p.current_score}</span>
                </div>
              ))}
            </div>
          )}
        </GlowCard>

        {/* Elimination history */}
        {sortedRoundNums.length > 0 && (
          <GlowCard className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Medal className="h-4 w-4 text-yellow-500" /> Elimination History
            </h2>
            <div className="space-y-4">
              {sortedRoundNums.map((rn) => (
                <div key={rn}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Eliminated after {roundName(rn)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {eliminatedByRound[rn].map((p) => (
                      <span key={p.id} className="rounded-full border border-border bg-card px-3 py-1 text-sm">
                        {p.student_name} <span className="text-xs text-muted-foreground">· {p.current_score}pts</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>
        )}

        {/* DQ list */}
        {dq.length > 0 && (
          <GlowCard>
            <h2 className="mb-3 flex items-center gap-2 font-bold text-destructive">
              <Ban className="h-4 w-4" /> Disqualified
            </h2>
            <div className="space-y-2">
              {dq.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2">
                  <span className="font-medium line-through">{p.student_name}</span>
                  <span className="text-xs text-destructive">{p.dq_reason || "Rule violation"}</span>
                </div>
              ))}
            </div>
          </GlowCard>
        )}
      </main>
    </HoneycombLayout>
  );
}
