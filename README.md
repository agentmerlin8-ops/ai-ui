# ai-ui

A VS Code extension that lets Copilot Chat render structured, interactive
widgets in a side panel — pull-request lists, diffs, tables, timelines —
so chat answers become *clickable surfaces* instead of walls of text.

> Status: early research extension. Single working tool (`show_pr_list`).
> See [docs/vision.md](docs/vision.md) for where this is going,
> [docs/architecture.md](docs/architecture.md) for how it's built, and
> [docs/scope.md](docs/scope.md) for what it explicitly is and isn't, and
> [docs/ai-extensibility-standards.md](docs/ai-extensibility-standards.md)
> for coding and architecture guardrails.
> For the emerging cloud-agent direction, see
> [docs/pi-coding-agent-integration.md](docs/pi-coding-agent-integration.md).

## What it does today

A single language-model tool:

- **`ai-ui_show_pr_list`** — fetches GitHub pull requests for a repo and
  renders them as an interactive master/detail widget in a side panel
  beside the editor. If `repo` is omitted, the tool reads
  `.git/config` from the current workspace.

The widget panel is a singleton webview: each tool call swaps its
contents. Click a PR row → see detail; click "Open on GitHub" → opens
in your browser; the splitter is draggable.

## Why

Every developer-facing system (GitHub, Azure DevOps, Azure, Teams,
SharePoint, Figma, ...) already has a VS Code extension. `ai-ui` isn't
trying to replace any of them. The bet is that **chat + composable
widgets** unlock things a fixed UI can't:

1. **Composition across sources** — "Show me everything assigned to me."
2. **Intent over navigation** — "What's blocked on me?" beats four
   menu clicks.
3. **Editor context for free** — active file, branch, selection, error.
4. **Conversational refinement** — "Group by author." "Filter to auth
   team." The widget re-renders.
5. **Action chains** — chat orchestrates a sequence of widget steps.

## Repository layout

```
ai-ui/
  docs/                  # vision, architecture, scope, standards
  extension/             # the VS Code extension source
    src/
    media/
    package.json
  skills/                # third-party engineering skill docs (vendored)
  .vscode/               # launch + tasks for F5
  LICENSE
  README.md
```

## Quick start (developing the extension)

```bash
cd extension
npm install
npm run compile
```

Then from the repo root in VS Code press **F5** to launch an Extension
Development Host. In that window, with Copilot Chat in Agent mode, ask:

> Show me the open PRs for microsoft/vscode

The widget panel opens beside the editor.

## License

[MIT](LICENSE)
