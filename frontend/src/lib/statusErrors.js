import { describeApiError } from '../api/client'

// ---------------------------------------------------------------------------------------
//  Turning a refused status change into a sentence the owner can act on.
//
//  The backend answers in English — "The property cannot be published in its current
//  state." — and that string lands unchanged in the middle of an Arabic admin panel. Worse,
//  it says what happened and not what to do about it, which for the one refusal that still
//  exists is the only part that matters.
//
//  Matched on the error CODE, which is stable, rather than on the message text, which is
//  not. Anything unrecognised falls through to the server's own words: a message in the
//  wrong language beats no message.
// ---------------------------------------------------------------------------------------

export const STATUS_ERROR_KEYS = {
  'Property.OutcomeDoesNotMatchListingKind': 'admin.statusError.outcomeMismatch',
  'Property.AlreadyPublished': 'admin.statusError.alreadyPublished',
  'Property.AlreadyDraft': 'admin.statusError.alreadyDraft',
  'Property.AlreadyArchived': 'admin.statusError.alreadyArchived',
  'Property.AlreadySold': 'admin.statusError.alreadySold',
  'Property.AlreadyRented': 'admin.statusError.alreadyRented',
}

/** Every error code the response carries, wherever the API happened to put them. */
export function errorCodes(err) {
  const errs = err?.errors
  const list = Array.isArray(errs)
    ? errs
    : (errs && typeof errs === 'object' ? Object.values(errs).flat() : [])
  return list.map(e => (typeof e === 'string' ? e : e?.code)).filter(Boolean)
}

export function describeStatusError(err, t) {
  for (const code of errorCodes(err)) {
    const key = STATUS_ERROR_KEYS[code]
    if (key) return t(key)
  }
  return describeApiError(err)
}
