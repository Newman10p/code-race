import { createFileRoute } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Code,
  ListChecks,
  Zap,
  Bot,
  GripVertical,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/quiz/create")({
  component: QuizCreator,
});

interface Question {
  id: string;
  type: "mcq" | "code";
  content: string;
  points: number;
  options?: string[];
  correctOption?: number;
  starterCode?: string;
  solution?: string;
}

function QuizCreator() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      type: "mcq",
      content: "",
      points: 10,
      options: ["", "", "", ""],
      correctOption: 0,
    },
  ]);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkData, setBulkData] = useState("");

  const addQuestion = (type: "mcq" | "code") => {
    const q: Question = {
      id: Date.now().toString(),
      type,
      content: "",
      points: 10,
      ...(type === "mcq"
        ? { options: ["", "", "", ""], correctOption: 0 }
        : { starterCode: "// Write your code here\n", solution: "" }),
    };
    setQuestions([...questions, q]);
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">
            <span className="text-primary">Create</span> Quiz
          </h1>
        </div>

        {/* Quiz Meta */}
        <GlowCard className="mb-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Quiz Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. OSI Model Layers"
                className="bg-background"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this quiz"
                className="bg-background"
              />
            </div>
          </div>
        </GlowCard>

        {/* Bulk Import Toggle */}
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant="neon-outline"
            size="sm"
            onClick={() => setShowBulkImport(!showBulkImport)}
          >
            ICT Bulk Upload
          </Button>
          <Button variant="neon-outline" size="sm">
            <Bot className="h-4 w-4" />
            AI Lab
          </Button>
        </div>

        {showBulkImport && (
          <GlowCard className="mb-6">
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Paste JSON or CSV questions
            </label>
            <textarea
              value={bulkData}
              onChange={(e) => setBulkData(e.target.value)}
              placeholder={`[{"type":"mcq","content":"What layer is HTTP?","points":10,"options":["Layer 1","Layer 4","Layer 7","Layer 3"],"correctOption":2}]`}
              className="w-full rounded-lg border border-input bg-background p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              rows={5}
            />
            <Button variant="neon" size="sm" className="mt-2">
              Import Questions
            </Button>
          </GlowCard>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {questions.map((q, index) => (
            <GlowCard key={q.id}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Q{index + 1}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      q.type === "mcq"
                        ? "bg-primary/20 text-primary"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {q.type === "mcq" ? (
                      <span className="flex items-center gap-1">
                        <ListChecks className="h-3 w-3" /> MCQ
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Code className="h-3 w-3" /> Code
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 rounded-lg border border-input bg-background px-2">
                    <Zap className="h-3 w-3 text-primary" />
                    <input
                      type="number"
                      value={q.points}
                      onChange={(e) =>
                        updateQuestion(q.id, { points: parseInt(e.target.value) || 0 })
                      }
                      className="w-12 bg-transparent py-1 text-center text-sm text-foreground focus:outline-none"
                      min={1}
                    />
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeQuestion(q.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Input
                value={q.content}
                onChange={(e) => updateQuestion(q.id, { content: e.target.value })}
                placeholder="Question text..."
                className="mb-3 bg-background"
              />

              {q.type === "mcq" && q.options && (
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuestion(q.id, { correctOption: oi })}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-all ${
                          q.correctOption === oi
                            ? "border-primary bg-primary text-primary-foreground glow-btn"
                            : "border-input bg-background text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {String.fromCharCode(65 + oi)}
                      </button>
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...(q.options || [])];
                          newOpts[oi] = e.target.value;
                          updateQuestion(q.id, { options: newOpts });
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
                  <label className="text-xs font-medium text-muted-foreground">
                    Starter Code
                  </label>
                  <textarea
                    value={q.starterCode}
                    onChange={(e) =>
                      updateQuestion(q.id, { starterCode: e.target.value })
                    }
                    className="w-full rounded-lg border border-input bg-background p-3 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={4}
                  />
                  <label className="text-xs font-medium text-muted-foreground">
                    Solution
                  </label>
                  <textarea
                    value={q.solution}
                    onChange={(e) =>
                      updateQuestion(q.id, { solution: e.target.value })
                    }
                    className="w-full rounded-lg border border-input bg-background p-3 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={4}
                  />
                </div>
              )}
            </GlowCard>
          ))}
        </div>

        {/* Add Question Buttons */}
        <div className="mt-6 flex items-center gap-3">
          <Button variant="neon-outline" onClick={() => addQuestion("mcq")}>
            <Plus className="h-4 w-4" />
            <ListChecks className="h-4 w-4" />
            Add MCQ
          </Button>
          <Button variant="neon-outline" onClick={() => addQuestion("code")}>
            <Plus className="h-4 w-4" />
            <Code className="h-4 w-4" />
            Add Code
          </Button>
          <div className="flex-1" />
          <Button variant="neon" size="lg">
            Save Quiz
          </Button>
        </div>
      </main>
    </HoneycombLayout>
  );
}
