# ai-ui — Architecture

## One-paragraph overview

Implementation and coding guardrails for AI extensibility are defined in
`docs/ai-extensibility-standards.md` and are normative for this architecture.

A VS Code extension registers **language-model tools** with
`vscode.lm.registerTool`. When Copilot Chat (in Agent mode) invokes a tool,
the handler runs in the extension's Node process — so it has direct
synchronous access to the full VS Code API. The handler fetches whatever
data the tool needs, then calls a **`WidgetPanelManager`** singleton that
opens (or reuses) a webview panel beside the active editor and posts a
`render` message with a typed payload. The webview renders the widget and
sends user interactions back via `postMessage`, which the extension
translates into native VS Code actions (open file, show diff, run command,
open external URL).

```
┌─ VS Code ────────────────────────────────────────────────────────┐
│                                                                  │
│  Copilot Chat (Agent mode)                                       │
│      │                                                           │
│      │ tool call: ai-ui_show_pr_list({repo:"o/r"})               │
│      ▼                                                           │
│  Extension host (Node)                                           │
│      ├─ tool handler: fetch + normalize                          │
│      ├─ WidgetPanelManager.render({kind, payload})               │
│      │       │                                                   │
│      │       │ postMessage('render', payload)                    │
│      │       ▼                                                   │
│      │  Webview Panel (sandboxed)                                │
│      │       ├─ widget.js renders the widget                     │
│      │       └─ user click → postMessage('openUrl', url)         │
│      │                              │                            │
│      │ ◄────────────────────────────┘                            │
│      ▼                                                           │
│  vscode.env.openExternal / vscode.commands.executeCommand(...)   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Tool contributions (`package.json` → `contributes.languageModelTools`)
Declarative tool definitions: name, JSON input schema, model-facing
description, user-facing description, `toolReferenceName` for `#`-style
invocation. Copilot Chat discovers these automatically when the extension
activates.

### 2. Tool handler (extension entrypoint)
Each tool is registered with `vscode.lm.registerTool(name, handler)`. The
handler:

- validates / defaults the input
- fetches data (using `vscode.authentication.getSession(...)` for OAuth-based
  sources so credentials are never stored by the extension itself)
- maps the result into a typed widget payload
- calls `panel.render(payload)`
- returns a `LanguageModelToolResult` with a *one-line* confirmation
  ("Rendered 12 open PRs for o/r in the ai-ui panel.")

The confirmation is intentionally minimal: it tells the model the side
effect succeeded so it doesn't repaste the data as text, but doesn't
duplicate the panel content.

### 3. `WidgetPanelManager` (singleton)
Owns one `vscode.WebviewPanel`. On `render(payload)`:
- creates the panel if it doesn't exist (beside the active editor,
  `preserveFocus: true`)
- reveals it if it does
- posts a `{ type: 'render', payload }` message to the webview

Receives `postMessage` callbacks from the webview and dispatches them to
the appropriate VS Code API (`openUrl` → `vscode.env.openExternal`; future
kinds: `openFile`, `showDiff`, `runCommand`).

### 4. Webview (HTML + JS + CSS)
Static assets under `media/`. The HTML shell sets a strict
Content-Security-Policy (script-src nonce, no inline scripts, no external
fetch). `widget.js` is a single-file vanilla renderer that:

- listens for `render` messages and swaps the DOM
- persists per-panel UI state (selected row, splitter position) via
  `vscode.getState()` / `vscode.setState()` so it survives panel hides /
  webview reloads
- sends user actions back via `vscode.postMessage(...)`

Styling uses VS Code theme CSS variables (`--vscode-foreground`,
`--vscode-list-hoverBackground`, ...) so widgets adapt to the user's theme
automatically.

## Why these choices

- **`vscode.lm.registerTool` instead of MCP.** Tools run in-process — the
  handler has the full VS Code API available synchronously. No
  serialisation, no transport, no separate process. Distribution is one
  VSIX. MCP can be added later if we ever want non-VS-Code clients.

- **Singleton panel, swap on render.** Matches the original "Canvas" mental
  model from the pre-pivot PRD: one focused workspace surface. Multiple
  concurrent panels are a future need; not v0.

- **Webview state via `vscode.getState()`**, not extension state. Keeps
  panel-local UI concerns (splitter %, selected row) where they belong.
  Extension state is reserved for cross-panel concerns.

- **One tool per *verb × domain*, not per render kind.** Tool names like
  `show_pull_requests` and `show_work_items` map to model intent. The
  underlying render kind (`list-detail`, `table`, ...) is an internal
  detail.

- **Auth via `vscode.authentication.getSession`** — never a stored PAT.
  Plays nicely with VS Code's sign-in UX and survives token refresh.

## Repository layout

```
ai-ui/
  .vscode/
    launch.json          # F5 launches Extension Development Host
    tasks.json           # ai-ui: compile / watch tasks
  docs/                  # architecture + vision + scope + standards
  extension/
    package.json         # extension manifest + tool contributions
    tsconfig.json
    src/
      extension.ts       # activation, tool registration, handler
      panel.ts           # WidgetPanelManager
    media/
      widget.js          # webview renderer (vanilla)
      widget.css         # theme-aware styles
    out/                 # compiled JS (gitignored)
  skills/                # third-party engineering skill docs (vendored)
  README.md
```

## Widget primitives (the small set we'll reuse)

| Kind          | Used by                                              |
| ------------- | ---------------------------------------------------- |
| `list-detail` | PRs, issues, work items, alerts, files (today's POC) |
| `table`       | search results, cost breakdowns, custom data         |
| `tree`        | file trees, resource hierarchies, SharePoint sites   |
| `timeline`    | deployments, commits, alerts                         |
| `kanban`      | boards, sprints                                      |
| `diff`        | native — just calls `vscode.diff`                    |
| `chart`       | metrics, costs, trends                               |
| `form`        | schema-driven edits                                  |

Per-source tools become thin: fetch → normalise → call `render(kind,
payload)`. Adding a new source is a fetcher + a kind choice.

## Extension lifecycle

- **Activation**: lazy (no explicit `activationEvents`). The
  `languageModelTools` contribution triggers activation the first time
  Copilot tries to invoke a tool. Keeps idle cost zero.
- **Reload model**: `package.json` changes require an Extension Host
  reload (close + F5, or `Developer: Reload Window` in the host). Pure JS
  edits in `media/` need only a webview reload
  (`Developer: Reload Webviews`).

## Security boundaries

- **Webview CSP**: `default-src 'none'`; scripts gated by nonce; no inline
  JS; no remote script sources. Webview cannot fetch or `eval`.
- **No HTML from data**: all payload strings are HTML-escaped in the
  renderer before insertion.
- **No arbitrary URL fetching from tools**: tools only call endpoints
  hard-coded for known integrations (see `scope.md`).
- **Edit operations require explicit user confirmation** before being
  routed to the source. (Will be enforced in the form widget; see
  `scope.md`.)
