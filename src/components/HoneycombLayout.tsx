import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

interface HoneycombLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function HoneycombLayout({ children, className }: HoneycombLayoutProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
        el.style.setProperty("--my", `${e.clientY - rect.top}px`);
      });
    };
    el.addEventListener("mousemove", handleMove);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn("min-h-screen honeycomb-bg honeycomb-trail bg-background", className)}
    >
      {children}
    </div>
  );
}
