# Pack to Rack — Max for Live

Load **Pack to Rack.amxd** onto a MIDI track in Ableton Live 12 Suite on this Mac.

1. Click **Choose pack…** and select a pack's drum-hits folder (or drop a folder on the folder row).
2. Review the sample-count summary. **Copy samples** copies the audio into the generated rack folder; switching it off references the original pack.
3. Click **Build Rack**. The device exports the native Sampler-selector Drum Rack and loads it on a **new MIDI track**. Existing tracks and clips are preserved.
4. Program a beat and turn the rack's Select macros. The builder is no longer needed for playback.

Presets are saved in **User Library → Presets → Instruments → Drum Rack → Pack to Rack**. If macOS cannot automatically open the generated preset, load it from that location in Live's browser. This is Live's own preset browser; no web browser is used.

Keep this entire **Pack to Rack** folder together: the AMXD is an unfrozen device with adjacent JS scripts and an `engine` folder. It runs the Python converter locally through Max's bundled Node runtime. This Mac's existing Homebrew Python is used; there is no web server to launch. Folder choice resets when the builder is reloaded. Classification rules and supported formats match the Python converter. Per-file category editing remains available through the CLI; this compact device provides folder selection and summary counts.

Requires Max for Live and Sampler; tested on installed Live 12.4.2 Suite. Automatic preset opening currently targets Ableton Live 12 Suite on macOS. The generated rack remains an ordinary native Live rack.

Verified in Live: the device starts, the repaired momentary-button wiring responds, and GS_SHDWS_Drum One Shots exports and loads on new tracks with all **72 samples** (20 kicks, 20 snares, 10 open hats, 22 hi-hats). Worker integration tests also cover scanning, building, sample counts, copied paths, and failure handling.

The first button wiring incorrectly filtered momentary-button bangs through `sel 1`; the corrected package uses `t b` to pass each click as a bang. Reload old device instances to use the corrected patch.
