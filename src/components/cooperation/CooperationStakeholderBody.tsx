import { useMemo, useRef, useState } from 'react'
import type { CooperationStakeholderSection, CooperationTableRow } from '../../mock/cooperationStakeholders'

/** 主图失败时依次尝试，避免裂图（与 mock 中 hero 错开） */
const HERO_FALLBACK_POOL = [
  'https://images.unsplash.com/photo-1501554728187-ce583db33af7?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1503437313881-503a91226402?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1444464666168-49d633b86797?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=900&q=80',
] as const

const HERO_PLACEHOLDER_SVG =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="192" viewBox="0 0 900 192"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#13261a"/><stop offset="1" stop-color="#2f4f3a"/></linearGradient></defs><rect width="900" height="192" fill="url(#g)"/></svg>`,
  )

function PartnerCardHeroImage({ primary }: { primary: string }) {
  const candidates = useMemo(() => {
    const list: string[] = [primary]
    for (const u of HERO_FALLBACK_POOL) {
      if (!list.includes(u)) list.push(u)
    }
    list.push(HERO_PLACEHOLDER_SVG)
    return list
  }, [primary])

  const [idx, setIdx] = useState(0)
  const src = candidates[Math.min(idx, candidates.length - 1)]!

  return (
    <img
      src={src}
      alt=""
      role="presentation"
      className="h-48 w-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setIdx((i) => Math.min(i + 1, candidates.length - 1))}
    />
  )
}

function PartnerProjectsCarousel({
  rows,
  sectionTitle,
}: {
  rows: CooperationTableRow[]
  sectionTitle: string
}) {
  const stripRef = useRef<HTMLDivElement | null>(null)

  const scrollByDir = (dir: -1 | 1) => {
    const el = stripRef.current
    if (!el) return
    const first = el.querySelector<HTMLElement>('[data-carousel-card]')
    const step = (first?.offsetWidth ?? 300) + 16
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <div className="mt-10 overflow-hidden rounded-[28px] bg-[var(--brand-deep)] px-4 py-8 text-white md:px-6 md:py-10">
      <div className="mx-auto max-w-3xl text-center">
        <h3 className="text-[clamp(1.35rem,2.8vw,1.85rem)] font-semibold leading-tight tracking-tight text-white md:text-[clamp(1.5rem,3vw,2rem)]">
          伙伴项目
        </h3>
      </div>

      <div className="relative mx-auto mt-6 max-w-[1700px]">
        <button
          type="button"
          aria-label="上一组伙伴项目"
          onClick={() => scrollByDir(-1)}
          className="absolute left-0 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-[rgba(13,26,20,0.45)] text-lg text-white backdrop-blur-sm transition hover:bg-white/15 md:flex"
        >
          ‹
        </button>
        <button
          type="button"
          aria-label="下一组伙伴项目"
          onClick={() => scrollByDir(1)}
          className="absolute right-0 top-[42%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-[rgba(13,26,20,0.45)] text-lg text-white backdrop-blur-sm transition hover:bg-white/15 md:flex"
        >
          ›
        </button>

        <div
          ref={stripRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-1 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {rows.map((row) => {
            return (
              <article
                key={row.direction}
                data-carousel-card
                className="w-[min(88vw,320px)] shrink-0 snap-start overflow-hidden rounded-[22px] border border-white/15 bg-[rgba(13,26,20,0.55)] md:w-[calc((100%-2rem)/3)] md:min-w-[260px]"
              >
                <PartnerCardHeroImage primary={row.heroImageUrl} />
                <div className="space-y-2 p-4">
                  <p className="text-xs text-white/75">
                    {sectionTitle} · 伙伴共建
                  </p>
                  <h4 className="text-lg font-semibold leading-snug text-white md:text-xl">{row.direction}</h4>
                  <p className="text-sm leading-relaxed text-white/85">{row.content}</p>
                  <p className="border-t border-white/10 pt-2 text-xs leading-relaxed text-white/65">{row.terramarValue}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CooperationStakeholderBody({ sections }: { sections: CooperationStakeholderSection[] }) {
  return (
    <div className="mt-12 flex flex-col gap-10 md:mt-16 md:gap-14">
      {sections.map((section) => (
        <article key={section.id} className="trust-card relative overflow-hidden p-6 md:p-9">
          <div
            className="pointer-events-none absolute -right-20 -top-28 h-56 w-56 rounded-full bg-[rgba(47,79,58,0.05)] blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-center font-serif text-[clamp(1.5rem,3.5vw,1.95rem)] font-semibold leading-snug tracking-tight text-[var(--brand-deep)]">
              {section.title}
            </h2>
            {section.subtitle ? (
              <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">{section.subtitle}</p>
            ) : null}

            <ul className="mt-7 flex flex-wrap justify-center gap-2">
              {section.partners.map((p) => (
                <li
                  key={p}
                  className="rounded-full border border-black bg-transparent px-4 py-1.5 text-sm text-[var(--brand-deep)]"
                >
                  {p}
                </li>
              ))}
            </ul>

            <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-[var(--text-secondary)] md:text-[15px]">
              {section.goal}
            </p>

            <PartnerProjectsCarousel rows={section.rows} sectionTitle={section.title} />
          </div>
        </article>
      ))}
    </div>
  )
}
