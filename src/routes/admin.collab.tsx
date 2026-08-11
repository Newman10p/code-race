import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logAdminAction, myDisplayName } from "@/lib/collab";
import { toast } from "sonner";
import { ShieldAlert, Users, SlidersHorizontal, ScrollText, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/collab")({
  head: () => ({
    meta: [
      { title: "Hub control center — Moderation | CodeRace" },
      { name: "description", content: "Review student collaboration reports, freeze or archive groups, set communication policies and inspect the immutable audit log." },
      { property: "og:title", content: "Hub control center — Moderation | CodeRace" },
      { property: "og:description", content: "Reports queue, group controls, safeguarding policies and audit log for the Student Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminCollab,
});

type Report = {
  id: string;
  reporter_name: string;
  target_type: string;
  target_id: string | null;
  target_user_name: string | null;
  category: string;
  severity: string;
  description: string | null;
  status: string;
  resolution: string | null;
  created_at: string;
};

type Group = {
  id: string;
  name: string;
  privacy: string;
  status: string;
  is_default: boolean;
  created_at: string;
};

type Audit = {
  id: string;
  actor_name: string;
  action: string;
  target_type: string | null;
  target_label: string | null;
  reason: string;
  result: string | null;
  created_at: string;
};

type Policies = {
  allow_student_groups: boolean;
  require_admin_approval: boolean;
  allow_discoverable_groups: boolean;
  allow_private_chat: boolean;
  require_mutual_approval: boolean;
  allow_blocking: boolean;
  allow_reporting: boolean;
  freeze_group_messaging: boolean;
  freeze_group_creation: boolean;
  max_requests_per_hour: number;
};

const POLICY_LABELS: Record<keyof Omit<Policies, "max_requests_per_hour">, string> = {
  allow_student_groups: "Students can create their own groups",
  require_admin_approval: "New student groups need approval before going live",
  allow_discoverable_groups: "Groups may be listed in the discover directory",
  allow_private_chat: "Private one-to-one conversations are enabled",
  require_mutual_approval: "Private chats require both students to accept",
  allow_blocking: "Students can block one another",
  allow_reporting: "Students can report messages, people and groups",
  freeze_group_messaging: "Emergency: freeze all group messaging",
  freeze_group_creation: "Emergency: freeze creation of new groups",
};

const STATUSES = ["new", "under_review", "escalated", "action_taken", "resolved", "dismissed"] as const;

function AdminCollab() {
  const { user, loading } = useAuth();
  const { isSetter, isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [reports, setReports] = useState<Report[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [policies, setPolicies] = useState<Policies | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actorName, setActorName] = useState("Admin");

  const staff = isSetter || isAdmin;

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!user) navigate({ to: "/login" });
    else if (!staff) navigate({ to: "/collab" });
  }, [user, loading, roleLoading, staff, navigate]);

  const load = useCallback(async () => {
    const [r, g, a, p] = await Promise.all([
      supabase.from("collab_reports").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("collab_groups").select("id,name,privacy,status,is_default,created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("collab_settings").select("*").maybeSingle(),
    ]);
    setReports((r.data as Report[]) || []);
    setGroups((g.data as Group[]) || []);
    setAudit((a.data as Audit[]) || []);
    if (p.data) {
      const d = p.data as unknown as Policies;
      setPolicies(d);
    } else {
      setPolicies({
        allow_student_groups: true,
        require_admin_approval: false,
        allow_discoverable_groups: true,
        allow_private_chat: true,
        require_mutual_approval: true,
        allow_blocking: true,
        allow_reporting: true,
        freeze_group_messaging: false,
        freeze_group_creation: false,
        max_requests_per_hour: 10,
      });
    }
  }, []);

  useEffect(() => {
    if (!user || !staff) return;
    void load();
    void (async () => setActorName(await myDisplayName(user.id, user.email)))();
  }, [user, staff, load]);

  const setStatus = async (rep: Report, status: string) => {
    const reason = notes[rep.id]?.trim();
    if (!reason) {
      toast.error("A reason is required for every moderation action.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("collab_reports")
      .update({ status: status as Report["status"], resolution: reason, assigned_to: user!.id })
      .eq("id", rep.id);
    if (error) {
      toast.error(error.message);
    } else {
      await logAdminAction({
        actorId: user!.id,
        actorName,
        action: `report:${status}`,
        reason,
        targetType: "report",
        targetId: rep.id,
        targetLabel: `${rep.category} · ${rep.target_user_name || rep.target_type}`,
      });
      toast.success(`Report marked ${status.replace("_", " ")}.`);
      setNotes((n) => ({ ...n, [rep.id]: "" }));
      await load();
    }
    setBusy(false);
  };

  const setGroupStatus = async (g: Group, status: string) => {
    const reason = notes[g.id]?.trim();
    if (!reason) {
      toast.error("A reason is required before changing a group's status.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("collab_groups")
      .update({ status: status as Group["status"] })
      .eq("id", g.id);
    if (error) {
      toast.error(error.message);
    } else {
      await logAdminAction({
        actorId: user!.id,
        actorName,
        action: `group:${status}`,
        reason,
        targetType: "group",
        targetId: g.id,
        targetLabel: g.name,
      });
      toast.success(`${g.name} is now ${status}.`);
      setNotes((n) => ({ ...n, [g.id]: "" }));
      await load();
    }
    setBusy(false);
  };

  const savePolicy = async (patch: Partial<Policies>, label: string) => {
    if (!policies) return;
    const next = { ...policies, ...patch };
    setPolicies(next);
    const { error } = await supabase.from("collab_settings").upsert({ id: true, ...next });
    if (error) {
      toast.error(error.message);
      await load();
      return;
    }
    await logAdminAction({
      actorId: user!.id,
      actorName,
      action: "policy:update",
      reason: `Changed hub policy: ${label}`,
      targetType: "policy",
      targetLabel: label,
    });
  };

  if (loading || roleLoading || !staff) {
    return (
      <HoneycombLayout>
        <Navbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </HoneycombLayout>
    );
  }

  const open = reports.filter((r) => r.status === "new" || r.status === "under_review" || r.status === "escalated");

  return (
    <HoneycombLayout>
      <Navbar />
      <div className="hub-bg min-h-[calc(100vh-3.5rem)]">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight hub-text">
              Hub <span className="text-primary">control center</span>
            </h1>
            <p className="text-sm hub-text-dim">
              Safeguarding for the Student Hub. Every action needs a reason and is written to an immutable audit log. Message contents are never logged.
            </p>
          </header>

          <Tabs defaultValue="reports">
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="reports"><ShieldAlert className="mr-2 h-4 w-4" />Reports {open.length > 0 && <span className="ml-2 rounded-full bg-destructive/20 px-2 text-xs text-destructive">{open.length}</span>}</TabsTrigger>
              <TabsTrigger value="groups"><Users className="mr-2 h-4 w-4" />Groups</TabsTrigger>
              <TabsTrigger value="policies"><SlidersHorizontal className="mr-2 h-4 w-4" />Policies</TabsTrigger>
              <TabsTrigger value="audit"><ScrollText className="mr-2 h-4 w-4" />Audit log</TabsTrigger>
            </TabsList>

            <TabsContent value="reports" className="space-y-3">
              {reports.length === 0 && <p className="text-sm hub-text-dim">No reports have been filed.</p>}
              {reports.map((r) => (
                <article key={r.id} className="rounded-xl border hub-border hub-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${r.severity === "high" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>
                      {r.severity}
                    </span>
                    <span className="text-sm font-semibold hub-text">{r.category}</span>
                    <span className="text-xs hub-text-dim">· {r.target_type}{r.target_user_name ? ` · ${r.target_user_name}` : ""}</span>
                    <span className="ml-auto text-xs hub-text-dim">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs hub-text-dim">Reported by {r.reporter_name} · status: <strong className="text-primary">{r.status.replace("_", " ")}</strong></p>
                  {r.description && <p className="mt-2 whitespace-pre-wrap text-sm hub-text">{r.description}</p>}
                  {r.resolution && <p className="mt-2 text-xs hub-text-dim">Last note: {r.resolution}</p>}
                  <Textarea
                    className="mt-3"
                    rows={2}
                    placeholder="Reason / resolution note (required)"
                    value={notes[r.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {STATUSES.filter((s) => s !== r.status).map((s) => (
                      <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => setStatus(r, s)}>
                        {s.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                </article>
              ))}
            </TabsContent>

            <TabsContent value="groups" className="space-y-3">
              {groups.map((g) => (
                <article key={g.id} className="rounded-xl border hub-border hub-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold hub-text">{g.name}</span>
                    {g.is_default && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase text-primary">default</span>}
                    <span className="text-xs hub-text-dim">· {g.privacy} · {g.status}</span>
                    <span className="ml-auto text-xs hub-text-dim">{new Date(g.created_at).toLocaleDateString()}</span>
                  </div>
                  <Textarea
                    className="mt-3"
                    rows={2}
                    placeholder="Reason for this change (required)"
                    value={notes[g.id] || ""}
                    onChange={(e) => setNotes((n) => ({ ...n, [g.id]: e.target.value }))}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["active", "frozen", "archived"].filter((s) => s !== g.status).map((s) => (
                      <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => setGroupStatus(g, s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </article>
              ))}
            </TabsContent>

            <TabsContent value="policies">
              {policies && (
                <div className="space-y-3 rounded-xl border hub-border hub-surface p-4">
                  {(Object.keys(POLICY_LABELS) as (keyof typeof POLICY_LABELS)[]).map((key) => (
                    <div key={key} className="flex items-center justify-between gap-4 border-b hub-border pb-3 last:border-0">
                      <Label htmlFor={key} className="text-sm hub-text">{POLICY_LABELS[key]}</Label>
                      <Switch id={key} checked={policies[key]} onCheckedChange={(v) => savePolicy({ [key]: v } as Partial<Policies>, POLICY_LABELS[key])} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <Label htmlFor="rate" className="text-sm hub-text">Maximum chat requests a student may send each hour</Label>
                    <input
                      id="rate"
                      type="number"
                      min={1}
                      max={100}
                      value={policies.max_requests_per_hour}
                      onChange={(e) => setPolicies({ ...policies, max_requests_per_hour: Number(e.target.value) })}
                      onBlur={(e) => savePolicy({ max_requests_per_hour: Number(e.target.value) }, "request rate limit")}
                      className="w-24 rounded-md border hub-border hub-deep px-3 py-2 text-sm hub-text"
                    />
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="audit" className="space-y-2">
              {audit.length === 0 && <p className="text-sm hub-text-dim">No administrative actions recorded yet.</p>}
              {audit.map((a) => (
                <div key={a.id} className="rounded-lg border hub-border hub-surface px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-primary">{a.action}</span>
                    <span className="hub-text">{a.target_label || a.target_type || ""}</span>
                    <span className="ml-auto text-xs hub-text-dim">{a.actor_name} · {new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="mt-1 text-xs hub-text-dim">Reason: {a.reason}{a.result ? ` · ${a.result}` : ""}</p>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </HoneycombLayout>
  );
}
