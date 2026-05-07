import { Link } from 'react-router-dom'
import type { Program } from '../../mock/types'
import { trackEvent } from '../../lib/analytics'

interface ProgramCardProps {
  program: Program
}

const intensityLabel: Record<Program['intensity'], string> = {
  low: '低强度',
  medium: '中强度',
  high: '高强度',
}

export function ProgramCard({ program }: ProgramCardProps) {
  return (
    <article className="card-hover overflow-hidden rounded-[28px] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(145deg,#133224,#0b271c)] shadow-[var(--shadow-card)]">
      <div className="relative overflow-hidden">
        <img src={program.heroImageUrl} alt={program.title} className="h-52 w-full object-cover transition-transform duration-500 hover:scale-[1.04]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(8,20,15,0.7)] to-transparent" />
      </div>
      <div className="space-y-3 p-5 text-[#E8EFE8]">
        <div className="flex flex-wrap gap-2 text-xs text-white/80">
          <span className="rounded-[999px] bg-white/15 px-3 py-1">{program.durationText}</span>
          <span className="rounded-[999px] bg-white/15 px-3 py-1">{intensityLabel[program.intensity]}</span>
          {program.themeTags[0] && <span className="rounded-[999px] bg-white/15 px-3 py-1">{program.themeTags[0]}</span>}
        </div>
        <p className="text-sm font-medium text-white/85">{program.locationName}</p>
        <h3 className="text-[1.55rem] leading-tight font-semibold text-white md:text-[1.75rem]">{program.title}</h3>
        <p className="text-xs text-white/85 md:text-sm">{program.brief}</p>
        <div className="flex items-center justify-between pt-2 text-sm">
          <p className="text-[#D4E2D6]">
            ¥{program.priceFrom} - ¥{program.priceTo}
          </p>
          <p className="text-[#D4E2D6]">剩余 {program.spotsLeft} 席</p>
        </div>
        <Link
          to={`/programs/${program.slug}`}
          onClick={() => trackEvent('click_program_card', { slug: program.slug })}
          className="mt-2 inline-flex min-h-10 w-fit items-center justify-center rounded-[999px] bg-white px-5 py-2 text-sm font-semibold text-[#173325] hover:bg-[#f4f7f4]"
        >
          查看详情
        </Link>
      </div>
    </article>
  )
}
