import { createFileRoute } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { useState, useEffect } from "react";
import { Copy, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/launch")({
  component: LaunchRoom,
});

function LaunchRoom() {
  const [pin] = useState("483927");
  const [participants, setParticipants] = useState([
    { name: "Alice", joined: true },
    { name: "Bob", joined: true },
    { name: "Charlie", joined: true },
  ]);
  const [copied, setCopied] = useState(false);

  const copyPin = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Game PIN
          </p>
          <div className="mb-4 flex items-center justify-center gap-2">
            {pin.split("").map((digit, i) => (
              <span key={i} className="pin-digit animate-pulse-glow inline-flex h-20 w-16 items-center justify-center rounded-xl border border-primary/30 bg-card">
                {digit}
              </span>
            ))}
          </div>
          <Button
            variant="neon-outline"
            size="sm"
            onClick={copyPin}
            className="mb-8"
          >
            <Copy className="h-4 w-4" />
            {copied ? "Copied!" : "Copy PIN"}
          </Button>

          {/* Participants */}
          <GlowCard className="mx-auto max-w-md">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {participants.length} Players Joined
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {participants.map((p, i) => (
                <span
                  key={i}
                  className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                >
                  {p.name}
                </span>
              ))}
            </div>
            <Button variant="neon" size="xl" className="mt-6 w-full">
              <Zap className="h-5 w-5" />
              Start Race
            </Button>
          </GlowCard>
        </div>
      </main>
    </HoneycombLayout>
  );
}
