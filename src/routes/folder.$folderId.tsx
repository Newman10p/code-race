import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, BookOpen, Zap, Play, Trash2, ClipboardCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { AiAssistant } from "@/components/AiAssistant";

export const Route = createFileRoute("/folder/$folderId")({
  component: FolderView,
});

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  total_points: number;
  questionCount: number;
  is_evaluation?: boolean;
}

function FolderView() {
  const { folderId } = Route.useParams();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<{ id: string; name: string } | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, isAdmin]);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user, folderId]);

  const loadData = async () => {
    setLoading(true);
    const { data: folderData } = await supabase
      .from("folders")
      .select("id, name")
      .eq("id", folderId)
      .single();
    setFolder(folderData);

    const { data: quizzesData } = await supabase
      .from("quizzes")
      .select("id, title, description, total_points, is_evaluation")
      .eq("folder_id", folderId)
      .order("created_at", { ascending: false });

    if (quizzesData) {
      const withCounts = await Promise.all(
        quizzesData.map(async (q) => {
          const { count } = await supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("quiz_id", q.id);
          return { ...q, questionCount: count || 0 };
        })
      );
      setQuizzes(withCounts);
    }
    setLoading(false);
  };

  const deleteQuiz = async (id: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return;
    await supabase.from("quizzes").delete().eq("id", id);
    loadData();
  };

  const launchQuiz = async (quizId: string) => {
    if (!user) return;
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const { data, error } = await supabase
      .from("game_sessions")
      .insert({ quiz_id: quizId, pin_code: pin, host_id: user.id, status: "lobby" })
      .select("id")
      .single();
    if (data) {
      navigate({ to: "/launch", search: { sessionId: data.id } });
    }
  };

  if (loading || authLoading) {
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
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{folder?.name || "Folder"}</h1>
            <p className="text-sm text-muted-foreground">{quizzes.length} quizzes</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Quizzes</h2>
          <Link to="/quiz/create" search={{ folderId, quizId: "" }}>
            <Button variant="neon" size="sm">
              <Plus className="h-4 w-4" />
              Create Quiz
            </Button>
          </Link>
        </div>

        {quizzes.length === 0 ? (
          <GlowCard className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No quizzes yet. Create your first quiz.</p>
          </GlowCard>
        ) : (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <GlowCard key={quiz.id} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{quiz.title}</h3>
                      {quiz.is_evaluation && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <ClipboardCheck className="h-3 w-3" /> EVALUATION
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{quiz.description}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{quiz.questionCount} questions</span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3 text-primary" />
                        {quiz.total_points} pts
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/quiz/create" search={{ folderId, quizId: quiz.id }}>
                    <Button variant="neon-outline" size="sm">Edit</Button>
                  </Link>
                  <Button variant="neon" size="sm" onClick={() => launchQuiz(quiz.id)}>
                    <Play className="h-3 w-3" />
                    Launch
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteQuiz(quiz.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </main>
      <AiAssistant />
    </HoneycombLayout>
  );
}
