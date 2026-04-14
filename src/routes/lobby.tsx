import { createFileRoute } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/lobby")({
  component: Lobby,
});

function Lobby() {
  return (
    <HoneycombLayout>
      <main className="flex min-h-screen flex-col items-center justify-center px-4 scan-line">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 animate-pulse-glow">
            <Zap className="h-10 w-10 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-bold">Waiting for Host...</h1>
          <p className="text-muted-foreground">
            The race will begin when the host starts it.
          </p>
          <div className="mt-8 flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-3 w-3 rounded-full bg-primary"
                style={{
                  animation: `pulse-glow 1.5s ease-in-out ${i * 0.3}s infinite`,
                }}
              />
            ))}
          </div>
        </div>
      </main>
    </HoneycombLayout>
  );
}
