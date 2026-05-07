import { resources } from '../mock/resources'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { trackEvent } from '../lib/analytics'

export function ResourcesPage() {
  const [category, setCategory] = useState('全部')
  const categories = useMemo(() => ['全部', ...new Set(resources.map((item) => item.category))], [])

  useEffect(() => {
    trackEvent('view_resources')
  }, [])

  const filtered = category === '全部' ? resources : resources.filter((item) => item.category === category)

  return (
    <>
      <section className="relative -mt-6 flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#1f3328] px-6 pt-24 text-white">
        <img
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1800&q=80"
          alt="资源中心首屏背景"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-[rgba(16,25,21,0.5)]" />
        <div className="relative z-10 max-w-4xl text-center">
          <h1 className="text-4xl font-semibold md:text-6xl">资源中心</h1>
          <p className="mt-4 text-base text-white/90 md:text-lg">像一本自然学习刊物，持续沉淀课程方法、观察指南与保护地故事。</p>
        </div>
      </section>

      <section className="section-shell bg-[var(--bg-base)]">
      <div className="container-page">
      <p className="max-w-3xl text-[var(--text-secondary)]">科普栏目、方法论文章与家长指南，帮助你持续学习与行动。</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`rounded-full border px-3 py-1 text-sm ${
              category === item
                ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-[#f7f3ea]'
                : 'border-[rgba(47,79,58,0.18)] bg-[rgba(255,251,245,0.84)] text-[var(--text-secondary)]'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-4">
        {filtered.map((item) => (
          <Link
            key={item.id}
            to={`/resources/${item.slug}`}
            className="block"
            onClick={() => trackEvent('click_resource_card', { slug: item.slug })}
          >
            <article className="card card-hover cursor-pointer p-6">
              <p className="text-xs text-[var(--brand-accent)]">{item.category}</p>
              <h2 className="mt-1 text-lg font-medium text-[var(--text-primary)]">{item.title}</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{item.summary}</p>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">{item.date}</p>
              <p className="mt-3 text-xs font-medium text-[var(--brand-primary)]">阅读全文与学习进度 →</p>
            </article>
          </Link>
        ))}
      </div>
      </div>
      </section>
    </>
  )
}
