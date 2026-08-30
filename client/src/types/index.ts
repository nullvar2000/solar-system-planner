export interface Panel {
  id: number
  manufacturer: string
  model: string
  vmp: number
  imp: number
  voc: number
  isc: number
  pmax: number
  temp_coeff_v: number
  temp_coeff_i: number
  width: number
  height: number
  price: number
}

export interface Inverter {
  id: number
  manufacturer: string
  model: string
  mppt_min_v: number
  mppt_max_v: number
  max_input_a: number
  max_power_w: number
  max_pv_inputs: number
  price: number
}

export interface Battery {
  id: number
  manufacturer: string
  model: string
  chemistry: string
  nominal_v: number
  capacity_ah: number
  price: number
}

export interface PlacedPanel {
  id: string
  panelId: number
  x: number
  y: number
  width: number
  height: number
}

export type Terminal = 'positive' | 'negative'

export interface Connection {
  id: string
  fromPanelId: string
  fromTerminal: Terminal
  toPanelId: string
  toTerminal: Terminal
}

export interface Load {
  id: string
  name: string
  dailyKwh: number
}

export interface ProjectConfig {
  placedPanels: PlacedPanel[]
  connections: Connection[]
  inverterId: number | null
  batteryId: number | null
  batterySeries: number
  batteryParallel: number
  loads: Load[]
}
