---
"@ai-hero/sandcastle": patch
---

Define BranchStrategy types (head, merge-to-head, branch) and wire into bind-mount providers. Branch strategy is now configured on the sandbox provider at construction time via `branchStrategy` option, replacing the top-level `worktree` config field on SandboxFactory.
