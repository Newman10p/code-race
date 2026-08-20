import { motion, AnimatePresence } from "framer-motion";
import { Zap, AlertTriangle, Ban, Trophy } from "lucide-react";

export interface LeaderEntry {
  id: string;
  student_name: string;
  current_score: number;
  is_flagged?: boolean;
  is_disqualified?: boolean;
  tab_switch_count?: number;
  strike_count?: number;
}

interface AnimatedLeaderboardProps {
  entries: LeaderEntry[];
  /** 1-based cutoff position. Players at rank > cutoffRank are in danger. */
  cutoffRank?: number | null;
  highlightId?: string;
  showCutoffLine?: boolean;
}

export function AnimatedLeaderboard({
  entries,
  cutoffRank,
  highlightId,
  showCutoffLine = false,
}: AnimatedLeaderboardProps) {
  const active = entries.filter((e) => !e.is_disqualified);
  const dq = entries.filter((e) => e.is_disqualified);

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {active.map((p, i) => {
          const rank = i + 1;
          const isCutoff =
            showCutoffLine && cutoffRank != null && rank === cutoffRank;
          const inDanger =
            showCutoffLine && cutoffRank != null && rank > cutoffRank;
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            >
              <div
                className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                  highlightId === p.id
                    ? "border-primary/60 bg-primary/10"
                    : rank === 1
                      ? "border-primary/40 bg-primary/5"
                      : inDanger
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      rank === 1
                        ? "bg-primary text-primary-foreground"
                        : inDanger
                          ? "bg-destructive/20 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {rank}
                  </span>
                  <span className="font-medium">
                    {p.student_name}
                    {highlightId === p.id ? " (You)" : ""}
                  </span>
                  {p.is_flagged && (
                    <span title={`Tab switches: ${p.tab_switch_count ?? 0}`}>
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 font-mono text-sm font-bold text-primary">
                  <Zap className="h-3 w-3" />
                  {p.current_score}
                </div>
              </div>

              {isCutoff && (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="my-2 flex items-center gap-2 px-1"
                >
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-destructive to-transparent" />
                  <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                    Cutoff Line
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-destructive to-transparent" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {dq.length > 0 && (
        <div className="mt-4 space-y-1 border-t border-border pt-3">
          <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Ban className="h-3 w-3" /> Disqualified
          </p>
          {dq.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm opacity-70"
            >
              <span className="font-medium line-through">{p.student_name}</span>
              <Ban className="h-3 w-3 text-destructive" />
            </div>
          ))}
        </div>
      )}

      {active.length === 0 && dq.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          <Trophy className="mx-auto mb-2 h-6 w-6 opacity-30" />
          No players yet
        </p>
      )}
    </div>
  );
}
