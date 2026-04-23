# Agent and skill evaluation framework

This repository uses a simple rule: keep **plan ownership and orchestration** in the coordinator for tracked work, treat workers as **general-purpose executors**, and use **skills for reusable procedures** that can be loaded by multiple agents.

## Decision order

When deciding whether behavior belongs in an agent, a skill, or local repo guidance, evaluate it in this order:

1. **Does model choice matter?**
   - Create or keep a distinct **agent** when the work benefits from a different model tier, latency/cost profile, or context style.
   - Use a **skill** when the same guidance should work regardless of which agent/model is executing.
2. **Does the behavior need a separate autonomy boundary?**
   - Use an **agent** when the behavior needs a clearly bounded role, permission posture, escalation policy, or stop condition.
   - Use a **skill** when the behavior is a reusable workflow inside an existing role.
3. **Is the difference mostly role/policy rather than procedure?**
   - Use an **agent** for durable role separation such as coordinator vs worker.
   - Use a **skill** for step-by-step knowledge that multiple roles may share.
4. **Will centralizing the procedure reduce drift?**
   - Prefer a **skill** when the same process would otherwise be copied into multiple agents or docs.
5. **Do we need local control over the definition?**
   - Default toward **vendoring useful opencode agent definitions locally** so this repo controls wording, maintenance, and evolution.
   - Only avoid vendoring when there is a clear benefit to tracking an external definition unchanged.

## Repository stance

- **Coordinator owns plans.** Plan creation, spec drafting, approval gates, task creation, dependency management, and dispatch sequencing belong to the coordinator.
- **Workers do not self-direct plan work.** A worker executes the assigned task, verifies the result, updates task status, and stops.
- **Direct helper override is allowed.** If a human explicitly mentions a helper agent such as `worker` or `explore`, that mention can be treated as a request for direct bounded helper execution without requiring a plan or task.
- **Override mode does not transfer plan ownership.** Even when a helper agent is invoked directly, tracked plans, spec revisions, and orchestration remain coordinator-owned unless the user explicitly asks for tracked work.
- **Plan/task references may be contextual in override mode.** A coordinator may pass a plan or task id to a helper agent as optional context in override mode, but that alone should not cause the helper to claim or mutate tracked task state.
- **Skills are shared operational knowledge.** They should teach procedures, commands, checklists, and domain-specific workflows without redefining ownership boundaries.
- **README and agent definitions should agree.** If a workflow rule changes, update the repository-facing docs and role definitions together.

## Responsibility evaluation

### Planning

Planning stays with the **coordinator agent** for tracked work, not a skill and not a worker behavior.

Use an agent because planning needs:

- a durable ownership boundary around specs, approval, and task orchestration
- explicit freeze behavior while a spec awaits approval
- judgment about task decomposition, dependencies, and sequencing

Skills may support planning with reusable checklists or database workflows, but they should not turn non-coordinator roles into self-directed planners.

### Codebase exploration

Codebase exploration is usually **not a separate long-lived role by default**.

- Keep it as a **skill-backed activity** when exploration is part of understanding work before planning or implementation.
- Introduce a dedicated **agent** only if exploration needs a different model, permission profile, or a strongly isolated research role with different stop conditions.

The default bias is to avoid creating a new agent just because a task includes investigation.

### Execution

Execution belongs to the **worker agent**.

Use an agent because execution needs:

- a bounded task-level contract
- clear verification and status-update responsibilities
- explicit escalation when blocked, uncertain, or at a checkpoint

Execution-specific domain knowledge should live in **skills** that workers can load as needed.

When a human explicitly invokes `worker` in override mode, that helper run is still bounded execution, but it should follow the direct instruction rather than assuming agentbook-backed task claiming. Tracked status updates belong only to the explicit tracked-work path.

## Heuristics for future changes

Create or keep an **agent** when most of these are true:

- the role needs its own model choice or cost/latency profile
- the role needs distinct permissions or autonomy limits
- the role owns decisions another role must not make
- the role should persist as a recognizable actor in the workflow

Create or keep a **skill** when most of these are true:

- the content is reusable procedure or domain guidance
- multiple agents may need the same workflow
- the behavior should not change task ownership or planning authority
- duplication across agents/docs would otherwise create drift

Keep guidance in **repo docs** when it is primarily for humans choosing how to operate the system, and cross-link the relevant agent/skill definitions so the written policy and executable behavior stay aligned. This is especially important for explaining the distinction between tracked coordinator-led work and direct helper-agent override work.

## Default vendoring policy

When evaluating upstream or built-in opencode agents:

- start from the assumption that a useful definition should be copied into this repository
- adapt the vendored version to this repo's coordinator-owned planning model and documentation style
- document why the agent exists, what boundary it owns, and how it should be maintained

This bias favors local control and consistent behavior over implicit dependence on upstream defaults.
