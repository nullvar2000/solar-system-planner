import { db, initSchema } from './db.js'

export function seed() {
  initSchema()

  const panelCount = db.prepare('SELECT COUNT(*) as count FROM panels').get() as { count: number }
  if (panelCount.count > 0) {
    console.log('Database already seeded, skipping.')
    return
  }

  const insertPanel = db.prepare(`
    INSERT INTO panels (manufacturer, model, vmp, imp, voc, isc, pmax, temp_coeff_v, temp_coeff_i, width, height, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertInverter = db.prepare(`
    INSERT INTO inverters (manufacturer, model, mppt_min_v, mppt_max_v, max_input_a, max_power_w, max_pv_inputs, price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertBattery = db.prepare(`
    INSERT INTO batteries (manufacturer, model, chemistry, nominal_v, capacity_ah, price)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const seedData = db.transaction(() => {
    insertPanel.run('Generic', '100W', 18.5, 5.4, 22.0, 5.8, 100, -0.003, 0.003, 41.3, 23.6, 150)
    insertPanel.run('Generic', '200W', 37.0, 5.4, 44.0, 5.8, 200, -0.003, 0.003, 41.3, 39.4, 275)
    insertPanel.run('Generic', '300W', 37.0, 8.1, 44.0, 8.6, 300, -0.003, 0.003, 47.2, 41.3, 350)
    insertPanel.run('Generic', '400W', 41.0, 9.75, 49.0, 10.3, 400, -0.003, 0.003, 54.9, 41.3, 425)

    insertInverter.run('Generic', '1.5kW', 20, 100, 25, 1500, 2, 600)
    insertInverter.run('Generic', '5kW', 100, 450, 30, 5000, 2, 2200)

    insertBattery.run('Generic', '100Ah LiFePO4', 'LiFePO4', 12.8, 100, 800)
    insertBattery.run('Generic', '200Ah AGM', 'AGM', 12.0, 200, 350)
  })

  seedData()
  console.log('Database seeded successfully.')
}

seed()
