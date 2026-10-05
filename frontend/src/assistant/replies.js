// ---------------------------------------------------------------------------------------
// The Conversation Layer's voice: curated, polite, bilingual reply pools + the filter
// summary line. Reply language follows the USER'S MESSAGE language (Arabic in → Arabic
// out), independent of the site chrome language.
//
// Each pool holds several phrasings; pick() rotates randomly but never repeats the same
// variant twice in a row, so greetings feel human without ever being invented content.
// The assistant never claims to be a person and never fabricates property facts — every
// number shown next to these templates comes from the site's own data.
// ---------------------------------------------------------------------------------------

const POOLS = {
  'greet.salam': {
    ar: [
      'وعليكم السلام ورحمة الله وبركاته، أهلاً وسهلاً بك. كيف يمكنني مساعدتك في العثور على العقار المناسب؟',
      'وعليكم السلام ورحمة الله، حيّاك الله. أخبرني عمّا تبحث عنه — شقة، فيلا، أو أي عقار آخر.',
      'وعليكم السلام، أهلاً بك. يسعدني مساعدتك في البحث عن عقار — ما الذي تبحث عنه؟',
    ],
    en: [
      'Wa alaykum assalam, welcome! How can I help you find the right property?',
      'Wa alaykum assalam! Tell me what you are looking for — an apartment, a villa, or something else.',
    ],
  },
  'greet.morning': {
    ar: [
      'صباح النور، أهلاً وسهلاً بك. كيف يمكنني مساعدتك اليوم؟',
      'صباح الخير والسرور. تبحث عن عقار للبيع أم للإيجار؟',
      'صباح النور. يسعدني أساعدك — ما الذي تبحث عنه؟',
    ],
    en: [
      'Good morning! How can I help you today?',
      'Good morning — are you looking to buy or to rent?',
    ],
  },
  'greet.evening': {
    ar: [
      'مساء النور، أهلاً وسهلاً بك. كيف يمكنني مساعدتك؟',
      'مساء الخير. يسعدني مساعدتك في إيجاد العقار المناسب — ما طلبك؟',
      'مساء النور. تحب تبحث عن شقة، فيلا، أم شيء آخر؟',
    ],
    en: [
      'Good evening! How can I help you?',
      'Good evening — tell me what kind of property you have in mind.',
    ],
  },
  'greet.hi': {
    ar: [
      'أهلاً وسهلاً بك. كيف يمكنني مساعدتك في البحث عن عقار؟',
      'يا هلا! أخبرني عمّا تبحث عنه وسأعرض لك المتاح فعلاً على الموقع.',
      'أهلاً بك في المدينة. تبحث عن شراء أم إيجار؟',
    ],
    en: [
      'Hello and welcome! How can I help you find a property?',
      'Hi there — tell me what you are looking for and I will show you what we actually have.',
    ],
  },
  'greet.howAreYou': {
    ar: [
      'أهلاً وسهلاً، بخير والحمد لله. كيف أقدر أساعدك في البحث عن عقار؟',
      'الحمد لله بخير، وأتمنى لك يومًا طيبًا. ما الذي تبحث عنه اليوم؟',
    ],
    en: [
      'I am doing well, thank you for asking! How can I help you with your property search?',
      'All good here — what kind of property can I help you find today?',
    ],
  },
  thanks: {
    ar: ['العفو، يسعدني مساعدتك.', 'على الرحب والسعة. لو احتجت أي شيء آخر أنا موجود.', 'العفو! أتمنى لك التوفيق، وأنا هنا لو حاب تكمل البحث.'],
    en: ['You are most welcome — happy to help.', 'Any time! I am here if you need anything else.'],
  },
  bye: {
    ar: ['مع السلامة، وأهلاً بك في أي وقت.', 'في أمان الله. يسعدنا خدمتك دائمًا.', 'إلى اللقاء، وبالتوفيق إن شاء الله.'],
    en: ['Goodbye — you are welcome back any time.', 'Take care! Happy to help whenever you return.'],
  },
  whoami: {
    ar: [
      'أنا المساعد العقاري الذكي الخاص بالموقع — لست موظفًا بشريًا. أعتمد فقط على بيانات الموقع الفعلية: أفهم طلبك، أحوّله لفلاتر دقيقة، وأعرض لك العقارات الموجودة فعلاً.',
    ],
    en: [
      'I am the site\'s smart real-estate assistant — not a human agent. I work only from the site\'s real data: I turn your request into precise filters and show you the listings that actually exist.',
    ],
  },
  help: {
    ar: [
      'أقدر أساعدك تلاقي عقارًا من بيانات الموقع الحقيقية. جرّب مثلاً: «شقة للإيجار في لوسيل غرفتين أقل من 8000 ريال» أو «فيلا للبيع بمسبح». وتقدر تعدّل بعدها: «خليها 3 غرف»، «زوّد الميزانية»، «وريني الأرخص».',
    ],
    en: [
      'I can search the site\'s real listings for you. Try: "2-bedroom apartment for rent in Lusail under 8000 QAR" or "villa for sale with a pool". You can refine afterwards: "make it 3 bedrooms", "increase the budget", "show me the cheapest".',
    ],
  },
  askPurpose: {
    ar: ['أكيد. هل تبحث عنها للبيع أم للإيجار؟', 'تمام. تفضّل الشراء أم الإيجار؟', 'حاضر — هل الطلب شراء أم إيجار؟'],
    en: ['Sure — are you looking to buy or to rent?', 'Of course. Would that be for sale or for rent?'],
  },
  askPurposeType: {
    ar: ['أكيد. هل تبحث عن شراء أم إيجار؟ وهل تفضّل شقة أم فيلا؟', 'تمام — للبيع أم للإيجار؟ وأي نوع يناسبك أكثر: شقة، فيلا، أم غيره؟'],
    en: ['Sure! Are you looking to buy or rent? And would you prefer an apartment or a villa?', 'Happy to help — buy or rent? And what type suits you: apartment, villa, something else?'],
  },
  none: {
    ar: [
      'للأسف لا توجد نتائج مطابقة تمامًا لطلبك الحالي ({crit}).',
      'بحثت في بيانات الموقع ولم أجد نتيجة مطابقة بالكامل لـ ({crit}).',
    ],
    en: [
      'I could not find an exact match for your current criteria ({crit}).',
      'Nothing in our current listings matches all of these conditions ({crit}).',
    ],
  },
  noneAdvice: {
    ar: ['يمكننا توسيع الميزانية، تغيير المنطقة، أو تقليل الشروط — قل لي ما تفضّل.'],
    en: ['We can widen the budget, change the area, or drop a condition — tell me what you prefer.'],
  },
  chat: {
    ar: [
      'أنا متخصص في عقارات هذا الموقع، فأقدر أساعدك في البحث والفلترة. جرّب مثلاً: «شقة غرفتين للإيجار في لوسيل» أو «فيلا للبيع أقل من 4 مليون».',
      'هذا خارج تخصصي — أنا مساعد البحث العقاري للموقع. اسألني مثلاً عن شقة، فيلا، مكتب أو أرض، بمنطقة وميزانية محددة.',
    ],
    en: [
      'I specialise in this site\'s properties, so I can help you search and filter. Try: "2-bed apartment for rent in Lusail" or "villa for sale under 4M".',
      'That is outside my lane — I am the property search assistant. Ask me for an apartment, villa, office or land with an area and budget.',
    ],
  },
  reset: {
    ar: ['تمام، بدأنا من جديد. ما الذي تبحث عنه؟', 'حاضر، مسحت كل الفلاتر. تفضّل بطلبك الجديد.'],
    en: ['Done — we are starting fresh. What are you looking for?', 'All filters cleared. What would you like to find?'],
  },
}

