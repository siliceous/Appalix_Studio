export interface PlacesResult {
  phone:    string | null
  address:  string | null
  city:     string | null
  country:  string | null
}

/**
 * Enriches a prospect with phone + address from Google Places (New API).
 * Uses Text Search with the business name + location as the query.
 * Returns null if no match or API error.
 */
export async function enrichFromPlaces(
  companyName: string,
  locationHint: string,
  domain?:     string,
): Promise<PlacesResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  if (!apiKey) return null

  const query = [companyName, locationHint].filter(Boolean).join(' ')

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'X-Goog-Api-Key':  apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.nationalPhoneNumber,places.internationalPhoneNumber,places.formattedAddress,places.addressComponents,places.websiteUri',
      },
      body: JSON.stringify({
        textQuery:      query,
        maxResultCount: 3,
      }),
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data = await res.json() as {
      places?: Array<{
        displayName?:              { text?: string }
        nationalPhoneNumber?:      string
        internationalPhoneNumber?: string
        formattedAddress?:         string
        websiteUri?:               string
        addressComponents?:        Array<{
          longText:  string
          types:     string[]
        }>
      }>
    }

    const places = data.places ?? []
    if (places.length === 0) return null

    // If we have a domain, prefer the place whose websiteUri matches
    let best = places[0]
    if (domain && places.length > 1) {
      const domainMatch = places.find(p =>
        p.websiteUri && p.websiteUri.includes(domain.replace(/^www\./, ''))
      )
      if (domainMatch) best = domainMatch
    }

    const phone = best.internationalPhoneNumber ?? best.nationalPhoneNumber ?? null

    // Extract city and country from addressComponents
    let city:    string | null = null
    let country: string | null = null
    for (const comp of best.addressComponents ?? []) {
      if (comp.types.includes('locality') || comp.types.includes('postal_town')) {
        city = comp.longText
      }
      if (comp.types.includes('country')) {
        country = comp.longText
      }
    }

    return {
      phone,
      address: best.formattedAddress ?? null,
      city,
      country,
    }
  } catch {
    return null
  }
}
