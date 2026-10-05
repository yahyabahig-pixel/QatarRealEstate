// ---------------------------------------------------------------------------------------
// The assistant's vocabulary: Arabic (فصحى، مصري، خليجي) + English aliases → concepts.
//
// IMPORTANT: every alias below is written in its normalize()d form (ة→ه, أ→ا, ى→ي,
// no tashkeel) because matching happens on normalized text. "اللؤلؤة" is stored
// as "اللؤلؤه" — that is intentional, not a typo.
//
// Concepts do NOT hardcode what exists in the database. A type concept carries `match`
// tokens that are tested against the REAL catalog names at search time (live: the
// /api/catalog/property-types names; mock: mockData PROPERTY_TYPES). Same for amenities
// against the features catalog. If nothing in the catalog matches, the assistant says so
// instead of inventing a filter.
// ---------------------------------------------------------------------------------------

export const TYPES = {
  apartment: { aliases: ['شقق للبيع', 'شقق', 'شقه', 'شقت', 'ابارتمنت', 'ابارتمان', 'apartments', 'apartment', 'flats', 'flat'], match: ['apartment', 'flat'] },
  villa: { aliases: ['فيلات', 'فلل', 'فيلا', 'فله', 'فلا', 'villas', 'villa'], match: ['villa'] },
  studio: { aliases: ['استوديوهات', 'استوديو', 'ستوديو', 'استديو', 'studios', 'studio'], match: ['studio'] },
  penthouse: { aliases: ['بنتهاوس', 'بنت هاوس', 'penthouses', 'penthouse'], match: ['penthouse'] },
  duplex: { aliases: ['دوبلكس', 'دوبليكس', 'دبلكس', 'duplexes', 'duplex'], match: ['duplex'] },
  townhouse: { aliases: ['تاون هاوس', 'تاونهاوس', 'تاون هاوسات', 'townhouses', 'townhouse', 'town house'], match: ['townhouse', 'town house'] },
  office: { aliases: ['مكاتب', 'مكتب', 'اوفيس', 'offices', 'office'], match: ['office'] },
  shop: { aliases: ['محلات تجاريه', 'محل تجاري', 'محلات', 'محل', 'shops', 'shop', 'retail'], match: ['shop', 'retail'] },
  land: { aliases: ['اراضي', 'ارض', 'قطعه ارض', 'قطع اراضي', 'lands', 'land', 'plots', 'plot'], match: ['land', 'plot'] },
  compound: { aliases: ['كمبوند', 'كومبوند', 'مجمع سكني', 'compound'], match: ['compound'] },
  building: { aliases: ['عمارات', 'عماره', 'مبني كامل', 'مبني', 'building'], match: ['building'] },
  warehouse: { aliases: ['مخازن', 'مخزن', 'مستودع', 'مستودعات', 'warehouses', 'warehouse'], match: ['warehouse'] },
  chalet: { aliases: ['شاليهات', 'شاليه', 'chalets', 'chalet'], match: ['chalet'] },
  palace: { aliases: ['قصور', 'قصر', 'palaces', 'palace'], match: ['palace'] },
}

// label: the canonical name as it appears in the project's data (areas catalog / city
// values / listing titles). isCity: match the DTO city field; otherwise treated as an
// area/district within a city.
export const LOCATIONS = {
  pearl: { aliases: ['جزيره اللؤلؤه', 'اللؤلؤه', 'لؤلؤه', 'ذا بيرل', 'بيرل', 'the pearl', 'pearl qatar', 'pearl island', 'pearl'], label: 'The Pearl' },
  portoArabia: { aliases: ['بورتو ارابيا', 'بورتو عربيا', 'بورتو', 'porto arabia', 'porto'], label: 'Porto Arabia' },
  vivaBahriya: { aliases: ['فيفا بحريه', 'فيفا بحريا', 'viva bahriya'], label: 'Viva Bahriya' },
  qanat: { aliases: ['قناه كوارتييه', 'كوارتييه', 'qanat quartier', 'qanat'], label: 'Qanat Quartier' },
  westBay: { aliases: ['الخليج الغربي', 'خليج غربي', 'وست باي', 'west bay', 'westbay'], label: 'West Bay' },
  lusail: { aliases: ['لوسيل', 'لوسايل', 'لوسل', 'lusail'], label: 'Lusail', isCity: true },
  marina: { aliases: ['لوسيل مارينا', 'المارينا', 'مارينا', 'marina district', 'lusail marina', 'marina'], label: 'Lusail Marina District', city: 'Lusail' },
  foxHills: { aliases: ['فوكس هيلز', 'فوكس هيلس', 'fox hills', 'foxhills'], label: 'Fox Hills', city: 'Lusail' },
  qetaifan: { aliases: ['جزيره قطيفان', 'قطيفان', 'qetaifan island', 'qetaifan'], label: 'Qetaifan Island', city: 'Lusail' },
  doha: { aliases: ['الدوحه', 'دوحه', 'doha'], label: 'Doha', isCity: true },
  waab: { aliases: ['الوعب', 'وعب', 'al waab', 'alwaab', 'waab'], label: 'Al Waab', city: 'Doha' },
  msheireb: { aliases: ['مشيرب', 'وسط البلد', 'msheireb', 'downtown doha'], label: 'Msheireb', city: 'Doha' },
  alSadd: { aliases: ['السد', 'al sadd', 'alsadd'], label: 'Al Sadd', city: 'Doha' },
  wakrah: { aliases: ['الوكره', 'الوكرا', 'وكره', 'al wakrah', 'wakrah', 'al wakra'], label: 'Al Wakrah', isCity: true },
  rayyan: { aliases: ['الريان', 'ريان', 'al rayyan', 'rayyan'], label: 'Al Rayyan', isCity: true },
  khor: { aliases: ['الخور', 'al khor', 'alkhor', 'khor'], label: 'Al Khor', isCity: true },
  simaisma: { aliases: ['سميسمه', 'سيمسمه', 'سمسمه', 'simaisma'], label: 'Simaisma' },
  oldAirport: { aliases: ['المطار القديم', 'طريق المطار القديم', 'old airport'], label: 'Old Airport Road', city: 'Doha' },
}

