'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

// ─────────────────────────────────────────────────────────────────
// LEAD FLOW DIAGRAM  (sources → AI engine → outputs)
// ─────────────────────────────────────────────────────────────────

const SOURCES = [
  { x: 60,  label: 'Forms',      icon: '📋' },
  { x: 168, label: 'Email',      icon: '📧' },
  { x: 300, label: 'Chatbot',    icon: '💬' },
  { x: 432, label: 'Google Ads', icon: '📣' },
  { x: 540, label: 'Meta Ads',   icon: '📘' },
]

const OUTPUTS = [
  { x: 90,  label: 'Pipeline',   icon: '📌' },
  { x: 230, label: 'Team Alert', icon: '🔔' },
  { x: 370, label: 'CRM Sync',   icon: '🔗' },
  { x: 510, label: 'Follow-up',  icon: '✉️' },
]

// Engine geometry
const EX  = 300   // engine center x
const EYT = 116   // engine top y
const EYB = 158   // engine bottom y
const EYC = (EYT + EYB) / 2

const SY  = 44    // source center y
const OY  = 234   // output center y

function FlowDot({
  x1, y1, x2, y2, delay, active,
}: {
  x1: number; y1: number; x2: number; y2: number; delay: number; active: boolean
}) {
  if (!active) return null
  return (
    <motion.circle
      r={2.8}
      fill="#15A4AE"
      initial={{ opacity: 0 }}
      animate={{
        cx: [x1, x2],
        cy: [y1, y2],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 1.5,
        delay,
        repeat: Infinity,
        repeatDelay: 2,
        ease: 'easeInOut',
      }}
    />
  )
}

