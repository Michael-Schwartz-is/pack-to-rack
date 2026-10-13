# Changelog

## 0.1 — 2026-10-13

- Preserve Windows drive letters when selecting sample folders on other drives.
- Save racks to the configured Live 12 User Library, with platform defaults when settings are unavailable.
- Show the exact saved preset path in manual-load messages, the status tooltip, and Max Console.
- Skip automatic-load polling on Windows; load the generated `.adg` manually.

The first numbered release includes the existing standalone converter and rack controls. Regression checks pass with simulated Windows paths and settings; end-to-end Windows Live testing remains pending.
