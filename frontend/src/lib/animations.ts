import type { Variants } from "framer-motion";

/** Fade + slight upward slide — used for page transitions */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

/** Subtle scale pulse — used on form submit button while loading */
export const submitVariants: Variants = {
  idle: { scale: 1 },
  loading: { scale: [1, 0.97, 1], transition: { repeat: Infinity, duration: 0.8, ease: "easeInOut" } },
};

/** Fade-in for status badge changes */
export const badgeVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.15, ease: "easeOut" } },
};
