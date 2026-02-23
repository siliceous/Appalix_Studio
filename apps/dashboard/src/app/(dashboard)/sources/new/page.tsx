import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { createSource } from '@/app/actions/source'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Add source' }

export default async function NewSourcePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="max-w-2xl">
      <Header
        title="Add source"
        description="Train your bot with a website URL or custom text"
      />

      <form action={createSource} className="space-y-6">
        {/* Type selector */}
        <div className="bg-white rounded-xl border p-5">
          <label className="block text-sm font-semibold text-gray-900 mb-3">Source type</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 hover:bg-gray-50 transition-colors">
              <input type="radio" name="type" value="url" defaultChecked className="mt-0.5 accent-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Website URL</p>
                <p className="text-xs text-gray-500 mt-0.5">Scrape and index a webpage or document</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 hover:bg-gray-50 transition-colors">
              <input type="radio" name="type" value="text" className="mt-0.5 accent-brand-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">Plain text</p>
                <p className="text-xs text-gray-500 mt-0.5">Paste in FAQs, docs, or custom knowledge</p>
              </div>
            </label>
          </div>
        </div>

        {/* Fields */}
        <div className="bg-white rounded-xl border p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Source name</label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Appalix homepage, Product FAQ"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              URL <span className="text-gray-400 font-normal">(for website type)</span>
            </label>
            <input
              type="url"
              name="url"
              placeholder="https://yoursite.com/page"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Text content <span className="text-gray-400 font-normal">(for plain text type)</span>
            </label>
            <textarea
              name="text"
              rows={8}
              placeholder="Paste your FAQs, product documentation, or any custom knowledge here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          After adding, your source will be processed and indexed automatically.
          Once <strong>Ready</strong>, bots with RAG enabled will use it to answer questions.
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Add &amp; index source
          </button>
          <a href="/sources" className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Cancel
          </a>
        </div>
      </form>
    </div>
  )
}
