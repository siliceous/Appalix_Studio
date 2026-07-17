'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Instagram } from 'lucide-react'
import { selectInstagramAccount } from '@/app/actions/instagram-select'

interface Candidate {
  igAccountId: string
  igUsername:  string
  pageId:      string
  pageName:    string
}

export default function InstagramSelectPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const sessionId    = searchParams.get('session') ?? ''

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading]       = useState(true)
  const [selecting, setSelecting]   = useState<string | null>(null)
  const [error, setError]           = useState('')

  useEffect(() => {
    if (!sessionId) { setError('Invalid session'); setLoading(false); return }
    fetch(`/api/instagram-select-candidates?session=${sessionId}`)
      .then(r => r.json())
      .then((d: { candidates?: Candidate[]; error?: string }) => {
        if (d.error) { setError(d.error); return }
        setCandidates(d.candidates ?? [])
      })
      .catch(() => setError('Failed to load accounts'))
      .finally(() => setLoading(false))
  }, [sessionId])

  const handleSelect = async (candidate: Candidate) => {
    setSelecting(candidate.igAccountId)
    const result = await selectInstagramAccount(sessionId, candidate.igAccountId)
    if (result.error) {
      setError(result.error)
      setSelecting(null)
    } else {
      router.push(`/integrations/${result.integrationId}?connected=instagram`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => router.push('/integrations')} className="text-sm text-gray-500 underline">
            Back to integrations
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
            <Instagram className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">Choose Instagram Account</h1>
            <p className="text-sm text-gray-500">Select the account to connect</p>
          </div>
        </div>

        <div className="space-y-3">
          {candidates.map(c => (
            <button
              key={c.igAccountId}
              onClick={() => handleSelect(c)}
              disabled={!!selecting}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold text-sm">
                  {c.igUsername ? c.igUsername[0].toUpperCase() : 'I'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {c.igUsername ? `@${c.igUsername}` : 'Instagram Account'}
                </p>
                <p className="text-sm text-gray-500 truncate">Via {c.pageName}</p>
              </div>
              {selecting === c.igAccountId && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => router.push('/integrations')}
          className="mt-6 w-full text-center text-sm text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
