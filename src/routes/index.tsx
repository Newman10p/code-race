import { createFileRoute, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Users, ArrowRight, Trophy, Maximize, Palette, Layers, MessageSquare, Code2, Building2, LineChart, GraduationCap, ShieldCheck } from "lucide-react";
import { GlowCard } from "@/components/GlowCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CodeRace: The Techy ICT Arena" },
      { name: "description", content: "Race live ICT quizzes, study flashcards and lessons, collaborate in the Student Hub, and let patrons track their school's progress." },
      { property: "og:title", content: "CodeRace: The Techy ICT Arena" },
      { property: "og:description", content: "Live quiz races, interactive lessons, a student collaboration hub and school-wide progress tracking for patrons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
                Sign In
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
            Join live quiz races, sharpen your skills with flashcards and interactive coding lessons,
            and team up with your class in the Student Hub — while your school's patron follows every step of your progress.
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
                Sign In
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* For students */}
        <section className="mx-auto max-w-5xl px-4 pb-20">
          <h2 className="mb-2 text-center text-2xl font-bold">For students</h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-muted-foreground">
            Everything you need to learn, practise and compete — all in one arena.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <GlowCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Live races & tournaments</h3>
              <p className="text-sm text-muted-foreground">
                Enter with a 6-digit PIN and race your class in real time. Tournaments run in timed rounds with qualification cut-offs — miss the cut and you can still watch the standings live.
              </p>
            </GlowCard>
            <GlowCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Code2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Real coding, real feedback</h3>
              <p className="text-sm text-muted-foreground">
                Write JavaScript, Python or HTML in a VS Code-style editor and run it right in your browser. Test cases tell you instantly whether your solution holds up.
              </p>
            </GlowCard>
            <GlowCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Interactive lessons</h3>
              <p className="text-sm text-muted-foreground">
                Work through guided courses with the lesson on one side and the editor on the other. Your progress saves as you go, so you can pick up where you stopped.
              </p>
            </GlowCard>
            <GlowCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Layers className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Flashcards & revision</h3>
              <p className="text-sm text-muted-foreground">
                Study published card sets from your dashboard, flip through them at your own pace and bookmark the ones you want to come back to.
              </p>
            </GlowCard>
            <GlowCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Student Hub</h3>
              <p className="text-sm text-muted-foreground">
                Chat with your class group, share runnable code blocks, pin the answers that matter, and request private conversations that both sides must approve. Private chats are encrypted in your browser.
              </p>
            </GlowCard>
            <GlowCard>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Code arena</h3>
              <p className="text-sm text-muted-foreground">
                Run mini coding sprints inside your group: a shared brief, a countdown, a live leaderboard, and XP plus badges for everyone who finishes.
              </p>
            </GlowCard>
          </div>
        </section>

        {/* For patrons */}
        <section className="border-t border-border/50 bg-card/30 py-16">
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="mb-2 text-center text-2xl font-bold">For patrons</h2>
            <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-muted-foreground">
              Patrons look after a school or centre on CodeRace. You are invited by email, and once you accept, your organisation is yours to run.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <GlowCard>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Manage your organisation</h3>
                <p className="text-sm text-muted-foreground">
                  Add the students under your care by email. When they sign in, their account links to your organisation automatically.
                </p>
              </GlowCard>
              <GlowCard>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <LineChart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Track performance over time</h3>
                <p className="text-sm text-muted-foreground">
                  See how your members do across quizzes, tournaments and assessments — scores, rankings and question-level strengths and gaps.
                </p>
              </GlowCard>
              <GlowCard>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Receive shared curriculum</h3>
                <p className="text-sm text-muted-foreground">
                  Courses, flashcard sets and quizzes shared with your organisation appear for your members without any extra setup.
                </p>
              </GlowCard>
              <GlowCard>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Coordination chat</h3>
                <p className="text-sm text-muted-foreground">
                  A dedicated channel to talk with other patrons and with the platform team about schedules, results and content.
                </p>
              </GlowCard>
              <GlowCard>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Safeguarded by design</h3>
                <p className="text-sm text-muted-foreground">
                  Students can report concerns in one tap, groups can be frozen instantly, and every moderation action is written to an audit trail.
                </p>
              </GlowCard>
              <GlowCard>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Published results</h3>
                <p className="text-sm text-muted-foreground">
                  When results are published, your members' rankings and feedback are available to review together in one place.
                </p>
              </GlowCard>
            </div>
          </div>
        </section>

        {/* Fair play */}
        <section className="border-t border-border/50 bg-card/30 py-16">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="mb-8 text-center text-2xl font-bold">Fair play, built in</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <GlowCard>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <Maximize className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Fullscreen races</h3>
                <p className="text-sm text-muted-foreground">
                  Competitive races run on desktop in fullscreen. Leaving it costs a strike, and three strikes end your run — so stay in the arena.
                </p>
              </GlowCard>
              <GlowCard>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Sign in to compete</h3>
                <p className="text-sm text-muted-foreground">
                  Assessments require a signed-in account, so every result belongs to a real student and nobody can enter twice.
                </p>
              </GlowCard>
              <GlowCard>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <Palette className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Make it yours</h3>
                <p className="text-sm text-muted-foreground">
                  Pick Cyan, Blue, Red, Purple or Yellow. The honeycomb grid glows in your colour as your cursor moves.
                </p>
              </GlowCard>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border/50 py-16">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="mb-8 text-2xl font-bold">How It Works</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">1</div>
                <h3 className="font-semibold mb-1">Sign in</h3>
                <p className="text-sm text-muted-foreground">Students land in the learner dashboard; patrons land in their organisation.</p>
              </div>
              <div>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">2</div>
                <h3 className="font-semibold mb-1">Learn & collaborate</h3>
                <p className="text-sm text-muted-foreground">Study flashcards and lessons, then build together in the Student Hub.</p>
              </div>
              <div>
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">3</div>
                <h3 className="font-semibold mb-1">Compete live</h3>
                <p className="text-sm text-muted-foreground">Enter a race with a PIN. Real-time leaderboard — fastest correct answer wins.</p>
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
