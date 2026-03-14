'use client'

import { useEffect, useState } from 'react'
import { Hash, Lock, MessageSquare, Check } from 'lucide-react'

interface Channel {
  id:         string
  name:       string
  is_im:      boolean
  is_private: boolean
  is_member:  boolean
  num_members?: number
}

export function SlackChannelPicker({ integrationId }: { integrationId: string }) {
  const [channels, setChannels]         = useState<Channel[]>([])
  const [selected, setSelected]         = useState<Set<string>>(new Set())
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [error, setError]               = useState('')

  useEffect(() => {
    fetch(`/api/integrations/${integrationId}/slack-channels`)
      .then(r => r.json() as Promise<{ channels?: Channel[]; allowed_channels?: string[]; error?: string }>)
      .then(data => {
        if (data.error) { setError(data.error); return }
        setChannels(data.channels ?? [])
        setSelected(new Set(data.allowed_channels ?? []))
      })
      .catch(() => setError('Failed to load channels'))
      .finally(() => setLoading(false))
  }, [integrationId])

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setSaved(false)
  }

  function selectAll() {
    setSelected(new Set(channels.map(c => c.id)))
    setSaved(false)
  }

  function clearAll() {
    setSelected(new Set())
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/integrations/${integrationId}/slack-channels`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ allowed_channels: [...selected] }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
    } catch {
      setError('Failed to save — please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-400 animate-pulse">Loading channels…</p>
  }

  if (error) {
    return <p className="text-sm text-red-500">{error}</p>
  }

  const publicChannels  = channels.filter(c => !c.is_im && !c.is_private)
  const privateChannels = channels.filter(c => !c.is_im && c.is_private)
  const dms             = channels.filter(c => c.is_im)

  const allSelected  = selected.size === channels.length && channels.length > 0
  const noneSelected = selected.size === 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {noneSelected
            ? 'Bot responds in all channels and DMs'
            : `${selected.size} channel${selected.size !== 1 ? 's' : ''} selected`}
        </p>
        <div className="flex gap-3">
          {!allSelected && (
            <button type="button" onClick={selectAll} className="text-xs text-brand-600 hover:underline">
              Select all
            </button>
          )}
          {!noneSelected && (
            <button type="button" onClick={clearAll} className="text-xs text-gray-400 hover:underline">
              Clear (respond everywhere)
            </button>
          )}
        </div>
      </div>

      {publicChannels.length > 0 && (
        <ChannelGroup label="Public channels" channels={publicChannels} selected={selected} onToggle={toggle} />
      )}
      {privateChannels.length > 0 && (
        <ChannelGroup label="Private channels" channels={privateChannels} selected={selected} onToggle={toggle} />
      )}
      {dms.length > 0 && (
        <ChannelGroup label="Direct messages" channels={dms} selected={selected} onToggle={toggle} />
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Check className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}

function ChannelGroup({
  label, channels, selected, onToggle,
}: {
  label: string
  channels: Channel[]
  selected: Set<string>
  onToggle: (id: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
        {channels.map(ch => (
          <label
            key={ch.id}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            <input
              type="checkbox"
              checked={selected.has(ch.id)}
              onChange={() => onToggle(ch.id)}
              className="rounded accent-brand-600"
            />
            {ch.is_im ? (
              <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            ) : ch.is_private ? (
              <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            ) : (
              <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {ch.is_im ? `DM (${ch.id})` : ch.name}
            </span>
            {ch.num_members !== undefined && !ch.is_im && (
              <span className="ml-auto text-xs text-gray-400">{ch.num_members} members</span>
            )}
          </label>
        ))}
      </div>
    </div>
  )
}
