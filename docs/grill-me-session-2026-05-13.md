# grill-me Session — ai-ui Product Owner

- **Date:** 2026-05-13
- **Subject of the grill:** The vision and plan in [`README.md`](../README.md)
- **Skill applied:** [`skills/productivity/grill-me/SKILL.md`](../skills/productivity/grill-me/SKILL.md)
- **Format:** Background agent acted as the relentless interviewer; the product owner answered. Walked the decision tree from root → leaves, resolving each dependency before opening the next branch. Capped at 10 questions per the request.

This document captures every question, the agent's recommended answer, the product owner's response, and the reasoning behind the decision.

---

## Decision-tree map (what got resolved)

```
Root: "AI composes the UI" — execution model (Q1)
 └─ Primitive set & admission criteria (Q2)
     └─ Primitive contract format (Q3)
         └─ Frontend ↔ agent transport & session model (Q4)
             └─ How LLM is steered to emit valid calls (Q5)
                 └─ Data-source integration shape (Q6)
                     └─ Auth & identity envelope (Q7)
                         └─ Evaluation & telemetry harness (Q8)
                             └─ Canvas/workspace state model (Q9)
                                 └─ v1 milestone & kill/keep rule (Q10)
```

---

## Q1 — Execution model for "AI composes the UI"

**Question.** Does the agent (a) generate code (e.g., React/JSX or a DSL) that gets rendered, (b) select and configure widgets from a fixed registry of pre-built primitives via structured tool calls, or (c) hybrid — registry first with code-gen fallback for novel cases?

**Agent's recommended answer.** (b) — fixed registry of widget primitives instantiated and wired via structured tool/function calls (typed JSON schemas), with an explicit upgrade path to (c) later.

**Product Owner's answer.** ✅ **Adopt (b) for v1, with (c) as an explicit, telemetry-gated future option.**

**Reasoning.**
- The README's stated constraints — "simple," "reliable," runnable on a "relatively low-cost model," and "understandable enough for real work" — all point at a constrained tool surface, not free-form code-gen.
- Code-gen is hard to sandbox, validate, and evaluate; a registry gives us a finite surface to test against and a stable contract for downstream tooling (eval, audit, undo).
- We'll let the registry's *insufficiency telemetry* (how often the agent has no good primitive for a request) decide when to open the door to (c). Starting constrained and relaxing later is far cheaper than the reverse.

---

## Q2 — Initial primitive set and admission criteria

**Question.** What is the v1 widget primitive set, and what gates a primitive into the registry?

**Agent's recommended answer.** Roughly six primitives — `List/Grid`, `DetailView`, `Form`, `Markdown/Text`, `Chart`, `ActionButton`. Admission criteria: covers ≥2 use cases, composable via uniform data-binding + event contract, single tool call with ≤~10 params, instrumentable, ships with a golden eval.

**Product Owner's answer.** ✅ **Accept the proposed six and the criteria, plus one extra constraint: every primitive must declare the drill-down actions it can emit.**

**Reasoning.**
- Drill-down ("tell me more about invoice 123") is the README's *core* interaction pattern. If primitives don't declare their action surface, the agent has to guess what to wire next, which kills determinism and evaluability.
- Six is small enough to hand-curate goldens for; large enough to express the developer-workbench scenarios called out in the README (issues lists, PR detail, file viewer, action buttons, dashboards).
- Tightening admission *now* is cheap; loosening admission criteria later is easy. The reverse is painful.

---

## Q3 — Primitive contract format

**Question.** What schema/contract format do primitives use, including the drill-down actions from Q2?

**Agent's recommended answer.** Versioned JSON Schema per primitive with three sections — `props` (render-time data), `actions` (enum of emittable events with payload schemas), `meta` (id/title/source attribution). Validate every model output server-side; reject/repair on failure. One artifact powers both the LLM tool definition and the frontend renderer.

**Product Owner's answer.** ✅ **Adopt as proposed. Add a fourth section: `capabilities` for non-functional concerns (loading, error, empty, partial states) so the renderer behaves uniformly across primitives.**

