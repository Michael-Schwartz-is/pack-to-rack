{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 8,
      "minor": 1,
      "revision": 2,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [
      0,
      0,
      800,
      600
    ],
    "openrect": [
      0,
      0,
      480,
      169
    ],
    "bglocked": 0,
    "openinpresentation": 1,
    "default_fontsize": 10.0,
    "default_fontface": 0,
    "default_fontname": "Arial Bold",
    "gridonopen": 1,
    "gridsize": [
      8.0,
      8.0
    ],
    "gridsnaponopen": 1,
    "objectsnaponopen": 1,
    "statusbarvisible": 2,
    "toolbarvisible": 1,
    "lefttoolbarpinned": 0,
    "toptoolbarpinned": 0,
    "righttoolbarpinned": 0,
    "bottomtoolbarpinned": 0,
    "toolbars_unpinned_last_save": 0,
    "tallnewobj": 0,
    "boxanimatetime": 500,
    "enablehscroll": 1,
    "enablevscroll": 1,
    "devicewidth": 480,
    "description": "",
    "digest": "",
    "tags": "",
    "style": "",
    "subpatcher_template": "",
    "title": "Pack to Rack",
    "boxes": [
      {
        "box": {
          "id": "midiin",
          "maxclass": "newobj",
          "patching_rect": [
            20,
            300,
            50,
            20
          ],
          "text": "midiin"
        }
      },
      {
        "box": {
          "id": "midiout",
          "maxclass": "newobj",
          "patching_rect": [
            20,
            350,
            50,
            20
          ],
          "text": "midiout"
        }
      },
      {
        "box": {
          "id": "title",
          "maxclass": "comment",
          "patching_rect": [
            0,
            0,
            100,
            20
          ],
          "fontsize": 17,
          "fontface": 1,
          "textcolor": [
            0.85,
            0.94,
            0.51,
            1
          ],
          "text": "PACK → RACK",
          "presentation": 1,
          "presentation_rect": [
            14,
            8,
            300,
            22
          ]
        }
      },
      {
        "box": {
          "id": "subtitle",
          "maxclass": "comment",
          "patching_rect": [
            0,
            0,
            100,
            20
          ],
          "fontsize": 11,
          "textcolor": [
            0.7,
            0.73,
            0.66,
            1
          ],
          "text": "Sample pack → Sampler selector Drum Rack",
          "presentation": 1,
          "presentation_rect": [
            14,
            32,
            440,
            18
          ]
        }
      },
      {
        "box": {
          "id": "choose",
          "maxclass": "live.text",
          "patching_rect": [
            0,
            0,
            100,
            20
          ],
          "texton": "Choose pack…",
          "varname": "choose_pack",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Choose pack",
              "parameter_shortname": "Choose pack",
              "parameter_type": 2,
              "parameter_enum": [
                "Idle",
                "Choose"
              ]
            }
          },
          "mode": 0,
          "parameter_enable": 1,
          "parameter_mappable": 0,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "int",
            ""
          ],
          "bgcolor": [
            0.22,
            0.26,
            0.17,
            1
          ],
          "bgoncolor": [
            0.85,
            0.94,
            0.51,
            1
          ],
          "textcolor": [
            0.95,
            0.96,
            0.9,
            1
          ],
          "fontsize": 12,
          "text": "Choose pack…",
          "presentation": 1,
          "presentation_rect": [
            14,
            58,
            132,
            28
          ]
        }
      },
      {
        "box": {
          "id": "build",
          "maxclass": "live.text",
          "patching_rect": [
            0,
            0,
            100,
            20
          ],
          "texton": "Build Rack",
          "varname": "build_rack",
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Build Rack",
              "parameter_shortname": "Build Rack",
              "parameter_type": 2,
              "parameter_enum": [
                "Idle",
                "Build"
              ]
            }
          },
          "mode": 0,
          "parameter_enable": 1,
          "parameter_mappable": 0,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "int",
            ""
          ],
          "bgcolor": [
            0.22,
            0.26,
            0.17,
            1
          ],
          "bgoncolor": [
            0.85,
            0.94,
            0.51,
            1
          ],
          "textcolor": [
            0.95,
            0.96,
            0.9,
            1
          ],
          "fontsize": 12,
          "text": "Build Rack",
          "presentation": 1,
          "presentation_rect": [
            156,
            58,
            116,
            28
          ]
        }
      },
      {
        "box": {
          "id": "copy",
          "maxclass": "live.text",
          "patching_rect": [
            0,
            0,
            100,
            20
          ],
          "texton": "Copy samples ✓",
          "varname": "copy_samples",
          "mode": 1,
          "numinlets": 1,
          "numoutlets": 2,
          "outlettype": [
            "int",
            ""
          ],
          "parameter_enable": 1,
          "saved_attribute_attributes": {
            "valueof": {
              "parameter_longname": "Copy samples",
              "parameter_shortname": "Copy samples",
              "parameter_type": 2,
              "parameter_enum": [
                "Reference originals",
                "Copy samples"
              ],
              "parameter_initial_enable": 1,
              "parameter_initial": [
                1
              ]
            }
          },
          "fontsize": 11,
          "text": "Reference originals",
          "presentation": 1,
          "presentation_rect": [
            282,
            58,
            184,
            28
          ]
        }
      },
      {
        "box": {
          "id": "folderlabel",
          "maxclass": "comment",
          "patching_rect": [
            0,
            0,
            100,
            20
          ],
          "varname": "pack_folder_label",
          "ignoreclick": 1,
          "fontsize": 10,
          "textcolor": [
            0.7,
            0.73,
            0.66,
            1
          ],
          "text": "No folder chosen",
          "presentation": 1,
          "presentation_rect": [
            14,
            92,
            452,
            18
          ]
        }
      },
      {
        "box": {
          "id": "statuslabel",
          "maxclass": "comment",
          "patching_rect": [
            0,
            0,
            100,
            20
          ],
          "varname": "pack_status_label",
          "fontsize": 11,
          "textcolor": [
            0.91,
            0.93,
            0.84,
            1
          ],
          "text": "Starting converter…",
          "presentation": 1,
          "presentation_rect": [
            14,
            114,
            452,
            44
          ]
        }
      },
      {
        "box": {
          "id": "drop",
          "maxclass": "dropfile",
          "patching_rect": [
            320,
            310,
            110,
            70
          ],
          "numinlets": 1,
          "numoutlets": 2,
          "types": [
            "fold"
          ],
          "presentation": 1,
          "presentation_rect": [
            14,
            92,
            452,
            18
          ]
        }
      },
      {
        "box": {
          "id": "choose_sel",
          "maxclass": "newobj",
          "patching_rect": [
            120,
            200,
            50,
            20
          ],
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "build_sel",
          "maxclass": "newobj",
          "patching_rect": [
            180,
            200,
            50,
            20
          ],
          "text": "t b"
        }
      },
      {
        "box": {
          "id": "dialog",
          "maxclass": "newobj",
          "patching_rect": [
            120,
            250,
            100,
            20
          ],
          "text": "opendialog fold"
        }
      },
      {
        "box": {
          "id": "folder_pre",
          "maxclass": "newobj",
          "patching_rect": [
            220,
            380,
            100,
            20
          ],
          "text": "prepend folder"
        }
      },
      {
        "box": {
          "id": "copy_pre",
          "maxclass": "newobj",
          "patching_rect": [
            340,
            230,
            100,
            20
          ],
          "text": "prepend copy"
        }
      },
      {
        "box": {
          "id": "build_msg",
          "maxclass": "message",
          "patching_rect": [
            180,
            250,
            50,
            20
          ],
          "text": "build"
        }
      },
      {
        "box": {
          "id": "worker",
          "maxclass": "newobj",
          "patching_rect": [
            120,
            420,
            350,
            20
          ],
          "text": "node.script pack_to_rack_worker.js @autostart 1 @defer 1"
        }
      },
      {
        "box": {
          "id": "route",
          "maxclass": "newobj",
          "patching_rect": [
            120,
            460,
            190,
            20
          ],
          "text": "route status folder built active"
        }
      },
      {
        "box": {
          "id": "setstatus",
          "maxclass": "newobj",
          "patching_rect": [
            120,
            500,
            90,
            20
          ],
          "text": "prepend set"
        }
      },
      {
        "box": {
          "id": "setfolder",
          "maxclass": "newobj",
          "patching_rect": [
            220,
            500,
            90,
            20
          ],
          "text": "prepend set"
        }
      },
      {
        "box": {
          "id": "builtpre",
          "maxclass": "newobj",
          "patching_rect": [
            320,
            500,
            90,
            20
          ],
          "text": "prepend built"
        }
      },
      {
        "box": {
          "id": "livejs",
          "maxclass": "newobj",
          "patching_rect": [
            320,
            540,
            160,
            20
          ],
          "text": "js pack_to_rack_live.js"
        }
      },
      {
        "box": {
          "id": "uistatus",
          "maxclass": "newobj",
          "patching_rect": [
            500,
            540,
            90,
            20
          ],
          "text": "route status"
        }
      },
      {
        "box": {
          "id": "active",
          "maxclass": "newobj",
          "patching_rect": [
            530,
            480,
            90,
            20
          ],
          "text": "prepend active"
        }
      },
      {
        "box": {
          "id": "loadcopy",
          "maxclass": "newobj",
          "patching_rect": [
            430,
            230,
            90,
            20
          ],
          "text": "loadmess 1"
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": [
            "midiin",
            0
          ],
          "destination": [
            "midiout",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "choose",
            0
          ],
          "destination": [
            "choose_sel",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "choose_sel",
            0
          ],
          "destination": [
            "dialog",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "dialog",
            0
          ],
          "destination": [
            "folder_pre",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "drop",
            0
          ],
          "destination": [
            "folder_pre",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "folder_pre",
            0
          ],
          "destination": [
            "worker",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "copy",
            0
          ],
          "destination": [
            "copy_pre",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "copy_pre",
            0
          ],
          "destination": [
            "worker",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "loadcopy",
            0
          ],
          "destination": [
            "copy",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "build",
            0
          ],
          "destination": [
            "build_sel",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "build_sel",
            0
          ],
          "destination": [
            "build_msg",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "build_msg",
            0
          ],
          "destination": [
            "worker",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "worker",
            0
          ],
          "destination": [
            "route",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            0
          ],
          "destination": [
            "setstatus",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "setstatus",
            0
          ],
          "destination": [
            "statuslabel",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            1
          ],
          "destination": [
            "setfolder",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "setfolder",
            0
          ],
          "destination": [
            "folderlabel",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            2
          ],
          "destination": [
            "builtpre",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "builtpre",
            0
          ],
          "destination": [
            "livejs",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "livejs",
            0
          ],
          "destination": [
            "worker",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "livejs",
            1
          ],
          "destination": [
            "uistatus",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "uistatus",
            0
          ],
          "destination": [
            "setstatus",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "route",
            3
          ],
          "destination": [
            "active",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "active",
            0
          ],
          "destination": [
            "choose",
            0
          ]
        }
      },
      {
        "patchline": {
          "source": [
            "active",
            0
          ],
          "destination": [
            "build",
            0
          ]
        }
      }
    ],
    "dependency_cache": [
      {
        "name": "pack_to_rack_worker.js",
        "bootpath": "/Users/michael/Documents/code/sample-pack-to-drum-rack/m4l/Pack to Rack",
        "patcherrelativepath": ".",
        "type": "TEXT",
        "implicit": 1
      },
      {
        "name": "pack_to_rack_live.js",
        "bootpath": "/Users/michael/Documents/code/sample-pack-to-drum-rack/m4l/Pack to Rack",
        "patcherrelativepath": ".",
        "type": "TEXT",
        "implicit": 1
      }
    ],
    "latency": 0,
    "project": {
      "version": 1,
      "creationdate": 3590052786,
      "modificationdate": 3590052786,
      "viewrect": [
        0.0,
        0.0,
        300.0,
        500.0
      ],
      "autoorganize": 0,
      "hideprojectwindow": 1,
      "showdependencies": 1,
      "autolocalize": 0,
      "contents": {
        "patchers": {}
      },
      "layout": {},
      "searchpath": {},
      "detailsvisible": 0,
      "amxdtype": 1835887981,
      "readonly": 0,
      "devpathtype": 0,
      "devpath": ".",
      "sortmode": 0,
      "viewmode": 0
    },
    "autosave": 0,
    "bgcolor": [
      0.12,
      0.13,
      0.11,
      1
    ]
  }
}
