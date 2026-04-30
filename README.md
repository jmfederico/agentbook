# agentbook

Cross-session plan tracking for AI agents, backed by SQLite.

`agentbook` helps a human delegate multi-step work to AI agents with minimal ongoing supervision once requirements are clear. It gives coordinator and worker agents a shared SQLite-backed plan ledger that persists across sessions and git worktrees.

## Features

- Shared plan and task tracking across sessions and git worktrees
- Simple CLI for plans, tasks, summaries, initialization, and a local dashboard UI
- Plan documents that act as durable handoff context between agents
- Agent-oriented workflow with coordinator-owned decisions, narrow worker tasks, and delegated research/review helpers
- Automatic database migration from legacy `.opencode/agentbook.db` when needed

## TL;DR — how to use the agents

- Select `coordinator` as your active agent (set it as your default or switch to it in opencode) — it plans and keeps track of your work across sessions and worktrees. Do not just `@coordinator` from another agent; actually talk to `coordinator` as your active agent.
- The coordinator drafts a `spec` (the "what") and asks you to approve it before breaking work into tasks. Once you approve, it creates tasks and dispatches workers.
- For bigger questions, the coordinator should usually delegate fact-finding and research to `scout` or `deep-review` rather than trying to carry broad investigation inside the active session.
- Your normal human role is to provide goals, approve or revise specs when scope changes, and review results — not to manually babysit every implementation step.
- Keep `coordinator` as your active agent for normal use. Direct `@worker`, `@scout`, or `@deep-review` mentions are supported as an explicit helper-agent override path, but they are still exceptional/manual usage rather than the default workflow.

## Requirements

