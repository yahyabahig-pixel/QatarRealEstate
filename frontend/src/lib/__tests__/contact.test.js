import { describe, expect, it } from 'vitest'
import { mailHref, telHref, whatsAppHref } from '../contact'

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
