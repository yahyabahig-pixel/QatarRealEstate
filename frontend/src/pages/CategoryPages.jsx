import { useParams, Navigate, Link } from 'react-router-dom'
import { useI18n, usePageMeta } from '../i18n/I18nContext'
import { useData } from '../store/DataContext'
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
  const { category, area: areaSlug } = useParams()
  const { t, typeLabel } = useI18n()
  const { areas } = useData()

  const type = CATEGORY_TYPES[category]

  // The area half is driven entirely by the database, not by a list in this file. The
  // company owns buildings in named districts -- Umm Salal, Muaither, Old Airport -- and
  // "shops for rent in Umm Salal" is both the search it can realistically win and a search
  // it has the stock to answer. Adding an area in the admin panel therefore creates its
  // landing pages, with no code change and nothing here to keep in sync.
  const area = areaSlug ? (areas || []).find(a => a.slug === areaSlug) : null
  const areaMissing = Boolean(areaSlug) && (areas || []).length > 0 && !area

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

  // "in Umm Salal" when there is one, "in Qatar" otherwise. The district is the specific
  // half of the title and the reason the page can rank at all, so it replaces the country
  // rather than being added after it: "Shops for rent in Umm Salal in Qatar" reads as
  // machine output, and the extra words push the useful ones past where Google truncates.
  const where = area ? t('categories.inArea', { area: area.name }) : t('categories.inQatar')

  const title = known ? `${label} ${action} ${where}` : ''
  const description = known
    ? t('categories.description', { type: label, action, where })
    : ''

  usePageMeta(title, description)

  if (!known) return <Navigate to={purpose === 'rent' ? '/rent' : '/buy'} replace />

  // An area slug that no longer exists — renamed, or a stale link — drops to the type page
  // rather than showing an empty list under a heading naming a district that is not there.
  // Guarded on areas having loaded, so the first render does not redirect before the
  // catalog arrives.
  if (areaMissing) {
    return <Navigate to={`/${purpose === 'rent' ? 'rent' : 'buy'}/${category}`} replace />
  }

  return (
    <>
      <Listings
        purpose={purpose}
        fixedType={type}
        fixedArea={area?.name || ''}
        heading={title}
      />
      <AreaLinks purpose={purpose} category={category} label={label} current={area?.slug} areas={areas} />
    </>
  )
}

// ---------------------------------------------------------------------------------------
// Links from one category page to the same type in every other district.
//
// Two jobs, and both matter. For a visitor: "no shops in Umm Salal right now — there are
// some in Muaither" is the obvious next question, and answering it on the page keeps
// someone who would otherwise leave.
//
// For search: without these, all hundred-odd category pages are orphans. Nothing on the
// site links to them, so the sitemap is their only route in -- and a page nothing links to
// is a page search engines treat as unimportant, because on the evidence of the site
// itself, it is. These links make each one part of the site rather than an address that
// happens to resolve.
// ---------------------------------------------------------------------------------------
function AreaLinks({ purpose, category, label, current, areas }) {
  const { t } = useI18n()
  const others = (areas || []).filter(a => a.slug && a.slug !== current)
  if (others.length === 0) return null

  return (
    <nav className="max-w-7xl mx-auto px-4 pb-14" aria-label={t('categories.elsewhere', { type: label })}>
      <h2 className="h-serif text-xl mb-4">{t('categories.elsewhere', { type: label })}</h2>
      <div className="flex flex-wrap gap-2">
        {current && (
          <Link to={`/${purpose}/${category}`}
            className="px-3 py-1.5 rounded-full border border-neutral-300 text-sm hover:border-primary hover:text-primary transition-colors">
            {t('categories.allOfQatar')}
          </Link>
        )}
        {others.map(a => (
          <Link key={a.slug} to={`/${purpose}/${category}/${a.slug}`}
            className="px-3 py-1.5 rounded-full border border-neutral-300 text-sm hover:border-primary hover:text-primary transition-colors">
            {a.name}
          </Link>
        ))}
      </div>
    </nav>
  )
}
