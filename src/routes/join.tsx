import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Zap, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/join")({
  component: JoinPage,
});

function JoinPage() {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (pin.length === 6 && name.trim()) {
      navigate({ to: "/lobby" });
    }
  };

  return (
    <HoneycombLayout>
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-btn">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-3xl font-bold tracking-tight">
            Code<span className="text-primary">Race</span>
          </span>
        </div>

        <GlowCard className="w-full max-w-sm">
          <h2 className="mb-6 text-center text-xl font-bold">Join a Race</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Game PIN
              </label>
              <Input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit PIN"
                className="bg-background text-center font-mono text-2xl tracking-[0.3em]"
                maxLength={6}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">
                Your Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="bg-background"
              />
            </div>
            <Button
              variant="neon"
              size="xl"
              className="w-full"
              onClick={handleJoin}
              disabled={pin.length !== 6 || !name.trim()}
            >
              Enter Race
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </GlowCard>
      </main>
    </HoneycombLayout>
  );
}
