'use client'

import { motion, type Variants } from 'framer-motion'

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay, ease: 'easeOut' },
  }),
}

interface AnimateProps {
  children: React.ReactNode
  delay?: number
  className?: string
}

/** Fades up on mount — use in hero sections */
export function FadeUp({ children, delay = 0, className }: AnimateProps) {
  return (
    <motion.div
      className={className}
      variants={fadeUpVariants}
      initial="hidden"
      animate="visible"
      custom={delay}
    >
      {children}
    </motion.div>
  )
}

/** Fades up when scrolled into view — use for cards and sections */
export function ScrollReveal({ children, delay = 0, className }: AnimateProps) {
  return (
    <motion.div
      className={className}
      variants={fadeUpVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-60px' }}
      custom={delay}
    >
      {children}
    </motion.div>
  )
}

/** Fades in when scrolled into view — subtle, for text blocks */
export function FadeReveal({ children, delay = 0, className }: AnimateProps) {
  return (
    <motion.div
      className={className}
      variants={fadeInVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      custom={delay}
    >
      {children}
    </motion.div>
  )
}
