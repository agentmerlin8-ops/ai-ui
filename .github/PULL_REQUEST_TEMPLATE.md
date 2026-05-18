## Summary

Describe what changed and why.

## Scope

- [ ] Docs only
- [ ] Extension code (`extension/src`, `extension/media`, `extension/package.json`)
- [ ] Build/tooling/config

## Validation

- [ ] `npm run compile` succeeds in `extension/`
- [ ] I tested the changed behavior in an Extension Development Host (F5)
- [ ] I updated docs for behavior/constraints changes

## AI Extensibility Checklist

For any PR that adds or changes AI behavior, complete all applicable items.

### Surface selection

- [ ] Chosen surface is correct (Language Model Tool vs Chat Participant vs MCP vs direct Language Model API)
- [ ] If MCP was chosen, there is a clear cross-client requirement documented

### Tool quality (if tool changes)

- [ ] Tool name follows `verb_noun` intent naming
- [ ] `modelDescription` includes: use cases, non-use cases, and limitations
- [ ] `inputSchema` is strict and constrained (no broad free-form fields unless justified)
- [ ] `canBeReferencedInPrompt` / `toolReferenceName` are set when user invocation via `#` is intended
- [ ] `when` clause is set for context-limited tools

### Invocation behavior

- [ ] Inputs are validated and normalized before API calls
- [ ] Cancellation is honored via `CancellationToken`
- [ ] Errors are actionable for model orchestration (what failed + safe next step)
- [ ] Confirmation behavior is appropriate (`prepareInvocation` for context, explicit confirmation for mutating/costly actions)

### Security

- [ ] No arbitrary URL fetching from free-form model/user input
- [ ] No arbitrary command execution paths from model output
- [ ] Any command routing is allowlisted
- [ ] Rendering paths preserve trust boundaries (webview CSP, escaped untrusted data)
- [ ] Auth uses VS Code session APIs; no token/PAT storage in repo

## Notes for Reviewers

- Relevant architecture guidance: [docs/ai-extensibility-standards.md](../docs/ai-extensibility-standards.md)
- Additional context (optional):
