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

---

## Q11 — Trust UX contract for agent actions

**Question.** What minimum trust UX must every rendered primitive/action expose so users can verify what happened before they rely on it?

**Agent's recommended answer.** Require a visible provenance panel on every non-trivial primitive: source tools used, freshness timestamp, confidence band, and a one-click event-log trace link; block "high-impact" actions unless provenance is complete.

**Product Owner's answer.** ✅ **Adopt with hard acceptance targets:**
- **100%** of `List/Grid`, `DetailView`, `Form`, and `ActionButton` instances show source + freshness.
- **100%** of tool-backed outputs expose trace link (`otel_trace_id` + producing event id).
- If provenance is missing, render `SetStatus=degraded` and disable guarded actions.

**Reasoning.**
- Q9 already gives event-level provenance; Q11 makes it user-visible, which is the trust bridge.
- Falsifiable coverage targets prevent "optional" trust UX drift.
- Degraded-state behavior aligns with Q3 `capabilities` and avoids silent risk.

---

## Q12 — Approval and guardrail policy for actions

**Question.** Which actions require explicit user approval, and what policy engine enforces it in v1?

**Agent's recommended answer.** Define three action classes: `read` (auto), `write-low-risk` (inline confirm), `write-high-risk` (step-up confirmation + reason + cooldown). Enforce centrally before MCP execution.

**Product Owner's answer.** ✅ **Adopt with v1 policy matrix:**
- `read`: no approval.
- `write-low-risk` (comment, label, draft update): single confirm modal.
- `write-high-risk` (approve/request-changes/merge/close/reopen): typed confirmation + 5-second delay + re-auth if session age >30 min.
- **SLO:** 0 unapproved write executions; any violation is P0.

**Reasoning.**
- Dependency from Q7 identity + Q11 trust display to actual action safety.
- Central policy check keeps enforcement consistent across primitives/connectors.
- Typed confirmation is measurable and auditable in Q9 event stream.

---

## Q13 — Prompt/context assembly contract

**Question.** How is model context assembled so outputs stay accurate, bounded-cost, and deterministic enough for replay?

**Agent's recommended answer.** Use a deterministic context builder with ordered slots: system policy, session summary, active canvas nodes, selected entity payloads, recent tool results, then user turn; strict token budgets per slot with drop policy.

**Product Owner's answer.** ✅ **Adopt with concrete budgets (v1):**
- Total prompt budget: **8k tokens**.
- Slot caps: policy 600, summary 900, canvas 1.5k, entity payloads 2k, recent tools 2k, user turn reserve 1k.
- Overflow rule: drop oldest tool results first, never drop policy.
- Log `context_manifest` hash per turn for replay parity.

**Reasoning.**
- Cost/latency constraints from Q10 require hard caps, not best-effort packing.
- Deterministic slot ordering improves golden replay stability (Q8).
- Manifest hashing makes regressions attributable to context changes vs model drift.

---

## Q14 — Memory policy (session vs long-term)

**Question.** What memory is retained beyond a session, and what is forbidden without explicit consent?

**Agent's recommended answer.** Default to ephemeral session memory; long-term memory is opt-in, scoped to workspace preferences and approved aliases, never raw connector payloads.

**Product Owner's answer.** ✅ **Adopt strict memory tiers:**
- **Tier 0 (default):** session-only, deleted after 30 days.
- **Tier 1 (opt-in):** user preferences (layout, favorite repos, prompt shortcuts), retained 180 days.
- **Prohibited:** storing raw issue/PR content, tokens, secrets, or private file blobs as long-term memory.
- Export/delete endpoint required before external pilot.

**Reasoning.**
- Aligns with Q7 least-privilege and audit expectations.
- Prevents accidental data-hoarding risk while preserving useful personalization.
- Retention windows are clear and testable in governance reviews.

---

## Q15 — First-run onboarding for developer-workbench users

**Question.** What onboarding path gets a new user to first verified value fast, without over-granting permissions?

**Agent's recommended answer.** A guided 5-step flow: sign-in, choose repo, grant read scope, run "open PRs" starter prompt, then optional write-scope upgrade gated by example action.

