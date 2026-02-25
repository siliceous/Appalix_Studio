'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

const TAU = 2 * Math.PI

const MESSAGES = [
  { role: 'user' as const, text: 'Draft our Q3 content calendar across all channels' },
  { role: 'ai'   as const, text: 'Done — 12 campaigns mapped with themes, dates, and briefs for email, social, and blog. Ready to share with the team?' },
  { role: 'user' as const, text: 'Prepare the Henderson pitch deck talking points' },
  { role: 'ai'   as const, text: 'Ready. Executive summary, ROI breakdown, and pricing options tailored to their sector — all in under 60 seconds.' },
  { role: 'user' as const, text: 'Write up the API docs for the endpoints we shipped today' },
  { role: 'ai'   as const, text: 'Technical docs complete — endpoints, parameters, and examples formatted and ready to publish.' },
]

const SHIFTS = [
  { role: 'Marketing',   shift: 'Produces 5× the content' },
  { role: 'Sales',       shift: 'Prepares faster proposals' },
  { role: 'Developers',  shift: 'Ships faster documentation' },
  { role: 'Managers',    shift: 'Gets instant analysis' },
]

const METRICS = [
  { value: '5×',    label: 'more content per marketer' },
  { value: '60%',   label: 'faster document drafting' },
  { value: '3 hrs', label: 'saved per person / day' },
]

// ── Orbit graphic — teal theme ───────────────────────────────────

function OrbitGraphic({ active }: { active: boolean }) {
  const cx = 150, cy = 150
  const primary   = 'rgba(97,194,173,0.55)'
  const secondary = 'rgba(157,224,210,0.4)'
  const dim       = 'rgba(97,194,173,0.07)'

  const r1 = 116, sw1 = 1, count1 = 24
  const C1 = TAU * r1, pitch1 = C1 / count1, seg1 = pitch1 * 0.76
  const outerBright = [4, 9, 14, 19, 0]

  const r2 = 96, sw2 = 2
  const C2 = TAU * r2, pitch2 = C2 / 12, seg2 = pitch2 * 0.80
  const midBright = [3, 7, 11]

  const r3 = 74, sw3 = 1.5
  const C3 = TAU * r3, pitch3 = C3 / 8, seg3 = pitch3 * 0.72
  const innerBright = [3, 7]

  return (
    <svg viewBox="0 0 300 300" className="w-full h-full">
      <defs>
        <radialGradient id="prod-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={primary} stopOpacity={0.5} />
          <stop offset="100%" stopColor={primary} stopOpacity={0} />
        </radialGradient>
      </defs>

      {Array.from({ length: 60 }).map((_, i) => {
        const a = (i / 60) * TAU - Math.PI / 2
        const long = i % 5 === 0
        return (
          <line key={i}
            x1={cx + (long ? 127 : 130) * Math.cos(a)}
            y1={cy + (long ? 127 : 130) * Math.sin(a)}
            x2={cx + 134 * Math.cos(a)}
            y2={cy + 134 * Math.sin(a)}
            stroke={long ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}
            strokeWidth={long ? 1 : 0.5}
          />
        )
      })}

      <circle cx={cx} cy={cy} r={126} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />

      <motion.g
        animate={active ? { rotate: 360 } : {}}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle cx={cx} cy={cy} r={r1} fill="none" stroke={dim} strokeWidth={sw1}
          strokeDasharray={`${seg1} ${pitch1 - seg1}`} />
        {outerBright.map((idx) => (
          <motion.circle key={idx} cx={cx} cy={cy} r={r1} fill="none"
            stroke={primary} strokeWidth={sw1} strokeLinecap="round"
            strokeDasharray={`${seg1} ${C1 - seg1}`}
            strokeDashoffset={-(idx * pitch1)}
            initial={{ opacity: 0 }}
            animate={active ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.1 + idx * 0.04, duration: 0.6 }}
          />
        ))}
      </motion.g>

      <motion.g
        animate={active ? { rotate: -360 } : {}}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle cx={cx} cy={cy} r={r2} fill="none" stroke={dim} strokeWidth={sw2}
          strokeDasharray={`${seg2} ${pitch2 - seg2}`} />
        {midBright.map((idx) => (
          <motion.circle key={idx} cx={cx} cy={cy} r={r2} fill="none"
            stroke={secondary} strokeWidth={sw2} strokeLinecap="butt"
            strokeDasharray={`${seg2} ${C2 - seg2}`}
            strokeDashoffset={-(idx * pitch2)}
            initial={{ opacity: 0 }}
            animate={active ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.3 + idx * 0.06, duration: 0.6 }}
          />
        ))}
      </motion.g>

      <motion.g
        animate={active ? { rotate: 360 } : {}}
        transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle cx={cx} cy={cy} r={r3} fill="none" stroke={dim} strokeWidth={sw3}
          strokeDasharray={`${seg3} ${pitch3 - seg3}`} />
        {innerBright.map((idx) => (
          <motion.circle key={idx} cx={cx} cy={cy} r={r3} fill="none"
            stroke={primary} strokeWidth={sw3} strokeLinecap="round"
            strokeDasharray={`${seg3} ${C3 - seg3}`}
            strokeDashoffset={-(idx * pitch3)}
            initial={{ opacity: 0 }}
            animate={active ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.5 + idx * 0.08, duration: 0.6 }}
          />
        ))}
      </motion.g>

      <circle cx={cx} cy={cy} r={58} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />

      <motion.circle cx={cx - 12} cy={cy} r={33} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={1}
        initial={{ opacity: 0, scale: 0 }}
        animate={active ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.6, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: `${cx - 12}px ${cy}px` }}
      />
      <motion.circle cx={cx + 12} cy={cy} r={33} fill="none"
        stroke="rgba(255,255,255,0.08)" strokeWidth={1}
        initial={{ opacity: 0, scale: 0 }}
        animate={active ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 0.68, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: `${cx + 12}px ${cy}px` }}
      />

      <motion.circle cx={cx} cy={cy} r={18} fill="url(#prod-glow)"
        animate={active ? { r: [14, 19, 14], opacity: [0.3, 0.5, 0.3] } : {}}
        transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
      />
      <motion.circle cx={cx} cy={cy} r={6} fill="rgba(97,194,173,0.7)"
        animate={active ? { r: [5, 7, 5] } : {}}
        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
      />
      <circle cx={cx} cy={cy} r={2.5} fill="white" opacity={0.8} />
    </svg>
  )
}

