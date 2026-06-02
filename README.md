# Interview Repetition

A desktop app for retaining LeetCode and coding interview problems through spaced repetition.
Runs entirely locally — no accounts, no cloud sync.

---

## Prerequisites

| Tool | Minimum version | Notes |
|---|---|---|
| Node.js | 20.x LTS | v25 is also supported |
| npm | 10.x | Bundled with Node |
| Python | 3.x | Required by `node-gyp` to build `better-sqlite3` |
| Xcode Command Line Tools (macOS) | latest | `xcode-select --install` |
| Visual Studio Build Tools (Windows) | 2019+ | With "Desktop development with C++" workload |

`better-sqlite3` is a native Node module and must be compiled during `npm install`. The tools above satisfy that requirement.

---

## Installation

```bash
git clone https://github.com/your-username/interview-repetition.git
cd interview-repetition
npm install
```

`npm install` automatically compiles the native SQLite binding. No extra steps are needed after that.

---

## Seeding the Database

Before running the app for the first time, seed the problem lists:

```bash
npm run seed
```

This populates:
- **NeetCode 150** — full problem list
- **Design Questions** — 25 canonical design problems
- **Topic settings** — sensible defaults (2 problems/day per topic; Dynamic Programming disabled by default)

The seed script is **idempotent** — safe to run multiple times with no duplicates added.

**Database location:**

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/interview-repetition/interview-repetition.db` |
| Linux | `~/.config/interview-repetition/interview-repetition.db` |
| Windows | `%APPDATA%\interview-repetition\interview-repetition.db` |

When running inside Electron (not CLI), the path is determined by `app.getPath('userData')`, which resolves to the same locations above.

---

## Running in Development

```bash
npm run dev
```

This starts two processes concurrently:

1. **Vite dev server** at `http://localhost:5173` — serves the React renderer with hot module replacement
2. **Electron** — waits for the Vite server to be ready, then opens the app window

Hot reload applies to the renderer. Changes to the main process or IPC handlers require restarting `npm run dev`.

---

## Building for Production

```bash
npm run build
```

This produces:
- `dist/renderer/` — bundled React app
- `dist/main/` — compiled Electron main + preload scripts

To package into a distributable:

```bash
npm run package
```

Output is placed in `release/`. Platform-specific artifacts:

| Platform | Output |
|---|---|
| macOS | `release/mac/Interview Repetition.app` |
| Linux | `release/Interview Repetition-x.y.z.AppImage` |
| Windows | `release/Interview Repetition Setup x.y.z.exe` |

---

## Project Structure

```
src/
  main/           # Electron main process
    main.ts       # App bootstrap, BrowserWindow creation
    preload.ts    # Context bridge — exposes typed `window.api` to the renderer
    ipc.ts        # All IPC handlers (registers with ipcMain)

  db/             # SQLite layer
    connection.ts # Opens and caches the DB connection, runs schema init
    schema.ts     # CREATE TABLE statements
    problems.ts   # Problem queries
    reviews.ts    # Review insert/query
    queues.ts     # Daily queue read/write
    settings.ts   # Topic and difficulty settings

  queue/
    generator.ts  # Queue generation and refresh logic

  scheduling/
    scheduler.ts  # Spaced repetition algorithm (isolated, replaceable)

  seed/
    neetcode150.ts  # NeetCode 150 problem data
    design.ts       # Design question data
    run.ts          # Seed entry point (run via npm run seed)

  types/
    index.ts      # Shared TypeScript interfaces

  renderer/
    main.tsx      # React entry point
    App.tsx       # Root component with screen routing
    api.ts        # Re-exports window.api with correct types
    styles.css    # Global styles

  components/
    QueueItem.tsx   # Single problem row in the queue
    ReviewModal.tsx # Rating + notes modal

  screens/
    QueueScreen.tsx    # Today's queue, grouped by topic
    SettingsScreen.tsx # Topic and difficulty settings
```

---

## Architecture Notes

### Electron IPC

The renderer has no direct access to Node or SQLite. All data flows through IPC:

- `src/main/preload.ts` — exposes a typed `window.api` object via `contextBridge`
- `src/main/ipc.ts` — registers `ipcMain.handle()` handlers for every channel
- `src/renderer/api.ts` — re-imports the `Api` type from preload for end-to-end type safety

### SQLite Location

The database file is stored in Electron's `userData` directory (see the table under Seeding above). In development and in the CLI seed script, the same path is computed manually using `os.homedir()` and the platform convention.

### Scheduling Module

`src/scheduling/scheduler.ts` is the only place where "when should this problem be reviewed next?" is decided. It exports:

- `getNextReviewDate(rating, fromDate)` — returns an ISO date string
- `todayIso()` — returns today's date as `YYYY-MM-DD`

To swap in FSRS or any other algorithm, replace only this file. No other module contains scheduling logic.

### Adding a New Problem List

1. Create `src/seed/mylist.ts` exporting `NewProblem[]` with `list_name: 'My List'`
2. Import it in `src/seed/run.ts` and append to `allProblems`
3. If the list introduces new topics, add them to `DEFAULT_TOPIC_SETTINGS`
4. Run `npm run seed`

No schema changes or refactoring required.
