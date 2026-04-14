import { createFileRoute, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus, BookOpen, Trophy, Zap } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

const mockFolders = [
  { id: "1", name: "Networking Fundamentals", quizCount: 5, totalPoints: 450 },
  { id: "2", name: "Web Development", quizCount: 8, totalPoints: 720 },
  { id: "3", name: "Database Systems", quizCount: 3, totalPoints: 280 },
  { id: "4", name: "Cybersecurity Basics", quizCount: 4, totalPoints: 380 },
  { id: "5", name: "Python Programming", quizCount: 6, totalPoints: 540 },
];

function Dashboard() {
  const [folders] = useState(mockFolders);

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero Stats */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-primary">Admin</span> Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage your folders, quizzes, and launch live races.
          </p>
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
                <p className="text-2xl font-bold">
                  {folders.reduce((a, f) => a + f.quizCount, 0)}
                </p>
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
                <p className="text-2xl font-bold">
                  {folders.reduce((a, f) => a + f.totalPoints, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Points</p>
              </div>
            </div>
          </GlowCard>
        </div>

        {/* Folders Grid */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Folders</h2>
          <Button variant="neon" size="sm">
            <Plus className="h-4 w-4" />
            New Folder
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((folder) => (
            <Link key={folder.id} to="/folder/$folderId" params={{ folderId: folder.id }}>
              <GlowCard className="group transition-transform hover:scale-[1.02]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <FolderOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate font-semibold">{folder.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {folder.quizCount} quizzes
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3 text-primary" />
                    {folder.totalPoints} pts
                  </div>
                  <span className="text-xs text-primary font-medium opacity-0 transition-opacity group-hover:opacity-100">
                    Open →
                  </span>
                </div>
              </GlowCard>
            </Link>
          ))}
        </div>
      </main>
    </HoneycombLayout>
  );
}
