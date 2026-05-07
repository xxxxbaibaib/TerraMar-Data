import type { MapMetric } from '../../mock/map/mapTypes'

interface MapInsightPanelProps {
  metrics: MapMetric[]
}

export function MapInsightPanel({ metrics }: MapInsightPanelProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {metrics.slice(0, 4).map((metric) => (
        <article key={metric.key} className="rounded-2xl border border-white/35 bg-black/30 p-3 backdrop-blur-sm">
          <p className="text-[11px] text-white/80">{metric.label}</p>
          <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
        </article>
      ))}
    </div>
  )
}
