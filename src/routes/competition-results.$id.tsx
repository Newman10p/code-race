import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Crown, Trophy } from "lucide-react";

export const Route = createFileRoute("/competition-results/$id")({
  head: () => ({
    meta: [
      { title: "Competition Results | CodeRace" },
      { name: "description", content: "Final rankings and school results for a CodeRace championship." },
      { property: "og:title", content: "Competition Results | CodeRace" },
      { property: "og:description", content: "See who topped the championship leaderboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Results,
});

export function rankSubmissions<T extends { total_score: number; time_spent_seconds: number }>(rows: T[], mode: string) {
  return [...rows].sort((a, b) =>
    Number(b.total_score) - Number(a.total_score) ||
    (mode === "strict_points" ? 0 : a.time_spent_seconds - b.time_spent_seconds));
}

const fmt = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;

function Results() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [comp, setComp] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<Record<string, string>>({});
  const [org, setOrg] = useState("all");

  useEffect(() => {
    supabase.from("competitions").select("*").eq("id", id).maybeSingle().then(({ data }) => setComp(data));
    const load = () => supabase.from("competition_submissions").select("*").eq("competition_id", id)
      .not("submitted_at", "is", null).then(async ({ data }) => {
        setRows(data || []);
        const ids = [...new Set((data || []).map((r) => r.organization_id).filter(Boolean))] as string[];
        if (ids.length) {
          const { data: o } = await supabase.from("organizations").select("id,name").in("id", ids);
          setOrgs(Object.fromEntries((o || []).map((x: any) => [x.id, x.name])));
        }
      });
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [id]);

  const ranked = rankSubmissions(rows, comp?.scoring_mode || "points_and_speed");
  const shown = org === "all" ? ranked : ranked.filter((r) => r.organization_id === org);
  const orgIds = Object.keys(orgs);
  const avg = shown.length ? Math.round(shown.reduce((s, r) => s + Number(r.total_score), 0) / shown.length) : 0;

  return (
    <HoneycombLayout><Navbar />
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <Link to="/competitions" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All competitions</Link>
        <GlowCard className="p-5">
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Trophy className="h-6 w-6 text-primary" />{comp?.title || "Results"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{shown.length} finishers · average {avg} pts</p>
          {orgIds.length > 0 && (
            <select value={org} onChange={(e) => setOrg(e.target.value)} className="mt-3 rounded-md border border-border bg-background px-2 py-1 text-sm">
              <option value="all">All schools</option>
              {orgIds.map((o) => <option key={o} value={o}>{orgs[o]}</option>)}
            </select>
          )}
        </GlowCard>
        <GlowCard className="p-4">
          {shown.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No results available yet. Rankings appear once the competition closes.</p> : (
            <div className="space-y-2">
              {shown.map((r) => {
                const rank = ranked.indexOf(r) + 1;
                return (
                  <div key={r.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${r.user_id === user?.id ? "border-primary/60 bg-primary/10" : "border-border bg-card"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${rank === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {rank === 1 ? <Crown className="h-4 w-4" /> : rank}
                      </span>
                      <div>
                        <p className="font-semibold">{r.display_name}{r.user_id === user?.id ? " (You)" : ""}</p>
                        <p className="text-xs text-muted-foreground">{r.organization_id ? orgs[r.organization_id] || "School" : "Independent"} · {fmt(r.time_spent_seconds)} · {r.test_cases_passed} tests passed</p>
                      </div>
                    </div>
                    <span className="font-mono text-lg font-bold text-primary">{Number(r.total_score)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </GlowCard>
      </div>
    </HoneycombLayout>
  );
}
