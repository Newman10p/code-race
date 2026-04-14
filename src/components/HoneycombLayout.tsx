import { cn } from "@/lib/utils";

interface HoneycombLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function HoneycombLayout({ children, className }: HoneycombLayoutProps) {
  return (
    <div className={cn("min-h-screen honeycomb-bg bg-background", className)}>
      {children}
    </div>
  );
}
