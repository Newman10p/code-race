import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — CodeRace" },
      { name: "description", content: "Reset your CodeRace account password by email." },
      { property: "og:title", content: "Forgot password — CodeRace" },
      { property: "og:description", content: "Reset your CodeRace account password by email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <HoneycombLayout>
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <GlowCard className="w-full max-w-sm">
          <h2 className="mb-2 text-center text-xl font-bold">Forgot password</h2>
          {sent ? (
            <p className="text-center text-sm text-muted-foreground">
              If an account exists for <span className="text-primary">{email}</span>, a reset link is on its way. Check your inbox (and spam).
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <p className="text-center text-xs text-muted-foreground">Enter your email and we'll send you a reset link.</p>
              {error && <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="bg-background" />
              <Button variant="neon" size="lg" className="w-full" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>
          )}
        </GlowCard>
        <Link to="/login" className="mt-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </main>
    </HoneycombLayout>
  );
}
