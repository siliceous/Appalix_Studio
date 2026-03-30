'use client'

import { useState, useTransition } from 'react'
import { saveSageVoiceConfig } from '@/app/actions/sage-voice-settings'
import type { SageVoiceConfig } from '@/lib/sage-voice-config'

// ── Voice catalogue ──────────────────────────────────────────────────────────

const VOICES = [
  { name: 'Aoede',         gender: 'Female', tone: 'Warm & natural'        },
  { name: 'Kore',          gender: 'Female', tone: 'Firm & confident'       },
  { name: 'Leda',          gender: 'Female', tone: 'Soft & calm'            },
  { name: 'Zephyr',        gender: 'Female', tone: 'Bright & clear'         },
  { name: 'Autonoe',       gender: 'Female', tone: 'Expressive'             },
  { name: 'Callirrhoe',    gender: 'Female', tone: 'Easy-going'             },
  { name: 'Despina',       gender: 'Female', tone: 'Smooth'                 },
  { name: 'Erinome',       gender: 'Female', tone: 'Clear & precise'        },
  { name: 'Laomedeia',     gender: 'Female', tone: 'Upbeat'                 },
  { name: 'Vindemiatrix',  gender: 'Female', tone: 'Gentle'                 },
  { name: 'Sulafat',       gender: 'Female', tone: 'Warm'                   },
  { name: 'Puck',          gender: 'Male',   tone: 'Upbeat & energetic'     },
  { name: 'Charon',        gender: 'Male',   tone: 'Deep & authoritative'   },
  { name: 'Fenrir',        gender: 'Male',   tone: 'Excitable & dynamic'    },
  { name: 'Orus',          gender: 'Male',   tone: 'Confident & measured'   },
  { name: 'Orbit',         gender: 'Male',   tone: 'Friendly & approachable'},
  { name: 'Achernar',      gender: 'Male',   tone: 'Soft'                   },
  { name: 'Achird',        gender: 'Male',   tone: 'Friendly'               },
  { name: 'Alula',         gender: 'Male',   tone: 'Easy-going'             },
  { name: 'Gacrux',        gender: 'Male',   tone: 'Mature'                 },
  { name: 'Rasalgethi',    gender: 'Male',   tone: 'Informative'            },
  { name: 'Sadachbia',     gender: 'Male',   tone: 'Lively'                 },
  { name: 'Sadaltager',    gender: 'Male',   tone: 'Knowledgeable'          },
  { name: 'Schedar',       gender: 'Male',   tone: 'Even'                   },
  { name: 'Umbriel',       gender: 'Male',   tone: 'Easy-going'             },
  { name: 'Enceladus',     gender: 'Male',   tone: 'Breathy'                },
  { name: 'Iocaste',       gender: 'Male',   tone: 'Warm'                   },
  { name: 'Zubenelgenubi', gender: 'Male',   tone: 'Casual'                 },
]

// ── Language options ─────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)'        },
  { code: 'en-GB', label: 'English (UK)'        },
  { code: 'en-AU', label: 'English (Australia)' },
  { code: 'es-ES', label: 'Spanish (Spain)'     },
  { code: 'es-MX', label: 'Spanish (Mexico)'    },
  { code: 'fr-FR', label: 'French'              },
  { code: 'de-DE', label: 'German'              },
  { code: 'it-IT', label: 'Italian'             },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'pt-PT', label: 'Portuguese (Portugal)'},
  { code: 'nl-NL', label: 'Dutch'               },
  { code: 'pl-PL', label: 'Polish'              },
  { code: 'hi-IN', label: 'Hindi'               },
  { code: 'ja-JP', label: 'Japanese'            },
  { code: 'ko-KR', label: 'Korean'              },
  { code: 'zh-CN', label: 'Chinese (Simplified)'},
  { code: 'ar-XA', label: 'Arabic'              },
]

// ── Temperature presets ──────────────────────────────────────────────────────

const TEMP_PRESETS = [
  { label: 'Precise',  value: 0.3, description: 'Focused, consistent answers — best for data queries' },
  { label: 'Balanced', value: 0.7, description: 'Natural conversational tone — recommended'           },
  { label: 'Creative', value: 1.2, description: 'More expressive and varied responses'                },
]

// ── Component ────────────────────────────────────────────────────────────────

