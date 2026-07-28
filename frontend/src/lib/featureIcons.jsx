/* ---------------------------------------------------------------------------------------
   CURATED REAL-ESTATE ICON REGISTRY
   The single source of truth for property-feature icons. The database stores only the
   stable KEY (e.g. "swimming-pool"); this registry resolves it to a component. Glyphs
   follow the same style as components/icons.jsx: 24px viewBox, stroke-2, round joins —
   one icon language across the whole product, no emojis, no mixed libraries.

   LEGACY_ALIASES keeps rows seeded before this registry existed ("pool", "ac", "shield",
   …) resolving without a data migration.
   ------------------------------------------------------------------------------------- */
import {
  IconBath, IconBed, IconBuilding, IconHome, IconKey, IconPhone, IconShield, IconUsers,
} from '../components/icons'

const I = (name, children) => {
  const C = ({ className = 'w-5 h-5' }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>{children}</svg>
  )
  C.displayName = name
  return C
}

const G = {
  waves: I('waves', <><path d="M2 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M2 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></>),
  swim: I('swim', <><circle cx="7" cy="7" r="2" /><path d="M11 11l4-2 5 3" /><path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></>),
  dumbbell: I('dumbbell', <><path d="M7 7v10M17 7v10M3.5 10v4M20.5 10v4M7 12h10" /></>),
  lotus: I('lotus', <><path d="M12 20c-4.5 0-8-3-8-7 2.2 0 4.2.8 5.4 2C9.2 11.5 10 7.5 12 4c2 3.5 2.8 7.5 2.6 11 1.2-1.2 3.2-2 5.4-2 0 4-3.5 7-8 7z" /></>),
  steam: I('steam', <><path d="M8 3c-1 2 1 3 0 5M12 3c-1 2 1 3 0 5M16 3c-1 2 1 3 0 5" /><path d="M4 13h16M6 13v7M18 13v7M6 17h12" /></>),
  seesaw: I('seesaw', <><path d="M4 15l16-4" /><circle cx="4.5" cy="12.5" r="1.6" /><circle cx="19.5" cy="8.8" r="1.6" /><path d="M10 20h4l-2-4z" /><path d="M3 20h18" /></>),
  grill: I('grill', <><path d="M5 9h14a7 7 0 0 1-14 0z" /><path d="M9 15l-2.5 6M15 15l2.5 6M6 19h9" /><path d="M9 3c-.8 1.2.8 1.8 0 3M13 3c-.8 1.2.8 1.8 0 3" /></>),
  tree: I('tree', <><path d="M12 3l5 6.5h-3.2l4.2 6H6l4.2-6H7z" /><path d="M12 15.5V21M9 21h6" /></>),
  terrace: I('terrace', <><circle cx="17" cy="6" r="2.5" /><path d="M3 16h18M5 16v5M12 16v5M19 16v5M3 21h18" /></>),
  villa: I('villa', <><path d="M2 21h20" /><path d="M4 21V11l6.5-5.5L17 11" /><path d="M17 21v-7h5v7" /><path d="M8 21v-5h5v5" /></>),
  kitchen: I('kitchen', <><path d="M3 11h18" /><path d="M5 11h14v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" /><path d="M9 8c0-2.5 6-2.5 6 0" /></>),
  sofa: I('sofa', <><path d="M5 12V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v4" /><path d="M3 12a2 2 0 0 1 2 2v1h14v-1a2 2 0 0 1 4 0v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z" /><path d="M5 19v2M19 19v2" /></>),
  railing: I('railing', <><path d="M6 13V8a6 6 0 0 1 12 0v5" /><path d="M4 13v8M8 13v8M12 13v8M16 13v8M20 13v8M3 13h18M3 21h18" /></>),
  box: I('box', <><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>),
  hanger: I('hanger', <><path d="M12 7a2 2 0 1 1 2-2c0 1-.9 1.4-2 2v2" /><path d="M12 9L3 16.5h18z" /></>),
  parkingP: I('parkingP', <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 17V7h3.5a3 3 0 0 1 0 6H9" /></>),
  garage: I('garage', <><path d="M3 21V9l9-5.5L21 9v12" /><path d="M7 21v-8h10v8M7 16h10M7 18.5h10" /></>),
  carRoof: I('carRoof', <><path d="M2 9l10-5 10 5" /><path d="M6 17.5h-2v-2.5l2-3h10l2 3v2.5h-2" /><circle cx="8" cy="17.5" r="1.8" /><circle cx="16" cy="17.5" r="1.8" /><path d="M10 17.5h4" /></>),
  bolt: I('bolt', <><path d="M13 2L6 13.5h5L10 22l7-11.5h-5z" /></>),
  bus: I('bus', <><path d="M4 4h16v12H4z" /><path d="M4 9h16" /><circle cx="8" cy="18.5" r="1.8" /><circle cx="16" cy="18.5" r="1.8" /><path d="M7 13h.01M17 13h.01" /></>),
  train: I('train', <><path d="M5 4h14v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" /><path d="M5 10h14M9 14h.01M15 14h.01" /><path d="M9 21l-2-4M15 21l2-4" /></>),
  cctv: I('cctv', <><path d="M2 8l13-4.5 2 6.5-13 4.5z" /><path d="M17 6.5l5 1.5-1 3.5-5-1" /><path d="M7 14v4h5" /></>),
  fence: I('fence', <><path d="M5 21V8l1.8-2L8.5 8v13M13.5 21V8l1.8-2 1.7 2v13" /><path d="M2 12h20M2 17h20" /></>),
  bell: I('bell', <><path d="M5 17a7 7 0 0 1 14 0z" /><path d="M3 20h18M12 10V7.5" /></>),
  elevator: I('elevator', <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 15V9M9 9L7 11M9 9l2 2M15 9v6M15 15l-2-2M15 15l2-2" /></>),
  snowflake: I('snowflake', <><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" /></>),
  thermo: I('thermo', <><path d="M10 4a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0z" /><path d="M12 10v6" /></>),
  flame: I('flame', <><path d="M12 3c1.2 3 5 5.2 5 9a5 5 0 0 1-10 0c0-1.8.8-3 1.8-4.6 1 1.6 2.2 1.9 3.2-4.4z" /></>),
  wifi: I('wifi', <><path d="M5 11.5a10 10 0 0 1 14 0" /><path d="M8.5 15a5 5 0 0 1 7 0" /><path d="M12 18.5h.01" /></>),
  globe: I('globe', <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a13 13 0 0 1 0 18a13 13 0 0 1 0-18z" /></>),
  smartHome: I('smartHome', <><path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 14a3.5 3.5 0 0 1 5 0M12 17h.01" /></>),
  umbrella: I('umbrella', <><path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9z" /><path d="M12 12v6.5a2 2 0 0 0 4 0" /></>),
  skyline: I('skyline', <><path d="M3 21V10h5v11M8 21V4h6v17M14 21v-8h7v8M21 21H3" /><path d="M11 8h.01M11 12h.01M5.5 14h.01M17.5 17h.01" /></>),
  gradCap: I('gradCap', <><path d="M2 9.5L12 4l10 5.5L12 15z" /><path d="M6 12v4.5c0 1.6 12 1.6 12 0V12M22 9.5V15" /></>),
  crossBox: I('crossBox', <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M12 8v8M8 12h8" /></>),
  mosque: I('mosque', <><path d="M12 3c-4 3.2-5.5 5.3-5.5 8h11c0-2.7-1.5-4.8-5.5-8z" /><path d="M4 21v-6M20 21v-6M6.5 15h11M6.5 21h11M3 21h18M12 3V1.5" /></>),
  utensils: I('utensils', <><path d="M6 3v5a2 2 0 0 0 2 2v11M8 3v5M4 3v5" /><path d="M17 3c-2 1.2-3 3.5-3 6v3h3v9M17 3v18" /></>),
  cup: I('cup', <><path d="M4 8h12v6a5 5 0 0 1-10 0z" /><path d="M16 9h2a3 3 0 0 1 0 6h-2" /><path d="M7 3c0 1 .8 1.2.8 2.2M11 3c0 1 .8 1.2.8 2.2" /></>),
  bag: I('bag', <><path d="M6 8h12l1.2 13H4.8z" /><path d="M9 10V6a3 3 0 0 1 6 0v4" /></>),
  cart: I('cart', <><path d="M3 4h2.5L8 16h11l2-8H7" /><circle cx="9.5" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /></>),
  route: I('route', <><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M6 17V10a4 4 0 0 1 4-4h4" /></>),
  bike: I('bike', <><circle cx="6" cy="17" r="3.2" /><circle cx="18" cy="17" r="3.2" /><path d="M6 17l4-8h5.5M12 17l3-8M9 9h4" /></>),
  ball: I('ball', <><circle cx="12" cy="12" r="9" /><path d="M4 8.5c5 2.8 11 2.8 16 0M4 15.5c5-2.8 11-2.8 16 0" /></>),
  paw: I('paw', <><path d="M12 21.5c-2.8 0-4.8-1.6-4.8-3.6 0-2.4 2.3-3.4 4.8-3.4s4.8 1 4.8 3.4c0 2-2 3.6-4.8 3.6z" /><path d="M6.5 10h.01M10.5 7h.01M13.5 7h.01M17.5 10h.01" /></>),
  smile: I('smile', <><circle cx="12" cy="12" r="9" /><path d="M9 10h.01M15 10h.01" /><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8" /></>),
  stairs: I('stairs', <><path d="M3 21h4v-4h4v-4h4V9h4V5h2" /></>),
}

// key → { name, category, keywords, Icon }
const E = (key, name, category, keywords, Icon) => ({ key, name, category, keywords, Icon })

export const FEATURE_ICON_CATALOG = [
  // AMENITIES
  E('swimming-pool', 'Swimming Pool', 'Amenities', ['pool', 'swim', 'water'], G.swim),
  E('gym', 'Gym', 'Amenities', ['fitness', 'exercise', 'workout', 'dumbbell'], G.dumbbell),
  E('spa', 'Spa', 'Amenities', ['wellness', 'massage', 'relax'], G.lotus),
  E('sauna', 'Sauna', 'Amenities', ['steam', 'wellness', 'heat'], G.steam),
  E('jacuzzi', 'Jacuzzi', 'Amenities', ['hot tub', 'bath', 'whirlpool'], IconBath),
  E('playground', 'Playground', 'Amenities', ['kids', 'children', 'play'], G.seesaw),
  E('bbq', 'BBQ Area', 'Amenities', ['barbecue', 'grill', 'outdoor'], G.grill),
  E('garden', 'Garden', 'Amenities', ['green', 'plants', 'landscaping', 'tree'], G.tree),
  E('rooftop', 'Rooftop', 'Amenities', ['roof', 'sky', 'lounge'], G.terrace),
  E('clubhouse', 'Clubhouse', 'Amenities', ['club', 'community', 'social'], IconUsers),
  // PROPERTY
  E('house', 'House', 'Property', ['home'], IconHome),
  E('apartment', 'Apartment', 'Property', ['flat', 'tower', 'building'], IconBuilding),
  E('villa', 'Villa', 'Property', ['house', 'luxury'], G.villa),
  E('bedroom', 'Bedroom', 'Property', ['bed', 'sleep', 'room', 'maid'], IconBed),
  E('bathroom', 'Bathroom', 'Property', ['bath', 'shower', 'wc'], IconBath),
  E('kitchen', 'Kitchen', 'Property', ['cook', 'cooking', 'pot'], G.kitchen),
  E('living-room', 'Living Room', 'Property', ['sofa', 'lounge', 'furnished', 'furnishing'], G.sofa),
  E('balcony', 'Balcony', 'Property', ['railing', 'outdoor'], G.railing),
  E('terrace', 'Terrace', 'Property', ['patio', 'outdoor', 'sun'], G.terrace),
  E('storage', 'Storage', 'Property', ['box', 'store room'], G.box),
  E('walk-in-closet', 'Walk-in Closet', 'Property', ['wardrobe', 'hanger', 'clothes'], G.hanger),
  E('floor', 'Floor Number', 'Property', ['stairs', 'level', 'storey'], G.stairs),
  // PARKING & TRANSPORT
  E('parking', 'Parking', 'Parking & Transport', ['car', 'park'], G.parkingP),
  E('garage', 'Garage', 'Parking & Transport', ['car', 'door'], G.garage),
  E('covered-parking', 'Covered Parking', 'Parking & Transport', ['car', 'roof', 'shade', 'carport'], G.carRoof),
  E('ev-charging', 'EV Charging', 'Parking & Transport', ['car', 'electric', 'charger', 'tesla'], G.bolt),
  E('public-transport', 'Public Transport', 'Parking & Transport', ['bus', 'commute'], G.bus),
  E('metro', 'Metro', 'Parking & Transport', ['train', 'subway', 'station'], G.train),
  // SECURITY
  E('security', 'Security', 'Security', ['guard', 'safe', 'shield', '24/7'], IconShield),
  E('cctv', 'CCTV', 'Security', ['camera', 'surveillance'], G.cctv),
  E('access-control', 'Access Control', 'Security', ['key', 'card', 'entry'], IconKey),
  E('gated-community', 'Gated Community', 'Security', ['gate', 'fence', 'compound'], G.fence),
  E('concierge', 'Concierge', 'Security', ['reception', 'bell', 'front desk', 'service'], G.bell),
  // BUILDING
  E('elevator', 'Elevator', 'Building', ['lift'], G.elevator),
  E('air-conditioning', 'Air Conditioning', 'Building', ['ac', 'central', 'cooling', 'hvac'], G.snowflake),
  E('heating', 'Heating', 'Building', ['warm', 'thermostat'], G.thermo),
  E('generator', 'Backup Power', 'Building', ['electricity', 'backup', 'power'], G.bolt),
  E('fire-safety', 'Fire Safety', 'Building', ['alarm', 'extinguisher', 'flame'], G.flame),
  // CONNECTIVITY
  E('wifi', 'Wi-Fi', 'Connectivity', ['internet', 'wireless'], G.wifi),
  E('internet', 'Internet', 'Connectivity', ['broadband', 'fiber', 'online'], G.globe),
  E('smart-home', 'Smart Home', 'Connectivity', ['automation', 'iot'], G.smartHome),
  E('intercom', 'Intercom', 'Connectivity', ['phone', 'buzzer', 'video'], IconPhone),
  // LOCATION & VIEW
  E('sea-view', 'Sea View', 'Location & View', ['ocean', 'water', 'waves', 'waterfront'], G.waves),
  E('beach-access', 'Beach Access', 'Location & View', ['sand', 'shore', 'umbrella'], G.umbrella),
  E('city-view', 'City View', 'Location & View', ['skyline', 'urban'], G.skyline),
  E('garden-view', 'Garden View', 'Location & View', ['green', 'park'], G.tree),
  E('pool-view', 'Pool View', 'Location & View', ['water', 'swim'], G.swim),
  E('near-school', 'Near School', 'Location & View', ['education', 'nearby'], G.gradCap),
  E('near-hospital', 'Near Hospital', 'Location & View', ['clinic', 'medical', 'nearby'], G.crossBox),
  E('near-metro', 'Near Metro', 'Location & View', ['station', 'train', 'nearby'], G.train),
  // FAMILY & EDUCATION
  E('school', 'School', 'Family & Education', ['education', 'university'], G.gradCap),
  E('nursery', 'Nursery', 'Family & Education', ['daycare', 'kids', 'children'], G.smile),
  E('kids-area', 'Kids Area', 'Family & Education', ['children', 'play'], G.ball),
  E('family-area', 'Family Area', 'Family & Education', ['community'], IconUsers),
  // LIFESTYLE
  E('restaurant', 'Restaurant', 'Lifestyle', ['dining', 'food'], G.utensils),
  E('cafe', 'Cafe', 'Lifestyle', ['coffee', 'tea'], G.cup),
  E('shopping', 'Shopping', 'Lifestyle', ['mall', 'retail', 'boutique'], G.bag),
  E('supermarket', 'Supermarket', 'Lifestyle', ['grocery', 'market', 'cart'], G.cart),
  E('mosque', 'Mosque', 'Lifestyle', ['prayer', 'masjid'], G.mosque),
  E('hospital', 'Hospital', 'Lifestyle', ['clinic', 'pharmacy', 'medical'], G.crossBox),
  E('pets-allowed', 'Pets Allowed', 'Lifestyle', ['pet', 'dog', 'cat', 'animal'], G.paw),
  // OUTDOOR
  E('beach', 'Beach', 'Outdoor', ['sand', 'sea'], G.umbrella),
  E('park', 'Park', 'Outdoor', ['green', 'trees'], G.tree),
  E('walking-area', 'Walking Area', 'Outdoor', ['trail', 'path', 'jogging'], G.route),
  E('cycling', 'Cycling', 'Outdoor', ['bike', 'bicycle'], G.bike),
  E('sports-court', 'Sports Court', 'Outdoor', ['tennis', 'basketball', 'football'], G.ball),
]

export const FEATURE_ICON_CATEGORIES = [...new Set(FEATURE_ICON_CATALOG.map(e => e.category))]

// Keys stored by rows seeded before this registry existed.
const LEGACY_ALIASES = {
  pool: 'swimming-pool', bed: 'bedroom', waves: 'sea-view', ac: 'air-conditioning',
  shield: 'security', pet: 'pets-allowed', car: 'covered-parking', stairs: 'floor',
  sofa: 'living-room',
}

const byKey = new Map(FEATURE_ICON_CATALOG.map(e => [e.key, e]))

export function resolveFeatureIcon(key) {
  if (!key) return null
  return byKey.get(key) || byKey.get(LEGACY_ALIASES[key]) || null
}

export function searchFeatureIcons(query = '', category = '') {
  const q = query.trim().toLowerCase()
  return FEATURE_ICON_CATALOG.filter(e =>
    (!category || e.category === category) &&
    (!q || e.key.includes(q) || e.name.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) || e.keywords.some(k => k.includes(q))))
}

// Best-effort key for a feature NAME — used to give mock-mode features sensible icons.
export function guessFeatureIcon(name = '') {
  const n = name.trim().toLowerCase()
  if (!n) return null
  const exact = FEATURE_ICON_CATALOG.find(e => e.name.toLowerCase() === n)
  if (exact) return exact.key
  const hit = FEATURE_ICON_CATALOG.find(e =>
    n.includes(e.name.toLowerCase()) || e.keywords.some(k => n.includes(k)))
  return hit ? hit.key : null
}
