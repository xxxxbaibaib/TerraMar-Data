import type { MapLocationsDirectoryState } from '../../lib/map/useMapLocationsBaseNodes'

type Props = Pick<MapLocationsDirectoryState, 'origin' | 'remoteError'>

/** 入网 / 个人登记「周边协作参考点位」数据来源说明 */
export function MapDirectoryNotice({ origin, remoteError }: Props) {
  if (origin === 'supabase') {
    return (
      <div className="mt-2 rounded-lg border border-emerald-200/70 bg-emerald-50/85 px-3 py-2 text-xs leading-relaxed text-emerald-950">
        <p>
          <span className="font-semibold">目录已同步数据库：</span>
          下列名称与坐标来自表 <span className="rounded bg-white/70 px-1 font-mono text-[11px]">map_locations</span>
          ；与您当前位置的距离为实时计算。若要替换为真实合作机构，请在 Supabase 中更新该表。
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-lg border border-amber-200/70 bg-amber-50/85 px-3 py-2 text-xs leading-relaxed text-amber-950">
      <p className="font-semibold">当前为内置示例目录（非线上数据）</p>
      <p className="mt-1 break-words">
        {remoteError
          ? `无法使用线上目录：${remoteError}`
          : '未配置可用的 Supabase 匿名密钥与项目 URL，或浏览器端禁用了 anon。请检查 .env 中的 VITE_SUPABASE_URL（不含 /rest/v1）与 VITE_SUPABASE_ANON_KEY，并执行迁移 20250611120000_map_locations_public_read.sql 后刷新。'}
      </p>
    </div>
  )
}