**Product Owner's answer.** ✅ **Adopt with activation KPI:**
- Time-to-first-successful "PR list → PR detail" under **10 minutes** for **≥80%** of new dogfood users.
- Onboarding starts with read-only scopes; write scopes requested only at first write intent.
- Provide a prefilled starter prompt and one-click rollback tutorial (undo event).

**Reasoning.**
- Directly operationalizes Q10 slice and Q12 guardrails.
- Progressive consent reduces drop-off from early permission anxiety.
- Undo tutorial teaches trust mechanics, not just happy-path usage.

---

## Q16 — Rollout strategy and release gates

**Question.** How do we roll out v1 safely across cohorts while preserving statistically meaningful validation?

**Agent's recommended answer.** Feature-flagged progressive rollout: internal team → extended dogfood → design partners; gate expansion on SLO pass + trust incident rate + cost band.

**Product Owner's answer.** ✅ **Adopt staged rollout plan:**
- Stage A: 10 internal users (1 week).
- Stage B: 50 dogfood users across 3 orgs (2 weeks).
- Stage C: 3 design-partner tenants (4 weeks).
- Promotion requires for prior 7 days: p95 E2E <15s, schema validity ≥97%, cost p50 ≤$0.10/task, 0 P0 trust incidents.

**Reasoning.**
- Converts Q8/Q10 metrics into release control, not dashboard theater.
- Cohort sizing balances safety with enough volume for signal.
- Tenant staging supports enterprise rollout realities from Q7.

---

## Q17 — Governance for prompts, models, and policies

**Question.** What change-control process governs system prompts, model versions, and guardrail policies?

**Agent's recommended answer.** Treat prompt/model/policy as versioned config artifacts with mandatory review, canary, and rollback; all runtime decisions reference immutable config IDs.

**Product Owner's answer.** ✅ **Adopt governance baseline:**
- Any change to system prompt, model, tool allowlist, or approval policy requires PR + owner approval from Product and Security.
- Auto-canary to 5% of Stage cohort for 24h before full rollout.
- Rollback objective: revert within **15 minutes** via config pin.
- Every session logs `config_bundle_id`.

**Reasoning.**
- Agent behavior changes often come from config, not code; governance must cover both.
- Dual approval aligns with trust/compliance expectations.
- Fast rollback protects users during model/provider regressions.

---

## Q18 — Pricing model hypothesis for v1

**Question.** What monetization hypothesis do we test first, and what falsifies it?

**Agent's recommended answer.** Seat-based base price plus usage overage is simplest for enterprise procurement while preserving unit-economics control.

**Product Owner's answer.** ✅ **Adopt pricing experiment:**
- Hypothesis: **$30/dev/month** includes **300 assisted tasks**, then **$0.08/task** overage.
- Gross margin target at pilot scale: **≥60%**.
- Falsification: if median active user exceeds 300 tasks with overage rejection >25% or margin <60% for 2 consecutive months, rework model.

**Reasoning.**
- Aligns to Q10 cost ceiling and enterprise budgeting patterns.
- Included-task bundle encourages adoption while bounding runaway cost.
- Clear falsifiers prevent pricing-by-opinion.

---

## Q19 — GTM validation plan

**Question.** Which customer segment and use cases do we validate first, and what evidence counts as PMF signal?

**Agent's recommended answer.** Target platform/dev productivity teams in GitHub-heavy orgs; validate 3 repeat workflows (PR triage, review assist, status synthesis) with measured weekly retention.

**Product Owner's answer.** ✅ **Adopt with explicit evidence bar:**
- 8 design-partner teams, each with at least 10 weekly active engineers.
- PMF signal threshold (within 8 weeks):
  - ≥40% weekly active repeat users,
  - median self-reported time saved ≥30 min/week,
  - NPS among active users ≥20,
  - at least 3 teams request expansion to additional repos/users.

**Reasoning.**
- Keeps scope aligned to developer-workbench-first positioning.
- Combines behavior (retention), value (time saved), and buying intent (expansion asks).
- Thresholds are concrete enough to drive go/no-go.

