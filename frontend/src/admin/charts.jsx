import { useId, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------------------
//  Dashboard chart primitives — hand-rolled SVG, no chart library, no new dependency.
//
//  COLOR: every series colour below was validated against the admin panel surface
//  (#232438 = --color-coal) as a categorical palette: lightness band, chroma floor,
//  colour-vision-deficiency separation of ADJACENT pairs, normal-vision floor and 3:1
//  contrast. The ORDER is the CVD-safety mechanism, not decoration — SERIES[] must keep
//  its order (green → blue → red → violet, worst adjacent ΔE 19.6) or it stops passing.
//
//  Text never wears a series colour: values, labels and axes stay in neutral ink and the
//  coloured mark beside them carries identity. Every chart also renders an sr-only table
//  of the same numbers, so identity is never carried by colour alone.
// ---------------------------------------------------------------------------------------

export const BRAND = '#EF233C'          // single-series accent (3.4:1 on #232438)

// Fixed slot order — see the note above before reordering.
export const SERIES = {
  published: { key: 'published', label: 'Published', color: '#199e70' },
  rented:    { key: 'rented',    label: 'Rented',    color: '#3987e5' },
  sold:      { key: 'sold',      label: 'Sold',      color: '#EF233C' },
  archived:  { key: 'archived',  label: 'Archived',  color: '#9085e9' },
}

const INK_MUTED = '#8D99AE'
const GRID = 'rgba(255,255,255,0.06)'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
export const fmt = (n) => (Number(n) || 0).toLocaleString()

// Catmull-Rom → cubic Bézier. This is what turns the old sharp polyline into a flowing
// wave. Control points are clamped to the plot band so a steep month cannot make the
// curve bulge past the axis — smoothing must never imply a value the data does not have.
function smoothPath(pts, top, bottom, tension = 0.22) {
  if (!pts.length) return ''
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1x = p1.x + (p2.x - p0.x) * tension
    const c1y = clamp(p1.y + (p2.y - p0.y) * tension, top, bottom)
    const c2x = p2.x - (p3.x - p1.x) * tension
    const c2y = clamp(p2.y - (p3.y - p1.y) * tension, top, bottom)
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// ---------------------------------------------------------------------------------------
//  WaveChart — compact smooth area / multi-line over 12 months.
//  One series  → filled wave with a gradient and a labelled peak.
//  2-4 series  → thin smooth lines + legend (never a filled stack: overlapping fills at
//                this size hide the small series).
// ---------------------------------------------------------------------------------------
export function WaveChart({ months, series, height = 150, valueSuffix = '' }) {
  const uid = useId().replace(/:/g, '')
  const [hover, setHover] = useState(null)
  const single = series.length === 1

  const W = 480, H = height, padL = 30, padR = 16, padT = 14, padB = 20
  const plotH = H - padT - padB
  const plotW = W - padL - padR
  const step = plotW / 11

  const all = series.flatMap(s => months.map(m => m[s.key] ?? 0))
  const maxV = Math.max(4, ...all)
  const yFor = v => padT + plotH * (1 - v / maxV)
  const xFor = i => padL + step * i
  const ticks = [0, Math.round(maxV / 2), maxV].filter((v, i, a) => a.indexOf(v) === i)

  const paths = series.map(s => {
    const pts = months.map((m, i) => ({ x: xFor(i), y: yFor(m[s.key] ?? 0) }))
    return { ...s, pts, line: smoothPath(pts, padT, padT + plotH) }
  })

  const peak = useMemo(() => {
    if (!single) return null
    const vals = months.map(m => m[series[0].key] ?? 0)
    const max = Math.max(...vals)
    return max > 0 ? { i: vals.indexOf(max), v: max } : null
  }, [months, series, single])

  return (
    <div className="relative">
      {/* Uniform scaling on purpose: `preserveAspectRatio="none"` would stretch the axis
          text horizontally and clip the December label at wide breakpoints. */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto"
        role="img" aria-label={`${series.map(s => s.label).join(', ')} per month`}>
        <defs>
          {paths.map(s => (
            <linearGradient key={s.key} id={`g-${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.38" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* recessive grid + value ticks, in muted ink — never a series colour */}
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={yFor(t)} y2={yFor(t)} stroke={GRID} strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <text x={padL - 6} y={yFor(t) + 3} textAnchor="end" fontSize="9" fill={INK_MUTED}>{t}</text>
          </g>
        ))}

        {single && (
          <path d={`${paths[0].line} L${xFor(11)},${padT + plotH} L${padL},${padT + plotH} Z`}
            fill={`url(#g-${uid}-${paths[0].key})`} />
        )}

        {paths.map(s => (
          <path key={s.key} d={s.line} fill="none" stroke={s.color} strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        ))}

        {/* selective direct label: the peak only — every other number lives in the tooltip */}
        {single && peak && (
          <>
            <circle cx={xFor(peak.i)} cy={yFor(peak.v)} r="3.5" fill={paths[0].color} stroke="#232438" strokeWidth="2" />
            <text x={clamp(xFor(peak.i), padL + 12, W - padR - 12)} y={Math.max(padT + 8, yFor(peak.v) - 8)}
              textAnchor="middle" fontSize="10" fontWeight="700" fill="#E7E9EE">{fmt(peak.v)}</text>
          </>
        )}

        {hover != null && (
          <>
            <line x1={xFor(hover)} x2={xFor(hover)} y1={padT} y2={padT + plotH}
              stroke="rgba(255,255,255,0.22)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {paths.map(s => (
              <circle key={s.key} cx={xFor(hover)} cy={yFor(months[hover][s.key] ?? 0)} r="3.5"
                fill={s.color} stroke="#232438" strokeWidth="2" />
            ))}
          </>
        )}

        {months.map((m, i) => (
          <g key={m.month}>
            {(i % 2 === 0 || single) && (
              <text x={xFor(i)} y={H - 5} textAnchor="middle" fontSize="9" fill={INK_MUTED}>{MONTHS_SHORT[i]}</text>
            )}
            {/* hit target is the whole month column — much larger than the mark */}
            <rect x={xFor(i) - step / 2} y={0} width={step} height={H} fill="transparent"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          </g>
        ))}
      </svg>

      {hover != null && (
        <div className="absolute top-0 z-10 pointer-events-none rounded-lg border border-white/12 bg-[#171826] px-2.5 py-1.5 text-[11px] shadow-xl shadow-black/50 whitespace-nowrap"
          style={{ left: `${(xFor(hover) / W) * 100}%`, transform: `translateX(${hover > 7 ? '-100%' : hover < 3 ? '0' : '-50%'})` }}>
          <div className="text-neutral-400 mb-0.5">{months[hover].monthName}</div>
          {series.map(s => (
            <div key={s.key} className="flex items-center gap-1.5 text-neutral-200">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-neutral-400">{s.label}</span>
              <span className="font-semibold ml-auto pl-3">{fmt(months[hover][s.key] ?? 0)}{valueSuffix}</span>
            </div>
          ))}
        </div>
      )}

      {!single && (
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 mt-2">
          {series.map(s => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[10.5px] text-neutral-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />{s.label}
            </span>
          ))}
        </div>
      )}

      {/* The same numbers as a table, for screen readers — so identity is never carried by
          colour alone. The WRAPPER takes sr-only, not the table: a table box expands to fit
          its content regardless of a 1px width clamp, which pushes the page sideways. */}
      <div className="sr-only">
        <table>
          <caption>{series.map(s => s.label).join(', ')} per month</caption>
          <thead><tr><th>Month</th>{series.map(s => <th key={s.key}>{s.label}</th>)}</tr></thead>
          <tbody>
            {months.map(m => (
              <tr key={m.month}><th scope="row">{m.monthName}</th>
                {series.map(s => <td key={s.key}>{m[s.key] ?? 0}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------
//  Sparkline — a 12-point wave for a stat tile. Decorative scale, exact number beside it.
// ---------------------------------------------------------------------------------------
export function Sparkline({ values, color = BRAND, width = 62, height = 26 }) {
  const uid = useId().replace(/:/g, '')
  if (!values?.length) return null
  const max = Math.max(1, ...values)
  const step = width / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => ({ x: i * step, y: height - 2 - (v / max) * (height - 5) }))
  const line = smoothPath(pts, 1, height - 1)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={`s-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#s-${uid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ---------------------------------------------------------------------------------------
//  StatTile — the headline number. A trend chip appears ONLY when a real previous period
//  exists in the data; there is no placeholder percentage.
// ---------------------------------------------------------------------------------------
export function StatTile({ label, value, icon, trend, spark, sparkColor, hint }) {
  return (
    <div className="panel-dark p-3.5 sm:p-4 flex flex-col justify-between min-h-[104px] min-w-0">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] font-medium uppercase tracking-wider text-neutral-500 leading-tight">{label}</span>
        {icon && <span className="text-neutral-600 shrink-0">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2 mt-2">
        <div className="min-w-0">
          <div className="text-2xl sm:text-[26px] font-bold tracking-tight text-white leading-none truncate">{value}</div>
          {trend != null
            ? (
              <div className="mt-1.5 flex items-baseline gap-1 whitespace-nowrap">
                <span className={`text-[11px] font-bold ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-neutral-500'}`}>
                  <span aria-hidden="true">{trend > 0 ? '▲' : trend < 0 ? '▼' : '–'}</span>
                  {trend === 0 ? ' 0' : ` ${Math.abs(trend)}`}
                </span>
                <span className="text-[10px] text-neutral-600">vs last mo.</span>
              </div>
            )
            : hint && <div className="mt-1.5 text-[10.5px] text-neutral-600 truncate">{hint}</div>}
        </div>
        {spark && <Sparkline values={spark} color={sparkColor || BRAND} />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------
//  Donut — composition of a whole. Slices carry a 2px surface gap so adjacent bands stay
//  separable; the legend beside it names and counts every slice, so the ring is never the
//  only carrier of meaning.
// ---------------------------------------------------------------------------------------
export function Donut({ slices, total, centerLabel, size = 128 }) {
  const sum = slices.reduce((a, s) => a + s.value, 0)
  const r = size / 2 - 9
  const c = size / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90" role="img"
        aria-label={slices.map(s => `${s.label} ${s.value}`).join(', ')}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="11" />
        {sum > 0 && slices.filter(s => s.value > 0).map(s => {
          const len = (s.value / sum) * circ
          const el = (
            <circle key={s.label} cx={c} cy={c} r={r} fill="none" stroke={s.color} strokeWidth="11"
              strokeDasharray={`${Math.max(0, len - 2)} ${circ - Math.max(0, len - 2)}`}
              strokeDashoffset={-offset} strokeLinecap="butt" />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="min-w-0 flex-1">
        {centerLabel && (
          <div className="mb-2">
            <div className="text-xl font-bold text-white leading-none">{fmt(total ?? sum)}</div>
            <div className="text-[10.5px] text-neutral-500 mt-1">{centerLabel}</div>
          </div>
        )}
        <ul className="space-y-1">
          {slices.map(s => (
            <li key={s.label} className="flex items-center gap-2 text-[11.5px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              <span className="text-neutral-400 truncate">{s.label}</span>
              <span className="ml-auto font-semibold text-neutral-200 tabular-nums">{fmt(s.value)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------
//  BarList — ranked distribution (types, cities, agents, lead stages). Magnitude is the
//  bar length; the exact count sits beside it, so the bar is a scan aid, not the datum.
// ---------------------------------------------------------------------------------------
export function BarList({ rows, color = BRAND, emptyMessage = 'No data yet.' }) {
  const max = Math.max(1, ...rows.map(r => r.value))
  if (!rows.length) return <p className="text-xs text-neutral-500 py-3">{emptyMessage}</p>
  return (
    <ul className="space-y-2">
      {rows.map(r => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-[11.5px] text-neutral-300 truncate">{r.label}</span>
            <span className="text-[11.5px] font-semibold text-neutral-200 tabular-nums shrink-0">{fmt(r.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color || color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
