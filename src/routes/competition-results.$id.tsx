import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { ArrowLeft, Crown, Download, Trophy } from "lucide-react";

export const Route = createFileRoute("/competition-results/$id")({
  head: () => ({
    meta: [
      { title: "Competition Results | CodeRace" },
      { name: "description", content: "Live and final rankings and school results for a CodeRace championship." },
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
const status = (r: any) => (r.strikes_count >= 3 ? "Disqualified" : r.submitted_at ? "Submitted" : "In progress");

function Results() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const { isSetter, isAdmin, isPatron } = useUserRole() as any;
  const staff = isSetter || isAdmin;
  const watcher = staff || isPatron;
  const [comp, setComp] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<Record<string, string>>({});
  const [org, setOrg] = useState("all");

  useEffect(() => {
    supabase.from("competitions").select("*").eq("id", id).maybeSingle().then(({ data }) => setComp(data));
    const load = () => {
      let q = supabase.from("competition_submissions").select("*").eq("competition_id", id);
      if (!watcher) q = q.not("submitted_at", "is", null);
      q.then(async ({ data }) => {
        setRows(data || []);
        const ids = [...new Set((data || []).map((r) => r.organization_id).filter(Boolean))] as string[];
        if (ids.length) {
          const { data: o } = await supabase.from("organizations").select("id,school_name").in("id", ids);
          setOrgs(Object.fromEntries((o || []).map((x: any) => [x.id, x.school_name])));
        }
      });
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [id, watcher]);

  const now = Date.now();
  const live = comp && now >= new Date(comp.starts_at).getTime() && now < new Date(comp.ends_at).getTime();
  const ranked = rankSubmissions(rows, comp?.scoring_mode || "points_and_speed");
  const shown = org === "all" ? ranked : ranked.filter((r) => r.organization_id === org);
  const orgIds = Object.keys(orgs);
  const done = shown.filter((r) => r.submitted_at);
  const avg = done.length ? Math.round(done.reduce((s, r) => s + Number(r.total_score), 0) / done.length) : 0;

  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Rank", "Name", "School", "Score", "Time", "Time (seconds)", "Tests passed", "Strikes", "Status", "Submitted at"];
    const lines = shown.map((r) => [ranked.indexOf(r) + 1, r.display_name, r.organization_id ? orgs[r.organization_id] || "School" : "Independent",
      Number(r.total_score), fmt(r.time_spent_seconds), r.time_spent_seconds, r.test_cases_passed, r.strikes_count, status(r),
      r.submitted_at ? new Date(r.submitted_at).toLocaleString() : ""].map(esc).join(","));
    const blob = new Blob(["\uFEFF" + [head.map(esc).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${(comp?.title || "competition").replace(/[^\w-]+/g, "_")}_results.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  return (
    <HoneycombLayout><Navbar />
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <Link to={watcher ? "/competitions/live" : "/competitions"} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</Link>
        <GlowCard className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="flex items-center gap-2 text-2xl font-bold"><Trophy className="h-6 w-6 text-primary" />{comp?.title || "Results"}</h1>
            {live && <span className="flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Live — updates every 10s</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {watcher && `${shown.length} entered · ${shown.length - done.length} still answering · `}{done.length} finished · average {avg} pts
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {orgIds.length > 0 && (
              <select value={org} onChange={(e) => setOrg(e.target.value)} className="rounded-md border border-border bg-background px-2 py-1 text-sm">
                <option value="all">All schools</option>
                {orgIds.map((o) => <option key={o} value={o}>{orgs[o]}</option>)}
              </select>
            )}
            {watcher && shown.length > 0 && <Button size="sm" variant="outline" onClick={exportCsv}><Download className="mr-1 h-4 w-4" />Export to Excel</Button>}
          </div>
        </GlowCard>
        <GlowCard className="p-4">
          {shown.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No results available yet.</p> : (
            <div className="space-y-2">
              {shown.map((r) => {
                const rank = ranked.indexOf(r) + 1;
                return (
                  <div key={r.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-all ${r.user_id === user?.id ? "border-primary/60 bg-primary/10" : "border-border bg-card"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${rank === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {rank === 1 ? <Crown className="h-4 w-4" /> : rank}
                      </span>
                      <div>
                        <p className="font-semibold">{r.display_name}{r.user_id === user?.id ? " (You)" : ""}</p>
                        <p className="text-xs text-muted-foreground">{r.organization_id ? orgs[r.organization_id] || "School" : "Independent"} · {fmt(r.time_spent_seconds)} · {r.test_cases_passed} tests passed
                          {watcher && ` · ${r.strikes_count} strikes · ${status(r)}`}</p>
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
