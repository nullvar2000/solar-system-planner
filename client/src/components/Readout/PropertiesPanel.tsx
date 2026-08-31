import { useState } from 'react'
import { useCanvasStore } from '../../store/canvas'
import { usePanelStore } from '../../store/panels'
import { useInverterStore } from '../../store/inverters'
import { useBatteryStore } from '../../store/batteries'
import { bankElectricals } from '../../lib/battery'
import { deviceShortLabel } from '../../lib/topology'
import { PlacedDevice } from '../../types'

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b last:border-0">
      <td className="py-1 text-gray-500">{label}</td>
      <td className="py-1 text-right font-mono text-gray-800">{value}</td>
    </tr>
  )
}

function PositionRow({ device }: { device: PlacedDevice }) {
  return (
    <p className="text-xs text-gray-400">
      Position ({Math.round(device.x)}, {Math.round(device.y)}) — drag to move
    </p>
  )
}

export function PropertiesPanel() {
  const {
    devices,
    connections,
    selectedDeviceId,
    selectedConnectionId,
    removeDevice,
    removeConnection,
    updateDevice,
    setConnectionLength
  } = useCanvasStore()
  const { panels } = usePanelStore()
  const { inverters } = useInverterStore()
  const { batteries } = useBatteryStore()

  const [lengthDraft, setLengthDraft] = useState('')

  const selected = devices.find((d) => d.id === selectedDeviceId) ?? null
  const selectedConn = connections.find((c) => c.id === selectedConnectionId) ?? null

  if (selectedConn) {
    const from = devices.find((d) => d.id === selectedConn.fromDeviceId)
    const to = devices.find((d) => d.id === selectedConn.toDeviceId)
    return (
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Wire</h2>
        <div className="space-y-1 text-sm">
          <p className="text-gray-700">
            {from ? `${deviceShortLabel(from)} · ${selectedConn.fromTerminal}` : '?'}
            <span className="text-gray-400"> → </span>
            {to ? `${deviceShortLabel(to)} · ${selectedConn.toTerminal}` : '?'}
          </p>
          <p className="text-xs text-gray-400">Wire between two terminals</p>
        </div>
        <div className="mt-3">
          <label className="block text-xs text-gray-500 mb-1">Length override (ft, one way)</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="1"
              min="0"
              value={lengthDraft === '' ? (selectedConn.lengthFt ?? '') : lengthDraft}
              placeholder="auto (wire geometry)"
              onChange={(e) => setLengthDraft(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
            />
            <button
              onClick={() => {
                const v = parseFloat(lengthDraft)
                setConnectionLength(
                  selectedConn.id,
                  lengthDraft === '' || !Number.isFinite(v) || v < 0 ? null : v
                )
                setLengthDraft('')
              }}
              className="px-2 py-1 text-xs bg-blue-600 rounded hover:bg-blue-700"
            >
              Set
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Blank uses the drawn wire length (gauge suggestion).
          </p>
        </div>
        <button
          onClick={() => {
            removeConnection(selectedConn.id)
            setLengthDraft('')
          }}
          className="mt-3 w-full text-xs bg-red-600 text-white rounded py-1.5 hover:bg-red-700"
        >
          Remove wire
        </button>
      </div>
    )
  }

  if (!selected) {
    return (
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Properties</h2>
        <p className="text-sm text-gray-400">Select a device or wire on the canvas</p>
      </div>
    )
  }

  const panel =
    selected.kind === 'panel' && selected.refId !== null
      ? panels.find((p) => p.id === selected.refId)
      : undefined
  const inverter =
    selected.kind === 'inverter' && selected.refId !== null
      ? inverters.find((i) => i.id === selected.refId)
      : undefined
  const battery =
    selected.kind === 'battery' && selected.refId !== null
      ? batteries.find((b) => b.id === selected.refId)
      : undefined

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase">
          {selected.kind} <span className="text-gray-400">{deviceShortLabel(selected)}</span>
        </h2>
        <button
          onClick={() => removeDevice(selected.id)}
          className="text-xs text-red-600 hover:text-red-800"
        >
          Remove
        </button>
      </div>

      {selected.kind === 'panel' && panel && (
        <>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            {panel.manufacturer} {panel.model}
          </p>
          <table className="w-full text-sm mb-3">
            <tbody>
              <SpecRow label="Pmax" value={`${panel.pmax} W`} />
              <SpecRow label="Vmp" value={`${panel.vmp} V`} />
              <SpecRow label="Imp" value={`${panel.imp} A`} />
              <SpecRow label="Voc" value={`${panel.voc} V`} />
              <SpecRow label="Isc" value={`${panel.isc} A`} />
              <SpecRow label="V temp coeff" value={`${panel.temp_coeff_v}`} />
              <SpecRow label="Canvas size" value={`${Math.round(selected.width)}×${Math.round(selected.height)} px`} />
            </tbody>
          </table>
        </>
      )}
      {selected.kind === 'panel' && !panel && (
        <p className="text-sm text-gray-400 mb-3">Panel model not found in catalog</p>
      )}

      {selected.kind === 'inverter' && inverter && (
        <>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            {inverter.manufacturer} {inverter.model}
          </p>
          <table className="w-full text-sm mb-3">
            <tbody>
              <SpecRow label="MPPT range" value={`${inverter.mppt_min_v}–${inverter.mppt_max_v} V`} />
              <SpecRow label="Max input" value={`${inverter.max_input_a} A`} />
              <SpecRow label="Max power" value={`${inverter.max_power_w} W`} />
              <SpecRow label="PV inputs" value={`${inverter.max_pv_inputs}`} />
            </tbody>
          </table>
        </>
      )}
      {selected.kind === 'inverter' && !inverter && (
        <p className="text-sm text-gray-400 mb-3">Inverter model not found in catalog</p>
      )}

      {selected.kind === 'battery' && battery && (
        <>
          <p className="text-sm font-semibold text-gray-800 mb-2">
            {battery.manufacturer} {battery.model}
          </p>
          <table className="w-full text-sm mb-3">
            <tbody>
              <SpecRow label="Chemistry" value={battery.chemistry} />
              <SpecRow label="Nominal" value={`${battery.nominal_v} V`} />
              <SpecRow label="Capacity" value={`${battery.capacity_ah} Ah`} />
            </tbody>
          </table>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Series</label>
              <input
                type="number"
                step="1"
                min="1"
                value={selected.batterySeries ?? 1}
                onChange={(e) =>
                  updateDevice(selected.id, { batterySeries: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
                }
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Parallel</label>
              <input
                type="number"
                step="1"
                min="1"
                value={selected.batteryParallel ?? 1}
                onChange={(e) =>
                  updateDevice(selected.id, { batteryParallel: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
                }
                className="w-full border rounded px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          {(() => {
            const bank = bankElectricals(battery, selected.batterySeries ?? 1, selected.batteryParallel ?? 1)
            return (
              <div className="bg-gray-50 rounded p-2 mb-3">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Bank ({bank.cellCount} cells)</p>
                <p className="text-xs font-mono text-gray-700">
                  {fmt(bank.totalV)}V · {fmt(bank.totalAh)}Ah · {fmt(bank.totalWh)}Wh
                </p>
                <p className="text-xs font-mono text-gray-700">{fmt(bank.usableWh)}Wh usable</p>
              </div>
            )
          })()}
        </>
      )}
      {selected.kind === 'battery' && !battery && (
        <p className="text-sm text-gray-400 mb-3">Battery model not found in catalog</p>
      )}

      {selected.kind === 'combiner' && (
        <div className="mb-3">
          <label className="block text-xs text-gray-500 mb-1">Inputs (1–12)</label>
          <input
            type="number"
            step="1"
            min="1"
            max="12"
            value={selected.combinerInputs ?? 4}
            onChange={(e) =>
              updateDevice(selected.id, {
                combinerInputs: Math.min(12, Math.max(1, Math.floor(Number(e.target.value) || 1)))
              })
            }
            className="w-full border rounded px-2 py-1.5 text-sm"
          />
        </div>
      )}

      {selected.kind === 'busbar' && (
        <p className="text-sm text-gray-500 mb-3">
          Two shared rails (BUS+ / BUS−). Any number of wires can attach to each rail.
        </p>
      )}
      {selected.kind === 'breaker' && (
        <p className="text-sm text-gray-500 mb-3">
          Pass-through: strings wire IN → OUT with no polarity constraint.
        </p>
      )}

      <PositionRow device={selected} />
    </div>
  )
}
