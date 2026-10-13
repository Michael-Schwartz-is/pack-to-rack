# Pack → Rack

A local sample-pack converter for Ableton Live 12 with **Sampler** (included in Suite). Pick a pack folder, review the detected categories, and export a native `.adg` Drum Rack: one pad per drum type, with a named Sample Select macro for every pad.

## Single-file Max for Live workflow

Use **dist/Pack 2 Rack.amxd**. A copy is installed in **User Library → Presets → MIDI Effects → Max MIDI Effect → Pack 2 Rack.amxd**. Load it onto a MIDI track, choose a folder, then click **Build Rack**. It creates and loads a native Sampler-selector rack on a new MIDI track.

The file includes the JavaScript converter, Live API controls, and compressed rack templates directly in Max's `node.codebox` and `v8.codebox` objects. It needs **no Python, script folder, web browser, server, npm packages, or separate Node installation**. Max's included Node runtime does the conversion. Copy or share just the AMXD.

Requires **Max 9.1 or newer** with Max for Live and Sampler. Verified on this Mac's **Live 12.4.2 Suite / Max 9.1.4**. Automatic preset opening currently targets Live 12 Suite on macOS; on other platforms the exported preset can be loaded from the User Library. Generated racks remain ordinary native Live devices. Sample-pack audio is external input; copied exports keep samples beside the rack and still use absolute paths (see below).

Verification: the AMXD was copied to a temporary folder containing no other files, loaded in Live, and generated a **127-sample, seven-pad rack** from a real drum pack. Tests also execute the actual converter code extracted from the delivered AMXD with Python and sidecar loading disallowed. They cover the 37-sample example, a 257-sample category, all selector positions, note encoding, XML escaping, copying, non-overwriting exports and input errors.

```sh
node tests/test_single_amxd.cjs
node tests/test_single_windows.cjs
node tests/test_single_live_loader.cjs
```

The earlier Python-backed package is retained under `m4l/Pack to Rack` as development history. The standalone AMXD does not use it. If an older instance is already loaded in a Set, load Pack 2 Rack to use this version.

Windows path and export regressions: the embedded worker preserves drive roots (`E:/…`, `C:\…`) and UNC paths instead of interpreting drive letters as macOS volume prefixes. Exports follow the User Library in the most recently written readable Live 12 `Library.cfg`, with platform defaults if settings are unavailable. Manual-load messages retain the actual `.adg` path, also available in the status tooltip and Max Console. Windows tests simulate Windows path semantics and settings on macOS; an end-to-end Windows Live run is still required.

## Device workflow

Drop a sample folder onto the device, or click the drop field. It scans automatically and the drop field becomes **Build Rack**. Edit the rack name above the button, then click to create and load the rack on a new MIDI track. **Change folder…** selects another pack.

- **Copy samples** (on): keep audio beside the exported rack. Off references the original pack.
- **Sequential pads** (off): fixed drum mapping. On places drum types consecutively from C1.

The status line shows sample/pad counts, progress, and errors. The device fits Live's compact device view. Rack macro displays use complete native columns: unused slots stay empty, so odd drum-type counts never clip the 4×4 pads or the inner controls. The retired browser app is preserved under `archive/browser-app`.

## What it builds

- WAV (PCM and float), AIFF/uncompressed AIFC, and FLAC audio.
- Categories inferred from the nearest descriptive folder and filenames. Generic hats are refined into open/closed hats where filenames specify them. Unrecognized sounds are retained on **Other**, with an option to exclude or reassign them.
- Stable MIDI pad locations: Kick C1, Snare D1, Clap D♯1, Closed Hat F♯1, Open Hat A♯1, generic Hi-Hat G♯1, plus separate cymbal, percussion and other pads. Root note and pad output both use C3 to preserve original sample pitch.
- One Instrument Rack per category with Sampler inside, and Sample Select, Attack, Decay, Sustain, Release, Tune, Level, and Velocity macros. One Sampler per category up to 128 samples. Non-overlapping Sample Select zones cover every value from 0 to 127. A knob may pass through several values for the same sound; all sounds are reachable.
- Above 128 samples, one Instrument Rack on the same pad holds banks of up to 128 sounds. **Select** chooses a sound within a bank; **Bank** chooses the bank. Select the pad and use its inner Bank knob. Maximum 16,384 samples per category; larger categories fail explicitly.
- Velocity-to-volume defaults to 35%, natural tails, no oscillator or filter coloration, and a shared choke group for hats.
- Naturally sorted samples and a `manifest.json` listing every pad and input sample. Export never overwrites an existing rack.

The scanner excludes paths explicitly named as loops/breaks by default. It does not listen to or classify audio with AI, and cannot detect an unlabeled loop. Use the checkbox to include named loops. Unsupported formats and invalid headers appear in the skipped-file list. AIFF and FLAC headers are checked; compressed payloads are not fully decoded during scanning.

## Samples and moving exports

**Copy samples** is enabled by default and creates a `Samples/` tree beside the rack. Originals are untouched. Sample references use absolute paths for reliable loading on this Mac. If you move an export folder or share it, locate its `Samples/` folder with Live's missing-file search and resave the rack. For a portable song project, use Live's **Collect All and Save**. Reference mode avoids copying but depends on your original pack staying in place.

## Command line

```sh
python3 rack.py "/path/to/pack/drum_hits"
python3 rack.py "/path/to/pack" --scan
python3 rack.py "/path/to/pack" --name "Jungle Drums" --output "/path/to/exports"
python3 rack.py "/path/to/pack" --reference
```

Optional `--assignments file.json` maps relative sample paths to a category ID or `skip`. Category IDs are `kick`, `snare`, `clap`, `rim`, `closed_hat`, `open_hat`, `hat`, `tom`, `crash`, `ride`, `cymbal`, `shaker`, `tambourine`, `perc`, `fx`, `other`.

## Verification

```sh
python3 -m unittest discover -s tests -v
```

Tests cover the 20-kick/10-snare/7-hat example, every selector position, MIDI receive-note encoding, natural sorting, XML escaping, copying and sample paths, non-overwriting exports, category edits, invalid files, float WAV/FLAC headers, and a 257-sample category with three banks. Every export also checks sample counts, paths and selector coverage before writing.

The generated rack has been loaded in the installed Ableton Live 12.4.2 Suite. A real run on Sample Magic Classic Jungle/drum_hits exported all 95 files as 25 kicks, 39 snares, 23 closed hats and 8 cymbals, with no skipped files. Live confirmed C1 receive and C3 send/root routing. Actual Live checks exposed the reverse-ordered Receive chooser; this is encoded correctly in the converter. Other Live editions/versions require Sampler and have not been tested.

The small synthetic `examples/Demo Pack` is generated by `scripts/make_demo.py` and can be used without an external pack. Commercial sample packs are never included in source control.

## Template credit

The bundled device templates derive from Ben Juodvalkis' MIT-licensed [Ableton Device Creator](https://github.com/ben-juodvalkis/Ableton-Device-Creator). Attribution and license are in `templates/`. No upstream executable code or sample audio is bundled.
