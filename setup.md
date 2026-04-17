# Agentbook Setup

## Installation

### Option 1: From git repo (recommended)

Clone this repo somewhere permanent:

```bash
git clone https://github.com/youruser/agentbook.git ~/agentbook
```

### Option 2: From npm (once published)

No cloning needed - `agentbook` will work directly.

## Configuration

### 1. Register the skill (global)

Add to `~/.config/opencode/opencode.json`:

```jsonc
{
  "skills": {
    "paths": ["~/agentbook/skills"],
  },
}
```

### 2. Install the agents

Symlink or copy the agent files to your global config:

```bash
mkdir -p ~/.config/opencode/agents
ln -s ~/agentbook/agents/coordinator.md ~/.config/opencode/agents/coordinator.md
ln -s ~/agentbook/agents/worker.md ~/.config/opencode/agents/worker.md
```

### 3. Make coordinator the default agent (recommended)

Strongly recommend setting `"default_agent": "coordinator"` in `~/.config/opencode/opencode.json` or a project-local `opencode.json` so new sessions start in the right place immediately.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "coordinator"
}
```

See [opencode default_agent docs](https://opencode.ai/docs/config/#default-agent) for details.

### 4. Configure models (optional)

Override agent models per-project in `opencode.json`:

```jsonc
{
  "agent": {
    "coordinator": {
      "model": "anthropic/claude-opus-4-20250514",
    },
    "worker": {
      "model": "anthropic/claude-sonnet-4-20250514",
    },
  },
}
```

Or globally in `~/.config/opencode/opencode.json`.

### 5. Pre-allow bash permissions (optional)

To avoid permission prompts for agentbook commands, add to your config:

```jsonc
{
  "permission": {
    "bash": {
      "agentbook *": "allow",
    },
  },
}
```

## Usage

### Create a plan

```
@coordinator Add OAuth2 authentication to the API
```

### Execute a plan

```
@worker Resume plan <plan-name>
```

### Check progress from any session or worktree

```
What's the status of plan <plan-name>?
```

### Query the database directly

The CLI auto-resolves the database location when inside a git repo, so you can simply run:

```bash
agentbook summary <plan-name>
```

To override the database path (e.g., for non-git usage or testing):

```bash
AGENTBOOK_DB="/path/to/db/agentbook.db" agentbook summary <plan-name>
```

## File Structure

Agentbook stores its data under git's common directory, making it shared across all worktrees:

```
<repo-root>/
├── .git/
│   └── agentbook/
│       └── agentbook.db        # shared database
├── opencode.json
└── ...
```

> **Note:** Older versions stored data in `.opencode/agentbook.db`. Legacy locations are auto-migrated on first use (see below).

## Worktree Support & Migration

- **Shared storage:** The database lives at `<git-common-dir>/agentbook/agentbook.db`, which is shared across all git worktrees automatically. No configuration needed.
- **Auto-migration:** If a legacy `.opencode/agentbook.db` exists in a worktree and no shared DB exists yet, the CLI automatically copies it to the shared location on first use.
- **Precedence:** If both a shared DB and a legacy `.opencode/agentbook.db` exist, the shared DB takes precedence.
- **Non-git fallback:** Outside a git repo, the CLI falls back to `.opencode/agentbook.db` in the current directory.
- **Manual override:** Set `AGENTBOOK_DB` to point to any database file.
