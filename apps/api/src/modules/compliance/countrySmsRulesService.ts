export type CountryRules = {
  requiresA2P10DLC: boolean
  requiresConsent: boolean
  requiresOptOutHandling: boolean
  requiresCampaignAssignment: boolean
  complianceType: string
  displayName: string
}

// Canadian area codes (NPA) — share +1 with US
const CA_AREA_CODES = new Set([
  '204','226','236','249','250','289','306','343','365','403','416','418',
  '431','437','438','450','506','514','519','548','579','581','587','604',
  '613','639','647','672','705','709','742','778','780','807','819','825',
  '867','873','902','905',
])

export function detectCountryFromE164(e164: string): string {
  if (!e164.startsWith('+')) return 'UNKNOWN'
  if (e164.startsWith('+61'))  return 'AU'
  if (e164.startsWith('+44'))  return 'GB'
  if (e164.startsWith('+64'))  return 'NZ'
  if (e164.startsWith('+1')) {
    const areaCode = e164.slice(2, 5)
    return CA_AREA_CODES.has(areaCode) ? 'CA' : 'US'
  }
  if (e164.startsWith('+49'))  return 'DE'
  if (e164.startsWith('+33'))  return 'FR'
  if (e164.startsWith('+91'))  return 'IN'
  return 'UNKNOWN'
}

export function getCountryRules(countryCode: string): CountryRules {
  switch (countryCode.toUpperCase()) {
    case 'US':
      return {
        requiresA2P10DLC:          true,
        requiresConsent:           true,
        requiresOptOutHandling:    true,
        requiresCampaignAssignment: true,
        complianceType:            'A2P_10DLC',
        displayName:               'United States',
      }
    case 'AU':
      return {
        requiresA2P10DLC:          false,
        requiresConsent:           true,
        requiresOptOutHandling:    true,
        requiresCampaignAssignment: false,
        complianceType:            'ACMA',
        displayName:               'Australia',
      }
    case 'GB':
      return {
        requiresA2P10DLC:          false,
        requiresConsent:           true,
        requiresOptOutHandling:    true,
        requiresCampaignAssignment: false,
        complianceType:            'OFCOM',
        displayName:               'United Kingdom',
      }
    case 'CA':
      return {
        requiresA2P10DLC:          false,
        requiresConsent:           true,
        requiresOptOutHandling:    true,
        requiresCampaignAssignment: false,
        complianceType:            'CRTC',
        displayName:               'Canada',
      }
    default:
      return {
        requiresA2P10DLC:          false,
        requiresConsent:           false,
        requiresOptOutHandling:    true,
        requiresCampaignAssignment: false,
        complianceType:            'NONE',
        displayName:               countryCode,
      }
  }
}
