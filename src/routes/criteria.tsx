import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_DIMENSIONS, type CriteriaDimension } from "@/lib/bulk-import";
import { ArrowLeft, Gauge, Plus, Trash2, Upload, Globe, Lock, Sparkles, Trophy, Bot } from "lucide-react";

export const Route = createFileRoute("/criteria")({
  head: () => ({
    meta: [
      { title: "Grading Criteria & Rubrics | CodeRace Setter Tools" },
      { name: "description", content: "Build weighted rubrics that score learner creativity and problem solving against your project brief." },
      { property: "og:title", content: "Grading Criteria & Rubrics | CodeRace" },
      { property: "og:description", content: "Weighted rubric scoring for creativity and problem solving on CodeRace projects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CriteriaPage,
});

interface Rubric {
  id: string;
  title: string;
  project_description: string;
  dimensions: CriteriaDimension[];
  passing_score: number;
  is_published: boolean;
}

interface Submission {
  id: string;
  learner_name: string;
  content: string;
  dimension_scores: Record<string, number>;
  total_score: number;
  feedback: string;
}

function CriteriaPage() {
  const { user, loading: authLoading } = useAuth();
  const { isSetter, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [rubrics, setRubrics] = useState<Rubric[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // draft rubric form
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [dimensions, setDimensions] = useState<CriteriaDimension[]>(DEFAULT_DIMENSIONS);
  const [passing, setPassing] = useState(60);
  const [published, setPublished] = useState(false);

  // scoring workbench
  const [learnerName, setLearnerName] = useState("");
  const [submissionText, setSubmissionText] = useState("");
  const [preview, setPreview] = useState<{ scores: Record<string, number>; total: number; feedback: string } | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isSetter)) navigate({ to: "/login" });
  }, [user, authLoading, roleLoading, isSetter, navigate]);

  useEffect(() => {
    if (user && !roleLoading) loadRubrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleLoading]);

  useEffect(() => {
    if (activeId) loadSubmissions(activeId);
    else setSubmissions([]);
  }, [activeId]);

  const loadRubrics = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("criteria_rubrics" as any)
      .select("*")
      .eq("setter_id", user!.id)
      .order("created_at", { ascending: false });
    const list = ((data as any[]) || []).map((r) => ({
      id: r.id,
      title: r.title,
      project_description: r.project_description || "",
      dimensions: (r.dimensions as CriteriaDimension[]) || DEFAULT_DIMENSIONS,
      passing_score: r.passing_score,
      is_published: r.is_published,
    }));
    setRubrics(list);
    if (!activeId && list.length > 0) setActiveId(list[0].id);
    setLoading(false);
  };

  const loadSubmissions = async (rubricId: string) => {
    const { data } = await supabase
      .from("criteria_submissions" as any)
      .select("*")
      .eq("rubric_id", rubricId)
      .order("total_score", { ascending: false });
    setSubmissions(
      ((data as any[]) || []).map((s) => ({
        id: s.id,
        learner_name: s.learner_name || "Unnamed",
        content: s.content || "",
        dimension_scores: (s.dimension_scores as Record<string, number>) || {},
        total_score: Number(s.total_score) || 0,
        feedback: s.feedback || "",
      }))
    );
  };

  const active = rubrics.find((r) => r.id === activeId) || null;

  const resetForm = () => {
    setTitle("");
    setBrief("");
    setDimensions(DEFAULT_DIMENSIONS);
    setPassing(60);
    setPublished(false);
  };

  const createRubric = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("criteria_rubrics" as any).insert({
      setter_id: user.id,
      title: title.trim(),
      project_description: brief,
      dimensions: dimensions as any,
      passing_score: passing,
      is_published: published,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    resetForm();
    loadRubrics();
  };

  const togglePublish = async (r: Rubric) => {
    await supabase.from("criteria_rubrics" as any).update({ is_published: !r.is_published }).eq("id", r.id);
    loadRubrics();
  };

  const deleteRubric = async (id: string) => {
    if (!confirm("Delete this rubric and all of its scored submissions?")) return;
    await supabase.from("criteria_rubrics" as any).delete().eq("id", id);
    if (activeId === id) setActiveId(null);
    loadRubrics();
  };

  const updateDim = (key: string, u: Partial<CriteriaDimension>) =>
    setDimensions(dimensions.map((d) => (d.key === key ? { ...d, ...u } : d)));
  const addDim = () =>
    setDimensions([...dimensions, { key: `custom_${Date.now()}`, label: "New criterion", weight: 10, keywords: [] }]);
  const removeDim = (key: string) => setDimensions(dimensions.filter((d) => d.key !== key));

  const totalWeight = dimensions.reduce((a, d) => a + (Number(d.weight) || 0), 0);

  const runAiEvaluation = async () => {
    if (!active || !submissionText.trim()) return;
    setEvaluating(true);
    setEvalError(null);
    setPreview(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          brief: active.project_description,
          dimensions: active.dimensions,
          submission: submissionText,
          learnerName: learnerName.trim() || "Unnamed",
          passingScore: active.passing_score,
        }),
      });
      const data = await resp.json().catch(() => ({ error: "Request failed" }));
      if (!resp.ok) throw new Error(data.error || `Error ${resp.status}`);
      setPreview({ scores: data.scores || {}, total: data.total ?? 0, feedback: data.feedback || "" });
    } catch (e: any) {
      setEvalError(e.message);
    } finally {
      setEvaluating(false);
    }
  };

  const saveScored = async () => {
    if (!active || !user || !preview) return;
    const passed = preview.total >= active.passing_score;
    const breakdown = active.dimensions
      .map((d) => `${d.label}: ${preview.scores[d.key] ?? 0}/100`)
      .join(" · ");
    const feedback = `${preview.feedback ? preview.feedback + "\n\n" : ""}${breakdown} — ${passed ? "Meets" : "Below"} the passing score of ${active.passing_score}.`;
    const { error } = await supabase.from("criteria_submissions" as any).insert({
      rubric_id: active.id,
      user_id: user.id,
      learner_name: learnerName.trim() || "Unnamed",
      content: submissionText,
      dimension_scores: preview.scores as any,
      total_score: preview.total,
      feedback,
      scored_at: new Date().toISOString(),
    });
    if (error) { alert(error.message); return; }
    setLearnerName("");
    setSubmissionText("");
    setPreview(null);
    setEvalError(null);
    loadSubmissions(active.id);
  };

  if (authLoading || roleLoading || loading) {
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
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Gauge className="h-7 w-7 text-primary" /> <span className="text-primary">Criteria</span> & Rubrics
        </h1>
        <p className="mb-8 text-muted-foreground">
          Upload a project brief, weight the qualities you care about, and score creativity and problem solving consistently.
        </p>

        {/* New rubric */}
        <GlowCard className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Plus className="h-5 w-5 text-primary" /> New Rubric
          </h2>
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rubric title (e.g. Term 2 Web Project)" />
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4" /> Project description / brief (paste, or upload a .txt / .md file)
              </label>
              <Textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Describe the project: goals, required features, constraints, and what an excellent solution looks like."
                className="min-h-[140px] text-sm"
              />
              <input
                type="file"
                accept=".txt,.md,.csv,.json"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setBrief(await f.text());
                }}
                className="mt-2 text-xs text-muted-foreground file:mr-2 file:rounded file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs file:text-foreground"
              />
            </div>

            <div className="rounded-lg border border-border bg-background/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Scoring algorithm</p>
                <span className={`text-xs ${totalWeight === 100 ? "text-primary" : "text-yellow-500"}`}>
                  Total weight: {totalWeight}%
                </span>
              </div>
              <div className="space-y-2">
                {dimensions.map((d) => (
                  <div key={d.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_2fr_auto]">
                    <Input value={d.label} onChange={(e) => updateDim(d.key, { label: e.target.value })} className="h-9 text-sm" />
                    <div className="flex h-9 items-center gap-1 rounded border border-input bg-card px-2">
                      <input
                        type="number"
                        value={d.weight}
                        onChange={(e) => updateDim(d.key, { weight: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        min={0}
                        max={100}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                    <Input
                      value={d.keywords.join(", ")}
                      onChange={(e) => updateDim(d.key, { keywords: e.target.value.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean) })}
                      placeholder="Evidence keywords (blank = compare against the brief)"
                      className="h-9 text-sm"
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeDim(d.key)} className="h-9 w-9 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="neon-outline" size="sm" className="mt-3" onClick={addDim}>
                <Plus className="h-3 w-3" /> Add criterion
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                <span className="text-sm text-muted-foreground">Passing score</span>
                <input
                  type="number"
                  value={passing}
                  onChange={(e) => setPassing(parseInt(e.target.value) || 0)}
                  className="w-16 bg-transparent text-sm focus:outline-none"
                  min={0}
                  max={100}
                />
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
                <span className="text-sm">Publish to learners</span>
                <Switch checked={published} onCheckedChange={setPublished} />
              </div>
            </div>

            <Button variant="neon" onClick={createRubric} disabled={saving || !title.trim()}>
              {saving ? "Saving..." : "Create Rubric"}
            </Button>
          </div>
        </GlowCard>

        {/* Rubric list */}
        <GlowCard className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Your Rubrics</h2>
          {rubrics.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No rubrics yet.</p>
          ) : (
            <div className="space-y-2">
              {rubrics.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    activeId === r.id ? "border-primary bg-primary/5" : "border-border bg-background/50"
                  }`}
                >
                  <button onClick={() => setActiveId(r.id)} className="text-left">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.dimensions.length} criteria · pass {r.passing_score} · {r.is_published ? "Published" : "Draft"}
                    </p>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button variant={r.is_published ? "neon-outline" : "neon"} size="sm" onClick={() => togglePublish(r)}>
                      {r.is_published ? (<><Lock className="h-3 w-3" /> Unpublish</>) : (<><Globe className="h-3 w-3" /> Publish</>)}
                    </Button>
                    <button onClick={() => deleteRubric(r.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlowCard>

        {/* Scoring workbench */}
        {active && (
          <GlowCard className="mb-8">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" /> Score a submission — {active.title}
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Paste (or upload) the learner's project write-up or code. The AI evaluator reads your rubric text and scores every criterion against it.
            </p>
            <div className="space-y-3">
              <Input value={learnerName} onChange={(e) => setLearnerName(e.target.value)} placeholder="Learner name" />
              <Textarea
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                placeholder="Paste the learner's submission here..."
                className="min-h-[160px] font-mono text-xs"
              />
              <input
                type="file"
                accept=".txt,.md,.json,.js,.ts,.py,.html,.css"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setSubmissionText(await f.text());
                }}
                className="text-xs text-muted-foreground file:mr-2 file:rounded file:border file:border-input file:bg-background file:px-2 file:py-1 file:text-xs file:text-foreground"
              />
              <div className="flex gap-2">
                <Button variant="neon-outline" onClick={runAiEvaluation} disabled={evaluating || !submissionText.trim()}>
                  <Bot className="h-4 w-4" /> {evaluating ? "AI evaluating..." : "Evaluate with AI"}
                </Button>
                <Button variant="neon" onClick={saveScored} disabled={!preview}>
                  Save Result
                </Button>
              </div>

              {evalError && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{evalError}</p>
              )}

              {preview && (
                <div className="rounded-lg border border-border bg-background/50 p-4">
                  <div className="mb-3 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">{preview.total}</span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${preview.total >= active.passing_score ? "bg-green-500/15 text-green-500" : "bg-destructive/15 text-destructive"}`}>
                      {preview.total >= active.passing_score ? "PASS" : "BELOW CUTOFF"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {active.dimensions.map((d) => (
                      <div key={d.key}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span>{d.label} <span className="text-muted-foreground">({d.weight}%)</span></span>
                          <span className="font-mono text-primary">{preview.scores[d.key] ?? 0}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${preview.scores[d.key] ?? 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </GlowCard>
        )}

        {/* Ranked results */}
        {active && (
          <GlowCard>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Trophy className="h-5 w-5 text-primary" /> Ranked Results
            </h2>
            {submissions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No scored submissions yet.</p>
            ) : (
              <div className="space-y-2">
                {submissions.map((s, i) => (
                  <div key={s.id} className="rounded-lg border border-border bg-background/50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">#{i + 1}</span>
                        <p className="font-medium">{s.learner_name}</p>
                      </div>
                      <span className={`font-mono text-sm ${s.total_score >= active.passing_score ? "text-green-500" : "text-destructive"}`}>
                        {s.total_score}/100
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.feedback}</p>
                  </div>
                ))}
              </div>
            )}
          </GlowCard>
        )}
      </main>
    </HoneycombLayout>
  );
}
