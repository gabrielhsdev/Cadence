# Contributing — developer orientation

A 5-minute map of the codebase. For depth (DB schema, ER diagrams, the queue
algorithm, FSRS details) see [README.md](README.md); this is just "where do I
start and where do things live."

## Run it

```bash
npm install          # compiles the native better-sqlite3 binding
npm run seed         # one-time: load NeetCode 150 / Blind 75 / Design problems
npm run dev          # Vite (renderer) + Electron, concurrently
```

Dev loop checks (the pre-push hook and CI both run `npm run verify`):

```bash
npm run lint         # ESLint (flat config) + React Hooks rules
npm run typecheck    # tsc across renderer / main / test projects
npm test             # fast pure-logic tests (no native deps)
npm run verify       # lint + typecheck + test  ← the gate; keep it green
npm run test:db      # SQLite-backed tests (rebuilds native module; run before release)
```

## The 3 processes (and how data flows)

Electron splits the app into isolated layers that talk only over a typed bridge.
The renderer has **no** direct DB or Node access.

```
RENDERER (React)  →  PRELOAD (bridge)        →  MAIN (Node)        →  SQLite
src/renderer         src/main/preload.ts        src/main/ipc.ts       src/db/*
src/screens          window.api.* (typed)       ipcMain.handle()      better-sqlite3
src/components        ↕ ipcRenderer.invoke ↕
```

A renderer call `api.queue.getToday()` → channel `queue:get-today` → the matching
`handle()` in `ipc.ts` → functions in `src/db/*`/`src/main/*` → back up the chain.

## Where things live

| Area | File(s) |
|---|---|
| App bootstrap / window | `src/main/main.ts` |
| **IPC handlers** (all of them) | `src/main/ipc.ts` |
| Renderer-facing API surface | `src/main/preload.ts` (exports the `Api` type) |
| Daily queue logic | `src/main/generator.ts` |
| **Scheduling (FSRS)** | `src/main/scheduler.ts` |
| FSRS state backfill | `src/main/backfill.ts` |
| CSV import/export | `src/main/csv.ts` |
| Data access (one file per area) | `src/db/{problems,reviews,queues,settings,state}.ts` |
| Schema (CREATE TABLE) | `src/db/schema.ts` |
| Shared types / date helpers | `src/types.ts`, `src/dateUtils.ts` |
| Screens (one per tab) | `src/screens/*` |
| Reusable UI | `src/components/*` |

## Invariants worth knowing (single sources of truth)

- **Scheduling** lives only in `src/main/scheduler.ts` (FSRS via `ts-fsrs`).
  `applyRating()` is the one place a due date + memory state are computed. Swap
  algorithms by replacing this file.
- **"Is a problem due?"** comes from `problem_state.due` (the `problem_state`
  table). Both the queue (`getEligibleProblems`) and the Forecast read it.
  `reviews.next_review_at` is historical only.
- **IPC contract**: the canonical channel list is the `Channel` union in
  `ipc.ts`; `handle()` is typed against it. Each channel has exactly one
  `handle()` and one `api.*` method in `preload.ts`.
- **Schema**: `src/db/schema.ts` is the source of truth and uses
  `CREATE TABLE IF NOT EXISTS`. Changing it affects existing user databases —
  prefer additive changes; never rewrite existing tables.

## Common tasks

- **Add an IPC channel:** add the name to `Channel` in `ipc.ts`, register a
  `handle()` there, and add the matching `api.*` method in `preload.ts`.
- **Add a screen/tab:** create `src/screens/Foo.tsx`, then wire it into the nav
  + switch in `src/renderer/App.tsx`.
- **Add a problem list:** create `src/seed/mylist.ts` exporting `NewProblem[]`
  with a distinct `list_name`, import + spread it in `src/seed/run.ts`, run
  `npm run seed`. (Overlapping lists dedup by title + URL.)