**Reasoning.**
- Single-source-of-truth schemas eliminate the LLM-tool-def ↔ UI-component drift that destroys agentic systems within months.
- JSON Schema is the lingua franca of modern LLM tool calling — providers already support it natively (Q5).
- `capabilities` makes status states (loading/empty/error) part of the contract instead of per-component bespoke handling, which keeps the renderer a thin reconciler and makes telemetry uniform.
- Versioning is mandatory up-front because primitives *will* evolve and the registry needs stable identifiers for replay/eval.

---

## Q4 — Frontend ↔ agent transport and session model

**Question.** How does a user action travel from the UI to the LLM, and how do new primitives get streamed back into the canvas?

**Agent's recommended answer.** Stateful session over streaming transport (WebSocket or SSE+POST). Server holds session state by `sessionId`. Typed `UserEvent`s (`Prompt`, `Action`, `FormSubmit`) and `RenderEvent`s (`RenderRoot`, `AppendChild`, `ReplaceNode`, `PatchProps`, `SetStatus`, `Done`). Stable server-assigned `instanceId` per primitive. Tree of primitive instances reconciled incrementally.

**Product Owner's answer.** ✅ **Adopt the streaming session model.** Specifically: **SSE + POST for v1** (simpler infra, easier to deploy behind enterprise proxies); revisit WebSockets when bidirectional streaming is needed (likely for voice). **Persist session state server-side so it survives reconnects.**

**Reasoning.**
- SSE+POST satisfies every v1 need without the operational tax of WebSockets (sticky-session load balancers, idle-timeout handling, proxy quirks). Voice is explicitly a long-term goal in the README, so the upgrade is deferrable.
- Stable `instanceId`s are non-negotiable: drill-down semantics ("update *this* widget") would otherwise require full re-renders and break user trust.
- Persisting session state keeps the system usable on flaky networks (laptops, planes) — table stakes for a developer workbench.

---

## Q5 — Steering the LLM to emit valid primitive calls

**Question.** Native structured tool/function calling with hard server-side validation + repair loop, or freeform JSON in text + parser?

**Agent's recommended answer.** Native tool calling, one tool per primitive, schema = the versioned JSON Schema from Q3. On failure, return a structured `tool_error` (with JSON-Pointer paths) for up to N repair attempts, then fall back to a typed `Error`/`Text` primitive. Pin schemas by `schemaVersion`; expose only primitives relevant to the current session/route.

**Product Owner's answer.** ✅ **Adopt as proposed.** Cap repair attempts at **2**, and on final failure render a **visible `Error` primitive** to the user rather than silently retrying.

**Reasoning.**
- Provider-enforced JSON shape dramatically lowers malformed-output rates compared to freeform parsing — directly serves the "reliable enough for real work" research question in the README.
- A visible error beats a silent retry: it's a trust property. Users have to be able to see when the agent failed and why.
- Per-turn tool scoping controls prompt size and reduces hallucinated primitives — important for the "low-cost model" constraint.

---

## Q6 — Data-source integration shape

**Question.** Are external data sources (GitHub, ADO, SharePoint, Confluence) first-class built-ins, MCP servers, or a thin internal connector abstraction?

**Agent's recommended answer.** Treat every data source as an MCP server (or MCP-shaped adapter), discovered per-session, surfaced through the same JSON-Schema tool-calling contract from Q5. First-party MCP connectors for GitHub/ADO/SharePoint/Confluence; per-session capability negotiation; one registry, one validation/repair path for both UI and data tools.

**Product Owner's answer.** ✅ **Standardize on MCP.** Concession to reality: allow an **in-process MCP transport for hot paths** (avoid the network hop for chatty interactions) and **emit per-call timing telemetry from day one** so we can quantify any MCP overhead before it becomes a complaint.

**Reasoning.**
- MCP is becoming the common protocol for agent-tool interop; betting on it gives us an ecosystem and a clean BYO-connector story for enterprise customers.
- Reusing the Q5 tool-calling machinery means we don't ship a parallel "data source SDK" — fewer code paths, fewer security boundaries, simpler audit story.
- The latency concern is real but addressable: in-process transport for hot paths preserves the abstraction without paying the network tax.

---

## Q7 — Authentication & identity envelope