export function SageVoiceSettingsForm({
  initial,
  disabled,
}: {
  initial: SageVoiceConfig
  disabled: boolean
}) {
  const [config, setConfig] = useState<SageVoiceConfig>(initial)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [genderFilter, setGenderFilter] = useState<'All' | 'Female' | 'Male'>('All')

  function update<K extends keyof SageVoiceConfig>(key: K, val: SageVoiceConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: val }))
    setSaved(false)
    setError(null)
  }

  function handleSave() {
    startTransition(async () => {
      const { ok, error: err } = await saveSageVoiceConfig(config)
      if (ok) setSaved(true)
      else    setError(err ?? 'Failed to save')
    })
  }

  const filteredVoices = genderFilter === 'All'
    ? VOICES
    : VOICES.filter(v => v.gender === genderFilter)

  const fieldCls = disabled ? 'pointer-events-none opacity-50' : ''

  return (
    <div className="space-y-5">

      {/* ── Voice Selection ─────────────────────────────────────────────── */}
      <section className={`bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 ${fieldCls}`}>
        <div className="px-6 py-5 border-b dark:border-white/10">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Voice</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Choose the voice Sage speaks in during voice sessions.
          </p>

          {/* Gender filter */}
          <div className="flex gap-2 mt-4">
            {(['All', 'Female', 'Male'] as const).map(g => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  genderFilter === g
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/15'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {filteredVoices.map(v => (
            <button
              key={v.name}
              onClick={() => update('voice_name', v.name)}
              className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
                config.voice_name === v.name
                  ? 'border-brand-500 bg-brand-50 dark:bg-[#15A4AE]/10 dark:border-[#15A4AE]'
                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{v.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  v.gender === 'Female'
                    ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-300'
                    : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300'
                }`}>
                  {v.gender}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{v.tone}</p>
            </button>
          ))}
        </div>

        {config.voice_name && (
          <div className="px-6 py-3 border-t dark:border-white/10 bg-gray-50 dark:bg-white/3 rounded-b-xl">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Selected: <span className="font-semibold text-gray-800 dark:text-gray-200">{config.voice_name}</span>
              {' · '}{VOICES.find(v => v.name === config.voice_name)?.tone}
            </p>
          </div>
        )}
      </section>

      {/* ── Language ────────────────────────────────────────────────────── */}
      <section className={`bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 px-6 py-5 ${fieldCls}`}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Language</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          The language Sage listens and responds in.
        </p>
        <select
          value={config.language_code}
          onChange={e => update('language_code', e.target.value)}
          className="w-full sm:w-64 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {LANGUAGES.map(l => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </section>

      {/* ── Response Style ──────────────────────────────────────────────── */}
      <section className={`bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 px-6 py-5 ${fieldCls}`}>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Response style</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Controls how varied and expressive Sage&apos;s answers are.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {TEMP_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => update('temperature', p.value)}
              className={`text-left p-3 rounded-xl border transition-all ${
                config.temperature === p.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-[#15A4AE]/10 dark:border-[#15A4AE]'
                  : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{p.label}</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">{p.description}</p>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
          Temperature: <span className="font-mono">{config.temperature}</span>
        </p>
      </section>

      {/* ── Transcription ───────────────────────────────────────────────── */}
      <section className={`bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 divide-y dark:divide-white/10 ${fieldCls}`}>
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Transcription</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Control which audio is converted to text and shown in the chat panel.
          </p>
        </div>

        <ToggleRow
          label="Show Sage's replies as text"
          description="Transcribe Sage's voice responses and display them in the chat panel."
          checked={config.output_transcription}
          onChange={v => update('output_transcription', v)}
        />

        <ToggleRow
          label="Transcribe my speech"
          description="Show what you said in the chat panel alongside Sage's reply."
          checked={config.input_transcription}
          onChange={v => update('input_transcription', v)}
        />
      </section>

      {/* ── Advanced ────────────────────────────────────────────────────── */}
      <section className={`bg-white dark:bg-[#2a2a2a] rounded-xl border dark:border-white/10 divide-y dark:divide-white/10 ${fieldCls}`}>
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Advanced</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Experimental features that may change Sage&apos;s behaviour.
          </p>
        </div>

        <ToggleRow
          label="Affective dialog"
          description="Sage adapts its tone to match the emotional context of the conversation — more empathetic when you're stressed, more upbeat when things are going well."
          checked={config.enable_affective_dialog}
          onChange={v => update('enable_affective_dialog', v)}
          badge="Experimental"
        />
      </section>

      {/* ── Save ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 pb-8">
        <button
          onClick={handleSave}
          disabled={disabled || isPending}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save settings'}
        </button>

        {saved && (
          <p className="text-sm text-green-600 dark:text-green-400">Settings saved — active on next voice session.</p>
        )}
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
    </div>
  )
}

// ── Reusable toggle row ──────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  badge,
}: {
  label:       string
  description: string
  checked:     boolean
  onChange:    (v: boolean) => void
  badge?:      string
}) {
  return (
    <div className="px-6 py-4 flex items-start justify-between gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-10 h-[22px] rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          checked ? 'bg-brand-600' : 'bg-gray-200 dark:bg-white/15'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
