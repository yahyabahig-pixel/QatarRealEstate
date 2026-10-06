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
//
// ========================================================================================
// FILL IN BEFORE THE SITE IS TREATED AS PUBLISHED
// ========================================================================================
// The fields listed below ship EMPTY on purpose. They used to carry stand-in values that
// the site published as though they were real:
//
//   email     was "hello@almadenah.example" — .example is a reserved TLD (RFC 2606) that
//             can never receive mail, so every "Email us" button on the site, and the
//             Careers page's "Apply" button, led to an address that silently bounces.
//   taxNumber was "000000000000" — the footer printed it as this company's registration
//             number on every page.
//   partners  was a list of eight real Qatari companies under the heading "Trusted by
//             Leading Partners & Developers" — a public claim of a business relationship
//             with each of them.
//
// An empty value is now HIDDEN rather than published: the email button, the tax line and
// the partner strip simply do not render. Fill a value in and it appears again — nothing
// else in the code needs to change.
// ========================================================================================

export const COMPANY = {
  // Brand ---------------------------------------------------------------------------
  // Rendered as two parts: the first word in white, the rest in brand red.
  name: 'AL-Madenah RealEstate',
  tagline: "Qatar's Most Exclusive Real Estate Portal",

  // Contact -------------------------------------------------------------------------
  // Phone and whatsapp are the SAME number in two shapes: readable for a human,
  // digits-only for the https://wa.me/<number> link. Change one and change the other.
  phone: '+974 7006 6675',
  whatsapp: '97470066675',          // digits only — used to build https://wa.me/<number>
  // FILL IN: the real inbox that should receive enquiries and job applications.
  email: 'Almadenah.realestate@yahoo.com',

  // Footer copy ---------------------------------------------------------------------
  about: 'AL-Madenah RealEstate is the country’s destination for exceptional homes — a curated portfolio across The Pearl, Lusail and West Bay, backed by a team that treats every transaction as a reference.',

  // Arabic licence line shown in the footer. Rendered with dir="rtl" so the text
  // shapes and aligns correctly next to the English copy.
  aboutAr: 'شركة قطرية مرخّصة ومعتمدة من الجهات الرسمية بدولة قطر',

  // Legal ---------------------------------------------------------------------------
  // FILL IN: the commercial registration / tax number issued to the company. While this
  // is empty the footer omits the line entirely rather than printing a made-up number.
  taxNumber: '',

  // Social ---------------------------------------------------------------------------
  // '#' means "no account linked yet" — the footer skips those icons.
  instagram: '#', linkedin: '#', youtube: '#', x: '#',

  // Partners --------------------------------------------------------------------------
  // FILL IN: only organisations the company genuinely works with. The strip that renders
  // this sits under a heading that claims a partnership, so an entry here is a public
  // statement about another business. Empty = the strip is not rendered at all.
  partners: [],

  // Public review score shown next to the brand in the footer. Set to 0 to hide.
  googleRating: 4.9,
  googleReviews: 337,
}

// Convenience: "AL-Madenah RealEstate" → ['AL-Madenah', 'RealEstate'] for the two-tone
// wordmark used in the header and footer.
export const brandParts = (name = COMPANY.name) => {
  const [first, ...rest] = String(name).split(' ')
  return [first, rest.join(' ')]
}
