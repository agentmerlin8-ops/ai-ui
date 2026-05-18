# ai-ui — Vision

> A chat-driven widget layer for developers inside VS Code. The chat is the
> entry point; widgets are the answer.

## What it is

`ai-ui` is a VS Code extension that exposes a set of **language-model tools**
to Copilot Chat. Tools fetch data from developer sources (GitHub, Azure DevOps,
Azure, Teams, SharePoint, Figma, etc.) and render the result as **interactive
widgets** in a side panel inside VS Code. Clicks on those widgets become
native editor actions: open a file, show a diff, run a command, post a
comment, deploy.

The chat reply itself stays minimal ("Rendered 12 open PRs.") — all the
richness lives in the panel.

## Why this exists

Every source above already has a VS Code extension. The pitch is not
"another way to look at PRs." The unique value comes from five things only a
chat-driven widget layer can deliver:

1. **Composition across sources.** "Show me everything assigned to me — ADO
   items, GitHub PRs, Teams mentions." No single extension spans these.
2. **Intent over navigation.** "What's blocked on me?" is one sentence.
   In a fixed UI it's filters + views + sorts, four clicks deep.
3. **Editor context for free.** Active file, current branch, terminal error,
   selected lines — all available to tools without the user typing them.
4. **Conversational UI refinement.** "Group by author." "Filter to the auth
   team." "Sort by stale." The widget re-renders.
5. **Action chains.** "Triage these 10 issues — show each, let me label."
   The chat orchestrates a sequence of widget interactions.

Any feature that doesn't lean into at least one of those is reinventing an
existing extension.

## Target user

A single developer doing day-to-day engineering work. Not a team admin, not
a manager, not a customer-facing role. This is a productivity tool for the
person at the keyboard.

## Killer workflows (the things this should be great at)

These are the *jobs* `ai-ui` should win. Each is several widgets composed by
chat; the chat orchestrates, the widgets do the work.

### 1. Morning triage
*"What needs my attention?"*

Unified inbox: ADO assigned items + GH PR reviews + GH PRs awaiting your
changes + Teams @-mentions + Azure alerts on services you own. Sorted by
staleness. Click → source-specific detail.

### 2. PR review loop
*"Review #1234."*

Master/detail: file tree, native VS Code diff in the middle, threads + checks
+ CI on the right. Buttons for comment / approve / request changes / merge.
Chat sits below and is *grounded in the diff* — "summarise this PR",
"explain the change to `authService.ts`".

### 3. Production debugging
*"What broke at 14:32?"*

Timeline of deployments + alerts + log spikes. Click an alert → log widget
with KQL pre-filled. Click a stack frame → VS Code jumps to the local source
line. "Rollback to previous" calls into Azure deploy. The cross-source
killer demo: App Insights + Azure + git, woven together.

### 4. Standup / handoff
*"What did I do yesterday and what's next?"*

Two-pane widget: yesterday's commits + closed items, today's open assignments
+ planned. "Copy as standup note" — or generate a Teams message and post it.

### 5. Design parity
*"Compare the login screen Figma frame to the rendered component."*

Figma render + live preview of the React component + token diff (spacing,
colors, fonts). Click a token → opens the source file.

### 6. Cost & resource awareness
*"Show Azure costs for my team this month, top 5 spenders."*

Chart + table. Click a resource → detail + rightsizing recommendation.
"Apply rightsize" calls into Azure (with confirm step).

## Sequencing — POC → v1

Done:
- **POC**: `show_pr_list` with master/detail and a draggable splitter.

Suggested next steps in priority order:

1. **PR review loop** — extends the existing PR widget with diff + threads
   + checks. Highest daily-use payoff; proves the "widget = control
   surface" thesis.
2. **`show_diff` primitive** — one-liner over `vscode.commands.executeCommand
   ('vscode.diff', ...)`. Unlocks dozens of widgets.
3. **`show_work_items` (ADO)** — first cross-source tool. Pulls in
   Microsoft auth, which unlocks Teams/SharePoint/Azure later.
4. **Unified `inbox`** — first composed widget that calls several
   per-source tools. Proves the chat-orchestration idea.
5. **`data_table` + edit** — first editable widget. Round-trips changes
   to a backing source via the same tool. (See `scope.md` for what
   "backing source" is allowed to be.)
6. **Production debugging timeline** — the killer cross-source demo.

## Long-term aspiration

A developer can spend a productive hour without leaving VS Code — across
code, PRs, work items, deployments, designs, costs, and team comms — driven
by a conversation, manifested as live widgets. The conversation is the
interface; the widgets are the surface.
