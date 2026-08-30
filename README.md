# Solar System Planner

A web-based design tool for planning off-grid solar systems. Drag panels onto a canvas, wire them in series/parallel, assign an inverter and battery bank, and get live electrical readouts, wire sizing, production estimates, and a bill of materials.

## Features

- **Panel / inverter / battery catalogs** — full CRUD with editable electrical specs and pricing
- **Visual canvas** — place, move, and wire panels (react-konva); red/blue wires for positive/negative
- **Topology detection** — automatically identifies series strings and parallel groups from the wiring graph
- **Live electrical readout** — per-string and total array V/A/W
- **MPPT validation** — green/yellow/red status against inverter voltage, current, and power limits
- **Wire gauge calculator** — AWG recommendation with voltage-drop estimate from current and distance
- **Production estimates** — daily/monthly/annual energy output with peak-sun-hours and temperature derating
- **Battery bank + load profile** — series/parallel bank configuration, autonomy calculation
- **Projects** — save/load full canvas designs to SQLite; export as JSON; print-friendly BOM

## Tech Stack

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

## Getting Started

Requires Node.js and pnpm.

```bash
pnpm install
pnpm seed   # seeds 4 panels, 2 inverters, 2 batteries (skip if the DB already has data)
pnpm dev    # starts server (port 3001) and client (port 5173) in parallel
```

Open http://localhost:5173 — the server must be running or the UI will have no data.

To reset all data: delete `server/data/solar.db*` (the db, `-wal`, and `-shm` files), then run `pnpm seed` again.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run client and server in parallel |
| `pnpm dev:client` | Run the Vite dev server only (port 5173) |
| `pnpm dev:server` | Run the Fastify server only (port 3001) |
| `pnpm build` | Typecheck + build both packages |
| `pnpm seed` | Seed the SQLite database with sample catalog data |

## API

Base URL: `http://localhost:3001/api`

- `GET /health`
- `GET/POST/PUT/DELETE /panels`
- `GET/POST/PUT/DELETE /inverters`
- `GET/POST/PUT/DELETE /batteries`
- `GET/POST/PUT/DELETE /projects`

## Project Structure

```
solar/
├── package.json            # workspace root (dev/build/seed scripts)
├── pnpm-workspace.yaml
├── PLAN.md                 # 10-phase implementation roadmap
├── server/
│   ├── data/               # solar.db (SQLite, created at runtime)
│   └── src/
│       ├── index.ts        # Fastify app, route registration
│       ├── db.ts           # schema init
│       ├── seed.ts         # sample catalog data
│       └── routes/         # panels, inverters, batteries, projects
└── client/
    └── src/
        ├── store/          # Zustand stores (panels, inverters, batteries, canvas, projects)
        ├── components/
        │   ├── Canvas/     # SolarCanvas, PanelNode, wires, toolbar
        │   ├── Panels/     # catalog + editor
        │   ├── Inverter/   # catalog + editor + MPPT status
        │   ├── Battery/    # catalog, bank config, load profile
        │   ├── Readout/    # electrical, topology, wire gauge, production, BOM
        │   └── Layout/     # AppShell, ProjectBar
        └── lib/
            ├── topology.ts # series/parallel detection
            ├── electrical.ts # V/A/W, production, wire gauge math
            └── api.ts      # REST client
```