const lastPick = {}
export function pick(key, lang, vars) {
  const pool = (POOLS[key] && (POOLS[key][lang] || POOLS[key].en)) || ['']
  let idx = Math.floor(Math.random() * pool.length)
  const memoKey = `${key}:${lang}`
  if (pool.length > 1 && idx === lastPick[memoKey]) idx = (idx + 1) % pool.length
  lastPick[memoKey] = idx
  let text = pool[idx]
  if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
  return text
}

// ------------------------------------------------------------------------------------------
// Labels used when summarising the ACTIVE filters back to the user.
// ------------------------------------------------------------------------------------------
const TYPE_LABELS = {
  apartment: { ar: 'شقق', en: 'apartments' }, villa: { ar: 'فلل', en: 'villas' },
  studio: { ar: 'استوديوهات', en: 'studios' }, penthouse: { ar: 'بنتهاوس', en: 'penthouses' },
  duplex: { ar: 'دوبلكس', en: 'duplexes' }, townhouse: { ar: 'تاون هاوس', en: 'townhouses' },
  office: { ar: 'مكاتب', en: 'offices' }, shop: { ar: 'محلات تجارية', en: 'commercial shops' },
  land: { ar: 'أراضٍ', en: 'land plots' }, compound: { ar: 'كمبوند', en: 'compound units' },
  building: { ar: 'مبانٍ كاملة', en: 'whole buildings' }, warehouse: { ar: 'مستودعات', en: 'warehouses' },
  chalet: { ar: 'شاليهات', en: 'chalets' }, palace: { ar: 'قصور', en: 'palaces' },
}
const LOC_LABELS = {
  pearl: { ar: 'اللؤلؤة', en: 'The Pearl' }, portoArabia: { ar: 'بورتو أرابيا', en: 'Porto Arabia' },
  vivaBahriya: { ar: 'فيفا بحرية', en: 'Viva Bahriya' }, qanat: { ar: 'قناة كوارتييه', en: 'Qanat Quartier' },
  westBay: { ar: 'الخليج الغربي', en: 'West Bay' }, lusail: { ar: 'لوسيل', en: 'Lusail' },
  marina: { ar: 'مارينا لوسيل', en: 'Lusail Marina District' }, foxHills: { ar: 'فوكس هيلز', en: 'Fox Hills' },
  qetaifan: { ar: 'جزيرة قطيفان', en: 'Qetaifan Island' }, doha: { ar: 'الدوحة', en: 'Doha' },
  waab: { ar: 'الوعب', en: 'Al Waab' }, msheireb: { ar: 'مشيرب', en: 'Msheireb' },
  alSadd: { ar: 'السد', en: 'Al Sadd' }, wakrah: { ar: 'الوكرة', en: 'Al Wakrah' },
  rayyan: { ar: 'الريان', en: 'Al Rayyan' }, khor: { ar: 'الخور', en: 'Al Khor' },
  simaisma: { ar: 'سميسمة', en: 'Simaisma' }, oldAirport: { ar: 'طريق المطار القديم', en: 'Old Airport Road' },
}
const AMEN_LABELS = {
  pool: { ar: 'مسبح', en: 'pool' }, seaView: { ar: 'إطلالة بحرية', en: 'sea view' },
  maidRoom: { ar: 'غرفة خادمة', en: "maid's room" }, parking: { ar: 'مواقف سيارات', en: 'parking' },
  balcony: { ar: 'بلكونة', en: 'balcony' }, gym: { ar: 'جيم', en: 'gym' },
  furnished: { ar: 'مفروش', en: 'furnished' }, garden: { ar: 'حديقة', en: 'garden' },
  elevator: { ar: 'مصعد', en: 'elevator' }, security: { ar: 'حراسة 24/7', en: '24/7 security' },
  pets: { ar: 'يسمح بالحيوانات الأليفة', en: 'pet friendly' }, beach: { ar: 'وصول للشاطئ', en: 'beach access' },
  smartHome: { ar: 'سمارت هوم', en: 'smart home' }, centralAc: { ar: 'تكييف مركزي', en: 'central A/C' },
  concierge: { ar: 'كونسيرج', en: 'concierge' }, metro: { ar: 'قريب من المترو', en: 'near the metro' },
}

