# Solar System Planner — Implementation Plan

## Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript + Vite |
| Canvas | Konva.js (react-konva) |
| State | Zustand |
| Styling | Tailwind CSS |
| Backend | Fastify (TypeScript) |
| Database | SQLite (better-sqlite3) |
| API | REST, JSON |
| Package Manager | pnpm (workspace monorepo) |

## Ports

- Client (Vite dev server): **5173**
- Server (Fastify): **3001**
- Communication: CORS (no proxy)

---

## Phases

### Phase 1 — Scaffold
- pnpm workspace (`server/`, `client/`)
- Vite + React + TS + Tailwind (client)
- Fastify + better-sqlite3 + CORS (server)
- Konva + react-konva + Zustand (client deps)
- SQLite schema + migrations
- Seed data (4 panels, 2 inverters, 2 batteries)
- `.gitignore`, basic App layout (sidebar + canvas area + right panel)

### Phase 2 — Panel Catalog CRUD
- API: `GET/POST/PUT/DELETE /api/panels`
- UI: sidebar list with Add/Edit/Delete (modal form)
- Fields: manufacturer, model, Vmp, Imp, Voc, Isc, Pmax, temp coeff V/I, width, height, price

### Phase 3 — Canvas Placement
- Drag panel from dropdown/sidebar onto Konva canvas
- Move, resize, delete placed panels
- Panel shows + and − terminal nodes
- Click to select → properties panel shows specs

### Phase 4 — Connections (Series/Parallel)
- Click terminal → click another terminal to create a wire
- Red wire = positive, blue wire = negative
- Topology detection: trace graph to identify series strings and parallel groups
- Visual feedback: valid vs invalid connections

### Phase 5 — Electrical Readout
- Per-string: V, A, W
- Total array: V, A, W
- Display in right panel, updates live

### Phase 6 — Inverter CRUD + MPPT Validation
- API: `GET/POST/PUT/DELETE /api/inverters`
- UI: sidebar list + modal editor
- Inverter selector: assign inverter to the system
- MPPT validation: warn if Voc (cold) > max, Vmp < min, A > max, W > rating
- Visual: green/yellow/red status indicator

### Phase 7 — Realistic Electrical Model
- Wire gauge calculator (current + distance → AWG + voltage drop)
- Temperature derating on production
- Daily/monthly/annual production estimate (peak sun hours input)

### Phase 8 — Battery CRUD + Load Profile
- API: `GET/POST/PUT/DELETE /api/batteries`
- UI: sidebar list + modal editor
- Battery bank config: count, wiring (series/parallel) → total V and Ah
- Load profile: list of loads with daily kWh
- Autonomy calculation

### Phase 9 — BOM + Project Save/Load
- API: `GET/POST/PUT/DELETE /api/projects`
- BOM: auto-generated list with total cost
- Save/Load project: serialize full canvas state to JSON in SQLite

### Phase 10 — Polish
- Export design as JSON file
- Print-friendly BOM view
- Responsive layout adjustments
- Edge-case warnings and empty states

---

## Data Model (SQLite)

```sql
CREATE TABLE panels (
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

CREATE TABLE inverters (
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

CREATE TABLE batteries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  chemistry TEXT NOT NULL,
  nominal_v REAL NOT NULL,
  capacity_ah REAL NOT NULL,
  price REAL NOT NULL DEFAULT 0
);

CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  config_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Seed Data

### Panels
| Name | Vmp | Imp | Voc | Isc | Pmax | Width (in) | Height (in) | Price |
|------|-----|-----|-----|-----|------|-----------|------------|-------|
| Generic 100W | 18.5 | 5.4 | 22.0 | 5.8 | 100 | 41.3 | 23.6 | 150 |
| Generic 200W | 37.0 | 5.4 | 44.0 | 5.8 | 200 | 41.3 | 39.4 | 275 |
| Generic 300W | 37.0 | 8.1 | 44.0 | 8.6 | 300 | 47.2 | 41.3 | 350 |
| Generic 400W | 41.0 | 9.75 | 49.0 | 10.3 | 400 | 54.9 | 41.3 | 425 |

### Inverters
| Name | MPPT Min | MPPT Max | Max A | Max W | PV Inputs | Price |
|------|----------|----------|-------|-------|-----------|-------|
| Generic 1.5kW | 20 | 100 | 25 | 1500 | 2 | 600 |
| Generic 5kW | 100 | 450 | 30 | 5000 | 2 | 2200 |

### Batteries
| Name | Chemistry | Nominal V | Capacity Ah | Price |
|------|-----------|-----------|-------------|-------|
| Generic 100Ah LiFePO4 | LiFePO4 | 12.8 | 100 | 800 |
| Generic 200Ah AGM | AGM | 12.0 | 200 | 350 |

---

## Project Structure

```
solar/
├── package.json
├── pnpm-workspace.yaml
├── PLAN.md
├── .gitignore
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/
│   │   └── solar.db
│   └── src/
│       ├── index.ts
│       ├── db.ts
│       ├── seed.ts
│       └── routes/
│           ├── panels.ts
│           ├── inverters.ts
│           ├── batteries.ts
│           └── projects.ts
└── client/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── index.css
        ├── store/
        │   ├── panels.ts
        │   ├── inverters.ts
        │   ├── batteries.ts
        │   └── canvas.ts
        ├── components/
        │   ├── Canvas/
        │   │   ├── SolarCanvas.tsx
        │   │   ├── PanelNode.tsx
        │   │   ├── ConnectionLine.tsx
        │   │   └── Toolbar.tsx
        │   ├── Panels/
        │   │   ├── PanelCatalog.tsx
        │   │   ├── PanelEditor.tsx
        │   │   └── PanelDropdown.tsx
        │   ├── Inverter/
        │   │   ├── InverterCatalog.tsx
        │   │   └── InverterEditor.tsx
        │   ├── Battery/
        │   │   ├── BatteryCatalog.tsx
        │   │   └── BatteryEditor.tsx
        │   ├── Readout/
        │   │   └── ElectricalReadout.tsx
        │   └── Layout/
        │       └── AppShell.tsx
        ├── lib/
        │   ├── electrical.ts
        │   ├── topology.ts
        │   └── api.ts
        └── types/
            └── index.ts
```
