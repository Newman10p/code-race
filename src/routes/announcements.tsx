import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Megaphone,
  Plus,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

export const Route = createFileRoute("/announcements")({
  component: AnnouncementsPage,
});

interface Announcement {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
  setter_id: string;
}

function AnnouncementsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isSetter, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!roleLoading && !isSetter) navigate({ to: "/learn" });
  }, [roleLoading, isSetter, navigate]);

  useEffect(() => {
    if (!user || !isSetter) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isSetter]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("announcements")
      .select("*")
      .eq("setter_id", user!.id)
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  const create = async () => {
    if (!title.trim() || !body.trim() || !user) return;
    setSaving(true);
    const { error } = await (supabase as any).from("announcements").insert({
      setter_id: user.id,
      title: title.trim(),
      body: body.trim(),
      is_active: true,
    });
    setSaving(false);
    if (!error) {
      setTitle("");
      setBody("");
      setShowNew(false);
      load();
    }
  };

  const toggleActive = async (a: Announcement) => {
    await (supabase as any)
      .from("announcements")
      .update({ is_active: !a.is_active })
      .eq("id", a.id);
    load();
  };

  const remove = async (a: Announcement) => {
    if (!confirm(`Delete "${a.title}"? All dismissals for it will also be removed.`)) return;
    await (supabase as any).from("announcements").delete().eq("id", a.id);
    load();
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

  return (
    <HoneycombLayout>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Megaphone className="h-6 w-6 text-primary" /> Announcements
          </h1>
        </div>

        <GlowCard className="mb-6">
          <p className="text-sm text-muted-foreground">
            Broadcast a popup message to every signed-in user. Each person sees an
            announcement once and dismisses it with an OK button. Toggle{" "}
            <em>active</em> off to stop delivery without losing dismissal history.
          </p>
        </GlowCard>

        {!showNew ? (
          <Button variant="neon" onClick={() => setShowNew(true)} className="mb-6">
            <Plus className="h-4 w-4" /> New Announcement
          </Button>
        ) : (
          <GlowCard className="mb-6">
            <h3 className="mb-3 font-semibold">New Announcement</h3>
            <div className="space-y-3">
              <Input
                placeholder="Title (e.g. New evaluation feature live!)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-background"
              />
              <Textarea
                placeholder="Body — what changed, what to try, etc."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-32 bg-background"
              />
              <div className="flex gap-2">
                <Button
                  variant="neon"
                  onClick={create}
                  disabled={!title.trim() || !body.trim() || saving}
                >
                  {saving ? "Publishing..." : "Publish"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowNew(false);
                    setTitle("");
                    setBody("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </GlowCard>
        )}

        {items.length === 0 ? (
          <GlowCard className="py-12 text-center text-muted-foreground">
            You haven't posted any announcements yet.
          </GlowCard>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <GlowCard key={a.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      a.is_active
                        ? "bg-green-500/20 text-green-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {a.is_active ? "Live" : "Off"}
                  </span>
                </div>
                <p className="mb-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {a.body}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="neon-outline"
                    size="sm"
                    onClick={() => toggleActive(a)}
                  >
                    {a.is_active ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Turn Off
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Turn On
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(a)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </GlowCard>
            ))}
          </div>
        )}
      </main>
    </HoneycombLayout>
  );
}