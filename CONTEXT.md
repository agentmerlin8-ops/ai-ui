# ai-ui Developer Workbench Context

> **⚠️ Pre-pivot document.** This file captures the vocabulary used during
> the original Hermes/browser-canvas research slice (April–May 2026). After
> the May 2026 pivot, `ai-ui` is a **VS Code extension** that exposes
> language-model tools to Copilot Chat (no Hermes, no browser canvas, no
> `AI_UI_WIDGET` envelope). See [docs/vision.md](docs/vision.md),
> [docs/architecture.md](docs/architecture.md), and
> [docs/scope.md](docs/scope.md) for the current direction.
>
> The terms below are kept for historical context. Words like
> "AI_UI_WIDGET Envelope", "Hermes Widget Contract Skill", "Frontend
> Widget Parsing" and "AI_UI_FALLBACK_PR_LIST Format" are **superseded**:
> rendering now happens directly inside the extension via
> `vscode.lm.registerTool` handlers + a webview panel, with no envelope
> parsing at any layer.

---

This context defines the domain language for the ai-ui developer workbench research slice. It is used to keep planning and implementation discussions precise.

## Language

**Canvas Mode**:
The primary workspace mode that renders structured widget primitives as the main interaction surface.
_Avoid_: chat surface, transcript view

**Chat Mode**:
The conversational mode focused on message transcript interaction rather than widget composition.
_Avoid_: canvas, board

**Widget Primitive**:
A typed UI building block produced by the system for display in Canvas Mode.
_Avoid_: free-form component, arbitrary generated UI

**Hybrid Widget Payload**:
A Canvas Mode payload strategy that prefers strict structured widget JSON and falls back to minimal text conventions when structured data is unavailable.
_Avoid_: text-only rendering, schema-free payloads

**Frontend Widget Parsing**:
An implementation approach where Canvas payload extraction and fallback parsing run in the browser UI layer before rendering.
_Avoid_: backend-first normalization for initial POC

**AI_UI_WIDGET Envelope**:
The canonical fenced-JSON payload contract used by Hermes to emit a `PRListWidget` with versioned metadata and item rows.
_Avoid_: unmarked JSON, ad-hoc prose-only payloads

**AI_UI_FALLBACK_PR_LIST Format**:
The strict markdown fallback format headed by `AI_UI_FALLBACK_PR_LIST` with one pipe-delimited PR row per line: `number | title | author | updatedAt | url`.
_Avoid_: free-form fallback prose, inferred field extraction

**Hermes Widget Contract Skill**:
A dedicated Hermes skill that carries the Canvas payload output contract and response rules for widget-producing requests.
_Avoid_: per-session manual prompt setup, hidden UI-only prompt injection

**Explicit Skill Invocation**:
An activation mode where users intentionally trigger the widget contract behavior for a request instead of relying on always-on or implicit activation.
_Avoid_: silent auto-activation during early POC validation

**Widget-First Dual Output**:
A Canvas presentation mode that prioritizes widget rendering while retaining a collapsible raw assistant output view for trust and debugging.
_Avoid_: hidden model output, chat-first clutter in Canvas mode

**Parse Error Widget**:
A visible Canvas error state shown when both structured and fallback parsing fail, including raw output preview and a manual re-emit retry action.
_Avoid_: silent fallback, hidden parse failures

**Canvas Replace Mode**:
A Canvas state model where each successful widget-producing turn replaces the currently rendered widget set.
_Avoid_: append-by-default timeline behavior in early POC

**Canvas Drill-Down Action**:
An in-canvas interaction where selecting a PR triggers a follow-up Hermes request and replaces Canvas with a PR detail widget.
_Avoid_: link-only navigation as the primary interaction

**PR Reference Identity**:
The canonical PR identifier tuple `owner/repo + pr_number`, with URL retained as ancillary metadata for display and debugging.
_Avoid_: URL-only identity

**PR Detail Widget v0**:
A minimal structured detail widget carrying title, state, author, updated time, body, and URL without committing to a fully stable long-term detail schema.
_Avoid_: markdown-only detail, prematurely rigid v1 detail schema

**Explicit Detail Action**:
An interaction pattern where each PR row exposes a dedicated control to trigger Canvas drill-down instead of using whole-row click behavior.
_Avoid_: ambiguous row-click semantics

**Conversational Canvas Mode**:
A Canvas Mode variant where the existing Hermes composer remains active so widget interactions and freeform follow-ups stay in the same conversational session.
_Avoid_: isolated non-conversational canvas flows in the early POC

**Session-Scoped Canvas Mode**:
A mode model where Canvas vs Chat behavior belongs to an individual Hermes conversation rather than to the whole application shell.
_Avoid_: global cross-session mode switching