---

## Q20 — Deprecation and migration strategy

**Question.** How do we deprecate primitive schemas, connector contracts, or models without breaking replay, audit, or active tenants?

**Agent's recommended answer.** Semantic version every contract; support N and N-1 at runtime; provide migration adapters and replay-compat mode until cutoff date.

**Product Owner's answer.** ✅ **Adopt with hard policy:**
- Runtime must support primitive/connector schema **N and N-1** for minimum **90 days**.
- Event log always stores original schema/version; replays use version-pinned reducers.
- Deprecation requires: tenant notice, migration report, and zero unresolved blocker bugs for 14 days before cutoff.
- Emergency security deprecations allowed with Security sign-off and incident notice.

**Reasoning.**
- Preserves Q9 replay/audit guarantees while enabling iteration.
- Advance notice + migration reporting reduces enterprise adoption risk.
- Security escape hatch avoids policy deadlock during active threats.

---

## Session outcome addendum

Q11-Q20 resolve the next decision layer from trust UX through commercial/governance lifecycle. Newly unlocked next steps:

1. Implement provenance UI + degraded-state disabling and policy-gated action executor.
2. Build deterministic context assembler with token caps and manifest hashing.
3. Ship tiered memory controls, retention jobs, and user export/delete flows.
4. Launch guided onboarding + staged rollout flags tied to SLO promotion gates.
5. Add config-bundle governance/canary/rollback pipeline and schema deprecation playbook.
6. Run pricing + design-partner GTM experiments against the defined falsification thresholds.

---

## Q21 — Implementation sequencing and critical path

**Question.** What delivery sequence proves feasibility fastest while preserving architectural integrity (primitive registry, SSE+POST, MCP, OIDC+OBO, event sourcing)?

**Agent's recommended answer.** Execute four dependency-ordered tracks: (1) contract-first foundations, (2) end-to-end read path, (3) guarded write path, (4) hardening/commercial gates; run in two-week increments with explicit exit criteria.

**Product Owner's answer.** ✅ **Adopt with phased critical path:**
- **Phase 1 (2 weeks):** primitive schemas + renderer dispatch + SSE+POST session spine + event log append/replay.
- **Phase 2 (2 weeks):** GitHub MCP read flows + OIDC/OBO broker + PR list → detail slice.
- **Phase 3 (2 weeks):** guardrailed write actions + approvals + undo + provenance UX.
- **Phase 4 (2 weeks):** SLO gates, governance automation, pilot readiness package.

**Reasoning.**
- Orders work by irreducible dependencies from Q1–Q20.
- Produces usable value by week 4 while still exposing hardest integration seams.
- Prevents late discovery of trust/compliance blockers.

---

## Q22 — Technical spike plan for top unknowns

**Question.** Which spikes must complete before committing full build-out, and what pass/fail thresholds decide continuation?

**Agent's recommended answer.** Run three spikes in parallel: latency budget, schema-validity/repair effectiveness, and OBO token-broker correctness; each with hard numeric thresholds.

**Product Owner's answer.** ✅ **Adopt three mandatory spikes (1 week each, parallel):**
1. **Latency spike:** SSE TTFT + end-to-end with MCP read path; pass if p95 E2E <15s, TTFT <1.5s.
2. **Schema spike:** 50-turn golden run; pass if schema-validity ≥97% with max 2 repairs.
3. **Identity spike:** OIDC+OBO + session-bounded scopes + re-auth path; pass if 0 unauthorized writes across defined adversarial cases (token replay, expired session, cross-tenant access attempt, and scope-escalation attempt).

**Reasoning.**
- Directly tests Q10/Q16 gates before sunk-cost expansion.
- Concentrates effort on the highest technical and trust risks.
- Makes go/no-go evidence objective, not intuition-based.

---

## Q23 — Failure modes and resilience baseline

**Question.** What are the primary failure modes in v1, and what must the system do by default when they occur?

**Agent's recommended answer.** Define fail-safe behavior for model/tool/schema/auth/connector failures with degraded UI states, replay-safe events, and bounded retries.

