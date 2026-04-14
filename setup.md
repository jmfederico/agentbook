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
ln -s ~/agentbook/agents/planner.md ~/.config/opencode/agents/planner.md
ln -s ~/agentbook/agents/worker.md ~/.config/opencode/agents/worker.md
```

### 3. Configure models (optional)

Override agent models per-project in `opencode.json`:

```jsonc
{
  "agent": {
    "planner": {
      "model": "anthropic/claude-opus-4-20250514",
    },
    "worker": {
      "model": "anthropic/claude-sonnet-4-20250514",
    },
  },
}
```

Or globally in `~/.config/opencode/opencode.json`.

### 4. Pre-allow bash permissions (optional)

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
@planner Add OAuth2 authentication to the API
```

### Execute a plan

```
@worker Resume plan <plan-id>
```

### Check progress from any session or worktree

```
What's the status of plan <plan-id>?
```

### Query the database directly

```bash
AGENTBOOK_DB="/path/to/main/repo/.opencode/agentbook.db" agentbook summary <plan-id>
```

## File Structure

After setup, your project will have:

```
<repo-root>/
├── .opencode/
│   ├── agentbook.db
│   └── plans/
│       └── <plan-id>.md
├── opencode.json
└── ...
```
