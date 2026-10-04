// ---------------------------------------------------------------------------------------
// Small display rules shared by every card, so the two card components cannot disagree
// about the same listing.
// ---------------------------------------------------------------------------------------

// Types that have no bedrooms or bathrooms to speak of. A plot of land stores 0 rooms,
// and "0 rooms" was being rendered as "Studio" — the compact map card advertised bare
// desert as a studio flat. Anything here shows its size only.
export const ROOMLESS_TYPES = ['Land', 'Commercial Shop', 'Office', 'Warehouse', 'Retail', 'Plot']

export const isRoomless = (type) => ROOMLESS_TYPES.includes(String(type || ''))
