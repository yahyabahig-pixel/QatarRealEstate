import { toStoredMediaUrl } from '../api/realEstateApi'

// Working out what an admin's save means for a listing's photos — which to upload, which to
// delete, and what order to put them in.
//
// This lives here, apart from the request-sending code, because it is the part that was
// wrong and the part worth testing. The admin form holds what the browser was SHOWING: a
// photo already on the listing arrives as an absolute URL (details.images is resolved for
// rendering), a photo added in this session is still the relative path the uploader returned.
// The API reports media[].url as the raw STORED value, always relative for our own files.
// Comparing those two directly matched nothing for any existing photo, so every save deleted
// every photo and re-uploaded it under its absolute URL. Normalising first is the whole job.

/**
 * @param {string[]} formImages  what the admin form holds, in the order they arranged it
 * @param {{id: string, url: string}[]} currentMedia  what the API currently reports
 * @returns {{wanted: string[], added: string[], removed: {id: string, url: string}[]}}
 *   `wanted` is the form's list in the stored shape — use it for anything that has to line
 *   up with media[].url, never the raw form values.
 */
export function planMediaSync(formImages, currentMedia) {
  const wanted = (formImages || []).map(toStoredMediaUrl)
  const existing = new Set((currentMedia || []).map(m => m.url))
  const keep = new Set(wanted)

  return {
    wanted,
    added: wanted.filter(url => !existing.has(url)),
    removed: (currentMedia || []).filter(m => !keep.has(m.url)),
  }
}

/**
 * The media ids in the order the admin arranged them, or null when that order cannot be
 * stated with confidence — which is the only safe answer, because the reorder endpoint
 * replaces the whole sequence and a partial list would drop the photos missing from it.
 *
 * @param {string[]} wanted  stored-shape urls, in order (planMediaSync's `wanted`)
 * @param {{id: string, url: string}[]} afterMedia  media as the API reports it after the
 *   adds and removes have been applied
 */
export function orderedMediaIds(wanted, afterMedia) {
  const media = afterMedia || []
  const idByUrl = new Map(media.map(m => [m.url, m.id]))
  const ids = (wanted || []).map(url => idByUrl.get(url)).filter(Boolean)

  return ids.length === media.length && ids.length > 0 ? ids : null
}
