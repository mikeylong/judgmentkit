const DERIVATION_EPSILON = 1e-6;

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sameNumber(left, right) {
  return (
    Number.isFinite(left) &&
    Number.isFinite(right) &&
    Math.abs(left - right) <= DERIVATION_EPSILON
  );
}

export function deriveFieldValueTrailingIndicatorSlotObservation({
  evidence,
  calibration,
  ruleId,
  failureCode,
} = {}) {
  if (!isPlainObject(evidence) || !isPlainObject(calibration)) return null;

  const claimedValueStartInset = evidence.value_start_inset_css_px;
  const claimedIndicatorSlotWidth = evidence.indicator_slot_width_css_px;
  const claimedIndicatorSlotEndInset =
    evidence.indicator_slot_end_inset_css_px;
  const claimedIndicatorInlineSize = evidence.indicator_inline_size_css_px;
  const claimedIndicatorEndInset = evidence.indicator_end_inset_css_px;
  const claimedValueIndicatorGap = evidence.value_indicator_gap_css_px;
  const expectedValueStartInset =
    calibration.expected_value_start_inset_css_px;
  const expectedIndicatorSlotWidth =
    calibration.expected_indicator_slot_width_css_px;
  const expectedIndicatorInlineSize =
    calibration.expected_indicator_inline_size_css_px;
  const minimumValueIndicatorGap =
    calibration.minimum_value_indicator_gap_css_px;
  const geometryLimit = calibration.max_geometry_delta_css_px;
  const slotCenterLimit =
    calibration.max_indicator_slot_center_delta_css_px;
  if (
    ![
      claimedValueStartInset,
      claimedIndicatorSlotWidth,
      claimedIndicatorSlotEndInset,
      claimedIndicatorInlineSize,
      claimedIndicatorEndInset,
      claimedValueIndicatorGap,
      expectedValueStartInset,
      expectedIndicatorSlotWidth,
      expectedIndicatorInlineSize,
      minimumValueIndicatorGap,
      geometryLimit,
      slotCenterLimit,
    ].every(Number.isFinite)
  ) {
    return null;
  }

  const containerRect = evidence.container_rect;
  const valuePartRect = evidence.value_part_rect;
  const valueTextRect = evidence.value_text_rect;
  const indicatorSlotRect = evidence.indicator_slot_rect;
  const indicatorRect = evidence.indicator_rect;
  const direction = evidence.direction;
  const valueWhiteSpace = evidence.value_white_space;
  const valueOverflowX = evidence.value_overflow_x;
  const valueTextOverflow = evidence.value_text_overflow;
  if (
    !["ltr", "rtl"].includes(direction) ||
    ![
      containerRect,
      valuePartRect,
      valueTextRect,
      indicatorSlotRect,
      indicatorRect,
    ].every(isPlainObject) ||
    ![valueWhiteSpace, valueOverflowX, valueTextOverflow].every(
      (value) => typeof value === "string",
    ) ||
    ![
      containerRect.left,
      containerRect.right,
      valuePartRect.left,
      valuePartRect.right,
      valueTextRect.left,
      valueTextRect.right,
      indicatorSlotRect.left,
      indicatorSlotRect.right,
      indicatorRect.left,
      indicatorRect.right,
    ].every(Number.isFinite)
  ) {
    return null;
  }
  const valueStartInset =
    direction === "rtl"
      ? containerRect.right - valueTextRect.right
      : valueTextRect.left - containerRect.left;
  const indicatorSlotWidth =
    indicatorSlotRect.right - indicatorSlotRect.left;
  const indicatorSlotEndInset =
    direction === "rtl"
      ? indicatorSlotRect.left - containerRect.left
      : containerRect.right - indicatorSlotRect.right;
  const indicatorInlineSize = indicatorRect.right - indicatorRect.left;
  const indicatorEndInset =
    direction === "rtl"
      ? indicatorRect.left - containerRect.left
      : containerRect.right - indicatorRect.right;
  const valueIndicatorGap =
    direction === "rtl"
      ? valuePartRect.left - indicatorRect.right
      : indicatorRect.left - valuePartRect.right;
  const valueSlotGap =
    direction === "rtl"
      ? valuePartRect.left - indicatorSlotRect.right
      : indicatorSlotRect.left - valuePartRect.right;
  const indicatorSlotCenterDelta = Math.abs(
    (indicatorSlotRect.left + indicatorSlotRect.right) / 2 -
      (indicatorRect.left + indicatorRect.right) / 2,
  );
  if (
    !sameNumber(claimedValueStartInset, valueStartInset) ||
    !sameNumber(claimedIndicatorSlotWidth, indicatorSlotWidth) ||
    !sameNumber(claimedIndicatorSlotEndInset, indicatorSlotEndInset) ||
    !sameNumber(claimedIndicatorInlineSize, indicatorInlineSize) ||
    !sameNumber(claimedIndicatorEndInset, indicatorEndInset) ||
    !sameNumber(claimedValueIndicatorGap, valueIndicatorGap)
  ) {
    return null;
  }
  const valueStartDelta = Math.abs(
    valueStartInset - expectedValueStartInset,
  );
  const indicatorSlotWidthDelta = Math.abs(
    indicatorSlotWidth - expectedIndicatorSlotWidth,
  );
  const indicatorInlineSizeDelta = Math.abs(
    indicatorInlineSize - expectedIndicatorInlineSize,
  );
  const logicalGeometryNonnegative =
    valueStartInset >= 0 &&
    indicatorSlotWidth >= 0 &&
    indicatorInlineSize >= 0 &&
    indicatorEndInset >= 0;
  const valuePartContainedInline =
    valuePartRect.left >= containerRect.left &&
    valuePartRect.right <= containerRect.right;
  const rawValueTextOverflowsPart =
    valueTextRect.left < valuePartRect.left ||
    valueTextRect.right > valuePartRect.right;
  const valueOverflowGoverned =
    valueWhiteSpace === "nowrap" &&
    ["hidden", "clip"].includes(valueOverflowX) &&
    ["ellipsis", "clip"].includes(valueTextOverflow);
  const indicatorSlotContainedInline =
    indicatorSlotRect.left >= containerRect.left &&
    indicatorSlotRect.right <= containerRect.right;
  const indicatorContainedInSlot =
    indicatorRect.left >= indicatorSlotRect.left &&
    indicatorRect.right <= indicatorSlotRect.right;
  const valueDoesNotOverlapSlot = valueSlotGap >= 0;

  if (
    !sameNumber(
      evidence.expected_value_start_inset_css_px,
      expectedValueStartInset,
    ) ||
    !sameNumber(
      evidence.expected_indicator_slot_width_css_px,
      expectedIndicatorSlotWidth,
    ) ||
    !sameNumber(
      evidence.expected_indicator_inline_size_css_px,
      expectedIndicatorInlineSize,
    ) ||
    !sameNumber(
      evidence.minimum_value_indicator_gap_css_px,
      minimumValueIndicatorGap,
    ) ||
    !sameNumber(
      evidence.geometry_delta_limit_css_px,
      geometryLimit,
    ) ||
    !sameNumber(
      evidence.indicator_slot_center_delta_limit_css_px,
      slotCenterLimit,
    ) ||
    !sameNumber(evidence.value_start_delta_css_px, valueStartDelta) ||
    !sameNumber(
      evidence.indicator_slot_width_delta_css_px,
      indicatorSlotWidthDelta,
    ) ||
    !sameNumber(
      evidence.indicator_inline_size_delta_css_px,
      indicatorInlineSizeDelta,
    ) ||
    !sameNumber(
      evidence.indicator_slot_center_delta_css_px,
      indicatorSlotCenterDelta,
    ) ||
    !sameNumber(evidence.value_slot_gap_css_px, valueSlotGap) ||
    evidence.logical_geometry_nonnegative !== logicalGeometryNonnegative ||
    evidence.raw_value_text_overflows_part !== rawValueTextOverflowsPart ||
    evidence.value_overflow_governed !== valueOverflowGoverned ||
    evidence.value_part_contained_inline !== valuePartContainedInline ||
    evidence.indicator_slot_contained_inline !==
      indicatorSlotContainedInline ||
    evidence.indicator_contained_in_slot !== indicatorContainedInSlot ||
    evidence.value_does_not_overlap_slot !== valueDoesNotOverlapSlot
  ) {
    return null;
  }

  const passes =
    logicalGeometryNonnegative &&
    valuePartContainedInline &&
    (!rawValueTextOverflowsPart || valueOverflowGoverned) &&
    indicatorSlotContainedInline &&
    indicatorContainedInSlot &&
    valueDoesNotOverlapSlot &&
    valueStartDelta <= geometryLimit &&
    indicatorSlotWidthDelta <= geometryLimit &&
    Math.abs(indicatorSlotEndInset) <= geometryLimit &&
    indicatorInlineSizeDelta <= geometryLimit &&
    indicatorSlotCenterDelta <= slotCenterLimit &&
    valueIndicatorGap + geometryLimit >= minimumValueIndicatorGap;

  return passes
    ? { actual: "pass", code: ruleId }
    : { actual: "fail", code: failureCode };
}
