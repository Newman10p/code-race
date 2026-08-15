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
  validateSearch: (s: Record<string, unknown>): { tab?: "flashcards" | "lessons" } => ({
    tab: (s.tab as "flashcards" | "lessons" | undefined) || undefined,
  }),
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
  const { tab = "flashcards" } = Route.useSearch();
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
              <span className="bg-gradient-to-r from-primary via-purple-400 to-indigo-400 bg-clip-text text-transparent">Learner</span> Hub
            </h1>
            <p className="mt-1 text-muted-foreground">
              Study flashcards posted by your setters and join live races.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/join">
              <Button variant="neon" size="sm" className="glow-btn">
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
            className="bg-card/50 backdrop-blur-sm pl-10 border-primary/20 focus:border-primary/50"
          />
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2 border-b border-border/50">
          <Link to="/learn" search={{ tab: "flashcards" }}>
            <button className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-all ${tab === "flashcards" ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-t-lg"}`}>
              <BookOpen className="h-4 w-4" /> Flashcards
            </button>
          </Link>
          <Link to="/learn" search={{ tab: "lessons" }}>
            <button className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-all ${tab === "lessons" ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-t-lg"}`}>
              <GraduationCap className="h-4 w-4" /> Lessons
            </button>
          </Link>
        </div>

        {tab === "lessons" ? (
          filteredCourses.length === 0 ? (
            <GlowCard className="py-12 text-center card-gradient">
              <div className="mb-4 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl icon-gradient-primary">
                  <Book className="h-8 w-8 text-primary" />
                </div>
              </div>
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
                  <GlowCard className="h-full transition-all hover:scale-[1.03] card-gradient group">
                    {c.cover_image_url ? (
                      <img src={c.cover_image_url} alt="" className="mb-3 h-32 w-full rounded-lg object-cover ring-1 ring-primary/10 group-hover:ring-primary/30 transition-all" />
                    ) : (
                      <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-indigo-500/15 group-hover:from-primary/25 group-hover:to-indigo-500/25 transition-all">
                        <Book className="h-10 w-10 text-primary" />
                      </div>
                    )}
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{c.title}</h3>
                      {c.subject && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/20">{c.subject}</span>}
                    </div>
                    {c.description && <p className="line-clamp-2 text-xs text-muted-foreground">{c.description}</p>}
                  </GlowCard>
                </div>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <GlowCard className="py-12 text-center card-gradient">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl icon-gradient-primary">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
            </div>
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
                  <GlowCard className="h-full transition-all hover:scale-[1.03] card-gradient">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 group-hover:from-primary/30 group-hover:to-indigo-500/30 transition-all">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      {s.subject && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20">
                          {s.subject}
                        </span>
                      )}
                    </div>
                    <h3 className="mb-1 font-semibold group-hover:text-primary transition-colors">{s.title}</h3>
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
                  className={`absolute right-3 top-3 rounded-full p-2 transition-all ${
                    s.saved ? "bg-primary/25 text-primary ring-2 ring-primary/30" : "text-muted-foreground hover:bg-primary/15 hover:text-primary"
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
