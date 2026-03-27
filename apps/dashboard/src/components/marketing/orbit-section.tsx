'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const TAU = 2 * Math.PI

const STEPS = [
  {
    step: '01',
    title: 'Train',
    subtitle: 'Feed your content',
    desc: 'Upload URLs, PDFs, and docs. Your agent learns everything about your product in minutes.',
    primary: '#ec732e',
    secondary: '#f8c490',
    dim: 'rgba(236,115,46,0.13)',
    outerBright: [0, 4, 9, 14, 20],
    midBright: [1, 4, 9],
    innerBright: [2, 6],
  },
  {
    step: '02',
    title: 'Deploy',
    subtitle: 'Go live everywhere',
    desc: 'One agent, seven platforms. Slack, WhatsApp, your website — all live from one dashboard.',
    primary: '#15A4AE',
    secondary: '#6fa8e0',
    dim: 'rgba(56,115,187,0.13)',
    outerBright: [2, 6, 11, 16, 22],
    midBright: [0, 3, 7],
    innerBright: [0, 4],
  },
  {
    step: '03',
    title: 'Convert',
    subtitle: 'Capture & close',
    desc: 'Collect leads, answer objections, and close deals 24/7 — even while you sleep.',
    primary: '#15A4AE',
    secondary: '#9de0d2',
    dim: 'rgba(97,194,173,0.13)',
    outerBright: [1, 5, 10, 15, 21],
    midBright: [2, 5, 10],
    innerBright: [1, 5],
  },
]

type StepData = (typeof STEPS)[number]

