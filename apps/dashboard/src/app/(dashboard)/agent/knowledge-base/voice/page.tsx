import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Plus, BookOpen, ChevronRight } from 'lucide-react'
import { createVoiceKnowledgeEntry, deleteVoiceKnowledgeEntry } from '@/app/actions/voice'
import type { VoiceKnowledgeEntry, Bot } from '@/lib/types'

export const metadata: Metadata = { title: 'Voice Knowledge Base' }

const CATEGORIES: { id: VoiceKnowledgeEntry['category']; label: string; color: string; bg: string; desc: string }[] = [
  { id: 'faq',        label: 'FAQs',                color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-500/10',   desc: 'Common questions and spoken answers' },
  { id: 'objection',  label: 'Objection Handling',  color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', desc: 'How to respond to pushback and hesitation' },
  { id: 'booking',    label: 'Booking Phrases',     color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10', desc: 'Scripts for scheduling and confirming appointments' },
  { id: 'escalation', label: 'Escalation Phrases',  color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-500/10',     desc: 'Handoff language for routing to a human' },
  { id: 'script',     label: 'Call Scripts',        color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', desc: 'Full flow scripts for specific call types' },
  { id: 'compliance', label: 'Compliance Lines',    color: 'text-gray-600 dark:text-gray-400',   bg: 'bg-gray-100 dark:bg-white/8',      desc: 'Required disclosures and consent language' },
  { id: 'greeting',   label: 'Greetings',           color: 'text-[#15A4AE]',                     bg: 'bg-[#15A4AE]/10',                  desc: 'Opening lines for different call types' },
  { id: 'fallback',   label: 'Fallback Phrases',    color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', desc: "What to say when the bot doesn't understand" },
]

export default async function VoiceKnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; bot?: string }>
}) {
  const params = await searchParams
  const activeCategory = params.category as VoiceKnowledgeEntry['category'] | undefined
  const activeBotId    = params.bot

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberRaw } = await supabase
    .from('workspace_members').select('workspace_id').eq('user_id', user.id)
    .order('created_at', { ascending: true }).limit(1).single()
  const member = memberRaw as { workspace_id: string } | null
  if (!member) redirect('/login')

  // Fetch entries
  let entriesQuery = supabase
    .from('voice_knowledge_entries')
    .select('*')
    .eq('workspace_id', member.workspace_id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (activeCategory) entriesQuery = entriesQuery.eq('category', activeCategory)
  if (activeBotId)    entriesQuery = entriesQuery.eq('bot_id', activeBotId)

  const { data: entriesRaw } = await entriesQuery
  const entries = (entriesRaw ?? []) as VoiceKnowledgeEntry[]

  // Fetch bots for filter
  const { data: botsRaw } = await supabase
    .from('bots')
    .select('id,name,enable_voice')
    .eq('workspace_id', member.workspace_id)
    .order('name', { ascending: true })
  const bots = (botsRaw ?? []) as Pick<Bot, 'id'|'name'|'enable_voice'>[]

  // Category counts
  const categoryCountsQuery = await supabase
    .from('voice_knowledge_entries')
    .select('category')
    .eq('workspace_id', member.workspace_id)
  const allEntries = (categoryCountsQuery.data ?? []) as { category: string }[]
  const categoryCounts = allEntries.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + 1
    return acc
  }, {})

  const createAction = createVoiceKnowledgeEntry

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <Header
            title="Voice Knowledge Base"
            description="Train your voice bots with scripts, FAQs, objection responses, and approved phrases."
          />

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Sidebar: category filters */}
            <div className="xl:col-span-1 space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Categories</p>
              <Link href={`/agent/knowledge-base/voice${activeBotId ? `?bot=${activeBotId}` : ''}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  !activeCategory
                    ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}>
                <span>All entries</span>
                <span className="text-xs">{allEntries.length}</span>
              </Link>
              {CATEGORIES.map(cat => (
                <Link key={cat.id}
                  href={`/agent/knowledge-base/voice?category=${cat.id}${activeBotId ? `&bot=${activeBotId}` : ''}`}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                  }`}>
                  <span>{cat.label}</span>
                  {(categoryCounts[cat.id] ?? 0) > 0 && (
                    <span className="text-xs bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 rounded-full">
                      {categoryCounts[cat.id]}
                    </span>
                  )}
                </Link>
              ))}

              {/* Bot filter */}
              {bots.filter(b => b.enable_voice).length > 0 && (
                <>
                  <div className="pt-4 pb-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Filter by bot</p>
                  </div>
                  <Link href={`/agent/knowledge-base/voice${activeCategory ? `?category=${activeCategory}` : ''}`}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      !activeBotId
                        ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}>
                    All bots
                  </Link>
                  {bots.filter(b => b.enable_voice).map(b => (
                    <Link key={b.id}
                      href={`/agent/knowledge-base/voice?bot=${b.id}${activeCategory ? `&category=${activeCategory}` : ''}`}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                        activeBotId === b.id
                          ? 'bg-[#15A4AE]/10 text-[#15A4AE] font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                      }`}>
                      {b.name}
                    </Link>
                  ))}
                </>
              )}
            </div>

            {/* Main content */}
            <div className="xl:col-span-3 space-y-4">

              {/* Add new entry form */}
              <details className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8">
                <summary className="px-5 py-4 cursor-pointer flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 list-none">
                  <Plus className="w-4 h-4 text-[#15A4AE]" />
                  Add new entry
                  <ChevronRight className="w-4 h-4 ml-auto transition-transform [[open]_&]:rotate-90" />
                </summary>
                <form action={createAction} className="px-5 pb-5 space-y-4 border-t dark:border-white/8 pt-4">
                  <input type="hidden" name="bot_id" value={activeBotId ?? ''} />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                      <select name="category" defaultValue={activeCategory ?? 'faq'}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Usage</label>
                      <select name="usage_type" defaultValue="auto"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]">
                        <option value="auto">Auto — bot uses when relevant</option>
                        <option value="always">Always — included in every session</option>
                        <option value="manual">Manual — reference only</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Title / trigger phrase</label>
                    <input type="text" name="title" required placeholder='e.g. "What is your pricing?"'
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] dark:bg-[#252525]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Content / approved response</label>
                    <textarea name="content" rows={4} required
                      placeholder='e.g. "Our plans start from $49 per month. Would you like me to walk you through the options?"'
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#15A4AE] resize-y dark:bg-[#252525]" />
                    <p className="text-xs text-gray-400 mt-1">Write this as spoken language — short sentences, natural pauses.</p>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit"
                      className="px-4 py-2 bg-[#15A4AE] hover:bg-[#0e8f99] text-white text-sm font-medium rounded-lg transition-colors">
                      Add entry
                    </button>
                  </div>
                </form>
              </details>

              {/* Category header when filtered */}
              {activeCategory && (
                <div className={`${CATEGORIES.find(c => c.id === activeCategory)?.bg ?? 'bg-gray-50 dark:bg-white/5'} rounded-xl border dark:border-white/8 px-5 py-4`}>
                  <p className={`text-sm font-semibold ${CATEGORIES.find(c => c.id === activeCategory)?.color ?? 'text-gray-700 dark:text-gray-300'}`}>
                    {CATEGORIES.find(c => c.id === activeCategory)?.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {CATEGORIES.find(c => c.id === activeCategory)?.desc}
                  </p>
                </div>
              )}

              {/* Entries list */}
              {entries.length === 0 ? (
                <div className="bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 py-16 flex flex-col items-center justify-center text-center">
                  <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">No entries yet</p>
                  <p className="text-xs text-gray-400">Add your first voice knowledge entry above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map(entry => {
                    const cat = CATEGORIES.find(c => c.id === entry.category)
                    return (
                      <div key={entry.id} className={`bg-white dark:bg-[#232323] rounded-xl border dark:border-white/8 p-4 ${!entry.is_active ? 'opacity-50' : ''}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cat?.bg ?? 'bg-gray-100 dark:bg-white/8'} ${cat?.color ?? 'text-gray-600'}`}>
                                {cat?.label ?? entry.category}
                              </span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                entry.usage_type === 'always'
                                  ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400'
                                  : entry.usage_type === 'manual'
                                  ? 'bg-gray-100 dark:bg-white/8 text-gray-500'
                                  : 'bg-[#15A4AE]/10 text-[#15A4AE]'
                              }`}>
                                {entry.usage_type}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{entry.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{entry.content}</p>
                          </div>
                          <form action={deleteVoiceKnowledgeEntry.bind(null, entry.id)}>
                            <button type="submit"
                              className="shrink-0 text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10">
                              Remove
                            </button>
                          </form>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
