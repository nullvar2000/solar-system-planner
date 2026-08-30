import { useState, useEffect } from 'react'
import { Battery } from '../../types'
import { useBatteryStore } from '../../store/batteries'

interface Props {
  battery: Battery | null
  onClose: () => void
}

const CHEMISTRIES = ['LiFePO4', 'NMC', 'AGM', 'Gel', 'Other']

const emptyForm = {
  manufacturer: '',
  model: '',
  chemistry: 'LiFePO4',
  nominal_v: '',
  capacity_ah: '',
  price: ''
}

export function BatteryEditor({ battery, onClose }: Props) {
  const { addBattery, updateBattery } = useBatteryStore()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (battery) {
      setForm({
        manufacturer: battery.manufacturer,
        model: battery.model,
        chemistry: battery.chemistry,
        nominal_v: String(battery.nominal_v),
        capacity_ah: String(battery.capacity_ah),
        price: String(battery.price)
      })
    }
  }, [battery])

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const data = {
      manufacturer: form.manufacturer,
      model: form.model,
      chemistry: form.chemistry,
      nominal_v: parseFloat(form.nominal_v),
      capacity_ah: parseFloat(form.capacity_ah),
      price: parseFloat(form.price) || 0
    }

    try {
      if (battery) {
        await updateBattery(battery.id, data)
      } else {
        await addBattery(data)
      }
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            {battery ? `Edit ${battery.model}` : 'Add Battery'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <input
                type="text"
                value={form.manufacturer}
                onChange={(e) => set('manufacturer', e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => set('model', e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chemistry</label>
            <select
              value={form.chemistry}
              onChange={(e) => set('chemistry', e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              required
            >
              {CHEMISTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Voltage (V)</label>
              <input type="number" step="0.1" value={form.nominal_v} onChange={(e) => set('nominal_v', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Ah)</label>
              <input type="number" step="0.1" value={form.capacity_ah} onChange={(e) => set('capacity_ah', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <input type="number" step="1" value={form.price} onChange={(e) => set('price', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : battery ? 'Save Changes' : 'Add Battery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
