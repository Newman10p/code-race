import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { HoneycombLayout } from "@/components/HoneycombLayout";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { Users, MessageCircle, Inbox, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/collab")({
  component: CollabLayout,
});

const TABS = [
  { to: "/collab/groups", label: "Groups", icon: Users },
  { to: "/collab/direct", label: "Direct", icon: MessageCircle },
  { to: "/collab/requests", label: "Requests", icon: Inbox },
  { to: "/collab/settings", label: "Settings", icon: SlidersHorizontal },
];

function CollabLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  return (
    <HoneycombLayout>
      <Navbar />
      <div className="hub-bg min-h-[calc(100vh-3.5rem)]">
        <div className="mx-auto max-w-7xl px-4">
          <header className="flex flex-col gap-2 py-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight hub-text">
                Student <span className="text-primary">Hub</span>
              </h1>
              <p className="text-sm hub-text-dim">Talk · Build · Challenge · Connect</p>
            </div>
          </header>

          <nav aria-label="Collaboration sections" className="flex gap-1 overflow-x-auto border-b hub-border pb-2">
            {TABS.map((t) => {
              const active = pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary/15 text-primary" : "hub-text-dim hover:bg-white/5 hover:text-white",
                  )}
                >
                  <t.icon className="h-4 w-4" aria-hidden />
                  {t.label}
                </Link>
              );
            })}
          </nav>

          <div className="py-6">
            <Outlet />
          </div>
        </div>
      </div>
    </HoneycombLayout>
  );
}