**Product Owner's answer.** ✅ **Adopt resilience matrix:**
- Model/tool-call invalid → up to 2 repairs, then visible `Error` primitive.
- MCP timeout/failure → circuit-breaker per connector, cached last-good read (flagged stale), no hidden retries beyond policy.
- Auth expiry/elevation needed → block action, re-auth prompt, preserve pending intent in event log.
- Reducer/materialization failure → rollback to last snapshot + render degraded banner.

**Reasoning.**
- Keeps trust intact by failing visibly and safely.
- Preserves audit/replay guarantees from event sourcing.
- Avoids cascading outages from connector instability.

---

## Q24 — Human factors and operator ergonomics

**Question.** What human-process safeguards ensure users and internal operators can use the system correctly under normal and stressed conditions?

**Agent's recommended answer.** Add mandatory UX affordances (provenance, undo, confirmations) plus role-specific runbooks/training for support, security, and product ops.

**Product Owner's answer.** ✅ **Adopt with explicit readiness targets:**
- New-user completion of undo tutorial: ≥90%.
- Provenance comprehension check in onboarding: ≥85% correct.
- Internal ops certification (support + on-call + security triage): 100% before Stage C.
- Every high-risk action UI must show consequence text and cooldown timer.

**Reasoning.**
- Human misuse is a top failure mode in agentic products.
- Training and visible affordances reduce preventable incidents.
- Aligns trust UX (Q11/Q12) with real behavior, not just design intent.

---

## Q25 — Legal and compliance readiness gate

**Question.** What legal/compliance artifacts are required before external design-partner rollout?

**Agent's recommended answer.** Require DPIA/privacy review, data-flow inventory, retention/deletion evidence, audit-export validation, and contractual language for connector scopes/actions.

**Product Owner's answer.** ✅ **Adopt “no artifacts, no pilot” gate:**
- Completed DPIA + records of processing.
- Data classification and connector-by-connector scope matrix.
- Verified export/delete flows (Q14) with audit evidence.
- Updated DPA + security addendum covering OBO delegation and action approvals.
- SOC2 control mapping for append-only audit log and change governance.

**Reasoning.**
- Enterprise pilots fail fastest on legal gaps, not demos.
- Existing Q7/Q14/Q17 decisions already imply these obligations.
- Front-loading compliance avoids expensive rework mid-pilot.

---

## Q26 — Support model and ownership boundaries

**Question.** What support operating model handles v1 incidents and customer issues without ambiguity?

**Agent's recommended answer.** Establish tiered support with strict ownership map across app runtime, connector layer, identity broker, and model/provider issues.

**Product Owner's answer.** ✅ **Adopt v1 support model:**
- **L1:** user triage, known fixes, incident intake.
- **L2:** app/runtime + primitive/render issues.
- **L3:** identity/security + connector specialists + model escalation.
- Ownership matrix keyed by `config_bundle_id`, connector, and trace IDs.
- Target response: Sev1 in 15 min, Sev2 in 1 hour during support window.

**Reasoning.**
- Multi-layer architecture needs explicit ownership to avoid ticket ping-pong.
- Trace-linked ownership accelerates diagnosis.
- Response goals align with enterprise expectations for pilot trust.

---

## Q27 — Incident response and recovery playbook

**Question.** What incident protocol is mandatory for trust/safety, availability, and data-handling events?

**Agent's recommended answer.** Define severity rubric, containment actions, rollback paths, communication timelines, and postmortem requirements with tabletop validation.

**Product Owner's answer.** ✅ **Adopt incident playbook with hard controls:**
- P0 triggers: unapproved write, cross-tenant data exposure, audit-log integrity breach.
- Immediate containment: disable affected action class or connector via config pin within 15 min.
- Customer comms: initial notice <60 min for P0/P1.
- Postmortem: 5-business-day RCA with corrective actions tied to owners/dates.
- Quarterly tabletop exercises required before GA consideration.

**Reasoning.**
- Operationalizes Q12 and Q17 under real failure pressure.
- Fast config rollback is our primary safety lever.
- Tabletops test people/process, not just architecture.

