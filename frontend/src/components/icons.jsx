/* ---------------------------------------------------------------------------
   Icon system — one style for the whole product.
   Lucide-style strokes: 24px viewBox, stroke-width 2, round caps and joins,
   currentColor. Sized with the usual `w-4 h-4` / `w-5 h-5` utilities.
   Add new icons here, never inline in components, so stroke weight and
   geometry stay consistent everywhere.
   ------------------------------------------------------------------------- */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const make = (name, children) => {
  const C = ({ className = 'w-4 h-4', strokeWidth }) => (
    <svg {...base} strokeWidth={strokeWidth || base.strokeWidth} className={className}>{children}</svg>
  )
  C.displayName = name
  return C
}

/* property specs */
export const IconBed = make('IconBed', <>
  <path d="M2 9V5" /><path d="M2 16h20" /><path d="M2 20v-8h20v8" />
  <path d="M2 12V9h8v3" /><path d="M12 12V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4" />
</>)
export const IconBath = make('IconBath', <>
  <path d="M4 12h16a1 1 0 0 1 1 1 5 5 0 0 1-5 5H8a5 5 0 0 1-5-5 1 1 0 0 1 1-1z" />
  <path d="M6 12V5a2 2 0 0 1 4 0" /><path d="M6 20l-1 2" /><path d="M18 20l1 2" />
</>)
export const IconArea = make('IconArea', <>
  <rect x="3" y="3" width="18" height="18" rx="2" />
  <path d="M8 3v3M16 3v3M3 8h3M3 16h3M21 8h-3M21 16h-3M8 21v-3M16 21v-3" />
</>)
export const IconPin = make('IconPin', <>
  <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" />
</>)

/* navigation + actions */
export const IconSearch = make('IconSearch', <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>)
export const IconFilter = make('IconFilter', <>
  <path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" />
</>)
export const IconSliders = make('IconSliders', <>
  <path d="M4 8h10M18 8h2M4 16h2M10 16h10" /><circle cx="16" cy="8" r="2" /><circle cx="8" cy="16" r="2" />
</>)
export const IconHeart = ({ className = 'w-4 h-4', filled = false }) => (
  <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <path d="M12 20.5S3.5 15 3.5 9a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2c0 6-8.5 11.5-8.5 11.5z" />
  </svg>
)
export const IconMap = make('IconMap', <>
  <path d="M9 5 3 7v12l6-2 6 2 6-2V3l-6 2-6-2z" /><path d="M9 5v12M15 7v12" />
</>)
export const IconList = make('IconList', <>
  <path d="M8 6h13M8 12h13M8 18h13" /><path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
</>)
export const IconMenu = make('IconMenu', <path d="M4 6h16M4 12h16M4 18h16" />)
export const IconX = make('IconX', <path d="M6 6l12 12M18 6 6 18" />)
export const IconChevronDown = make('IconChevronDown', <path d="m6 9 6 6 6-6" />)
export const IconChevronLeft = make('IconChevronLeft', <path d="m15 6-6 6 6 6" />)
export const IconChevronRight = make('IconChevronRight', <path d="m9 6 6 6-6 6" />)
export const IconArrowRight = make('IconArrowRight', <><path d="M4 12h16" /><path d="m13 5 7 7-7 7" /></>)
export const IconArrowUpRight = make('IconArrowUpRight', <><path d="M7 17 17 7" /><path d="M8 7h9v9" /></>)
export const IconPlus = make('IconPlus', <path d="M12 5v14M5 12h14" />)
export const IconCheck = make('IconCheck', <path d="m4 12.5 5 5L20 6.5" />)
export const IconShare = make('IconShare', <>
  <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
  <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
</>)
export const IconEye = make('IconEye', <>
  <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" />
</>)
export const IconCamera = make('IconCamera', <>
  <path d="M4 7h3l2-2.5h6L17 7h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
  <circle cx="12" cy="13" r="3.5" />
</>)

/* contact */
export const IconPhone = make('IconPhone', <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />)
export const IconMail = make('IconMail', <>
  <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
</>)
export const IconSend = make('IconSend', <><path d="m21 3-9.5 9.5" /><path d="M21 3 14 21l-2.5-8.5L3 10z" /></>)

