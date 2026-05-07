import type { MapFilterConfig } from '../../mock/map/mapTypes'
import { mapFilterOptionLabel, mapFilterOptionValue } from '../../mock/map/mapTypes'

interface MapFilterBarProps {
  filters: MapFilterConfig[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
}

export function MapFilterBar({ filters, values, onChange }: MapFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => (
        <label key={filter.key} className="text-xs text-white/90">
          <span className="mb-1 block">{filter.label}</span>
          <select
            value={values[filter.key] ?? mapFilterOptionValue(filter.options[0])}
            onChange={(event) => onChange(filter.key, event.target.value)}
            className="h-9 min-w-28 rounded-xl border border-white/30 bg-black/25 px-2 text-xs text-white outline-none"
          >
            {filter.options.map((option) => {
              const v = mapFilterOptionValue(option)
              return (
                <option key={v} value={v} className="text-slate-900">
                  {mapFilterOptionLabel(option)}
                </option>
              )
            })}
          </select>
        </label>
      ))}
    </div>
  )
}
