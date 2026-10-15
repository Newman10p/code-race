import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { supabase } from "@/integrations/supabase/client";
import { Radio, Trophy, Clock } from "lucide-react";
import { phaseOf } from "./competitions.index";

export const Route = createFileRoute("/competitions/live")({
  head: () => ({
    meta: [
      { title: "Live Leaderboards | CodeRace" },
      { name: "description", content: "Follow live and past competition leaderboards for your schools." },
      { property: "og:title", content: "Live Leaderboards | CodeRace" },
      { property: "og:description", content: "Real-time competition standings for setters and patrons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LiveBoards,
});

function LiveBoards() {
  const [list, setList] = useState<any[]>([]);
  const [, tick] = useState(0);
  useEffect(() => {
    supabase.from("competitions").select("id,title,starts_at,ends_at,status").neq("status", "draft")
      .order("starts_at", { ascending: false }).then(({ data }) => setList(data || []));
    const t = setInterval(() => tick((x) => x + 1), 15000);
    return () => clearInterval(t);
  }, []);
  const order = { live: 0, upcoming: 1, ended: 2 } as Record<string, number>;
  const sorted = [...list].sort((a, b) => order[phaseOf(a)] - order[phaseOf(b)]);

  return (
    <HoneycombLayout><Navbar />
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Radio className="h-6 w-6 text-primary" />Live leaderboards</h1>
        <p className="text-sm text-muted-foreground">Open any competition to follow its standings live and export the results.</p>
        {sorted.length === 0 && <p className="text-muted-foreground">No competitions yet.</p>}
        {sorted.map((c) => {
          const p = phaseOf(c);
          return (
            <Link key={c.id} to="/competition-results/$id" params={{ id: c.id }}>
              <GlowCard className="mb-3 p-4 transition hover:border-primary/60">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 font-semibold"><Trophy className="h-4 w-4 text-primary" />{c.title}</h2>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${p === "live" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {p === "live" && <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />}
                    {p === "live" ? "Live now" : p === "upcoming" ? "Upcoming" : "Ended"}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />
                  {new Date(c.starts_at).toLocaleString()} – {new Date(c.ends_at).toLocaleString()}</p>
              </GlowCard>
            </Link>
          );
        })}
      </div>
    </HoneycombLayout>
  );
}
