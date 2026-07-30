import { useMemo, useState } from 'react'
import { FEATURE_ICON_CATEGORIES, resolveFeatureIcon, searchFeatureIcons } from '../lib/featureIcons'
import { IconCheck, IconSearch, IconX } from './icons'

/* ---------------------------------------------------------------------------------------
   Visual icon picker for the curated real-estate icon catalog. Search by name/keyword/
   category, filter by category, click to select. Emits the stable icon KEY (e.g.
   "swimming-pool") — the only thing the database ever stores. Styled for the dark admin.
   ------------------------------------------------------------------------------------- */
export default function IconPicker({ value = '', onChange }) {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')

  const results = useMemo(() => searchFeatureIcons(q, category), [q, category])
  const selected = resolveFeatureIcon(value)

  return (
    <div className="rounded-xl border border-white/10 bg-white/4 p-3 space-y-3">
      {/* current selection */}
      <div className="flex items-center gap-2 text-sm">
        {selected ? (
          <>
            <span className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <selected.Icon className="w-5 h-5" />
            </span>
            <span className="text-neutral-200">{selected.name}</span>
            <span className="text-[11px] text-neutral-500">({selected.key})</span>
            <IconCheck className="w-4 h-4 text-green-400" />
            <button type="button" onClick={() => onChange?.('')}
              className="ml-auto text-neutral-500 hover:text-red-400 flex items-center gap-1 text-xs transition-colors">
              <IconX className="w-3.5 h-3.5" /> Clear
            </button>
          </>
        ) : (
          <span className="text-neutral-500">No icon selected — pick one below (optional).</span>
        )}
      </div>

      {/* search */}
      <div className="relative">
        <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
        <input className="field-dark !pl-9 !py-2" placeholder="Search icons… (e.g. pool, car, security)"
          value={q} onChange={e => setQ(e.target.value)} aria-label="Search icons" />
      </div>

      {/* category filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button type="button" onClick={() => setCategory('')}
          className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${!category ? 'bg-primary text-white border-primary' : 'border-white/15 text-neutral-400 hover:border-primary hover:text-primary'}`}>
          All
        </button>
        {FEATURE_ICON_CATEGORIES.map(c => (
          <button key={c} type="button" onClick={() => setCategory(cat => cat === c ? '' : c)}
            className={`rounded-full border px-3 py-1 text-[11px] font-medium transition-colors ${category === c ? 'bg-primary text-white border-primary' : 'border-white/15 text-neutral-400 hover:border-primary hover:text-primary'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* icon grid */}
      {results.length === 0 ? (
        <p className="text-xs text-neutral-500 py-4 text-center">No icons match “{q}”. Try “pool”, “car”, “view”…</p>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {results.map(e => (
            <button key={e.key} type="button" title={`${e.name} (${e.category})`}
              onClick={() => onChange?.(e.key)} aria-pressed={value === e.key}
              className={`rounded-lg border p-2 flex flex-col items-center gap-1 transition-colors ${value === e.key ? 'border-primary bg-primary/15 text-primary' : 'border-white/8 text-neutral-300 hover:border-primary/60 hover:text-primary'}`}>
              <e.Icon className="w-5 h-5" />
              <span className="text-[9.5px] leading-tight text-center line-clamp-2">{e.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
