import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function GlowCard({ children, className, onClick }: GlowCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl bg-card p-6 glow-card",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
