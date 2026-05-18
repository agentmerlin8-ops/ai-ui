# ai-ui — Scope (in / out / deferred)

> This document is the source of truth for what `ai-ui` is and isn't.
> If a feature request doesn't fit "In scope" here, point at this file.

## In scope

- A VS Code extension exposing **language-model tools** to Copilot Chat.
- A **singleton widget panel** rendered as a webview beside the active
  editor.
- A small library of **typed widget kinds**: `list-detail`, `table`,
  `tree`, `timeline`, `kanban`, `diff`, `chart`, `form`.
- **Per-source integrations** for a curated set of developer-relevant
  systems (initially GitHub; later ADO, Azure, Teams, SharePoint, Figma).
  Each integration is a typed tool with a typed input schema and a hard-
  coded endpoint surface.
- **Editor-native actions** triggered from widget interactions:
  `vscode.window.showTextDocument`, `vscode.commands.executeCommand('vscode
  .diff', ...)`, `vscode.env.openExternal`, `vscode.tasks.executeTask`.
- **Auth via `vscode.authentication.getSession(...)`** for any provider
  VS Code natively supports (GitHub, Microsoft).
- **Read operations** against supported sources.
- **Write/edit operations** against supported sources, gated by an
  explicit user-visible confirmation step in the widget.
- **Workspace-aware defaults** (repo from `.git/config`, branch from
  active editor, etc.).

## Out of scope

These will be **declined** unless the scope explicitly changes. The
reasoning is captured so future-us can revisit.

### Calling arbitrary user-supplied URLs / custom APIs
The extension will **not** ship a generic "call this URL" or "fetch this
HTTP endpoint" tool. Reasons:

- **Security.** A chat-driven URL fetcher is an SSRF risk and a data-
  exfiltration vector (Copilot can be prompt-injected by content it reads
  into calling attacker-controlled URLs with the user's session cookies
  or tokens attached).
- **No authentication model.** Custom URLs have no shared auth story; we'd
  have to either pass no creds (useless for anything real) or store
  per-URL secrets (a credential-management problem we explicitly do not
  want).
- **No schema, no edit safety.** Without a known schema we can't render
  edits safely or round-trip data with confidence.
- **No diagnostic story.** When it breaks, "the API changed" is impossible
  to debug from the chat side.

**The right path** for custom-API support, if/when it becomes a real need,
is a **per-connection configuration**: the user registers a named
connection (URL + OpenAPI/GraphQL schema + auth strategy + edit-allow
list) ahead of time; a *typed* tool then operates over registered
connections only. That is a deliberate future feature, not a v1.

### Non-VS Code clients
`ai-ui` targets Copilot Chat **in VS Code**. Not Copilot Chat on the web,
not JetBrains, not Cursor, not the terminal. If portability ever matters,
the path is to lift integrations into an MCP server (see Deferred).

### Multi-user / multi-tenant
Single-developer tool. No shared state, no team admin, no per-user
permissions inside the extension. (The *underlying sources* have their
own permission models; we respect those.)

### Replacing source-of-truth systems
`ai-ui` does not store data. It reads, renders, and (with confirmation)
writes back. No local database of issues, no cached PR archive, no
sync engine.

### Real-time collaborative editing
The widget panel is local. No two-cursors-in-one-widget, no presence,
no broadcast.

### Mobile / non-desktop targets
Webviews assume desktop layout, mouse + keyboard.

### A widget composer / user-built UIs
Users do not assemble widgets via drag-and-drop. Widget kinds are built
by maintainers and shipped in the extension. The flexibility comes from
chat + composition, not from a no-code UI builder.

### Arbitrary code execution from widgets
Widget interactions resolve to a **fixed allow-list** of VS Code actions
(open file, show diff, run a *registered* command, open external URL).
A widget cannot trigger arbitrary shell or arbitrary `vscode.commands`
ids — only those the extension explicitly routes.

### Long-lived background services / always-on event loops
The extension is event-driven (tool-call triggered). No daemons, no
schedulers, no always-on webhook receivers in v1. (See Deferred for the
live-data story.)

## Deferred (intentionally not v1, but planned)

These are not "out of scope forever" — they're things we've consciously
chosen to skip for now. Each has a trigger condition for revisiting.

| Deferred | Trigger to revisit |
|---|---|
| `@ai-ui` chat participant (slash commands) | When tool discovery starts feeling clumsy enough that slash-command shortcuts are worth the boilerplate. |
| Multiple concurrent widget panels | When users start asking "can I keep the PR list open while looking at deployments?" |
| Live data (webhooks, SSE, push updates) | When a workflow is hampered by users having to re-ask. Likely first for inbox + alerts. |
| Cross-source orchestration tool (`inbox`) | After 2–3 per-source `show_*` tools exist and we can compose them. |
| Edit safety framework (dry-run, diff-preview, audit log) | Before shipping the first write tool (e.g. assigning a PR, labeling an issue). |
| Marketplace publishing (icon, publisher, VSIX release) | When the extension is being used outside the author's machine. |
| MCP wrapper around tools | If a non-VS-Code client becomes a real requirement. |
| Custom-API support via *registered connections* (NOT raw URL fetching) | When the team has a concrete internal API they want first-class. |

## Decision principle

When unsure whether something belongs in `ai-ui`, ask:

> *Does this feature lean into at least one of the five unique unlocks*
> (composition, intent-over-navigation, editor context, conversational
> refinement, action chains)?

If yes → in scope (or thoughtfully deferred). If no → it's probably an
existing extension's job, and `ai-ui` should leave it alone.
