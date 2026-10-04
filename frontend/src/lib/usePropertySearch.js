import { useEffect, useState } from 'react'
import { MOCK_MODE } from '../api/client'
import { publicApi } from '../api/realEstateApi'

// ---------------------------------------------------------------------------------------
// Ask the SERVER for a filtered, sorted, paged set of listings.
//
// Why this exists: the area page, the agent page, the project page and the whole /buy and
// /rent list each filtered the shared `properties` array in the browser. That array is one
// page of search results, and its rows carried no area, no type, no agent, no amenities
// and no furnishing — so those filters matched nothing and the pages showed "0 properties"
// next to a header that said the area had six. Server-side is also the only way these
// pages stay correct once the portfolio outgrows a single page: the browser can only
// filter and count the rows it happens to be holding.
//
// MOCK MODE keeps the old client-side behaviour: there is no server to ask, and the seed
// rows do carry all the fields. The caller passes the array it would have filtered itself.
// ---------------------------------------------------------------------------------------
export function usePropertySearch(filters, { enabled = true, mockFallback = [], pageSize = 100 } = {}) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  // `enabled` can go false -> true (the Listings page switches from map view to list view),
  // and useState only reads its initial value once. Initialising `loading` from `enabled`
  // therefore left it false, and the component rendered one frame with an empty list and
  // "no results" before the effect fired — so every Map -> List toggle flashed
  // "No properties match these filters yet." Derive it instead: nothing has been fetched
  // for this filter set yet, so this IS loading.
  const [fetchedKey, setFetchedKey] = useState(null)

  // The filter object is rebuilt on every render, so the effect keys off its VALUE.
  const key = JSON.stringify(filters ?? {})
  const loading = !MOCK_MODE && enabled && fetchedKey !== key

  useEffect(() => {
    if (MOCK_MODE || !enabled) return undefined
    let cancelled = false
    publicApi.searchProperties({ ...JSON.parse(key), pageSize })
      .then(page => {
        if (cancelled) return
        setItems(page?.items || [])
        // totalCount is what the header counts and what the pager divides by. Falling back
        // to the page length keeps a server that omits it from reporting "0 results" over
        // a full page of cards.
        setTotal(Number.isFinite(page?.totalCount) ? page.totalCount : (page?.items?.length || 0))
        setError('')
      })
      .catch(err => {
        if (cancelled) return
        setItems([]); setTotal(0)
        setError(err?.problem?.title || err?.message || 'Could not load listings.')
      })
      .finally(() => { if (!cancelled) setFetchedKey(key) })
    return () => { cancelled = true }
  }, [key, enabled, pageSize])

  // In mock mode the caller's own filtered array is the answer, and it changes as the
  // in-memory store changes.
  return MOCK_MODE
    ? { items: mockFallback, total: mockFallback.length, loading: false, error: '' }
    : { items, total, loading, error }
}
