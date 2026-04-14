import { createFileRoute, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, BookOpen, Zap, Play } from "lucide-react";

export const Route = createFileRoute("/folder/$folderId")({
  component: FolderView,
});

const mockQuizzes = [
  { id: "q1", title: "OSI Model Layers", description: "Identify and order the 7 layers", questionCount: 10, totalPoints: 100, aiVerified: true },
  { id: "q2", title: "TCP vs UDP", description: "Transport layer protocol differences", questionCount: 8, totalPoints: 80, aiVerified: false },
  { id: "q3", title: "IP Addressing", description: "Subnetting and CIDR notation", questionCount: 12, totalPoints: 150, aiVerified: true },
];

function FolderView() {
  const { folderId } = Route.useParams();

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Networking Fundamentals</h1>
            <p className="text-sm text-muted-foreground">Folder #{folderId} · {mockQuizzes.length} quizzes</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quizzes</h2>
          <Link to="/quiz/create">
            <Button variant="neon" size="sm">
              <Plus className="h-4 w-4" />
              Create Quiz
            </Button>
          </Link>
        </div>

        <div className="space-y-3">
          {mockQuizzes.map((quiz) => (
            <GlowCard key={quiz.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{quiz.title}</h3>
                    {quiz.aiVerified && (
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">
                        AI Verified
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{quiz.description}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{quiz.questionCount} questions</span>
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-primary" />
                      {quiz.totalPoints} pts
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to="/quiz/create">
                  <Button variant="neon-outline" size="sm">Edit</Button>
                </Link>
                <Link to="/launch">
                  <Button variant="neon" size="sm">
                    <Play className="h-3 w-3" />
                    Launch
                  </Button>
                </Link>
              </div>
            </GlowCard>
          ))}
        </div>
      </main>
    </HoneycombLayout>
  );
}
