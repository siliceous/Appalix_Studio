'use client'

import { useState } from 'react'
import type { WorkspacePhoneNumber } from '@/lib/types'

interface Props {
  num: WorkspacePhoneNumber
  action: (formData: FormData) => Promise<void>
}

function Toggle({ name, checked, onChange, label, description }: {
  name: string
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 ${
          checked ? 'bg-[#15A4AE]' : 'bg-gray-200 dark:bg-white/15'
        }`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
      <input type="hidden" name={name} value={checked ? 'on' : 'off'} />
    </div>
  )
}

export function PhoneVoiceSettingsForm({ num, action }: Props) {
  const [recording,    setRecording]    = useState(num.call_recording_enabled)
  const [transcription, setTranscription] = useState(num.call_transcription_enabled)
  const [autoDelete,   setAutoDelete]   = useState(num.auto_delete_recordings_enabled)
  const [voicemail,    setVoicemail]    = useState(num.voicemail_enabled)
  const [textback,     setTextback]     = useState(num.missed_call_textback_enabled)
  const [saving,       setSaving]       = useState(false)

  async function handleSubmit(formData: FormData) {
    setSaving(true)
    try {
      await action(formData)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form action={handleSubmit} className="divide-y dark:divide-white/8">

      {/* ── Call Recording & Transcription ── */}
      <div className="px-6 py-5">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Recording & Transcription
        </p>
        <div className="divide-y dark:divide-white/5">
          <Toggle
            name="call_recording_enabled"
            checked={recording}
            onChange={setRecording}
            label="Call recording"
            description="Record all calls on this number. Recordings are stored securely."
          />
          <Toggle
            name="call_transcription_enabled"
            checked={transcription}
            onChange={setTranscription}
            label="Call transcription"
            description="Automatically transcribe recorded calls."
          />
          <Toggle
            name="auto_delete_recordings_enabled"
            checked={autoDelete}
            onChange={setAutoDelete}
            label="Auto-delete older recordings"
            description="Automatically remove recordings after a set number of days."
          />
          {autoDelete && (
            <div className="py-3">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 block">
                Retention period (days)
              </label>
              <input
                type="number"
                name="recording_retention_days"
                min={1}
                max={730}
                defaultValue={num.recording_retention_days ?? 90}
                className="w-40 px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
              />
              <p className="text-xs text-gray-400 mt-1">Recordings older than this will be permanently deleted.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Voicemail ── */}
      <div className="px-6 py-5">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Voicemail
        </p>
        <div className="divide-y dark:divide-white/5">
          <Toggle
            name="voicemail_enabled"
            checked={voicemail}
            onChange={setVoicemail}
            label="Enable voicemail"
            description="Callers can leave a voicemail when the call is unanswered."
          />
          {voicemail && (
            <div className="py-3">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 block">
                Voicemail greeting
              </label>
              <textarea
                name="voicemail_greeting"
                rows={3}
                defaultValue={num.voicemail_greeting ?? ''}
                placeholder="e.g. You've reached Acme Corp. Please leave your name and number after the beep."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">Leave blank to use a default greeting.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Missed call text-back ── */}
      <div className="px-6 py-5">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
          Missed Call Text-Back
        </p>
        <div className="divide-y dark:divide-white/5">
          <Toggle
            name="missed_call_textback_enabled"
            checked={textback}
            onChange={setTextback}
            label="Send SMS on missed call"
            description="Automatically send a text message when an inbound call goes unanswered."
          />
          {textback && (
            <div className="py-3">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 block">
                Text-back message
              </label>
              <textarea
                name="missed_call_textback_message"
                rows={2}
                defaultValue={num.missed_call_textback_message ?? ''}
                placeholder="e.g. Sorry we missed your call! We'll call you back shortly."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40 resize-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── General ── */}
      <div className="px-6 py-5">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          General
        </p>
        <label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1 block">
          Call timeout (seconds)
        </label>
        <input
          type="number"
          name="call_timeout_seconds"
          min={5}
          max={120}
          defaultValue={num.call_timeout_seconds ?? 30}
          className="w-40 px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#252525] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#15A4AE]/40"
        />
        <p className="text-xs text-gray-400 mt-1">How long to ring before considering the call unanswered.</p>
      </div>

      {/* ── Save ── */}
      <div className="px-6 py-4 flex justify-end bg-gray-50 dark:bg-white/[0.02]">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {saving ? 'Saving…' : 'Save voice settings'}
        </button>
      </div>
    </form>
  )
}
