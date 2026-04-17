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
agentbook plan create --title "Feature: OAuth2" --name "oauth2-auth" --description "Add OAuth2 authentication to the API" [--document <doc>]
agentbook plan list
agentbook plan list --status active
agentbook plan get <plan-id-or-name>
agentbook plan archive <plan-id-or-name>
agentbook plan archive --older-than 7d
agentbook plan update <plan-id-or-name> --status active [--document <doc>]
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
- `archived`

### Task Statuses

- `pending`
- `in_progress`
- `completed`
- `blocked`
- `needs_review` — worker paused for coordinator review
- `cancelled`

### Dependencies

Tasks can declare dependencies via `--depends-on` (comma-separated task IDs). Before starting a task, check that all its dependencies are `completed`.

## Plan Document

The `document` field stores a comprehensive markdown document for each plan. It is the primary knowledge artifact that enables agent handoff between coordinator and worker sessions.

The plan document is a **living artifact** — it should be updated throughout execution, not just written once during planning.

Suggested contents include goals and success criteria, context and background, architecture or design decisions, key files and patterns, constraints and risks, open questions, and current status notes.

The document should be updated at these key moments:
- After the task breakdown — finalize with task structure and sequencing rationale
- After handling a worker checkpoint or review — record what changed and why
- When the user changes scope or requirements — update goals and constraints
- When resuming from a new session — verify the document still matches reality

Coordinators should write or update this document after the design phase with `plan update <id> --document "..."`. Workers should read it from `plan get` output to understand the full context before executing tasks.

The document is free-form markdown, so its structure can vary based on the plan's complexity.

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
3. Dispatch or claim exactly one task at a time per worker session. Parallelism should come from multiple workers, not from giving one worker multiple tasks.
4. Claim the task: `task update <id> --status in_progress --assignee "worker" --session "<session>"`
5. Do the implementation work

    If the task is large or you encounter issues, set status to `needs_review` with notes summarizing progress and concerns, then stop. The coordinator will review and decide next steps.

6. Mark complete: `task update <id> --status completed --notes "summary of what was done"`

    If the task revealed unexpected constraints or required design changes, the coordinator should update the plan document.

7. Log activity: `log create --plan <id> --task <id> --action completed --detail "..."`
8. Return control after that task. Do not continue onto another plan task in the same worker session unless explicitly re-dispatched.

### Resuming from Another Session or Worktree

1. List active plans: `plan list --status active`
2. Read the plan document and verify it is current: `plan get <plan-name-or-id>` — confirm the document still matches reality before continuing work
3. Find pending or in-progress tasks: `task list --plan <id>`
4. Continue from where the previous session left off

### Checking Progress

Use `summary <plan-name-or-id>` for a quick overview, or `plan get <plan-name-or-id>` for full detail.
