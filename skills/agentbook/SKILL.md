---
name: agentbook
description: "Cross-session plan tracking system using SQLite for AI agents. Load this to create, manage, and resume plans across sessions and worktrees."
---

# Agentbook Reference

Reference material for the `agentbook` CLI, shared database, and task/plan data model.

Behavior, ownership, dispatch, and agent-role policy are defined by active agent instructions; this skill stays focused on the framework and CLI surface.

## Database location

Inside a git repository, `agentbook` resolves its database to the shared git-common directory:

```bash
<git-common-dir>/agentbook/agentbook.db
```

This means all worktrees share the same database. Outside a git repo, the CLI falls back to `.opencode/agentbook.db` in the current directory. Set `AGENTBOOK_DB` only if you need to override the default.

## CLI reference

All commands output JSON.

### Plan commands

```bash
agentbook plan create --title "Feature: OAuth2" --name "oauth2-auth" --description "Add OAuth2 authentication to the API" [--spec <spec>] [--document <doc>]
agentbook plan list
agentbook plan list --status active
agentbook plan get <plan-id-or-name>
agentbook plan archive <plan-id-or-name>
agentbook plan archive --older-than 7d
agentbook plan archive-stale
agentbook archive-stale
agentbook plan update <plan-id-or-name> --status active [--spec <spec>] [--document <doc>]
```

`plan get` returns the plan body only: `id`, `name`, `title`, `description`, `spec`, `document`, `status`, and timestamps. It does not include tasks.

### Task commands

```bash
agentbook task create --plan <plan-id-or-name> --title "Create user model" --description "Define User schema" --priority 1
agentbook task create --plan <plan-id-or-name> --title "Add auth middleware" --depends-on "<task-id-1>,<task-id-2>"
agentbook task list --plan <plan-id-or-name>
agentbook task list --status in_progress
agentbook task get <task-id>
agentbook task update <task-id> --status in_progress --assignee "worker" --session "<session-id>" --worktree "<current-dir>"
agentbook task update <task-id> --status completed --notes "Implemented and tested"
```

### Summary

```bash
agentbook summary <plan-id-or-name>
```

Plan JSON includes both a stable UUID `id` and a user-facing `name`; prefer `name` when presenting plans, and use `id` as a fallback.

## Data model

### Plan statuses

- `draft`
- `needs_spec_approval`
- `active`
- `paused`
- `completed`
- `cancelled`
- `archived`

### Task statuses

- `pending`
- `in_progress`
- `completed`
- `blocked`
- `needs_guidance`
- `cancelled`

`blocked` means progress depends on an external dependency, permission, or outside input. `needs_guidance` means the task made partial progress but now needs clarification, judgment, or a checkpoint.

### Dependencies

Tasks can declare dependencies with `--depends-on` as a comma-separated list of task IDs. Before starting a task, confirm all dependencies are `completed`.

## Plan fields

### `spec`

The `spec` field stores the stable, user-owned requirements for a plan: goals, scope, non-goals, and acceptance criteria.

### `document`

The `document` field stores execution context: architecture notes, key files, constraints, risks, task breakdown rationale, open questions, and current status notes.

Both fields are free-form markdown.
