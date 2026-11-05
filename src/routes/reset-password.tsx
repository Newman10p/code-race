import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — CodeRace" },
      { name: "description", content: "Choose a new password for your CodeRace account." },
      { property: "og:title", content: "Set a new password — CodeRace" },
      { property: "og:description", content: "Choose a new password for your CodeRace account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(error.message);
    setDone(true);
    setTimeout(() => navigate({ to: "/login" }), 1500);
  };

  return (
    <HoneycombLayout>
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <GlowCard className="w-full max-w-sm">
          <h2 className="mb-4 text-center text-xl font-bold">Set a new password</h2>
          {done ? (
            <p className="text-center text-sm text-primary">Password updated. Taking you to sign in…</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="bg-background" />
              <Input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className="bg-background" />
              <Button variant="neon" size="lg" className="w-full" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Update password"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Link expired? <Link to="/forgot-password" className="text-primary hover:underline">Request a new one</Link>
              </p>
            </form>
          )}
        </GlowCard>
      </main>
    </HoneycombLayout>
  );
}
