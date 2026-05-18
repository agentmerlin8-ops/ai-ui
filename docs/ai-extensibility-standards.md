# AI Extensibility Standards

This document distills the VS Code AI extensibility guidance into explicit
implementation rules for this repository.

## 1) Architecture defaults

1. Build new agent capabilities as `languageModelTools` first.
2. Add an MCP server only if we need the same tools outside VS Code.
3. Add a chat participant only when we need full control over the conversation
   flow (not just data/tool capabilities).
4. Use direct Language Model API calls only for non-chat/editor features
   (commands, code actions, hovers, custom views).

## 2) Tool contribution contract

Every new tool contribution in `extension/package.json` must include:

1. `name` in `verb_noun` format, intent-based (for example, `show_pull_requests`).
2. `modelDescription` with:
   - what the tool does
   - when to use it
   - when not to use it
   - important limitations
3. `inputSchema` with strict, typed fields and constraints.
4. `canBeReferencedInPrompt: true` and a stable `toolReferenceName` when
   end-users should be able to call it via `#`.
5. `when` clause for context-scoped tools (debug-only, repo-only, etc.).

## 3) Tool implementation contract

Every tool implementation must:

1. Validate and normalize inputs before network/API calls.
2. Honor `CancellationToken` in all long-running operations.
3. Return concise tool results suitable for model orchestration.
4. Throw actionable errors for the model (what failed + safe next step).
5. Keep handler logic thin and delegate to modules:
   - auth/session
   - source adapters
   - normalization/mapping
   - render bridge
   - error mapping

## 4) Confirmation and mutation safety

1. Implement `prepareInvocation` for user-visible confirmation context.
2. For read tools: short, clear confirmation text.
3. For write/destructive/costly tools: explicit confirmation required.
4. Any mutation path must present preview/context before execution when possible.

## 5) Security requirements

1. No arbitrary URL fetch tools from free-form user input.
2. No arbitrary command execution from model output.
3. Command invocations from rendered/chat content must use an allowlist.
4. Webview CSP remains strict (`default-src 'none'`, nonce for scripts).
5. Escape/untrusted data before rendering into HTML/Markdown.
6. Prefer `vscode.authentication.getSession(...)`; do not store PATs/tokens.

## 6) Chat participant policy (future)

If we add a participant:

1. Keep one participant maximum for this extension.
2. Add focused slash commands only for high-frequency workflows.
3. Add disambiguation examples to reduce routing conflicts.
4. Stream progress/results for long operations.
5. Add telemetry for request count and unhelpful feedback rate.

## 7) Language Model API policy (future)

If direct LM calls are added:

1. In participant flows, prefer `request.model` to honor user model choice.
2. For direct selection (`vscode.lm.selectChatModels`), handle:
   - no model available
   - user consent/auth denial
   - rate/quota limits
3. Build prompts with User/Assistant messages; keep prompts modular/testable.
4. Handle streaming failures mid-response.
5. Do not use production LM calls in integration tests.

## 8) Engineering checklist for PRs

A PR that adds or changes AI behavior should confirm:

1. Correct extensibility surface chosen (tool vs MCP vs participant vs LM API).
2. Tool metadata quality (`modelDescription`, schema, naming, limitations).
3. Cancellation, error mapping, and confirmation behavior implemented.
4. Security constraints preserved (no arbitrary URL/command execution).
5. Documentation updated when behavior/constraints changed.