const L = (table, key, lang) => (table[key] ? table[key][lang] || table[key].en : key)
export const typeLabel = (k, lang) => L(TYPE_LABELS, k, lang)
export const locLabel = (k, lang) => L(LOC_LABELS, k, lang)
export const amenLabel = (k, lang) => L(AMEN_LABELS, k, lang)

const money = (n, lang) => `${Number(n).toLocaleString('en-US')} ${lang === 'ar' ? 'ر.ق' : 'QAR'}`

const bedsPhrase = (f, lang) => {
  const more = f.bedsExact === false ? (lang === 'ar' ? ' أو أكثر' : '+') : ''
  if (lang === 'ar') {
    if (f.beds === 0) return 'استوديو (بدون غرف)'
    if (f.beds === 1) return `غرفة${more}`
    if (f.beds === 2) return `غرفتين${more}`
    return `${f.beds} غرف${more}`
  }
  return `${f.beds} bed${f.beds === 1 ? '' : 's'}${more}`
}

// One readable line of the ACTIVE criteria — always shown with results so the user can
// verify the assistant understood correctly.
export function summarize(f, lang) {
  const ar = lang === 'ar'
  const parts = []
  parts.push(f.type ? typeLabel(f.type, lang) : (ar ? 'عقارات' : 'properties'))
  if (f.purpose) parts.push(f.purpose === 'sale' ? (ar ? 'للبيع' : 'for sale') : (ar ? 'للإيجار' : 'for rent'))
  if (f.location) parts.push((ar ? 'في ' : 'in ') + locLabel(f.location, lang))
  // An area outside the lexicon is still shown by name: the search WAS limited to it, so the
  // criteria line has to say so — otherwise a visitor reading «لا توجد نتائج» cannot tell
  // whether the area was the reason.
  else if (f.unknownPlace?.label) parts.push((ar ? 'في ' : 'in ') + f.unknownPlace.label)
  if (f.beds != null) parts.push(bedsPhrase(f, lang))
  if (f.baths != null) parts.push(ar ? `${f.baths}+ حمام` : `${f.baths}+ baths`)
  if (f.minArea != null && f.maxArea != null) parts.push(ar ? `${f.minArea}–${f.maxArea} م²` : `${f.minArea}–${f.maxArea} sqm`)
  else if (f.minArea != null) parts.push(ar ? `من ${f.minArea} م²` : `from ${f.minArea} sqm`)
  else if (f.maxArea != null) parts.push(ar ? `حتى ${f.maxArea} م²` : `up to ${f.maxArea} sqm`)
  if (f.minPrice != null && f.maxPrice != null) parts.push(ar ? `من ${money(f.minPrice, lang)} إلى ${money(f.maxPrice, lang)}` : `${money(f.minPrice, lang)} – ${money(f.maxPrice, lang)}`)
  else if (f.maxPrice != null) parts.push(ar ? `بحد أقصى ${money(f.maxPrice, lang)}` : `up to ${money(f.maxPrice, lang)}`)
  else if (f.minPrice != null) parts.push(ar ? `من ${money(f.minPrice, lang)}` : `from ${money(f.minPrice, lang)}`)
  if (f.amenities?.length) parts.push((ar ? 'مع ' : 'with ') + f.amenities.map((a) => amenLabel(a, lang)).join(ar ? ' و' : ' + '))
  // Stated as its own condition, because "بدون مسبح" is something the visitor asked FOR and
  // leaving it out of the summary makes a short result list look unexplained.
  if (f.excludeAmenities?.length) parts.push((ar ? 'بدون ' : 'without ') + f.excludeAmenities.map((a) => amenLabel(a, lang)).join(ar ? ' ولا ' : ' or '))
  if (f.featured) parts.push(ar ? 'من العقارات المميزة' : 'featured only')
  return parts.join(' · ')
}

