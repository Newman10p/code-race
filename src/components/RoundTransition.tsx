import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

interface RoundTransitionProps {
  show: boolean;
  roundNumber: number;
  roundName?: string;
}

export function RoundTransition({ show, roundNumber, roundName }: RoundTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ x: "-100vw", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100vw", opacity: 0 }}
            transition={{ type: "spring", stiffness: 80, damping: 18 }}
            className="text-center"
          >
            <Trophy className="mx-auto mb-4 h-20 w-20 text-primary animate-pulse-glow" />
            <p className="text-sm font-bold uppercase tracking-[0.4em] text-muted-foreground">
              Round {roundNumber}
            </p>
            <h1 className="mt-2 text-6xl font-black tracking-tight text-primary sm:text-7xl">
              {roundName || "BEGIN"}
            </h1>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mx-auto mt-6 h-1 w-64 origin-left bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
