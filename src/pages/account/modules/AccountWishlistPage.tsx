import { Link } from 'react-router-dom'
import { AccountBreadcrumb } from '../AccountBreadcrumb'

const ITEMS = [
  { slug: 'qianjiangyuan-weekend-family', title: '钱江源 · 周末亲子自然营' },
  { slug: 'city-half-day-birding', title: '城市半日观鸟入门' },
  { slug: 'summer-ecology-camp', title: '暑期生态营' },
]

export function AccountWishlistPage() {
  return (
    <div>
      <AccountBreadcrumb current="我的收藏" />
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">我的收藏</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">收藏的活动、课程与资源入口（演示列表）。原「课程意向单」能力可与此合并展示。</p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {ITEMS.map((it) => (
          <li key={it.slug}>
            <Link
              to={`/programs/${it.slug}`}
              className="card block h-full p-5 shadow-[var(--shadow-soft)] transition hover:shadow-md"
            >
              <p className="font-medium text-[var(--text-primary)]">{it.title}</p>
              <p className="mt-2 text-xs text-[var(--brand-primary)]">查看详情 →</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
