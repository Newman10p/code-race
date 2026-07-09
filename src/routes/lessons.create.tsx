import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, Sparkles, Book } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { MonacoCodeEditor } from "@/components/code/MonacoCodeEditor";
import { CodeTestEditor } from "@/components/code/CodeTestEditor";
import type { TestCase } from "@/lib/code-runners";

export const Route = createFileRoute("/lessons/create")({
  validateSearch: (s: Record<string, unknown>) => ({ courseId: (s.courseId as string) || "" }),
  component: LessonCourseCreator,
});

interface LessonDraft {
  id: string;
  dbId?: string;
  title: string;
  concept_markdown: string;
  image_url: string;
  objective: string;
  hint: string;
  language: string;
  starter_code: string;
  solution: string;
  test_mode: "io" | "assert";
  test_cases: TestCase[];
}

function newDraft(): LessonDraft {
  return {
    id: Date.now().toString() + Math.random(),
    title: "",
    concept_markdown: "",
    image_url: "",
    objective: "",
    hint: "",
    language: "javascript",
    starter_code: "// Write your code here\n",
    solution: "",
    test_mode: "io",
    test_cases: [],
  };
}

function LessonCourseCreator() {
  const { courseId } = Route.useSearch();
  const { user, loading } = useAuth();
  const { isSetter, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const isEditing = !!courseId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [lessons, setLessons] = useState<LessonDraft[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !roleLoading && (!user || !isSetter)) navigate({ to: "/login" });
  }, [user, loading, roleLoading, isSetter]);

  useEffect(() => {
    if (courseId && user) load();
  }, [courseId, user]);

  const load = async () => {
    const { data: course } = await supabase.from("lesson_courses" as any).select("*").eq("id", courseId).single();
    if (course) {
      const c = course as any;
      setTitle(c.title);
      setDescription(c.description || "");
      setSubject(c.subject || "");
      setCoverUrl(c.cover_image_url || "");
      setIsPublic(c.is_public);
    }
    const { data: ls } = await supabase.from("lessons" as any).select("*").eq("course_id", courseId).order("order_index");
    if (ls) {
      setLessons(
        (ls as any[]).map((l) => ({
          id: l.id,
          dbId: l.id,
          title: l.title,
          concept_markdown: l.concept_markdown || "",
          image_url: l.image_url || "",
          objective: l.objective || "",
          hint: l.hint || "",
          language: l.language || "javascript",
          starter_code: l.starter_code || "",
          solution: l.solution || "",
          test_mode: l.test_mode || "io",
          test_cases: (l.test_cases as TestCase[]) || [],
        }))
      );
    }
  };

  const addLesson = () => {
    const d = newDraft();
    setLessons([...lessons, d]);
    setExpanded(d.id);
  };
  const updateLesson = (id: string, u: Partial<LessonDraft>) =>
    setLessons(lessons.map((l) => (l.id === id ? { ...l, ...u } : l)));
  const removeLesson = (id: string) => setLessons(lessons.filter((l) => l.id !== id));

  const save = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    try {
      let cid = courseId;
      if (isEditing) {
        await supabase.from("lesson_courses" as any).update({
          title, description, subject, cover_image_url: coverUrl, is_public: isPublic,
        }).eq("id", courseId);
        await supabase.from("lessons" as any).delete().eq("course_id", courseId);
      } else {
        const { data, error } = await supabase.from("lesson_courses" as any).insert({
          setter_id: user.id, title, description, subject, cover_image_url: coverUrl, is_public: isPublic,
        }).select("id").single();
        if (error) throw error;
        cid = (data as any).id;
      }
      if (lessons.length > 0) {
        await supabase.from("lessons" as any).insert(
          lessons.map((l, i) => ({
            course_id: cid,
            order_index: i,
            title: l.title,
            concept_markdown: l.concept_markdown,
            image_url: l.image_url || null,
            objective: l.objective,
            hint: l.hint || null,
            language: l.language,
            starter_code: l.starter_code,
            solution: l.solution,
            test_mode: l.test_mode,
            test_cases: l.test_cases,
          }))
        );
      }
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">
            <span className="text-primary">{isEditing ? "Edit" : "Create"}</span> Lesson Course
          </h1>
        </div>

        <GlowCard className="mb-6">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Course Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Intro to Python" className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Subject</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Programming, Web Design..." className="bg-background" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted-foreground">Cover Image URL (optional)</label>
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." className="bg-background" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted-foreground">Description</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What learners will build" className="bg-background" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border bg-background p-3">
              <div>
                <p className="text-sm font-medium">Publish course</p>
                <p className="text-xs text-muted-foreground">Make visible to learners</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
        </GlowCard>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
            <Book className="h-4 w-4" /> Lessons ({lessons.length})
          </h2>
          <Button variant="neon-outline" size="sm" onClick={addLesson}>
            <Plus className="h-3 w-3" /> Add Lesson
          </Button>
        </div>

        <div className="space-y-3">
          {lessons.map((l, i) => (
            <GlowCard key={l.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-bold text-primary">L{i + 1}</span>
                <Input
                  value={l.title}
                  onChange={(e) => updateLesson(l.id, { title: e.target.value })}
                  placeholder="Lesson title"
                  className="flex-1 bg-background"
                />
                <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                  {expanded === l.id ? "Collapse" : "Expand"}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeLesson(l.id)} className="text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>

              {expanded === l.id && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Concept (Markdown supported)</label>
                    <textarea
                      value={l.concept_markdown}
                      onChange={(e) => updateLesson(l.id, { concept_markdown: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none"
                      rows={5}
                      placeholder="Explain the concept..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Image URL (optional)</label>
                      <Input value={l.image_url} onChange={(e) => updateLesson(l.id, { image_url: e.target.value })} className="bg-background" />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Hint (optional, unlocks after failure)</label>
                      <Input value={l.hint} onChange={(e) => updateLesson(l.id, { hint: e.target.value })} className="bg-background" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Objective</label>
                    <Input value={l.objective} onChange={(e) => updateLesson(l.id, { objective: e.target.value })} placeholder="Change the background to blue" className="bg-background" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Starter Code</label>
                    <MonacoCodeEditor value={l.starter_code} onChange={(v) => updateLesson(l.id, { starter_code: v })} language={l.language} height="180px" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Solution (reference)</label>
                    <MonacoCodeEditor value={l.solution} onChange={(v) => updateLesson(l.id, { solution: v })} language={l.language} height="140px" />
                  </div>
                  <CodeTestEditor
                    language={l.language}
                    mode={l.test_mode}
                    tests={l.test_cases}
                    onLanguageChange={(lang) => updateLesson(l.id, { language: lang })}
                    onModeChange={(m) => updateLesson(l.id, { test_mode: m })}
                    onChange={(t) => updateLesson(l.id, { test_cases: t })}
                  />
                </div>
              )}
            </GlowCard>
          ))}
          {lessons.length === 0 && (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No lessons yet. Click "Add Lesson" to build your first one, or ask the AI Assistant to draft lessons for you.
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Link to="/dashboard">
            <Button variant="ghost">Cancel</Button>
          </Link>
          <div className="flex-1" />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" /> Tip: ask the AI Assistant to generate lesson outlines
          </span>
          <Button variant="neon" size="lg" onClick={save} disabled={saving || !title.trim()}>
            {saving ? "Saving..." : "Save Course"}
          </Button>
        </div>
      </main>
    </HoneycombLayout>
  );
}