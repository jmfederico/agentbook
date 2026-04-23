# OpenCode agent inventory and vendoring decisions

This document evaluates the built-in OpenCode agents against this repository's [agent and skill evaluation framework](./agent-skill-evaluation-framework.md), with a default bias toward vendoring useful upstream definitions locally.

## Built-in agent inventory

| Upstream agent | Mode | Upstream role | Fit for this repo | Vendoring decision |
| --- | --- | --- | --- | --- |
| `build` | primary | Full-access development agent | Conflicts with the coordinator-first operating model because it encourages direct implementation from the active primary session instead of coordinator-owned planning and worker dispatch. | Do not vendor |
| `plan` | primary | Analysis and planning without edits | Overlaps with `coordinator`, but lacks the agentbook-specific ownership boundary around plan registration, approval gates, task tracking, and dispatch. | Do not vendor |
| `general` | subagent | General-purpose execution/research helper with broad tool access | Overlaps heavily with `worker` and is less bounded than this repo's single-task executor contract. | Do not vendor |
| `explore` | subagent | Fast read-only codebase exploration | Useful as a distinct read-only investigation boundary for coordinator-led research, especially when understanding a codebase before planning or implementation. | Vendor locally as `agents/explore.md` |

## Selected vendored agent

### `explore`

- **Role:** read-only codebase exploration and fact gathering for a parent agent.
- **Status in this repo:** **optional helper**. The first-class workflow remains tracked `coordinator` + `worker`, but `explore` may also be invoked directly as an explicit helper-agent override when a human wants a one-off read-only assist.
- **Why it passed the framework:** it has a meaningful autonomy and permission boundary (read-only exploration) that is distinct from both planning and execution.
- **Expected adaptations from upstream behavior:**
  - keep it focused on investigation only; it should not create plans, update task state, or act like an implementer
  - align the wording with this repository's coordinator-owned planning model
  - make clear that direct `@explore` invocation does not require a plan/task unless the user explicitly wants tracked work
  - prefer repository search and read tools over any change-capable workflow

## Rejected candidates

### `build`

Rejected because this repo intentionally routes implementation through the tracked `worker` role rather than a user-facing full-access primary agent.

### `plan`

Rejected because planning here is not just "analyze without edits"; it is a durable coordinator responsibility tied to the agentbook database, spec approval, task sequencing, and dispatch.

### `general`

Rejected because the repository already defines `worker` as the bounded execution role. Vendoring `general` would create role ambiguity without adding a new model or permission boundary.

## Maintenance note

If upstream OpenCode changes the built-in agents, re-run this evaluation instead of automatically mirroring those changes. Local control is valuable only if the vendored definitions remain intentionally maintained.
