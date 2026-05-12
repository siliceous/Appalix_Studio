'use client'

import { GALLERY_TEMPLATES } from '@/lib/email-templates/gallery-templates'
import type { TemplateStyle } from '@/lib/email-templates/presets'
import Image from 'next/image'

interface EmailTemplateGalleryProps {
  onSelectCategory: (style: TemplateStyle) => void
  selectedStyle?: TemplateStyle
}

export function EmailTemplateGallery({ onSelectCategory, selectedStyle }: EmailTemplateGalleryProps) {
  const templates = Object.values(GALLERY_TEMPLATES)

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Email Template Gallery</h2>
        <p className="text-gray-600">Choose a professionally designed template to get started</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group ${
              selectedStyle === template.id ? 'ring-2 ring-blue-500 shadow-lg border-blue-500' : 'border-gray-200'
            }`}
            onClick={() => onSelectCategory(template.id)}
          >
            {/* Preview Image */}
            <div className="relative w-full bg-gray-100 overflow-hidden flex items-center justify-center" style={{ aspectRatio: '210/297' }}>
              {template.previewImage ? (
                <Image
                  src={template.previewImage}
                  alt={template.label}
                  width={400}
                  height={300}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">✨</div>
                    <p className="text-white font-medium">Custom Canvas</p>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-1 text-gray-900">{template.label}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

              {/* Layout Info */}
              <div className="mb-4 text-xs text-gray-500">
                {template.id === 'newsletter' && <span>Multi-section digest</span>}
                {template.id === 'basic' && <span>Single-column layout</span>}
                {template.id === 'announcement' && <span>Bold hero section</span>}
                {template.id === 'promotional' && <span>Product showcase</span>}
                {template.id === 'offer' && <span>Deal & discount focus</span>}
                {template.id === 'minimalist' && <span>Typography-led design</span>}
                {template.id === 'custom' && <span>Blank canvas</span>}
              </div>

              {/* Button */}
              <button
                className={`w-full text-sm py-2 px-3 rounded-lg font-medium transition-colors ${
                  selectedStyle === template.id
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectCategory(template.id)
                }}
              >
                {selectedStyle === template.id ? '✓ Selected' : 'Choose Template'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