---

## Q28 — Adoption risk register and mitigations

**Question.** Which adoption risks threaten PMF/GTM thresholds first, and what mitigations are committed now?

**Agent's recommended answer.** Track a quantified risk register spanning trust, latency, cost, workflow fit, and permission friction; attach leading indicators and mitigation triggers.

**Product Owner's answer.** ✅ **Adopt top-five adoption risks with triggers:**
1. **Permission anxiety** → high drop-off at write-scope prompt; mitigate with progressive consent + just-in-time rationale.
2. **Latency frustration** → if p95 >15s for 3 days, pause cohort expansion.
3. **Cost blowout** → if p50 cost >$0.10/task for 2 weeks, gate new tenants.
4. **Low repeat usage** → if WAU repeat <40%, run workflow-fit interviews within 7 days.
5. **Trust hesitation** → if provenance click-through <30%, improve explainability UX before scale.

**Reasoning.**
- Directly links to Q10/Q18/Q19 thresholds.
- Converts risks into measurable early-warning signals.
- Forces mitigation action before PMF evidence is distorted.

---

## Q29 — Feasibility proof package for design partners

**Question.** What evidence bundle must be shown to design partners to credibly prove readiness for controlled production use?

**Agent's recommended answer.** Deliver a standardized proof package: architecture controls, benchmark results, failure drill outcomes, compliance artifacts, and support commitments.

**Product Owner's answer.** ✅ **Adopt “Pilot Readiness Dossier” requirement:**
- End-to-end demo of PR list → detail → guarded action with provenance + undo.
- Last-30-day SLO report (latency, schema validity, trust incidents).
- Spike outcomes from Q22 and failure drill results from Q27.
- Compliance packet from Q25.
- Named support contacts, escalation paths, and response targets.

**Reasoning.**
- Buyers need verifiable proof, not roadmap promises.
- Aligns technical readiness with procurement/security review workflows.
- Standard dossier shortens pilot-cycle friction across tenants.

---

## Q30 — Final confidence gate and decision authority

**Question.** What final gate decides whether to continue scaling, hold, or pivot after this tranche?

**Agent's recommended answer.** Use a weighted confidence gate combining technical, trust, compliance, and adoption metrics with explicit decision ownership.

**Product Owner's answer.** ✅ **Adopt final confidence gate:**
- **Scale** only if all are true for previous 14 days:
  - SLO gates pass (Q16),
  - 0 P0 trust incidents,
  - legal/compliance artifacts complete (Q25),
  - PMF lead indicators on-track (Q19/Q28),
  - unit economics on-plan (Q18).
- **Hold** if exactly one domain misses target with credible corrective plan ≤2 weeks.
- **Pivot/stop immediately** on any trust/compliance critical failure (for example unapproved write or cross-tenant exposure), regardless of other domains.
- **Pivot/stop** if ≥2 non-trust/compliance domains miss targets.
- Decision forum: Product + Engineering + Security + GTM sign-off.

**Reasoning.**
- Prevents “ship by optimism.”
- Preserves the existing kill/keep discipline from Q10.
- Ensures cross-functional accountability for scale decisions.

---

## Session outcome addendum

**Shared understanding status:** **Achieved** for execution feasibility and operational readiness through a concrete Q21–Q30 dependency chain.

## Confidence statement

**Confidence: High (conditional).** Confidence is high **if** Q22 spikes pass and Q25/Q27 readiness gates are fully met before expanding beyond controlled pilots.

## Next steps

1. Run Q22 spikes in parallel; publish pass/fail report within 7 days.  
2. Execute Phase 1–2 critical path (Q21) to deliver read-path slice by week 4.  
3. Implement resilience matrix + degraded-state UX (Q23) before guarded writes.  
4. Complete legal/compliance artifact pack (Q25) before Stage C onboarding.  
5. Stand up support ownership + incident playbook + tabletop (Q26–Q27).  
6. Activate risk register monitoring and trigger policies (Q28).  
7. Assemble Pilot Readiness Dossier and run Q30 confidence gate review.
