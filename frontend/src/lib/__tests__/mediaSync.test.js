import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// THE REGRESSION GUARD for the admin photo bug.
//
// details.images comes back resolved to absolute URLs (that is what the page renders), while
// details.media[].url stays the raw stored relative path. The admin save compared the form's
// list against media[].url without normalising either, so for every photo already on the
// listing the two never matched. Every single save therefore:
//
//   * deleted every photo on the listing (none of them were "kept")
//   * re-uploaded every photo under its ABSOLUTE url, undoing the relative-path migration,
//     so the photos would break again the day the site moved to a domain
//   * produced an empty id list, so the reorder request never ran and the arrows did nothing
//
// and because the deletes ran before the adds, a failure in between left a listing with no
// photos at all. Each of those four things has a test below.
const API = 'http://localhost'

let planMediaSync, orderedMediaIds

beforeEach(async () => {
  vi.stubEnv('VITE_API_URL', API)      // read at module load, so stub before importing
  vi.resetModules()
  ;({ planMediaSync, orderedMediaIds } = await import('../mediaSync'))
})

afterEach(() => {
  vi.unstubAllEnvs()
})

// What the admin form actually holds while editing a listing that already has two photos,
// one of which the admin has just added in this session.
const RENDERED_EXISTING = `${API}/api/media/images/photo-one`
const STORED_EXISTING = '/api/media/images/photo-one'
const JUST_UPLOADED = '/api/media/images/photo-two'   // the uploader returns it relative
const EXTERNAL = 'https://images.unsplash.com/photo-3.jpg'

const serverMedia = [
  { id: 'm1', url: STORED_EXISTING },
  { id: 'm3', url: EXTERNAL },
]

describe('planMediaSync', () => {
  it('does not delete a photo the admin kept, even though the form shows it absolute', () => {
    const { removed } = planMediaSync([RENDERED_EXISTING, EXTERNAL], serverMedia)
    expect(removed).toEqual([])
  })

  it('does not re-upload a photo that is already on the listing', () => {
    const { added } = planMediaSync([RENDERED_EXISTING, EXTERNAL], serverMedia)
    expect(added).toEqual([])
  })

  it('uploads a genuinely new photo, and only that one', () => {
    const { added } = planMediaSync([RENDERED_EXISTING, JUST_UPLOADED, EXTERNAL], serverMedia)
    expect(added).toEqual([JUST_UPLOADED])
  })

  it('stores our own photos relative, never under the origin they were rendered on', () => {
    // If this ever yields an absolute url, the relative-path migration has been undone and
    // every photo breaks the day the site gets a domain.
    const { wanted } = planMediaSync([RENDERED_EXISTING, JUST_UPLOADED], serverMedia)
    expect(wanted).toEqual([STORED_EXISTING, JUST_UPLOADED])
    expect(wanted.some(u => u.startsWith('http'))).toBe(false)
  })

  it('still detects a removal — the fix must not overcorrect into keeping everything', () => {
    const { removed } = planMediaSync([RENDERED_EXISTING], serverMedia)
    expect(removed).toEqual([{ id: 'm3', url: EXTERNAL }])
  })

  it('removes everything when the admin clears the form', () => {
    const { added, removed } = planMediaSync([], serverMedia)
    expect(added).toEqual([])
    expect(removed).toEqual(serverMedia)
  })

  it('treats a listing with no media yet as all-new', () => {
    const { added, removed } = planMediaSync([JUST_UPLOADED], [])
    expect(added).toEqual([JUST_UPLOADED])
    expect(removed).toEqual([])
  })

  it('survives null/undefined on either side', () => {
    expect(planMediaSync(null, null)).toEqual({ wanted: [], added: [], removed: [] })
    expect(planMediaSync(undefined, serverMedia).removed).toEqual(serverMedia)
    expect(planMediaSync([JUST_UPLOADED], undefined).added).toEqual([JUST_UPLOADED])
  })
})

describe('orderedMediaIds', () => {
  const after = [
    { id: 'm1', url: STORED_EXISTING },
    { id: 'm2', url: JUST_UPLOADED },
    { id: 'm3', url: EXTERNAL },
  ]

  it('returns the ids in the order the admin arranged them', () => {
    const wanted = [JUST_UPLOADED, EXTERNAL, STORED_EXISTING]
    expect(orderedMediaIds(wanted, after)).toEqual(['m2', 'm3', 'm1'])
  })

  it('does not go silent when the form is in the rendered shape — it is given stored urls', () => {
    // The old code looked up absolute urls in a map keyed by stored ones, got undefined for
    // every entry, filtered them all out and skipped the reorder request entirely. Passing
    // planMediaSync's `wanted` is what prevents that; this asserts the end-to-end pairing.
    const { wanted } = planMediaSync(
      [`${API}/api/media/images/photo-two`, RENDERED_EXISTING, EXTERNAL],
      after,
    )
    expect(orderedMediaIds(wanted, after)).toEqual(['m2', 'm1', 'm3'])
  })

  it('refuses to reorder a partial list rather than dropping the rest', () => {
    // The endpoint replaces the whole sequence, so a list that is missing an id would
    // discard that photo. null means "do not call it".
    expect(orderedMediaIds([STORED_EXISTING], after)).toBeNull()
    expect(orderedMediaIds(['/api/media/images/not-there'], after)).toBeNull()
  })

  it('returns null when there is nothing to order', () => {
    expect(orderedMediaIds([], [])).toBeNull()
    expect(orderedMediaIds(null, after)).toBeNull()
    expect(orderedMediaIds([STORED_EXISTING], null)).toBeNull()
  })
})
