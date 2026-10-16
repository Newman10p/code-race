import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRound } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile | CodeRace" },
      { name: "description", content: "Choose the username other learners see across CodeRace." },
      { property: "og:title", content: "My Profile | CodeRace" },
      { property: "og:description", content: "Set the username shown in the Hub and on leaderboards." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const [school, setSchool] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setProfile(data); setName(data.display_name || ""); }
    });
    supabase.from("organization_members").select("organizations(school_name)").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setSchool((data as any)?.organizations?.school_name ?? null));
  }, [user]);

  const windowOpen = !profile?.name_window_started_at ||
    new Date(profile.name_window_started_at).getTime() < Date.now() - 365 * 86400000;
  const used = windowOpen ? 0 : (profile?.name_changes_used ?? 0);
  const left = Math.max(0, 2 - used);

  const save = async () => {
    const clean = name.trim();
    if (clean.length < 3) return toast.error("Use at least 3 characters.");
    if (clean === (profile?.display_name || "")) return toast.info("That's already your username.");
    if (left === 0) return toast.error("You've used both name changes for this year.");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: clean }).eq("user_id", user!.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
    setProfile(data);
    toast.success("Username updated — it now shows across the Hub.");
  };

  if (loading) return <HoneycombLayout><Navbar /><p className="p-6 text-muted-foreground">Loading…</p></HoneycombLayout>;
  if (!user) return <HoneycombLayout><Navbar /><p className="p-6 text-muted-foreground">Please sign in to edit your profile.</p></HoneycombLayout>;

  return (
    <HoneycombLayout>
      <Navbar />
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><UserRound className="h-6 w-6 text-primary" />My profile</h1>
        <GlowCard className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Username shown to others</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. farid_codes" maxLength={32} />
            <p className="mt-1 text-xs text-muted-foreground">
              {left === 2 ? "You can change this twice this year." : left === 1 ? "You have 1 name change left this year." : "No name changes left this year."}
            </p>
          </div>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email || user.email}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">School</p>
              <p className="font-medium">{school || "Not linked to a school"}</p>
            </div>
          </div>
          <Button onClick={save} disabled={busy || left === 0}>Save username</Button>
        </GlowCard>
      </div>
    </HoneycombLayout>
  );
}
