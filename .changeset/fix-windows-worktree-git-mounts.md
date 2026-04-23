---
"@ai-hero/sandcastle": patch
---

Fix git worktree mounts broken on Windows hosts (issue #410). On Windows, the parent `.git` directory is now mounted at a deterministic POSIX path inside the sandbox, and the worktree's `.git` file is patched with a corrected `gitdir:` path that resolves inside the Linux container.
