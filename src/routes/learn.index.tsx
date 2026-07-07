import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { BookOpen, Bookmark, LogOut, Search, Sparkles, Book, GraduationCap } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/learn/")({
  validateSearch: (s: Record<string, unknown>) => ({ tab: ((s.tab as string) || "flashcards") as "flashcards" | "lessons" }),
  component: LearnerDashboard,
});

interface FlashSet {
  id: string;
  title: string;
  description: string | null;
  subject: string | null;
  card_count: number;
  saved: boolean;
}

function LearnerDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isSetter, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { tab } = Route.useSearch();
  const [sets, setSets] = useState<FlashSet[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    if (!roleLoading && isSetter) {
      navigate({ to: "/dashboard" });
      return;
    }
    loadSets();
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleLoading, isSetter]);

  const loadSets = async () => {
    setLoading(true);
    const { data: setsData } = await supabase
      .from("flashcard_sets")
      .select("id, title, description, subject")
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    const { data: savedData } = await supabase
      .from("learner_saved_sets")
      .select("set_id")
      .eq("user_id", user!.id);
    const savedIds = new Set((savedData || []).map((s) => s.set_id));

    const enriched = await Promise.all(
      (setsData || []).map(async (s) => {
        const { count } = await supabase
          .from("flashcards")
          .select("*", { count: "exact", head: true })
          .eq("set_id", s.id);
        return { ...s, card_count: count || 0, saved: savedIds.has(s.id) };
      })
    );
    setSets(enriched);
    setLoading(false);
  };

  const loadCourses = async () => {
    const { data } = await supabase.from("lesson_courses" as any).select("id, title, description, subject, cover_image_url").eq("is_public", true).order("created_at", { ascending: false });
    setCourses((data as any) || []);
  };

  const toggleSave = async (setId: string, currentlySaved: boolean) => {
    if (currentlySaved) {
      await supabase.from("learner_saved_sets").delete().eq("user_id", user!.id).eq("set_id", setId);
    } else {
      await supabase.from("learner_saved_sets").insert({ user_id: user!.id, set_id: setId });
    }
    loadSets();
  };

  const filtered = sets.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.subject || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.subject || "").toLowerCase().includes(search.toLowerCase())
  );

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
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-primary">Learner</span> Hub
            </h1>
            <p className="mt-1 text-muted-foreground">
              Study flashcards posted by your setters and join live races.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/join">
              <Button variant="neon" size="sm">
                <Sparkles className="h-4 w-4" />
                Join a Race
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="mb-6 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${tab === "lessons" ? "lesson courses" : "flashcard sets"} by title or subject...`}
            className="bg-card pl-10"
          />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-border">
          <Link to="/learn" search={{ tab: "flashcards" }}>
            <button className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition ${tab === "flashcards" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <BookOpen className="h-4 w-4" /> Flashcards
            </button>
          </Link>
          <Link to="/learn" search={{ tab: "lessons" }}>
            <button className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition ${tab === "lessons" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <GraduationCap className="h-4 w-4" /> Lessons
            </button>
          </Link>
        </div>

        {tab === "lessons" ? (
          filteredCourses.length === 0 ? (
            <GlowCard className="py-12 text-center">
              <Book className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No lesson courses available yet. Check back soon!</p>
            </GlowCard>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((c) => (
                <div
                  key={c.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate({ to: "/learn/course/$courseId", params: { courseId: c.id } })}
                  className="cursor-pointer"
                >
                  <GlowCard className="h-full transition-transform hover:scale-[1.02]">
                    {c.cover_image_url ? (
                      <img src={c.cover_image_url} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />
                    ) : (
                      <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-primary/10">
                        <Book className="h-10 w-10 text-primary" />
                      </div>
                    )}
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold">{c.title}</h3>
                      {c.subject && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{c.subject}</span>}
                    </div>
                    {c.description && <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                  </GlowCard>
                </div>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <GlowCard className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              No flashcard sets available yet. Check back soon!
            </p>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <div key={s.id} className="group relative">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate({ to: "/learn/$setId", params: { setId: s.id } })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate({ to: "/learn/$setId", params: { setId: s.id } });
                    }
                  }}
                  className="cursor-pointer"
                >
                  <GlowCard className="h-full transition-transform hover:scale-[1.02]">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      {s.subject && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          {s.subject}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-1 font-semibold">{s.title}</h3>
                    {s.description && (
                      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                        {s.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {s.card_count} card{s.card_count === 1 ? "" : "s"}
                    </div>
                  </GlowCard>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleSave(s.id, s.saved);
                  }}
                  className={`absolute right-3 top-3 rounded p-1.5 transition ${
                    s.saved ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-primary/10"
                  }`}
                  aria-label={s.saved ? "Unsave" : "Save"}
                >
                  <Bookmark className={`h-4 w-4 ${s.saved ? "fill-current" : ""}`} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </HoneycombLayout>
  );
}
