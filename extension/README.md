# ai-ui — chat-driven widgets in VS Code

A VS Code extension that lets Copilot Chat (and any client using
`vscode.lm.registerTool`) render structured widgets in a side panel.

## v0 scope

A single tool:

- **`ai-ui_show_pr_list`** — fetches GitHub pull requests for a repo and
  renders them as an interactive list. Click a PR → opens it in your
  browser. If `repo` is omitted, the tool detects the workspace's GitHub
  remote from `.git/config`.

The webview is a singleton panel that opens beside the active editor and
swaps content on each render call.

## Development

```bash
cd extension
npm install
npm run compile
```

Then in VS Code:

1. Open the `extension` folder.
2. Press `F5` to launch an Extension Development Host.
3. In that window, ask Copilot Chat:
   > Show me the open PRs for microsoft/vscode

   (or any workspace folder with a GitHub remote — just say "list the
   open PRs".)

The panel appears in the side column and shows the list.

## Roadmap

- `show_diff(file, ref?)` — diff a file against a ref in the native diff editor
- `show_file_tree(path?)` — tree of files with click-to-open
- `show_error_list(severity?)` — problems panel as a clickable widget
- `show_table(title, columns, rows)` — generic structured-data escape hatch
- Optional `@ai-ui` chat participant for `/prs <owner>/<repo>` style shortcuts
