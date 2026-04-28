---
name: agentbook
description: "Cross-session plan tracking system using SQLite for AI agents. Load this to create, manage, and resume plans across sessions and worktrees."
---

# Agentbook Plan Tracking

A CLI-based system for tracking plans and tasks across AI sessions and git worktrees.

## Scope of This Skill

This skill documents the **tracked plan/task workflow** built around the `agentbook` database.

- Use it when creating, updating, resuming, or executing tracked plan work.
- It does **not** mean every helper-agent run in this repository requires a plan or task.
- Direct helper-agent override runs may exist outside this tracked workflow unless the user explicitly asks for tracked work.
- In tracked work, the coordinator owns plan decisions and dispatch, while helper subagents are preferred for most fact-finding, comparative research, risk review, and evidence gathering.

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

`plan get` returns the plan body only (id, name, title, description, spec, document, status, timestamps). It does **not** include a tasks array. Use `summary`, `task list`, or `task get` for task views.

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

### Summary

```bash
agentbook summary <plan-id-or-name>
```

Plan JSON includes both a stable UUID `id` and a user-facing `name`. Prefer showing `name` to users and include `id` only as a fallback or disambiguator.

## Data Model

### Plan Statuses

- `draft`
- `needs_spec_approval` — coordinator has drafted (or revised) the spec and is waiting for user approval
- `active`
- `paused`
- `completed`
- `cancelled`
- `archived`

**Lifecycle transitions:**

- `draft` → `needs_spec_approval`: coordinator drafts the spec and proposes it for approval.
- `needs_spec_approval` → `needs_spec_approval`: coordinator revises spec based on user feedback.
- `needs_spec_approval` → `active`: user approves the spec; coordinator creates tasks and sets the plan active.
- `active` → `needs_spec_approval`: a scope change mid-flight requires a revised spec before work continues.
- `active` → `paused` / `completed`: normal progress transitions.
- any → `cancelled` / `archived`: terminal states.

### Task Statuses

- `pending`
- `in_progress`
- `completed`
- `blocked` — hard stop waiting on an external dependency, permission, or outside input
- `needs_guidance` — worker made progress but needs coordinator judgment, clarification, or a checkpoint. Legacy `needs_review` records still normalize to this status during the transition.
- `cancelled`

### Dependencies

Tasks can declare dependencies via `--depends-on` (comma-separated task IDs). Before starting a task, check that all its dependencies are `completed`.

## Plan Spec

The `spec` field stores user-owned requirements for the plan — the stable "what". It is drafted by the coordinator and approved by the user. Every revision that changes goals or scope should flip the plan status to `needs_spec_approval` until the user re-approves.

**Ownership:** the user approves; the coordinator drafts and proposes revisions. Once approved, the spec is a stable reference. Do not silently re-plan under an outdated spec — propose a revision and request re-approval.

Suggested contents: goals and success criteria, scope (in and out), non-goals, acceptance criteria.

## Plan Document

The `document` field stores coordinator-owned architecture and execution context — the living "how". It is updated throughout execution and does not require user approval.

**Ownership:** coordinator only. Goals and acceptance criteria live in `spec`, not here.

Suggested contents: architecture and design decisions, key files and patterns, constraints and risks, task breakdown rationale, open questions, current status notes.

The document should be updated at these key moments:
- After completing the task breakdown — record structure and sequencing rationale
- After handling a worker checkpoint or review — record what changed and why
- When resuming from a new session — verify the document still matches reality

Coordinators write or update this field with `plan update <id> --document "..."`. Workers read it from `plan get` output to understand architecture context.

Both fields are free-form markdown.

## Role Boundaries and Task Sizing

- Coordinator owns the plan, spec, document, final design calls, task boundaries, dependency order, and worker dispatch.
- Delegate most repository fact-finding, comparative research, risk analysis, and review-style evidence gathering to scout, deep-review, or other suitable helper subagents when that will improve the decision.
- Keep research, design decision capture, implementation, validation, and git/release operations separable; use distinct tracked tasks or helper passes when they can be completed independently.
- Give workers single-outcome tasks with one bounded area, clear acceptance criteria, and enough design context to execute without making new architecture choices.
- If a candidate worker task mixes discovery, architecture/design, implementation, and validation, split it before dispatch.
- Prefer the existing coordinator/scout/deep-review/worker split for normal tracked work.

## Workflow Protocol

### Creating a Plan (Coordinator)

