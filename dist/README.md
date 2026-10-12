# Pack to Rack — one-file device

**Pack 2 Rack.amxd** is the complete device. Copy that single file anywhere, or drag it into Live's User Library. No accompanying files or Python installation are needed.

Load it onto a MIDI track. Drop a sample folder into the large field, or click the drop field. After scanning, the field becomes **Build Rack**. **Change folder…** picks another pack. The converter exports a native Drum Rack with one pad per detected drum type and Sample Select macros, and opens it on a new MIDI track. Above 128 sounds per type, use the Bank and Select controls. You may remove the builder after creating the rack.

Requirements: Max for Live, Sampler, and Max **9.1+**. Tested on Live 12.4.2 Suite / Max 9.1.4. Both JavaScript programs and the rack templates are stored within the AMXD. Node runs inside Max's included runtime; there are no npm dependencies. The device is self-contained by embedding its resources directly, rather than relying on externally referenced scripts.

Exports are saved in User Library/Presets/Instruments/Drum Rack/Pack to Rack. The source pack is never modified. **Copy samples** copies audio beside the exported rack; reference mode uses the original files. As before, exported racks use absolute sample paths: after moving an export, locate its Samples folder in Live and resave, or Collect All and Save the Live project.

The automatic loader targets Ableton Live 12 Suite on macOS. If opening fails, load the saved preset from Live's User Library. Input classification uses folder names and filenames; unknown files are retained as Other, and explicitly named loops are skipped. This compact device shows counts but does not offer per-file category editing.

Verification: loaded from a folder with only the AMXD; generated and loaded a real 127-sample rack with seven pads. Embedded-code tests pass for the example kit, banks, selector coverage, note encoding, escaped filenames, sample copying, overwrite protection and invalid input, while disallowing Python and sidecar loading.

Templates derive from Ben Juodvalkis' MIT-licensed Ableton Device Creator. The license is embedded in the device's converter code. No sample audio is bundled in the AMXD.

Updated defaults: Sampler global output −12 dB; sample-layer gain 0 dB. The pad viewport opens at C1 and shows 16 pads, with unused pads empty. One selector macro is displayed per active drum type; bank controls stay within the pad. The Sequential pads checkbox uses consecutive notes from C1 when enabled; when disabled, the fixed map uses kick C1, snare D1, closed hat F♯1, open hat A♯1, and the other established drum positions. Changing layouts affects newly built racks. Reload older device instances to use the updated AMXD.

Pad controls: every drum pad contains an Instrument Rack with Sample Select, Attack, Decay, Sustain, Release, Tune, Level, and Velocity macros. Larger categories add a ninth Bank macro. The outer rack maps one selector per drum type and rounds the visible slots to complete native columns (up to 16). Unused slots stay unmapped. Exact odd display counts can clip the pad grid and inner macros in Live 12.4.2. Sampler velocity-to-volume defaults to 35%; global output remains −12 dB, sample layers 0 dB. Envelope defaults preserve natural tails. Decay becomes audible when Sustain is lowered; Release follows note-off. These defaults apply to newly built racks. Reload the builder to use this version.
