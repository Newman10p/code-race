import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Sparkles,
  Trophy,
  GraduationCap,
  Maximize,
  ChevronRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Step {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    icon: Sparkles,
    title: "Welcome to CodeRace 👋",
    body:
      "This quick tour shows you how to study flashcards, join live races, and take evaluations from your setter.",
  },
  {
    icon: BookOpen,
    title: "Flashcards",
    body:
      "Your Learner Hub lists every published flashcard set. Click a card to open it, flip cards to reveal the answer, and bookmark sets you want to revisit later.",
  },
  {
    icon: Trophy,
    title: "Live Races",
    body:
      "Click 'Join a Race' and enter the 6-digit PIN from your setter. Standard races are self-paced; Tournament races have rounds where only the top players advance.",
  },
  {
    icon: GraduationCap,
    title: "Evaluations",
    body:
      "Evaluations look like a race but are graded. At the end you'll see a per-question breakdown of what you got right, wrong, or skipped — great for practice tests.",
  },
  {
    icon: Maximize,
    title: "Fair Play",
    body:
      "Live races run in fullscreen on a desktop. Leaving fullscreen once gives you a warning; leaving again disqualifies you. Sign-in is required so nobody can join twice.",
  },
];

/**
 * First-run guided tour for learners. Renders once, then persists the
 * completion timestamp on the user's profile so it never re-appears.
 */
export function UserTutorial() {
  const { user } = useAuth();
  const { isLearner, isSetter, loading } = useUserRole();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading || !user || isSetter) return;
    // Show for anyone who hasn't completed it (learners + brand-new sign-ups)
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("tutorial_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data?.tutorial_completed_at) setOpen(true);
    })();
  }, [user, isLearner, isSetter, loading]);

  const finish = async () => {
    setOpen(false);
    if (!user) return;
    await (supabase as any)
      .from("profiles")
      .update({ tutorial_completed_at: new Date().toISOString() })
      .eq("user_id", user.id);
  };

  const s = STEPS[step];
  const Icon = s?.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && s && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[190] flex items-center justify-center bg-background/70 backdrop-blur-md px-4"
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="relative w-full max-w-md rounded-2xl border border-primary/30 bg-card p-6 shadow-2xl glow-card"
          >
            <button
              onClick={finish}
              className="absolute right-3 top-3 rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="Skip tutorial"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                {Icon && <Icon className="h-6 w-6 text-primary" />}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 className="text-lg font-bold leading-tight">{s.title}</h2>
              </div>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
              {s.body}
            </p>

            <div className="mb-4 flex items-center justify-center gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step
                      ? "w-6 bg-primary"
                      : i < step
                        ? "w-2 bg-primary/40"
                        : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={finish}>
                Skip
              </Button>
              {isLast ? (
                <Button variant="neon" size="lg" onClick={finish}>
                  Let's go <Sparkles className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="neon"
                  size="lg"
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}