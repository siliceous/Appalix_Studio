export interface LanguageOption {
  value: string  // stored in DB; 'auto' = match user language
  label: string  // display name
}

export interface LanguageGroup {
  group: string
  options: LanguageOption[]
}

export const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    group: 'Auto',
    options: [
      { value: 'auto', label: 'Auto — match the user\'s language' },
    ],
  },
  {
    group: 'English',
    options: [
      { value: 'English (US)',        label: 'English (US)' },
      { value: 'English (UK)',        label: 'English (UK)' },
      { value: 'English (Australia)', label: 'English (Australia)' },
      { value: 'English (Canada)',    label: 'English (Canada)' },
      { value: 'English (India)',     label: 'English (India)' },
    ],
  },
  {
    group: 'European',
    options: [
      { value: 'French',      label: 'French' },
      { value: 'Spanish',     label: 'Spanish' },
      { value: 'Portuguese',  label: 'Portuguese (European)' },
      { value: 'German',      label: 'German' },
      { value: 'Italian',     label: 'Italian' },
      { value: 'Dutch',       label: 'Dutch' },
      { value: 'Polish',      label: 'Polish' },
      { value: 'Swedish',     label: 'Swedish' },
      { value: 'Norwegian',   label: 'Norwegian' },
      { value: 'Danish',      label: 'Danish' },
      { value: 'Finnish',     label: 'Finnish' },
      { value: 'Czech',       label: 'Czech' },
      { value: 'Slovak',      label: 'Slovak' },
      { value: 'Hungarian',   label: 'Hungarian' },
      { value: 'Romanian',    label: 'Romanian' },
      { value: 'Bulgarian',   label: 'Bulgarian' },
      { value: 'Croatian',    label: 'Croatian' },
      { value: 'Serbian',     label: 'Serbian' },
      { value: 'Greek',       label: 'Greek' },
      { value: 'Turkish',     label: 'Turkish' },
      { value: 'Ukrainian',   label: 'Ukrainian' },
      { value: 'Russian',     label: 'Russian' },
      { value: 'Catalan',     label: 'Catalan' },
      { value: 'Welsh',       label: 'Welsh' },
      { value: 'Lithuanian',  label: 'Lithuanian' },
      { value: 'Latvian',     label: 'Latvian' },
      { value: 'Estonian',    label: 'Estonian' },
      { value: 'Albanian',    label: 'Albanian' },
    ],
  },
  {
    group: 'Latin America',
    options: [
      { value: 'Spanish (Mexico)',    label: 'Spanish (Mexico)' },
      { value: 'Spanish (Colombia)',  label: 'Spanish (Colombia)' },
      { value: 'Spanish (Argentina)', label: 'Spanish (Argentina)' },
      { value: 'Brazilian Portuguese', label: 'Portuguese (Brazil)' },
    ],
  },
  {
    group: 'Indian Subcontinent',
    options: [
      { value: 'Hindi',      label: 'Hindi' },
      { value: 'Bengali',    label: 'Bengali' },
      { value: 'Tamil',      label: 'Tamil' },
      { value: 'Telugu',     label: 'Telugu' },
      { value: 'Kannada',    label: 'Kannada' },
      { value: 'Malayalam',  label: 'Malayalam' },
      { value: 'Marathi',    label: 'Marathi' },
      { value: 'Gujarati',   label: 'Gujarati' },
      { value: 'Punjabi',    label: 'Punjabi' },
      { value: 'Urdu',       label: 'Urdu' },
      { value: 'Odia',       label: 'Odia' },
      { value: 'Assamese',   label: 'Assamese' },
      { value: 'Nepali',     label: 'Nepali' },
      { value: 'Sinhala',    label: 'Sinhala' },
    ],
  },
  {
    group: 'Southeast Asia',
    options: [
      { value: 'Indonesian',  label: 'Indonesian (Bahasa Indonesia)' },
      { value: 'Malay',       label: 'Malay (Bahasa Malaysia)' },
      { value: 'Filipino',    label: 'Filipino / Tagalog' },
      { value: 'Vietnamese',  label: 'Vietnamese' },
      { value: 'Thai',        label: 'Thai' },
      { value: 'Burmese',     label: 'Burmese' },
      { value: 'Khmer',       label: 'Khmer (Cambodian)' },
      { value: 'Lao',         label: 'Lao' },
    ],
  },
  {
    group: 'East Asia',
    options: [
      { value: 'Chinese (Simplified)',  label: 'Chinese (Simplified)' },
      { value: 'Chinese (Traditional)', label: 'Chinese (Traditional)' },
      { value: 'Japanese',              label: 'Japanese' },
      { value: 'Korean',                label: 'Korean' },
    ],
  },
  {
    group: 'Middle East & Central Asia',
    options: [
      { value: 'Arabic',    label: 'Arabic' },
      { value: 'Hebrew',    label: 'Hebrew' },
      { value: 'Persian',   label: 'Persian / Farsi' },
      { value: 'Pashto',    label: 'Pashto' },
      { value: 'Kurdish',   label: 'Kurdish' },
      { value: 'Kazakh',    label: 'Kazakh' },
      { value: 'Uzbek',     label: 'Uzbek' },
      { value: 'Georgian',  label: 'Georgian' },
      { value: 'Armenian',  label: 'Armenian' },
    ],
  },
  {
    group: 'African',
    options: [
      { value: 'Swahili',    label: 'Swahili' },
      { value: 'Amharic',    label: 'Amharic' },
      { value: 'Hausa',      label: 'Hausa' },
      { value: 'Yoruba',     label: 'Yoruba' },
      { value: 'Igbo',       label: 'Igbo' },
      { value: 'Zulu',       label: 'Zulu' },
      { value: 'Afrikaans',  label: 'Afrikaans' },
      { value: 'Somali',     label: 'Somali' },
    ],
  },
]

/** Flat list for simple iteration */
export const LANGUAGES: LanguageOption[] = LANGUAGE_GROUPS.flatMap((g) => g.options)
