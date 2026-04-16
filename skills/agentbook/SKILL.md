---
name: agentbook
description: "Cross-session plan tracking system using SQLite for AI agents. Load this to create, manage, and resume plans across sessions and worktrees."
---

# Agentbook Plan Tracking

A CLI-based system for tracking plans and tasks across AI sessions and git worktrees.

## Database Location

When run inside a git repository, the CLI automatically resolves the database to a shared location inside the git common directory (`<git-common-dir>/agentbook/agentbook.db`). This means all worktrees share the same database with no configuration needed.

Just run commands directly:

```bash
agentbook <command>
```

Outside a git repo, the CLI falls back to `.opencode/agentbook.db` in the current directory. You can always override the location by setting the `AGENTBOOK_DB` environment variable.

IMPORTANT: The CLI auto-resolves to a shared location inside the git common directory, accessible from any worktree. You do not need to set `AGENTBOOK_DB` unless you want to override the default.

## CLI Reference

All commands output JSON.

### Plan Commands

```bash
agentbook plan create --title "Feature: OAuth2" --name "oauth2-auth" --description "Add OAuth2 authentication to the API"
agentbook plan list
agentbook plan list --status active
agentbook plan get <plan-id-or-name>
agentbook plan update <plan-id-or-name> --status active
```

### Task Commands

```bash
agentbook task create --plan <plan-id-or-name> --title "Create user model" --description "Define User schema" --priority 1
agentbook task create --plan <plan-id-or-name> --title "Add auth middleware" --depends-on "<task-id-1>,<task-id-2>"
agentbook task list --plan <plan-id-or-name>
agentbook task list --status in_progress
agentbook task get <task-id>
agentbook task update <task-id> --status in_progress --assignee "worker" --session "<session-id>" --worktree "<current-dir>"
agentbook task update <task-id> --status completed --notes "Implemented and tested"
```

### Activity Log

```bash
agentbook log create --plan <plan-id-or-name> --action "note" --detail "Discovered existing auth module" --agent "explorer"
agentbook log create --plan <plan-id-or-name> --task <task-id> --action "started" --detail "Beginning implementation"
agentbook log list --plan <plan-id-or-name> --limit 10
```

### Summary

```bash
agentbook summary <plan-id-or-name>
```

Plan JSON includes both a stable UUID `id` and a user-facing `name`. Prefer showing `name` to users and include `id` only as a fallback or disambiguator.

## Data Model

### Plan Statuses

- `draft`
- `active`
- `paused`
- `completed`
- `cancelled`

### Task Statuses

- `pending`
- `in_progress`
- `completed`
- `blocked`
- `needs_review` — worker paused for planner review
- `cancelled`

### Dependencies

Tasks can declare dependencies via `--depends-on` (comma-separated task IDs). Before starting a task, check that all its dependencies are `completed`.

## Workflow Protocol

### Creating a Plan

1. Create the plan entry: `plan create --title "..." --name "..." --description "..."`
2. Explore the codebase to understand the scope
3. Break work into tasks: `task create --plan <id> --title "..." --priority <n>`
4. Set dependencies between tasks where needed
5. Mark the plan as active: `plan update <id> --status active`

### Executing Tasks

1. Query for pending tasks: `task list --plan <name-or-id> --status pending`
2. Check dependencies before starting
3. Claim the task: `task update <id> --status in_progress --assignee "worker" --session "<session>"`
4. Do the implementation work

   If the task is large or you encounter issues, set status to `needs_review` with notes summarizing progress and concerns, then stop. The planner will review and decide next steps.

5. Mark complete: `task update <id> --status completed --notes "summary of what was done"`
6. Log activity: `log create --plan <id> --task <id> --action completed --detail "..."`

### Resuming from Another Session or Worktree

1. List active plans: `plan list --status active`
2. Get plan details: `plan get <plan-name-or-id>`
3. Find pending or in-progress tasks: `task list --plan <id>`
4. Continue from where the previous session left off

### Checking Progress

Use `summary <plan-name-or-id>` for a quick overview, or `plan get <plan-name-or-id>` for full detail.
