import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock } from "lucide-react";

export const Route = createFileRoute("/competitions/")({
  head: () => ({
    meta: [
      { title: "Competitions | CodeRace" },
      { name: "description", content: "Upcoming and live CodeRace championships open to you and your school." },
      { property: "og:title", content: "Competitions | CodeRace" },
      { property: "og:description", content: "Join scheduled multi-school championships on CodeRace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompetitionsList,
});

export function phaseOf(c: { starts_at: string; ends_at: string }, now = Date.now()) {
  if (now < new Date(c.starts_at).getTime()) return "upcoming";
  if (now < new Date(c.ends_at).getTime()) return "live";
  return "ended";
}

function CompetitionsList() {
  const [list, setList] = useState<any[]>([]);
  const [, tick] = useState(0);
  useEffect(() => {
    supabase.from("competitions").select("id,title,description,starts_at,ends_at,visibility,status")
      .eq("status", "published").order("starts_at").then(({ data }) => setList(data || []));
    const t = setInterval(() => tick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <HoneycombLayout>
      <Navbar />
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Trophy className="h-6 w-6 text-primary" />Competitions</h1>
        {list.length === 0 && <p className="text-muted-foreground">No competitions announced yet.</p>}
        {list.map((c) => {
          const p = phaseOf(c);
          return (
            <Link key={c.id} to="/competitions/$id" params={{ id: c.id }}>
              <GlowCard className="mb-3 p-4 transition hover:border-primary/60">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{c.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${p === "live" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {p === "live" ? "Live now" : p === "upcoming" ? "Upcoming" : "Ended"}
                  </span>
                </div>
                {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
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
