import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { myDisplayName } from "@/lib/collab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, ShieldCheck, Hash, Lock, Globe } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/collab/groups")({
  head: () => ({
    meta: [
      { title: "Groups — Student Hub | CodeRace" },
      { name: "description", content: "Collaborate with your class group and the study groups you create — chat, share code and build together." },
      { property: "og:title", content: "Groups — Student Hub | CodeRace" },
      { property: "og:description", content: "Chat, share code and build projects with your school group." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GroupsPage,
});

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  privacy: string;
  status: string;
  is_default: boolean;
  member_count: number;
  my_role?: string;
}

const PRIVACY_ICON: Record<string, typeof Lock> = {
  invite_only: Lock,
  private: Lock,
  request_to_join: Users,
  discoverable: Globe,
};

function GroupsPage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [discover, setDiscover] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<{ allow_student_groups: boolean; freeze_group_creation: boolean } | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("invite_only");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    setLoading(true);
    const [{ data: memberships }, { data: policy }] = await Promise.all([
      supabase.from("collab_group_members").select("group_id, role").eq("user_id", user!.id),
      supabase.from("collab_settings").select("allow_student_groups, freeze_group_creation").maybeSingle(),
    ]);
    setSettings(policy ?? null);

    const ids = (memberships || []).map((m) => m.group_id);
    const { data: all } = await supabase
      .from("collab_groups")
      .select("id, name, description, privacy, status, is_default")
      .neq("status", "archived")
      .order("is_default", { ascending: false });

    const { data: counts } = await supabase.from("collab_group_members").select("group_id");
    const countBy = (id: string) => (counts || []).filter((c) => c.group_id === id).length;

    const mine: GroupRow[] = [];
    const other: GroupRow[] = [];
    for (const g of all || []) {
      const row: GroupRow = {
        ...g,
        member_count: countBy(g.id),
        my_role: (memberships || []).find((m) => m.group_id === g.id)?.role,
      };
      if (ids.includes(g.id)) mine.push(row);
      else if (g.privacy === "discoverable") other.push(row);
    }
    setGroups(mine);
    setDiscover(other);
    setLoading(false);
  };

  const create = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    const displayName = await myDisplayName(user.id, user.email);
    const { data, error } = await supabase
      .from("collab_groups")
      .insert({ name: name.trim(), description: description.trim() || null, privacy: privacy as never, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      toast.error(error?.message || "Could not create group");
      return;
    }
    await supabase.from("collab_group_members").insert({ group_id: data.id, user_id: user.id, role: "owner", display_name: displayName });
    setSaving(false);
    setOpen(false);
    setName("");
    setDescription("");
    toast.success("Group created");
    void load();
  };

  const join = async (groupId: string) => {
    if (!user) return;
    const displayName = await myDisplayName(user.id, user.email);
    const { error } = await supabase.from("collab_group_members").insert({ group_id: groupId, user_id: user.id, display_name: displayName });
    if (error) return toast.error(error.message);
    toast.success("Joined group");
    void load();
  };

  const canCreate = settings ? settings.allow_student_groups && !settings.freeze_group_creation : true;

  if (loading) return <p className="py-16 text-center text-sm hub-text-dim">Loading your groups…</p>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold hub-text">Your groups</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="neon" size="sm" disabled={!canCreate}>
              <Plus className="h-4 w-4" /> New group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a collaboration space</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="g-name">Group name</Label>
                <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Python Study Group" maxLength={60} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-desc">Description</Label>
                <Textarea id="g-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="What will this group work on?" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-priv">Privacy</Label>
                <Select value={privacy} onValueChange={setPrivacy}>
                  <SelectTrigger id="g-priv"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invite_only">Invite only</SelectItem>
                    <SelectItem value="request_to_join">Request to join</SelectItem>
                    <SelectItem value="discoverable">Discoverable</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="neon" className="w-full" onClick={create} disabled={saving || !name.trim()}>
                {saving ? "Creating…" : "Create group"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!canCreate && (
        <p className="rounded-lg border hub-border hub-surface p-3 text-sm hub-text-dim">
          Group creation is currently disabled by your school administrator.
        </p>
      )}

      {groups.length === 0 ? (
        <div className="rounded-xl border hub-border hub-surface p-10 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-primary" aria-hidden />
          <p className="mb-1 font-medium hub-text">Create your first collaboration space.</p>
          <p className="text-sm hub-text-dim">Groups are where your class chats, shares code and runs coding sprints.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const Icon = PRIVACY_ICON[g.privacy] || Hash;
            return (
              <li key={g.id}>
                <Link
                  to="/collab/g/$groupId"
                  params={{ groupId: g.id }}
                  className="block h-full rounded-xl border hub-border hub-surface p-4 transition-colors hover:hub-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <span className="truncate font-semibold hub-text">{g.name}</span>
                    </span>
                    {g.is_default && <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">School</span>}
                  </div>
                  <p className="mb-3 line-clamp-2 text-sm hub-text-dim">{g.description || "No description yet."}</p>
                  <div className="flex items-center gap-3 text-xs hub-text-dim">
                    <span>{g.member_count} member{g.member_count === 1 ? "" : "s"}</span>
                    {g.my_role && g.my_role !== "member" && (
                      <span className="flex items-center gap-1 text-primary"><ShieldCheck className="h-3 w-3" aria-hidden />{g.my_role}</span>
                    )}
                    {g.status === "frozen" && <span className="text-yellow-400">Restricted</span>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {discover.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold hub-text">Discover</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {discover.map((g) => (
              <li key={g.id} className="rounded-xl border hub-border hub-surface p-4">
                <p className="font-semibold hub-text">{g.name}</p>
                <p className="mb-3 line-clamp-2 text-sm hub-text-dim">{g.description || "No description yet."}</p>
                <Button size="sm" variant="outline" onClick={() => join(g.id)}>Join</Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}