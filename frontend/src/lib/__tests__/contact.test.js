import { describe, expect, it } from 'vitest'
import { listingWhatsApp, mailHref, telHref, whatsAppHref } from '../contact'

// The property page built its dial link with the WhatsApp helper, which strips the "+".
// "tel:97455123456" dials as a LOCAL number, so the call never connected from abroad. And
// the agent page interpolated raw fields into href attributes, so an agent with no WhatsApp
// number still got a live green button pointing at "wa.me/null".
describe('telHref', () => {
  it('keeps the country-code plus', () => {
    expect(telHref('+974 5512 3456')).toBe('tel:+97455123456')
  })

  it('strips the formatting but not the plus', () => {
    expect(telHref('+974-5512-3456')).toBe('tel:+97455123456')
    expect(telHref('+974 (5512) 3456')).toBe('tel:+97455123456')
  })

  it('leaves a local number local', () => {
    expect(telHref('5512 3456')).toBe('tel:55123456')
  })

  it.each([null, undefined, '', '   ', 'n/a', '---'])('refuses %o', (value) => {
    expect(telHref(value)).toBeNull()
  })
})

describe('whatsAppHref', () => {
  it('produces digits only, no plus', () => {
    expect(whatsAppHref('+974 5512 3456')).toBe('https://wa.me/97455123456')
  })

  it('url-encodes the prefilled message', () => {
    expect(whatsAppHref('97455123456', 'Hi, about QP-1234?'))
      .toBe('https://wa.me/97455123456?text=Hi%2C%20about%20QP-1234%3F')
  })

  it.each([null, undefined, '', 'null'])('refuses %o rather than linking to wa.me/null', (value) => {
    expect(whatsAppHref(value)).toBeNull()
  })
})

describe('mailHref', () => {
  it('builds a mailto for a real address', () => {
    expect(mailHref('hello@example.com')).toBe('mailto:hello@example.com')
  })

  it.each([null, undefined, '', '   ', 'not-an-email'])('refuses %o', (value) => {
    expect(mailHref(value)).toBeNull()
  })
})

// The card in the search results, and the one the assistant shows in chat, both displayed
// an agent's photo and name and then sent the WhatsApp message to the company's single
// number. In a market where listings move over WhatsApp all day, that was most of the
// conversations arriving at the wrong phone.
describe('listingWhatsApp', () => {
  const COMPANY = '97470066675'

  it('reaches the consultant who holds the listing', () => {
    expect(listingWhatsApp({ whatsapp: '97455501001', phone: '+974 5550 1001' }, COMPANY))
      .toBe('97455501001')
  })

  // A consultant who filled in only one of the two fields still owns the conversation.
  it('uses the phone when no WhatsApp number was saved', () => {
    expect(listingWhatsApp({ whatsapp: '', phone: '+974 5550 1002' }, COMPANY))
      .toBe('+974 5550 1002')
  })

  // A lead received by the office beats a dead green button on every card he owns.
  it('falls back to the company when the consultant has neither', () => {
    expect(listingWhatsApp({ name: 'Omar' }, COMPANY)).toBe(COMPANY)
    expect(listingWhatsApp(null, COMPANY)).toBe(COMPANY)
    expect(listingWhatsApp(undefined, COMPANY)).toBe(COMPANY)
  })

  // Nothing at all must stay null so the caller hides the button rather than rendering
  // wa.me/null — the exact failure telHref and whatsAppHref were written to stop.
  it('returns null when there is no number anywhere', () => {
    expect(listingWhatsApp(null, '')).toBeNull()
    expect(listingWhatsApp({ whatsapp: '' }, undefined)).toBeNull()
  })

  it('composes into a real link, or into none', () => {
    expect(whatsAppHref(listingWhatsApp({ whatsapp: '+974 5550 1001' }, COMPANY)))
      .toBe('https://wa.me/97455501001')
    expect(whatsAppHref(listingWhatsApp(null, null))).toBeNull()
  })
})
