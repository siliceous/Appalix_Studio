'use client'

import Link from 'next/link'
import { Plus, Workflow, FolderOpen, Clock } from 'lucide-react'

export function Sidebar() {
  return (
    <div className="w-64 border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0d0d0d] flex flex-col">
      {/* Logo */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">G GoRank</h2>
      </div>

      {/* Actions */}
      <div className="px-4 py-4 space-y-2">
        <button className="w-full flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-gray-100 text-sm font-medium rounded-lg transition-colors border border-gray-200 dark:border-white/10">
          <Plus className="w-4 h-4" />
          New project
        </button>
        <button className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-900 dark:text-gray-100 text-sm font-medium rounded-lg transition-colors">
          <Workflow className="w-4 h-4" />
          New workflow
        </button>
      </div>

      {/* Folders */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Folders</h3>
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors">
            <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="space-y-1">
          <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-sm rounded transition-colors">
            <FolderOpen className="w-4 h-4" />
            New Folder
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-sm rounded transition-colors truncate">
            <span className="text-xs">📁</span>
            Hey you... still scrollin...
          </button>
        </div>
      </div>

      {/* Latest / Recent */}
      <div className="flex-1 px-4 py-3 border-t border-gray-200 dark:border-white/10 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Latest</h3>
          <button className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors">
            <Plus className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        <div className="space-y-1">
          {[
            'New Project',
            'New Project',
            'New Workflow',
            'If your business isn\'t',
          ].map((item, idx) => (
            <button
              key={idx}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors truncate ${
                idx === 0
                  ? 'bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-gray-100'
                  : 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate text-xs">{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* User / Settings */}
      <div className="px-4 py-4 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">User</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">user@example.com</p>
          </div>
        </div>
      </div>
    </div>
  )
}
