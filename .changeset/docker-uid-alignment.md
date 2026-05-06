---
"@ai-hero/sandcastle": patch
---

Add Docker UID alignment via build-arg and pre-flight diagnostic. Dockerfile templates now accept `AGENT_UID`/`AGENT_GID` build-args (default 1000) and `sandcastle docker build-image` defaults them to the host UID/GID. The Docker provider gains `containerUid`/`containerGid` options and a pre-flight `docker image inspect` check that catches UID mismatches before container start. Templates also pre-create the standard agent config dirs (`.codex`, `.claude`, `.gemini`, `.config`) so single-file bind mounts under those dirs avoid the root-owned-parent EACCES bug. See ADR-0014.
