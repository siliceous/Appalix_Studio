'use client'

import { useEffect, useState } from 'react'
import { GALLERY_TEMPLATES, type VariationConfig } from '@/lib/email-templates/gallery-templates'
import type { TemplateStyle } from '@/lib/email-templates/presets'
import { renderEmailHtml } from '@/lib/email-templates/html-renderer'

interface EmailVariationSelectorProps {
  category: TemplateStyle
  onSelectVariation: (variation: VariationConfig) => void
  onBack: () => void
  brandSnapshot?: {
    company_name?: string | null
    tagline?: string | null
    logo_url?: string | null
    primary_color?: string | null
    text_color?: string | null
  }
}

export function EmailVariationSelector({ category, onSelectVariation, onBack, brandSnapshot }: EmailVariationSelectorProps) {
  const template = GALLERY_TEMPLATES[category]
  const [selectedVariation, setSelectedVariation] = useState<VariationConfig>(template.variations[0])
  const [previewHtml, setPreviewHtml] = useState<string>('')

  useEffect(() => {
    const html = renderEmailHtml(
      category,
      selectedVariation.defaultContent,
      {
        company_name: brandSnapshot?.company_name ?? 'Your Company',
        tagline: brandSnapshot?.tagline ?? '',
        logo_url: brandSnapshot?.logo_url ?? '/logo.png',
        primary_color: brandSnapshot?.primary_color ?? '#0066cc',
        text_color: brandSnapshot?.text_color ?? '#1f2937',
      } as any
    )
    setPreviewHtml(html)
  }, [selectedVariation, brandSnapshot, category])

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-4"
        >
          ← Back to Gallery
        </button>
        <h2 className="text-2xl font-bold mb-2">Choose a Style for {template.label}</h2>
        <p className="text-gray-600">Pick a design variation that matches your brand</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Panel - Variation Thumbnails */}
        <div className="col-span-1">
          <div className="space-y-3">
            {template.variations.map((variation) => (
              <div
                key={variation.index}
                className={`p-4 cursor-pointer transition-all border-2 rounded-lg ${
                  selectedVariation.index === variation.index
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow'
                }`}
                onClick={() => setSelectedVariation(variation)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">{variation.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{variation.tagline}</p>
                  </div>
                  {selectedVariation.index === variation.index && (
                    <div className="text-blue-500 font-bold">✓</div>
                  )}
                </div>

                {/* Mini Preview Badge */}
                <div className="mt-3 h-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded border border-gray-200 flex items-center justify-center text-xs text-gray-500 overflow-hidden">
                  <div
                    className="w-full h-full"
                    style={{
                      backgroundColor:
                        variation.defaultContent.style_options?.body_bg || '#ffffff',
                    }}
                  >
                    <div className="p-2 text-center text-xs font-medium text-gray-600 truncate">
                      {variation.name}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Full Preview */}
        <div className="col-span-2">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-4 border-b">
              <h3 className="font-semibold text-gray-900">{selectedVariation.name} Preview</h3>
              <p className="text-sm text-gray-600 mt-1">{selectedVariation.tagline}</p>
            </div>

            {/* Email Preview */}
            <div className="h-96 overflow-y-auto bg-gray-50">
              <iframe
                title="Email Preview"
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                sandbox=""
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
              onClick={onBack}
            >
              ← Back
            </button>
            <button
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              onClick={() => onSelectVariation(selectedVariation)}
            >
              Select This Variation →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
