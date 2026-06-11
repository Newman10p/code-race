import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <HoneycombLayout>
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="mb-8 flex items-center gap-2">
          <Logo className="h-12 w-12" />
          <span className="text-3xl font-bold tracking-tight">
            Code<span className="text-primary">Race</span>
          </span>
        </div>

        <GlowCard className="w-full max-w-sm">
          <h2 className="mb-2 text-center text-xl font-bold">Sign In</h2>
          <p className="mb-6 text-center text-xs text-muted-foreground">
            Setters land on the dashboard, learners on the study hub — we route you automatically.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-background"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted-foreground">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-background"
                required
              />
            </div>
            <Button variant="neon" size="lg" className="w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline">Register</Link>
          </p>
        </GlowCard>

        <Link to="/" className="mt-6 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </main>
    </HoneycombLayout>
  );
}
