# Select field composition

Status: governing design-system research for the JudgmentKit default adapter
Reviewed: 2026-08-13

## Decision

JudgmentKit field selects use separate value and trailing-indicator zones. They do not make the selected value's start inset equal to the chevron's physical end inset.

The default field variant is `field_value_trailing_indicator_slot`:

- selected-value logical-start inset: `16px`
- trailing indicator slot: `48px`
- chevron artboard: `16px`
- chevron placement: centered inside the trailing slot
- resulting chevron logical-end inset: `16px`
- minimum visible value-to-chevron gap: `16px`
- selected value: start-aligned, single-line, and truncated before the slot when necessary

The compact-trigger variant remains separate. It may center the label and use symmetric accessory rails because the label and disclosure icon form one compact group. Native selects remain browser-owned unless their native appearance is replaced by a declared design-system indicator.

## Evidence from established systems

| System | Published or implemented field geometry | Boundary |
| --- | --- | --- |
| Material Web / Material 3 | `16px` leading content space, `16px` before trailing content, a `24px` trailing icon, and `12px` after the icon. The trailing region is therefore `52px`; `52px` is not the icon's edge inset. | Custom Material select and field implementation. |
| IBM Carbon | Default dropdown uses `16px` field start padding and `48px` field end padding. The current implementation uses a `24px` icon wrapper at a `12px` end offset with a `16px` icon centered in it, yielding a `16px` icon-artboard end inset. The same horizontal values apply to `32px`, `40px`, `48px`, and fluid `64px` fields. | Custom Carbon ListBox/dropdown. |
| Adobe Spectrum | Across S–XL pickers, value starts range from `9px` to `18px`, chevron end insets from `7px` to `17px`, and chevron canvases from `10px` to `14px`. The label grows and truncates while the icon remains fixed. | Custom Picker button. |
| Microsoft Fluent 2 | S–L Select uses `8px`/`12px`/`18px` value starts, `16px`/`20px`/`24px` icons, and `6px`/`10px`/`12px` icon end insets. Its larger `26px`/`34px`/`48px` right padding reserves content space; it is not the icon position. | Native options with a separately positioned closed-field icon. |
| USWDS | The Select uses an `8px` value start, a `20px` background indicator `8px` from the end, and `32px` end padding. In forced-colors mode it returns indicator ownership to the user agent. | CSS-background indicator; user-agent fallback is not a DOM geometry hard gate. |

## Primary sources

- [Material field spacing tokens](https://github.com/material-components/material-web/blob/main/tokens/_md-comp-outlined-field.scss)
- [Material field trailing-content layout](https://github.com/material-components/material-web/blob/main/field/internal/_content.scss)
- [Material select icon tokens](https://github.com/material-components/material-web/blob/main/tokens/versions/v0_192/_md-comp-outlined-select.scss)
- [Carbon dropdown spacing specification](https://carbondesignsystem.com/components/dropdown/style/)
- [Carbon ListBox implementation](https://github.com/carbon-design-system/carbon/blob/main/packages/styles/scss/components/list-box/_list-box.scss)
- [Spectrum Picker implementation](https://github.com/adobe/spectrum-css/blob/main/components/picker/index.css)
- [Fluent 2 Select implementation](https://github.com/microsoft/fluentui/blob/master/packages/react-components/react-select/library/src/components/Select/useSelectStyles.styles.ts)
- [USWDS Select implementation](https://github.com/uswds/uswds/blob/develop/packages/usa-select/src/styles/_usa-select.scss)

## Runtime contract

For the default field variant, rendered evidence must identify the exact select-like control and its `value`, `indicator-slot`, and `indicator` parts. The hosted browser measures and the reviewer independently recomputes:

- value-text logical-start inset
- value-zone containment and governed single-line clipping when the raw text is longer than the available zone
- trailing-slot width and logical-end anchoring
- indicator inline size and centering within its slot
- value-to-indicator collision gap
- inline containment of the value, slot, and indicator

No single universal threshold is inferred from appearance. Values come from the active component-family calibration. Missing field-versus-compact intent or missing part authority remains a review outcome.

## Generator contract

Generated custom field selects must expose stable semantic parts and declare the field variant explicitly:

```json
{
  "rule_id": "presentation_owner.select_indicator",
  "selector": "[data-component='field-select']",
  "presentation_owner": "design_system",
  "composition_variant": "field_value_trailing_indicator_slot",
  "value_selector": "[data-part='value']",
  "indicator_slot_selector": "[data-part='indicator-slot']",
  "indicator_selector": "[data-part='indicator']"
}
```

The selected value is the flexible, truncating member. The indicator slot is fixed at the calibrated logical end, and the indicator is centered inside it. Compact triggers use `centered_label_symmetric_rails` and declare `label_selector` instead; native browser indicators stay advisory because their painted geometry is not available through DOM rectangles.
