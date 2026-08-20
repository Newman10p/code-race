export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  return <img src="/logo.svg" alt="CodeRace Logo" className={className} />;
}
