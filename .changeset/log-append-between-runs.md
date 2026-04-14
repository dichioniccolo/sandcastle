---
"@ai-hero/sandcastle": patch
---

Log files now append between runs instead of overwriting. Each run writes a `--- Run started: <ISO timestamp> ---` delimiter header, preserving logs from previous runs of the same branch+agent combination.
