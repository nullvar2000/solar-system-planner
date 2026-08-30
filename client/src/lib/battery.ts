import { Battery } from '../types'

export const DEPTH_OF_DISCHARGE: Record<string, number> = {
  LiFePO4: 0.8,
  NMC: 0.8,
  AGM: 0.5,
  Gel: 0.5
}

export function dodFor(battery: Battery): number {
  return DEPTH_OF_DISCHARGE[battery.chemistry] ?? 0.5
}

export interface BankElectricals {
  cellCount: number
  totalV: number
  totalAh: number
  totalWh: number
  usableWh: number
}

export function bankElectricals(
  battery: Battery,
  series: number,
  parallel: number
): BankElectricals {
  const totalV = battery.nominal_v * series
  const totalAh = battery.capacity_ah * parallel
  const totalWh = totalV * totalAh
  return {
    cellCount: series * parallel,
    totalV,
    totalAh,
    totalWh,
    usableWh: totalWh * dodFor(battery)
  }
}
