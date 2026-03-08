/** Build the structured description string stored on workspaces.sage_business_description */
export function buildBusinessDescription(opts: {
  company?:     string | null
  industry?:    string | null
  whatYouSell?: string | null
  targetCust?:  string | null
}): string | null {
  const parts: string[] = []
  if (opts.company)     parts.push(`Business: ${opts.company}`)
  if (opts.industry)    parts.push(`Industry: ${opts.industry}`)
  if (opts.whatYouSell) parts.push(`Products/services: ${opts.whatYouSell}`)
  if (opts.targetCust)  parts.push(`Target customers: ${opts.targetCust}`)
  return parts.length > 0 ? parts.join('. ') : null
}

/**
 * Parse the structured description back into editable fields.
 * Returns empty strings / arrays if a field is absent.
 */
export function parseBusinessDescription(desc: string | null): {
  company:         string
  industry:        string
  whatYouSell:     string[]
  targetCustomers: string[]
} {
  const empty = { company: '', industry: '', whatYouSell: [] as string[], targetCustomers: [] as string[] }
  if (!desc) return empty

  const extract = (key: string) => {
    const m = desc.match(new RegExp(`${key}:\\s*([^.]+)`))
    return m ? m[1].trim() : ''
  }

  const whatRaw = extract('Products\\/services')
  const custRaw = extract('Target customers')

  return {
    company:         extract('Business'),
    industry:        extract('Industry'),
    whatYouSell:     whatRaw ? whatRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
    targetCustomers: custRaw ? custRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
  }
}
