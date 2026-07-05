// Generated from the 80-template reference catalog into JudgmentKit-owned layout data.
// This module is intentionally dependency-free and contains no runtime import of the reference library.

export const JUDGMENTKIT_TEMPLATE_LAYOUT_SPECS = [
  {
    "number": 1,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 11,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 32,
        "max": 80
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title4",
          "title5"
        ],
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 992,
          "height": 589.57
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 992,
          "height": 261.57
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 502.83,
          "width": 374.67,
          "height": 127.92
        }
      }
    ],
    "previewRef": "slide-preview:slide-01.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 169.33,
          "height": 68.15
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 247.45,
          "top": 41.18,
          "width": 169.33,
          "height": 68.15
        }
      },
      {
        "name": "title3",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title3",
        "textRole": "title",
        "frame": {
          "left": 862.98,
          "top": 41.18,
          "width": 375.69,
          "height": 68.15
        }
      },
      {
        "name": "title4",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title4",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 992,
          "height": 261.57
        }
      },
      {
        "name": "title5",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title5",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 502.83,
          "width": 374.67,
          "height": 127.92
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 992,
          "height": 261.57
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 502.83,
          "width": 374.67,
          "height": 127.92
        }
      }
    ]
  },
  {
    "number": 2,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 10,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 32,
        "max": 80
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title3",
          "title4"
        ],
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 992,
          "height": 589.57
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 992,
          "height": 261.57
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 502.83,
          "width": 374.67,
          "height": 127.92
        }
      }
    ],
    "previewRef": "slide-preview:slide-02.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 375.69,
          "height": 68.15
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 410.67,
          "height": 68.15
        }
      },
      {
        "name": "title3",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title3",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 992,
          "height": 261.57
        }
      },
      {
        "name": "title4",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title4",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 502.83,
          "width": 374.67,
          "height": 127.92
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 992,
          "height": 261.57
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 502.83,
          "width": 374.67,
          "height": 127.92
        }
      }
    ]
  },
  {
    "number": 3,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 8,
    "densityLevel": "sparse",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 32,
        "max": 80
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title3"
        ],
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 992,
          "height": 610.17
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 389.78,
          "width": 992,
          "height": 261.57
        }
      }
    ],
    "previewRef": "slide-preview:slide-03.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 375.69,
          "height": 68.15
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 410.67,
          "height": 68.15
        }
      },
      {
        "name": "title3",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title3",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 389.78,
          "width": 992,
          "height": 261.57
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 389.78,
          "width": 992,
          "height": 261.57
        }
      }
    ]
  },
  {
    "number": 4,
    "templateUse": "image-hero",
    "layoutFamily": "full-bleed-image",
    "contentRoles": [
      "title"
    ],
    "assetSlots": [
      {
        "contentKey": "image1",
        "role": "hero",
        "alt": "hero placeholder for Picture 15",
        "prompt": "dominant hero visual matching this template's visual system; subject or semantic cue: Picture 15; palette cues: tx1; image treatment: crop left 5.958%, top 0%, right 0%, bottom 26.52%; no embedded text, preserve generous crop room for slide overlays",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 409.65,
          "height": 640.15
        }
      }
    ],
    "useWhen": "Use when a single image or background carries the message and text should stay sparse.",
    "avoidWhen": "Avoid when dense copy, many data points, or multiple equally important regions need to fit.",
    "slotCount": 11,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 1,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 32,
        "max": 80
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title3",
          "title4"
        ],
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 616,
          "height": 589.56
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 409.65,
          "height": 640.15
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 616,
          "height": 261.57
        }
      }
    ],
    "previewRef": "slide-preview:slide-04.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 375.69,
          "height": 68.15
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 452,
          "top": 41.18,
          "width": 205.33,
          "height": 68.15
        }
      },
      {
        "name": "title3",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title3",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 616,
          "height": 261.57
        }
      },
      {
        "name": "title4",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title4",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 561.33,
          "width": 374.67,
          "height": 69.41
        }
      },
      {
        "name": "image1",
        "role": "hero",
        "slotKind": "image",
        "required": true,
        "description": "image1 visual slot",
        "contentKey": "image1",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 409.65,
          "height": 640.15
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 409.65,
          "height": 640.15
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 616,
          "height": 261.57
        }
      }
    ]
  },
  {
    "number": 5,
    "templateUse": "image-hero",
    "layoutFamily": "full-bleed-image",
    "contentRoles": [
      "title"
    ],
    "assetSlots": [
      {
        "contentKey": "image1",
        "role": "hero",
        "alt": "hero placeholder for Picture 6",
        "prompt": "dominant hero visual matching this template's visual system; subject or semantic cue: Picture 6; palette cues: tx1; image treatment: crop left 0%, top 15.849%, right 4.023%, bottom 15.849%; no embedded text, preserve generous crop room for slide overlays",
        "frame": {
          "left": 774.13,
          "top": 0,
          "width": 505.87,
          "height": 720
        }
      }
    ],
    "useWhen": "Use when a single image or background carries the message and text should stay sparse.",
    "avoidWhen": "Avoid when dense copy, many data points, or multiple equally important regions need to fit.",
    "slotCount": 10,
    "densityLevel": "sparse",
    "maxTextTokens": 3,
    "maxImageSlots": 1,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 32,
        "max": 80
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title2",
          "title3"
        ],
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 616,
          "height": 589.56
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 774.13,
          "top": 0,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 616,
          "height": 261.57
        }
      }
    ],
    "previewRef": "slide-preview:slide-05.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 375.69,
          "height": 68.15
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 616,
          "height": 261.57
        }
      },
      {
        "name": "title3",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title3",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 561.33,
          "width": 374.67,
          "height": 69.41
        }
      },
      {
        "name": "image1",
        "role": "hero",
        "slotKind": "image",
        "required": true,
        "description": "image1 visual slot",
        "contentKey": "image1",
        "frame": {
          "left": 774.13,
          "top": 0,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 786.67,
          "height": 261.57
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 581.33,
          "height": 172
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 774.13,
          "top": 0,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 182.55,
          "width": 616,
          "height": 261.57
        }
      }
    ]
  },
  {
    "number": 6,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 16,
    "densityLevel": "dense",
    "maxTextTokens": 11,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 24,
        "max": 24
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title4",
          "title6",
          "title8"
        ],
        "frame": {
          "left": 41.33,
          "top": 49.33,
          "width": 640,
          "height": 512.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "title2",
          "title3",
          "title5",
          "title7",
          "title9",
          "title10",
          "title11"
        ],
        "frame": {
          "left": 649.33,
          "top": 69.11,
          "width": 420,
          "height": 613.47
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 49.33,
          "width": 640,
          "height": 126.02
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 190.02,
          "width": 640,
          "height": 106.63
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 336.92,
          "width": 640,
          "height": 90.47
        }
      }
    ],
    "previewRef": "slide-preview:slide-06.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 49.33,
          "width": 640,
          "height": 126.02
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 649.33,
          "top": 69.11,
          "width": 420,
          "height": 56.55
        }
      },
      {
        "name": "title3",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title3",
        "textRole": "title",
        "frame": {
          "left": 649.33,
          "top": 177.11,
          "width": 420,
          "height": 48.47
        }
      },
      {
        "name": "title4",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title4",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 190.02,
          "width": 640,
          "height": 106.63
        }
      },
      {
        "name": "title5",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title5",
        "textRole": "title",
        "frame": {
          "left": 649.33,
          "top": 315.11,
          "width": 420,
          "height": 43.62
        }
      },
      {
        "name": "title6",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title6",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 336.92,
          "width": 640,
          "height": 90.47
        }
      },
      {
        "name": "title7",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title7",
        "textRole": "title",
        "frame": {
          "left": 649.33,
          "top": 417.11,
          "width": 420,
          "height": 38.78
        }
      },
      {
        "name": "title8",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title8",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 496.92,
          "width": 640,
          "height": 64.62
        }
      },
      {
        "name": "title9",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title9",
        "textRole": "title",
        "frame": {
          "left": 649.33,
          "top": 509.11,
          "width": 420,
          "height": 35.54
        }
      },
      {
        "name": "title10",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title10",
        "textRole": "title",
        "frame": {
          "left": 649.33,
          "top": 599.11,
          "width": 420,
          "height": 32.31
        }
      },
      {
        "name": "title11",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title11",
        "textRole": "title",
        "frame": {
          "left": 649.33,
          "top": 655.11,
          "width": 420,
          "height": 27.47
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 49.33,
          "width": 640,
          "height": 126.02
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 190.02,
          "width": 640,
          "height": 106.63
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 336.92,
          "width": 640,
          "height": 90.47
        }
      }
    ]
  },
  {
    "number": 7,
    "templateUse": "agenda",
    "layoutFamily": "agenda-list",
    "contentRoles": [
      "title",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for agenda, contents, or executive-read slides with ordered navigation points.",
    "avoidWhen": "Avoid for evidence slides, chart interpretation, or content that is not a navigational sequence.",
    "slotCount": 8,
    "densityLevel": "sparse",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 109.97
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 622.67,
          "top": 36.12,
          "width": 616,
          "height": 489.22
        }
      }
    ],
    "previewRef": "slide-preview:slide-07.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 109.97
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 622.67,
          "top": 36.12,
          "width": 616,
          "height": 489.22
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 622.67,
          "top": 36.12,
          "width": 616,
          "height": 489.22
        }
      }
    ]
  },
  {
    "number": 8,
    "templateUse": "data-table",
    "layoutFamily": "table-evidence",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for table-led evidence; this source has 2 table element(s).",
    "avoidWhen": "Avoid when the slide needs a visual thesis, sparse narrative, or image-led storytelling instead of table evidence.",
    "slotCount": 11,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title2",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 786.67,
          "height": 588.15
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 109.84,
          "width": 786.67,
          "height": 103.5
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 657.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      }
    ],
    "previewRef": "slide-preview:slide-08.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 375.69,
          "height": 36.24
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 109.84,
          "width": 786.67,
          "height": 103.5
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.84,
          "width": 786.67,
          "height": 103.5
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 657.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      }
    ]
  },
  {
    "number": 9,
    "templateUse": "data-table",
    "layoutFamily": "table-evidence",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for table-led evidence; this source has 2 table element(s).",
    "avoidWhen": "Avoid when the slide needs a visual thesis, sparse narrative, or image-led storytelling instead of table evidence.",
    "slotCount": 11,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title2",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 786.67,
          "height": 588.15
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 109.84,
          "width": 786.67,
          "height": 103.5
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 657.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      }
    ],
    "previewRef": "slide-preview:slide-09.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 41.18,
          "width": 375.69,
          "height": 36.24
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 109.84,
          "width": 786.67,
          "height": 103.5
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.84,
          "width": 786.67,
          "height": 103.5
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 657.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      }
    ]
  },
  {
    "number": 10,
    "templateUse": "image-hero",
    "layoutFamily": "split-image-text",
    "contentRoles": [
      "title",
      "footer"
    ],
    "assetSlots": [
      {
        "contentKey": "image1",
        "role": "hero",
        "alt": "hero placeholder for Picture 7",
        "prompt": "dominant hero visual matching this template's visual system; subject or semantic cue: Picture 7; palette cues: tx1, #000000; image treatment: crop left 0%, top 15.849%, right 4.023%, bottom 15.849%; no embedded text, preserve generous crop room for slide overlays",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      }
    ],
    "useWhen": "Use when a single image or background carries the message and text should stay sparse.",
    "avoidWhen": "Avoid when dense copy, many data points, or multiple equally important regions need to fit.",
    "slotCount": 9,
    "densityLevel": "sparse",
    "maxTextTokens": 3,
    "maxImageSlots": 1,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title2"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      }
    ],
    "previewRef": "slide-preview:slide-10.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 73.22
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "image1",
        "role": "hero",
        "slotKind": "image",
        "required": true,
        "description": "image1 visual slot",
        "contentKey": "image1",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      }
    ]
  },
  {
    "number": 11,
    "templateUse": "agenda",
    "layoutFamily": "agenda-list",
    "contentRoles": [
      "title",
      "body",
      "label",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for agenda, contents, or executive-read slides with ordered navigation points.",
    "avoidWhen": "Avoid for evidence slides, chart interpretation, or content that is not a navigational sequence.",
    "slotCount": 9,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 786.67,
          "height": 617
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 87.65,
          "width": 786.67,
          "height": 565.47
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 1033.33,
          "top": 87.65,
          "width": 206.49,
          "height": 565.47
        }
      }
    ],
    "previewRef": "slide-preview:slide-11.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 786.67,
          "height": 44.58
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 87.65,
          "width": 786.67,
          "height": 565.47
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 1033.33,
          "top": 87.65,
          "width": 206.49,
          "height": 565.47
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 87.65,
          "width": 786.67,
          "height": 565.47
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 1033.33,
          "top": 87.65,
          "width": 206.49,
          "height": 565.47
        }
      }
    ]
  },
  {
    "number": 12,
    "templateUse": "agenda",
    "layoutFamily": "agenda-list",
    "contentRoles": [
      "title",
      "body",
      "label",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for agenda, contents, or executive-read slides with ordered navigation points.",
    "avoidWhen": "Avoid for evidence slides, chart interpretation, or content that is not a navigational sequence.",
    "slotCount": 19,
    "densityLevel": "dense",
    "maxTextTokens": 14,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 617
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "label1",
          "label3",
          "label4",
          "label5",
          "label6",
          "label7",
          "label8",
          "label9",
          "label10",
          "label11"
        ],
        "frame": {
          "left": 452,
          "top": 97.62,
          "width": 241.33,
          "height": 543.6
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 87.65,
          "width": 410.67,
          "height": 565.47
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 1069.33,
          "top": 87.65,
          "width": 170.49,
          "height": 565.47
        }
      }
    ],
    "previewRef": "slide-preview:slide-12.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 374.67,
          "height": 44.58
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 87.65,
          "width": 410.67,
          "height": 565.47
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 97.62,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 1069.33,
          "top": 87.65,
          "width": 170.49,
          "height": 565.47
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 154.79,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "label4",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label4",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 211.96,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "label5",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label5",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 269.12,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "label6",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label6",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 326.29,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "label7",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label7",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 383.46,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "label8",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label8",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 440.63,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "label9",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label9",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 497.8,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "label10",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label10",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 554.97,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "label11",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label11",
        "textRole": "label",
        "frame": {
          "left": 452,
          "top": 612.14,
          "width": 241.33,
          "height": 29.08
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 87.65,
          "width": 410.67,
          "height": 565.47
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 1069.33,
          "top": 87.65,
          "width": 170.49,
          "height": 565.47
        }
      }
    ]
  },
  {
    "number": 13,
    "templateUse": "image-hero",
    "layoutFamily": "split-image-text",
    "contentRoles": [
      "title",
      "footer"
    ],
    "assetSlots": [
      {
        "contentKey": "image1",
        "role": "hero",
        "alt": "hero placeholder for Picture 4",
        "prompt": "dominant hero visual matching this template's visual system; subject or semantic cue: Picture 4; palette cues: tx1, #000000; image treatment: crop left 0%, top 15.849%, right 4.023%, bottom 15.849%; no embedded text, preserve generous crop room for slide overlays",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      }
    ],
    "useWhen": "Use when a single image or background carries the message and text should stay sparse.",
    "avoidWhen": "Avoid when dense copy, many data points, or multiple equally important regions need to fit.",
    "slotCount": 9,
    "densityLevel": "sparse",
    "maxTextTokens": 3,
    "maxImageSlots": 1,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title2"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      }
    ],
    "previewRef": "slide-preview:slide-13.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 73.22
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "image1",
        "role": "hero",
        "slotKind": "image",
        "required": true,
        "description": "image1 visual slot",
        "contentKey": "image1",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 581.33,
          "height": 312
        }
      }
    ]
  },
  {
    "number": 14,
    "templateUse": "agenda",
    "layoutFamily": "agenda-list",
    "contentRoles": [
      "title",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for agenda, contents, or executive-read slides with ordered navigation points.",
    "avoidWhen": "Avoid for evidence slides, chart interpretation, or content that is not a navigational sequence.",
    "slotCount": 17,
    "densityLevel": "dense",
    "maxTextTokens": 14,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title2",
          "title4",
          "title6",
          "title8",
          "title10",
          "title12"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 596.52
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "title3",
          "title5",
          "title7",
          "title9",
          "title11",
          "title13"
        ],
        "frame": {
          "left": 124.61,
          "top": 207.3,
          "width": 532.72,
          "height": 425.34
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-14.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 73.22
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 207.3,
          "width": 56.98,
          "height": 42.5
        }
      },
      {
        "name": "title3",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title3",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 207.3,
          "width": 532.72,
          "height": 42.5
        }
      },
      {
        "name": "title4",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title4",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 284.79,
          "width": 56.98,
          "height": 42.5
        }
      },
      {
        "name": "title5",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title5",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 284.79,
          "width": 532.72,
          "height": 42.5
        }
      },
      {
        "name": "title6",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title6",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 362.29,
          "width": 56.98,
          "height": 42.5
        }
      },
      {
        "name": "title7",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title7",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 362.29,
          "width": 532.72,
          "height": 42.5
        }
      },
      {
        "name": "title8",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title8",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 437.47,
          "width": 56.98,
          "height": 42.5
        }
      },
      {
        "name": "title9",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title9",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 437.47,
          "width": 532.72,
          "height": 42.5
        }
      },
      {
        "name": "title10",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title10",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 513.8,
          "width": 56.98,
          "height": 42.5
        }
      },
      {
        "name": "title11",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title11",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 513.8,
          "width": 532.72,
          "height": 42.5
        }
      },
      {
        "name": "title12",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title12",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 590.14,
          "width": 56.98,
          "height": 42.5
        }
      },
      {
        "name": "title13",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title13",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 590.14,
          "width": 532.72,
          "height": 42.5
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 15,
    "templateUse": "agenda",
    "layoutFamily": "agenda-list",
    "contentRoles": [
      "title",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for agenda, contents, or executive-read slides with ordered navigation points.",
    "avoidWhen": "Avoid for evidence slides, chart interpretation, or content that is not a navigational sequence.",
    "slotCount": 22,
    "densityLevel": "dense",
    "maxTextTokens": 14,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "title2",
          "title4",
          "title6",
          "title8",
          "title10",
          "title12"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 596.52
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "title3",
          "title5",
          "title7",
          "title9",
          "title11",
          "title13"
        ],
        "frame": {
          "left": 124.61,
          "top": 207.3,
          "width": 1035.49,
          "height": 425.34
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 124.61,
          "top": 207.3,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 124.61,
          "top": 284.79,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 124.61,
          "top": 362.29,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 124.61,
          "top": 437.47,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 124.61,
          "top": 513.8,
          "width": 1035.49,
          "height": 42.5
        }
      }
    ],
    "previewRef": "slide-preview:slide-15.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 73.22
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 207.3,
          "width": 110.76,
          "height": 42.5
        }
      },
      {
        "name": "title3",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title3",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 207.3,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "title4",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title4",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 284.79,
          "width": 110.76,
          "height": 42.5
        }
      },
      {
        "name": "title5",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title5",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 284.79,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "title6",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title6",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 362.29,
          "width": 110.76,
          "height": 42.5
        }
      },
      {
        "name": "title7",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title7",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 362.29,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "title8",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title8",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 437.47,
          "width": 110.76,
          "height": 42.5
        }
      },
      {
        "name": "title9",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title9",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 437.47,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "title10",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title10",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 513.8,
          "width": 110.76,
          "height": 42.5
        }
      },
      {
        "name": "title11",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title11",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 513.8,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "title12",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title12",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 590.14,
          "width": 110.76,
          "height": 42.5
        }
      },
      {
        "name": "title13",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title13",
        "textRole": "title",
        "frame": {
          "left": 124.61,
          "top": 590.14,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 124.61,
          "top": 207.3,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 124.61,
          "top": 284.79,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 124.61,
          "top": 362.29,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 124.61,
          "top": 437.47,
          "width": 1035.49,
          "height": 42.5
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 124.61,
          "top": 513.8,
          "width": 1035.49,
          "height": 42.5
        }
      }
    ]
  },
  {
    "number": 16,
    "templateUse": "data-table",
    "layoutFamily": "table-evidence",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for table-led evidence; this source has 1 table element(s).",
    "avoidWhen": "Avoid when the slide needs a visual thesis, sparse narrative, or image-led storytelling instead of table evidence.",
    "slotCount": 7,
    "densityLevel": "sparse",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.34,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 177.33,
          "width": 1197.34,
          "height": 452
        }
      }
    ],
    "previewRef": "slide-preview:slide-16.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 410.67,
          "height": 73.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 177.33,
          "width": 1197.34,
          "height": 452
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 177.33,
          "width": 1197.34,
          "height": 452
        }
      }
    ]
  },
  {
    "number": 17,
    "templateUse": "image-hero",
    "layoutFamily": "split-image-text",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [
      {
        "contentKey": "image1",
        "role": "hero",
        "alt": "hero placeholder for Picture 2",
        "prompt": "dominant hero visual matching this template's visual system; subject or semantic cue: Picture 2; palette cues: tx1, bg2, lt1; image treatment: crop left 0%, top 15.849%, right 4.023%, bottom 15.849%; no embedded text, preserve generous crop room for slide overlays",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      }
    ],
    "useWhen": "Use when a single image or background carries the message and text should stay sparse.",
    "avoidWhen": "Avoid when dense copy, many data points, or multiple equally important regions need to fit.",
    "slotCount": 11,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 1,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 281.22
        }
      }
    ],
    "previewRef": "slide-preview:slide-17.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 281.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 561.33,
          "width": 374.67,
          "height": 68
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 452.76,
          "top": 561.33,
          "width": 374.67,
          "height": 68
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "image1",
        "role": "hero",
        "slotKind": "image",
        "required": true,
        "description": "image1 visual slot",
        "contentKey": "image1",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 281.22
        }
      }
    ]
  },
  {
    "number": 18,
    "templateUse": "image-hero",
    "layoutFamily": "split-image-text",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [
      {
        "contentKey": "image1",
        "role": "hero",
        "alt": "hero placeholder for Picture 2",
        "prompt": "dominant hero visual matching this template's visual system; subject or semantic cue: Picture 2; palette cues: tx1, bg2, lt1; image treatment: crop left 0%, top 15.849%, right 4.023%, bottom 15.849%; no embedded text, preserve generous crop room for slide overlays",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      }
    ],
    "useWhen": "Use when a single image or background carries the message and text should stay sparse.",
    "avoidWhen": "Avoid when dense copy, many data points, or multiple equally important regions need to fit.",
    "slotCount": 11,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 1,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 603.5
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 281.22
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      }
    ],
    "previewRef": "slide-preview:slide-18.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 281.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 571.62,
          "width": 374.67,
          "height": 68
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 452.76,
          "top": 571.62,
          "width": 374.67,
          "height": 68
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "image1",
        "role": "hero",
        "slotKind": "image",
        "required": true,
        "description": "image1 visual slot",
        "contentKey": "image1",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 281.22
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 774.13,
          "top": 3.09,
          "width": 505.87,
          "height": 720
        }
      }
    ]
  },
  {
    "number": 19,
    "templateUse": "image-hero",
    "layoutFamily": "split-image-text",
    "contentRoles": [
      "title",
      "body"
    ],
    "assetSlots": [
      {
        "contentKey": "image1",
        "role": "hero",
        "alt": "hero placeholder for Picture 3",
        "prompt": "dominant hero visual matching this template's visual system; subject or semantic cue: Picture 3; palette cues: tx1, bg2, lt1; image treatment: crop left 5.958%, top 0%, right 0%, bottom 26.52%; no embedded text, preserve generous crop room for slide overlays",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 409.65,
          "height": 640.15
        }
      }
    ],
    "useWhen": "Use when a single image or background carries the message and text should stay sparse.",
    "avoidWhen": "Avoid when dense copy, many data points, or multiple equally important regions need to fit.",
    "slotCount": 10,
    "densityLevel": "sparse",
    "maxTextTokens": 3,
    "maxImageSlots": 1,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 24,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 281.22
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 409.65,
          "height": 640.15
        }
      }
    ],
    "previewRef": "slide-preview:slide-19.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 281.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 561.33,
          "width": 374.67,
          "height": 68
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 452.76,
          "top": 561.33,
          "width": 374.67,
          "height": 68
        }
      },
      {
        "name": "image1",
        "role": "hero",
        "slotKind": "image",
        "required": true,
        "description": "image1 visual slot",
        "contentKey": "image1",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 409.65,
          "height": 640.15
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 281.22
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 828,
          "top": 41.18,
          "width": 409.65,
          "height": 640.15
        }
      }
    ]
  },
  {
    "number": 20,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 11,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 0,
          "top": 388.57,
          "width": 1280,
          "height": 331.43
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      }
    ],
    "previewRef": "slide-preview:slide-20.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 0,
          "top": 388.57,
          "width": 1280,
          "height": 331.43
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      }
    ]
  },
  {
    "number": 21,
    "templateUse": "cover",
    "layoutFamily": "cover-image-field",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [
      {
        "contentKey": "image1",
        "role": "hero",
        "alt": "hero placeholder for Picture 4",
        "prompt": "dominant hero visual matching this template's visual system; subject or semantic cue: Picture 4; palette cues: tx1, #000000; image treatment: crop left 46.706%, top 0.209%, right 4.058%, bottom 4.713%; no embedded text, preserve generous crop room for slide overlays",
        "frame": {
          "left": 474.29,
          "top": -85.71,
          "width": 331.43,
          "height": 1280
        }
      }
    ],
    "useWhen": "Use for opening slides with a large title, strong visual field, and low body-copy density.",
    "avoidWhen": "Avoid when dense copy, many data points, or multiple equally important regions need to fit.",
    "slotCount": 12,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 1,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 474.29,
          "top": -85.71,
          "width": 331.43,
          "height": 1280
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      }
    ],
    "previewRef": "slide-preview:slide-21.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "image1",
        "role": "hero",
        "slotKind": "image",
        "required": true,
        "description": "image1 visual slot",
        "contentKey": "image1",
        "frame": {
          "left": 474.29,
          "top": -85.71,
          "width": 331.43,
          "height": 1280
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 474.29,
          "top": -85.71,
          "width": 331.43,
          "height": 1280
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      }
    ]
  },
  {
    "number": 22,
    "templateUse": "cover",
    "layoutFamily": "cover-image-field",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [
      {
        "contentKey": "image1",
        "role": "hero",
        "alt": "hero placeholder for Picture 4",
        "prompt": "dominant hero visual matching this template's visual system; subject or semantic cue: Picture 4; palette cues: tx1, #000000; image treatment: crop left 3.676%, top 0%, right 38.599%, bottom 4.923%; no embedded text, preserve generous crop room for slide overlays",
        "frame": {
          "left": 445.71,
          "top": -445.71,
          "width": 388.57,
          "height": 1280
        }
      }
    ],
    "useWhen": "Use for opening slides with a large title, strong visual field, and low body-copy density.",
    "avoidWhen": "Avoid when dense copy, many data points, or multiple equally important regions need to fit.",
    "slotCount": 12,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 1,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 445.71,
          "top": -445.71,
          "width": 388.57,
          "height": 1280
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      }
    ],
    "previewRef": "slide-preview:slide-22.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "image1",
        "role": "hero",
        "slotKind": "image",
        "required": true,
        "description": "image1 visual slot",
        "contentKey": "image1",
        "frame": {
          "left": 445.71,
          "top": -445.71,
          "width": 388.57,
          "height": 1280
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 445.71,
          "top": -445.71,
          "width": 388.57,
          "height": 1280
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      }
    ]
  },
  {
    "number": 23,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 10,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      }
    ],
    "previewRef": "slide-preview:slide-23.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 452,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 864,
          "top": 506.67,
          "width": 374.67,
          "height": 122.67
        }
      }
    ]
  },
  {
    "number": 24,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 12,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 452.38,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 485.23,
          "top": 435.29,
          "width": 309.64,
          "height": 150.43
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 896.18,
          "top": 435.29,
          "width": 309.64,
          "height": 150.43
        }
      }
    ],
    "previewRef": "slide-preview:slide-24.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 485.23,
          "top": 435.29,
          "width": 309.64,
          "height": 150.43
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 896.18,
          "top": 435.29,
          "width": 309.64,
          "height": 150.43
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 992,
          "height": 385.22
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 452.38,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 864,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 485.23,
          "top": 435.29,
          "width": 309.64,
          "height": 150.43
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 896.18,
          "top": 435.29,
          "width": 309.64,
          "height": 150.43
        }
      }
    ]
  },
  {
    "number": 25,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 9,
    "densityLevel": "moderate",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-25.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 26,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 10,
    "densityLevel": "dense",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 37.27,
          "width": 581.33,
          "height": 592.06
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 194.55,
          "width": 581.33,
          "height": 434.78
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 657.75,
          "top": 230.2,
          "width": 581.33,
          "height": 399.13
        }
      }
    ],
    "previewRef": "slide-preview:slide-26.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 37.27,
          "width": 581.33,
          "height": 54.55
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 194.55,
          "width": 581.33,
          "height": 434.78
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 657.75,
          "top": 230.2,
          "width": 581.33,
          "height": 399.13
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 194.55,
          "width": 581.33,
          "height": 434.78
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 657.75,
          "top": 230.2,
          "width": 581.33,
          "height": 399.13
        }
      }
    ]
  },
  {
    "number": 27,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 587.45
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 207.57,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 657.33,
          "top": 213.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 965.98,
          "top": 213.33,
          "width": 272.69,
          "height": 416
        }
      }
    ],
    "previewRef": "slide-preview:slide-27.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 207.57,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 685.17,
          "top": 441.39,
          "width": 225.24,
          "height": 167.88
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 993.51,
          "top": 441.39,
          "width": 225.65,
          "height": 167.88
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 207.57,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 657.33,
          "top": 213.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 965.98,
          "top": 213.33,
          "width": 272.69,
          "height": 416
        }
      }
    ]
  },
  {
    "number": 28,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 10,
    "densityLevel": "moderate",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 146.09,
          "width": 581.33,
          "height": 483.24
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 657.72,
          "top": 40.72,
          "width": 581.6,
          "height": 588.6
        }
      }
    ],
    "previewRef": "slide-preview:slide-28.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 146.09,
          "width": 581.33,
          "height": 483.24
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 146.09,
          "width": 581.33,
          "height": 483.24
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 657.72,
          "top": 40.72,
          "width": 581.6,
          "height": 588.6
        }
      }
    ]
  },
  {
    "number": 29,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 10,
    "densityLevel": "moderate",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 146.09,
          "width": 374.67,
          "height": 483.24
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 452,
          "top": 40.72,
          "width": 787.32,
          "height": 588.6
        }
      }
    ],
    "previewRef": "slide-preview:slide-29.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 146.09,
          "width": 374.67,
          "height": 483.24
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 146.09,
          "width": 374.67,
          "height": 483.24
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 452,
          "top": 40.72,
          "width": 787.32,
          "height": 588.6
        }
      }
    ]
  },
  {
    "number": 30,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 10,
    "densityLevel": "moderate",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 622.67,
          "top": 173.71,
          "width": 561.52,
          "height": 546.29
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 437.52,
          "width": 410.67,
          "height": 191.81
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 177.22
        }
      }
    ],
    "previewRef": "slide-preview:slide-30.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 177.22
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 437.52,
          "width": 410.67,
          "height": 191.81
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 622.67,
          "top": 173.71,
          "width": 561.52,
          "height": 546.29
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 437.52,
          "width": 410.67,
          "height": 191.81
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 616,
          "height": 177.22
        }
      }
    ]
  },
  {
    "number": 31,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 9,
    "densityLevel": "sparse",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 622.67,
          "top": 0,
          "width": 657.33,
          "height": 720
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.33,
          "height": 281.22
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 657.33,
          "top": 451.14,
          "width": 581.33,
          "height": 222.32
        }
      }
    ],
    "previewRef": "slide-preview:slide-31.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.33,
          "height": 281.22
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 657.33,
          "top": 451.14,
          "width": 581.33,
          "height": 222.32
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 622.67,
          "top": 0,
          "width": 657.33,
          "height": 720
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.33,
          "height": 281.22
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 657.33,
          "top": 451.14,
          "width": 581.33,
          "height": 222.32
        }
      }
    ]
  },
  {
    "number": 32,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 6,
    "densityLevel": "sparse",
    "maxTextTokens": 2,
    "maxImageSlots": 0,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 164.57,
          "width": 1197.33,
          "height": 188.76
        }
      }
    ],
    "previewRef": "slide-preview:slide-32.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 164.57,
          "width": 1197.33,
          "height": 188.76
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 164.57,
          "width": 1197.33,
          "height": 188.76
        }
      }
    ]
  },
  {
    "number": 33,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 9,
    "densityLevel": "moderate",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 421.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 216.38,
          "width": 581.33,
          "height": 240.95
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-33.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 216.38,
          "width": 581.33,
          "height": 240.95
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 216.38,
          "width": 581.33,
          "height": 240.95
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 34,
    "templateUse": "data-table",
    "layoutFamily": "table-evidence",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for table-led evidence; this source has 1 table element(s).",
    "avoidWhen": "Avoid when the slide needs a visual thesis, sparse narrative, or image-led storytelling instead of table evidence.",
    "slotCount": 8,
    "densityLevel": "moderate",
    "maxTextTokens": 3,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 580.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 1197.33,
          "height": 367
        }
      }
    ],
    "previewRef": "slide-preview:slide-34.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 1197.33,
          "height": 367
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 1197.33,
          "height": 367
        }
      }
    ]
  },
  {
    "number": 35,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 12,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-35.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 36,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 12,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 421.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 244
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 244
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-36.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 244
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 244
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 244
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 244
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 37,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "label",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 16,
    "densityLevel": "dense",
    "maxTextTokens": 9,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1",
          "body2"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 580.67
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "label1",
          "label2",
          "label3",
          "label4",
          "label5"
        ],
        "frame": {
          "left": 828,
          "top": 313.94,
          "width": 410.67,
          "height": 315.5
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 180.86,
          "width": 581.33,
          "height": 90.86
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 313.94,
          "width": 581.33,
          "height": 302.85
        }
      }
    ],
    "previewRef": "slide-preview:slide-37.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 180.86,
          "width": 581.33,
          "height": 90.86
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 313.94,
          "width": 581.33,
          "height": 302.85
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 828,
          "top": 313.94,
          "width": 410.67,
          "height": 57.61
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 828,
          "top": 377.94,
          "width": 410.67,
          "height": 57.61
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 828,
          "top": 442.5,
          "width": 410.67,
          "height": 57.61
        }
      },
      {
        "name": "label4",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label4",
        "textRole": "label",
        "frame": {
          "left": 828,
          "top": 506.49,
          "width": 410.67,
          "height": 57.61
        }
      },
      {
        "name": "label5",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label5",
        "textRole": "label",
        "frame": {
          "left": 828,
          "top": 571.83,
          "width": 410.67,
          "height": 57.61
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 180.86,
          "width": 581.33,
          "height": 90.86
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 313.94,
          "width": 581.33,
          "height": 302.85
        }
      }
    ]
  },
  {
    "number": 38,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 18,
    "densityLevel": "dense",
    "maxTextTokens": 10,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "body3",
          "body5",
          "body7"
        ],
        "frame": {
          "left": 72.89,
          "top": 138.32,
          "width": 549.78,
          "height": 534.86
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "body4",
          "body6",
          "body8"
        ],
        "frame": {
          "left": 688.32,
          "top": 138.32,
          "width": 549.78,
          "height": 534.86
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 61.06
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.68,
          "top": 110.67,
          "width": 580.99,
          "height": 102.67
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 72.89,
          "top": 230.48,
          "width": 549.78,
          "height": 154.7
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.68,
          "top": 398.67,
          "width": 580.99,
          "height": 102.67
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 72.89,
          "top": 518.48,
          "width": 549.78,
          "height": 154.7
        }
      }
    ],
    "previewRef": "slide-preview:slide-38.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 61.06
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 138.32,
          "width": 523.56,
          "height": 53.68
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 688.32,
          "top": 138.32,
          "width": 523.56,
          "height": 53.68
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 230.48,
          "width": 549.78,
          "height": 154.7
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 688.32,
          "top": 230.48,
          "width": 549.78,
          "height": 154.7
        }
      },
      {
        "name": "body5",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body5",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 426.32,
          "width": 523.56,
          "height": 53.68
        }
      },
      {
        "name": "body6",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body6",
        "textRole": "body",
        "frame": {
          "left": 688.32,
          "top": 426.32,
          "width": 523.56,
          "height": 53.68
        }
      },
      {
        "name": "body7",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body7",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 518.48,
          "width": 549.78,
          "height": 154.7
        }
      },
      {
        "name": "body8",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body8",
        "textRole": "body",
        "frame": {
          "left": 688.32,
          "top": 518.48,
          "width": 549.78,
          "height": 154.7
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 61.06
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.68,
          "top": 110.67,
          "width": 580.99,
          "height": 102.67
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 72.89,
          "top": 230.48,
          "width": 549.78,
          "height": 154.7
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.68,
          "top": 398.67,
          "width": 580.99,
          "height": 102.67
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 72.89,
          "top": 518.48,
          "width": 549.78,
          "height": 154.7
        }
      }
    ]
  },
  {
    "number": 39,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 20,
    "densityLevel": "dense",
    "maxTextTokens": 12,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 129.73
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body3",
          "body5",
          "body8",
          "body9"
        ],
        "frame": {
          "left": 72.89,
          "top": 215.03,
          "width": 549.78,
          "height": 444.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body4",
          "body6",
          "body7",
          "body10"
        ],
        "frame": {
          "left": 690.03,
          "top": 212.04,
          "width": 549.78,
          "height": 447.2
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 61.06
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.68,
          "top": 187.38,
          "width": 580.99,
          "height": 102.67
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.68,
          "top": 306.27,
          "width": 580.99,
          "height": 116.16
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 72.89,
          "top": 529.87,
          "width": 549.78,
          "height": 129.37
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 658.82,
          "top": 400.37,
          "width": 580.99,
          "height": 102.67
        }
      }
    ],
    "previewRef": "slide-preview:slide-39.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 61.06
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 104.83,
          "width": 581.33,
          "height": 61.02
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 658.48,
          "top": 104.83,
          "width": 581.33,
          "height": 61.02
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 215.03,
          "width": 523.56,
          "height": 53.68
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 690.03,
          "top": 212.04,
          "width": 523.56,
          "height": 72.56
        }
      },
      {
        "name": "body5",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body5",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 331,
          "width": 523.56,
          "height": 72.56
        }
      },
      {
        "name": "body6",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body6",
        "textRole": "body",
        "frame": {
          "left": 690.03,
          "top": 341.56,
          "width": 523.56,
          "height": 22.79
        }
      },
      {
        "name": "body7",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body7",
        "textRole": "body",
        "frame": {
          "left": 690.03,
          "top": 428.02,
          "width": 523.56,
          "height": 53.68
        }
      },
      {
        "name": "body8",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body8",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 460.52,
          "width": 523.56,
          "height": 22.79
        }
      },
      {
        "name": "body9",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body9",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 529.87,
          "width": 549.78,
          "height": 129.37
        }
      },
      {
        "name": "body10",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body10",
        "textRole": "body",
        "frame": {
          "left": 690.03,
          "top": 529.87,
          "width": 549.78,
          "height": 129.37
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 61.06
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.68,
          "top": 187.38,
          "width": 580.99,
          "height": 102.67
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.68,
          "top": 306.27,
          "width": 580.99,
          "height": 116.16
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 72.89,
          "top": 529.87,
          "width": 549.78,
          "height": 129.37
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 658.82,
          "top": 400.37,
          "width": 580.99,
          "height": 102.67
        }
      }
    ]
  },
  {
    "number": 40,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 16,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1",
          "body6"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1198.09,
          "height": 609.31
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "body4"
        ],
        "frame": {
          "left": 72.89,
          "top": 343.75,
          "width": 549.78,
          "height": 232.92
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body3",
          "body5"
        ],
        "frame": {
          "left": 688.51,
          "top": 343.75,
          "width": 549.78,
          "height": 232.92
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 822.67,
          "height": 61.06
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.68,
          "top": 317.62,
          "width": 580.99,
          "height": 138.67
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 72.89,
          "top": 343.75,
          "width": 523.56,
          "height": 92.16
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 72.89,
          "top": 474,
          "width": 549.78,
          "height": 102.67
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 657.3,
          "top": 317.62,
          "width": 580.99,
          "height": 138.67
        }
      }
    ],
    "previewRef": "slide-preview:slide-40.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 822.67,
          "height": 61.06
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 42.09,
          "top": 121.52,
          "width": 1197.33,
          "height": 171.05
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 343.75,
          "width": 523.56,
          "height": 92.16
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 688.51,
          "top": 343.75,
          "width": 523.56,
          "height": 92.16
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 72.89,
          "top": 474,
          "width": 549.78,
          "height": 102.67
        }
      },
      {
        "name": "body5",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body5",
        "textRole": "body",
        "frame": {
          "left": 688.51,
          "top": 474,
          "width": 549.78,
          "height": 102.67
        }
      },
      {
        "name": "body6",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body6",
        "textRole": "body",
        "frame": {
          "left": 42.09,
          "top": 589.81,
          "width": 1197.33,
          "height": 55.62
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 822.67,
          "height": 61.06
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.68,
          "top": 317.62,
          "width": 580.99,
          "height": 138.67
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 72.89,
          "top": 343.75,
          "width": 523.56,
          "height": 92.16
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 72.89,
          "top": 474,
          "width": 549.78,
          "height": 102.67
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 657.3,
          "top": 317.62,
          "width": 580.99,
          "height": 138.67
        }
      }
    ]
  },
  {
    "number": 41,
    "templateUse": "data-table",
    "layoutFamily": "table-evidence",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for table-led evidence; this source has 1 table element(s).",
    "avoidWhen": "Avoid when the slide needs a visual thesis, sparse narrative, or image-led storytelling instead of table evidence.",
    "slotCount": 10,
    "densityLevel": "dense",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1",
          "body2"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1198.1,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 822.67,
          "height": 61.06
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 42.09,
          "top": 121.52,
          "width": 1197.33,
          "height": 106.27
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 42.09,
          "top": 249.33,
          "width": 1197.34,
          "height": 380
        }
      }
    ],
    "previewRef": "slide-preview:slide-41.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 822.67,
          "height": 61.06
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 42.09,
          "top": 121.52,
          "width": 1197.33,
          "height": 106.27
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 42.09,
          "top": 249.33,
          "width": 1197.34,
          "height": 380
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 822.67,
          "height": 61.06
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 42.09,
          "top": 121.52,
          "width": 1197.33,
          "height": 106.27
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 42.09,
          "top": 249.33,
          "width": 1197.34,
          "height": 380
        }
      }
    ]
  },
  {
    "number": 42,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 14,
    "densityLevel": "moderate",
    "maxTextTokens": 6,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "body3"
        ],
        "frame": {
          "left": 74.15,
          "top": 279.77,
          "width": 523.56,
          "height": 320.07
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "body4"
        ],
        "frame": {
          "left": 688.89,
          "top": 279.77,
          "width": 523.56,
          "height": 320.07
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 657.68,
          "top": 248.8,
          "width": 580.99,
          "height": 172
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 688.89,
          "top": 279.77,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 42.94,
          "top": 248.8,
          "width": 580.99,
          "height": 172
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 74.15,
          "top": 279.77,
          "width": 523.56,
          "height": 110.07
        }
      }
    ],
    "previewRef": "slide-preview:slide-42.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 74.15,
          "top": 279.77,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 688.89,
          "top": 279.77,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 74.15,
          "top": 489.77,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 688.89,
          "top": 489.77,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 657.68,
          "top": 248.8,
          "width": 580.99,
          "height": 172
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 688.89,
          "top": 279.77,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 42.94,
          "top": 248.8,
          "width": 580.99,
          "height": 172
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 74.15,
          "top": 279.77,
          "width": 523.56,
          "height": 110.07
        }
      }
    ]
  },
  {
    "number": 43,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 14,
    "densityLevel": "moderate",
    "maxTextTokens": 6,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1",
          "body3"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 558.12
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "body4"
        ],
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 380.91
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-43.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 421.73,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 656.86,
          "top": 421.73,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 44,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 14,
    "densityLevel": "moderate",
    "maxTextTokens": 6,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1",
          "body3"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 558.12
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "body4"
        ],
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 380.91
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-44.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 421.73,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 656.86,
          "top": 421.73,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 656.86,
          "top": 213.33,
          "width": 581.33,
          "height": 172.51
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 45,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 12,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "body2",
          "body3"
        ],
        "frame": {
          "left": 657.33,
          "top": 35.91,
          "width": 581.33,
          "height": 593.43
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 657.33,
          "top": 35.91,
          "width": 581.33,
          "height": 177.42
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 657.33,
          "top": 243.26,
          "width": 581.33,
          "height": 179.19
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 657.33,
          "top": 452.37,
          "width": 581.33,
          "height": 176.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-45.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 35.91,
          "width": 581.33,
          "height": 177.42
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 243.26,
          "width": 581.33,
          "height": 179.19
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 452.37,
          "width": 581.33,
          "height": 176.97
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 657.33,
          "top": 35.91,
          "width": 581.33,
          "height": 177.42
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 657.33,
          "top": 243.26,
          "width": 581.33,
          "height": 179.19
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 657.33,
          "top": 452.37,
          "width": 581.33,
          "height": 176.97
        }
      }
    ]
  },
  {
    "number": 46,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "body2",
          "body3"
        ],
        "frame": {
          "left": 657.33,
          "top": 70.65,
          "width": 555.11,
          "height": 527.17
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 622.67,
          "top": 41.33,
          "width": 616,
          "height": 172
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 622.67,
          "top": 248.8,
          "width": 616,
          "height": 172
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 622.67,
          "top": 457.33,
          "width": 616,
          "height": 172
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 517.39,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 657.33,
          "top": 70.65,
          "width": 555.11,
          "height": 113.36
        }
      }
    ],
    "previewRef": "slide-preview:slide-46.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 517.39,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 70.65,
          "width": 555.11,
          "height": 113.36
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 279.77,
          "width": 555.11,
          "height": 110.07
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 488.85,
          "width": 555.11,
          "height": 108.97
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 622.67,
          "top": 41.33,
          "width": 616,
          "height": 172
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 622.67,
          "top": 248.8,
          "width": 616,
          "height": 172
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 622.67,
          "top": 457.33,
          "width": 616,
          "height": 172
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 517.39,
          "height": 109.97
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 657.33,
          "top": 70.65,
          "width": 555.11,
          "height": 113.36
        }
      }
    ]
  },
  {
    "number": 47,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "body2",
          "body3"
        ],
        "frame": {
          "left": 688.89,
          "top": 72.3,
          "width": 523.56,
          "height": 528.74
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 582.6,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 657.68,
          "top": 248.8,
          "width": 580.99,
          "height": 172
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 688.89,
          "top": 279.77,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 657.68,
          "top": 41.33,
          "width": 580.99,
          "height": 172
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 688.89,
          "top": 72.3,
          "width": 523.56,
          "height": 110.07
        }
      }
    ],
    "previewRef": "slide-preview:slide-47.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 582.6,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 688.89,
          "top": 72.3,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 688.89,
          "top": 279.77,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 688.89,
          "top": 490.97,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 582.6,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 657.68,
          "top": 248.8,
          "width": 580.99,
          "height": 172
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 688.89,
          "top": 279.77,
          "width": 523.56,
          "height": 110.07
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 657.68,
          "top": 41.33,
          "width": 580.99,
          "height": 172
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 688.89,
          "top": 72.3,
          "width": 523.56,
          "height": 110.07
        }
      }
    ]
  },
  {
    "number": 48,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 14,
    "densityLevel": "moderate",
    "maxTextTokens": 6,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "body2",
          "body3",
          "body4"
        ],
        "frame": {
          "left": 660.62,
          "top": 41.33,
          "width": 578.04,
          "height": 573.12
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 537.6,
          "top": 0,
          "width": 742.4,
          "height": 720
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 582.6,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 660.62,
          "top": 195.68,
          "width": 578.04,
          "height": 110.07
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 660.62,
          "top": 41.33,
          "width": 578.04,
          "height": 110.07
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 660.62,
          "top": 350.03,
          "width": 578.04,
          "height": 110.07
        }
      }
    ],
    "previewRef": "slide-preview:slide-48.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 582.6,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 41.33,
          "width": 578.04,
          "height": 110.07
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 195.68,
          "width": 578.04,
          "height": 110.07
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 350.03,
          "width": 578.04,
          "height": 110.07
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 504.38,
          "width": 578.04,
          "height": 110.07
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 537.6,
          "top": 0,
          "width": 742.4,
          "height": 720
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 582.6,
          "height": 109.97
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 660.62,
          "top": 195.68,
          "width": 578.04,
          "height": 110.07
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 660.62,
          "top": 41.33,
          "width": 578.04,
          "height": 110.07
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 660.62,
          "top": 350.03,
          "width": 578.04,
          "height": 110.07
        }
      }
    ]
  },
  {
    "number": 49,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "label",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 17,
    "densityLevel": "dense",
    "maxTextTokens": 14,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "label1",
          "label2",
          "label3",
          "label4",
          "label5",
          "label6"
        ],
        "frame": {
          "left": 452.62,
          "top": 41.33,
          "width": 187.38,
          "height": 589.34
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "body2",
          "body3",
          "body4",
          "body5",
          "body6"
        ],
        "frame": {
          "left": 660.62,
          "top": 41.33,
          "width": 578.04,
          "height": 589.34
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-49.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 374.67,
          "height": 109.97
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 452.62,
          "top": 41.33,
          "width": 187.38,
          "height": 68
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 41.33,
          "width": 578.04,
          "height": 68
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 452.62,
          "top": 146.67,
          "width": 187.38,
          "height": 68
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 146.67,
          "width": 578.04,
          "height": 68
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 452.62,
          "top": 249.33,
          "width": 187.38,
          "height": 68
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 249.33,
          "width": 578.04,
          "height": 68
        }
      },
      {
        "name": "label4",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label4",
        "textRole": "label",
        "frame": {
          "left": 452.62,
          "top": 353.33,
          "width": 187.38,
          "height": 68
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 353.33,
          "width": 578.04,
          "height": 68
        }
      },
      {
        "name": "label5",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label5",
        "textRole": "label",
        "frame": {
          "left": 452.62,
          "top": 457.33,
          "width": 187.38,
          "height": 68
        }
      },
      {
        "name": "body5",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body5",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 457.33,
          "width": 578.04,
          "height": 68
        }
      },
      {
        "name": "label6",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label6",
        "textRole": "label",
        "frame": {
          "left": 452.62,
          "top": 562.67,
          "width": 187.38,
          "height": 68
        }
      },
      {
        "name": "body6",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body6",
        "textRole": "body",
        "frame": {
          "left": 660.62,
          "top": 562.67,
          "width": 578.04,
          "height": 68
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 50,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "label",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 15,
    "densityLevel": "dense",
    "maxTextTokens": 11,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 374.67,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "label1",
          "label2",
          "label3",
          "label4"
        ],
        "frame": {
          "left": 509.33,
          "top": 249.33,
          "width": 196,
          "height": 381.34
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "body3",
          "body4",
          "body5"
        ],
        "frame": {
          "left": 732,
          "top": 249.33,
          "width": 506.67,
          "height": 381.34
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ],
    "previewRef": "slide-preview:slide-50.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 374.67,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 509.33,
          "top": 249.33,
          "width": 196,
          "height": 68
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 732,
          "top": 249.33,
          "width": 506.67,
          "height": 68
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 509.33,
          "top": 353.33,
          "width": 196,
          "height": 68
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 732,
          "top": 353.33,
          "width": 506.67,
          "height": 68
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 509.33,
          "top": 457.33,
          "width": 196,
          "height": 68
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 732,
          "top": 457.33,
          "width": 506.67,
          "height": 68
        }
      },
      {
        "name": "label4",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label4",
        "textRole": "label",
        "frame": {
          "left": 509.33,
          "top": 562.67,
          "width": 196,
          "height": 68
        }
      },
      {
        "name": "body5",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body5",
        "textRole": "body",
        "frame": {
          "left": 732,
          "top": 562.67,
          "width": 506.67,
          "height": 68
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ]
  },
  {
    "number": 51,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "label",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 12,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "label1",
          "label2",
          "label3",
          "label4",
          "label5",
          "label6"
        ],
        "frame": {
          "left": 657.77,
          "top": 38.48,
          "width": 578.04,
          "height": 592.59
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 582.6,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-51.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 582.6,
          "height": 109.97
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 657.77,
          "top": 38.48,
          "width": 578.04,
          "height": 70.85
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 657.77,
          "top": 142.83,
          "width": 578.04,
          "height": 70.85
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 657.77,
          "top": 247.18,
          "width": 578.04,
          "height": 70.85
        }
      },
      {
        "name": "label4",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label4",
        "textRole": "label",
        "frame": {
          "left": 657.77,
          "top": 351.53,
          "width": 578.04,
          "height": 70.85
        }
      },
      {
        "name": "label5",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label5",
        "textRole": "label",
        "frame": {
          "left": 657.77,
          "top": 455.87,
          "width": 578.04,
          "height": 70.85
        }
      },
      {
        "name": "label6",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label6",
        "textRole": "label",
        "frame": {
          "left": 657.77,
          "top": 560.22,
          "width": 578.04,
          "height": 70.85
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 582.6,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 52,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 453.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      }
    ],
    "previewRef": "slide-preview:slide-52.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 453.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 453.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      }
    ]
  },
  {
    "number": 53,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 12,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 32
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 145.33,
          "width": 350.54,
          "height": 484
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 145.33,
          "width": 350.86,
          "height": 484
        }
      }
    ],
    "previewRef": "slide-preview:slide-53.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 145.33,
          "width": 350.54,
          "height": 484
        }
      },
      {
        "name": "title2",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title2",
        "textRole": "title",
        "frame": {
          "left": 453.33,
          "top": 145.33,
          "width": 350.86,
          "height": 484
        }
      },
      {
        "name": "title3",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title3",
        "textRole": "title",
        "frame": {
          "left": 864.28,
          "top": 145.33,
          "width": 352.24,
          "height": 484
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 145.33,
          "width": 350.54,
          "height": 484
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 453.33,
          "top": 145.33,
          "width": 350.86,
          "height": 484
        }
      }
    ]
  },
  {
    "number": 54,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 453.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      }
    ],
    "previewRef": "slide-preview:slide-54.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 453.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 453.33,
          "top": 353.33,
          "width": 374.67,
          "height": 276
        }
      }
    ]
  },
  {
    "number": 55,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "body",
      "title",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 12,
    "densityLevel": "moderate",
    "maxTextTokens": 4,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 453.33,
          "top": 42.67,
          "width": 374.67,
          "height": 378.67
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 42.67,
          "width": 374.67,
          "height": 378.67
        }
      }
    ],
    "previewRef": "slide-preview:slide-55.png",
    "slots": [
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 453.33,
          "top": 42.67,
          "width": 374.67,
          "height": 378.67
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 42.67,
          "width": 374.67,
          "height": 378.67
        }
      },
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 525.33,
          "width": 616,
          "height": 104
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 453.33,
          "top": 42.67,
          "width": 374.67,
          "height": 378.67
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 864.28,
          "top": 42.67,
          "width": 374.67,
          "height": 378.67
        }
      }
    ]
  },
  {
    "number": 56,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 10,
    "densityLevel": "moderate",
    "maxTextTokens": 6,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.22
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-56.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 506.67,
          "width": 272.54,
          "height": 122.67
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 350.13,
          "top": 506.67,
          "width": 272.54,
          "height": 122.67
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 657.68,
          "top": 506.67,
          "width": 272.54,
          "height": 122.67
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 966.48,
          "top": 506.67,
          "width": 272.54,
          "height": 122.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 57,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "label",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 12,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "label1",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 487.88
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "label2",
          "body2"
        ],
        "frame": {
          "left": 450.83,
          "top": 298.51,
          "width": 274.95,
          "height": 225.49
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "label3",
          "body3"
        ],
        "frame": {
          "left": 863.33,
          "top": 298.51,
          "width": 274.36,
          "height": 225.49
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-57.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 41.33,
          "top": 298.51,
          "width": 169.33,
          "height": 27.55
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 450.83,
          "top": 298.51,
          "width": 169.33,
          "height": 27.55
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 863.33,
          "top": 298.51,
          "width": 169.33,
          "height": 27.55
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 401.33,
          "width": 272.54,
          "height": 122.67
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 453.24,
          "top": 401.33,
          "width": 272.54,
          "height": 122.67
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 865.15,
          "top": 401.33,
          "width": 272.54,
          "height": 122.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 58,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "label",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 16,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "label1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.67
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 147.17,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 73.85,
          "top": 189.69,
          "width": 309.64,
          "height": 269.48
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 452.33,
          "top": 147.17,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 484.85,
          "top": 189.69,
          "width": 309.64,
          "height": 269.48
        }
      }
    ],
    "previewRef": "slide-preview:slide-58.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 73.85,
          "top": 189.69,
          "width": 309.64,
          "height": 269.48
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 484.85,
          "top": 189.69,
          "width": 309.64,
          "height": 269.48
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 897.35,
          "top": 189.69,
          "width": 309.64,
          "height": 269.48
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 41.33,
          "top": 607.93,
          "width": 272.54,
          "height": 21.86
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 453.24,
          "top": 607.93,
          "width": 272.54,
          "height": 21.86
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 865.15,
          "top": 607.93,
          "width": 272.54,
          "height": 21.86
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 147.17,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 73.85,
          "top": 189.69,
          "width": 309.64,
          "height": 269.48
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 452.33,
          "top": 147.17,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 484.85,
          "top": 189.69,
          "width": 309.64,
          "height": 269.48
        }
      }
    ]
  },
  {
    "number": 59,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "label",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 15,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "label1"
        ],
        "frame": {
          "left": 64.98,
          "top": 349.17,
          "width": 225.24,
          "height": 253.73
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "label2"
        ],
        "frame": {
          "left": 474.4,
          "top": 349.17,
          "width": 225.24,
          "height": 254.68
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body3",
          "label3"
        ],
        "frame": {
          "left": 888.04,
          "top": 349.17,
          "width": 225.24,
          "height": 254.68
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.39,
          "top": 317.33,
          "width": 271.07,
          "height": 312
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 450.75,
          "top": 317.33,
          "width": 271.07,
          "height": 312
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 271.07,
          "height": 312
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ],
    "previewRef": "slide-preview:slide-59.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 64.98,
          "top": 349.17,
          "width": 225.24,
          "height": 176.17
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 474.4,
          "top": 349.17,
          "width": 225.24,
          "height": 176.17
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 888.04,
          "top": 349.17,
          "width": 225.24,
          "height": 176.17
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 64.98,
          "top": 582.65,
          "width": 181.68,
          "height": 20.25
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 477.41,
          "top": 582.12,
          "width": 177.1,
          "height": 21.73
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 891.06,
          "top": 582.12,
          "width": 177.1,
          "height": 21.73
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 864.39,
          "top": 317.33,
          "width": 271.07,
          "height": 312
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 450.75,
          "top": 317.33,
          "width": 271.07,
          "height": 312
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 271.07,
          "height": 312
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      }
    ]
  },
  {
    "number": 60,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 14,
    "densityLevel": "moderate",
    "maxTextTokens": 6,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 613.06
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 349.98,
          "top": 109.33,
          "width": 272.69,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 657.33,
          "top": 109.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 965.98,
          "top": 109.33,
          "width": 272.69,
          "height": 416
        }
      }
    ],
    "previewRef": "slide-preview:slide-60.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 539.31,
          "width": 272.54,
          "height": 109.87
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 349.63,
          "top": 539.31,
          "width": 273.03,
          "height": 109.87
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 657.68,
          "top": 539.31,
          "width": 272.54,
          "height": 109.87
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 965.98,
          "top": 539.31,
          "width": 273.03,
          "height": 109.87
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 349.98,
          "top": 109.33,
          "width": 272.69,
          "height": 416
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 657.33,
          "top": 109.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 965.98,
          "top": 109.33,
          "width": 272.69,
          "height": 416
        }
      }
    ]
  },
  {
    "number": 61,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 14,
    "densityLevel": "moderate",
    "maxTextTokens": 6,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 349.98,
          "top": 213.33,
          "width": 272.69,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 657.33,
          "top": 213.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 965.98,
          "top": 213.33,
          "width": 272.69,
          "height": 416
        }
      }
    ],
    "previewRef": "slide-preview:slide-61.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 64.98,
          "top": 253.45,
          "width": 225.24,
          "height": 167.88
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 373.33,
          "top": 253.45,
          "width": 225.65,
          "height": 167.88
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 681.33,
          "top": 253.45,
          "width": 225.24,
          "height": 167.88
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 989.67,
          "top": 253.45,
          "width": 225.65,
          "height": 167.88
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 349.98,
          "top": 213.33,
          "width": 272.69,
          "height": 416
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 657.33,
          "top": 213.33,
          "width": 271.07,
          "height": 416
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 965.98,
          "top": 213.33,
          "width": 272.69,
          "height": 416
        }
      }
    ]
  },
  {
    "number": 62,
    "templateUse": "metrics",
    "layoutFamily": "metric-led",
    "contentRoles": [
      "title",
      "body",
      "stat",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for KPI-heavy slides with multiple large numbers or quantified proof points.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 19,
    "densityLevel": "dense",
    "maxTextTokens": 11,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "stat1",
          "body2"
        ],
        "frame": {
          "left": 66.25,
          "top": 236.42,
          "width": 223.98,
          "height": 220.92
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat2",
          "body3"
        ],
        "frame": {
          "left": 376.19,
          "top": 236.42,
          "width": 223.98,
          "height": 220.92
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat3",
          "body4"
        ],
        "frame": {
          "left": 683.4,
          "top": 236.42,
          "width": 223.97,
          "height": 220.92
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat4",
          "body5"
        ],
        "frame": {
          "left": 993.34,
          "top": 236.42,
          "width": 223.97,
          "height": 220.92
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 271.07,
          "height": 278.9
        }
      },
      {
        "role": "bottom-caption-band",
        "frame": {
          "left": 0,
          "top": 565.45,
          "width": 1280,
          "height": 156
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 351.28,
          "top": 213.33,
          "width": 271.07,
          "height": 278.9
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 658.48,
          "top": 213.33,
          "width": 271.07,
          "height": 278.9
        }
      }
    ],
    "previewRef": "slide-preview:slide-62.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 42.09,
          "width": 581.61,
          "height": 104
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 66.25,
          "top": 236.42,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 376.19,
          "top": 236.42,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "stat3",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat3",
        "textRole": "stat",
        "frame": {
          "left": 683.4,
          "top": 236.42,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "stat4",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat4",
        "textRole": "stat",
        "frame": {
          "left": 993.34,
          "top": 236.42,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 73.25,
          "top": 392.67,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 383.19,
          "top": 392.67,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 690.39,
          "top": 392.67,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "body5",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body5",
        "textRole": "body",
        "frame": {
          "left": 1000.33,
          "top": 392.67,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 271.07,
          "height": 278.9
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 0,
          "top": 565.45,
          "width": 1280,
          "height": 156
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 351.28,
          "top": 213.33,
          "width": 271.07,
          "height": 278.9
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 658.48,
          "top": 213.33,
          "width": 271.07,
          "height": 278.9
        }
      }
    ]
  },
  {
    "number": 63,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "stat",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 14,
    "densityLevel": "dense",
    "maxTextTokens": 7,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "stat1",
          "body2"
        ],
        "frame": {
          "left": 683.4,
          "top": 375.85,
          "width": 223.97,
          "height": 220.92
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat2",
          "body3"
        ],
        "frame": {
          "left": 993.34,
          "top": 375.85,
          "width": 223.97,
          "height": 220.92
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 658.48,
          "top": 352.76,
          "width": 271.07,
          "height": 278.9
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 968.42,
          "top": 352.76,
          "width": 271.07,
          "height": 278.9
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 657.33,
          "top": 205.31,
          "width": 581.61,
          "height": 104
        }
      }
    ],
    "previewRef": "slide-preview:slide-63.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 205.31,
          "width": 581.61,
          "height": 104
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 683.4,
          "top": 375.85,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 993.34,
          "top": 375.85,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 690.39,
          "top": 532.1,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 1000.33,
          "top": 532.1,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 658.48,
          "top": 352.76,
          "width": 271.07,
          "height": 278.9
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 968.42,
          "top": 352.76,
          "width": 271.07,
          "height": 278.9
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 657.33,
          "top": 205.31,
          "width": 581.61,
          "height": 104
        }
      }
    ]
  },
  {
    "number": 64,
    "templateUse": "chart",
    "layoutFamily": "chart-evidence",
    "contentRoles": [
      "title",
      "body",
      "stat",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for chart-led evidence; this source has 1 chart element(s).",
    "avoidWhen": "Avoid when the content has no quantitative relationship or would be better as a narrative, image, or table.",
    "slotCount": 14,
    "densityLevel": "dense",
    "maxTextTokens": 7,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "stat1",
          "body2"
        ],
        "frame": {
          "left": 679.03,
          "top": 427.54,
          "width": 223.98,
          "height": 169.23
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat2",
          "body3"
        ],
        "frame": {
          "left": 988.97,
          "top": 427.54,
          "width": 223.98,
          "height": 169.23
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 580.19,
          "height": 570.61
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 657.33,
          "top": 179.45,
          "width": 555.61,
          "height": 169.46
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 67.06,
          "top": 131.73,
          "width": 537.97,
          "height": 527.51
        }
      }
    ],
    "previewRef": "slide-preview:slide-64.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 179.45,
          "width": 555.61,
          "height": 169.46
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 679.03,
          "top": 427.54,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 988.97,
          "top": 427.54,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 686.03,
          "top": 532.1,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 995.97,
          "top": 532.1,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 580.19,
          "height": 570.61
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 657.33,
          "top": 179.45,
          "width": 555.61,
          "height": 169.46
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 67.06,
          "top": 131.73,
          "width": 537.97,
          "height": 527.51
        }
      }
    ]
  },
  {
    "number": 65,
    "templateUse": "chart",
    "layoutFamily": "chart-evidence",
    "contentRoles": [
      "title",
      "body",
      "stat",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for chart-led evidence; this source has 1 chart element(s).",
    "avoidWhen": "Avoid when the content has no quantitative relationship or would be better as a narrative, image, or table.",
    "slotCount": 14,
    "densityLevel": "dense",
    "maxTextTokens": 7,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "stat1",
          "body2"
        ],
        "frame": {
          "left": 679.03,
          "top": 427.54,
          "width": 223.98,
          "height": 169.23
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat2",
          "body3"
        ],
        "frame": {
          "left": 988.97,
          "top": 427.54,
          "width": 223.98,
          "height": 169.23
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 580.19,
          "height": 570.61
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 657.33,
          "top": 179.45,
          "width": 555.61,
          "height": 169.46
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 67.06,
          "top": 131.73,
          "width": 537.97,
          "height": 527.51
        }
      }
    ],
    "previewRef": "slide-preview:slide-65.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 657.33,
          "top": 179.45,
          "width": 555.61,
          "height": 169.46
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 679.03,
          "top": 427.54,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 988.97,
          "top": 427.54,
          "width": 223.97,
          "height": 94.88
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 686.03,
          "top": 532.1,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 995.97,
          "top": 532.1,
          "width": 216.98,
          "height": 64.67
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 581.02,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 109.33,
          "width": 580.19,
          "height": 570.61
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 657.33,
          "top": 179.45,
          "width": 555.61,
          "height": 169.46
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 67.06,
          "top": 131.73,
          "width": 537.97,
          "height": 527.51
        }
      }
    ]
  },
  {
    "number": 66,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 453.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      }
    ],
    "previewRef": "slide-preview:slide-66.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 453.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 453.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      }
    ]
  },
  {
    "number": 67,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 251.11,
          "width": 374.67,
          "height": 378.22
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ],
    "previewRef": "slide-preview:slide-67.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 251.11,
          "width": 374.67,
          "height": 378.22
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 453.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 251.11,
          "width": 374.67,
          "height": 378.22
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 453.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ]
  },
  {
    "number": 68,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 607.65
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 145.71,
          "width": 374.67,
          "height": 380
        }
      }
    ],
    "previewRef": "slide-preview:slide-68.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 539.77,
          "width": 374.67,
          "height": 104
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 453.33,
          "top": 539.77,
          "width": 374.67,
          "height": 104
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 539.77,
          "width": 374.67,
          "height": 104
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 41.33,
          "top": 145.71,
          "width": 374.67,
          "height": 380
        }
      }
    ]
  },
  {
    "number": 69,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ],
    "previewRef": "slide-preview:slide-69.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 73.85,
          "top": 291.86,
          "width": 309.64,
          "height": 269.48
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 485.85,
          "top": 291.86,
          "width": 309.64,
          "height": 269.48
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 896.79,
          "top": 291.86,
          "width": 309.64,
          "height": 269.48
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ]
  },
  {
    "number": 70,
    "templateUse": "metrics",
    "layoutFamily": "metric-led",
    "contentRoles": [
      "title",
      "body",
      "label",
      "stat",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for KPI-heavy slides with multiple large numbers or quantified proof points.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 22,
    "densityLevel": "dense",
    "maxTextTokens": 14,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "label1",
          "stat1"
        ],
        "frame": {
          "left": 67.58,
          "top": 243.15,
          "width": 322.17,
          "height": 362
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "label2",
          "stat2"
        ],
        "frame": {
          "left": 478.25,
          "top": 243.15,
          "width": 322.17,
          "height": 362
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body3",
          "label3",
          "stat3"
        ],
        "frame": {
          "left": 888.92,
          "top": 243.15,
          "width": 322.17,
          "height": 362
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 67.58,
          "top": 243.15,
          "width": 322.17,
          "height": 214.18
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 452,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 478.25,
          "top": 243.15,
          "width": 322.17,
          "height": 214.18
        }
      }
    ],
    "previewRef": "slide-preview:slide-70.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 67.58,
          "top": 243.15,
          "width": 322.17,
          "height": 214.18
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 478.25,
          "top": 243.15,
          "width": 322.17,
          "height": 214.18
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 888.92,
          "top": 243.15,
          "width": 322.17,
          "height": 214.18
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 67.58,
          "top": 502.29,
          "width": 322.17,
          "height": 22.29
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 478.25,
          "top": 502.29,
          "width": 322.17,
          "height": 22.29
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 888.92,
          "top": 502.29,
          "width": 322.17,
          "height": 22.29
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 67.58,
          "top": 554.56,
          "width": 179.08,
          "height": 50.59
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 478.25,
          "top": 554.56,
          "width": 179.08,
          "height": 50.59
        }
      },
      {
        "name": "stat3",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat3",
        "textRole": "stat",
        "frame": {
          "left": 888.92,
          "top": 554.56,
          "width": 179.08,
          "height": 50.59
        }
      },
      {
        "name": "label4",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label4",
        "textRole": "label",
        "frame": {
          "left": 246.67,
          "top": 569.53,
          "width": 143.08,
          "height": 22.29
        }
      },
      {
        "name": "label5",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label5",
        "textRole": "label",
        "frame": {
          "left": 657.33,
          "top": 569.53,
          "width": 143.08,
          "height": 22.29
        }
      },
      {
        "name": "label6",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label6",
        "textRole": "label",
        "frame": {
          "left": 1068,
          "top": 569.53,
          "width": 143.08,
          "height": 22.29
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 67.58,
          "top": 243.15,
          "width": 322.17,
          "height": 214.18
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 452,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 478.25,
          "top": 243.15,
          "width": 322.17,
          "height": 214.18
        }
      }
    ]
  },
  {
    "number": 71,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ],
    "previewRef": "slide-preview:slide-71.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 73.85,
          "top": 353.33,
          "width": 309.64,
          "height": 208
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 485.85,
          "top": 353.33,
          "width": 309.64,
          "height": 208
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 896.79,
          "top": 353.33,
          "width": 309.64,
          "height": 208
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ]
  },
  {
    "number": 72,
    "templateUse": "metrics",
    "layoutFamily": "metric-led",
    "contentRoles": [
      "title",
      "body",
      "stat",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for KPI-heavy slides with multiple large numbers or quantified proof points.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 16,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1",
          "stat1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 620.1
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "stat2"
        ],
        "frame": {
          "left": 451.89,
          "top": 317.33,
          "width": 376.11,
          "height": 338.89
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body3",
          "stat3"
        ],
        "frame": {
          "left": 864.28,
          "top": 317.33,
          "width": 375.74,
          "height": 338.89
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 453.42,
          "width": 373.5,
          "height": 202.8
        }
      }
    ],
    "previewRef": "slide-preview:slide-72.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 374.67,
          "height": 104
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 453.33,
          "top": 317.33,
          "width": 374.67,
          "height": 104
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 317.33,
          "width": 374.67,
          "height": 104
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 41.33,
          "top": 453.42,
          "width": 373.5,
          "height": 202.8
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 451.89,
          "top": 453.42,
          "width": 373.5,
          "height": 202.8
        }
      },
      {
        "name": "stat3",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat3",
        "textRole": "stat",
        "frame": {
          "left": 866.52,
          "top": 453.42,
          "width": 373.5,
          "height": 202.8
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 41.33,
          "top": 453.42,
          "width": 373.5,
          "height": 202.8
        }
      }
    ]
  },
  {
    "number": 73,
    "templateUse": "two-column",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for paired narrative, before/after, problem/solution, or evidence-plus-interpretation content.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 16,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1",
          "body4"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "body5"
        ],
        "frame": {
          "left": 452.26,
          "top": 213.33,
          "width": 375.74,
          "height": 416
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body3",
          "body6"
        ],
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.75,
          "height": 416
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 208
        }
      }
    ],
    "previewRef": "slide-preview:slide-73.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "body4",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body4",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 433.99,
          "width": 374.67,
          "height": 195.34
        }
      },
      {
        "name": "body5",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body5",
        "textRole": "body",
        "frame": {
          "left": 452.26,
          "top": 433.99,
          "width": 374.67,
          "height": 195.34
        }
      },
      {
        "name": "body6",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body6",
        "textRole": "body",
        "frame": {
          "left": 864.36,
          "top": 433.99,
          "width": 374.67,
          "height": 195.34
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 208
        }
      }
    ]
  },
  {
    "number": 74,
    "templateUse": "metrics",
    "layoutFamily": "metric-led",
    "contentRoles": [
      "title",
      "body",
      "stat",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for KPI-heavy slides with multiple large numbers or quantified proof points.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 16,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "stat1"
        ],
        "frame": {
          "left": 73.74,
          "top": 294.05,
          "width": 309.75,
          "height": 294.97
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "stat2"
        ],
        "frame": {
          "left": 484.3,
          "top": 294.05,
          "width": 311.19,
          "height": 294.97
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body3",
          "stat3"
        ],
        "frame": {
          "left": 896.79,
          "top": 294.05,
          "width": 310.82,
          "height": 294.97
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 452.67,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ],
    "previewRef": "slide-preview:slide-74.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 73.85,
          "top": 294.05,
          "width": 309.64,
          "height": 104
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 485.85,
          "top": 294.05,
          "width": 309.64,
          "height": 104
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 896.79,
          "top": 294.05,
          "width": 309.64,
          "height": 104
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 73.74,
          "top": 386.22,
          "width": 308.67,
          "height": 202.8
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 484.3,
          "top": 386.22,
          "width": 308.67,
          "height": 202.8
        }
      },
      {
        "name": "stat3",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat3",
        "textRole": "stat",
        "frame": {
          "left": 898.94,
          "top": 386.22,
          "width": 308.67,
          "height": 202.8
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 452.67,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ]
  },
  {
    "number": 75,
    "templateUse": "metrics",
    "layoutFamily": "metric-led",
    "contentRoles": [
      "title",
      "stat",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for KPI-heavy slides with multiple large numbers or quantified proof points.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 16,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "stat1"
        ],
        "frame": {
          "left": 73.74,
          "top": 373.14,
          "width": 309.75,
          "height": 213.28
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "stat2"
        ],
        "frame": {
          "left": 484.3,
          "top": 373.14,
          "width": 311.19,
          "height": 213.28
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body3",
          "stat3"
        ],
        "frame": {
          "left": 896.79,
          "top": 373.14,
          "width": 310.82,
          "height": 213.28
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 374.67,
          "height": 312
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 452.67,
          "top": 317.33,
          "width": 374.67,
          "height": 312
        }
      }
    ],
    "previewRef": "slide-preview:slide-75.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 73.74,
          "top": 383.62,
          "width": 308.67,
          "height": 202.8
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 73.85,
          "top": 373.14,
          "width": 309.64,
          "height": 85.95
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 484.3,
          "top": 383.62,
          "width": 308.67,
          "height": 202.8
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 485.85,
          "top": 373.14,
          "width": 309.64,
          "height": 85.95
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 896.79,
          "top": 373.14,
          "width": 309.64,
          "height": 85.95
        }
      },
      {
        "name": "stat3",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat3",
        "textRole": "stat",
        "frame": {
          "left": 898.94,
          "top": 383.62,
          "width": 308.67,
          "height": 202.8
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 317.33,
          "width": 374.67,
          "height": 312
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 452.67,
          "top": 317.33,
          "width": 374.67,
          "height": 312
        }
      }
    ]
  },
  {
    "number": 76,
    "templateUse": "metrics",
    "layoutFamily": "metric-led",
    "contentRoles": [
      "title",
      "body",
      "stat",
      "label",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for KPI-heavy slides with multiple large numbers or quantified proof points.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 24,
    "densityLevel": "dense",
    "maxTextTokens": 16,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "stat1",
          "stat4",
          "footer1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 785.77,
          "height": 648.52
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat2",
          "label2",
          "stat5",
          "label5"
        ],
        "frame": {
          "left": 333.1,
          "top": 203.19,
          "width": 178.93,
          "height": 412.01
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat3",
          "label3",
          "stat6",
          "label6"
        ],
        "frame": {
          "left": 605.94,
          "top": 203.19,
          "width": 178.93,
          "height": 412.01
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "label1",
          "label4"
        ],
        "frame": {
          "left": 68.93,
          "top": 298.07,
          "width": 169.33,
          "height": 317.13
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 785.77,
          "height": 72.13
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 406.37,
          "width": 245.1,
          "height": 248.59
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 311.67,
          "top": 406.37,
          "width": 245.1,
          "height": 248.59
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 582,
          "top": 406.37,
          "width": 245.1,
          "height": 248.59
        }
      },
      {
        "role": "upper-field",
        "frame": {
          "left": 41.33,
          "top": 133.02,
          "width": 245.1,
          "height": 248.59
        }
      }
    ],
    "previewRef": "slide-preview:slide-76.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 785.77,
          "height": 72.13
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 133.02,
          "width": 374.67,
          "height": 521.94
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 59.33,
          "top": 203.19,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 333.1,
          "top": 203.19,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "stat3",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat3",
        "textRole": "stat",
        "frame": {
          "left": 605.94,
          "top": 203.19,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 68.93,
          "top": 298.07,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 342.7,
          "top": 298.07,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 615.54,
          "top": 298.07,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "stat4",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat4",
        "textRole": "stat",
        "frame": {
          "left": 59.33,
          "top": 479.06,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "stat5",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat5",
        "textRole": "stat",
        "frame": {
          "left": 333.1,
          "top": 479.06,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "stat6",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat6",
        "textRole": "stat",
        "frame": {
          "left": 605.94,
          "top": 479.06,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "label4",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label4",
        "textRole": "label",
        "frame": {
          "left": 68.93,
          "top": 573.95,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "label5",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label5",
        "textRole": "label",
        "frame": {
          "left": 342.7,
          "top": 573.95,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "label6",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label6",
        "textRole": "label",
        "frame": {
          "left": 615.54,
          "top": 573.95,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 41.33,
          "top": 659.31,
          "width": 374.67,
          "height": 25.33
        }
      },
      {
        "name": "footer2",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer2",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 785.77,
          "height": 72.13
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 406.37,
          "width": 245.1,
          "height": 248.59
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 311.67,
          "top": 406.37,
          "width": 245.1,
          "height": 248.59
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 582,
          "top": 406.37,
          "width": 245.1,
          "height": 248.59
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 41.33,
          "top": 133.02,
          "width": 245.1,
          "height": 248.59
        }
      }
    ]
  },
  {
    "number": 77,
    "templateUse": "metrics",
    "layoutFamily": "metric-led",
    "contentRoles": [
      "title",
      "stat",
      "body",
      "label",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for KPI-heavy slides with multiple large numbers or quantified proof points.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 24,
    "densityLevel": "dense",
    "maxTextTokens": 16,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "stat1",
          "stat4",
          "footer1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 785.77,
          "height": 648.52
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat2",
          "label2",
          "stat5",
          "label5"
        ],
        "frame": {
          "left": 333.1,
          "top": 257.06,
          "width": 178.93,
          "height": 358.14
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "stat3",
          "label3",
          "stat6",
          "label6"
        ],
        "frame": {
          "left": 605.94,
          "top": 257.06,
          "width": 178.93,
          "height": 358.14
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "label1",
          "label4"
        ],
        "frame": {
          "left": 68.93,
          "top": 351.95,
          "width": 169.33,
          "height": 263.25
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 785.77,
          "height": 72.13
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 245.1,
          "height": 197.63
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 311.67,
          "top": 457.33,
          "width": 245.1,
          "height": 197.63
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 582,
          "top": 457.33,
          "width": 245.1,
          "height": 197.63
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 249.33,
          "width": 374.67,
          "height": 405.63
        }
      }
    ],
    "previewRef": "slide-preview:slide-77.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 785.77,
          "height": 72.13
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 59.33,
          "top": 257.06,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 333.1,
          "top": 257.06,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "stat3",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat3",
        "textRole": "stat",
        "frame": {
          "left": 605.94,
          "top": 257.06,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 249.33,
          "width": 374.67,
          "height": 405.63
        }
      },
      {
        "name": "label1",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label1",
        "textRole": "label",
        "frame": {
          "left": 68.93,
          "top": 351.95,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "label2",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label2",
        "textRole": "label",
        "frame": {
          "left": 342.7,
          "top": 351.95,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "label3",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label3",
        "textRole": "label",
        "frame": {
          "left": 615.54,
          "top": 351.95,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "stat4",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat4",
        "textRole": "stat",
        "frame": {
          "left": 59.33,
          "top": 479.06,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "stat5",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat5",
        "textRole": "stat",
        "frame": {
          "left": 333.1,
          "top": 479.06,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "stat6",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat6",
        "textRole": "stat",
        "frame": {
          "left": 605.94,
          "top": 479.06,
          "width": 169.33,
          "height": 94.88
        }
      },
      {
        "name": "label4",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label4",
        "textRole": "label",
        "frame": {
          "left": 68.93,
          "top": 573.95,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "label5",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label5",
        "textRole": "label",
        "frame": {
          "left": 342.7,
          "top": 573.95,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "label6",
        "role": "label",
        "slotKind": "content",
        "required": false,
        "description": "label content slot",
        "contentKey": "label6",
        "textRole": "label",
        "frame": {
          "left": 615.54,
          "top": 573.95,
          "width": 169.33,
          "height": 41.25
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 41.33,
          "top": 659.31,
          "width": 374.67,
          "height": 25.33
        }
      },
      {
        "name": "footer2",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer2",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 785.77,
          "height": 72.13
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 41.33,
          "top": 457.33,
          "width": 245.1,
          "height": 197.63
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 311.67,
          "top": 457.33,
          "width": 245.1,
          "height": 197.63
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 582,
          "top": 457.33,
          "width": 245.1,
          "height": 197.63
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 864.28,
          "top": 249.33,
          "width": 374.67,
          "height": 405.63
        }
      }
    ]
  },
  {
    "number": 78,
    "templateUse": "metrics",
    "layoutFamily": "metric-led",
    "contentRoles": [
      "title",
      "body",
      "stat",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for KPI-heavy slides with multiple large numbers or quantified proof points.",
    "avoidWhen": "Avoid when the new content should feel sparse, cinematic, or image-led.",
    "slotCount": 16,
    "densityLevel": "dense",
    "maxTextTokens": 8,
    "maxImageSlots": 0,
    "densityGuidance": "Use for text-rich or evidence-rich content. Split the slide when the new copy exceeds the slot count.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "body1",
          "stat1"
        ],
        "frame": {
          "left": 73.74,
          "top": 294.05,
          "width": 309.75,
          "height": 294.97
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body2",
          "stat2"
        ],
        "frame": {
          "left": 484.3,
          "top": 294.05,
          "width": 311.19,
          "height": 294.97
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      },
      {
        "kind": "column",
        "contentKeys": [
          "body3",
          "stat3"
        ],
        "frame": {
          "left": 896.79,
          "top": 294.05,
          "width": 310.82,
          "height": 294.97
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 452.67,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ],
    "previewRef": "slide-preview:slide-78.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 73.85,
          "top": 294.05,
          "width": 309.64,
          "height": 104
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 485.85,
          "top": 294.05,
          "width": 309.64,
          "height": 104
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 896.79,
          "top": 294.05,
          "width": 309.64,
          "height": 104
        }
      },
      {
        "name": "stat1",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat1",
        "textRole": "stat",
        "frame": {
          "left": 73.74,
          "top": 386.22,
          "width": 308.67,
          "height": 202.8
        }
      },
      {
        "name": "stat2",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat2",
        "textRole": "stat",
        "frame": {
          "left": 484.3,
          "top": 386.22,
          "width": 308.67,
          "height": 202.8
        }
      },
      {
        "name": "stat3",
        "role": "stat",
        "slotKind": "content",
        "required": false,
        "description": "stat content slot",
        "contentKey": "stat3",
        "textRole": "stat",
        "frame": {
          "left": 898.94,
          "top": 386.22,
          "width": 308.67,
          "height": 202.8
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 452.67,
          "top": 249.33,
          "width": 374.67,
          "height": 380
        }
      }
    ]
  },
  {
    "number": 79,
    "templateUse": "process",
    "layoutFamily": "two-column-content",
    "contentRoles": [
      "title",
      "body",
      "footer"
    ],
    "assetSlots": [],
    "useWhen": "Use for steps, workflow, timeline, methods, or sequenced narrative.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 13,
    "densityLevel": "moderate",
    "maxTextTokens": 5,
    "maxImageSlots": 0,
    "densityGuidance": "Use for moderate copy with one primary message and a few supporting elements.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "fontSizeRangePx": {
        "min": 14.67,
        "max": 38.67
      },
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [
      {
        "kind": "column",
        "contentKeys": [
          "title",
          "body1"
        ],
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 593.21
        },
        "rationale": "Text boxes share a left edge and can usually become a column with fixed gaps."
      }
    ],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "role": "left-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "right-field",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 41.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "role": "lower-field",
        "frame": {
          "left": 453.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      }
    ],
    "previewRef": "slide-preview:slide-79.png",
    "slots": [
      {
        "name": "title",
        "role": "title",
        "slotKind": "content",
        "required": true,
        "description": "title content slot",
        "contentKey": "title",
        "textRole": "title",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "body1",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body1",
        "textRole": "body",
        "frame": {
          "left": 41.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "body2",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body2",
        "textRole": "body",
        "frame": {
          "left": 453.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "body3",
        "role": "body",
        "slotKind": "content",
        "required": true,
        "description": "body content slot",
        "contentKey": "body3",
        "textRole": "body",
        "frame": {
          "left": 864.28,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "footer1",
        "role": "footer",
        "slotKind": "content",
        "required": false,
        "description": "footer content slot",
        "contentKey": "footer1",
        "textRole": "footer",
        "frame": {
          "left": 1184.18,
          "top": 659.24,
          "width": 54.48,
          "height": 25.33
        }
      },
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      },
      {
        "name": "region3",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region3 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region4",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region4 layout region",
        "frame": {
          "left": 453.33,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region5",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region5 layout region",
        "frame": {
          "left": 864.28,
          "top": 213.33,
          "width": 374.67,
          "height": 416
        }
      },
      {
        "name": "region6",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region6 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region7",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region7 layout region",
        "frame": {
          "left": 41.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      },
      {
        "name": "region8",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region8 layout region",
        "frame": {
          "left": 453.33,
          "top": 421.33,
          "width": 374.67,
          "height": 208
        }
      }
    ]
  },
  {
    "number": 80,
    "templateUse": "content",
    "layoutFamily": "multi-region-content",
    "contentRoles": [],
    "assetSlots": [],
    "useWhen": "Use for general content that should inherit this deck's spacing, typography, and visual rhythm.",
    "avoidWhen": "Avoid when the requested content would fight the template layout's region count, density, or dominant visual role.",
    "slotCount": 2,
    "densityLevel": "sparse",
    "maxTextTokens": 1,
    "maxImageSlots": 0,
    "densityGuidance": "Use for low-copy moments with one dominant read. Do not fill empty space with extra bullets.",
    "typographyBudget": {
      "titleMinPx": 33,
      "bodyMinPx": 14,
      "preferredBodyPxRange": [
        17,
        23
      ],
      "tableBodyMinPx": 12,
      "footnoteMinPx": 9,
      "guidance": "Preserve the visual hierarchy. Reduce, group, or split content before shrinking below the minimum sizes."
    },
    "textFlows": [],
    "majorRegions": [
      {
        "role": "top-title-band",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "role": "center-field",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      }
    ],
    "previewRef": "slide-preview:slide-80.png",
    "slots": [
      {
        "name": "region1",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region1 layout region",
        "frame": {
          "left": 41.33,
          "top": 36.12,
          "width": 1197.33,
          "height": 109.97
        }
      },
      {
        "name": "region2",
        "role": "region",
        "slotKind": "region",
        "required": false,
        "description": "region2 layout region",
        "frame": {
          "left": 41.33,
          "top": 213.33,
          "width": 1197.33,
          "height": 416
        }
      }
    ]
  }
];
