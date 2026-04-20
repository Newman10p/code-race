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
import { useTheme, THEME_OPTIONS } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BookOpen, Plus, Trash2, Upload, Check, Palette, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

interface FlashSet {
  id: string;
  title: string;
  subject: string | null;
  is_public: boolean;
  card_count: number;
}

function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isSetter, roles, loading: roleLoading } = useUserRole();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [sets, setSets] = useState<FlashSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || roleLoading) return;
    loadSets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleLoading]);

  const loadSets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("flashcard_sets")
      .select("id, title, subject, is_public")
      .eq("setter_id", user!.id)
      .order("created_at", { ascending: false });
    const enriched = await Promise.all(
      (data || []).map(async (s) => {
        const { count } = await supabase
          .from("flashcards")
          .select("*", { count: "exact", head: true })
          .eq("set_id", s.id);
        return { ...s, card_count: count || 0 };
      })
    );
    setSets(enriched);
    setLoading(false);
  };

  const becomeSetter = async () => {
    if (!user) return;
    await supabase.from("user_roles").insert({ user_id: user.id, role: "setter" });
    window.location.reload();
  };

  const parseBulk = (text: string) => {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        // Accept TSV (tab) or pipe or " - " or comma (first occurrence)
        const sep = line.includes("\t") ? "\t" : line.includes("|") ? "|" : line.includes(" - ") ? " - " : ",";
        const idx = line.indexOf(sep);
        if (idx < 0) return null;
        const front = line.slice(0, idx).trim();
        const back = line.slice(idx + sep.length).trim();
        if (!front || !back) return null;
        return { front, back };
      })
      .filter((c): c is { front: string; back: string } => c !== null);
  };

  const createSet = async () => {
    if (!newTitle.trim() || !user) return;
    setCreating(true);
    const { data: set, error } = await supabase
      .from("flashcard_sets")
      .insert({
        setter_id: user.id,
        title: newTitle.trim(),
        description: newDescription.trim(),
        subject: newSubject.trim(),
        is_public: true,
      })
      .select("id")
      .single();
    if (error || !set) {
      alert(error?.message || "Failed");
      setCreating(false);
      return;
    }
    const cards = parseBulk(bulkText);
    if (cards.length > 0) {
      await supabase
        .from("flashcards")
        .insert(cards.map((c, i) => ({ set_id: set.id, front: c.front, back: c.back, order_index: i })));
    }
    setNewTitle("");
    setNewSubject("");
    setNewDescription("");
    setBulkText("");
    setShowNew(false);
    setCreating(false);
    loadSets();
  };

  const deleteSet = async (id: string) => {
    if (!confirm("Delete this flashcard set?")) return;
    await supabase.from("flashcard_sets").delete().eq("id", id);
    loadSets();
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
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Link
          to={isSetter ? "/dashboard" : "/learn"}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mb-1 text-3xl font-bold tracking-tight">
          <span className="text-primary">Settings</span>
        </h1>
        <p className="mb-8 text-muted-foreground">Customize your experience.</p>

        {/* Theme picker */}
        <GlowCard className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Theme Color</h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Choose your accent color. The honeycomb glow follows your mouse.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`group relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition ${
                  theme === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div
                  className="h-10 w-10 rounded-full"
                  style={{ background: opt.preview, boxShadow: `0 0 20px ${opt.preview}` }}
                />
                <span className="text-xs font-medium">{opt.label}</span>
                {theme === opt.value && (
                  <div className="absolute right-1.5 top-1.5 rounded-full bg-primary p-0.5 text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </GlowCard>

        {/* Setter promotion */}
        {!isSetter && (
          <GlowCard className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Become a Setter</h2>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Setters can create quizzes, run live tournaments, and post flashcards for learners.
            </p>
            <Button variant="neon" onClick={becomeSetter}>
              Enable Setter Mode
            </Button>
          </GlowCard>
        )}

        {/* Flashcard manager (setters only) */}
        {isSetter && (
          <GlowCard>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Flashcard Sets</h2>
              </div>
              <Button variant="neon" size="sm" onClick={() => setShowNew(!showNew)}>
                <Plus className="h-4 w-4" /> New Set
              </Button>
            </div>

            {showNew && (
              <div className="mb-6 space-y-3 rounded-lg border border-border bg-background/50 p-4">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Set title (e.g. Python Basics)"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Subject (optional)"
                  />
                  <Input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Description (optional)"
                  />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Upload className="h-4 w-4" /> Bulk import cards
                  </label>
                  <Textarea
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`Paste one card per line. Format:\nfront, back\nor: front | back\nor: front\\tback (TSV)\n\nExample:\nWhat does CPU stand for?, Central Processing Unit\nRAM | Random Access Memory`}
                    className="min-h-[160px] font-mono text-xs"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {parseBulk(bulkText).length} card(s) detected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="neon" onClick={createSet} disabled={creating || !newTitle.trim()}>
                    {creating ? "Creating..." : "Create Set"}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowNew(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {sets.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No flashcard sets yet. Create one to share with learners.
              </p>
            ) : (
              <div className="space-y-2">
                {sets.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-background/50 p-3"
                  >
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.card_count} cards{s.subject ? ` • ${s.subject}` : ""}{" "}
                        {s.is_public ? "• Public" : "• Private"}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteSet(s.id)}
                      className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlowCard>
        )}
      </main>
    </HoneycombLayout>
  );
}
