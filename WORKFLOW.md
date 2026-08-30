# Standard Development Workflow

Every change to this repo follows the same cycle:

**plan → branch → write → test → commit → PR**

## 1. Plan

- Work is scoped from `PLAN.md` (a phase) or a single, self-contained feature.
- Before coding, write down: the goal, the files likely to be touched, and the acceptance criteria. A session todo list is enough for small work; for anything multi-day, capture it in `PLAN.md`.
- Update `PLAN.md` (and the phase label in `client/src/components/Layout/AppShell.tsx`) when a phase completes.

## 2. Branch

Start from an up-to-date `main` and cut a branch named `<type>/<kebab-name>`:

```sh
git checkout main && git pull
git checkout -b feat/wire-gauge-warnings
```

Allowed types (same set as commit types below): `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.

One feature per branch. Unrelated changes get their own branch.

## 3. Write

- Follow the conventions and gotchas in `AGENTS.md` — in particular:
  - `client/src/lib/topology.ts` and `client/src/lib/electrical.ts` must stay consistent if the wiring model changes.
  - Serialized project fields stay in sync with the canvas store and `ProjectConfig`.
  - Schema changes in `server/src/db.ts` require a DB reset (no migrations).
- New pure logic gets a unit test in the same change:
  - client logic → `client/src/lib/*.test.ts`
  - server route behavior → `server/src/**/*.test.ts` (via `app.inject()`)
- Keep the diff minimal; don't refactor unrelated code in a feature branch.

## 4. Test

The gate is:

```sh
pnpm build   # tsc + vite build (client), tsc (server)
pnpm test    # vitest in both packages
```

Both must pass before committing. When the UI changed, also smoke-test with `pnpm dev` (server on 3001, client on 5173).

Notes:

- Client tests run in a node environment against the pure `src/lib` modules — no DOM, no Konva.
- Server tests hit the real Fastify app (`server/src/app.ts`) against a temp SQLite DB. `server/test/setup.ts` sets `SOLAR_DB_PATH` before the app is imported; don't bypass it by importing `db.ts` directly with a hardcoded path.

## 5. Commit

Use Conventional Commits: `type(scope): summary`

- Imperative mood, ≤72 characters, no trailing period.
- Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `build`, `ci`.
- Scope is optional, use the subsystem: `panel`, `inverter`, `battery`, `wiring`, `canvas`, `api`, `bom`, ...

```
feat(wiring): warn when parallel strings are voltage-mismatched
test(api): cover panels CRUD via app.inject
chore: add pre-commit hook and CI workflow
```

Rules:

- One logical change per commit.
- Never commit SQLite files (`server/data/*.db*`) or secrets.
- The pre-commit hook (`.githooks/pre-commit`) runs `pnpm build && pnpm test` automatically and blocks the commit on failure.

## 6. Pull request

```sh
git push -u origin <branch>
gh pr create
```

- Describe what changed, why, and how you tested it.
- Before merging: CI green, diff self-reviewed, commits follow the convention.
- Squash-merge, then delete the remote branch.

## One-time setup

Run once per clone so the commit gate is active:

```sh
pnpm setup:hooks
```