// match: tested (contains, case-insensitive) against the real feature/amenity names —
// live: "Swimming Pool", "Sea View", "Maid's Room"… ; mock: "Shared Pool", "Private Pool"…
export const AMENITIES = {
  pool: { aliases: ['حمام سباحه', 'حوض سباحه', 'مسبح', 'بسين', 'بيسين', 'swimming pool', 'pool'], match: ['pool'] },
  seaView: { aliases: ['اطلاله بحريه', 'اطلاله علي البحر', 'اطلاله عالبحر', 'فيو بحر', 'فيو عالبحر', 'اطلاله البحر', 'يطل علي البحر', 'sea view', 'seaview', 'water view'], match: ['sea view'] },
  maidRoom: { aliases: ['غرفه خادمه', 'غرفه شغاله', 'غرفه عاملة', 'غرفه خدامه', 'maid room', 'maids room', 'maid s room'], match: ['maid'] },
  parking: { aliases: ['موقف سيارات', 'مواقف سيارات', 'موقف', 'مواقف', 'باركينج', 'باركنج', 'جراج', 'كراج', 'parking', 'garage'], match: ['parking'] },
  balcony: { aliases: ['بلكونه', 'بلكون', 'بالكونه', 'شرفه', 'تراس', 'balcony', 'balconies', 'terrace'], match: ['balcon', 'terrace'] },
  gym: { aliases: ['صاله رياضيه', 'جيم', 'نادي رياضي', 'gym', 'fitness'], match: ['gym', 'fitness'] },
  furnished: { aliases: ['مفروشه بالكامل', 'مفروش بالكامل', 'مفروشه', 'مفروش', 'بالفرش', 'بالاثاث', 'furnished'], match: ['furnish'] },
  garden: { aliases: ['حديقه خاصه', 'حديقه', 'جنينه', 'private garden', 'garden'], match: ['garden'] },
  elevator: { aliases: ['مصعد', 'اسانسير', 'elevator', 'lift'], match: ['elevator', 'lift'] },
  security: { aliases: ['امن وحراسه', 'حراسه', 'امن', 'security'], match: ['security'] },
  pets: { aliases: ['يسمح بالحيوانات', 'حيوانات اليفه', 'قطط', 'كلاب', 'pet friendly', 'pets allowed', 'pets'], match: ['pet'] },
  beach: { aliases: ['شاطئ خاص', 'قريب من الشاطئ', 'شاطئ', 'شاطي', 'علي البحر مباشره', 'beach access', 'beachfront', 'beach'], match: ['beach'] },
  smartHome: { aliases: ['سمارت هوم', 'منزل ذكي', 'بيت ذكي', 'smart home'], match: ['smart'] },
  centralAc: { aliases: ['تكييف مركزي', 'مكيف مركزي', 'central ac', 'central a c', 'central air'], match: ['a/c', 'central'] },
  concierge: { aliases: ['كونسيرج', 'استقبال', 'concierge'], match: ['concierge'] },
  metro: { aliases: ['قريب من المترو', 'جنب المترو', 'مترو', 'near metro', 'metro'], match: ['metro'] },
}

export const PURPOSES = {
  sale: ['للبيع', 'لبيع', 'للتمليك', 'تمليك', 'شراء', 'اشتري', 'ابي اشتري', 'عايز اشتري', 'ابغي اشتري', 'بيع', 'for sale', 'buying', 'buy', 'purchase', 'sale'],
  rent: ['للايجار', 'ايجار', 'للاجار', 'اجار', 'استئجار', 'استاجر', 'ااجر', 'اجر', 'for rent', 'renting', 'rent', 'rental', 'lease'],
}

