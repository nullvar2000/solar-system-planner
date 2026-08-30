import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.SOLAR_DB_PATH = join(mkdtempSync(join(tmpdir(), 'solar-test-')), 'test.db')
