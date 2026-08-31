import { useCanvasStore } from '../store/canvas'
import { usePanelStore } from '../store/panels'
import { useInverterStore } from '../store/inverters'
import { useBatteryStore } from '../store/batteries'
import { Battery, DeviceKind, Inverter, Panel } from '../types'

const modelLabel = (m: Panel | Inverter | Battery) =>
  'pmax' in m
    ? ` (${m.pmax}W)`
    : 'max_power_w' in m
      ? ` (${m.max_power_w}W)`
      : ` (${m.nominal_v}V ${m.capacity_ah}Ah)`

const KINDS: { kind: DeviceKind; label: string }[] = [
  { kind: 'panel', label: 'Panel' },
  { kind: 'inverter', label: 'Inverter' },
  { kind: 'battery', label: 'Battery' },
  { kind: 'busbar', label: 'Busbar' },
  { kind: 'combiner', label: 'Combiner box' },
  { kind: 'breaker', label: 'DC breaker' }
]

const MODEL_KINDS: DeviceKind[] = ['panel', 'inverter', 'battery']

export function DevicePalette() {
  const { panels } = usePanelStore()
  const { inverters } = useInverterStore()
  const { batteries } = useBatteryStore()
  const { activePlacement, setActivePlacement } = useCanvasStore()

  const kind = activePlacement?.kind ?? 'panel'
  const needsModel = MODEL_KINDS.includes(kind)
  const modelOptions =
    kind === 'panel' ? panels : kind === 'inverter' ? inverters : kind === 'battery' ? batteries : []
  const model = modelOptions.find((m) => m.id === activePlacement?.refId) ?? modelOptions[0]

  const handleKind = (k: DeviceKind) => {
    const opts =
      k === 'panel' ? panels : k === 'inverter' ? inverters : k === 'battery' ? batteries : []
    const refId = opts[0]?.id ?? null
    if (MODEL_KINDS.includes(k) && refId === null) {
      setActivePlacement(null)
      return
    }
    setActivePlacement({ kind: k, refId })
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">Add Device</h3>
      <select
        value={kind}
        onChange={(e) => handleKind(e.target.value as DeviceKind)}
        className="w-full border rounded px-3 py-2 text-sm bg-white"
      >
        {KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>
      {needsModel && (
        <select
          value={model?.id ?? ''}
          onChange={(e) => setActivePlacement({ kind, refId: Number(e.target.value) })}
          className="w-full border rounded px-3 py-2 text-sm bg-white"
        >
          {modelOptions.length === 0 && <option value="">No models loaded</option>}
          {modelOptions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.manufacturer} {m.model}
              {modelLabel(m)}
            </option>
          ))}
        </select>
      )}
      {activePlacement ? (
        <p className="text-xs text-green-600">Click on the canvas to place — Esc to cancel</p>
      ) : (
        needsModel && (
          <p className="text-xs text-gray-400">Select a model to start placing</p>
        )
      )}
      {activePlacement && (
        <button
          onClick={() => setActivePlacement(null)}
          className="w-full text-xs border rounded px-2 py-1 hover:bg-gray-100"
        >
          Cancel placement
        </button>
      )}
    </div>
  )
}
