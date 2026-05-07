import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="container-page py-16">
      <div className="card p-8 text-center">
        <h1 className="text-3xl font-semibold">页面不存在</h1>
        <p className="mt-3 text-slate-600">你访问的页面可能已移动或删除。</p>
        <Link
          to="/"
          className="mt-4 inline-flex cursor-pointer rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-emerald-800"
        >
          返回首页
        </Link>
      </div>
    </section>
  )
}
