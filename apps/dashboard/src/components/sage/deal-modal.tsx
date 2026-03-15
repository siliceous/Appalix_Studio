'use client'

import { useState, useTransition } from 'react'
import { X, Loader2 } from 'lucide-react'
import { createDeal } from '@/app/actions/sage'
import { DatePicker } from './date-picker'
import type { SageContact, SagePipelineStage, SagePipeline } from '@/lib/types'

interface DealModalProps {
  pipelineId:     string
  stages:         SagePipelineStage[]
  contacts:       Pick<SageContact, 'id' | 'name'>[]
  allPipelines:   Pick<SagePipeline, 'id' | 'name'>[]
  ownerName:      string
  defaultStageId?: string
  onClose:        () => void
}

const FIELD_CLS = 'w-full px-3 py-2 text-sm border dark:border-white/10 rounded-lg bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-[#15A4AE]'
const LABEL_CLS = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5'

export function DealModal({
  pipelineId,
  stages,
  contacts,
  allPipelines,
  ownerName,
  defaultStageId,
  onClose,
}: DealModalProps) {
  const [pending, startTransition] = useTransition()
  const [closeDate, setCloseDate] = useState('')

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // pipeline_id comes from the <select> named "pipeline_id" in the form
    startTransition(async () => {
      await createDeal(formData)
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#232323] rounded-2xl border dark:border-white/8 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/8 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Add an Opportunity</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">

          {/* Name */}
          <div>
            <label className={LABEL_CLS}>Name <span className="text-red-500">*</span></label>
            <input
              name="title"
              type="text"
              required
              autoFocus
              placeholder="e.g. Acme Corp — Enterprise plan"
              className={FIELD_CLS}
            />
          </div>

          {/* Pipeline + Stage (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Pipeline</label>
              <select name="pipeline_id" defaultValue={pipelineId} className={FIELD_CLS}>
                {allPipelines.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Stage</label>
              <select
                name="stage_id"
                defaultValue={defaultStageId ?? stages[0]?.id ?? ''}
                className={FIELD_CLS}
              >
                {stages.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Contact + Company (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>
                Contact <span className="text-gray-400 font-normal">(existing or new)</span>
              </label>
              <input
                name="contact_name"
                type="text"
                list="deal-modal-contacts"
                placeholder="Type a name…"
                className={FIELD_CLS}
                autoComplete="off"
              />
              <datalist id="deal-modal-contacts">
                {contacts.map(c => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={LABEL_CLS}>Company</label>
              <input
                name="company_name"
                type="text"
                placeholder="e.g. Acme Corp"
                className={FIELD_CLS}
              />
            </div>
          </div>

          {/* Status + Owner (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Status</label>
              <select name="status" defaultValue="open" className={FIELD_CLS}>
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Owner</label>
              <input
                type="text"
                value={ownerName}
                readOnly
                className={`${FIELD_CLS} opacity-60 cursor-default`}
              />
            </div>
          </div>

          {/* Value + Currency (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Value</label>
              <input
                name="value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className={FIELD_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Currency</label>
              <select name="currency" defaultValue="USD" className={FIELD_CLS}>
                <option value="USD">USD – US Dollar</option>
                <option value="EUR">EUR – Euro</option>
                <option value="GBP">GBP – British Pound</option>
                <option value="AUD">AUD – Australian Dollar</option>
                <option value="CAD">CAD – Canadian Dollar</option>
                <option value="AED">AED – UAE Dirham</option>
                <option value="AFN">AFN – Afghan Afghani</option>
                <option value="ALL">ALL – Albanian Lek</option>
                <option value="AMD">AMD – Armenian Dram</option>
                <option value="ANG">ANG – Netherlands Antillean Guilder</option>
                <option value="AOA">AOA – Angolan Kwanza</option>
                <option value="ARS">ARS – Argentine Peso</option>
                <option value="AWG">AWG – Aruban Florin</option>
                <option value="AZN">AZN – Azerbaijani Manat</option>
                <option value="BAM">BAM – Bosnia-Herzegovina Convertible Mark</option>
                <option value="BBD">BBD – Barbadian Dollar</option>
                <option value="BDT">BDT – Bangladeshi Taka</option>
                <option value="BGN">BGN – Bulgarian Lev</option>
                <option value="BHD">BHD – Bahraini Dinar</option>
                <option value="BIF">BIF – Burundian Franc</option>
                <option value="BMD">BMD – Bermudian Dollar</option>
                <option value="BND">BND – Brunei Dollar</option>
                <option value="BOB">BOB – Bolivian Boliviano</option>
                <option value="BRL">BRL – Brazilian Real</option>
                <option value="BSD">BSD – Bahamian Dollar</option>
                <option value="BTN">BTN – Bhutanese Ngultrum</option>
                <option value="BWP">BWP – Botswanan Pula</option>
                <option value="BYN">BYN – Belarusian Ruble</option>
                <option value="BZD">BZD – Belize Dollar</option>
                <option value="CDF">CDF – Congolese Franc</option>
                <option value="CHF">CHF – Swiss Franc</option>
                <option value="CLP">CLP – Chilean Peso</option>
                <option value="CNY">CNY – Chinese Yuan</option>
                <option value="COP">COP – Colombian Peso</option>
                <option value="CRC">CRC – Costa Rican Colón</option>
                <option value="CUP">CUP – Cuban Peso</option>
                <option value="CVE">CVE – Cape Verdean Escudo</option>
                <option value="CZK">CZK – Czech Koruna</option>
                <option value="DJF">DJF – Djiboutian Franc</option>
                <option value="DKK">DKK – Danish Krone</option>
                <option value="DOP">DOP – Dominican Peso</option>
                <option value="DZD">DZD – Algerian Dinar</option>
                <option value="EGP">EGP – Egyptian Pound</option>
                <option value="ERN">ERN – Eritrean Nakfa</option>
                <option value="ETB">ETB – Ethiopian Birr</option>
                <option value="FJD">FJD – Fijian Dollar</option>
                <option value="FKP">FKP – Falkland Islands Pound</option>
                <option value="GEL">GEL – Georgian Lari</option>
                <option value="GHS">GHS – Ghanaian Cedi</option>
                <option value="GIP">GIP – Gibraltar Pound</option>
                <option value="GMD">GMD – Gambian Dalasi</option>
                <option value="GNF">GNF – Guinean Franc</option>
                <option value="GTQ">GTQ – Guatemalan Quetzal</option>
                <option value="GYD">GYD – Guyanaese Dollar</option>
                <option value="HKD">HKD – Hong Kong Dollar</option>
                <option value="HNL">HNL – Honduran Lempira</option>
                <option value="HTG">HTG – Haitian Gourde</option>
                <option value="HUF">HUF – Hungarian Forint</option>
                <option value="IDR">IDR – Indonesian Rupiah</option>
                <option value="ILS">ILS – Israeli New Shekel</option>
                <option value="INR">INR – Indian Rupee</option>
                <option value="IQD">IQD – Iraqi Dinar</option>
                <option value="IRR">IRR – Iranian Rial</option>
                <option value="ISK">ISK – Icelandic Króna</option>
                <option value="JMD">JMD – Jamaican Dollar</option>
                <option value="JOD">JOD – Jordanian Dinar</option>
                <option value="JPY">JPY – Japanese Yen</option>
                <option value="KES">KES – Kenyan Shilling</option>
                <option value="KGS">KGS – Kyrgystani Som</option>
                <option value="KHR">KHR – Cambodian Riel</option>
                <option value="KMF">KMF – Comorian Franc</option>
                <option value="KPW">KPW – North Korean Won</option>
                <option value="KRW">KRW – South Korean Won</option>
                <option value="KWD">KWD – Kuwaiti Dinar</option>
                <option value="KYD">KYD – Cayman Islands Dollar</option>
                <option value="KZT">KZT – Kazakhstani Tenge</option>
                <option value="LAK">LAK – Laotian Kip</option>
                <option value="LBP">LBP – Lebanese Pound</option>
                <option value="LKR">LKR – Sri Lankan Rupee</option>
                <option value="LRD">LRD – Liberian Dollar</option>
                <option value="LSL">LSL – Lesotho Loti</option>
                <option value="LYD">LYD – Libyan Dinar</option>
                <option value="MAD">MAD – Moroccan Dirham</option>
                <option value="MDL">MDL – Moldovan Leu</option>
                <option value="MGA">MGA – Malagasy Ariary</option>
                <option value="MKD">MKD – Macedonian Denar</option>
                <option value="MMK">MMK – Myanmar Kyat</option>
                <option value="MNT">MNT – Mongolian Tögrög</option>
                <option value="MOP">MOP – Macanese Pataca</option>
                <option value="MRU">MRU – Mauritanian Ouguiya</option>
                <option value="MUR">MUR – Mauritian Rupee</option>
                <option value="MVR">MVR – Maldivian Rufiyaa</option>
                <option value="MWK">MWK – Malawian Kwacha</option>
                <option value="MXN">MXN – Mexican Peso</option>
                <option value="MYR">MYR – Malaysian Ringgit</option>
                <option value="MZN">MZN – Mozambican Metical</option>
                <option value="NAD">NAD – Namibian Dollar</option>
                <option value="NGN">NGN – Nigerian Naira</option>
                <option value="NIO">NIO – Nicaraguan Córdoba</option>
                <option value="NOK">NOK – Norwegian Krone</option>
                <option value="NPR">NPR – Nepalese Rupee</option>
                <option value="NZD">NZD – New Zealand Dollar</option>
                <option value="OMR">OMR – Omani Rial</option>
                <option value="PAB">PAB – Panamanian Balboa</option>
                <option value="PEN">PEN – Peruvian Sol</option>
                <option value="PGK">PGK – Papua New Guinean Kina</option>
                <option value="PHP">PHP – Philippine Peso</option>
                <option value="PKR">PKR – Pakistani Rupee</option>
                <option value="PLN">PLN – Polish Złoty</option>
                <option value="PYG">PYG – Paraguayan Guaraní</option>
                <option value="QAR">QAR – Qatari Riyal</option>
                <option value="RON">RON – Romanian Leu</option>
                <option value="RSD">RSD – Serbian Dinar</option>
                <option value="RUB">RUB – Russian Ruble</option>
                <option value="RWF">RWF – Rwandan Franc</option>
                <option value="SAR">SAR – Saudi Riyal</option>
                <option value="SBD">SBD – Solomon Islands Dollar</option>
                <option value="SCR">SCR – Seychellois Rupee</option>
                <option value="SDG">SDG – Sudanese Pound</option>
                <option value="SEK">SEK – Swedish Krona</option>
                <option value="SGD">SGD – Singapore Dollar</option>
                <option value="SHP">SHP – Saint Helena Pound</option>
                <option value="SLE">SLE – Sierra Leonean Leone</option>
                <option value="SOS">SOS – Somali Shilling</option>
                <option value="SRD">SRD – Surinamese Dollar</option>
                <option value="STN">STN – São Tomé &amp; Príncipe Dobra</option>
                <option value="SYP">SYP – Syrian Pound</option>
                <option value="SZL">SZL – Swazi Lilangeni</option>
                <option value="THB">THB – Thai Baht</option>
                <option value="TJS">TJS – Tajikistani Somoni</option>
                <option value="TMT">TMT – Turkmenistani Manat</option>
                <option value="TND">TND – Tunisian Dinar</option>
                <option value="TOP">TOP – Tongan Paʻanga</option>
                <option value="TRY">TRY – Turkish Lira</option>
                <option value="TTD">TTD – Trinidad &amp; Tobago Dollar</option>
                <option value="TWD">TWD – New Taiwan Dollar</option>
                <option value="TZS">TZS – Tanzanian Shilling</option>
                <option value="UAH">UAH – Ukrainian Hryvnia</option>
                <option value="UGX">UGX – Ugandan Shilling</option>
                <option value="UYU">UYU – Uruguayan Peso</option>
                <option value="UZS">UZS – Uzbekistani Soʻm</option>
                <option value="VES">VES – Venezuelan Bolívar</option>
                <option value="VND">VND – Vietnamese Đồng</option>
                <option value="VUV">VUV – Vanuatu Vatu</option>
                <option value="WST">WST – Samoan Tālā</option>
                <option value="XAF">XAF – Central African CFA Franc</option>
                <option value="XCD">XCD – East Caribbean Dollar</option>
                <option value="XOF">XOF – West African CFA Franc</option>
                <option value="XPF">XPF – CFP Franc</option>
                <option value="YER">YER – Yemeni Rial</option>
                <option value="ZAR">ZAR – South African Rand</option>
                <option value="ZMW">ZMW – Zambian Kwacha</option>
                <option value="ZWL">ZWL – Zimbabwean Dollar</option>
              </select>
            </div>
          </div>

          {/* Close Date + Source (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Close Date</label>
              <DatePicker
                name="close_date"
                value={closeDate}
                onChange={setCloseDate}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Source</label>
              <select name="source" className={FIELD_CLS}>
                <option value="">Select…</option>
                <option value="manual">Manual</option>
                <option value="chat">Chat</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social</option>
              </select>
            </div>
          </div>

          {/* Priority + Win % (2 col) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLS}>Priority</label>
              <select name="priority" className={FIELD_CLS}>
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Win %</label>
              <input
                name="win_percentage"
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="0–100"
                className={FIELD_CLS}
              />
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className={LABEL_CLS}>Visibility</label>
            <select name="visibility" defaultValue="everyone" className={FIELD_CLS}>
              <option value="everyone">Everyone</option>
              <option value="team">Team</option>
              <option value="only_me">Only me</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={LABEL_CLS}>Description</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Notes about this deal…"
              className={`${FIELD_CLS} resize-none`}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={LABEL_CLS}>Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
            <input
              name="tags"
              type="text"
              placeholder="e.g. enterprise, q2, high-value"
              className={FIELD_CLS}
            />
          </div>

          <div className="flex gap-3 pt-1 pb-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm border dark:border-white/10 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl transition-colors disabled:opacity-60"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {pending ? 'Adding…' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
