# Pack to Rack — one-file device

Version **0.2**. The device displays its version on startup. The Git tag `v0.2` identifies this release's source and AMXD.

**Save to:** click **Browse…** to choose any destination folder, or type/paste its full path. Each rack gets its own folder there, with its copied samples beside the `.adg`. The choice is stored with the device in your Live Set. Clear the field (or enter `User Library`) to use the detected library again. Custom destinations are used directly; the device does not append a Presets tree. An invalid destination stops the export instead of silently saving elsewhere.

**Pack 2 Rack.amxd** is the complete device. Copy that single file anywhere, or drag it into Live's User Library. No accompanying files or Python installation are needed.

Load it onto a MIDI track. Drop a sample folder into the large field, or click the drop field. After scanning, the field becomes **Build Rack**. **Change folder…** picks another pack. The converter exports a native Drum Rack with one pad per sample folder, with selector knobs named exactly after those folders, and opens it on a new MIDI track. Above 128 sounds per folder, use the Bank and Select controls. You may remove the builder after creating the rack.

Requirements: Max for Live, Sampler, and Max **9.1+**. Tested on Live 12.4.2 Suite / Max 9.1.4. Both JavaScript programs and the rack templates are stored within the AMXD. Node runs inside Max's included runtime; there are no npm dependencies. The device is self-contained by embedding its resources directly, rather than relying on externally referenced scripts.

By default, exports are saved in User Library/Presets/Instruments/Drum Rack/Pack to Rack; a custom Save to path overrides this. The source pack is never modified. **Copy samples** copies audio beside the exported rack; reference mode uses the original files. As before, exported racks use absolute sample paths: after moving an export, locate its Samples folder in Live and resave, or Collect All and Save the Live project.

The device reads the User Library location from the most recently saved readable Live 12 `Library.cfg`. Without readable settings, it uses `Documents/Ableton/User Library` on Windows and `Music/Ableton/User Library` on macOS. Windows drive letters and network paths are preserved. On Windows, drag the saved `.adg` into Live manually. The status message gives its exact path; hover over the status line or open Max's Console to see the full saved path. Each preset is inside a folder named after the rack at your chosen destination.

With an older device on Windows, already generated racks may be under `%USERPROFILE%/Music/Ableton/User Library/Presets/Instruments/Drum Rack/Pack to Rack`. Move the entire rack folder, including `Samples`, into your actual User Library, then locate the copied samples in Live and resave. Reload the updated AMXD for future exports.

The automatic loader targets Ableton Live 12 Suite on macOS. If opening fails, load the saved preset from your destination folder. There is no sound classification: each folder containing supported audio becomes its own pad. Nested folders stay separate; samples directly in the selected folder use its name. Folder and file ordering is natural. Up to 16 non-empty sample folders fit one rack; choose a smaller folder if there are more.

Verification: loaded from a folder with only the AMXD; generated and loaded a real 127-sample rack with seven pads. Embedded-code tests pass for the example kit, banks, selector coverage, note encoding, escaped filenames, sample copying, overwrite protection and invalid input, while disallowing Python and sidecar loading.

Templates derive from Ben Juodvalkis' MIT-licensed Ableton Device Creator. The license is embedded in the device's converter code. No sample audio is bundled in the AMXD.

Updated defaults: Sampler global output −12 dB; sample-layer gain 0 dB. The pad viewport opens at C1 and shows 16 pads, with unused pads empty. One selector macro is displayed per sample folder; bank controls stay within the pad. Folders occupy consecutive notes from C1. Reload older device instances to use the updated AMXD.

Pad controls: every drum pad contains an Instrument Rack with Sample Select, Attack, Decay, Sustain, Release, Tune, Level, and Velocity macros. Larger folders add a ninth Bank macro. The outer rack maps one selector per sample folder and rounds the visible slots to complete native columns (up to 16). Unused slots stay unmapped. Exact odd display counts can clip the pad grid and inner macros in Live 12.4.2. Sampler velocity-to-volume defaults to 35%; global output remains −12 dB, sample layers 0 dB. Envelope defaults preserve natural tails. Decay becomes audible when Sustain is lowered; Release follows note-off. These defaults apply to newly built racks. Reload the builder to use this version.
