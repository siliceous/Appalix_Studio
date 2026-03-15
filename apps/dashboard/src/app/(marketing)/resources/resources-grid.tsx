'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useMemo } from 'react'

interface Post {
  category: string
  title: string
  excerpt: string
  readTime: string
  date: string
  emoji: string
  logo?: string
  large?: boolean
  slug?: string
}

const CATEGORY_COLORS: Record<string, string> = {
  Tutorial:       'bg-brand-600/15 text-brand-400 border-brand-600/20',
  Guide:          'bg-[#15A4AE]/15 text-[#15A4AE] border-[#15A4AE]/20',
  'Developer Guide': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Strategy:       'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Case Study':   'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  Product:        'bg-pink-500/15 text-pink-400 border-pink-500/20',
}

export function ResourcesGrid({
  posts,
  categories,
}: {
  posts: Post[]
  categories: string[]
}) {
  const [search, setSearch]     = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return posts.filter((p) => {
      const matchesCat = activeCategory === 'All' || p.category === activeCategory
      if (!matchesCat) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    })
  }, [posts, search, activeCategory])

  return (
    <>
      {/* Search + category filter */}
      <section className="px-6 pt-4 pb-10">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Search bar */}
          <div className="relative max-w-xl mx-auto">
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search guides and tutorials…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-600/50 focus:ring-1 focus:ring-brand-600/30 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((cat) => {
              const isActive = activeCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? 'bg-brand-600/20 border-brand-600/40 text-brand-300'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-4 px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-lg font-medium text-gray-400">No results found</p>
              <p className="text-sm mt-1">Try a different search term or category.</p>
              <button
                onClick={() => { setSearch(''); setActiveCategory('All') }}
                className="mt-4 text-sm text-brand-400 hover:text-brand-300 transition-colors underline underline-offset-2"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((post) => {
                const href = post.slug ? `/resources/${post.slug}` : null
                const colorCls = CATEGORY_COLORS[post.category] ?? 'bg-brand-600/15 text-brand-400 border-brand-600/20'

                const card = (
                  <article className={`group flex flex-col rounded-2xl bg-white/5 border border-white/10 transition-colors overflow-hidden h-full ${href ? 'hover:border-brand-600/30 cursor-pointer' : 'opacity-80'}`}>
                    <div className="h-36 bg-gradient-to-br from-brand-600/10 to-transparent flex items-center justify-center border-b border-white/5">
                      {post.logo ? (
                        <div className={`w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden ${post.large ? '' : 'p-2'}`}>
                          <Image src={post.logo} alt={post.title} width={48} height={48} className={`object-contain ${post.large ? 'w-16 h-16' : 'w-12 h-12'}`} />
                        </div>
                      ) : (
                        <span className="text-5xl">{post.emoji}</span>
                      )}
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorCls}`}>
                          {post.category}
                        </span>
                        <span className="text-xs text-gray-600">{post.readTime}</span>
                      </div>

                      <h2 className={`font-semibold text-white leading-snug mb-2 transition-colors ${href ? 'group-hover:text-brand-300' : ''}`}>
                        {post.title}
                      </h2>
                      <p className="text-sm text-gray-400 leading-relaxed flex-1">{post.excerpt}</p>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <span className="text-xs text-gray-600">{post.date}</span>
                        {href ? (
                          <span className={`text-xs text-brand-400 font-medium transition-colors ${href ? 'group-hover:text-brand-300' : ''}`}>
                            Read more →
                          </span>
                        ) : (
                          <span className="text-xs text-gray-600 font-medium">Coming soon</span>
                        )}
                      </div>
                    </div>
                  </article>
                )

                return href ? (
                  <Link key={post.title} href={href} className="block h-full">{card}</Link>
                ) : (
                  <div key={post.title} className="block h-full">{card}</div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
