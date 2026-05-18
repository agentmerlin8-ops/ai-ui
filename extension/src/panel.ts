import * as vscode from 'vscode';

export type WidgetKind = 'pr-list';

export interface PrListPayload {
  kind: 'pr-list';
  repo: string;
  state: string;
  prs: Array<{
    number: number;
    title: string;
    author: string;
    updatedAt: string;
    url: string;
    draft: boolean;
  }>;
}

export type WidgetPayload = PrListPayload;

/**
 * Singleton manager for the ai-ui widget panel. Each tool invocation
 * either reveals the existing panel or creates one, then posts a
 * `render` message to the webview with the new payload.
 */
export class WidgetPanelManager {
  private panel: vscode.WebviewPanel | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {}

  render(payload: WidgetPayload): void {
    if (!this.panel) {
      this.panel = vscode.window.createWebviewPanel(
        'ai-ui.widgetPanel',
        'ai-ui',
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, 'media')],
        },
      );
      this.panel.onDidDispose(() => (this.panel = undefined));
      this.panel.webview.html = this.html(this.panel.webview);
      this.panel.webview.onDidReceiveMessage((msg) => this.onMessage(msg));
    } else {
      this.panel.reveal(vscode.ViewColumn.Beside, true);
    }
    this.panel.webview.postMessage({ type: 'render', payload });
  }

  private onMessage(msg: { type: string; [k: string]: unknown }): void {
    if (msg.type === 'openUrl' && typeof msg.url === 'string') {
      vscode.env.openExternal(vscode.Uri.parse(msg.url));
    }
  }

  private html(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'widget.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'widget.css'),
    );
    const nonce = randomNonce();
    const csp = [
      `default-src 'none'`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${webview.cspSource} https: data:`,
    ].join('; ');
    return /* html */ `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>ai-ui</title>
</head>
<body>
  <div id="root"><div class="empty">Waiting for widget…</div></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function randomNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
