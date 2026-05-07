import { CooperationStakeholderBody } from '../components/cooperation/CooperationStakeholderBody'
import { MapHeroShell } from '../components/map/MapHeroShell'
import { trackEvent } from '../lib/analytics'
import { networkJoinPath } from '../lib/joinRouting'
import { cooperationStakeholderSections } from '../mock/cooperationStakeholders'

export function CooperationPage() {
  trackEvent('view_cooperation')

  return (
    <>
      <MapHeroShell
        page="cooperation"
        title="山海云自然教育网络"
        subtitle="展示学校、保护地、企业与科普机构协作网络，查看合作覆盖与强度。"
        cta={{ label: '加入自然教育网络', to: networkJoinPath }}
      />

      <section className="section-shell bg-[#F2EEDB]">
        <div className="container-page">
          <p className="mt-4 w-full font-serif text-base italic leading-[1.85] text-[var(--text-secondary)] md:text-lg">
            我们希望以&ldquo;山海云&rdquo;全球自然教育网络数据平台为基础，连接政府、社会机构 与NGO组织三大主体，通过资源互补、需求对接与项目协作，构建一个开放共享、互利共赢的自然教育生态圈，让每一类参与者都能在平台上找到合作伙伴、落地共建项目，共同推动自然教育的专业化、普惠化与全球化发展。
          </p>

          <CooperationStakeholderBody sections={cooperationStakeholderSections} />
        </div>
      </section>
    </>
  )
}
