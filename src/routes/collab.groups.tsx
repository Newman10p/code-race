import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
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
  const { theme } = useTheme();
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [discover, setDiscover] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<{ allow_student_groups: boolean; freeze_group_creation: boolean } | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState("invite_only");
  const [saving, setSaving] = useState(false);

  // Theme-based color utilities
  const themeColors = {
    cyan:   { from: "from-cyan-500", to: "to-blue-500", bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", darkBg: "dark:bg-cyan-900/20", darkBorder: "dark:border-cyan-800", darkText: "dark:text-cyan-300", iconBg: "from-cyan-100 to-blue-100", darkIconBg: "dark:from-cyan-900/30 dark:to-blue-900/30" },
    blue:   { from: "from-blue-500", to: "to-indigo-500", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", darkBg: "dark:bg-blue-900/20", darkBorder: "dark:border-blue-800", darkText: "dark:text-blue-300", iconBg: "from-blue-100 to-indigo-100", darkIconBg: "dark:from-blue-900/30 dark:to-indigo-900/30" },
    red:    { from: "from-red-500", to: "to-rose-500", bg: "bg-red-50", border: "border-red-200", text: "text-red-700", darkBg: "dark:bg-red-900/20", darkBorder: "dark:border-red-800", darkText: "dark:text-red-300", iconBg: "from-red-100 to-rose-100", darkIconBg: "dark:from-red-900/30 dark:to-rose-900/30" },
    purple: { from: "from-purple-500", to: "to-violet-500", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700", darkBg: "dark:bg-purple-900/20", darkBorder: "dark:border-purple-800", darkText: "dark:text-purple-300", iconBg: "from-purple-100 to-violet-100", darkIconBg: "dark:from-purple-900/30 dark:to-violet-900/30" },
    yellow: { from: "from-yellow-500", to: "to-amber-500", bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", darkBg: "dark:bg-yellow-900/20", darkBorder: "dark:border-yellow-800", darkText: "dark:text-yellow-300", iconBg: "from-yellow-100 to-amber-100", darkIconBg: "dark:from-yellow-900/30 dark:to-amber-900/30" },
  };
  const colors = themeColors[theme];

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

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className={`animate-pulse ${colors.text} dark:${colors.darkText}`}>Loading your groups...</div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Your Groups</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button 
              className={`bg-gradient-to-r ${colors.from} ${colors.to} hover:opacity-90 text-white shadow-lg transition-all duration-200`} 
              size="sm" 
              disabled={!canCreate}
            >
              <Plus className="h-4 w-4 mr-1" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className={`text-xl font-bold bg-gradient-to-r ${colors.from} ${colors.to} bg-clip-text text-transparent`}>
                Create Collaboration Space
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="g-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Group Name</Label>
                <Input 
                  id="g-name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., Python Study Group" 
                  maxLength={60}
                  className={`focus:${colors.border.replace('border', 'border')} focus:ring-${theme}-500`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-desc" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</Label>
                <Textarea 
                  id="g-desc" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  maxLength={300} 
                  placeholder="What will this group work on?"
                  className={`focus:${colors.border.replace('border', 'border')} focus:ring-${theme}-500`}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-priv" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Privacy</Label>
                <Select value={privacy} onValueChange={setPrivacy}>
                  <SelectTrigger id="g-priv">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invite_only">🔒 Invite Only</SelectItem>
                    <SelectItem value="request_to_join">👥 Request to Join</SelectItem>
                    <SelectItem value="discoverable">🌍 Discoverable</SelectItem>
                    <SelectItem value="private">🔐 Private</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className={`w-full bg-gradient-to-r ${colors.from} ${colors.to} hover:opacity-90 text-white shadow-lg`} 
                onClick={create} 
                disabled={saving || !name.trim()}
              >
                {saving ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span> Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" /> Create Group
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!canCreate && (
        <div className={`rounded-xl border ${colors.border} ${colors.bg} ${colors.darkBg} ${colors.darkBorder} p-4`}>
          <p className={`text-sm ${colors.text} ${colors.darkText}`}>
            ⚠️ Group creation is currently disabled by your school administrator.
          </p>
        </div>
      )}

      {groups.length === 0 ? (
        <div className={`rounded-2xl border ${colors.border} bg-white dark:bg-slate-800 p-12 text-center shadow-sm`}>
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${colors.iconBg} ${colors.darkIconBg}`}>
            <Users className={`h-8 w-8 ${colors.text} dark:${colors.darkText}`} aria-hidden />
          </div>
          <p className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Create Your First Group</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Groups are where your class chats, shares code, and runs coding sprints together.
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const Icon = PRIVACY_ICON[g.privacy] || Hash;
            return (
              <li key={g.id}>
                <Link
                  to="/collab/g/$groupId"
                  params={{ groupId: g.id }}
                  className={`group block h-full rounded-2xl border ${colors.border} bg-white dark:bg-slate-800 p-5 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 hover:border-${theme}-400 dark:hover:border-${theme}-600`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${colors.iconBg} ${colors.darkIconBg}`}>
                        <Icon className={`h-4 w-4 shrink-0 ${colors.text} dark:${colors.darkText}`} aria-hidden />
                      </div>
                      <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{g.name}</span>
                    </div>
                    {g.is_default && (
                      <span className={`rounded-full bg-gradient-to-r ${colors.from} ${colors.to} px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm`}>
                        School
                      </span>
                    )}
                  </div>
                  <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                    {g.description || "No description yet."}
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      {g.member_count} member{g.member_count === 1 ? "" : "s"}
                    </span>
                    {g.my_role && g.my_role !== "member" && (
                      <span className={`flex items-center gap-1 rounded-full ${colors.bg} ${colors.darkBg} ${colors.text} ${colors.darkText} px-2 py-0.5`}>
                        <ShieldCheck className="h-3 w-3" />
                        {g.my_role}
                      </span>
                    )}
                    {g.status === "frozen" && (
                      <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                        🔒 Restricted
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {discover.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">Discover Groups</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discover.map((g) => (
              <li key={g.id} className={`rounded-2xl border ${colors.border} bg-white dark:bg-slate-800 p-5 shadow-sm`}>
                <p className="font-semibold text-slate-800 dark:text-slate-100 mb-2">{g.name}</p>
                <p className="mb-4 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
                  {g.description || "No description yet."}
                </p>
                <Button 
                  size="sm" 
                  onClick={() => join(g.id)}
                  className={`w-full bg-gradient-to-r ${colors.from} ${colors.to} hover:opacity-90 text-white shadow-md`}
                >
                  Join Group
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}