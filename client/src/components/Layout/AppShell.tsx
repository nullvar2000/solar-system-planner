import { useEffect } from 'react'
import { SolarCanvas } from '../Canvas/SolarCanvas'
import { PanelCatalog } from '../Panels/PanelCatalog'
import { DevicePalette } from '../DevicePalette'
import { InverterCatalog } from '../Inverter/InverterCatalog'
import { InverterStatus } from '../Inverter/InverterStatus'
import { BatteryCatalog } from '../Battery/BatteryCatalog'
import { BatteryBankPanel } from '../Battery/BatteryBankPanel'
import { LoadProfilePanel } from '../Battery/LoadProfilePanel'
import { PropertiesPanel } from '../Readout/PropertiesPanel'
import { TopologyPanel } from '../Readout/TopologyPanel'
import { ElectricalReadout } from '../Readout/ElectricalReadout'
import { WireGaugePanel } from '../Readout/WireGaugePanel'
import { ProductionPanel } from '../Readout/ProductionPanel'
import { BomPanel } from '../Readout/BomPanel'
import { PrintBom } from '../Readout/PrintBom'
import { ProjectBar } from './ProjectBar'
import { usePanelStore } from '../../store/panels'
import { useInverterStore } from '../../store/inverters'
import { useBatteryStore } from '../../store/batteries'
import { useProjectStore } from '../../store/projects'

export function AppShell() {
  const { fetchPanels } = usePanelStore()
  const { fetchInverters } = useInverterStore()
  const { fetchBatteries } = useBatteryStore()
  const { fetchProjects } = useProjectStore()

  useEffect(() => {
    fetchPanels()
    fetchInverters()
    fetchBatteries()
    fetchProjects()
  }, [fetchPanels, fetchInverters, fetchBatteries, fetchProjects])

  return (
    <>
      <div className="flex h-screen flex-col print:hidden">
      <header className="bg-gray-900 text-white px-4 py-2 flex items-center justify-between gap-3">
        <h1 className="text-base sm:text-lg font-bold shrink-0">Solar System Planner</h1>
        <ProjectBar />
        <span className="text-xs text-gray-400 shrink-0 hidden md:inline">Phase 1: Device Model</span>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-60 lg:w-72 bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-6">
          <DevicePalette />
          <hr className="border-gray-200" />
          <PanelCatalog />
          <hr className="border-gray-200 my-4" />
          <InverterCatalog />
          <hr className="border-gray-200 my-4" />
          <BatteryCatalog />
        </aside>
        <main className="flex-1 relative">
          <SolarCanvas />
        </main>
        <aside className="w-52 lg:w-64 bg-white border-l border-gray-200 overflow-y-auto p-4">
          <PropertiesPanel />
          <hr className="border-gray-200 my-4" />
          <TopologyPanel />
          <hr className="border-gray-200 my-4" />
          <ElectricalReadout />
          <hr className="border-gray-200 my-4" />
          <InverterStatus />
          <hr className="border-gray-200 my-4" />
          <WireGaugePanel />
          <hr className="border-gray-200 my-4" />
          <ProductionPanel />
          <hr className="border-gray-200 my-4" />
          <BatteryBankPanel />
          <hr className="border-gray-200 my-4" />
          <LoadProfilePanel />
          <hr className="border-gray-200 my-4" />
          <BomPanel />
        </aside>
      </div>
      </div>
      <PrintBom />
    </>
  )
}
