import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useEffect, useState } from "react";
import { ArrowRight, ArrowLeft, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/join")({
  component: JoinPage,
});

function JoinPage() {
  const { user, loading: authLoading } = useAuth();
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Prefill name from profile once user is loaded
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      const preferred = (data?.display_name || data?.email || user.email || "").trim();
      if (preferred && !name) setName(preferred);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleJoin = async () => {
    if (pin.length !== 6 || !name.trim()) return;
    if (!user) {
      setError("You must sign in to join a race.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { data: session } = await supabase
        .from("game_sessions")
        .select("id, status")
        .eq("pin_code", pin)
        .single();

      if (!session) {
        setError("Invalid PIN. No race found.");
        setLoading(false);
        return;
      }
      if (session.status === "finished") {
        setError("This race has already ended.");
        setLoading(false);
        return;
      }

      // If this user already joined this session, reuse the same participant row
      const { data: existing } = await supabase
        .from("participants")
        .select("id")
        .eq("session_id", session.id)
        .eq("user_id", user.id)
        .maybeSingle();

      let participantId = existing?.id as string | undefined;

      if (!participantId) {
        const { data: participant, error: insertError } = await supabase
          .from("participants")
          .insert({
            session_id: session.id,
            student_name: name.trim(),
            user_id: user.id,
          } as any)
          .select("id")
          .single();

        if (insertError) {
          // 23505 = unique violation (duplicate join)
          if ((insertError as any).code === "23505") {
            setError("You have already joined this race from this account.");
          } else {
            setError("Failed to join. Try again.");
          }
          setLoading(false);
          return;
        }
        participantId = participant?.id;
      }

      if (!participantId) {
        setError("Failed to join. Try again.");
        setLoading(false);
        return;
      }

      navigate({
        to: "/race",
        search: { sessionId: session.id, participantId },
      });
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // Not signed in — force login first
  if (!authLoading && !user) {
    return (
      <HoneycombLayout>
        <main className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="mb-8 flex items-center gap-2">
            <Logo className="h-12 w-12" />
            <span className="text-3xl font-bold tracking-tight">
              Code<span className="text-primary">Race</span>
            </span>
          </div>
          <GlowCard className="w-full max-w-sm text-center">
            <Lock className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="mb-2 text-xl font-bold">Sign in to Join</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              To keep races fair, each participant must sign in. This prevents duplicate joins and cheating.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/login">
                <Button variant="neon" size="lg" className="w-full">Sign In</Button>
              </Link>
              <Link to="/register">
                <Button variant="ghost" size="sm" className="w-full">Create an account</Button>
              </Link>
            </div>
          </GlowCard>
          <Link to="/" className="mt-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </main>
      </HoneycombLayout>
    );
  }

  return (
    <HoneycombLayout>
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="mb-8 flex items-center gap-2">
          <Logo className="h-12 w-12" />
          <span className="text-3xl font-bold tracking-tight">
            Code<span className="text-primary">Race</span>
          </span>
        </div>

        <GlowCard className="w-full max-w-sm">
          <h2 className="mb-6 text-center text-xl font-bold">Join a Race</h2>
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Game PIN</label>
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit PIN"
                className="bg-background text-center font-mono text-2xl tracking-[0.3em]"
                maxLength={6}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Your Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="bg-background"
              />
            </div>
            <Button variant="neon" size="xl" className="w-full" onClick={handleJoin} disabled={pin.length !== 6 || !name.trim() || loading}>
              {loading ? "Joining..." : "Enter Race"}
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </GlowCard>

        <Link to="/" className="mt-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </main>
    </HoneycombLayout>
  );
}
