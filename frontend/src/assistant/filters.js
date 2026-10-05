// ---------------------------------------------------------------------------------------
// The filter algebra behind the conversation: how one parsed message changes the criteria
// the search is running with. Pure functions, no React — they used to live inside
// useAssistant.js, where the only way to reach them was to render the whole app.
//
// Three rules matter here and all three have broken silently before:
//   • filters ACCUMULATE across turns («للإيجار» after «شقة في لوسيل» refines, not restarts)
//   • a removal clears every form of the condition it names, not just the obvious one
//   • the two kinds of area condition — a place the lexicon knows and a free-text place it
//     does not — are alternatives and never both apply at once
// ---------------------------------------------------------------------------------------

export const hasAny = (f) => !!(f.purpose || f.type || f.location || f.unknownPlace
  || f.beds != null || f.baths != null
  || f.minArea != null || f.maxArea != null || f.minPrice != null || f.maxPrice != null
  || (f.amenities && f.amenities.length) || (f.excludeAmenities && f.excludeAmenities.length)
  || f.featured)

export function applyRemovals(filters, removals) {
  const f = { ...filters }
  for (const r of removals) {
    switch (r.kind) {
      case 'amenity':
        f.amenities = (f.amenities || []).filter((a) => a !== r.key)
        if (!f.amenities.length) delete f.amenities
        // «شيل شرط المسبح» also lifts an earlier «بدون مسبح» — the user is cancelling the
        // condition, and which direction they set it in is not something they have to repeat.
        if (f.excludeAmenities) {
          f.excludeAmenities = f.excludeAmenities.filter((a) => a !== r.key)
          if (!f.excludeAmenities.length) delete f.excludeAmenities
        }
        break
      // «شيل المنطقة» has to clear BOTH kinds of area condition — the one the lexicon knows
      // and the free-text one it does not — or the search stays pinned to a place the user
      // just asked to drop.
      case 'location': delete f.location; delete f.unknownPlace; break
      case 'type': delete f.type; break
      case 'price': delete f.minPrice; delete f.maxPrice; break
      case 'beds': delete f.beds; delete f.bedsExact; break
      case 'baths': delete f.baths; break
      case 'size': delete f.minArea; delete f.maxArea; break
      case 'featured': delete f.featured; break
      default: break
    }
  }
  return f
}

export function mergeSlots(filters, slots) {
  const f = { ...filters }
  for (const [k, v] of Object.entries(slots)) {
    if (v == null) continue
    if (k === 'amenities' || k === 'excludeAmenities') {
      f[k] = [...new Set([...(f[k] || []), ...v])]
    } else {
      f[k] = v
    }
  }

  // «مع مسبح» after «بدون مسبح» (or the reverse) is the user changing their mind, not asking
  // for both at once — which would match nothing. The newest message wins.
  const flip = (winner, loser) => {
    if (!slots[winner]?.length || !f[loser]?.length) return
    f[loser] = f[loser].filter((a) => !slots[winner].includes(a))
    if (!f[loser].length) delete f[loser]
  }
  flip('amenities', 'excludeAmenities')
  flip('excludeAmenities', 'amenities')

  // Switching between renting and buying invalidates a budget carried over from the other
  // one. A rent of 8,000/month and a sale price of 8,000 are not the same number in any
  // sense — about a thousand to one apart here — so keeping it turns "actually, to buy"
  // into a search for properties under 8,000 QAR, which finds nothing and looks like the
  // site is empty. Dropped, unless THIS message set the budget itself.
  if (slots.purpose && filters.purpose && slots.purpose !== filters.purpose
      && slots.minPrice == null && slots.maxPrice == null
      && (f.minPrice != null || f.maxPrice != null)) {
    f.droppedBudget = { min: f.minPrice ?? null, max: f.maxPrice ?? null, from: filters.purpose }
    delete f.minPrice
    delete f.maxPrice
  } else {
    delete f.droppedBudget
  }
  // Naming a place the lexicon knows replaces an earlier free-text area, and naming one it
  // does not know replaces the earlier known area. Otherwise «خليها في الدفنة» would search
  // Lusail AND الدفنة at the same time and find nothing at all.
  if (slots.location) delete f.unknownPlace
  else if (slots.unknownPlace) delete f.location
  return f
}
