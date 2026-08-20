import { cn } from "@/lib/utils";

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  id?: string;
}

export function GlowCard({ children, className, onClick, id }: GlowCardProps) {
  return (
    <div
      id={id}
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
