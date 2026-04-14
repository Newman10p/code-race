import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { FolderOpen, Play, HelpCircle } from "lucide-react";
import { Logo } from "@/components/Logo";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: FolderOpen },
  { label: "Launch", to: "/launch", icon: Play },
  { label: "Manual", to: "/manual", icon: HelpCircle },
];

export function Navbar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <Logo className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-foreground">
            Code<span className="text-primary">Race</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
