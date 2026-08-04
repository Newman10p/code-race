import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trophy, CheckCircle2, XCircle, ChevronDown } from "lucide-react";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Published Results & Rankings | CodeRace" },
      { name: "description", content: "See published rubric results, scores and rankings for every graded CodeRace project." },
      { property: "og:title", content: "Published Results & Rankings | CodeRace" },
      { property: "og:description", content: "Scores, pass marks and rankings for published CodeRace project rubrics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResultsPage,
});

interface Rubric {
  id: string;
  title: string;
  project_description: string;
  passing_score: number;
}

interface Row {
  id: string;
  rubric_id: string;
  learner_name: string;
  total_score: number;
  feedback: string;
  user_id: string | null;
}

function ResultsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data: rubricData } = await supabase
        .from("criteria_rubrics")
        .select("id, title, project_description, passing_score")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      const list = (rubricData || []) as Rubric[];
      setRubrics(list);
      if (list.length > 0) {
        const { data: subs } = await supabase
          .from("criteria_submissions")
          .select("id, rubric_id, learner_name, total_score, feedback, user_id")
          .in("rubric_id", list.map((r) => r.id))
          .order("total_score", { ascending: false });
        setRows(((subs || []) as any[]).map((s) => ({ ...s, total_score: Number(s.total_score) || 0 })));
      } else {
        setRows([]);
      }
      setLoading(false);
    })();
  }, [user]);

  if (authLoading || loading) {
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
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/learn" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Trophy className="h-7 w-7 text-primary" /> Published <span className="text-primary">Results</span>
        </h1>
        <p className="mb-8 text-muted-foreground">
          Rankings for every rubric a setter has published. Your own entry is highlighted.
        </p>

        {rubrics.length === 0 && (
          <GlowCard>
            <p className="py-6 text-center text-sm text-muted-foreground">No results have been published yet.</p>
          </GlowCard>
        )}

        <div className="space-y-6">
          {rubrics.map((r) => {
            const entries = rows.filter((x) => x.rubric_id === r.id);
            return (
              <GlowCard key={r.id}>
                <div className="mb-3">
                  <h2 className="text-lg font-semibold">{r.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    Pass mark {r.passing_score} · {entries.length} result(s)
                  </p>
                </div>
                {entries.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No graded submissions yet.</p>
                ) : (
                  <div className="space-y-2">
                    {entries.map((e, i) => {
                      const mine = !!user && e.user_id === user.id;
                      const passed = e.total_score >= r.passing_score;
                      const open = openId === e.id;
                      return (
                        <div
                          key={e.id}
                          className={`rounded-lg border p-3 ${mine ? "border-primary bg-primary/10" : "border-border bg-background/50"}`}
                        >
                          <button
                            className="flex w-full items-center justify-between text-left"
                            onClick={() => setOpenId(open ? null : e.id)}
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 text-sm font-bold text-primary">#{i + 1}</span>
                              <div>
                                <p className="font-medium">
                                  {e.learner_name}
                                  {mine && <span className="ml-2 text-xs text-primary">(you)</span>}
                                </p>
                                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                  {passed ? (
                                    <><CheckCircle2 className="h-3 w-3 text-primary" /> Passed</>
                                  ) : (
                                    <><XCircle className="h-3 w-3 text-destructive" /> Below pass mark</>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold">{e.total_score.toFixed(1)}</span>
                              <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          {open && (
                            <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-sm text-muted-foreground">
                              {e.feedback || "No written feedback recorded."}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlowCard>
            );
          })}
        </div>
      </main>
    </HoneycombLayout>
  );
}