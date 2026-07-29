// ---------------------------------------------------------------------------------------
// Company information — the SINGLE place to edit anything that identifies the business.
//
// Everything the site renders as "who we are" (header wordmark, footer, page title,
// contact details, legal line) resolves back to this file. `seedSettings` in
// data/mockData.js spreads from it, and DataContext seeds its `settings` state from
// `seedSettings`, so editing a value here changes it everywhere at once.
//
// When a Settings module lands in the backend, this object becomes the fallback the
// context uses until the API responds — the components stay untouched either way.
// ---------------------------------------------------------------------------------------

export const COMPANY = {
  // Brand ---------------------------------------------------------------------------
  // Rendered as two parts: the first word in white, the rest in gold.
  name: 'AL-Madenah RealEstate',
  tagline: "Qatar's Most Exclusive Real Estate Portal",

  // Contact -------------------------------------------------------------------------
  phone: '+974 4444 8800',
  whatsapp: '97444448800',          // digits only — used to build https://wa.me/<number>
  email: 'hello@almadenah.example',

  // Footer copy ---------------------------------------------------------------------
  about: 'AL-Madenah RealEstate is the country’s destination for exceptional homes — a curated portfolio across The Pearl, Lusail and West Bay, backed by a team that treats every transaction as a reference.',

  // Arabic licence line shown in the footer. Rendered with dir="rtl" so the text
  // shapes and aligns correctly next to the English copy.
  aboutAr: 'شركة قطرية مرخّصة ومعتمدة من الجهات الرسمية بدولة قطر',

  // Legal ---------------------------------------------------------------------------
  // PLACEHOLDER — not a real registration number and not verified against any
  // official record. Replace the value below with the number issued to the company
  // before the site is treated as publishing official information. Nothing else
  // needs to change: the footer reads this single field.
  taxNumber: '000000000000',

  // Social ---------------------------------------------------------------------------
  instagram: '#', linkedin: '#', youtube: '#', x: '#',

  // Public review score shown next to the brand in the footer.
  googleRating: 4.9,
  googleReviews: 337,
}

// Convenience: "AL-Madenah RealEstate" → ['AL-Madenah', 'RealEstate'] for the two-tone
// wordmark used in the header and footer.
export const brandParts = (name = COMPANY.name) => {
  const [first, ...rest] = String(name).split(' ')
  return [first, rest.join(' ')]
}
