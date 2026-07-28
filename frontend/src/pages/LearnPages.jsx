import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useData } from '../store/DataContext'
import { SectionHeading } from '../components/ui'
import { LogoMarquee, InquiryForm } from '../components/misc'

const STATS = [
  { n: 1.5, suffix: 'B+ QAR', label: 'total sales facilitated' },
  { n: 1, suffix: 'M+', label: 'leads per year' },
  { n: 60, suffix: '%+', label: 'of leads from our portal' },
  { n: 8, suffix: '+ years', label: 'of platform development' },
]

function Counter({ n, suffix }) {
  const [val, setVal] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      const steps = 40; let i = 0
      const t = setInterval(() => { i++; setVal(+(n * i / steps).toFixed(1)); if (i >= steps) clearInterval(t) }, 30)
      io.disconnect()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [n])
  return <span ref={ref} className="h-serif text-4xl text-gold">{val % 1 === 0 ? val : val.toFixed(1)}{suffix}</span>
}

const AUDIENCES = [
  { title: 'Empowering Agents & Brokers', cta: 'Get Started Today', cat: 'agents', img: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80' },
  { title: 'For Investors and Developers', cta: 'Start Exploring', cat: 'investors', img: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80' },
  { title: 'Exceptional Service for Our Clients', cta: 'Discover Services', cat: 'clients', img: 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=900&q=80' },
]

export function LearnHub() {
  const { articles } = useData()
  const sections = [
    { key: 'agents', title: 'Agent resources', blurb: 'The path from first licence to elite producer.' },
    { key: 'investors', title: 'Investor & developer resources', blurb: 'Regulations, yields and partnership routes.' },
    { key: 'clients', title: 'Client resources', blurb: 'Guides that make every step transparent.' },
  ]
  return (
    <div className="pt-24 pb-0">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="eyebrow mb-2">Learning Hub</div>
          <h1 className="h-serif text-4xl md:text-5xl">Discover Your Path to Success</h1>
        </div>
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {AUDIENCES.map(a => (
            <a key={a.cat} href={`#${a.cat}`} className="relative h-80 overflow-hidden group">
              <img src={a.img} alt={a.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-black/50 group-hover:bg-black/40 transition-colors" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-6">
                <h3 className="h-serif text-2xl mb-3">{a.title}</h3>
                <span className="btn-gold !py-2 text-xs">{a.cta}</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="bg-ink text-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map(s => (
            <div key={s.label}><Counter n={s.n} suffix={s.suffix} /><p className="text-neutral-400 text-sm mt-2">{s.label}</p></div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto px-4"><LogoMarquee dark /></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-16 space-y-16">
        {sections.map(sec => (
          <section key={sec.key} id={sec.key}>
            <SectionHeading eyebrow={sec.blurb} title={sec.title} link="#" linkLabel="Browse all" />
            <div className="grid md:grid-cols-3 gap-6">
              {articles.filter(ar => ar.category === sec.key && ar.published).slice(0, 3).map(ar => (
                <Link key={ar.id} to={`/learn/${ar.slug}`} className="group border border-neutral-200 lift overflow-hidden">
                  <div className="overflow-hidden"><img src={ar.coverImage} alt={ar.title} className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
                  <div className="p-4 flex items-center justify-between gap-3">
                    <h3 className="h-serif text-lg leading-snug">{ar.title}</h3>
                    <span className="text-gold text-xl group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="grid md:grid-cols-2 gap-10 items-start border-t border-neutral-200 pt-14 pb-8">
          <div>
            <h2 className="h-serif text-3xl mb-4">Let's connect</h2>
            <ul className="space-y-3 text-neutral-600">
              <li>✦ A response within one business day, always</li>
              <li>✦ Advice grounded in live transaction data</li>
              <li>✦ One coordinator from first call to closed deal</li>
            </ul>
          </div>
          <InquiryForm source="Learn contact" />
        </section>
      </div>
    </div>
  )
}

export function ArticlePage() {
  const { slug } = useParams()
  const { articles } = useData()
  const ar = articles.find(x => x.slug === slug && x.published)
  if (!ar) return <div className="pt-32 text-center pb-20"><h1 className="h-serif text-3xl">Article not found</h1></div>
  const related = articles.filter(x => x.category === ar.category && x.id !== ar.id && x.published).slice(0, 3)

  return (
    <div>
      <section className="relative h-[45vh] min-h-[320px] flex items-end">
        <img src={ar.coverImage} alt={ar.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/30" />
        <div className="relative max-w-3xl mx-auto px-4 pb-12 text-white w-full">
          <div className="eyebrow mb-2">{ar.category} resources</div>
          <h1 className="h-serif text-3xl md:text-5xl">{ar.title}</h1>
        </div>
      </section>
      <article className="max-w-3xl mx-auto px-4 py-14 leading-relaxed text-neutral-700">
        {ar.body.split('\n').map((line, i) => {
          if (!line.trim()) return null
          const isHeading = line.length < 60 && !line.endsWith('.') && !line.startsWith('•')
          return isHeading && i > 0
            ? <h2 key={i} className="h-serif text-2xl text-ink mt-8 mb-3">{line}</h2>
            : <p key={i} className="mb-4">{line}</p>
        })}
      </article>
      {related.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 pb-16">
          <SectionHeading eyebrow="Keep reading" title="Related articles" />
          <div className="grid md:grid-cols-3 gap-6">
            {related.map(r => (
              <Link key={r.id} to={`/learn/${r.slug}`} className="group border border-neutral-200 lift overflow-hidden">
                <img src={r.coverImage} alt={r.title} className="h-40 w-full object-cover" />
                <div className="p-4 h-serif text-lg group-hover:text-gold transition-colors">{r.title}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
