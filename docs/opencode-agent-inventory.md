# OpenCode agent inventory and vendoring decisions

This document evaluates the built-in OpenCode agents against this repository's [agent and skill evaluation framework](./agent-skill-evaluation-framework.md), with a default bias toward vendoring useful upstream definitions locally when they add a clear autonomy or permission boundary.

## Built-in agent inventory

| Upstream agent | Mode | Upstream role | Fit for this repo | Vendoring decision |
| --- | --- | --- | --- | --- |
| `build` | primary | Full-access development agent | Conflicts with the coordinator-first operating model because it encourages direct implementation from the active primary session instead of coordinator-owned planning and worker dispatch. | Do not vendor |
| `plan` | primary | Analysis and planning without edits | Overlaps with `coordinator`, but lacks the agentbook-specific ownership boundary around plan registration, approval gates, task tracking, and dispatch. | Do not vendor |
| `general` | subagent | General-purpose execution/research helper with broad tool access | Overlaps heavily with `worker` and is less bounded than this repo's single-task executor contract; this repo prefers coordinator-led delegation plus `scout`/`deep-review` for research and review instead of a new default architecture helper. | Do not vendor |
| `explore` | subagent | Fast read-only codebase exploration | Useful as a distinct read-only investigation boundary for coordinator-led research, especially when understanding a codebase before planning or implementation. | Vendor locally as `agents/scout.md` under the renamed helper `scout` |

## Selected vendored agent

### `scout` (vendored from upstream `explore`)

- **Role:** read-only codebase exploration and fact gathering for a parent agent.
- **Status in this repo:** **optional helper**. The first-class workflow remains tracked `coordinator` + `worker`, but `scout` may also be invoked directly as an explicit helper-agent override when a human wants a one-off read-only assist.
- **Why the local name differs:** this repo vendors the upstream `explore` agent under the name `scout` so it does not shadow or surprise users who expect opencode's built-in `explore` agent.
- **Why it passed the framework:** it has a meaningful autonomy and permission boundary (read-only exploration) that is distinct from both planning and execution.
- **Expected adaptations from upstream behavior:**
  - keep it focused on investigation only; it should not create plans, update task state, or act like an implementer
  - allow bounded bash use for read-only git and configured remote-provider investigation only; examples include `git status`, `git log`, `git show`, `git diff`, and read-only provider CLI/API requests for the configured forge (for example `gh`, `glab`, or equivalent) when they are GET/read-only only
  - never permit bash-driven mutation of files, git state, remote-provider state, or the environment, including checkout/reset/clean/switch/merge/rebase/push/fetch/pull, create/edit/delete/merge/comment/approve/label/assign/auth/config changes, redirects, write-producing pipes, environment/config changes, or chained mutating commands
  - align the wording with this repository's coordinator-owned planning model
  - make clear that direct `@scout` invocation does not require a plan/task unless the user explicitly wants tracked work
  - prefer repository search and read tools over any change-capable workflow

## Role-separation decision

- This repository is **not** adding a default architecture/design helper in this round.
- Coordinator-owned decisions, task boundaries, and dispatch stay intact.
- Delegated research, fact-finding, comparative investigation, and review-style evidence gathering should go to `scout`, `deep-review`, or other explicit helper passes as appropriate.
- Workers should still receive narrow, single-outcome implementation tasks rather than broad design-heavy assignments.

### `deep-review` (repo-defined review helper)

- **Role:** slow, read-only review pass for code quality, correctness, and architecture critique.
- **Status in this repo:** **optional helper**. It complements `scout` by favoring higher-scrutiny review over quick investigation.
- **Why it exists:** this repository wants a distinct helper for thorough code review without expanding the default worker role or mixing review into planning.
- **Boundary:** it should remain read-only and advisory; it may use bash for bounded read-only repository investigation, but it must not claim tasks, mutate state, or behave like an implementer.
- **Expected adaptations from repository workflow:**
  - use it when the reviewer needs a stricter scrutiny boundary than `scout`
  - allow bounded bash use for read-only git and configured remote-provider investigation only; examples include `git status`, `git log`, `git show`, `git diff`, and read-only provider CLI/API requests for the configured forge (for example `gh`, `glab`, or equivalent) when they are GET/read-only only
  - never permit bash-driven mutation of files, git state, remote-provider state, or the environment, including checkout/reset/clean/switch/merge/rebase/push/fetch/pull, create/edit/delete/merge/comment/approve/label/assign/auth/config changes, redirects, write-producing pipes, environment/config changes, or chained mutating commands
  - keep the agent definition and README config in sync so users can install and override it consistently
  - preserve the repo's coordinator-owned planning model by keeping review output advisory only

## Rejected candidates

### `build`

Rejected because this repo intentionally routes implementation through the tracked `worker` role rather than a user-facing full-access primary agent.

### `plan`

Rejected because planning here is not just "analyze without edits"; it is a durable coordinator responsibility tied to the agentbook database, spec approval, task sequencing, and dispatch.

### `general`

Rejected because the repository already defines `worker` as the bounded execution role. Vendoring `general` would create role ambiguity without adding a new model or permission boundary.

## Maintenance note

If upstream OpenCode changes the built-in agents, re-run this evaluation instead of automatically mirroring those changes. Local control is valuable only if the vendored definitions remain intentionally maintained.
