// ---------------------------------------------------------------------------------------
// Local-only assistant analytics — NO external service, NO network call, NO cost.
//
// Every search the assistant performs appends one compact record to a capped ring buffer
// in localStorage ('qre.assistant.stats'). That is enough to answer, later and offline:
// most-requested areas, most-requested types, most-used filters, total searches.
// An admin screen (or a one-off export) can read the same key when the time comes.
// ---------------------------------------------------------------------------------------
const KEY = 'qre.assistant.stats'
const CAP = 300

export function recordSearch(filters, resultCount, lang) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    list.push({
      at: new Date().toISOString(),
      lang,
      purpose: filters.purpose ?? null,
      type: filters.type ?? null,
      location: filters.location ?? null,
      beds: filters.beds ?? null,
      maxPrice: filters.maxPrice ?? null,
      minPrice: filters.minPrice ?? null,
      amenities: filters.amenities?.length ? filters.amenities : undefined,
      results: resultCount,
    })
    localStorage.setItem(KEY, JSON.stringify(list.slice(-CAP)))
  } catch { /* storage blocked — analytics are strictly optional */ }
}

export function readStats() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}
