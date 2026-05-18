import * as vscode from 'vscode';
import { WidgetPanelManager, PrListPayload } from './panel';

interface ShowPrListInput {
  repo?: string;
  state?: 'open' | 'closed' | 'all';
  limit?: number;
}

interface GhPullRequest {
  number: number;
  title: string;
  html_url: string;
  draft: boolean;
  updated_at: string;
  user: { login: string } | null;
}

export function activate(context: vscode.ExtensionContext): void {
  const panel = new WidgetPanelManager(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('ai-ui.openPanel', () => {
      panel.render({ kind: 'pr-list', repo: '', state: 'open', prs: [] });
    }),
  );

  const tool: vscode.LanguageModelTool<ShowPrListInput> = {
    async invoke(options, token) {
      const input = options.input ?? {};
      const repo = (input.repo ?? '').trim() || (await detectWorkspaceRepo());
      if (!repo) {
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            'No repository specified and no GitHub remote was detected in the active workspace. Ask the user for an owner/name.',
          ),
        ]);
      }
      const state = input.state ?? 'open';
      const limit = clamp(input.limit ?? 20, 1, 50);

      const prs = await fetchPullRequests(repo, state, limit, token);
      const payload: PrListPayload = {
        kind: 'pr-list',
        repo,
        state,
        prs: prs.map((p) => ({
          number: p.number,
          title: p.title,
          author: p.user?.login ?? 'unknown',
          updatedAt: p.updated_at,
          url: p.html_url,
          draft: p.draft,
        })),
      };
      panel.render(payload);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(
          `Rendered ${payload.prs.length} ${state} PR${payload.prs.length === 1 ? '' : 's'} for ${repo} in the ai-ui panel.`,
        ),
      ]);
    },
    async prepareInvocation(options) {
      const repo = options.input?.repo?.trim();
      return {
        invocationMessage: repo ? `Loading PRs for ${repo}…` : 'Loading PRs for the current repository…',
      };
    },
  };

  context.subscriptions.push(vscode.lm.registerTool('ai-ui_show_pr_list', tool));
}

export function deactivate(): void {
  // no-op
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

async function fetchPullRequests(
  repo: string,
  state: string,
  limit: number,
  token: vscode.CancellationToken,
): Promise<GhPullRequest[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'ai-ui-vscode-extension',
  };
  const auth = await getGitHubToken();
  if (auth) headers.Authorization = `Bearer ${auth}`;

  const url = `https://api.github.com/repos/${encodeURIComponent(repo.split('/')[0])}/${encodeURIComponent(
    repo.split('/')[1] ?? '',
  )}/pulls?state=${encodeURIComponent(state)}&per_page=${limit}&sort=updated&direction=desc`;

  const controller = new AbortController();
  const cancelSub = token.onCancellationRequested(() => controller.abort());
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    }
    return (await res.json()) as GhPullRequest[];
  } finally {
    cancelSub.dispose();
  }
}

async function getGitHubToken(): Promise<string | undefined> {
  try {
    const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: false });
    return session?.accessToken;
  } catch {
    return undefined;
  }
}

async function detectWorkspaceRepo(): Promise<string | undefined> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return undefined;
  const configPath = vscode.Uri.joinPath(folder.uri, '.git', 'config');
  try {
    const bytes = await vscode.workspace.fs.readFile(configPath);
    const text = Buffer.from(bytes).toString('utf8');
    // Look for the first github.com remote URL (https or ssh form).
    const m =
      text.match(/url\s*=\s*https:\/\/github\.com\/([^/\s]+)\/([^/\s.]+?)(?:\.git)?\s*$/m) ||
      text.match(/url\s*=\s*git@github\.com:([^/\s]+)\/([^/\s.]+?)(?:\.git)?\s*$/m);
    if (m) return `${m[1]}/${m[2]}`;
  } catch {
    // .git/config missing or unreadable
  }
  return undefined;
}
