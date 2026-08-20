import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Circle, Play, Book } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/learn/course/$courseId")({
  component: LearnCourse,
});

function LearnCourse() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("lesson_courses" as any).select("*").eq("id", courseId).single();
      setCourse(c);
      const { data: ls } = await supabase.from("lessons" as any).select("id, title, objective, order_index, language").eq("course_id", courseId).order("order_index");
      setLessons((ls as any) || []);
      if (user) {
        const { data: p } = await supabase.from("lesson_progress" as any).select("lesson_id, completed_at").eq("user_id", user.id);
        setProgress(new Set((p as any[]).filter((x) => x.completed_at).map((x) => x.lesson_id)));
      }
      setLoading(false);
    })();
  }, [courseId, user]);

  if (loading) {
    return (
      <HoneycombLayout>
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </HoneycombLayout>
    );
  }

  const completedCount = lessons.filter((l) => progress.has(l.id)).length;
  const pct = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const nextLesson = lessons.find((l) => !progress.has(l.id)) || lessons[0];

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link to="/learn" search={{ tab: "lessons" }}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4" /> Back to Learn
          </Button>
        </Link>

        <GlowCard className="mb-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Book className="h-8 w-8 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">{course?.title}</h1>
              {course?.description && <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>}
              <div className="mt-3 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs font-semibold text-primary">{completedCount}/{lessons.length}</span>
              </div>
            </div>
            {nextLesson && (
              <Button variant="neon" onClick={() => navigate({ to: "/learn/lesson/$lessonId", params: { lessonId: nextLesson.id } })}>
                <Play className="h-4 w-4" /> {completedCount === 0 ? "Start" : "Continue"}
              </Button>
            )}
          </div>
        </GlowCard>

        <div className="space-y-2">
          {lessons.map((l, i) => {
            const done = progress.has(l.id);
            const locked = i > 0 && !progress.has(lessons[i - 1].id);
            return (
              <button
                key={l.id}
                onClick={() => !locked && navigate({ to: "/learn/lesson/$lessonId", params: { lessonId: l.id } })}
                disabled={locked}
                className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                  locked
                    ? "cursor-not-allowed border-border bg-card opacity-50"
                    : done
                      ? "border-green-500/40 bg-green-500/5 hover:border-green-500"
                      : "border-primary/30 bg-card hover:border-primary hover:bg-primary/5"
                }`}
              >
                {done ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Lesson {i + 1}</p>
                  <p className="font-semibold">{l.title}</p>
                  {l.objective && <p className="mt-0.5 text-xs text-muted-foreground">{l.objective}</p>}
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                  {l.language}
                </span>
              </button>
            );
          })}
        </div>
      </main>
    </HoneycombLayout>
  );
}