function HudGraphic({ s, active }: { s: StepData; active: boolean }) {
  const cx = 150, cy = 150
  const gradId = `hud-grad-${s.step}`

  // Ring 1 — outer thin, 24 segments
  const r1 = 116, sw1 = 3, count1 = 24
  const C1 = TAU * r1, pitch1 = C1 / count1, seg1 = pitch1 * 0.76

  // Ring 2 — mid thick, 12 segments
  const r2 = 96, sw2 = 13, count2 = 12
  const C2 = TAU * r2, pitch2 = C2 / count2, seg2 = pitch2 * 0.80

  // Ring 3 — inner medium, 8 segments
  const r3 = 74, sw3 = 5, count3 = 8
  const C3 = TAU * r3, pitch3 = C3 / count3, seg3 = pitch3 * 0.72

  return (
    <svg viewBox="0 0 300 300" className="w-full h-full">
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={s.primary} stopOpacity={0.5} />
          <stop offset="100%" stopColor={s.primary} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Tick marks — static */}
      {Array.from({ length: 60 }).map((_, i) => {
        const a = (i / 60) * TAU - Math.PI / 2
        const long = i % 5 === 0
        const r0 = long ? 127 : 130
        return (
          <line
            key={i}
            x1={cx + r0 * Math.cos(a)} y1={cy + r0 * Math.sin(a)}
            x2={cx + 134 * Math.cos(a)} y2={cy + 134 * Math.sin(a)}
            stroke={long ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}
            strokeWidth={long ? 1.5 : 0.5}
          />
        )
      })}

      {/* Outer border circle — static */}
      <circle cx={cx} cy={cy} r={126} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={1} />

      {/* ── Ring 1: slow clockwise ── */}
      <motion.g
        animate={active ? { rotate: 360 } : {}}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        {/* All segments — dim */}
        <circle
          cx={cx} cy={cy} r={r1} fill="none" stroke={s.dim} strokeWidth={sw1}
          strokeDasharray={`${seg1} ${pitch1 - seg1}`}
        />
        {/* Bright highlight segments */}
        {s.outerBright.map((idx) => (
          <motion.circle
            key={idx}
            cx={cx} cy={cy} r={r1} fill="none"
            stroke={s.primary} strokeWidth={sw1} strokeLinecap="round"
            strokeDasharray={`${seg1} ${C1 - seg1}`}
            strokeDashoffset={-(idx * pitch1)}
            initial={{ opacity: 0 }}
            animate={active ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.1 + idx * 0.04, duration: 0.6 }}
          />
        ))}
      </motion.g>

      {/* ── Ring 2: counter-clockwise ── */}
      <motion.g
        animate={active ? { rotate: -360 } : {}}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle
          cx={cx} cy={cy} r={r2} fill="none" stroke={s.dim} strokeWidth={sw2}
          strokeDasharray={`${seg2} ${pitch2 - seg2}`}
        />
        {s.midBright.map((idx) => (
          <motion.circle
            key={idx}
            cx={cx} cy={cy} r={r2} fill="none"
            stroke={s.secondary} strokeWidth={sw2} strokeLinecap="butt"
            strokeDasharray={`${seg2} ${C2 - seg2}`}
            strokeDashoffset={-(idx * pitch2)}
            initial={{ opacity: 0 }}
            animate={active ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.3 + idx * 0.06, duration: 0.6 }}
          />
        ))}
      </motion.g>

      {/* ── Ring 3: clockwise medium ── */}
      <motion.g
        animate={active ? { rotate: 360 } : {}}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle
          cx={cx} cy={cy} r={r3} fill="none" stroke={s.dim} strokeWidth={sw3}
          strokeDasharray={`${seg3} ${pitch3 - seg3}`}
        />
        {s.innerBright.map((idx) => (
          <motion.circle
            key={idx}
            cx={cx} cy={cy} r={r3} fill="none"
            stroke={s.primary} strokeWidth={sw3} strokeLinecap="round"
            strokeDasharray={`${seg3} ${C3 - seg3}`}
            strokeDashoffset={-(idx * pitch3)}
            initial={{ opacity: 0 }}
            animate={active ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.5 + idx * 0.08, duration: 0.6 }}
          />
        ))}
      </motion.g>

      {/* Inner separator ring */}
      <circle cx={cx} cy={cy} r={58} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

      {/* Two overlapping inner circles */}
      <motion.circle
        cx={cx - 12} cy={cy} r={33} fill="none"
        stroke="rgba(255,255,255,0.18)" strokeWidth={1.5}
        initial={{ opacity: 0, scale: 0 }}
        animate={active ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: `${cx - 12}px ${cy}px` }}
      />
      <motion.circle
        cx={cx + 12} cy={cy} r={33} fill="none"
        stroke="rgba(255,255,255,0.18)" strokeWidth={1.5}
        initial={{ opacity: 0, scale: 0 }}
        animate={active ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.68, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: `${cx + 12}px ${cy}px` }}
      />

      {/* Radial glow */}
      <motion.circle
        cx={cx} cy={cy} r={18}
        fill={`url(#${gradId})`}
        animate={active ? { r: [15, 22, 15], opacity: [0.7, 1, 0.7] } : {}}
        transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
      />

      {/* Center orb — pulsing */}
      <motion.circle
        cx={cx} cy={cy} r={9} fill={s.primary}
        animate={active ? { r: [8, 11, 8] } : {}}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
      <circle cx={cx} cy={cy} r={3.5} fill="white" opacity={0.95} />
    </svg>
  )
}

export function OrbitSection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-24 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">

        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <p className="text-xs text-brand-400 uppercase tracking-widest font-semibold mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">Up and running in minutes</h2>
          <p className="text-white/65 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
            From zero to a fully deployed AI agent — no engineers, no complexity.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-6">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.18, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center"
            >
              {/* Circle graphic */}
              <div className="w-56 h-56 mb-8">
                <HudGraphic s={s} active={isInView} />
              </div>

              {/* Step label */}
              <span
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: s.primary }}
              >
                Step {s.step}
              </span>

              <h3 className="text-2xl font-bold text-white mb-1">{s.title}</h3>
              <p className="text-sm font-medium text-white/65 mb-3">{s.subtitle}</p>
              <p className="text-sm text-white/60 leading-relaxed max-w-xs">{s.desc}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