**Auto-Enter Canvas Mode**:
A session behavior where the first successfully parsed widget payload switches the session into Canvas Mode, while preserving a visible manual mode toggle afterward.
_Avoid_: manual-only entry during early POC demos

**Restorable Canvas State**:
A session behavior where leaving Canvas Mode does not discard the last rendered widget set, allowing the user to return to the same Canvas state later.
_Avoid_: destructive mode toggles

**Persistent Canvas State**:
A session behavior where Canvas mode and the last rendered widget set survive a browser refresh within the same session.
_Avoid_: refresh-destructive Canvas interactions

## Relationships

- **Canvas Mode** renders one or more **Widget Primitives**
- **Chat Mode** and **Canvas Mode** are distinct interaction modes in the same product surface
- **Hybrid Widget Payload** feeds **Widget Primitives** for **Canvas Mode** rendering
- **Frontend Widget Parsing** extracts **Hybrid Widget Payload** data for **Canvas Mode**
- **AI_UI_WIDGET Envelope** is the preferred structured branch of the **Hybrid Widget Payload** strategy
- **AI_UI_FALLBACK_PR_LIST Format** is the deterministic fallback branch of the **Hybrid Widget Payload** strategy
- **Hermes Widget Contract Skill** governs how Hermes emits both structured and fallback widget payloads
- **Explicit Skill Invocation** controls when the **Hermes Widget Contract Skill** is applied during the POC
- **Widget-First Dual Output** combines Canvas widget UX with optional raw output inspection
- **Parse Error Widget** preserves trust by making payload failures explicit in Canvas Mode
- **Canvas Replace Mode** keeps phase-1 Canvas state deterministic per successful turn
- **Canvas Drill-Down Action** extends the loop from list widgets into detail widgets within Canvas Mode
- **PR Reference Identity** provides stable identifiers for **Canvas Drill-Down Action** requests
- **PR Detail Widget v0** is the initial structured target produced by **Canvas Drill-Down Action**
- **Explicit Detail Action** is the primary trigger for list-to-detail transitions in Canvas Mode
- **Conversational Canvas Mode** keeps Canvas interactions inside the existing Hermes conversation loop
- **Session-Scoped Canvas Mode** keeps presentation state attached to the active conversation
- **Auto-Enter Canvas Mode** provides the default first-entry path for widget-producing sessions
- **Restorable Canvas State** preserves the current widget set across Canvas/Chat mode switches
- **Persistent Canvas State** keeps Canvas mode and widget state stable across page refresh

## Example dialogue

> **Dev:** "Should this result appear in chat or in the workspace?"
> **Domain expert:** "If it is structured output for task interaction, it belongs in **Canvas Mode** as a **Widget Primitive**."

## Flagged ambiguities

- "canvas area" and "chat area" were used interchangeably at first; resolved as separate modes: **Canvas Mode** vs **Chat Mode**.
- "how widgets are delivered" was undecided; resolved as **Hybrid Widget Payload** for the POC.
- "where parsing happens" was undecided; resolved as **Frontend Widget Parsing** for phase 1.
- "what the structured payload looks like" was undecided; resolved as the **AI_UI_WIDGET Envelope** with `PRListWidget` v1 fields.
- "what fallback looks like" was undecided; resolved as **AI_UI_FALLBACK_PR_LIST Format**.
- "where prompt contract lives" was undecided; resolved as **Hermes Widget Contract Skill**.
- "how contract behavior is triggered" was undecided; resolved as **Explicit Skill Invocation** for early demos.
- "whether to keep assistant prose visible" was undecided; resolved as **Widget-First Dual Output**.
- "what happens on parse failure" was undecided; resolved as **Parse Error Widget** with manual retry.
- "how Canvas state evolves across turns" was undecided; resolved as **Canvas Replace Mode** for phase 1.
- "what clicking a PR does" was undecided; resolved as **Canvas Drill-Down Action**.
- "which PR identifier is canonical" was undecided; resolved as **PR Reference Identity** (`owner/repo + pr_number` plus URL metadata).
- "how structured PR detail should be in phase 1" was undecided; resolved as **PR Detail Widget v0**.
- "how users trigger drill-down from a PR row" was undecided; resolved as **Explicit Detail Action**.
- "whether Canvas hides the composer" was undecided; resolved as **Conversational Canvas Mode**.
- "whether Canvas Mode is global or per conversation" was undecided; resolved as **Session-Scoped Canvas Mode**.
- "how a session first enters Canvas Mode" was undecided; resolved as **Auto-Enter Canvas Mode** with a visible manual toggle.
- "what happens to widgets when leaving Canvas Mode" was undecided; resolved as **Restorable Canvas State**.
- "whether Canvas survives browser refresh" was undecided; resolved as **Persistent Canvas State**.
