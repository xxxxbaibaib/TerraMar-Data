import type { MapNode } from '../../mock/map/mapTypes'
import { isWelfareProjectSiteMapNode } from '../../lib/map/welfareProjectSitesRemote'

interface MapDetailDrawerProps {
  node: MapNode | null
  onClose: () => void
}

const statusLabels: Record<string, string> = {
  planning: '洽谈中',
  active: '执行中',
  completed: '已结项',
  pending_review: '待核验',
  verified: '已核验',
  /** 与 DB `approved` 映射后的 MapNode.status 一致 */
  approved: '已核验',
  rejected: '未通过',
}

const nodeTypeLabels: Record<string, string> = {
  activity_site: '活动场地',
  source_city: '来源城市',
  institution: '机构',
  habitat: '栖息地',
  community: '社区',
  school: '学校',
  species_record: '物种记录',
}

export function MapDetailDrawer({ node, onClose }: MapDetailDrawerProps) {
  if (!node) return null

  const meta = node.cooperationMeta
  const statusLabel = node.status ? statusLabels[node.status] ?? node.status : null
  const nodeTypeLabel = isWelfareProjectSiteMapNode(node)
    ? '公益项目地（配置）'
    : (nodeTypeLabels[node.nodeType] ?? node.nodeType)

  return (
    <aside className="absolute right-4 top-24 z-20 w-[min(420px,calc(100%-2rem))] rounded-3xl border border-white/40 bg-black/45 p-5 text-white backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-white/75">{nodeTypeLabel}</p>
          <h3 className="mt-1 text-xl font-semibold">{node.name}</h3>
          <p className="mt-1 text-xs text-white/75">
            {node.location.province || node.location.city
              ? `${node.location.province ?? ''} ${node.location.city ?? ''}`.trim()
              : typeof node.location.lat === 'number' && typeof node.location.lng === 'number'
                ? `登记坐标 · ${node.location.lat.toFixed(4)}, ${node.location.lng.toFixed(4)}`
                : '—'}
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg border border-white/30 px-2 py-1 text-xs">
          关闭
        </button>
      </div>

      {meta ? (
        <div className="mt-4 space-y-2 rounded-xl bg-white/10 px-3 py-3 text-sm">
          <p className="flex justify-between gap-2">
            <span className="text-white/75">机构名称</span>
            <span className="text-right font-medium">{meta.partnerName}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-white/75">合作主体</span>
            <span className="font-medium">{meta.cooperationSubject}</span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-white/75">主体类型</span>
            <span className="font-medium">{meta.subjectSubtype}</span>
          </p>
          <div>
            <p className="text-white/75">合作方向</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {meta.resourceTypes.map((rt) => (
                <span key={rt} className="rounded-full border border-white/35 bg-white/15 px-2 py-0.5 text-xs">
                  {rt}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {statusLabel ? (
        <p className="mt-3 text-xs text-white/80">
          状态：<span className="font-medium text-white">{statusLabel}</span>
        </p>
      ) : null}

      {node.metrics && node.metrics.length > 0 && (
        <div className="mt-4 space-y-2">
          {node.metrics.map((metric) => (
            <p key={metric.label} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm">
              <span className="text-white/80">{metric.label}</span>
              <strong>{metric.value}</strong>
            </p>
          ))}
        </div>
      )}

      {!meta && node.tags.filter((t) => t !== 'welfare_project_site').length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {node.tags
            .filter((t) => t !== 'welfare_project_site')
            .map((tag) => (
              <span key={tag} className="rounded-full border border-white/40 bg-white/15 px-2 py-1 text-xs">
                {tag}
              </span>
            ))}
        </div>
      )}
    </aside>
  )
}
