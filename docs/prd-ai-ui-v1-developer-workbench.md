# PRD — ai-ui v1 Developer Workbench

## Problem Statement

Developers currently work across disconnected systems (GitHub, work tracking, docs, chat, internal tools) and must manually pivot between fixed UIs that are not optimized for dynamic intent. The project needs a reliable way for users to ask in natural language for developer workflows (starting with open PR triage and drill-down), and have the interface assembled/adapted in real time without sacrificing trust, auditability, cost control, or operational safety.

## Solution

Deliver a constrained, enterprise-ready AI UI workbench that composes a small registry of typed widget primitives via structured tool calls. The v1 slice is developer-workbench-native: “show open PRs, drill into PR details, then perform guarded actions.” The system uses streaming session transport, deterministic context assembly, MCP-based connectors, OIDC/OBO identity brokering, event-sourced canvas state with provenance/undo, and staged rollout gates tied to concrete SLO, trust, and cost thresholds.

## User Stories

1. As a developer, I want to ask for my open pull requests in natural language, so that I can start work without manually navigating multiple screens.
2. As a developer, I want the app to render a PR list as a structured grid, so that I can quickly scan status, author, and recency.
3. As a developer, I want to drill into a selected PR from the list, so that I can inspect details without losing context.
4. As a developer, I want each widget to show source and freshness metadata, so that I can trust the information before acting.
5. As a developer, I want a trace link from a widget to its producing events, so that I can audit what happened.
6. As a developer, I want high-impact actions to require explicit confirmation, so that accidental writes are prevented.
7. As a developer, I want write scope to be requested only when needed, so that I can start with least privilege.
8. As a developer, I want re-auth prompts when elevated permissions are required, so that sensitive actions remain secure.
9. As a developer, I want clear error widgets when generation or validation fails, so that failures are visible and understandable.
10. As a developer, I want undo for agent-driven changes, so that I can safely recover from mistakes.
11. As a developer, I want the app to preserve my session state after reconnect, so that flaky networks do not reset my workflow.
12. As a developer, I want consistent loading/empty/error states across widgets, so that behavior feels predictable.
13. As a developer, I want fast first token response, so that the interface feels responsive.
14. As a developer, I want end-to-end task latency within acceptable bounds, so that the system is practical for daily work.
15. As a developer, I want the app to avoid unsupported actions when provenance is degraded, so that risky operations are automatically blocked.
16. As a tenant admin, I want append-only, exportable audit logs, so that compliance and forensics are possible.
17. As a tenant admin, I want session-bounded delegated scopes, so that permissions are contained.
18. As a tenant admin, I want data retention controls and delete/export flows, so that policy obligations are met.
19. As a security reviewer, I want model/tool/policy changes to be governed and canaried, so that risky behavior changes are controlled.
20. As a product manager, I want rollout stages with objective promotion gates, so that adoption can scale safely.
21. As a product manager, I want explicit kill/keep/pivot rules, so that investment decisions remain evidence-based.
22. As a support engineer, I want ownership boundaries by runtime, identity, and connector layer, so that incidents are triaged quickly.
23. As an on-call engineer, I want fast rollback by config pin, so that regressions can be contained within minutes.
24. As an operations lead, I want incident playbooks with severity triggers and communication timelines, so that responses are consistent.
25. As a design partner, I want a pilot readiness dossier with SLO and drill evidence, so that I can trust controlled production use.
26. As a finance stakeholder, I want per-task cost visibility and pricing falsification thresholds, so that unit economics are defensible.
27. As a growth lead, I want adoption-risk triggers (latency, trust, permission friction), so that mitigation can happen before churn.
28. As a user, I want onboarding with a starter prompt and undo tutorial, so that I can reach first value quickly and safely.
29. As a platform architect, I want contract versioning with N/N-1 support, so that schema evolution does not break active tenants or replay.
30. As a future collaborator, I want CRDT-ready event schema design even before multi-user sync is shipped, so that collaboration can be added without rewrite.

## Implementation Decisions

