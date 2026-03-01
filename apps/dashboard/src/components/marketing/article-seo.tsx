/**
 * ArticleSeo
 *
 * Renders JSON-LD structured data for resource pages:
 *  - Article / HowTo schema (for Google rich results)
 *  - BreadcrumbList schema
 *
 * Usage — add inside the page component JSX (not the <head>):
 *   <ArticleSeo
 *     type="HowTo"
 *     title="How to Connect HubSpot to Appalix"
 *     description="..."
 *     slug="connect-hubspot"
 *     datePublished="2026-02-26"
 *     steps={[
 *       { name: 'Create a HubSpot Private App', text: '...' },
 *       ...
 *     ]}
 *   />
 *
 * Steps are optional — if omitted the schema falls back to Article.
 */

interface Step {
  name: string
  text: string
}

interface ArticleSeoProps {
  /** 'HowTo' for step-by-step tutorials, 'Article' for guides/blog posts */
  type?: 'HowTo' | 'Article'
  title: string
  description: string
  /** Page slug, e.g. "connect-hubspot" — used to build canonical URL */
  slug: string
  /** ISO date string e.g. "2026-02-26" */
  datePublished: string
  dateModified?: string
  /** For HowTo pages — the main steps (optional) */
  steps?: Step[]
}

const BASE_URL = 'https://appalix.ai'

export function ArticleSeo({
  type = 'Article',
  title,
  description,
  slug,
  datePublished,
  dateModified,
  steps,
}: ArticleSeoProps) {
  const url            = `${BASE_URL}/resources/${slug}`
  const modified       = dateModified ?? datePublished
  const resolvedType   = type === 'HowTo' && steps && steps.length > 0 ? 'HowTo' : 'Article'
  const publisher      = { '@type': 'Organization', name: 'Appalix', url: BASE_URL }

  const schema =
    resolvedType === 'HowTo'
      ? {
          '@context': 'https://schema.org',
          '@type':    'HowTo',
          name:       title,
          description,
          url,
          datePublished,
          dateModified: modified,
          publisher,
          author: publisher,
          step: steps!.map((s, i) => ({
            '@type':    'HowToStep',
            position:   i + 1,
            name:       s.name,
            text:       s.text,
            url:        `${url}#step-${i + 1}`,
          })),
        }
      : {
          '@context':   'https://schema.org',
          '@type':      'Article',
          headline:     title,
          description,
          url,
          datePublished,
          dateModified:  modified,
          publisher,
          author:        publisher,
          mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',      item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Resources', item: `${BASE_URL}/resources` },
      { '@type': 'ListItem', position: 3, name: title,       item: url },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  )
}
