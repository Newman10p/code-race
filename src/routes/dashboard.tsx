import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, Plus, BookOpen, Trophy, Zap, Trash2, LogOut, HelpCircle, Settings as SettingsIcon, GraduationCap, Gauge, Edit, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

interface Folder {
  id: string;
  name: string;
  quizCount: number;
  totalPoints: number;
}

function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isSetter, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || roleLoading) return;
    if (!isSetter) {
      navigate({ to: "/learn" });
      return;
    }
    loadFolders();
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleLoading, isSetter]);

  const loadFolders = async () => {
    setLoading(true);
    const { data: foldersData } = await supabase
      .from("folders")
      .select("id, name")
      .order("created_at", { ascending: false });

    if (foldersData) {
      const foldersWithStats = await Promise.all(
        foldersData.map(async (f) => {
          const { data: quizzes } = await supabase
            .from("quizzes")
            .select("id, total_points")
            .eq("folder_id", f.id);
          return {
            id: f.id,
            name: f.name,
            quizCount: quizzes?.length || 0,
            totalPoints: quizzes?.reduce((a, q) => a + (q.total_points || 0), 0) || 0,
          };
        })
      );
      setFolders(foldersWithStats);
    }
    setLoading(false);
  };

  const loadCourses = async () => {
    const { data } = await supabase
      .from("lesson_courses" as any)
      .select("id, title, description, subject, is_public, cover_image_url, created_at")
      .eq("setter_id", user!.id)
      .order("created_at", { ascending: false });
    const list = (data as any[]) || [];
    const enriched = await Promise.all(
      list.map(async (c) => {
        const { count } = await supabase
          .from("lessons" as any)
          .select("*", { count: "exact", head: true })
          .eq("course_id", c.id);
        return { ...c, lesson_count: count || 0 };
      })
    );
    setCourses(enriched);
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Delete this course and all its lessons?")) return;
    await supabase.from("lesson_courses" as any).delete().eq("id", id);
    loadCourses();
  };

  const toggleCoursePublish = async (id: string, isPublic: boolean) => {
    await supabase.from("lesson_courses" as any).update({ is_public: !isPublic }).eq("id", id);
    loadCourses();
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    await supabase.from("folders").insert({ name: newFolderName.trim(), user_id: user.id });
    setNewFolderName("");
    setShowNewFolder(false);
    loadFolders();
  };

  const deleteFolder = async (id: string) => {
    if (!confirm("Delete this folder and all its quizzes?")) return;
    await supabase.from("folders").delete().eq("id", id);
    loadFolders();
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

  if (!isSetter) return null;

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-primary">Setter</span> Dashboard
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage your folders, quizzes, and launch live races.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/settings">
              <Button variant="neon-outline" size="sm">
                <SettingsIcon className="h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Link to="/manual">
              <Button variant="neon-outline" size="sm">
                <HelpCircle className="h-4 w-4" />
                Manual
              </Button>
            </Link>
            <Link to="/criteria">
              <Button variant="neon-outline" size="sm">
                <Gauge className="h-4 w-4" />
                Criteria
              </Button>
            </Link>
            <Link to="/lessons/create" search={{ courseId: "" }}>
              <Button variant="neon" size="sm">
                <GraduationCap className="h-4 w-4" />
                New Lesson Course
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GlowCard>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{folders.length}</p>
                <p className="text-xs text-muted-foreground">Folders</p>
              </div>
            </div>
          </GlowCard>
          <GlowCard>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{folders.reduce((a, f) => a + f.quizCount, 0)}</p>
                <p className="text-xs text-muted-foreground">Total Quizzes</p>
              </div>
            </div>
          </GlowCard>
          <GlowCard>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Trophy className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{folders.reduce((a, f) => a + f.totalPoints, 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Points</p>
              </div>
            </div>
          </GlowCard>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Folders</h2>
          <Button variant="neon" size="sm" onClick={() => setShowNewFolder(true)}>
            <Plus className="h-4 w-4" />
            New Folder
          </Button>
        </div>

        {showNewFolder && (
          <GlowCard className="mb-4">
            <div className="flex items-center gap-3">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="bg-background"
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
                autoFocus
              />
              <Button variant="neon" size="sm" onClick={createFolder}>Create</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            </div>
          </GlowCard>
        )}

        {folders.length === 0 ? (
          <GlowCard className="text-center py-12">
            <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No folders yet. Create one to get started.</p>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {folders.map((folder) => (
              <div key={folder.id} className="group relative">
                <Link to="/folder/$folderId" params={{ folderId: folder.id }}>
                  <GlowCard className="transition-transform hover:scale-[1.02]">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <FolderOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="truncate font-semibold">{folder.name}</h3>
                        <p className="text-xs text-muted-foreground">{folder.quizCount} quizzes</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3 text-primary" />
                        {folder.totalPoints} pts
                      </div>
                      <span className="text-xs text-primary font-medium opacity-0 transition-opacity group-hover:opacity-100">Open →</span>
                    </div>
                  </GlowCard>
                </Link>
                <button
                  onClick={(e) => { e.preventDefault(); deleteFolder(folder.id); }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <GraduationCap className="h-5 w-5 text-primary" /> Lesson Courses
          </h2>
          <Link to="/lessons/create" search={{ courseId: "" }}>
            <Button variant="neon-outline" size="sm">
              <Plus className="h-4 w-4" /> New Course
            </Button>
          </Link>
        </div>

        {courses.length === 0 ? (
          <GlowCard className="text-center py-8">
            <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No lesson courses yet. Create one or ask the AI Assistant to draft one.</p>
          </GlowCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <div key={c.id} className="group relative">
                <GlowCard className="transition-transform hover:scale-[1.02]">
                  {c.cover_image_url ? (
                    <img src={c.cover_image_url} alt="" className="mb-3 h-24 w-full rounded-lg object-cover" />
                  ) : (
                    <div className="mb-3 flex h-24 w-full items-center justify-center rounded-lg bg-primary/10">
                      <GraduationCap className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="flex-1 truncate font-semibold">{c.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${c.is_public ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"}`}>
                      {c.is_public ? "Public" : "Draft"}
                    </span>
                  </div>
                  {c.subject && <p className="mb-1 text-[11px] text-primary">{c.subject}</p>}
                  <p className="text-xs text-muted-foreground">{c.lesson_count} lesson{c.lesson_count === 1 ? "" : "s"}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1">
                    <Link to="/lessons/create" search={{ courseId: c.id }}>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        <Edit className="h-3 w-3" /> Edit
                      </Button>
                    </Link>
                    {c.lesson_count > 0 && (
                      <Link to="/learn/course/$courseId" params={{ courseId: c.id }}>
                        <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                          <BookOpen className="h-3 w-3" /> Preview
                        </Button>
                      </Link>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => toggleCoursePublish(c.id, c.is_public)}>
                      {c.is_public ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      {c.is_public ? "Unpublish" : "Publish"}
                    </Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCourse(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </GlowCard>
              </div>
            ))}
          </div>
        )}
      </main>
    </HoneycombLayout>
  );
}
