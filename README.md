# agentbook

Cross-session plan tracking for AI agents, backed by SQLite.

`agentbook` helps coordinator and worker agents track multi-step work across sessions and git worktrees with a shared SQLite database.

## Features

- Shared plan and task tracking across sessions and git worktrees
- Simple CLI for plans, tasks, summaries, initialization, and a local dashboard UI
- Plan documents that act as durable handoff context between agents
- Agent-oriented workflow with coordinator and worker roles
- Automatic database migration from legacy `.opencode/agentbook.db` when needed

## TL;DR — how to use the agents

- Select `coordinator` as your active agent (set it as your default or switch to it in opencode) — it plans and keeps track of your work across sessions and worktrees. Do not just `@coordinator` from another agent; actually talk to `coordinator` as your active agent.
- The coordinator drafts a `spec` (the "what") and asks you to approve it before breaking work into tasks. Once you approve, it creates tasks and dispatches workers.
- Only `@`-mention other agents like `@worker` when you want a specific task done and want to bypass plan creation — and even then, keep `coordinator` as your active agent so it can dispatch the work.

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
```

Expose the CLI globally from that same checkout:

If you just installed Bun, restart your shell or source your shell rc file first so `bun` is on `PATH` before you run `bun link`.

```bash
bun link "$REPO_PATH"
```

`bun link` is the supported way to install `agentbook` globally from your checkout. If that command fails, stop there and fix your Bun installation, `PATH`, and shell setup before continuing. Do not continue with a manual symlink or alternate global install workaround.

The `worker` agent is a subagent dispatched by `coordinator` via the Task tool and is visible in the `@` autocomplete menu so users can see it exists, but `coordinator` remains the recommended entry point for doing work.

## opencode configuration

Recommended default agent:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "coordinator"
}
```

Optional per-agent model overrides:

```jsonc
{
  "agent": {
    "coordinator": {
      "model": "anthropic/claude-opus-4-20250514"
    },
    "worker": {
      "model": "anthropic/claude-sonnet-4-20250514"
    }
  }
}
```

Recommended permissions:

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

This avoids repeated prompts for `agentbook` commands while keeping out-of-workspace access recoverable for subagents.

## Quick start

Ask the coordinator to create a plan:

```text
@coordinator Add OAuth2 authentication to the API
```

The coordinator will draft a `spec` (requirements) and ask for your approval before breaking work into tasks. Once you approve, it dispatches workers automatically.

Resume tracked work later:

```text
@coordinator Resume plan oauth2-auth
```

Or use the CLI directly:

```bash
agentbook init
agentbook plan list --status active
agentbook summary oauth2-auth
```

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
- `blocked`
- `needs_review`
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
│   ├── coordinator.md
│   └── worker.md
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
- `skills/agentbook/SKILL.md` contains the detailed CLI and workflow reference.
- `src/cli.ts` implements the CLI entrypoint.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
