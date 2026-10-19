// ---------------------------------------------------------------------------------------
// Contact links, built in ONE place.
//
// Two separate bugs lived in the hand-written versions of these:
//
//  * tel: dropped the "+". The property page built its dial link with a digits-only helper
//    borrowed from WhatsApp — but wa.me genuinely wants bare digits, while tel: wants the
//    country code intact. "+974 5512 3456" became "tel:97455123456", which a phone dials as
//    a local number, and from outside Qatar it does not connect at all.
//
//  * Empty fields still produced links. The agent page interpolated a.phone, a.whatsapp and
//    a.email straight into href attributes, so a consultant saved without a WhatsApp number
//    got a live green button pointing at "wa.me/null".
//
// Each builder returns null when there is nothing to link to, so callers render the button
// conditionally rather than rendering a dead one.
// ---------------------------------------------------------------------------------------

// Everything a phone number may legitimately contain, minus the formatting.
const digits = (value) => String(value ?? '').replace(/\D/g, '')

// tel: keeps the leading "+" when the number is written in international form — that plus
// is what tells the dialler "this is a country code, not an area code".
export const telHref = (phone) => {
  const raw = String(phone ?? '').trim()
  const d = digits(raw)
  if (!d) return null
  return `tel:${raw.startsWith('+') ? '+' : ''}${d}`
}

// wa.me takes the number in international form WITHOUT a plus and without separators.
export const whatsAppHref = (number, message) => {
  const d = digits(number)
  if (!d) return null
  return `https://wa.me/${d}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

export const mailHref = (email) => {
  const e = String(email ?? '').trim()
  // Not full validation — just enough to refuse "mailto:null" and "mailto:".
  return e && e.includes('@') ? `mailto:${e}` : null
}

/**
 * Which number a message ABOUT A LISTING should reach.
 *
 * The consultant who holds that listing. He is the one who can answer "is it still
 * available", "can I see it Thursday", "is the price negotiable" — and he is the one whose
 * face and name the visitor is looking at on the card while deciding to tap.
 *
 * This existed only on the property page. The card in the search results, and the one the
 * assistant shows in chat, both reached past the agent they were displaying and sent the
 * message to the company's single number instead. In a market where listings move over
 * WhatsApp all day, that is most of the conversations arriving at the wrong phone.
 *
 * The company number stays as the FALLBACK, which is the part worth keeping: a consultant
 * saved without a WhatsApp number would otherwise leave a dead green button on every card
 * he owns, and a lead nobody receives is worse than a lead received by the office.
 *
 * `phone` before the company number because a consultant who filled in only one of the two
 * fields still owns the conversation; whatsAppHref strips the formatting either way.
 */
export const listingWhatsApp = (agent, companyNumber) =>
  agent?.whatsapp || agent?.phone || companyNumber || null
