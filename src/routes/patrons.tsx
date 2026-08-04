import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Building2, Plus, Trash2, Share2, Users, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/patrons")({
  head: () => ({
    meta: [
      { title: "School Patrons | CodeRace Setter Tools" },
      { name: "description", content: "Invite school patrons, review their organisations and share curriculum, flashcards and quizzes with them." },
      { property: "og:title", content: "School Patrons | CodeRace" },
      { property: "og:description", content: "Invite patrons and share curriculum with partner schools on CodeRace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatronsPage,
});

interface Org {
  id: string;
  school_name: string;
  patron_name: string;
  patron_email: string;
  patron_phone: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  patron_user_id: string | null;
}

interface ResourceOption {
  id: string;
  title: string;
  type: "flashcard_set" | "lesson_course" | "quiz";
}

function PatronsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isSetter, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [shared, setShared] = useState<any[]>([]);
  const [resources, setResources] = useState<ResourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeOrg, setActiveOrg] = useState<string | null>(null);

  const [schoolName, setSchoolName] = useState("");
  const [patronName, setPatronName] = useState("");
  const [patronEmail, setPatronEmail] = useState("");
  const [patronPhone, setPatronPhone] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isSetter)) navigate({ to: "/login" });
  }, [user, authLoading, roleLoading, isSetter, navigate]);

  useEffect(() => {
    if (user && !roleLoading && isSetter) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleLoading, isSetter]);

  const loadAll = async () => {
    setLoading(true);
    const { data: orgData } = await supabase
      .from("organizations")
      .select("*")
      .eq("created_by", user!.id)
      .order("created_at", { ascending: false });
    const list = (orgData || []) as any as Org[];
    setOrgs(list);
    if (!activeOrg && list.length > 0) setActiveOrg(list[0].id);

    const { data: members } = await supabase.from("organization_members").select("organization_id");
    const counts: Record<string, number> = {};
    (members || []).forEach((m: any) => {
      counts[m.organization_id] = (counts[m.organization_id] || 0) + 1;
    });
    setMemberCounts(counts);

    const { data: sharedData } = await supabase
      .from("shared_resources")
      .select("*")
      .eq("shared_by", user!.id);
    setShared(sharedData || []);

    const [sets, courses, quizzes] = await Promise.all([
      supabase.from("flashcard_sets").select("id, title").eq("setter_id", user!.id),
      supabase.from("lesson_courses").select("id, title").eq("setter_id", user!.id),
      supabase.from("quizzes").select("id, title"),
    ]);
    setResources([
      ...((sets.data || []) as any[]).map((s) => ({ id: s.id, title: s.title, type: "flashcard_set" as const })),
      ...((courses.data || []) as any[]).map((c) => ({ id: c.id, title: c.title, type: "lesson_course" as const })),
      ...((quizzes.data || []) as any[]).map((q) => ({ id: q.id, title: q.title, type: "quiz" as const })),
    ]);
    setLoading(false);
  };

  const invitePatron = async () => {
    if (!user || !schoolName.trim() || !patronName.trim() || !patronEmail.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("organizations").insert({
      created_by: user.id,
      school_name: schoolName.trim(),
      patron_name: patronName.trim(),
      patron_email: patronEmail.trim().toLowerCase(),
      patron_phone: patronPhone.trim() || null,
      location: location.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) { alert(error.message); return; }
    setSchoolName(""); setPatronName(""); setPatronEmail(""); setPatronPhone(""); setLocation(""); setNotes("");
    loadAll();
  };

  const deleteOrg = async (id: string) => {
    if (!confirm("Remove this school and its patron invitation?")) return;
    await supabase.from("organizations").delete().eq("id", id);
    if (activeOrg === id) setActiveOrg(null);
    loadAll();
  };

  const shareResource = async (r: ResourceOption) => {
    if (!activeOrg || !user) return;
    const { error } = await supabase.from("shared_resources").insert({
      organization_id: activeOrg,
      resource_type: r.type,
      resource_id: r.id,
      title: r.title,
      shared_by: user.id,
    });
    if (error && !error.message.includes("duplicate")) { alert(error.message); return; }
    loadAll();
  };

  const unshare = async (id: string) => {
    await supabase.from("shared_resources").delete().eq("id", id);
    loadAll();
  };

  if (authLoading || roleLoading || loading) {
    return (
      <HoneycombLayout>
        <Navbar />
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </HoneycombLayout>
    );
  }

  const sharedForActive = shared.filter((s) => s.organization_id === activeOrg);

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mb-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Building2 className="h-7 w-7 text-primary" /> School <span className="text-primary">Patrons</span>
        </h1>
        <p className="mb-8 text-muted-foreground">
          Invite a patron by email. They get a notification in-app and become patron once they accept.
        </p>

        <div className="grid gap-6 lg:grid-cols-2">
          <GlowCard>
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Invite a patron</h2>
            </div>
            <div className="space-y-3">
              <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="School / organisation name" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={patronName} onChange={(e) => setPatronName(e.target.value)} placeholder="Patron full name" />
                <Input type="email" value={patronEmail} onChange={(e) => setPatronEmail(e.target.value)} placeholder="Patron email" />
                <Input value={patronPhone} onChange={(e) => setPatronPhone(e.target.value)} placeholder="Phone (optional)" />
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location (optional)" />
              </div>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes about this patron / school (optional)" className="min-h-[80px]" />
              <Button variant="neon" onClick={invitePatron} disabled={saving || !schoolName.trim() || !patronName.trim() || !patronEmail.trim()}>
                {saving ? "Sending..." : "Send patron invitation"}
              </Button>
            </div>
          </GlowCard>

          <GlowCard>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Schools</h2>
            </div>
            {orgs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No schools yet. Invite your first patron.</p>
            ) : (
              <div className="space-y-2">
                {orgs.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => setActiveOrg(o.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition ${activeOrg === o.id ? "border-primary bg-primary/10" : "border-border bg-background/50 hover:border-primary/50"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{o.school_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.patron_name} · {o.patron_email}
                          {o.patron_phone ? ` · ${o.patron_phone}` : ""}
                          {o.location ? ` · ${o.location}` : ""}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-xs">
                          {o.status === "active" ? (
                            <><CheckCircle2 className="h-3 w-3 text-primary" /> <span className="text-primary">Patron accepted</span></>
                          ) : (
                            <><Clock className="h-3 w-3 text-muted-foreground" /> <span className="text-muted-foreground">Awaiting acceptance</span></>
                          )}
                          <span className="text-muted-foreground">· {memberCounts[o.id] || 0} learner(s)</span>
                        </p>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteOrg(o.id); }} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlowCard>
        </div>

        {activeOrg && (
          <GlowCard className="mt-6">
            <div className="mb-4 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                Share curriculum with {orgs.find((o) => o.id === activeOrg)?.school_name}
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Your content</p>
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {resources.length === 0 && <p className="text-sm text-muted-foreground">Nothing to share yet.</p>}
                  {resources.map((r) => {
                    const already = sharedForActive.some((s) => s.resource_id === r.id && s.resource_type === r.type);
                    return (
                      <div key={`${r.type}-${r.id}`} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-2.5">
                        <div>
                          <p className="text-sm font-medium">{r.title}</p>
                          <p className="text-xs text-muted-foreground">{r.type.replace("_", " ")}</p>
                        </div>
                        <Button variant={already ? "neon-outline" : "neon"} size="sm" disabled={already} onClick={() => shareResource(r)}>
                          {already ? "Shared" : "Share"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">Shared with this school</p>
                {sharedForActive.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing shared yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sharedForActive.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-2.5">
                        <div>
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground">{String(s.resource_type).replace("_", " ")}</p>
                        </div>
                        <button onClick={() => unshare(s.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </GlowCard>
        )}
      </main>
    </HoneycombLayout>
  );
}