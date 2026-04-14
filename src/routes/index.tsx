import { createFileRoute, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Zap, Users, Shield, ArrowRight, Trophy, BookOpen } from "lucide-react";
import { GlowCard } from "@/components/GlowCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeRace: The Techy ICT Arena" },
      { name: "description", content: "A competitive real-time quiz racing platform for ICT education. Launch live races, compete in real-time, and test your knowledge." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <HoneycombLayout>
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-foreground">
              Code<span className="text-primary">Race</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/join">
              <Button variant="neon-outline" size="sm">
                <Users className="h-4 w-4" />
                Join Race
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="neon" size="sm">
                Setter Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 animate-pulse-glow">
            <Logo className="h-12 w-12" />
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight sm:text-6xl">
            Code<span className="text-primary">Race</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            The ultimate real-time competitive quiz platform for ICT education.
            Create quizzes, launch live races, and watch students compete head-to-head.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/join">
              <Button variant="neon" size="xl">
                <Users className="h-5 w-5" />
                Join a Race
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="neon-outline" size="xl">
                I'm a Setter
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-4 pb-20">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <GlowCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">MCQ & Code Questions</h3>
              <p className="text-sm text-muted-foreground">
                Create multiple-choice and code completion questions with custom point values.
              </p>
            </GlowCard>
            <GlowCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Real-Time Racing</h3>
              <p className="text-sm text-muted-foreground">
                Students compete live with instant leaderboard updates via WebSockets.
              </p>
            </GlowCard>
            <GlowCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Anti-Cheat Protocol</h3>
              <p className="text-sm text-muted-foreground">
                Tab-switch detection auto-submits answers and flags suspicious behavior.
              </p>
            </GlowCard>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border/50 bg-card/30 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-8 text-2xl font-bold">How It Works</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
                <h3 className="font-semibold mb-1">Setter Creates Quiz</h3>
                <p className="text-sm text-muted-foreground">Build MCQ and code questions, organize in folders.</p>
              </div>
              <div>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
                <h3 className="font-semibold mb-1">Launch a Race</h3>
                <p className="text-sm text-muted-foreground">Get a 6-digit PIN. Students join from any device.</p>
              </div>
              <div>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
                <h3 className="font-semibold mb-1">Compete Live</h3>
                <p className="text-sm text-muted-foreground">Real-time leaderboard. Fastest correct answer wins.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} CodeRace. Built for ICT educators.</p>
        </footer>
      </main>
    </HoneycombLayout>
  );
}
