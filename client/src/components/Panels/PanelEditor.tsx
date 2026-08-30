import { useState, useEffect } from 'react'
import { Panel } from '../../types'
import { usePanelStore } from '../../store/panels'

interface Props {
  panel: Panel | null
  onClose: () => void
}

const emptyForm = {
  manufacturer: '',
  model: '',
  vmp: '',
  imp: '',
  voc: '',
  isc: '',
  pmax: '',
  temp_coeff_v: '-0.003',
  temp_coeff_i: '0.003',
  width: '',
  height: '',
  price: ''
}

export function PanelEditor({ panel, onClose }: Props) {
  const { addPanel, updatePanel } = usePanelStore()
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (panel) {
      setForm({
        manufacturer: panel.manufacturer,
        model: panel.model,
        vmp: String(panel.vmp),
        imp: String(panel.imp),
        voc: String(panel.voc),
        isc: String(panel.isc),
        pmax: String(panel.pmax),
        temp_coeff_v: String(panel.temp_coeff_v),
        temp_coeff_i: String(panel.temp_coeff_i),
        width: String(panel.width),
        height: String(panel.height),
        price: String(panel.price)
      })
    }
  }, [panel])

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const data = {
      manufacturer: form.manufacturer,
      model: form.model,
      vmp: parseFloat(form.vmp),
      imp: parseFloat(form.imp),
      voc: parseFloat(form.voc),
      isc: parseFloat(form.isc),
      pmax: parseFloat(form.pmax),
      temp_coeff_v: parseFloat(form.temp_coeff_v),
      temp_coeff_i: parseFloat(form.temp_coeff_i),
      width: parseFloat(form.width),
      height: parseFloat(form.height),
      price: parseFloat(form.price) || 0
    }

    try {
      if (panel) {
        await updatePanel(panel.id, data)
      } else {
        await addPanel(data)
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
            {panel ? `Edit ${panel.model}` : 'Add Panel'}
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

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vmp (V)</label>
              <input type="number" step="0.1" value={form.vmp} onChange={(e) => set('vmp', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Imp (A)</label>
              <input type="number" step="0.01" value={form.imp} onChange={(e) => set('imp', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pmax (W)</label>
              <input type="number" step="1" value={form.pmax} onChange={(e) => set('pmax', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Voc (V)</label>
              <input type="number" step="0.1" value={form.voc} onChange={(e) => set('voc', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Isc (A)</label>
              <input type="number" step="0.01" value={form.isc} onChange={(e) => set('isc', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temp Coeff V (%/°C)</label>
              <input type="number" step="0.001" value={form.temp_coeff_v} onChange={(e) => set('temp_coeff_v', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temp Coeff I (%/°C)</label>
              <input type="number" step="0.001" value={form.temp_coeff_i} onChange={(e) => set('temp_coeff_i', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Width (in)</label>
              <input type="number" step="0.1" value={form.width} onChange={(e) => set('width', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (in)</label>
              <input type="number" step="0.1" value={form.height} onChange={(e) => set('height', e.target.value)} className="w-full border rounded px-3 py-2 text-sm" required />
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
              {saving ? 'Saving...' : panel ? 'Save Changes' : 'Add Panel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
