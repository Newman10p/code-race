import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, UserPlus, Trash2, BookOpen, BarChart3, Mail, MessageSquare, Play, Folder, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/organisation")({
  head: () => ({
    meta: [
      { title: "Patron Organisation Dashboard | CodeRace" },
      { name: "description", content: "Patrons register learners, track their quiz and test performance over time and access curriculum shared by setters." },
      { property: "og:title", content: "Patron Organisation Dashboard | CodeRace" },
      { property: "og:description", content: "Manage your school's learners and review their CodeRace performance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrganisationPage,
});

interface Org {
  id: string;
  school_name: string;
  patron_name: string;
  patron_email: string;
  status: string;
  patron_user_id: string | null;
  location: string | null;
}

interface Member {
  id: string;
  email: string;
  full_name: string | null;
  user_id: string | null;
  class_name: string | null;
  admission_no: string | null;
}

interface Perf {
  races: number;
  best: number;
  avg: number;
}

function OrganisationPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [invites, setInvites] = useState<Org[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [activeOrg, setActiveOrg] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [shared, setShared] = useState<any[]>([]);
  const [perf, setPerf] = useState<Record<string, Perf>>({});
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [klass, setKlass] = useState("");
  const [bulk, setBulk] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [folderQuizzes, setFolderQuizzes] = useState<Record<string, { id: string; title: string }[]>>({});
  const [hosting, setHosting] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) loadOrgs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (activeOrg) loadOrgDetail(activeOrg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg]);

  const loadOrgs = async () => {
    setLoading(true);
    const { data } = await supabase.from("organizations").select("*");
    const all = ((data || []) as any[]) as Org[];
    const mine = all.filter((o) => o.patron_user_id === user!.id);
    const pending = all.filter(
      (o) => !o.patron_user_id && o.patron_email.toLowerCase() === (user!.email || "").toLowerCase()
    );
    setOrgs(mine);
    setInvites(pending);
    if (!activeOrg && mine.length > 0) setActiveOrg(mine[0].id);
    setLoading(false);
  };

  const acceptInvite = async (orgId: string) => {
    const { data, error } = await supabase.rpc("accept_patron_invite", { _org: orgId });
    if (error) { alert(error.message); return; }
    if (!data) { alert("This invitation is no longer available."); }
    await loadOrgs();
    window.location.reload();
  };

  const loadOrgDetail = async (orgId: string) => {
    const [{ data: memberData }, { data: sharedData }] = await Promise.all([
      supabase.from("organization_members").select("*").eq("organization_id", orgId).order("created_at"),
      supabase.from("shared_resources").select("*").eq("organization_id", orgId).order("created_at", { ascending: false }),
    ]);
    const list = ((memberData || []) as any[]) as Member[];
    setMembers(list);
    setShared(sharedData || []);
    const folderIds = (sharedData || []).filter((s: any) => s.resource_type === "folder").map((s: any) => s.resource_id);
    const directQuizIds = (sharedData || []).filter((s: any) => s.resource_type === "quiz").map((s: any) => s.resource_id);
    const fq: Record<string, { id: string; title: string }[]> = {};
    if (folderIds.length) {
      const { data: qs } = await supabase.from("quizzes").select("id, title, folder_id").in("folder_id", folderIds);
      ((qs || []) as any[]).forEach((q) => { (fq[q.folder_id] ||= []).push({ id: q.id, title: q.title }); });
    }
    if (directQuizIds.length) fq["__direct"] = [];
    setFolderQuizzes(fq);

    const userIds = list.map((m) => m.user_id).filter(Boolean) as string[];
    if (userIds.length === 0) { setPerf({}); return; }
    const { data: parts } = await supabase
      .from("participants")
      .select("user_id, current_score")
      .in("user_id", userIds);
    const acc: Record<string, { total: number; races: number; best: number }> = {};
    ((parts || []) as any[]).forEach((p) => {
      if (!p.user_id) return;
      const a = acc[p.user_id] || { total: 0, races: 0, best: 0 };
      a.total += p.current_score || 0;
      a.races += 1;
      a.best = Math.max(a.best, p.current_score || 0);
      acc[p.user_id] = a;
    });
    const out: Record<string, Perf> = {};
    Object.entries(acc).forEach(([k, v]) => {
      out[k] = { races: v.races, best: v.best, avg: v.races ? Math.round(v.total / v.races) : 0 };
    });
    setPerf(out);
  };

  const addMember = async () => {
    if (!activeOrg || !email.trim() || !user) return;
    setAdding(true);
    const { error } = await supabase.from("organization_members").insert({
      organization_id: activeOrg,
      email: email.trim().toLowerCase(),
      full_name: name.trim() || null,
      class_name: klass.trim() || null,
      invited_by: user.id,
    });
    setAdding(false);
    if (error) { alert(error.message); return; }
    setEmail(""); setName("");
    loadOrgDetail(activeOrg);
  };

  const bulkAdd = async () => {
    if (!activeOrg || !user || !bulk.trim()) return;
    const rows = bulk.split(/\r?\n/).map((l) => l.split(/[,\t;]/).map((c) => c.trim())).filter((r) => r[0] && r[0].includes("@"));
    if (!rows.length) { alert("Each line needs: email, full name, class, admission number"); return; }
    setAdding(true);
    const { error } = await supabase.from("organization_members").insert(rows.map((r) => ({
      organization_id: activeOrg, email: r[0].toLowerCase(), full_name: r[1] || null,
      class_name: r[2] || null, admission_no: r[3] || null, invited_by: user.id,
    })));
    setAdding(false);
    if (error) { alert(error.message); return; }
    setBulk("");
    loadOrgDetail(activeOrg);
  };

  const setMemberClass = async (id: string, value: string) => {
    await supabase.from("organization_members").update({ class_name: value.trim() || null }).eq("id", id);
    if (activeOrg) loadOrgDetail(activeOrg);
  };

  const hostQuiz = async (quizId: string) => {
    if (!user) return;
    setHosting(quizId);
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const { data, error } = await supabase.from("game_sessions")
      .insert({ quiz_id: quizId, pin_code: pin, host_id: user.id, status: "lobby" }).select("id").single();
    setHosting(null);
    if (error || !data) { alert(error?.message || "Could not start the race"); return; }
    navigate({ to: "/launch", search: { sessionId: data.id } as any });
  };

  const removeMember = async (id: string) => {
    if (!confirm("Remove this learner from your organisation?")) return;
    await supabase.from("organization_members").delete().eq("id", id);
    if (activeOrg) loadOrgDetail(activeOrg);
  };

  if (authLoading || loading) {
    return (
      <HoneycombLayout>
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </HoneycombLayout>
    );
  }

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/learn" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Building2 className="h-7 w-7 text-primary" /> My <span className="text-primary">Organisation</span>
        </h1>
        <p className="mb-8 text-muted-foreground">Register learners, track performance and use curriculum shared by your setter.</p>

        {invites.length > 0 && (
          <GlowCard className="mb-6 border-primary">
            <div className="mb-3 flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Patron invitation{invites.length > 1 ? "s" : ""}</h2>
            </div>
            <div className="space-y-2">
              {invites.map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3">
                  <div>
                    <p className="font-medium">{o.school_name}</p>
                    <p className="text-xs text-muted-foreground">
                      You have been invited to be the patron{o.location ? ` · ${o.location}` : ""}
                    </p>
                  </div>
                  <Button variant="neon" size="sm" onClick={() => acceptInvite(o.id)}>Accept</Button>
                </div>
              ))}
            </div>
          </GlowCard>
        )}

        {orgs.length === 0 ? (
          <GlowCard>
            <p className="py-6 text-center text-sm text-muted-foreground">
              You are not a patron of any school yet. A setter must invite you by email.
            </p>
          </GlowCard>
        ) : (
          <>
            {orgs.length > 1 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {orgs.map((o) => (
                  <Button key={o.id} variant={activeOrg === o.id ? "neon" : "neon-outline"} size="sm" onClick={() => setActiveOrg(o.id)}>
                    {o.school_name}
                  </Button>
                ))}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
              <GlowCard>
                <div className="mb-4 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Register a learner</h2>
                </div>
                <div className="mb-4 grid gap-3 sm:grid-cols-2">
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Learner email" />
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name (optional)" />
                  <Input value={klass} onChange={(e) => setKlass(e.target.value)} placeholder="Class / stream e.g. S3 Blue" />
                </div>
                <Button variant="neon" onClick={addMember} disabled={adding || !email.trim()}>
                  {adding ? "Adding..." : "Add learner"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  They join your organisation automatically the moment they sign in with that email.
                </p>
                <div className="mt-5 border-t border-border pt-4">
                  <p className="mb-2 flex items-center gap-1 text-sm font-medium"><Upload className="h-4 w-4 text-primary" /> Bulk add (paste from Excel)</p>
                  <Textarea value={bulk} onChange={(e) => setBulk(e.target.value)} className="min-h-[90px] font-mono text-xs"
                    placeholder={"email, full name, class, admission no\njane@school.ug, Jane Achieng, S3 Blue, 1042"} />
                  <Button variant="neon-outline" size="sm" className="mt-2" onClick={bulkAdd} disabled={adding || !bulk.trim()}>Add all</Button>
                </div>
              </GlowCard>

              <GlowCard>
                <div className="mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Shared with your school</h2>
                </div>
                {shared.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">Nothing shared by your setter yet.</p>
                ) : (
                  <div className="space-y-4">
                    {[
                      ["folder", "Quiz folders"], ["quiz", "Quizzes"], ["lesson_course", "Lesson courses"], ["flashcard_set", "Flashcards"],
                    ].map(([type, label]) => {
                      const items = shared.filter((s) => s.resource_type === type);
                      if (!items.length) return null;
                      return (
                        <div key={type}>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                          <div className="space-y-2">
                            {items.map((s) => (
                              <div key={s.id} className="rounded-lg border border-border bg-background/50 p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="flex items-center gap-1.5 text-sm font-medium">
                                    {type === "folder" && <Folder className="h-4 w-4 text-primary" />}{s.title}
                                  </p>
                                  {type === "quiz" && (
                                    <Button size="sm" variant="neon" disabled={hosting === s.resource_id} onClick={() => hostQuiz(s.resource_id)}>
                                      <Play className="mr-1 h-3 w-3" /> Host
                                    </Button>
                                  )}
                                  {type === "lesson_course" && <Link to="/learn/course/$courseId" params={{ courseId: s.resource_id }} className="text-xs text-primary hover:underline">Open</Link>}
                                </div>
                                {type === "folder" && (
                                  <div className="mt-2 space-y-1.5 border-l border-primary/30 pl-3">
                                    {(folderQuizzes[s.resource_id] || []).length === 0 && <p className="text-xs text-muted-foreground">No quizzes in this folder yet.</p>}
                                    {(folderQuizzes[s.resource_id] || []).map((q) => (
                                      <div key={q.id} className="flex items-center justify-between gap-2">
                                        <span className="text-xs">{q.title}</span>
                                        <Button size="sm" variant="neon-outline" className="h-7 px-2 text-xs" disabled={hosting === q.id} onClick={() => hostQuiz(q.id)}>
                                          <Play className="mr-1 h-3 w-3" /> Host practice race
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground">Hosting opens a live room with a PIN — give it to your learners to join from the Join page.</p>
                  </div>
                )}
                <Link to="/chat" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <MessageSquare className="h-4 w-4" /> Talk to setters &amp; other patrons
                </Link>
              </GlowCard>
            </div>

            <GlowCard className="mt-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Learner performance</h2>
              </div>
              {members.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {["all", ...Array.from(new Set(members.map((m) => m.class_name || "Unassigned"))).sort()].map((c) => (
                    <Button key={c} size="sm" variant={classFilter === c ? "neon" : "neon-outline"} onClick={() => setClassFilter(c)}>
                      {c === "all" ? `All (${members.length})` : `${c} (${members.filter((m) => (m.class_name || "Unassigned") === c).length})`}
                    </Button>
                  ))}
                </div>
              )}
              {members.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No learners registered yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2">Learner</th>
                        <th className="py-2">Class</th>
                        <th className="py-2">Status</th>
                        <th className="py-2">Races / tests</th>
                        <th className="py-2">Best score</th>
                        <th className="py-2">Average</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...members]
                        .filter((m) => classFilter === "all" || (m.class_name || "Unassigned") === classFilter)
                        .sort((a, b) => (a.class_name || "~").localeCompare(b.class_name || "~") || (a.full_name || a.email).localeCompare(b.full_name || b.email))
                        .map((m) => {
                        const p = m.user_id ? perf[m.user_id] : undefined;
                        return (
                          <tr key={m.id} className="border-b border-border/50">
                            <td className="py-2">
                              <p className="font-medium">{m.full_name || m.email}</p>
                              <p className="text-xs text-muted-foreground">{m.email}{m.admission_no ? ` · #${m.admission_no}` : ""}</p>
                            </td>
                            <td className="py-2">
                              <input defaultValue={m.class_name || ""} onBlur={(e) => e.target.value !== (m.class_name || "") && setMemberClass(m.id, e.target.value)}
                                placeholder="—" className="w-24 rounded border border-border bg-background/50 px-2 py-1 text-xs" />
                            </td>
                            <td className="py-2 text-xs">
                              {m.user_id ? <span className="text-primary">Active</span> : <span className="text-muted-foreground">Not signed up</span>}
                            </td>
                            <td className="py-2">{p?.races ?? 0}</td>
                            <td className="py-2">{p?.best ?? 0}</td>
                            <td className="py-2">{p?.avg ?? 0}</td>
                            <td className="py-2 text-right">
                               {m.user_id && <Link to="/collab/direct" search={{ user: m.user_id }} aria-label={`Message ${m.full_name || m.email}`} className="mr-2 inline-flex rounded p-1.5 text-primary hover:bg-primary/10"><MessageSquare className="h-4 w-4" /></Link>}
                              <button onClick={() => removeMember(m.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </GlowCard>
          </>
        )}
      </main>
    </HoneycombLayout>
  );
}