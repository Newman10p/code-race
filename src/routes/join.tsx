import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useState } from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/join")({
  component: JoinPage,
});

function JoinPage() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (pin.length !== 6 || !name.trim()) return;
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

      const { data: participant, error: insertError } = await supabase
        .from("participants")
        .insert({ session_id: session.id, student_name: name.trim() })
        .select("id")
        .single();

      if (insertError || !participant) {
        setError("Failed to join. Try again.");
        setLoading(false);
        return;
      }

      navigate({
        to: "/race",
        search: { sessionId: session.id, participantId: participant.id },
      });
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

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