**Question.** How do we handle auth across the three layers — end-user → ai-ui app → downstream MCP connectors — including token storage, scope/consent, on-behalf-of delegation, and audit?

**Agent's recommended answer.** OIDC for user login + OAuth 2.0 Token Exchange (RFC 8693) "on-behalf-of" for downstream connector tokens scoped per session and per tool. Refresh tokens encrypted in a per-tenant secrets vault. Just-in-time incremental consent per connector. Correlation IDs (user → session → tool invocation → connector request) written to an immutable audit log. The agent runtime never sees raw tokens — a local broker injects credentials at the MCP transport layer.

**Product Owner's answer.** ✅ **Adopt in full.** Add: **scope grants are session-bounded** and re-prompted on elevation; **audit log is append-only and exportable** for compliance/SOC2.

**Reasoning.**
- Enterprise customers (the implied audience: GitHub/ADO/SharePoint/Confluence are enterprise systems) gate adoption on SSO, least-privilege, and auditability. Without these we can't ship to regulated tenants.
- Keeping raw tokens out of the LLM/agent process is critical defense against prompt injection — an agent that can't see tokens can't be coerced into exfiltrating them.
- Just-in-time consent is the most legible UX for trust: users see exactly what they're granting, when, to whom, and why.
- Correlation IDs become the spine the eval harness (Q8) and event-sourced canvas (Q9) build on — auth, observability, and quality share one trace.

---

## Q8 — Evaluation & telemetry harness

**Question.** How do we measure, regression-test, and improve the generative components — what gets logged, scored, and how do offline evals connect to production traces?

**Agent's recommended answer.** OpenTelemetry trace spine (every session = one trace, spans for prompt assembly / tool calls / MCP fetches / schema validation / repair / render). Structured event log (`tool.selected`, `schema.validation_failed`, `widget.rendered`, `user.feedback`). Versioned golden dataset replayed in CI. LLM-as-judge with a calibrated rubric for open-ended outputs. Online → offline loop: low-confidence / repair / negative-feedback traces auto-promoted (with consent + scrubbing) into a candidate eval pool. Experimentation behind config flags. Per-tool/per-widget SLOs.

**Product Owner's answer.** ✅ **Conceptually accept the full design, but scope down v1.** Ship **only OTel traces + golden replay + 3 SLOs** (tool-selection accuracy, schema-validity rate, p95 latency). **Defer LLM-as-judge** until we have ≥100 human-labeled examples to calibrate against. Defer the auto-promotion loop until v2.

**Reasoning.**
- Every prior answer becomes meaningless if the system silently regresses. An eval harness has to be wired from day one — non-negotiable.
- However, LLM-as-judge without a calibration set is a worst-of-both-worlds metric: confidently wrong, expensive to run, impossible to debug. Wait until we can calibrate.
- Three SLOs is enough to detect regressions; more would create alert fatigue at this stage.
- Reusing the Q7 correlation-ID across OTel attributes means audit and eval ride the same data — no parallel system to maintain.

---

## Q9 — Canvas/workspace state model

**Question.** How do we model and persist canvas state so agent actions are inspectable, reversible, and replayable across sessions and devices?

**Agent's recommended answer.** Event-sourced canvas: append-only log of typed `Intent → ToolCall → Effect` events, each with `(actor, agent_run_id, tool, input_hash, output_hash, parent_event_id, otel_trace_id)`. Materialize current state via a deterministic reducer; CRDT (Yjs/Automerge) for multi-user/multi-device convergence. Postgres + object storage. Every primitive bound to its producing event for provenance. Per-event undo via compensating events (never mutate history). Snapshots every N events. The event stream doubles as golden-replay dataset for Q8.

**Product Owner's answer.** ✅ **Adopt event sourcing + provenance binding + compensating-event undo.** **Defer the CRDT layer** — Yjs is overkill for v1's single-user scenarios. **But design the event schema to be CRDT-ready** (commutative event types, content-addressed payloads, no destructive mutation) so adding Yjs later is additive, not a rewrite.

