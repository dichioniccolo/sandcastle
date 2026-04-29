---
"@ai-hero/sandcastle": patch
---

Fix `WorktreeManager.pruneStale` deleting active worktrees when `.sandcastle` (or any ancestor of the repo directory) is a symlink. `git worktree list` returns canonicalized paths, so the un-canonicalized prefix never matched the active set and parallel `createSandbox()` calls would wipe each other's worktrees mid-run, surfacing as `spawn /bin/sh ENOENT`.
