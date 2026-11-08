import { describe, expect, it } from 'vitest'
import { describeStatusError, errorCodes, STATUS_ERROR_KEYS } from '../statusErrors'

// The owner hit "publish" on a flat whose tenant had left and got, in the middle of an
// Arabic admin panel: "Validation failed — The property cannot be published in its current
// state." English, and it named the problem rather than the way out.

const t = (key) => `translated:${key}`

describe('errorCodes', () => {
  it('reads the codes out of an array of errors', () => {
    expect(errorCodes({ errors: [{ code: 'Property.AlreadySold', description: 'x' }] }))
      .toEqual(['Property.AlreadySold'])
  })

  // ASP.NET's ProblemDetails puts them in a dictionary of arrays instead.
  it('reads them out of a problem-details dictionary too', () => {
    expect(errorCodes({ errors: { status: [{ code: 'Property.AlreadyDraft' }] } }))
      .toEqual(['Property.AlreadyDraft'])
  })

  it.each([null, undefined, {}, { errors: null }, { errors: 'boom' }])('survives %o', (err) => {
    expect(errorCodes(err)).toEqual([])
  })
})

describe('describeStatusError', () => {
  it('answers the one refusal that is left in the admin language', () => {
    const err = { errors: [{ code: 'Property.OutcomeDoesNotMatchListingKind' }] }
    expect(describeStatusError(err, t)).toBe('translated:admin.statusError.outcomeMismatch')
  })

  it('covers every mis-click the status menu can produce', () => {
    for (const code of Object.keys(STATUS_ERROR_KEYS)) {
      expect(describeStatusError({ errors: [{ code }] }, t)).toBe(`translated:${STATUS_ERROR_KEYS[code]}`)
    }
  })

  // A message in the wrong language beats no message, so anything unrecognised still shows.
  it('falls through to the server text for anything it does not know', () => {
    const err = { message: 'Something else went wrong.', errors: [{ code: 'Property.Unheard', description: 'detail' }] }
    expect(describeStatusError(err, t)).toContain('Something else went wrong.')
  })

  it('never returns an empty string', () => {
    expect(describeStatusError({}, t)).toBeTruthy()
    expect(describeStatusError(null, t)).toBeTruthy()
  })
})
