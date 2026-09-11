"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = ["Analyze", "Discover", "Validate", "Query"];
const DURATION = 2200; // Smooth 2.2s cinematic sequence

interface LoadingScreenProps {
  onComplete: () => void;
}

const LoadingScreen = ({ onComplete }: LoadingScreenProps) => {
  const [count, setCount] = useState(0);
  const [wordIndex, setWordIndex] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    onComplete();
  }, [onComplete]);

  const animate = useCallback(
    (ts: number) => {
      if (doneRef.current) return;
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      
      const currentCount = Math.floor(progress * 100);
      setCount(currentCount);

      // Perfectly synchronize the active word with progress phases (4 words: 0-25%, 25-50%, 50-75%, 75-100%)
      const currentWordIdx = Math.min(
        Math.floor(progress * WORDS.length),
        WORDS.length - 1
      );
      setWordIndex(currentWordIdx);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(100);
        timeoutRef.current = setTimeout(finish, 280);
      }
    },
    [finish]
  );

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [animate]);

  const easing = [0.4, 0, 0.2, 1] as const;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-bg flex flex-col select-none"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    >
      {/* Top Bar: Brand & Skip Action */}
      <div className="absolute top-8 inset-x-8 md:top-12 md:inset-x-12 flex justify-between items-center z-10">
        <motion.span
          className="text-xs md:text-sm text-muted uppercase tracking-[0.3em] font-medium"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          SatQuery AI
        </motion.span>
        <button
          onClick={finish}
          className="text-xs text-muted hover:text-text-primary uppercase tracking-[0.2em] transition-all duration-200 px-3 py-1.5 rounded-full border border-stroke/50 hover:border-stroke bg-surface/60 hover:bg-surface active:scale-95 cursor-pointer"
        >
          Skip ↗
        </button>
      </div>

      {/* Center: Dynamic Stage Words */}
      <div className="flex-1 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.span
            key={wordIndex}
            className="text-5xl md:text-7xl lg:text-8xl font-display italic text-text-primary/90"
            initial={{ y: 24, opacity: 0, filter: "blur(4px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: -24, opacity: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [...easing] }}
          >
            {WORDS[wordIndex]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Bottom Right: Digital Progress Counter */}
      <motion.div
        className="absolute bottom-8 right-8 md:bottom-12 md:right-12 flex items-baseline select-none"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <span className="text-6xl md:text-8xl lg:text-9xl font-display text-text-primary tabular-nums tracking-tighter">
          {String(count).padStart(3, "0")}
        </span>
        <span className="text-xl md:text-2xl text-muted font-mono ml-2 opacity-60">
          %
        </span>
      </motion.div>

      {/* Bottom: Glowing Progress Indicator Bar */}
      <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10 overflow-hidden">
        <div
          className="h-full w-full accent-gradient"
          style={{
            transform: `scaleX(${count / 100})`,
            transformOrigin: "left",
            boxShadow: "0 0 14px rgba(137, 170, 204, 0.7)",
            transition: "transform 0.05s linear",
          }}
        />
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
