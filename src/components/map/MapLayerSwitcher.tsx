interface MapLayerSwitcherProps {
  layers: { key: string; label: string; enabled: boolean }[]
  onToggle: (layerKey: string) => void
}

export function MapLayerSwitcher({ layers, onToggle }: MapLayerSwitcherProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {layers.map((layer) => (
        <button
          key={layer.key}
          type="button"
          onClick={() => onToggle(layer.key)}
          className={`rounded-[999px] border px-3 py-1 text-xs ${
            layer.enabled
              ? 'border-white/70 bg-white/30 text-white'
              : 'border-white/30 bg-black/20 text-white/80 hover:bg-white/20'
          }`}
        >
          {layer.label}
        </button>
      ))}
    </div>
  )
}