export const SORTS = {
  priceAsc: ['الارخص', 'ارخص حاجه', 'ارخص شي', 'ارخص', 'اقل سعر', 'الاقل سعرا', 'cheapest', 'lowest price', 'cheaper'],
  priceDesc: ['الاغلي', 'اغلي حاجه', 'اغلي', 'اعلي سعر', 'الافخم', 'most expensive', 'highest price', 'luxury first'],
  sizeDesc: ['الاكبر مساحه', 'اكبر مساحه', 'الاوسع', 'اوسع', 'الاكبر', 'اكبر', 'biggest', 'largest', 'most spacious', 'bigger'],
  newest: ['الاحدث', 'الاجدد', 'احدث', 'newest', 'latest', 'most recent'],
}

export const FEATURED_WORDS = ['عقارات مميزه', 'العقارات المميزه', 'مميزه', 'مميز', 'حصريه', 'حصري', 'featured', 'exclusive', 'premium']

// Small-talk. Checked against the WHOLE message (after stripping polite fillers), so
// "السلام عليكم عايز شقة" still routes to search — with a greeting prefixed to the reply.
export const GREETINGS = {
  salam: ['السلام عليكم ورحمه الله وبركاته', 'السلام عليكم ورحمه الله', 'السلام عليكم', 'سلام عليكم', 'السلام', 'سلام'],
  morning: ['صباح الخير', 'صباح النور', 'صباحو', 'good morning', 'morning'],
  evening: ['مساء الخير', 'مساء النور', 'مساءو', 'مسا الخير', 'good evening', 'good afternoon', 'evening'],
  hi: ['اهلا وسهلا', 'اهلين', 'اهلا', 'هلا والله', 'هلا', 'مرحبتين', 'مرحبا', 'مرحبه', 'هاي', 'هالو', 'يا هلا', 'hello', 'hey there', 'hey', 'hii', 'hi'],
  howAreYou: ['ازيك عامل ايه', 'ازيك', 'ازيكم', 'عامل ايه', 'اخبارك ايه', 'اخبارك', 'كيفك', 'كيف الحال', 'كيف حالك', 'شلونك', 'شخبارك', 'وش اخبارك', 'how are you', 'how is it going', 'hows it going'],
}

export const THANKS = ['شكرا جزيلا', 'شكرا ليك', 'شكرا لك', 'شكرا', 'متشكر اوي', 'متشكر', 'مشكور', 'تسلم ايدك', 'تسلم', 'يعطيك العافيه', 'جزاك الله خير', 'الف شكر', 'thank you so much', 'thank you', 'thanks a lot', 'thanks', 'thx', 'ty', 'appreciated']
export const BYE = ['مع السلامه', 'الي اللقاء', 'باي باي', 'باي', 'سلامات', 'تصبح علي خير', 'bye bye', 'goodbye', 'bye', 'see you', 'good night']
export const WHOAMI = ['من انت', 'انت مين', 'مين انت', 'انت ايه', 'انت شنو', 'انت بوت', 'انت روبوت', 'انت انسان', 'who are you', 'what are you', 'are you human', 'are you a bot', 'are you real']
export const HELP = ['مساعده', 'ساعدني', 'اعمل ايه', 'بتعمل ايه', 'تعمل ايه', 'تقدر تعمل ايه', 'شو بتسوي', 'وش تسوي', 'كيف استخدمك', 'help', 'what can you do', 'how do you work', 'how to use']
export const RESET = ['ابدا من جديد', 'من الاول', 'بحث جديد', 'امسح الفلاتر', 'صفر الفلاتر', 'الغي كل حاجه', 'reset', 'start over', 'new search', 'clear filters', 'clear all']

// Verbs that mean "drop this condition": «شيل شرط المسبح».
// Longest first: "من غير" has to be tried before "غير", or the longer phrase never fires.
//
// مش / غير / بلا were missing, and they are how people actually negate: "شقة مش مفروشة",
// "فيلا غير مفروشة". Without them the negation was invisible to the removal pass, and the
// amenity sweep then read "مفروشة" as a REQUIREMENT — so asking for an UNfurnished flat
// returned the furnished ones. A verb only counts when a known concept follows it
// immediately, so a bare "مش عارف" or "غير كده" still does nothing.
export const REMOVE_VERBS = ['شيل شرط', 'شيل', 'الغي شرط', 'الغي', 'امسح شرط', 'امسح', 'استغني عن', 'بلاش شرط', 'بلاش', 'من غير شرط', 'من غير', 'بدون شرط', 'بدون', 'ما ابي', 'ما ابغي', 'ما اريد', 'لا اريد', 'مش عايز شرط', 'مش عايز', 'مش عاوز', 'مش', 'غير', 'بلا', 'remove the', 'remove', 'drop the', 'drop', 'without', 'no need for', 'not interested in', 'forget the', 'forget', 'no']

// Availability questions — «هل عندك حاجة في West Bay؟» is a search, not small talk.
export const AVAILABILITY = ['هل عندك', 'هل عندكم', 'عندك حاجه', 'عندكم حاجه', 'عندك شي', 'عندكم شي', 'في عندك', 'فيه عندك', 'ايش عندك', 'وش عندك', 'ايه عندك', 'do you have', 'anything in', 'got anything', 'is there anything', 'what do you have']
