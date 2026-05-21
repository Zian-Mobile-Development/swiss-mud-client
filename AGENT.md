# Project Guidelines

Instructions for AI coding agents working in this repository.

## Project Overview

**Swiss Mud Client** (package name `swiss-mud-client`) is a browser-based MUD client. It connects to a separate [Swiss Mud Proxy](https://github.com/lonelytango/swiss-mud-proxy) over WebSocket, sends the selected MUD profile as the initial connection payload, and renders streamed game output in the browser.

The client supports local profiles, aliases, triggers, scripts, variables, data import/export, command history, speedwalk helpers, and screen reader accessibility settings. User data is stored in `localStorage`; there is no backend database in this repo. Deployment is optional through Docker/Fly.io.

## Tech Stack & Core Libraries

- **Framework:** React 19 with Vite 6.
- **Language:** TypeScript with `strict`, `noUnusedLocals`, and `noUnusedParameters` enabled in `tsconfig.app.json`.
- **Styling:** CSS Modules plus shared global CSS in `index.css` and `styles/common.module.css`.
- **Editor:** `@monaco-editor/react` for alias, trigger, and script editing.
- **Terminal output:** streamed HTML output from the proxy; helper utilities strip/normalize text for triggers and screen reader announcements.
- **WebSocket:** browser `WebSocket`, wrapped by `managers/WebSocketManager.ts`.
- **Command automation:** `engines/CommandEngine.ts` and `engines/PatternEngine.ts`.
- **Testing:** Jest 29 with `ts-jest` ESM preset.
- **Lint:** ESLint 9 flat config with TypeScript, React Hooks, and React Refresh.
- **Formatting:** Prettier via `.prettierrc`.
- **Package manager:** README and lockfile use Bun (`bun.lock`), but scripts are standard package scripts in `package.json`.

Prefer existing browser/React APIs and local helpers over new dependencies. Do not add a library unless the current stack does not reasonably cover the need.

## Critical Commands

- **Install:** `bun install`
- **Dev:** `bun run dev` (Vite dev server, default port `5173`)
- **Build:** `bun run build` (`tsc -b && vite build`)
- **Preview production bundle:** `bun run preview`
- **Lint:** `bun run lint`
- **Test:** `bun run test`
- **Deploy:** `bun run deploy`

If Bun is unavailable in a local agent shell, use the installed project binaries with a Node runtime, for example `node_modules/.bin/jest`, `node_modules/.bin/tsc`, and `node_modules/.bin/vite`.

After substantive changes, run the build locally. Run tests for changes in command parsing, line buffering, triggers, aliases, accessibility announcements, or shared utilities.

Known current test caveat: `tests/utils/CommandUtils.test.ts` expects `parseSpeedwalk('')` to return `['']`, while the current implementation returns `[]`.

## Architecture & State Management

### Directory structure

- **`App.tsx`:** Top-level app state and runtime wiring: selected profile, connection status, command history, output HTML, trigger enablement, command engine, WebSocket manager, stream buffers, and screen reader announcements.
- **`main.tsx`:** React root bootstrap with `AppContextProvider`.
- **`contexts/AppContext.tsx`:** Global variables and settings context, persisted to `localStorage`.
- **`components/Menu/`:** Main popup menu and dialog shell for Connect, Triggers, Alias, Scripts, Variables, Data, and Settings.
- **`components/ConnectView/`:** MUD profile CRUD and connect action.
- **`components/AliasView/`, `TriggerView/`, `ScriptView/`, `VariableView/`:** LocalStorage-backed editing views for automation data.
- **`components/DataView/`:** Import/export UI.
- **`components/SettingsView/`:** Output, font, and screen reader settings.
- **`engines/CommandEngine.ts`:** Executes alias/trigger matches and sends resulting commands, respecting waits.
- **`engines/PatternEngine.ts`:** Regex matching and JavaScript sandbox helpers for aliases, triggers, and scripts.
- **`managers/WebSocketManager.ts`:** WebSocket lifecycle, reconnect behavior, profile handshake, and connection callbacks.
- **`managers/DataManager.ts`:** JSON import/export for localStorage data.
- **`utils/`:** Command helpers, client-only commands, text normalization, line buffering, and screen reader announcement helpers.
- **`hooks/useFocusTrap.ts`:** Keyboard focus containment for popup dialogs.
- **`public/`:** Static assets such as `logo.svg` and `alert.mp3`.
- **`dist/`:** Build output; do not edit by hand.

### State

- **Global:** `AppContext` for variables and settings.
- **App-level:** `App.tsx` owns connection state, output buffers, command history, selected profile, aliases, triggers, scripts, and the current command/WebSocket managers.
- **Local:** Component `useState` and refs for edit buffers, selected rows, unsaved state, drag/drop, and focus management.
- **Persistence:** `localStorage` keys include `mud_profiles`, `mud_variables`, `mud_aliases`, `mud_triggers`, `mud_scripts`, and `mud_settings`.

### WebSocket flow

1. User selects or edits a profile in `ConnectView`.
2. `App.tsx` creates a `WebSocketManager`.
3. `WebSocketManager.connect(profile)` opens `VITE_WS_URL` or `ws://0.0.0.0:3000`.
4. On open, it sends `{ address, port, encoding }` as JSON.
5. Incoming messages append to visual output and are also converted to plain text for triggers and screen reader announcements.
6. The app treats a message containing `[INFO] Connected to MUD server` as the moment commands can be sent.

### Command and automation flow

- User input is handled by `utils/CommandHandler.ts`.
- Client-only commands such as `cls`, `clear`, and `clear screen` are handled by `ClientCommandManager` and should not be sent to the MUD.
- Alias input and trigger lines run through `CommandEngine.processPattern`.
- `PatternEngine` uses regex patterns and executes configured command JavaScript with helpers:
  - `send(command)`
  - `sendAll(...commands)`
  - `wait(ms)`
  - `speedwalk(actions, backwards?, delay?)`
  - `alert()`
  - `setVariable(name, value)`
  - `sendEvent(eventName)`
- Pattern scripts are user-authored and executed with `new Function`. Keep that behavior contained to the pattern engine; do not spread dynamic code execution elsewhere.

### Accessibility

- Popup dialogs should remain keyboard accessible and use `useFocusTrap`.
- Preserve live region behavior in `App.tsx` when changing output rendering, connection status, or screen reader settings.
- The screen reader path intentionally strips HTML and buffers line-based output in `LineBuffer`.
- Be careful with prompt-like output that may not end in a newline; `PROMPT_FLUSH_MS` exists to announce pending line text.

## Environment

- **Local proxy:** Run Swiss Mud Proxy separately; this client expects a WebSocket proxy.
- **Local client env:** Copy `env.sample` to `.env`.
- **WebSocket URL:** `VITE_WS_URL` controls the proxy URL. If unset, the app uses `ws://0.0.0.0:3000`.
- **App version:** `VITE_APP_VERSION` is shown in the status bar; defaults to `0.0.0.0-dev`.
- Never commit `.env` files or real secrets.

## Coding Standards

### Naming

- **Components:** PascalCase directory names with `index.tsx` where that pattern already exists.
- **Hooks:** camelCase with `use` prefix.
- **Types/interfaces:** PascalCase.
- **Constants:** Use clear names; prefer `SCREAMING_SNAKE_CASE` for true module-level constants.

### Exports

- Match neighboring files.
- Many component views use default exports.
- Shared utilities and managers generally use named exports.
- Keep exported types close to the module that owns them unless they are truly shared through `types.ts`.

### Component structure

- Define prop types or interfaces near the top of the file.
- Keep edit-buffer logic local to the relevant view.
- For dialogs and menu changes, preserve keyboard navigation, Escape behavior, focus restoration, and ARIA labels.

### Typing

- Strict TypeScript is on. Avoid `any`; use `unknown` and narrow external payloads.
- Existing code has a few loose data shapes in import/export paths. Tighten those when touching the area, but avoid broad unrelated rewrites.
- Keep shared domain shapes in `types.ts` aligned with localStorage data.

### LocalStorage and JSON

- Preserve existing storage keys unless a migration is intentionally implemented.
- When adding fields, merge persisted settings with defaults so older users keep working.
- Validate imported JSON before writing it to `localStorage`.

### Tests

- Unit tests live in the top-level `tests/` folder, mirroring source layout (e.g. `tests/utils/`, `tests/engines/`).
- Prioritize tests for:
  - command parsing and speedwalk behavior
  - alias and trigger processing
  - script event behavior
  - `LineBuffer`
  - screen reader announcement helpers
- Keep tests deterministic; avoid relying on real WebSocket connections.

## UI & Styling Guidelines

- Use the existing CSS Module structure and shared classes in `styles/common.module.css`.
- Keep the app compact and tool-like; this is an operational MUD client, not a marketing surface.
- New controls should be keyboard accessible, labeled, and usable on small screens.
- Preserve output readability and avoid layout shifts around the command input.
- Avoid adding icon libraries casually. Existing UI currently uses text/icon glyphs.
- Do not put important user instructions only in placeholders; use labels, `aria-label`, or hidden helper text where needed.

## What AI Agents Should Never Do

- Never commit `.env` files or paste live secrets into the repo or chat logs.
- Never install a dependency without checking whether browser, React, Vite, or existing local helpers already cover the need.
- Never edit `dist/` by hand.
- Never change localStorage keys casually; users may already have saved profiles and automation data.
- Never break keyboard access to dialogs, command input, or menu navigation.
- Never spread `new Function` or user-authored code execution beyond the existing pattern/script engine.
- Never run destructive git operations (`reset --hard`, force-push to shared branches, deleting user changes) unless the user explicitly requests it.
- Never revert uncommitted changes you did not make.
