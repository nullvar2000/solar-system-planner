import Database from 'better-sqlite3'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.SOLAR_DB_PATH
  ? resolve(process.env.SOLAR_DB_PATH)
  : resolve(__dirname, '../data/solar.db')

export const db = new Database(dbPath)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS panels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manufacturer TEXT NOT NULL,
      model TEXT NOT NULL,
      vmp REAL NOT NULL,
      imp REAL NOT NULL,
      voc REAL NOT NULL,
      isc REAL NOT NULL,
      pmax REAL NOT NULL,
      temp_coeff_v REAL NOT NULL DEFAULT -0.003,
      temp_coeff_i REAL NOT NULL DEFAULT 0.003,
      width REAL NOT NULL,
      height REAL NOT NULL,
      price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS inverters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manufacturer TEXT NOT NULL,
      model TEXT NOT NULL,
      mppt_min_v REAL NOT NULL,
      mppt_max_v REAL NOT NULL,
      max_input_a REAL NOT NULL,
      max_power_w REAL NOT NULL,
      max_pv_inputs INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS batteries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      manufacturer TEXT NOT NULL,
      model TEXT NOT NULL,
      chemistry TEXT NOT NULL,
      nominal_v REAL NOT NULL,
      capacity_ah REAL NOT NULL,
      price REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}
