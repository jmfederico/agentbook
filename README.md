# agentbook

Cross-session plan tracking for AI agents, backed by SQLite.

`agentbook` helps coordinator and worker agents track multi-step work across sessions and git worktrees with a shared SQLite database.

## Features

- Shared plan and task tracking across sessions and git worktrees
- Simple CLI for plans, tasks, summaries, initialization, and a local dashboard UI
- Plan documents that act as durable handoff context between agents
- Agent-oriented workflow with coordinator and worker roles
- Automatic database migration from legacy `.opencode/agentbook.db` when needed

## Requirements

- [Bun](https://bun.sh/)
- git

## Installation

Clone this repository somewhere permanent:

```bash
git clone https://github.com/jmfederico/agentbook.git ~/agentbook
```

Register the skill path in your global opencode config:

```jsonc
{
  "skills": {
    "paths": ["~/agentbook/skills"]
  }
}
```

Install the bundled agents:

```bash
mkdir -p ~/.config/opencode/agents
ln -s ~/agentbook/agents/coordinator.md ~/.config/opencode/agents/coordinator.md
ln -s ~/agentbook/agents/worker.md ~/.config/opencode/agents/worker.md
```

The `worker` agent is intended for subagent dispatch. Most users should interact with `coordinator`.

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
agentbook plan create --title "Feature: OAuth2" --name "oauth2-auth" --description "Add OAuth2 authentication to the API" --document "Initial plan notes"
agentbook plan list
agentbook plan list --status active
agentbook plan get oauth2-auth
agentbook plan archive oauth2-auth
agentbook plan archive --older-than 7d
agentbook plan update oauth2-auth --status active
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

Plans include an `id`, user-facing `name`, `title`, `description`, `status`, and a free-form `document` used for handoff context.

Plan statuses:

- `draft`
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

Dependencies are stored via `--depends-on` as a comma-separated list of task IDs. The plan `document` is the durable context artifact agents read and update as work evolves.

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