// ── Section ──────────────────────────────────────────────────────

export function ProductivitySection() {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="py-24 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-20 items-center">

          {/* ── Left: orbit graphic + chips overlaid ── */}
          <motion.div
            className="lg:col-span-1 order-1 lg:order-1 relative"
            style={{ minHeight: '420px' }}
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.15, duration: 0.9 }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] lg:w-[540px] aspect-square pointer-events-none">
              <OrbitGraphic active={isInView} />
            </div>

            <div className="absolute inset-0 flex flex-col justify-center gap-2.5 px-4">
              {MESSAGES.map((msg, i) => (
                <motion.div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.5 + i * 0.13, duration: 0.4, ease: 'easeOut' }}
                >
                  <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed backdrop-blur-sm ${
                    msg.role === 'user'
                      ? 'bg-white/[0.12] border border-white/15 text-gray-100 rounded-br-sm'
                      : 'bg-[#61c2ad]/[0.12] border border-[#61c2ad]/25 text-[#61c2ad] rounded-bl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* ── Right: text + shifts + metrics ── */}
          <div className="lg:col-span-2 order-2 lg:order-2 text-right">

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block text-xs px-3 py-1 rounded-full bg-[#61c2ad]/10 border border-[#61c2ad]/20 text-[#61c2ad] font-semibold uppercase tracking-widest mb-5">
                Productivity lift
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                AI doesn&apos;t replace teams —<br className="hidden sm:block" /> it increases output per person
              </h2>
              <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-2xl ml-auto">
                Every role in your business produces more without adding headcount — content, proposals, documentation, and analysis delivered in seconds instead of hours.
              </p>
            </motion.div>

            {/* Example shifts grid */}
            <motion.div
              className="grid grid-cols-2 gap-3 mb-8"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              {SHIFTS.map((s, i) => (
                <motion.div
                  key={s.role}
                  className="p-4 rounded-xl bg-white/[0.04] border border-white/10 text-right"
                  initial={{ opacity: 0, y: 10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.35 + i * 0.07, duration: 0.4 }}
                >
                  <p className="text-xs text-[#61c2ad] font-semibold uppercase tracking-wider mb-1">{s.role}</p>
                  <p className="text-sm text-gray-300 leading-snug">{s.shift}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Metrics + business result */}
            <motion.div
              className="flex flex-wrap items-center gap-6 p-5 rounded-xl bg-white/[0.04] border border-white/10"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {METRICS.map((m) => (
                <div key={m.label} className="text-center sm:text-right">
                  <p className="text-2xl font-bold text-white">{m.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.label}</p>
                </div>
              ))}
              <div className="hidden sm:block w-px self-stretch bg-white/10" />
              <p className="text-xs text-gray-400 leading-relaxed flex-1 min-w-[180px]">
                <span className="text-white font-medium">Business result:</span> Same team → higher output → higher revenue per employee.
              </p>
            </motion.div>

          </div>

        </div>
      </div>
    </section>
  )
}
