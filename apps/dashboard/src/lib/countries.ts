export interface CountryInfo {
  name:     string
  timezone: string   // IANA timezone (primary)
  currency: string   // ISO 4217 currency code
  symbol:   string   // currency symbol
}

export const COUNTRIES: CountryInfo[] = [
  { name: 'Australia',             timezone: 'Australia/Sydney',          currency: 'AUD', symbol: 'A$' },
  { name: 'Austria',               timezone: 'Europe/Vienna',             currency: 'EUR', symbol: '€'  },
  { name: 'Belgium',               timezone: 'Europe/Brussels',           currency: 'EUR', symbol: '€'  },
  { name: 'Brazil',                timezone: 'America/Sao_Paulo',         currency: 'BRL', symbol: 'R$' },
  { name: 'Canada',                timezone: 'America/Toronto',           currency: 'CAD', symbol: 'C$' },
  { name: 'Chile',                 timezone: 'America/Santiago',          currency: 'CLP', symbol: '$'  },
  { name: 'China',                 timezone: 'Asia/Shanghai',             currency: 'CNY', symbol: '¥'  },
  { name: 'Colombia',              timezone: 'America/Bogota',            currency: 'COP', symbol: '$'  },
  { name: 'Czech Republic',        timezone: 'Europe/Prague',             currency: 'CZK', symbol: 'Kč' },
  { name: 'Denmark',               timezone: 'Europe/Copenhagen',         currency: 'DKK', symbol: 'kr' },
  { name: 'Egypt',                 timezone: 'Africa/Cairo',              currency: 'EGP', symbol: '£'  },
  { name: 'Finland',               timezone: 'Europe/Helsinki',           currency: 'EUR', symbol: '€'  },
  { name: 'France',                timezone: 'Europe/Paris',              currency: 'EUR', symbol: '€'  },
  { name: 'Germany',               timezone: 'Europe/Berlin',             currency: 'EUR', symbol: '€'  },
  { name: 'Greece',                timezone: 'Europe/Athens',             currency: 'EUR', symbol: '€'  },
  { name: 'Hong Kong',             timezone: 'Asia/Hong_Kong',            currency: 'HKD', symbol: 'HK$'},
  { name: 'Hungary',               timezone: 'Europe/Budapest',           currency: 'HUF', symbol: 'Ft' },
  { name: 'India',                 timezone: 'Asia/Kolkata',              currency: 'INR', symbol: '₹'  },
  { name: 'Indonesia',             timezone: 'Asia/Jakarta',              currency: 'IDR', symbol: 'Rp' },
  { name: 'Ireland',               timezone: 'Europe/Dublin',             currency: 'EUR', symbol: '€'  },
  { name: 'Israel',                timezone: 'Asia/Jerusalem',            currency: 'ILS', symbol: '₪'  },
  { name: 'Italy',                 timezone: 'Europe/Rome',               currency: 'EUR', symbol: '€'  },
  { name: 'Japan',                 timezone: 'Asia/Tokyo',                currency: 'JPY', symbol: '¥'  },
  { name: 'Kenya',                 timezone: 'Africa/Nairobi',            currency: 'KES', symbol: 'KSh'},
  { name: 'Malaysia',              timezone: 'Asia/Kuala_Lumpur',         currency: 'MYR', symbol: 'RM' },
  { name: 'Mexico',                timezone: 'America/Mexico_City',       currency: 'MXN', symbol: '$'  },
  { name: 'Netherlands',           timezone: 'Europe/Amsterdam',          currency: 'EUR', symbol: '€'  },
  { name: 'New Zealand',           timezone: 'Pacific/Auckland',          currency: 'NZD', symbol: 'NZ$'},
  { name: 'Nigeria',               timezone: 'Africa/Lagos',              currency: 'NGN', symbol: '₦'  },
  { name: 'Norway',                timezone: 'Europe/Oslo',               currency: 'NOK', symbol: 'kr' },
  { name: 'Pakistan',              timezone: 'Asia/Karachi',              currency: 'PKR', symbol: '₨'  },
  { name: 'Philippines',           timezone: 'Asia/Manila',               currency: 'PHP', symbol: '₱'  },
  { name: 'Poland',                timezone: 'Europe/Warsaw',             currency: 'PLN', symbol: 'zł' },
  { name: 'Portugal',              timezone: 'Europe/Lisbon',             currency: 'EUR', symbol: '€'  },
  { name: 'Romania',               timezone: 'Europe/Bucharest',          currency: 'RON', symbol: 'lei'},
  { name: 'Saudi Arabia',          timezone: 'Asia/Riyadh',               currency: 'SAR', symbol: '﷼'  },
  { name: 'Singapore',             timezone: 'Asia/Singapore',            currency: 'SGD', symbol: 'S$' },
  { name: 'South Africa',          timezone: 'Africa/Johannesburg',       currency: 'ZAR', symbol: 'R'  },
  { name: 'South Korea',           timezone: 'Asia/Seoul',                currency: 'KRW', symbol: '₩'  },
  { name: 'Spain',                 timezone: 'Europe/Madrid',             currency: 'EUR', symbol: '€'  },
  { name: 'Sweden',                timezone: 'Europe/Stockholm',          currency: 'SEK', symbol: 'kr' },
  { name: 'Switzerland',           timezone: 'Europe/Zurich',             currency: 'CHF', symbol: 'Fr' },
  { name: 'Taiwan',                timezone: 'Asia/Taipei',               currency: 'TWD', symbol: 'NT$'},
  { name: 'Thailand',              timezone: 'Asia/Bangkok',              currency: 'THB', symbol: '฿'  },
  { name: 'Turkey',                timezone: 'Europe/Istanbul',           currency: 'TRY', symbol: '₺'  },
  { name: 'Ukraine',               timezone: 'Europe/Kiev',               currency: 'UAH', symbol: '₴'  },
  { name: 'United Arab Emirates',  timezone: 'Asia/Dubai',                currency: 'AED', symbol: 'د.إ'},
  { name: 'United Kingdom',        timezone: 'Europe/London',             currency: 'GBP', symbol: '£'  },
  { name: 'United States',         timezone: 'America/New_York',          currency: 'USD', symbol: '$'  },
  { name: 'Vietnam',               timezone: 'Asia/Ho_Chi_Minh',          currency: 'VND', symbol: '₫'  },
]

export function getCountryInfo(name: string): CountryInfo | undefined {
  return COUNTRIES.find(c => c.name === name)
}
