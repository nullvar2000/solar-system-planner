import { useState, useEffect } from 'react'
import { Inverter } from '../../types'
import { useInverterStore } from '../../store/inverters'

interface Props {
  inverter: Inverter | null
  onClose: () => void
}

const emptyForm = {
  manufacturer: '',
  model: '',
  mppt_min_v: '',
  mppt_max_v: '',
  max_input_a: '',
  max_power_w: '',
  max_pv_inputs: '1',
  price: ''
}

export function InverterEditor({ inverter, onClose }: Props) {
  const { addInverter, updateInverter } = useInverterStore()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (inverter) {
      setForm({
        manufacturer: inverter.manufacturer,
        model: inverter.model,
        mppt_min_v: String(inverter.mppt_min_v),
        mppt_max_v: String(inverter.mppt_max_v),
        max_input_a: String(inverter.max_input_a),
        max_power_w: String(inverter.max_power_w),
        max_pv_inputs: String(inverter.max_pv_inputs),
        price: String(inverter.price)
      })
    }
  }, [inverter])

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const data = {
      manufacturer: form.manufacturer,
      model: form.model,
      mppt_min_v: parseFloat(form.mppt_min_v),
      mppt_max_v: parseFloat(form.mppt_max_v),
      max_input_a: parseFloat(form.max_input_a),
      max_power_w: parseFloat(form.max_power_w),
      max_pv_inputs: parseInt(form.max_pv_inputs, 10) || 1,
      price: parseFloat(form.price) || 0
    }

    try {
      if (inverter) {
        await updateInverter(inverter.id, data)
      } else {
        await addInverter(data)
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
            {inverter ? `Edit ${inverter.model}` : 'Add Inverter'}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MPPT Min (V)</label>
              <input type="number" step="0.1" value={form.mppt_min_v} onChange={(e) => set('mppt_min_v', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MPPT Max (V)</label>
              <input type="number" step="0.1" value={form.mppt_max_v} onChange={(e) => set('mppt_max_v', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Input (A)</label>
              <input type="number" step="0.1" value={form.max_input_a} onChange={(e) => set('max_input_a', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Power (W)</label>
              <input type="number" step="1" value={form.max_power_w} onChange={(e) => set('max_power_w', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PV Inputs</label>
              <input type="number" step="1" min="1" value={form.max_pv_inputs} onChange={(e) => set('max_pv_inputs', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input type="number" step="1" value={form.price} onChange={(e) => set('price', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
            </div>
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
              {saving ? 'Saving...' : inverter ? 'Save Changes' : 'Add Inverter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
