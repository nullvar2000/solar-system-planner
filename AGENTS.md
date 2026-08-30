# AGENTS.md

pnpm workspace monorepo: `server/` (Fastify + better-sqlite3, run via tsx) and `client/` (Vite + React + TS + Konva/react-konva + Zustand + Tailwind). `PLAN.md` is the 10-phase roadmap; the current phase is shown in the header label in `client/src/components/Layout/AppShell.tsx` — update it when a phase completes.

## Commands

- `pnpm dev` — run server (port 3001) and client (port 5173) in parallel. Also `pnpm dev:server` / `pnpm dev:client`.
- `pnpm seed` — seeds SQLite (4 panels, 2 inverters, 2 batteries). Not automatic: `server/src/index.ts` never imports `seed.ts`, so a fresh DB has no data until you run this. Skips if the `panels` table is non-empty.
- `pnpm test` — run vitest in both packages (client pure-logic tests, server route tests via `app.inject()`).
- `pnpm setup:hooks` — one-time: point git at `.githooks/` so the pre-commit gate (build + test) runs on every commit.
- Reset data: delete `server/data/solar.db*` (db, -wal, -shm) then `pnpm seed`.
- Verify: `pnpm build && pnpm test` — the standard gate (client runs `tsc && vite build`, server runs `tsc`; vitest covers `client/src/lib` and server routes). No linter. Client tsconfig enforces `noUnusedLocals`/`noUnusedParameters` — test files in `client/src` are typechecked by the build, keep them clean.

## Workflow

The standard flow is defined in `WORKFLOW.md`: **plan → branch → write → test → commit → PR**.

- Branches: `<type>/<kebab-name>` off `main` (e.g. `feat/wire-gauge-warnings`), one feature per branch.
- Commits: Conventional Commits — `type(scope): summary`, imperative, ≤72 chars.
- Land via PR: CI (`.github/workflows/ci.yml`) must be green, then squash-merge and delete the branch.

## Gotchas

- The client calls the API at a hardcoded `http://localhost:3001/api` (`client/src/lib/api.ts`) — no Vite proxy; the server must be running or the UI silently shows nothing (fetch errors are caught in stores).
- Schema has no migration system: `initSchema()` in `server/src/db.ts` uses `CREATE TABLE IF NOT EXISTS`. To change the schema you must edit db.ts **and** reset the DB file, or existing rows won't get new columns.
- `seed.ts` executes `seed()` at module load (side effect on import).
- Canvas state (placed panels, wires, inverter/battery assignment, loads) lives only in the Zustand store (`client/src/store/canvas.ts`) — in-memory, lost on refresh. Project save/load serializes it via `ProjectConfig` (`client/src/types/index.ts`) to `/api/projects`; `restoreState` in the canvas store is the only entry point for rehydration and bumps the id counters — keep serialized fields in sync with both.
- Wiring model: each terminal carries at most one wire, so the wiring graph is always paths/rings. `client/src/lib/topology.ts` walks it; `client/src/lib/electrical.ts` derives V/A/W per string/group/array. Keep both consistent if you change the model.
- Server is ESM with top-level await; the Fastify app is built in `server/src/app.ts` (routes registered with prefixes) and `server/src/index.ts` only calls `listen`. Tests import `app.ts`.
- `server/src/db.ts` honors `SOLAR_DB_PATH` to override the DB location; `server/test/setup.ts` sets it to a temp file before the app is imported (the DB opens at module load).
- SQLite artifacts are all gitignored (`*.db`, `*.db-wal`, `*.db-shm`) — don't commit anything from `server/data/`.