export function LeadFlowDiagram() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <div ref={ref} className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-6 overflow-hidden">
      <svg viewBox="0 0 600 278" className="w-full" style={{ maxHeight: 278 }}>

        {/* ── Guide lines: sources → engine ── */}
        {SOURCES.map(s => (
          <line key={`sl-${s.label}`}
            x1={s.x} y1={SY + 13} x2={EX} y2={EYT}
            stroke="#15A4AE" strokeWidth={0.7} strokeOpacity={0.18} strokeDasharray="3 3"
          />
        ))}

        {/* ── Guide lines: engine → outputs ── */}
        {OUTPUTS.map(o => (
          <line key={`ol-${o.label}`}
            x1={EX} y1={EYB} x2={o.x} y2={OY - 13}
            stroke="#15A4AE" strokeWidth={0.7} strokeOpacity={0.18} strokeDasharray="3 3"
          />
        ))}

        {/* ── Animated dots: sources → engine ── */}
        {SOURCES.map((s, i) => (
          <FlowDot key={`sd-${s.label}`}
            x1={s.x} y1={SY + 13} x2={EX} y2={EYT}
            delay={i * 0.38} active={inView}
          />
        ))}

        {/* ── Animated dots: engine → outputs ── */}
        {OUTPUTS.map((o, i) => (
          <FlowDot key={`od-${o.label}`}
            x1={EX} y1={EYB} x2={o.x} y2={OY - 13}
            delay={1.1 + i * 0.32} active={inView}
          />
        ))}

        {/* ── Source pills ── */}
        {SOURCES.map((s, i) => (
          <motion.g key={`sn-${s.label}`}
            initial={{ opacity: 0, y: -8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: i * 0.07, duration: 0.45 }}
          >
            <rect x={s.x - 45} y={SY - 14} width={90} height={27} rx={13}
              fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.13)" strokeWidth={1} />
            <text x={s.x} y={SY + 1} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.78)" fontSize={9.5} fontWeight={600}
              fontFamily="system-ui,sans-serif">
              {s.icon} {s.label}
            </text>
          </motion.g>
        ))}

        {/* ── AI Engine box ── */}
        <motion.g
          initial={{ opacity: 0, scale: 0.85 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.3, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${EX}px ${EYC}px` }}
        >
          {/* soft glow */}
          <ellipse cx={EX} cy={EYC} rx={114} ry={32} fill="rgba(97,194,173,0.05)" />

          {/* box border */}
          <rect x={EX - 108} y={EYT} width={216} height={EYB - EYT} rx={14}
            fill="rgba(97,194,173,0.09)" stroke="rgba(97,194,173,0.45)" strokeWidth={1.5} />

          {/* pulsing ring */}
          <motion.circle cx={EX} cy={EYC} r={14} fill="none"
            stroke="rgba(97,194,173,0.35)" strokeWidth={1}
            animate={{ r: [10, 20, 10], opacity: [0.7, 0.1, 0.7] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* center dot */}
          <circle cx={EX} cy={EYC} r={4.5} fill="#15A4AE" opacity={0.88} />

          {/* labels — offset right of the dot */}
          <text x={EX + 20} y={EYC - 5} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(255,255,255,0.9)" fontSize={11} fontWeight={700}
            fontFamily="system-ui,sans-serif">
            Appalix AI Engine
          </text>
          <text x={EX + 20} y={EYC + 10} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(97,194,173,0.65)" fontSize={8.5} fontFamily="system-ui,sans-serif">
            reads · scores · tags · routes
          </text>
        </motion.g>

        {/* ── Output pills ── */}
        {OUTPUTS.map((o, i) => (
          <motion.g key={`on-${o.label}`}
            initial={{ opacity: 0, y: 8 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.62 + i * 0.08, duration: 0.45 }}
          >
            <rect x={o.x - 50} y={OY - 13} width={100} height={27} rx={13}
              fill="rgba(97,194,173,0.08)" stroke="rgba(97,194,173,0.32)" strokeWidth={1} />
            <text x={o.x} y={OY + 1} textAnchor="middle" dominantBaseline="middle"
              fill="rgba(97,194,173,0.9)" fontSize={9.5} fontWeight={600}
              fontFamily="system-ui,sans-serif">
              {o.icon} {o.label}
            </text>
          </motion.g>
        ))}

      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// PAIN ORBIT  (scattered icons wandering helplessly)
// ─────────────────────────────────────────────────────────────────

const POC = { x: 200, y: 200 }

const PAIN_ICONS = [
  { label: 'Forms',   icon: '📋', rx: 108, ry:  98, speed: 22, startDeg:   0 },
  { label: 'Email',   icon: '📧', rx: 120, ry: 110, speed: 17, startDeg: 110 },
  { label: 'Chatbot', icon: '💬', rx:  95, ry: 118, speed: 26, startDeg: 220 },
  { label: 'Tickets', icon: '🎫', rx: 114, ry:  92, speed: 19, startDeg: 320 },
]

function painOrbitPts(rx: number, ry: number, startDeg: number, n = 72) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const angle = ((startDeg + i * (360 / n)) * Math.PI) / 180
    return { x: POC.x + rx * Math.cos(angle), y: POC.y + ry * Math.sin(angle) }
  })
}

export function PainOrbit() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: false, margin: '-60px' })

  return (
    <div ref={ref} className="rounded-2xl bg-white/[0.02] border border-white/8 p-4 sm:p-6 overflow-hidden">
      <svg viewBox="0 0 400 400" className="w-full" style={{ maxHeight: 560 }}>

        {/* ── Dashed orbit rings (dim, irregular) ── */}
        {PAIN_ICONS.map((ic) => (
          <ellipse key={`ring-${ic.label}`}
            cx={POC.x} cy={POC.y} rx={ic.rx} ry={ic.ry}
            fill="none" stroke="rgba(255,255,255,0.06)"
            strokeWidth={1} strokeDasharray="4 7"
          />
        ))}

        {/* ── Centre broken circle ── */}
        <motion.circle cx={POC.x} cy={POC.y} r={48}
          fill="rgba(239,68,68,0.04)" stroke="rgba(239,68,68,0.18)"
          strokeWidth={1.5} strokeDasharray="6 5"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          style={{ transformOrigin: `${POC.x}px ${POC.y}px` }}
        />
        <text x={POC.x} y={POC.y - 8} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.18)" fontSize={26} fontFamily="system-ui,sans-serif">
          ?
        </text>
        <text x={POC.x} y={POC.y + 14} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.1)" fontSize={9} fontFamily="system-ui,sans-serif">
          no system
        </text>

        {/* ── Wandering icons ── */}
        {PAIN_ICONS.map((ic) => {
          const pts = painOrbitPts(ic.rx, ic.ry, ic.startDeg)
          return inView ? (
            <motion.g key={`pain-${ic.label}`}
              animate={{ x: pts.map(p => p.x), y: pts.map(p => p.y) }}
              transition={{ duration: ic.speed, repeat: Infinity, ease: 'linear' }}
            >
              {/* Warning glow */}
              <circle cx={0} cy={0} r={22} fill="rgba(239,68,68,0.05)" />
              {/* Icon */}
              <text x={0} y={0} textAnchor="middle" dominantBaseline="middle"
                fontSize={22} fontFamily="system-ui,sans-serif" opacity={0.55}>
                {ic.icon}
              </text>
              {/* Label */}
              <text x={0} y={18} textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.3)" fontSize={8} fontFamily="system-ui,sans-serif">
                {ic.label}
              </text>
              {/* ! badge */}
              <circle cx={14} cy={-14} r={7} fill="rgba(239,68,68,0.7)" />
              <text x={14} y={-14} textAnchor="middle" dominantBaseline="middle"
                fill="white" fontSize={9} fontWeight={700} fontFamily="system-ui,sans-serif">
                !
              </text>
            </motion.g>
          ) : null
        })}

      </svg>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// QUALIFICATION LOOP  (circular 4-step flow)
// ─────────────────────────────────────────────────────────────────

const QA_STEPS = [
  { angle: -90, label: 'Lead arrives',       sub: 'from any source',     num: '01' },
  { angle:   0, label: 'AI reads context',   sub: 'full content scan',   num: '02' },
  { angle:  90, label: 'Score assigned',     sub: 'high · med · low',    num: '03' },
  { angle: 180, label: 'Action suggested',   sub: 'draft · alert · log', num: '04' },
]

const QR  = 110   // orbit radius
const QCX = 260   // center x (shifted right for left-box clearance)
const QCY = 210   // center y

function qPt(angleDeg: number, r: number = QR) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: QCX + r * Math.cos(rad), y: QCY + r * Math.sin(rad) }
}

// Clockwise arc from a1 to a2, trimming GAP degrees at each end
function cwarc(a1: number, a2: number, gap = 20) {
  const norm = a2 <= a1 ? a2 + 360 : a2
  const p1 = qPt(a1 + gap)
  const p2 = qPt(norm - gap)
  return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${QR} ${QR} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
}

// Positions for the orbiting dot (360° in 72 steps)
const DOT_PTS = Array.from({ length: 73 }, (_, i) => qPt(-90 + i * 5))

export function QualificationLoop() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  const BW = 120, BH = 54

  return (
    <div ref={ref} className="rounded-2xl bg-white/[0.03] border border-white/10 p-4 sm:p-6 overflow-hidden">
      <svg viewBox="0 0 520 420" className="w-full" style={{ maxHeight: 420 }}>

        {/* ── Orbit ring ── */}
        <motion.circle cx={QCX} cy={QCY} r={QR}
          fill="none" stroke="rgba(97,194,173,0.12)" strokeWidth={1.2} strokeDasharray="5 4"
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.15, duration: 0.7 }}
        />

        {/* ── Arc segments between steps ── */}
        {QA_STEPS.map((step, i) => {
          const nextAngle = QA_STEPS[(i + 1) % QA_STEPS.length].angle
          return (
            <motion.path key={`arc-${i}`}
              d={cwarc(step.angle, nextAngle)}
              fill="none"
              stroke="rgba(97,194,173,0.45)" strokeWidth={1.6} strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={inView ? { pathLength: 1, opacity: 1 } : {}}
              transition={{ delay: 0.3 + i * 0.14, duration: 0.75, ease: 'easeOut' }}
            />
          )
        })}

        {/* ── Orbiting dot ── */}
        {inView && (
          <motion.circle r={4.5} fill="#15A4AE" opacity={0.9}
            animate={{
              cx: DOT_PTS.map(p => p.x),
              cy: DOT_PTS.map(p => p.y),
            }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* ── Centre circle ── */}
        <motion.g
          initial={{ opacity: 0, scale: 0.7 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.38, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: `${QCX}px ${QCY}px` }}
        >
          <motion.circle cx={QCX} cy={QCY} r={44} fill="none"
            stroke="rgba(97,194,173,0.15)" strokeWidth={1}
            animate={{ r: [40, 50, 40], opacity: [0.5, 0.1, 0.5] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx={QCX} cy={QCY} r={38}
            fill="rgba(97,194,173,0.08)" stroke="rgba(97,194,173,0.38)" strokeWidth={1.5} />
          <text x={QCX} y={QCY - 6} textAnchor="middle" dominantBaseline="middle"
            fill="#15A4AE" fontSize={10.5} fontWeight={700} fontFamily="system-ui,sans-serif">
            Appalix
          </text>
          <text x={QCX} y={QCY + 9} textAnchor="middle" dominantBaseline="middle"
            fill="rgba(97,194,173,0.55)" fontSize={8.5} fontFamily="system-ui,sans-serif">
            AI Engine
          </text>
        </motion.g>

        {/* ── Step nodes ── */}
        {QA_STEPS.map((step, i) => {
          const pt = qPt(step.angle)

          // Box anchor: above top node, right of right node, below bottom node, left of left node
          const bx =
            step.angle ===   0 ? pt.x + 16 :
            step.angle === 180 ? pt.x - BW - 16 :
            pt.x - BW / 2

          const by =
            step.angle === -90 ? pt.y - BH - 16 :
            step.angle ===  90 ? pt.y + 16 :
            pt.y - BH / 2

          // Connector from orbit dot to nearest box edge
          const cx2 =
            step.angle ===   0 ? bx :
            step.angle === 180 ? bx + BW :
            pt.x

          const cy2 =
            step.angle === -90 ? by + BH :
            step.angle ===  90 ? by :
            pt.y

          return (
            <motion.g key={`step-${step.num}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.18 + i * 0.13, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: `${pt.x}px ${pt.y}px` }}
            >
              {/* Orbit node glow */}
              <circle cx={pt.x} cy={pt.y} r={9} fill="rgba(97,194,173,0.18)" />
              {/* Orbit node dot */}
              <circle cx={pt.x} cy={pt.y} r={5} fill="#15A4AE" opacity={0.85} />

              {/* Dashed connector to box */}
              <line x1={pt.x} y1={pt.y} x2={cx2} y2={cy2}
                stroke="rgba(97,194,173,0.3)" strokeWidth={1} strokeDasharray="3 2" />

              {/* Info box */}
              <rect x={bx} y={by} width={BW} height={BH} rx={11}
                fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />

              {/* Step number */}
              <text x={bx + 10} y={by + 15} dominantBaseline="middle"
                fill="rgba(97,194,173,0.65)" fontSize={8} fontWeight={700}
                fontFamily="system-ui,sans-serif">
                {step.num}
              </text>

              {/* Step label */}
              <text x={bx + BW / 2} y={by + 27} textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.87)" fontSize={10} fontWeight={600}
                fontFamily="system-ui,sans-serif">
                {step.label}
              </text>

              {/* Sub label */}
              <text x={bx + BW / 2} y={by + 43} textAnchor="middle" dominantBaseline="middle"
                fill="rgba(255,255,255,0.38)" fontSize={8.5}
                fontFamily="system-ui,sans-serif">
                {step.sub}
              </text>
            </motion.g>
          )
        })}

      </svg>
    </div>
  )
}
