# Sandcastle

A TypeScript CLI for orchestrating AI coding agents in isolated Docker containers. Sandcastle handles the hard parts — building worktrees, invoking the agent, and merging commits back — so you can run AFK agents with a single `run()`.

## Prerequisites

- [Docker Desktop](https://www.docker.com/)
- [Git](https://git-scm.com/)

## Installation

```bash
pnpm add @ai-hero/sandcastle
```

## Quick start

```bash
# 1. Initialize — scaffolds .sandcastle/ config directory and builds the Docker image
cd /path/to/your/repo
npx sandcastle init

# 2. Set up environment variables in .sandcastle/.env
cp .sandcastle/.env.example .sandcastle/.env
# Edit .sandcastle/.env and fill in your values
```

```typescript
// 3. Run the agent via the JS API
import { run } from "@ai-hero/sandcastle";

await run({
  promptFile: ".sandcastle/prompt.md",
});
```

```bash
npx tsx main.ts
```

## CLI commands

### `sandcastle init`

Scaffolds the `.sandcastle/` config directory and builds the Docker image. This is the first command you run in a new repo.

| Option         | Required | Default            | Description                                |
| -------------- | -------- | ------------------ | ------------------------------------------ |
| `--image-name` | No       | `sandcastle:local` | Docker image name                          |
| `--agent`      | No       | `claude-code`      | Agent provider to use (e.g. `claude-code`) |

Creates the following files:

```
.sandcastle/
├── Dockerfile      # Sandbox environment (customize as needed)
├── prompt.md       # Agent instructions
├── .env.example    # Token placeholders
└── .gitignore      # Ignores .env, patches/, logs/
```

Errors if `.sandcastle/` already exists to prevent overwriting customizations.

### `sandcastle build-image`

Rebuilds the Docker image from an existing `.sandcastle/` directory. Use this after modifying the Dockerfile.

| Option         | Required | Default            | Description                                                                       |
| -------------- | -------- | ------------------ | --------------------------------------------------------------------------------- |
| `--image-name` | No       | `sandcastle:local` | Docker image name                                                                 |
| `--dockerfile` | No       | —                  | Path to a custom Dockerfile (build context will be the current working directory) |

### `sandcastle interactive`

Opens an interactive Claude Code session inside the sandbox. Syncs your repo in, launches Claude with TTY passthrough, and syncs changes back when you exit.

| Option         | Required | Default            | Description                |
| -------------- | -------- | ------------------ | -------------------------- |
| `--image-name` | No       | `sandcastle:local` | Docker image name          |
| `--model`      | No       | `claude-opus-4-6`  | Model to use for the agent |
| `--agent`      | No       | `claude-code`      | Agent provider to use      |

### `sandcastle remove-image`

Removes the Docker image.

| Option         | Required | Default            | Description       |
| -------------- | -------- | ------------------ | ----------------- |
| `--image-name` | No       | `sandcastle:local` | Docker image name |

## Prompts

Sandcastle uses a flexible prompt system. You write the prompt, and the engine executes it — no opinions about workflow, task management, or context sources are imposed.

### Prompt resolution

The prompt is resolved from one of three sources (in order of precedence):

1. `prompt: "inline string"` — pass an inline prompt directly via `RunOptions`
2. `promptFile: "./path/to/prompt.md"` — point to a specific file via `RunOptions`
3. `.sandcastle/prompt.md` — default location (created by `sandcastle init`)

`prompt` and `promptFile` are mutually exclusive — providing both is an error.

### Dynamic context with `` !`command` ``

Use `` !`command` `` expressions in your prompt to pull in dynamic context. Each expression is replaced with the command's stdout before the prompt is sent to the agent.

Commands run **inside the sandbox** after sync-in and `onSandboxReady` hooks, so they see the same repo state the agent sees (including installed dependencies).

```markdown
# Open issues

!`gh issue list --state open --json number,title,body,comments,labels --limit 20`

# Recent commits

!`git log --oneline -10`
```

If any command exits with a non-zero code, the run fails immediately with an error.

### Prompt arguments with `{{KEY}}`

Use `{{KEY}}` placeholders in your prompt to inject values from the `promptArgs` option. This is useful for reusing the same prompt file across multiple runs with different parameters.

```typescript
import { run } from "@ai-hero/sandcastle";

await run({
  promptFile: "./my-prompt.md",
  promptArgs: { ISSUE_NUMBER: 42, PRIORITY: "high" },
});
```

In the prompt file:

```markdown
Work on issue #{{ISSUE_NUMBER}} (priority: {{PRIORITY}}).
```

Prompt argument substitution runs on the host before shell expression expansion, so `{{KEY}}` placeholders inside `` !`command` `` expressions are replaced first:

```markdown
!`gh issue view {{ISSUE_NUMBER}} --json body -q .body`
```

A `{{KEY}}` placeholder with no matching prompt argument is an error. Unused prompt arguments produce a warning.

### Early termination with `<promise>COMPLETE</promise>`

When the agent outputs `<promise>COMPLETE</promise>`, the orchestrator stops the iteration loop early. This is a convention you document in your prompt for the agent to follow — the engine never injects it.

This is useful for task-based workflows where the agent should stop once it has finished, rather than running all remaining iterations.

### Example prompt: GitHub Issue Backlog

This is a complete, copy-pasteable prompt for an agent that works through a repo's open GitHub issues:

```markdown
# Issues

!`gh issue list --state open --json number,title,body,comments,labels --limit 20`

# Recent work

!`git log --oneline -10`

# Task

Pick the highest-priority open issue and work on it. Follow this process:

1. Explore the codebase to understand the relevant code
2. Write a failing test for the expected behavior
3. Implement the fix or feature to make the test pass
4. Refactor if needed
5. Commit your changes with a descriptive message

When the task is complete, close the GitHub issue with `gh issue close <number>`
and output <promise>COMPLETE</promise> to signal you are done.

If the task is not complete, leave a comment on the issue describing progress.

Only work on a single issue per run.
```

Save this as `.sandcastle/prompt.md` and invoke it via the JS API (see [Node API](#node-api) below).

## Node API

Sandcastle exports a programmatic `run()` function for use in Node.js scripts, CI pipelines, or custom tooling.

```typescript
import { run } from "@ai-hero/sandcastle";

const result = await run({
  promptFile: "./my-prompt.md",
  maxIterations: 3,
  branch: "agent/fix-123",
});

console.log(result.iterationsRun); // number of iterations executed
console.log(result.wasCompletionSignalDetected); // true if agent emitted <promise>COMPLETE</promise>
console.log(result.commits); // array of { sha } for commits created
console.log(result.branch); // target branch name
```

### `RunOptions`

| Option             | Type       | Default                       | Description                                                    |
| ------------------ | ---------- | ----------------------------- | -------------------------------------------------------------- |
| `prompt`           | string     | —                             | Inline prompt (mutually exclusive with `promptFile`)           |
| `promptFile`       | string     | `.sandcastle/prompt.md`       | Path to prompt file (mutually exclusive with `prompt`)         |
| `maxIterations`    | number     | `5`                           | Maximum iterations to run                                      |
| `hooks`            | object     | —                             | Lifecycle hooks (`onSandboxReady`)                             |
| `branch`           | string     | —                             | Target branch for sandbox work                                 |
| `model`            | string     | `claude-opus-4-6`             | Model to use for the agent                                     |
| `agent`            | string     | `claude-code`                 | Agent provider name                                            |
| `imageName`        | string     | `sandcastle:local`            | Docker image name for the sandbox                              |
| `promptArgs`       | PromptArgs | —                             | Key-value map for `{{KEY}}` placeholder substitution           |
| `logging`          | object     | file (auto-generated)         | `{ type: 'file', path }` or `{ type: 'stdout' }`               |
| `completionSignal` | string     | `<promise>COMPLETE</promise>` | Custom string the agent emits to stop the iteration loop early |
| `timeoutSeconds`   | number     | `900`                         | Timeout for the entire run in seconds                          |

### `RunResult`

| Field                         | Type        | Description                                        |
| ----------------------------- | ----------- | -------------------------------------------------- |
| `iterationsRun`               | number      | Number of iterations that were executed            |
| `wasCompletionSignalDetected` | boolean     | Whether the agent signaled completion              |
| `stdout`                      | string      | Agent output                                       |
| `commits`                     | `{ sha }[]` | Commits created during the run                     |
| `branch`                      | string      | Target branch name                                 |
| `logFilePath`                 | string?     | Path to the log file (only when logging to a file) |

Environment variables are resolved automatically from `.sandcastle/.env` and `process.env` — no need to pass them to the API. The required variables depend on the **agent provider** (see `sandcastle init` output for details).

## Configuration

### Config directory (`.sandcastle/`)

All per-repo sandbox configuration lives in `.sandcastle/`. Run `sandcastle init` to create it.

### Custom Dockerfile

The `.sandcastle/Dockerfile` controls the sandbox environment. The default template installs:

- **Node.js 22** (base image)
- **git**, **curl**, **jq** (system dependencies)
- **GitHub CLI** (`gh`)
- **Claude Code CLI**
- A non-root `agent` user (required — Claude runs as this user)

When customizing the Dockerfile, ensure you keep:

- A non-root user (the default `agent` user) for Claude to run as
- `git` (required for sync-in/sync-out)
- `gh` (required for issue fetching)
- Claude Code CLI installed and on PATH

Add your project-specific dependencies (e.g., language runtimes, build tools) to the Dockerfile as needed.

### Hooks

Hooks are arrays of `{ "command": "..." }` objects executed sequentially inside the sandbox. If any command exits with a non-zero code, execution stops immediately with an error.

| Hook             | When it runs            | Working directory      |
| ---------------- | ----------------------- | ---------------------- |
| `onSandboxReady` | After sync-in completes | Sandbox repo directory |

**`onSandboxReady`** runs after the repo is synced in. Use it for dependency installation or build steps (e.g., `npm install`).

Pass hooks programmatically via `run()`:

```ts
await run({
  hooks: {
    onSandboxReady: [{ command: "npm install" }],
  },
  // ...
});
```

## How it works

Sandcastle uses git primitives for reliable repo synchronization:

- **Sync-in**: Creates a `git bundle` on your host capturing all refs (including unpushed commits), copies it into the sandbox, and unpacks it. The sandbox always matches your host's committed state.
- **Sync-out**: Runs `git format-patch` inside the sandbox to extract new commits, copies the patches to your host, and applies them with `git am --3way`. Uncommitted changes (staged, unstaged, and untracked files) are also captured.

This approach avoids GitHub round-trips and produces clean, replayable commit history.

## Development

```bash
npm install
npm run build    # Build with tsgo
npm test         # Run tests with vitest
npm run typecheck # Type-check
```

## License

MIT
