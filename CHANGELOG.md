# Changelog

## 0.2 — 2026-10-14

- Choose a save destination with Browse or type a full folder path, on any drive.
- Use folder names directly for pads and selector knobs. Keep each folder's sounds together without classifying filenames or merging unrelated folders into Other.
- Put folders on consecutive pads from C1. Include all supported audio; filenames containing loop/break no longer cause exclusion.
- Store the destination as a device parameter in the Live Set. Each rack and its copied samples stay together in their own folder at that destination.
- Keep User Library as the default; clearing the destination returns to automatic library detection.
- Give the status line more room and keep it on one line.

This release addresses destination selection. The report of missing sounds on Windows is still being investigated; it is not claimed fixed here.

## 0.1 — 2026-10-13

- Preserve Windows drive letters when selecting sample folders on other drives.
- Save racks to the configured Live 12 User Library, with platform defaults when settings are unavailable.
- Show the exact saved preset path in manual-load messages, the status tooltip, and Max Console.
- Skip automatic-load polling on Windows; load the generated `.adg` manually.

The first numbered release includes the existing standalone converter and rack controls. Regression checks pass with simulated Windows paths and settings; end-to-end Windows Live testing remains pending.
