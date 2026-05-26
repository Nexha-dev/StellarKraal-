"use client";
import { motion, useReducedMotion } from "framer-motion";
import { pageVariants } from "@/lib/animations";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <motion.div initial="hidden" animate="visible" variants={pageVariants}>
      {children}
    </motion.div>
  );
}