/* admin / misc */
export const IconHome = make('IconHome', <><path d="m3 10.5 9-7.5 9 7.5" /><path d="M5 9.5V21h14V9.5" /></>)
export const IconDashboard = make('IconDashboard', <>
  <rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" />
  <rect x="13" y="10" width="8" height="11" rx="1.5" /><rect x="3" y="13" width="8" height="8" rx="1.5" />
</>)
export const IconBuilding = make('IconBuilding', <>
  <rect x="4" y="3" width="10" height="18" rx="1" /><path d="M14 8h5a1 1 0 0 1 1 1v12" />
  <path d="M8 7h.01M11 7h.01M8 11h.01M11 11h.01M8 15h.01M11 15h.01" /><path d="M2 21h20" />
</>)
export const IconCrane = make('IconCrane', <>
  <path d="M3 21h18" /><path d="M6 21V7l9-4v18" /><path d="M15 9h5v12" /><path d="M9 9h.01M12 9h.01M9 13h.01M12 13h.01M9 17h.01M12 17h.01" />
</>)
export const IconUsers = make('IconUsers', <>
  <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
  <path d="M16 5a3.5 3.5 0 0 1 0 7" /><path d="M17.5 13.6A6.5 6.5 0 0 1 21.5 20" />
</>)
export const IconUser = make('IconUser', <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>)
export const IconBriefcase = make('IconBriefcase', <>
  <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 12h18" />
</>)
export const IconSparkle = make('IconSparkle', <path d="M12 3v0c.6 4.8 4.2 8.4 9 9v0c-4.8.6-8.4 4.2-9 9v0c-.6-4.8-4.2-8.4-9-9v0c4.8-.6 8.4-4.2 9-9z" />)
export const IconInbox = make('IconInbox', <>
  <path d="M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /><path d="M5 4h14l2 9h-5.5a3.5 3.5 0 0 1-7 0H3z" />
</>)
export const IconShield = make('IconShield', <path d="M12 2.5 20 6v6c0 5-3.5 8.5-8 9.5-4.5-1-8-4.5-8-9.5V6z" />)
export const IconKey = make('IconKey', <>
  <circle cx="8" cy="16" r="4.5" /><path d="m11.5 12.5 9-9" /><path d="M17 7l2.5 2.5M14 10l2 2" />
</>)
export const IconSettings = make('IconSettings', <>
  <circle cx="12" cy="12" r="3" />
  <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.06-.4.1-.8.1-1.2z" />
</>)
export const IconLogout = make('IconLogout', <>
  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
</>)
export const IconTrash = make('IconTrash', <>
  <path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 14h10l1-14" /><path d="M10 11v6M14 11v6" />
</>)
export const IconPencil = make('IconPencil', <path d="M17 3.5 20.5 7 8 19.5 3.5 20.5 4.5 16z" />)
export const IconAward = make('IconAward', <>
  <circle cx="12" cy="9" r="5.5" /><path d="m8.8 13.5-1.3 7 4.5-2.5 4.5 2.5-1.3-7" />
</>)
export const IconCalendar = make('IconCalendar', <>
  <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
</>)
export const IconPlay = make('IconPlay', <path d="M7 4.5v15l12-7.5z" />)
export const IconApple = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M16.7 12.9c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-2-.9-3.2-.9C2.8 7.4 1 8.8 1 11.6c0 1.7.3 3.4 1 5.2.9 2.1 3.2 5.7 5.1 5.6 1-.02 1.7-.7 3-.7s1.9.7 3.2.7c1.9 0 4-3.3 4.8-5.4-2.4-1.1-2.4-3.9-2.4-4.1zM13.9 5.6c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z" />
  </svg>
)
export const IconTelegram = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M21.9 4.1c.3-1.1-.4-1.6-1.2-1.3L2.7 9.7c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 10.7-6.7c.5-.3 1-.15.6.2l-8.7 7.8-.3 4.6c.5 0 .7-.2 1-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8z" />
  </svg>
)
