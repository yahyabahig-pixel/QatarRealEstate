import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { useI18n } from '../i18n/I18nContext'
import PropertyCard from '../components/PropertyCard'
import { readFavouriteIds, FAVS_CHANGED_EVENT } from '../components/ui'
import { IconHeart } from '../components/icons'

// ---------------------------------------------------------------------------------------
// Favourites — the page the heart button never had. Reads the SAME localStorage set the
// useFavourite hook writes ('qre.favourites'), so everything ever hearted shows up here.
// Purely client-side, exactly like the hook: no backend endpoint exists for favourites,
// and this page does not pretend otherwise (the note under the title says it's saved in
// this browser).
//
// Live updates: useFavourite dispatches FAVS_CHANGED_EVENT on every toggle, so un-hearting
// a card HERE removes it from the grid immediately — no refresh needed.
// ---------------------------------------------------------------------------------------
export default function Favourites() {
  const { properties } = useData()
  const { t } = useI18n()
  const [ids, setIds] = useState(() => readFavouriteIds())

  useEffect(() => {
    const refresh = () => setIds(readFavouriteIds())
    window.addEventListener(FAVS_CHANGED_EVENT, refresh)
    // storage fires when ANOTHER tab toggles a heart — keep this one in sync too.
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(FAVS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const items = properties.filter(p => ids.has(p.id))

  return (
    <div className="pt-24 max-w-7xl mx-auto px-4 pb-20 min-h-[60vh]">
      <div className="eyebrow mb-2">{t('favs.eyebrow')}</div>
      <h1 className="h-serif text-4xl mb-2">{t('favs.title')}</h1>
      <p className="text-sm text-mist mb-10">
        {items.length === 1 ? t('favs.countOne') : items.length > 1 ? t('favs.count', { n: items.length }) : ''} {t('favs.localNote')}
      </p>

      {items.length === 0 ? (
        <div className="text-center py-20 px-6 border border-dashed border-neutral-300 rounded-2xl bg-white/60">
          <span className="inline-flex w-14 h-14 rounded-full bg-primary/10 text-primary items-center justify-center mb-4">
            <IconHeart className="w-6 h-6" />
          </span>
          <p className="text-neutral-600 font-medium mb-1.5">{t('favs.emptyTitle')}</p>
          <p className="text-sm text-neutral-500 mb-6 max-w-md mx-auto">{t('favs.emptyBody')}</p>
          <Link to="/buy" className="btn-primary">{t('property.browse')}</Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 stagger-fade">
          {items.map(p => <PropertyCard key={p.id} p={p} />)}
        </div>
      )}
    </div>
  )
}