- [Bun](https://bun.sh/)
- git

## Installation

Clone this repository somewhere permanent, then capture the absolute path to that checkout:

```bash
git clone https://github.com/jmfederico/agentbook.git /path/to/agentbook
REPO_PATH="/path/to/agentbook"
```

Register the skill path in your global opencode config, using the same checkout path you stored in `REPO_PATH`:

```jsonc
{
  "skills": {
    // replace with the absolute path from REPO_PATH + "/skills"
    "paths": ["/path/to/agentbook/skills"]
  }
}
```

Install the bundled agents:

```bash
mkdir -p ~/.config/opencode/agents
ln -s "$REPO_PATH/agents/coordinator.md" ~/.config/opencode/agents/coordinator.md
ln -s "$REPO_PATH/agents/worker.md" ~/.config/opencode/agents/worker.md
ln -s "$REPO_PATH/agents/scout.md" ~/.config/opencode/agents/scout.md
ln -s "$REPO_PATH/agents/deep-review.md" ~/.config/opencode/agents/deep-review.md
```

Also add the bundled tmp-folder instruction to your global opencode config so agents consistently use `/tmp/opencode/` for scratch files:

```jsonc
{
  "instructions": [
    "/path/to/agentbook/instructions/tmp-folder.md"
  ]
}
```

`scout` is a vendored, read-only investigation helper for coordinator-led research and delegated fact-finding. It can use bounded bash commands for read-only git and configured remote-provider inspection, limited to GET/read-only provider checks and non-mutating shell use, but it must never mutate files or repo state, including checkout/reset/clean/switch/merge/rebase/push/fetch/pull, redirects, write-producing pipes, or env/config changes.

`deep-review` is a read-only review helper for slower, higher-scrutiny code review passes. It can also use bounded bash commands for read-only git and configured remote-provider inspection, limited to GET/read-only provider checks and non-mutating shell use, but it must never mutate files or repo state, including checkout/reset/clean/switch/merge/rebase/push/fetch/pull, redirects, write-producing pipes, or env/config changes. Use it when you want a stronger critique boundary than the default exploration helper.

This rename avoids shadowing opencode's built-in `explore` agent. Use `scout` for the local vendored helper; the upstream `explore` agent remains a separate concept.

Expose the CLI globally from that same checkout:

If you just installed Bun, restart your shell or source your shell rc file first so `bun` is on `PATH` before you run `bun link`.

```bash
bun link "$REPO_PATH"
```

`bun link` is the supported way to install `agentbook` globally from your checkout. If that command fails, stop there and fix your Bun installation, `PATH`, and shell setup before continuing. Do not continue with a manual symlink or alternate global install workaround.

The `worker` agent is normally dispatched by `coordinator` for tracked task work and is visible in the `@` autocomplete menu so users can see it exists. Direct `@worker` mentions are also supported as an explicit override path, but `coordinator` remains the recommended entry point for normal work.

## opencode configuration

Recommended default agent:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "coordinator"
}
```

Optional per-agent model overrides (choose whatever models fit your local setup):

```jsonc
{
  "agent": {
    "coordinator": {
      "model": "<your preferred coordinator model>"
    },
    "worker": {
      "model": "<your preferred worker model>"
    },
    "scout": {
      "model": "<your preferred scout model>"
    },
    "deep-review": {
      "model": "<your preferred deep-review model>"
    }
  }
}
```

This repository leaves model choice to you; use the settings above as a local configuration template rather than a recommendation.

Recommended permissions after adding `instructions/tmp-folder.md` to `instructions`:

```jsonc
{
  "permission": {
    "bash": {
      "agentbook *": "allow"
    },
    "external_directory": {
      "*": "deny",
      "/tmp/opencode/*": "allow"
    }
  }
}
```

This avoids repeated prompts for `agentbook` commands while keeping out-of-workspace access recoverable for subagents. The `/tmp/opencode/*` allowance assumes you added the tmp-folder instruction above to `instructions`, which tells agents to use that path for temporary files.

## Quick start

Recommended default flow for tracked work:

1. Talk to `coordinator` as your active agent.
2. Describe the outcome you want.
3. Review and approve the drafted `spec`.
4. Let the coordinator dispatch workers for bounded tasks.
5. Come back later and ask the coordinator to resume the plan or report progress.

Ask the coordinator to create a plan:

```text
Add OAuth2 authentication to the API
```

The coordinator will draft a `spec` (requirements) and ask for your approval before breaking work into tasks. Once you approve, it moves straight into task creation and worker dispatch without asking for an extra go-ahead.

### Tracked work vs direct helper-agent override

This repository supports two intentional operating modes:

1. **Tracked coordinator-led work (default)**
   - Use `coordinator` as your active agent.
   - The coordinator owns plans, specs, approval gates, task creation, dependency checks, and dispatch.
   - Workers execute bounded tracked tasks and update task state in `agentbook`.

2. **Direct helper-agent override work (manual/exception path)**
   - If you explicitly mention a helper agent such as `@worker`, `@scout`, or `@deep-review`, that mention acts as a request to run that helper directly.
   - In this mode, the helper run does **not** require a plan or task unless you explicitly ask for tracked work.
   - The coordinator still owns tracked plans and orchestration; a direct helper run does not silently claim, update, or execute tracked plan work on its own.
   - A coordinator may still pass a plan or task reference as **optional context** to the helper in override mode, but that context is informative unless you explicitly want the helper to operate in tracked mode.

Use tracked mode for durable multi-step work. Use direct helper override when you intentionally want a one-off bounded assist without creating or advancing tracked plan state.

Resume tracked work later:

```text
Resume plan oauth2-auth
```

Or use the CLI directly:

```bash
agentbook init
agentbook plan list --status active
agentbook summary oauth2-auth
```

## Agent and skill evaluation framework

This repository defaults to a **coordinator-owned planning model** for tracked work:

- `coordinator` owns plans, specs, approval gates, task creation, dependency checks, dispatch sequencing, and final design/task-boundary decisions.
- `worker` is a general-purpose executor that completes one assigned task, verifies the result, updates task status, and stops.
- `scout` is a vendored helper for delegated codebase investigation and fact-finding. It may use bash for read-only git and configured remote-provider inspection only, with GET/read-only provider checks and no mutating shell features such as checkout/reset/clean/switch/merge/rebase/push/fetch/pull, redirects, or write-producing pipes.
- `deep-review` is a read-only helper for thorough review passes, higher-confidence critique, and design-risk checking. It may also use bash for read-only git and configured remote-provider inspection only, with GET/read-only provider checks and no mutating shell features such as checkout/reset/clean/switch/merge/rebase/push/fetch/pull, redirects, or write-producing pipes.
- `skills` hold reusable procedures and operational knowledge that multiple agents can load.

Direct helper-agent override runs are also supported when a human explicitly mentions a helper agent. That override path is intentionally separate from tracked plan execution: it bypasses plan/task requirements unless the user explicitly requests tracked work, and it does not change coordinator ownership of plans.

This repository does **not** introduce a default architecture/design helper in this round; the preferred split is coordinator-owned decisions informed by delegated research and review output, then narrowed into worker-sized tasks.

Use this rule of thumb when deciding where behavior belongs:

- Create or keep an **agent** when model choice, autonomy boundaries, permissions, or durable role separation matter.
- Create or keep a **skill** when the behavior is reusable workflow knowledge that should not change ownership boundaries.
- Keep **human-facing repo docs** for project policy and operating guidance, and align them with the actual agent and skill definitions.

Specific responsibilities are evaluated as follows:

- **Planning and design decisions** belong to `coordinator` rather than a worker or shared skill.
- **Codebase exploration, comparative research, and fact-finding** should usually be delegated to `scout` or `deep-review` instead of being bundled into implementation tasks.
- **Execution** belongs to `worker`, with specialized implementation guidance loaded through skills as needed and with narrow, single-outcome task scopes.

When useful opencode agent definitions exist elsewhere, this repo has a default bias toward **vendoring them locally** so their behavior can be reviewed, adapted, and maintained alongside the rest of the workflow.

For the current vendoring decisions, see [`docs/opencode-agent-inventory.md`](docs/opencode-agent-inventory.md).

For the full repository decision framework, see [`docs/agent-skill-evaluation-framework.md`](docs/agent-skill-evaluation-framework.md).

## CLI reference

`agentbook` prints JSON for CLI commands and supports the following top-level commands:

```text
agentbook <command> <subcommand> [options]
```

### Plans

```bash
agentbook plan create --title "Feature: OAuth2" --name "oauth2-auth" --description "Add OAuth2 authentication to the API" --spec "User requirements here" --document "Initial plan notes"
agentbook plan list
agentbook plan list --status active
agentbook plan list --status needs_spec_approval
agentbook plan get oauth2-auth
agentbook plan archive oauth2-auth
agentbook plan archive --older-than 7d
agentbook plan update oauth2-auth --status active
agentbook plan update oauth2-auth --spec "Revised requirements"
```

### Tasks

```bash
agentbook task create --plan oauth2-auth --title "Create user model" --description "Define User schema" --priority 1
agentbook task list --plan oauth2-auth
agentbook task list --status in_progress
agentbook task get <task-id>
agentbook task update <task-id> --status in_progress --assignee worker --session <session-id> --worktree <current-dir>
agentbook task update <task-id> --status completed --notes "Implemented and tested"
```

For repeated review/checkpoint follow-ups, prefer numbered pass names like `Review pass 1`, `Review pass 2`, with matching session labels such as `review-pass-1` and `review-pass-2`.

### Summary, UI, and init

```bash
agentbook summary oauth2-auth
agentbook ui --port 3141
agentbook init
```

For the full agent workflow and command details, see [`skills/agentbook/SKILL.md`](skills/agentbook/SKILL.md).

## Data model

Plans include an `id`, user-facing `name`, `title`, `description`, `status`, a `spec` field, and a `document` field.

- `spec` is the user-owned requirements ("what"). The coordinator drafts it and proposes revisions; the user approves each revision. Each change flips the plan to `needs_spec_approval` until the user re-approves.
- `document` is the coordinator-owned architecture and notes ("how"). It is a living artifact updated throughout execution.

Plan statuses:

- `draft`
- `needs_spec_approval` — coordinator has drafted or revised the spec; waiting for user approval. No new workers are dispatched in this state.
- `active`
- `paused`
- `completed`
- `cancelled`
- `archived`

Tasks belong to a plan and track ownership, notes, dependencies, session metadata, and execution status.

Task statuses:

- `pending`
- `in_progress`
- `completed`
- `blocked` — waiting on an external dependency, permission, or input outside the worker's control
- `needs_guidance` — worker made progress or hit an underspecified task and needs coordinator judgment, clarification, or a checkpoint. Legacy `needs_review` records still normalize to this status during the transition.
- `cancelled`

Dependencies are stored via `--depends-on` as a comma-separated list of task IDs. `plan get` returns the plan body only (including `spec` and `document`); use `task list` or `summary` to view tasks.

## Database location and worktree behavior

Inside a git repository, `agentbook` stores its database in git's common directory:

```text
<git-common-dir>/agentbook/agentbook.db
```

That location is shared automatically across all git worktrees for the same repository.

- If a legacy `.opencode/agentbook.db` exists and no shared database exists yet, `agentbook` migrates it automatically on first use.
- If both exist, the shared database takes precedence.
- Outside a git repository, `agentbook` falls back to `.opencode/agentbook.db` in the current directory.
- Set `AGENTBOOK_DB` to override the database path explicitly.

## Repository layout

```text
.
├── agents/
│   ├── scout.md
│   ├── coordinator.md
│   └── worker.md
├── docs/
│   ├── agent-skill-evaluation-framework.md
│   └── opencode-agent-inventory.md
├── skills/
│   └── agentbook/
│       └── SKILL.md
├── src/
│   └── cli.ts
├── LICENSE
└── package.json
```

- `agents/coordinator.md` describes the planning and delegation role.
- `agents/worker.md` describes the task execution role.
- `agents/scout.md` defines the read-only exploration helper.
- `docs/agent-skill-evaluation-framework.md` records how this repo decides whether behavior belongs in an agent, a skill, or shared documentation.
- `docs/opencode-agent-inventory.md` records which upstream/opencode agents were evaluated and why only selected definitions were vendored locally.
- `skills/agentbook/SKILL.md` contains the detailed CLI and workflow reference.
- `src/cli.ts` implements the CLI entrypoint.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