// «وجدت لك 8 عقارات مطابقة» with correct Arabic number agreement.
export function countPhrase(n, lang) {
  if (lang === 'ar') {
    if (n === 1) return 'وجدت لك عقارًا واحدًا مطابقًا'
    if (n === 2) return 'وجدت لك عقارين مطابقين'
    if (n >= 3 && n <= 10) return `وجدت لك ${n} عقارات مطابقة`
    return `وجدت لك ${n} عقارًا مطابقًا`
  }
  return n === 1 ? 'I found 1 matching property' : `I found ${n} matching properties`
}

export function removalPhrase(removal, lang, excluded) {
  const ar = lang === 'ar'
  // «بدون مسبح» is not «شيل شرط المسبح». Saying "أزلت المسبح" for the first one tells the
  // user the opposite of what the search is about to do.
  if (removal.kind === 'amenity' && excluded?.includes(removal.key)) {
    const a = amenLabel(removal.key, lang)
    return ar ? `تمام، هستبعد اللي فيه ${a}.` : `Done — I will leave out anything with ${a}.`
  }
  const what = {
    amenity: () => amenLabel(removal.key, lang),
    location: () => (ar ? 'المنطقة' : 'the location'),
    type: () => (ar ? 'نوع العقار' : 'the property type'),
    price: () => (ar ? 'حد السعر' : 'the price limit'),
    beds: () => (ar ? 'شرط عدد الغرف' : 'the bedrooms condition'),
    baths: () => (ar ? 'شرط الحمامات' : 'the bathrooms condition'),
    size: () => (ar ? 'شرط المساحة' : 'the size condition'),
    featured: () => (ar ? 'شرط «مميز»' : 'the featured-only condition'),
  }[removal.kind]
  const label = what ? what() : ''
  return ar ? `تمام، أزلت ${label}.` : `Done — removed ${label}.`
}

