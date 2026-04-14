---
name: agentbook
description: "Cross-session plan tracking system using SQLite for AI agents. Load this to create, manage, and resume plans across sessions and worktrees."
---

# Agentbook Plan Tracking

A CLI-based system for tracking plans and tasks across AI sessions and git worktrees. Data is stored in a SQLite database at the git worktree root, making it accessible from any worktree.

## Database Location

The database lives at `<worktree>/.opencode/agentbook.db`.

The worktree root is shown in your system prompt as "Workspace root folder". Use that path to construct the DB path:

```bash
AGENTBOOK_DB="<worktree-root>/.opencode/agentbook.db" agentbook <command>
```

IMPORTANT: Always set `AGENTBOOK_DB` explicitly using the workspace root folder path. This ensures the same database is used regardless of which worktree or subdirectory you are in.

## CLI Reference

All commands output JSON.

### Plan Commands

```bash
agentbook plan create --title "Feature: OAuth2" --description "Add OAuth2 authentication to the API"
agentbook plan list
agentbook plan list --status active
agentbook plan get <plan-id>
agentbook plan update <plan-id> --status active
```

### Task Commands

```bash
agentbook task create --plan <plan-id> --title "Create user model" --description "Define User schema" --priority 1
agentbook task create --plan <plan-id> --title "Add auth middleware" --depends-on "<task-id-1>,<task-id-2>"
agentbook task list --plan <plan-id>
agentbook task list --status in_progress
agentbook task get <task-id>
agentbook task update <task-id> --status in_progress --assignee "worker" --session "<session-id>" --worktree "<current-dir>"
agentbook task update <task-id> --status completed --notes "Implemented and tested"
```

### Activity Log

```bash
agentbook log create --plan <plan-id> --action "note" --detail "Discovered existing auth module" --agent "explorer"
agentbook log create --plan <plan-id> --task <task-id> --action "started" --detail "Beginning implementation"
agentbook log list --plan <plan-id> --limit 10
```

### Summary

```bash
agentbook summary <plan-id>
```

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
- `cancelled`

### Dependencies

Tasks can declare dependencies via `--depends-on` (comma-separated task IDs). Before starting a task, check that all its dependencies are `completed`.

## Workflow Protocol

### Creating a Plan

1. Create the plan entry: `plan create --title "..." --description "..."`
2. Explore the codebase to understand the scope
3. Break work into tasks: `task create --plan <id> --title "..." --priority <n>`
4. Set dependencies between tasks where needed
5. Mark the plan as active: `plan update <id> --status active`

### Executing Tasks

1. Query for pending tasks: `task list --plan <id> --status pending`
2. Check dependencies before starting
3. Claim the task: `task update <id> --status in_progress --assignee "worker" --session "<session>"`
4. Do the implementation work
5. Mark complete: `task update <id> --status completed --notes "summary of what was done"`
6. Log activity: `log create --plan <id> --task <id> --action completed --detail "..."`

### Resuming from Another Session or Worktree

1. List active plans: `plan list --status active`
2. Get plan details: `plan get <plan-id>`
3. Find pending or in-progress tasks: `task list --plan <id>`
4. Continue from where the previous session left off

### Checking Progress

Use `summary <plan-id>` for a quick overview, or `plan get <plan-id>` for full detail.