**Reasoning.**
- Trust is the make-or-break property of an agentic UI. Users must see *why* a widget appeared and undo it without fear. Event sourcing gives us provenance, undo, and replay in one mechanism.
- Multi-device sync is a long-term goal, not a v1 user complaint. Pulling in CRDT now adds operational complexity (server-side awareness of doc state, garbage collection, snapshot strategy) that we don't need yet.
- Designing CRDT-ready upfront is nearly free (mostly schema discipline) and avoids a painful retrofit. Adopting CRDT *implementation* later is an additive change.
- Bonus: the event log is the same data the eval harness needs (Q8), so we get auditability and regression fixtures from one system.

---

## Q10 — Demoable v1 milestone, success criteria, and kill/keep rule (final question)

**Question.** What's the v1 vertical slice, what are the measurable success criteria, and what's the kill/keep decision rule?

**Agent's recommended answer.**
- **Use case:** "Research-and-draft" — user asks in chat, agent calls 2 tools (web_search + repo_file_read via MCP), streams a Markdown answer with inline citations, renders one interactive primitive (diff/preview card the user can accept/reject).
- **In-scope primitives:** chat stream, tool-call card, citation chip, diff/preview, confirmation, error/retry.
- **Out of scope:** CRDT sync, multi-agent, plugin marketplace, fine-grained RBAC, mobile.
- **Success criteria (4 weeks):** p95 TTFT < 1.5s; p95 end-to-end < 15s; ≥90% pass rate on 50-prompt golden eval; 5 internal dogfooders complete ≥3 real tasks/week × 2 weeks at CSAT ≥ 4/5; zero P0 trust incidents; cost ≤ $0.10/task at p50.
- **Kill/keep rule:** Keep and fund v2 only if (criterion 2 AND criterion 3) are met AND at least one of (1, 4, 5) is met. Otherwise kill or pivot.

**Product Owner's answer.** ✅ **Adopt with one substitution.** Replace the agent's "research-and-draft" slice with a **developer-workbench-native slice** that more directly exercises the README's stated first target use case:

> **v1 slice:** "Show me my open PRs in `owner/repo`, then drill into PR #N." This exercises:
> - chat → `List/Grid` primitive (PRs)
> - drill-down → `DetailView` primitive (PR detail)
> - `ActionButton` (e.g., "approve" / "request changes" — guarded by Q7 confirmation)
> - GitHub MCP connector (Q6)
> - SSE streaming + instanceId reconciliation (Q4)
> - Schema validation + repair (Q5)
> - OIDC + OBO to GitHub (Q7)
> - OTel + golden replay (Q8)
> - Event-sourced canvas with provenance + undo (Q9)

**Keep the agent's success criteria and kill/keep rule verbatim.**

**Reasoning.**
- The README explicitly names a developer workbench as the first target use case; the demo should *be* that, not a generic research assistant. A "wrong demo" risks misaligning the team and the eval set with the actual product direction.
- This slice exercises every architectural decision Q1–Q9 end-to-end on real enterprise data, surfacing integration gaps early.
- The agent's measurable criteria and kill rule are exactly right: they prevent the "almost-working forever" failure mode common in AI projects, and they convert the SLOs from Q8 into an actual gate rather than vanity metrics.
- Cost ceiling ($0.10/task at p50) plus the "low-cost model" hypothesis from the README form a single falsifiable claim — if we can't hit it, the central premise of the project is in doubt and a pivot is warranted, not more iteration.

---

## Session outcome

Ten dependency-ordered decisions are now resolved end-to-end, from execution model down to a falsifiable v1 milestone with an explicit kill/keep rule. Open work the team can now start on:

1. Author the six primitive JSON Schemas (Q2/Q3) and the renderer dispatch.
2. Stand up the SSE+POST session server with `instanceId` reconciliation (Q4).
3. Wire native tool-calling + schema-repair loop (Q5).
4. Ship the GitHub MCP connector (Q6) with OIDC+OBO + broker (Q7).
5. Bring up OTel traces + the 50-prompt golden replay + the 3 SLO dashboards (Q8).
6. Build the event-sourced canvas with provenance + compensating-event undo (Q9), schema CRDT-ready.
7. Drive the "PR list → PR detail → approve" slice to the four-week kill/keep gate (Q10).