The coordinator follows a 5-phase flow:

1. **Register**: `plan create --title "..." --name "..." --description "..."`
2. **Understand**: gather scope and constraints, delegating most fact-finding and comparison work to helper subagents when useful.
3. **Draft spec + approval gate**: write a spec covering goals, scope, non-goals, and acceptance criteria. Update the plan: `plan update <id> --spec "..." --status needs_spec_approval`. Present the spec to the user and wait for approval. Do not create tasks or dispatch workers yet. Revise and re-propose if the user requests changes.
4. **On approval — activate**: once the user approves, write the architecture document, then break work into narrowly scoped tasks (`task create --plan <id> --title "..." --priority <n>`), separating research, design decision capture, implementation, validation, and git/release follow-ups where appropriate. Set dependencies where needed, and mark the plan active: `plan update <id> --document "..." --status active`.
    - For repeated review/checkpoint follow-ups, prefer ordinal pass titles like `Review pass 1`, `Review pass 2`, etc., with an optional purpose qualifier after the number.
5. **Execute automatically after approval**: keep plan ownership with the coordinator, proceed into worker dispatch without asking the user whether to start, and check progress with `summary` or `task list`.

### Dispatching Workers (Coordinator)

The coordinator owns plan execution. Workers are task executors, not plan managers.

This section applies to **tracked worker dispatch**. If a human explicitly invokes a helper agent in direct override mode, the coordinator may dispatch that helper without requiring plan/task state and may pass plan/task references only as optional context.

Dispatch prompts are **pointer-only**. Include only:
- Plan name/id
- Task id
- Workspace root (only if not inferable from context)
- Boilerplate: "Load the agentbook skill. Read the plan via `plan get`. Read your task via `task get`. Execute only this task. Stop and return control when done."

Never restate task titles, descriptions, or plan context in the prompt. The worker reads those directly from the DB.

Before dispatching a worker, confirm the task is implementation-sized: one outcome, one bounded area, dependency-ready, and backed by enough design context that the worker should not need to invent architecture.

**Freeze rule:** while plan status is `needs_spec_approval`, do not dispatch new workers. Let any in-flight tasks finish; start nothing new until the user re-approves the spec.

After approval, worker dispatch should happen automatically as part of normal coordinator execution; only pause for user input when there is a blocker, clarification request, or scope change.

### Executing Tasks (Worker)

1. Read plan context: `plan get <plan-name-or-id>` — returns plan body (spec + document), no tasks array.
2. Read task details: `task get <task-id>` — returns full task body including description and dependencies.
3. Check dependencies: confirm all `depends_on` tasks are `completed` before starting.
4. Claim the task: `task update <id> --status in_progress --assignee "worker" --session "<session>"`
   - For review/checkpoint follow-ups, use a deterministic session label such as `review-pass-2` that matches the numbered task title; avoid stacking adjectives like `final final review`.
5. Do the implementation work.

   If the task is large, you are looping, the next step would require guessing, or the task really needs architecture/design discovery instead of execution, set status to `needs_guidance` with notes summarizing progress, what you tried, and what decision is needed. If the stop is caused by an external dependency, permission, or outside input you cannot obtain locally, use `blocked` instead. Then stop and let the coordinator decide next steps.

6. Mark complete: `task update <id> --status completed --notes "summary of what was done"`
7. Return control. Do not continue onto another plan task in the same worker session unless explicitly re-dispatched.

Workers should not independently resume a plan, choose the next task, or take over coordinator responsibilities unless a future approved spec explicitly says otherwise.

### Handling Scope Changes (Coordinator)

If the user changes goals or scope mid-flight:
1. Draft a revised spec reflecting the new requirements.
2. Update the plan: `plan update <id> --spec "..." --status needs_spec_approval`.
3. Present the revised spec to the user and wait for re-approval. Do not dispatch new workers until approved.

### Resuming from Another Session or Worktree (Coordinator)

1. List active plans: `plan list --status active`
2. Read plan context: `plan get <plan-name-or-id>` — confirm spec and document still match reality before continuing work.
3. Find pending or in-progress tasks: `task list --plan <id>`
4. Continue from where the previous session left off by dispatching the next appropriate worker task.

### Checking Progress

Use `summary <plan-name-or-id>` for a compact task index and progress counts. Use `task list --plan <id>` to filter by status. Use `task get <id>` for full task detail. Use `plan get <id>` for the plan body (spec + document).