export function relaxedIntro(kind, n, lang) {
  const ar = lang === 'ar'
  const map = {
    price: ar ? 'لكن يوجد قريب من ميزانيتك لو أمكن توسيعها قليلًا:' : 'But if the budget can stretch a little, these are close:',
    beds: ar ? 'لكن بعدد غرف قريب من طلبك يوجد:' : 'But with a slightly different bedroom count, there are:',
    amenities: ar ? 'لكن بدون بعض المميزات المطلوبة يوجد:' : 'But without some of the requested amenities, there are:',
    type: ar ? 'لكن من أنواع أخرى بنفس الشروط يوجد:' : 'But other property types match the rest of your criteria:',
    location: ar ? 'لكن في مناطق أخرى بنفس الشروط يوجد:' : 'But other areas match the rest of your criteria:',
  }
  return map[kind] || ''
}

export function notesPhrase(notes, lang) {
  const ar = lang === 'ar'
  const out = []
  if (notes?.unknownType)
    out.push(ar
      ? 'ملاحظة: هذا النوع غير متوفر في تصنيفات الموقع حاليًا، فبحثت بباقي الشروط.'
      : 'Note: that property type is not in the site\'s catalogue yet, so I searched with the rest of your criteria.')
  if (notes?.unverifiedAmenities?.length)
    out.push(ar
      ? `ملاحظة: (${notes.unverifiedAmenities.map((a) => amenLabel(a, 'ar')).join('، ')}) غير مسجّلة ضمن مميزات الموقع، فما قدرتش أفلتر بيها — راجعها في صفحة كل عقار.`
      : `Note: (${notes.unverifiedAmenities.map((a) => amenLabel(a, 'en')).join(', ')}) ${notes.unverifiedAmenities.length === 1 ? 'is' : 'are'} not in the site's amenity list, so I could not filter on ${notes.unverifiedAmenities.length === 1 ? 'it' : 'them'} — check each property's details page.`)
  if (notes?.droppedBudget) {
    const b = notes.droppedBudget
    const amount = b.max != null ? money(b.max, lang) : money(b.min, lang)
    const wasRent = b.from === 'rent'
    out.push(ar
      ? `ملاحظة: شلت ميزانية ${wasRent ? 'الإيجار' : 'الشراء'} (${amount}) لأنها مش مناسبة لبحث ${wasRent ? 'شراء' : 'إيجار'}. قل لي الميزانية الجديدة وأضيّق النتائج.`
      : `Note: I dropped the ${wasRent ? 'rental' : 'purchase'} budget (${amount}) — it does not carry over to a ${wasRent ? 'purchase' : 'rental'} search. Tell me the new budget and I will narrow these down.`)
  }
  return out
}

// Quick-start chips — phrased to match data that actually exists in the project.
export const SUGGESTIONS = {
  ar: ['أبحث عن شقة للبيع', 'أبحث عن عقار للإيجار', 'عقارات في لوسيل', 'عقارات في اللؤلؤة', 'فلل للبيع'],
  en: ['An apartment for sale', 'A property for rent', 'Properties in Lusail', 'Properties in The Pearl', 'Villas for sale'],
}
