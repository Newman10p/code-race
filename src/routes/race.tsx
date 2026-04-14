import { createFileRoute } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Zap, Clock, ChevronRight, Code, ListChecks } from "lucide-react";

export const Route = createFileRoute("/race")({
  component: RaceView,
});

const mockQuestion = {
  type: "mcq" as const,
  content: "Which layer of the OSI model is responsible for end-to-end communication and error recovery?",
  points: 15,
  options: ["Physical Layer", "Transport Layer", "Network Layer", "Application Layer"],
  questionNumber: 3,
  totalQuestions: 10,
};

const mockCodeQuestion = {
  type: "code" as const,
  content: "Complete the function that returns the sum of two numbers:",
  points: 25,
  starterCode: `def add(a, b):\n    # Your code here\n    pass`,
  questionNumber: 4,
  totalQuestions: 10,
};

function RaceView() {
  const [selected, setSelected] = useState<number | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState(mockCodeQuestion.starterCode);
  const question = showCode ? mockCodeQuestion : mockQuestion;

  return (
    <HoneycombLayout>
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Q{question.questionNumber}/{question.totalQuestions}
            </span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${(question.questionNumber / question.totalQuestions) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-mono">0:42</span>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
              <Zap className="h-3 w-3" />
              {question.points} pts
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Toggle demo */}
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant={!showCode ? "neon" : "neon-outline"}
            size="sm"
            onClick={() => setShowCode(false)}
          >
            <ListChecks className="h-4 w-4" />
            MCQ Demo
          </Button>
          <Button
            variant={showCode ? "neon" : "neon-outline"}
            size="sm"
            onClick={() => setShowCode(true)}
          >
            <Code className="h-4 w-4" />
            Code Demo
          </Button>
        </div>

        <GlowCard className="mb-6">
          <p className="text-lg font-medium">{question.content}</p>
        </GlowCard>

        {!showCode ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {mockQuestion.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                  selected === i
                    ? "border-primary bg-primary/10 glow-card"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-all ${
                    selected === i
                      ? "bg-primary text-primary-foreground glow-btn"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="font-medium">{opt}</span>
              </button>
            ))}
          </div>
        ) : (
          <GlowCard>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">
              Your Code
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-lg border border-input bg-background p-4 font-mono text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              rows={8}
              spellCheck={false}
            />
          </GlowCard>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="neon" size="xl">
            Submit Answer
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </main>
    </HoneycombLayout>
  );
}
