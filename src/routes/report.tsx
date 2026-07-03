import { createFileRoute, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Trophy,
  BarChart3,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/report")({
  validateSearch: (search: Record<string, unknown>) => ({
    sessionId: (search.sessionId as string) || "",
  }),
  component: ReportPage,
});

interface Participant {
  id: string;
  student_name: string;
  current_score: number;
  is_disqualified: boolean;
}
interface Question {
  id: string;
  content: string;
  points: number;
  order_index: number;
}
interface Answer {
  participant_id: string;
  question_id: string;
  is_correct: boolean;
  points_awarded: number;
}

function ReportPage() {
  const { sessionId } = Route.useSearch();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [isEvaluation, setIsEvaluation] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    load();
    const channel = supabase
      .channel(`report-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participant_answers" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `session_id=eq.${sessionId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const load = async () => {
    const { data: session } = await supabase
      .from("game_sessions")
      .select("quiz_id")
      .eq("id", sessionId)
      .single();
    if (!session) return;

    const { data: quiz } = await supabase
      .from("quizzes")
      .select("title, is_evaluation")
      .eq("id", session.quiz_id)
      .single();
    setQuizTitle(quiz?.title || "");
    setIsEvaluation(((quiz as any)?.is_evaluation) ?? false);

    const { data: qs } = await supabase
      .from("questions")
      .select("id, content, points, order_index")
      .eq("quiz_id", session.quiz_id)
      .order("order_index");
    setQuestions((qs as any) || []);

    const { data: ps } = await supabase
      .from("participants")
      .select("id, student_name, current_score, is_disqualified")
      .eq("session_id", sessionId)
      .order("current_score", { ascending: false });
    setParticipants((ps as any) || []);

    const participantIds = (ps || []).map((p: any) => p.id);
    if (participantIds.length > 0) {
      const { data: ans } = await supabase
        .from("participant_answers")
        .select("participant_id, question_id, is_correct, points_awarded")
        .in("participant_id", participantIds);
      setAnswers((ans as any) || []);
    } else {
      setAnswers([]);
    }
    setLoading(false);
  };

  // Build per-participant summaries
  const rows = useMemo(() => {
    return participants.map((p) => {
      const mine = answers.filter((a) => a.participant_id === p.id);
      const correct = mine.filter((a) => a.is_correct).length;
      const wrong = mine.filter((a) => !a.is_correct).length;
      const skipped = Math.max(0, questions.length - mine.length);
      const accuracy = questions.length
        ? Math.round((correct / questions.length) * 100)
        : 0;
      return { ...p, correct, wrong, skipped, accuracy };
    });
  }, [participants, answers, questions]);

  // Ranked by accuracy (then score for tie-breaks)
  const ranked = useMemo(
    () =>
      [...rows].sort(
        (a, b) => b.accuracy - a.accuracy || b.current_score - a.current_score,
      ),
    [rows],
  );

  // Per-question stats
  const questionStats = useMemo(() => {
    return questions.map((q) => {
      const forQ = answers.filter((a) => a.question_id === q.id);
      const correct = forQ.filter((a) => a.is_correct).length;
      const attempts = forQ.length;
      const pct = attempts ? Math.round((correct / attempts) * 100) : 0;
      return { ...q, correct, attempts, pct };
    });
  }, [questions, answers]);

  const exportCsv = () => {
    const header = [
      "Participant",
      "Rank",
      "Score",
      "Correct",
      "Wrong",
      "Skipped",
      "Accuracy %",
      "Disqualified",
    ];
    const lines = [header.join(",")];
    ranked.forEach((r, i) => {
      lines.push(
        [
          JSON.stringify(r.student_name),
          i + 1,
          r.current_score,
          r.correct,
          r.wrong,
          r.skipped,
          r.accuracy,
          r.is_disqualified ? "yes" : "no",
        ].join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <HoneycombLayout>
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </HoneycombLayout>
    );
  }

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/launch" search={{ sessionId }}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <BarChart3 className="h-6 w-6 text-primary" /> Performance Report
              </h1>
              <p className="text-sm text-muted-foreground">
                {quizTitle}
                {isEvaluation && (
                  <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
                    Evaluation
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button variant="neon-outline" size="sm" onClick={exportCsv}>
            <Download className="h-3 w-3" /> Export CSV
          </Button>
        </div>

        {/* Ranking */}
        <GlowCard className="mb-6 overflow-x-auto">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Trophy className="h-4 w-4 text-primary" /> Ranking by Performance
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2 pr-3">#</th>
                <th className="pr-3">Learner</th>
                <th className="pr-3">Score</th>
                <th className="pr-3 text-green-500">✓</th>
                <th className="pr-3 text-destructive">✕</th>
                <th className="pr-3">Skipped</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr
                  key={r.id}
                  className={`border-b border-border/40 ${r.is_disqualified ? "opacity-50" : ""}`}
                >
                  <td className="py-2 pr-3 font-mono">{i + 1}</td>
                  <td className="pr-3 font-medium">
                    {r.student_name}
                    {r.is_disqualified && (
                      <span className="ml-2 rounded bg-destructive/20 px-1.5 py-0.5 text-xs text-destructive">
                        DQ
                      </span>
                    )}
                  </td>
                  <td className="pr-3 font-mono">{r.current_score}</td>
                  <td className="pr-3 text-green-500">{r.correct}</td>
                  <td className="pr-3 text-destructive">{r.wrong}</td>
                  <td className="pr-3 text-muted-foreground">{r.skipped}</td>
                  <td className="min-w-40">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${r.accuracy}%` }}
                        />
                      </div>
                      <span className="w-10 text-right font-mono text-xs">
                        {r.accuracy}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ranked.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">
              No participants yet.
            </p>
          )}
        </GlowCard>

        {/* Per-question performance */}
        <GlowCard className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <BarChart3 className="h-4 w-4 text-primary" /> Per-Question Difficulty
          </h2>
          <div className="space-y-2">
            {questionStats.map((q, i) => (
              <div
                key={q.id}
                className="rounded-lg border border-border bg-card/50 p-3"
              >
                <div className="mb-1 flex items-start justify-between gap-3">
                  <p className="text-sm">
                    <span className="mr-2 font-mono text-xs text-muted-foreground">
                      Q{i + 1}
                    </span>
                    {q.content}
                  </p>
                  <span className="shrink-0 text-xs font-semibold text-primary">
                    {q.correct}/{q.attempts} · {q.pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      q.pct >= 70
                        ? "bg-green-500"
                        : q.pct >= 40
                          ? "bg-yellow-500"
                          : "bg-destructive"
                    }`}
                    style={{ width: `${q.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlowCard>

        {/* Per-participant per-question grid */}
        <GlowCard className="overflow-x-auto">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Answer Grid
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="sticky left-0 z-10 bg-card py-2 pr-3">Learner</th>
                {questions.map((_, i) => (
                  <th key={i} className="px-1 text-center font-mono">
                    Q{i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="sticky left-0 z-10 bg-card py-2 pr-3 font-medium">
                    {r.student_name}
                  </td>
                  {questions.map((q) => {
                    const a = answers.find(
                      (x) => x.participant_id === r.id && x.question_id === q.id,
                    );
                    return (
                      <td key={q.id} className="px-1 text-center">
                        {!a ? (
                          <MinusCircle className="mx-auto h-4 w-4 text-muted-foreground/50" />
                        ) : a.is_correct ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="mx-auto h-4 w-4 text-destructive" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" /> Correct
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-destructive" /> Wrong
            </span>
            <span className="flex items-center gap-1">
              <MinusCircle className="h-3 w-3" /> Not answered
            </span>
          </div>
        </GlowCard>
      </main>
    </HoneycombLayout>
  );
}