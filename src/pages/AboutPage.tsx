import { teamMembers } from '../mock/team'

const values = [
  { title: '专业性', text: '以真实生态场景为基础，结合跨学科导师团队，保证课程深度与方法论。' },
  { title: '连接性', text: '连接保护地、公众、学校与企业，让生态价值变成可参与的行动。' },
  { title: '行动性', text: '推动用户从体验走向长期参与，形成持续学习与社会影响。' },
  { title: '疗愈性', text: '让用户在自然观察和共学中获得情绪舒缓与生命连接。' },
]

export function AboutPage() {
  return (
    <>
      <section className="relative -mt-6 flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#1f3328] px-6 pt-24 text-white" id="mission">
        <img
          src="https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1800&q=80"
          alt="关于我们首屏背景"
          className="absolute inset-0 h-full w-full object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-[rgba(16,25,21,0.5)]" />
        <div className="relative z-10 max-w-4xl text-center">
          <h1 className="text-4xl font-semibold md:text-6xl">关于我们</h1>
          <p className="mt-4 text-base text-white/90 md:text-lg">
            TerraMar 山海自然科考致力于让更多人理解保护地、理解生命，并参与到真实的自然保护行动中。
          </p>
        </div>
      </section>

      <section className="section-shell bg-[var(--bg-base)]">
      <div className="container-page">

      <article className="relative mt-8 overflow-hidden rounded-[24px]">
        <img
          src="https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1800&q=80"
          alt="品牌愿景背景"
          className="h-[240px] w-full object-cover md:h-[280px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(13,30,22,0.86),rgba(13,30,22,0.55),rgba(13,30,22,0.72))]" />
        <div className="absolute inset-0 flex items-center p-6 md:p-10">
          <div className="max-w-4xl text-white">
            <h2 className="text-[clamp(1.8rem,3vw,2.8rem)] font-semibold">品牌愿景</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/90 md:text-base">
              我们坚信，一家真正成功的自然教育机构，其价值不应仅以营收和利润衡量，更应以它唤醒了多少人对自然的热爱、改变了多少儿童的生命轨迹、贡献了多少保护地的科研数据、带动了多少社区的发展来定义。这正是本机构存在的根本意义。
            </p>
          </div>
        </div>
      </article>

      <section className="mt-10">
        <h2 className="section-title text-center">为什么选择山海</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              ...values[0],
              image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80',
            },
            {
              ...values[1],
              image: 'https://images.unsplash.com/photo-1511497584788-876760111969?auto=format&fit=crop&w=1200&q=80',
            },
            {
              ...values[2],
              image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
            },
            {
              ...values[3],
              image: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=1200&q=80',
            },
          ].map((item) => (
            <article key={item.title} className="relative overflow-hidden rounded-[22px]">
              <img src={item.image} alt={item.title} className="h-[260px] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[rgba(11,19,15,0.86)] via-[rgba(11,19,15,0.32)] to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="text-[1.5rem] leading-none font-semibold">{item.title}</p>
                <p className="mt-2 text-sm text-white/88">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <article className="mt-8 rounded-[24px] bg-[var(--brand-deep)] p-6">
        <h2 className="text-2xl font-semibold text-white">我们的团队</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teamMembers.map((member) => (
            <div key={member.name} className="rounded-[20px] border border-[rgba(47,79,58,0.12)] bg-[#f8f8f6] p-5 text-center shadow-[var(--shadow-soft)]">
              <img src={member.image} alt={member.name} className="mx-auto h-24 w-24 rounded-full object-cover" />
              <p className="mt-4 text-xl font-semibold text-[var(--brand-primary)]">{member.name}</p>
              <p className="mt-1 text-sm font-medium text-[var(--text-tertiary)]">{member.role}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{member.bio}</p>
            </div>
          ))}
        </div>
      </article>
      </div>
      </section>
    </>
  )
}
