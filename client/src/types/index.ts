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

export type DeviceKind =
  | 'panel'
  | 'inverter'
  | 'battery'
  | 'busbar'
  | 'combiner'
  | 'breaker'

export interface PlacedDevice {
  id: string
  kind: DeviceKind
  refId: number | null
  x: number
  y: number
  width: number
  height: number
  batterySeries?: number
  batteryParallel?: number
  combinerInputs?: number
}

export interface Connection {
  id: string
  fromDeviceId: string
  fromTerminal: string
  toDeviceId: string
  toTerminal: string
  lengthFt?: number | null
}

export interface Load {
  id: string
  name: string
  dailyKwh: number
}

export interface ProjectConfig {
  version: 2
  devices: PlacedDevice[]
  connections: Connection[]
  loads: Load[]
  pxPerFt: number
}
