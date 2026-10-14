import { useParams, Navigate } from 'react-router-dom'
import { useI18n, usePageMeta } from '../i18n/I18nContext'
import Listings from './Listings'

// ---------------------------------------------------------------------------------------
// CATEGORY LANDING PAGES  —  /rent/offices, /buy/apartments, …
//
// Why these exist rather than ?type=Office on /rent:
//
// Google ranks pages, and it cannot rank a page that does not exist. Someone searching
// "مكاتب للإيجار في قطر" needs a page whose URL, title and heading all say offices for
// rent in Qatar. A query string on a generic listings page is none of those things: it is
// one page wearing a different filter, with the same title as every other page on the site,
// and crawlers largely ignore the parameter.
//
// These pages are also where this site can realistically compete. "property in Qatar" is
// owned by portals with tens of thousands of listings; "محل تجاري للإيجار في الدوحة" is a
// narrower search with far less competition, and whoever types it already knows what they
// want.
//
// Each page is the real listings page underneath, seeded with a type rather than locked to
// it, so every filter and the map keep working and a visitor can widen the search from here.
// ---------------------------------------------------------------------------------------

// URL slug -> the property type NAME as the catalog stores it. The slugs are English and
// lower-case in both languages: a URL is an identifier, and a stable one survives being
// pasted into WhatsApp, written on a card, and indexed under one address instead of two.
export const CATEGORY_TYPES = {
  apartments: 'Apartment',
  villas: 'Villa',
  townhouses: 'Townhouse',
  penthouses: 'Penthouse',
  studios: 'Studio',
  offices: 'Office',
  shops: 'Commercial Shop',
}

export const CATEGORY_SLUGS = Object.keys(CATEGORY_TYPES)

export default function CategoryListings({ purpose }) {
  const { category } = useParams()
  const { t, typeLabel } = useI18n()

  const type = CATEGORY_TYPES[category]

  // An unknown slug is a 404 in spirit, but sending it to the plain listings page is kinder
  // and keeps whatever link brought them here useful. Done before the hooks below would be
  // handed an undefined type.
  const known = Boolean(type)

  // The pieces are assembled from the existing dictionaries -- the translated type name and
  // the words for rent/sale -- so a new property type gets a correct title in both languages
  // from one line in CATEGORY_TYPES, with no new translation strings to forget.
  // Plural where one is defined, falling back to the singular catalog label so a type added
  // to CATEGORY_TYPES still produces a working page before anyone writes its plural.
  const plural = known ? t(`categories.plural.${type}`) : ''
  const label = known
    ? (plural === `categories.plural.${type}` ? typeLabel(type) : plural)
    : ''
  const action = purpose === 'rent' ? t('common.forRent') : t('common.forSale')
  const where = t('categories.inQatar')

  const title = known ? `${label} ${action} ${where}` : ''
  const description = known
    ? t('categories.description', { type: label, action, where })
    : ''

  usePageMeta(title, description)

  if (!known) return <Navigate to={purpose === 'rent' ? '/rent' : '/buy'} replace />

  return <Listings purpose={purpose} fixedType={type} />
}