- Use a fixed registry-first primitive execution model for v1; defer free-form code generation unless insufficiency telemetry justifies expansion.
- Keep the v1 primitive surface intentionally small: List/Grid, DetailView, Form, Markdown/Text, Chart, ActionButton, plus explicit error/status handling.
- Define one versioned schema artifact per primitive with sections for props, actions, meta, and capabilities; use it as the source for both tool contracts and rendering.
- Stream interactions using SSE + POST with server-side session state and stable primitive instance IDs.
- Represent user input as typed events and UI updates as typed render events to support incremental reconciliation.
- Use native structured tool/function calling and server-side schema validation with at most two repair attempts, then render visible error state.
- Integrate external systems via MCP connectors (with optional in-process transport for hot paths) under a single contract and telemetry model.
- Use OIDC for user auth and OBO delegation via a credential broker that keeps raw tokens out of the model runtime.
- Enforce centralized action policy classes: read (auto), write-low-risk (confirm), write-high-risk (typed confirm, cooldown, and conditional re-auth).
- Use deterministic context assembly with fixed slot ordering, explicit token caps, overflow policy, and per-turn context manifest hashes.
- Apply tiered memory retention: session default, opt-in preference memory, and explicit prohibition on long-term storage of raw connector payloads/secrets.
- Model workspace state as append-only event sourcing with provenance linkage, compensating-event undo, deterministic materialization, and replay support.
- Gate rollout through stages with hard promotion thresholds for latency, schema validity, trust incidents, and cost.
- Treat prompts/models/tool allowlists/policy bundles as governed config artifacts with dual approval, canary, and rollback objectives.
- Support schema/contract evolution with semantic versions, runtime N and N-1 compatibility, version-pinned replay, and controlled deprecation.
- Sequence delivery across four phases: foundations, read path, guarded write path, then hardening/commercial readiness.
- Require mandatory pre-commit spikes for latency, schema reliability, and identity adversarial tests.
- Adopt resilience defaults: bounded retries, degraded-state signaling, connector circuit-breaking, stale-data visibility, and rollback to known-good snapshots.
- Establish support tiers and incident protocols with explicit triggers, containment actions, communication SLAs, and RCA expectations.
- Use a final confidence gate with clear Scale/Hold/Pivot/Stop decision criteria and cross-functional sign-off.

## Testing Decisions

- Good tests validate externally observable behavior and contractual outcomes, not internal implementation details.
- Primary quality bars are deterministic replay outcomes, schema conformance, action-policy enforcement, provenance visibility, and user-perceived latency.
- Modules prioritized for testing:
  - Primitive contract validation and renderer compatibility behavior.
  - Session transport/event reconciliation behavior (including reconnect behavior).
  - Action policy enforcement and approval flows.
  - Identity broker behavior for delegated scopes and elevation/re-auth paths.
  - Deterministic context assembly and overflow/drop policy behavior.
  - Event reducer determinism, undo compensation behavior, and snapshot recovery.
  - Connector resilience behavior (timeouts, circuit-breakers, stale-data marking).
  - Rollout gate evaluation logic and confidence gate transition logic.
- Prior art in this repository is documentation-defined acceptance criteria and golden-style replay expectations from the grill-me decision log; v1 test plan should anchor to those criteria as executable acceptance tests.
- Include adversarial identity tests that must prove no unauthorized writes for token replay, expired session, cross-tenant access attempts, and scope-escalation attempts.
- Include operational-readiness drills (incident/tabletop and rollback simulation) as release-gating validation, not optional post-release checks.

## Out of Scope

- Free-form UI code generation as a default execution path.
- Multi-user live collaboration and full CRDT runtime for v1.
- Plugin marketplace and broad third-party extension ecosystem.
- Mobile-specific experience and native voice-first interaction.
- Unbounded connector landscape beyond prioritized developer-workbench sources.
- Advanced LLM-as-judge scoring and automated trace-to-eval promotion loops until calibrated datasets exist.
- Fine-grained enterprise RBAC expansion beyond session-bounded scope controls required for v1.

## Further Notes

- This PRD synthesizes resolved decisions from the existing product interrogation and is designed to be directly actionable for implementation planning.
- Shared understanding has been reached for v1 scope, architecture constraints, and confidence gates; confidence remains conditional on passing mandatory spikes and compliance/incident readiness gates.
- The intended first proof slice remains: PR list → PR detail → guarded action, with strict trust and rollback guarantees.
