import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Code, ListChecks, Zap, GripVertical, Clock, Trophy, Users, Percent, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MonacoCodeEditor } from "@/components/code/MonacoCodeEditor";
import { CodeTestEditor } from "@/components/code/CodeTestEditor";
import type { TestCase } from "@/lib/code-runners";

export const Route = createFileRoute("/quiz/create")({
  validateSearch: (search: Record<string, unknown>) => ({
    folderId: (search.folderId as string) || "",
    quizId: (search.quizId as string) || "",
  }),
  component: QuizCreator,
});

interface Question {
  id: string;
  type: "mcq" | "code";
  content: string;
  points: number;
  timeLimit: number;
  roundNumber: number;
  options?: string[];
  correctOption?: number;
  starterCode?: string;
  solution?: string;
  language?: string;
  testMode?: "io" | "assert";
  testCases?: TestCase[];
  dbId?: string;
}

interface RoundConfig {
  roundNumber: number;
  name: string;
  durationSeconds: number;
  cutoffType: "top_n" | "top_pct";
  cutoffValue: number;
}

function QuizCreator() {
  const { folderId, quizId } = Route.useSearch();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [rounds, setRounds] = useState<RoundConfig[]>([
    { roundNumber: 1, name: "Round 1", durationSeconds: 300, cutoffType: "top_n", cutoffValue: 10 },
  ]);
  const [tournamentMode, setTournamentMode] = useState(false);
  const [isEvaluation, setIsEvaluation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkData, setBulkData] = useState("");
  const isEditing = !!quizId;

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate({ to: "/login" });
  }, [user, authLoading, isAdmin]);

  useEffect(() => {
    if (quizId && user) loadQuiz();
  }, [quizId, user]);

  const loadQuiz = async () => {
    const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", quizId).single();
    if (quiz) {
      setTitle(quiz.title);
      setDescription(quiz.description || "");
      setIsEvaluation(((quiz as any).is_evaluation) ?? false);
    }
    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("order_index");
    if (qs) {
      setQuestions(
        qs.map((q) => ({
          id: q.id,
          dbId: q.id,
          type: q.type as "mcq" | "code",
          content: q.content,
          points: q.points,
          timeLimit: (q as any).time_limit ?? 30,
          roundNumber: (q as any).round_number ?? 1,
          options: (q.options as string[]) || ["", "", "", ""],
          correctOption: q.correct_option || 0,
          starterCode: q.starter_code || "",
          solution: q.solution || "",
          language: (q as any).language || "javascript",
          testMode: ((q as any).test_mode as "io" | "assert") || "io",
          testCases: ((q as any).test_cases as TestCase[]) || [],
        }))
      );
    }
    const { data: rs } = await (supabase as any)
      .from("quiz_rounds")
      .select("*")
      .eq("quiz_id", quizId)
      .order("round_number");
    if (rs && rs.length > 0) {
      setTournamentMode(true);
      setRounds(
        rs.map((r: any) => ({
          roundNumber: r.round_number,
          name: r.name || `Round ${r.round_number}`,
          durationSeconds: r.duration_seconds,
          cutoffType: r.cutoff_type as "top_n" | "top_pct",
          cutoffValue: r.cutoff_value,
        }))
      );
    }
  };

  const addQuestion = (type: "mcq" | "code", roundNumber = 1) => {
    const q: Question = {
      id: Date.now().toString() + Math.random(),
      type,
      content: "",
      points: 10,
      timeLimit: 30,
      roundNumber,
      ...(type === "mcq"
        ? { options: ["", "", "", ""], correctOption: 0 }
        : { starterCode: "// Write your code here\n", solution: "", language: "javascript", testMode: "io" as const, testCases: [] }),
    };
    setQuestions([...questions, q]);
  };

  const removeQuestion = (id: string) => setQuestions(questions.filter((q) => q.id !== id));
  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const addRound = () => {
    const next = rounds.length + 1;
    setRounds([...rounds, { roundNumber: next, name: `Round ${next}`, durationSeconds: 300, cutoffType: "top_n", cutoffValue: 5 }]);
  };
  const removeRound = (n: number) => {
    if (rounds.length <= 1) return;
    setRounds(rounds.filter((r) => r.roundNumber !== n).map((r, i) => ({ ...r, roundNumber: i + 1 })));
    setQuestions(questions.map((q) => (q.roundNumber === n ? { ...q, roundNumber: 1 } : q.roundNumber > n ? { ...q, roundNumber: q.roundNumber - 1 } : q)));
  };
  const updateRound = (n: number, updates: Partial<RoundConfig>) => {
    setRounds(rounds.map((r) => (r.roundNumber === n ? { ...r, ...updates } : r)));
  };

  const importBulk = () => {
    try {
      const parsed = JSON.parse(bulkData);
      if (!Array.isArray(parsed)) throw new Error("Must be an array");
      const imported: Question[] = parsed.map((item: any, i: number) => ({
        id: `import-${Date.now()}-${i}`,
        type: item.type || "mcq",
        content: item.content || "",
        points: item.points || 10,
        timeLimit: item.timeLimit ?? 30,
        roundNumber: item.roundNumber ?? 1,
        options: item.options || ["", "", "", ""],
        correctOption: item.correctOption ?? 0,
        starterCode: item.starterCode || "",
        solution: item.solution || "",
      }));
      setQuestions([...questions, ...imported]);
      setBulkData("");
      setShowBulkImport(false);
    } catch {
      alert("Invalid JSON format. Please provide a valid JSON array.");
    }
  };

  const saveQuiz = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    try {
      let targetQuizId = quizId;
      const totalPoints = questions.reduce((a, q) => a + q.points, 0);

      if (isEditing) {
        await supabase.from("quizzes").update({ title, description, total_points: totalPoints, is_evaluation: isEvaluation } as any).eq("id", quizId);
        await supabase.from("questions").delete().eq("quiz_id", quizId);
        await (supabase as any).from("quiz_rounds").delete().eq("quiz_id", quizId);
      } else {
        const { data } = await supabase
          .from("quizzes")
          .insert({ folder_id: folderId, title, description, total_points: totalPoints, is_evaluation: isEvaluation } as any)
          .select("id")
          .single();
        if (!data) throw new Error("Failed to create quiz");
        targetQuizId = data.id;
      }

      if (questions.length > 0) {
        await supabase.from("questions").insert(
          questions.map((q, i) => ({
            quiz_id: targetQuizId,
            type: q.type,
            content: q.content,
            points: q.points,
            time_limit: q.timeLimit,
            round_number: tournamentMode ? q.roundNumber : 1,
            options: q.type === "mcq" ? q.options : [],
            correct_option: q.type === "mcq" ? q.correctOption : 0,
            starter_code: q.type === "code" ? q.starterCode : "",
            solution: q.type === "code" ? q.solution : "",
            language: q.type === "code" ? (q.language || "javascript") : "javascript",
            test_mode: q.type === "code" ? (q.testMode || "io") : "io",
            test_cases: q.type === "code" ? (q.testCases || []) : [],
            order_index: i,
          })) as any
        );
      }

      if (tournamentMode && rounds.length > 0) {
        await (supabase as any).from("quiz_rounds").insert(
          rounds.map((r) => ({
            quiz_id: targetQuizId,
            round_number: r.roundNumber,
            name: r.name,
            duration_seconds: r.durationSeconds,
            cutoff_type: r.cutoffType,
            cutoff_value: r.cutoffValue,
          }))
        );
      }

      navigate({ to: "/folder/$folderId", params: { folderId } });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Group questions by round when tournament mode is on
  const questionsByRound = (roundNum: number) =>
    questions.filter((q) => q.roundNumber === roundNum);
  const ungroupedQuestions = tournamentMode ? [] : questions;

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/folder/$folderId" params={{ folderId }}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">
            <span className="text-primary">{isEditing ? "Edit" : "Create"}</span> Quiz
          </h1>
        </div>

        <GlowCard className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Quiz Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. OSI Model Layers" className="bg-background" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" className="bg-background" />
            </div>

            {/* Game mode toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Tournament Rounds Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {tournamentMode
                      ? "Players are eliminated after each round based on cutoff"
                      : "Standard mode — all players answer all questions"}
                  </p>
                </div>
              </div>
              <Switch checked={tournamentMode} onCheckedChange={setTournamentMode} />
            </div>

            {/* Evaluation mode toggle (mutually exclusive with tournament) */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Evaluation / Assessment Mode</p>
                  <p className="text-xs text-muted-foreground">
                    {isEvaluation
                      ? tournamentMode
                        ? "Tournament evaluation — rounds with cutoffs plus per-learner performance breakdown at the end."
                        : "Runs live like a quiz, but focused on measuring performance. Every learner sees a per-question breakdown at the end."
                      : "Standard race — ranks by speed and score"}
                  </p>
                </div>
              </div>
              <Switch checked={isEvaluation} onCheckedChange={setIsEvaluation} />
            </div>
          </div>
        </GlowCard>

        {/* Round configuration */}
        {tournamentMode && (
          <GlowCard className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <Trophy className="h-4 w-4 text-primary" /> Round Settings
              </h3>
              <Button variant="neon-outline" size="sm" onClick={addRound}>
                <Plus className="h-3 w-3" /> Add Round
              </Button>
            </div>
            <div className="space-y-3">
              {rounds.map((r) => (
                <div key={r.roundNumber} className="rounded-lg border border-border bg-background p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">
                      ROUND {r.roundNumber}
                    </span>
                    <Input
                      value={r.name}
                      onChange={(e) => updateRound(r.roundNumber, { name: e.target.value })}
                      placeholder={`Round ${r.roundNumber} name`}
                      className="h-8 flex-1 bg-card text-sm"
                    />
                    {rounds.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeRound(r.roundNumber)} className="h-8 w-8 text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="flex items-center gap-1 rounded border border-input bg-card px-2">
                      <Clock className="h-3 w-3 text-primary" />
                      <input
                        type="number"
                        value={r.durationSeconds}
                        onChange={(e) => updateRound(r.roundNumber, { durationSeconds: parseInt(e.target.value) || 60 })}
                        className="w-full bg-transparent py-1 text-sm focus:outline-none"
                        min={30}
                        max={3600}
                      />
                      <span className="text-xs text-muted-foreground">sec</span>
                    </div>
                    <select
                      value={r.cutoffType}
                      onChange={(e) => updateRound(r.roundNumber, { cutoffType: e.target.value as "top_n" | "top_pct" })}
                      className="rounded border border-input bg-card px-2 py-1 text-sm focus:outline-none"
                    >
                      <option value="top_n">Top N players</option>
                      <option value="top_pct">Top % players</option>
                    </select>
                    <div className="flex items-center gap-1 rounded border border-input bg-card px-2">
                      {r.cutoffType === "top_n" ? <Users className="h-3 w-3 text-primary" /> : <Percent className="h-3 w-3 text-primary" />}
                      <input
                        type="number"
                        value={r.cutoffValue}
                        onChange={(e) => updateRound(r.roundNumber, { cutoffValue: parseInt(e.target.value) || 1 })}
                        className="w-full bg-transparent py-1 text-sm focus:outline-none"
                        min={1}
                        max={r.cutoffType === "top_pct" ? 100 : 1000}
                      />
                      <span className="text-xs text-muted-foreground">{r.cutoffType === "top_pct" ? "%" : ""}</span>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {questionsByRound(r.roundNumber).length} question(s) · {r.cutoffType === "top_n" ? `Top ${r.cutoffValue} advance` : `Top ${r.cutoffValue}% advance`}
                  </p>
                </div>
              ))}
            </div>
          </GlowCard>
        )}

        <div className="mb-4 flex items-center gap-2">
          <Button variant="neon-outline" size="sm" onClick={() => setShowBulkImport(!showBulkImport)}>
            ICT Bulk Upload
          </Button>
        </div>

        {showBulkImport && (
          <GlowCard className="mb-6">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Paste JSON questions</label>
            <textarea
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              placeholder={`[{"type":"mcq","content":"What layer is HTTP?","points":10,"roundNumber":1,"options":["L1","L4","L7","L3"],"correctOption":2}]`}
              className="w-full rounded-lg border border-input bg-background p-3 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              rows={5}
            />
            <Button variant="neon" size="sm" className="mt-2" onClick={importBulk}>Import Questions</Button>
          </GlowCard>
        )}

        {/* Questions — grouped by round in tournament mode, flat otherwise */}
        {tournamentMode ? (
          <div className="space-y-6">
            {rounds.map((r) => (
              <div key={r.roundNumber}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
                    <Trophy className="h-4 w-4" /> {r.name} — {questionsByRound(r.roundNumber).length} question(s)
                  </h3>
                  <div className="flex gap-1">
                    <Button variant="neon-outline" size="sm" onClick={() => addQuestion("mcq", r.roundNumber)}>
                      <Plus className="h-3 w-3" /> MCQ
                    </Button>
                    <Button variant="neon-outline" size="sm" onClick={() => addQuestion("code", r.roundNumber)}>
                      <Plus className="h-3 w-3" /> Code
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {questionsByRound(r.roundNumber).map((q, idx) => (
                    <QuestionEditor key={q.id} q={q} index={idx} onUpdate={updateQuestion} onRemove={removeQuestion} rounds={rounds} showRoundPicker />
                  ))}
                  {questionsByRound(r.roundNumber).length === 0 && (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                      No questions in this round yet
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {ungroupedQuestions.map((q, index) => (
              <QuestionEditor key={q.id} q={q} index={index} onUpdate={updateQuestion} onRemove={removeQuestion} rounds={rounds} showRoundPicker={false} />
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          {!tournamentMode && (
            <>
              <Button variant="neon-outline" onClick={() => addQuestion("mcq")}>
                <Plus className="h-4 w-4" /><ListChecks className="h-4 w-4" /> Add MCQ
              </Button>
              <Button variant="neon-outline" onClick={() => addQuestion("code")}>
                <Plus className="h-4 w-4" /><Code className="h-4 w-4" /> Add Code
              </Button>
            </>
          )}
          <div className="flex-1" />
          <Button variant="neon" size="lg" onClick={saveQuiz} disabled={saving || !title.trim()}>
            {saving ? "Saving..." : "Save Quiz"}
          </Button>
        </div>
      </main>
    </HoneycombLayout>
  );
}

function QuestionEditor({
  q,
  index,
  onUpdate,
  onRemove,
  rounds,
  showRoundPicker,
}: {
  q: Question;
  index: number;
  onUpdate: (id: string, updates: Partial<Question>) => void;
  onRemove: (id: string) => void;
  rounds: RoundConfig[];
  showRoundPicker: boolean;
}) {
  return (
    <GlowCard>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${q.type === "mcq" ? "bg-primary/20 text-primary" : "bg-accent/20 text-accent"}`}>
            {q.type === "mcq" ? <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" /> MCQ</span> : <span className="flex items-center gap-1"><Code className="h-3 w-3" /> Code</span>}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showRoundPicker && (
            <select
              value={q.roundNumber}
              onChange={(e) => onUpdate(q.id, { roundNumber: parseInt(e.target.value) })}
              className="rounded-lg border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none"
            >
              {rounds.map((r) => (
                <option key={r.roundNumber} value={r.roundNumber}>
                  R{r.roundNumber}: {r.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-input bg-background px-2">
            <Zap className="h-3 w-3 text-primary" />
            <input type="number" value={q.points} onChange={(e) => onUpdate(q.id, { points: parseInt(e.target.value) || 0 })} className="w-12 bg-transparent py-1 text-center text-sm focus:outline-none" min={1} />
            <span className="text-xs text-muted-foreground">pts</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-input bg-background px-2">
            <Clock className="h-3 w-3 text-primary" />
            <input type="number" value={q.timeLimit} onChange={(e) => onUpdate(q.id, { timeLimit: parseInt(e.target.value) || 30 })} className="w-12 bg-transparent py-1 text-center text-sm focus:outline-none" min={5} max={300} />
            <span className="text-xs text-muted-foreground">sec</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onRemove(q.id)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Input value={q.content} onChange={(e) => onUpdate(q.id, { content: e.target.value })} placeholder="Question text..." className="mb-3 bg-background" />

      {q.type === "mcq" && q.options && (
        <div className="grid grid-cols-2 gap-2">
          {q.options.map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <button
                onClick={() => onUpdate(q.id, { correctOption: oi })}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-all ${
                  q.correctOption === oi ? "border-primary bg-primary text-primary-foreground glow-btn" : "border-input bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                {String.fromCharCode(65 + oi)}
              </button>
              <Input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...(q.options || [])];
                  newOpts[oi] = e.target.value;
                  onUpdate(q.id, { options: newOpts });
                }}
                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                className="bg-background"
              />
            </div>
          ))}
        </div>
      )}

      {q.type === "code" && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Starter Code</label>
          <MonacoCodeEditor
            value={q.starterCode || ""}
            onChange={(v) => onUpdate(q.id, { starterCode: v })}
            language={q.language || "javascript"}
            height="180px"
          />
          <label className="text-xs font-medium text-muted-foreground">Solution (reference)</label>
          <MonacoCodeEditor
            value={q.solution || ""}
            onChange={(v) => onUpdate(q.id, { solution: v })}
            language={q.language || "javascript"}
            height="140px"
          />
          <CodeTestEditor
            language={q.language || "javascript"}
            mode={q.testMode || "io"}
            tests={q.testCases || []}
            onLanguageChange={(l) => onUpdate(q.id, { language: l })}
            onModeChange={(m) => onUpdate(q.id, { testMode: m })}
            onChange={(t) => onUpdate(q.id, { testCases: t })}
          />
        </div>
      )}
    </GlowCard>
  );
}
