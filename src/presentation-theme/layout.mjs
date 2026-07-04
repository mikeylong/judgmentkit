export const SLIDE_WIDTH = 1280;
export const SLIDE_HEIGHT = 720;

export const SLIDE_SIZE = Object.freeze({
  width: SLIDE_WIDTH,
  height: SLIDE_HEIGHT,
  w: SLIDE_WIDTH,
  h: SLIDE_HEIGHT,
  aspectRatio: SLIDE_WIDTH / SLIDE_HEIGHT,
});

export const MARGINS = Object.freeze({
  top: 56,
  right: 72,
  bottom: 56,
  left: 72,
});

export const GRID = Object.freeze({
  columns: 12,
  gap: 24,
});

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeFrame(frame = {}) {
  const source = frame && typeof frame === "object" ? frame : {};
  const x = finiteNumber(source.x, finiteNumber(source.left, 0));
  const y = finiteNumber(source.y, finiteNumber(source.top, 0));
  const width = finiteNumber(source.width, finiteNumber(source.w, 0));
  const height = finiteNumber(source.height, finiteNumber(source.h, 0));

  return {
    ...source,
    x,
    y,
    left: x,
    top: y,
    width,
    height,
    w: width,
    h: height,
  };
}

function normalizeSlideSize(slide = SLIDE_SIZE) {
  return normalizeFrame({
    width: finiteNumber(slide.width, finiteNumber(slide.w, SLIDE_WIDTH)),
    height: finiteNumber(slide.height, finiteNumber(slide.h, SLIDE_HEIGHT)),
  });
}

function normalizeInsets(value = MARGINS, fallback = MARGINS) {
  if (typeof value === "number") {
    return {
      top: value,
      right: value,
      bottom: value,
      left: value,
    };
  }

  const source = value && typeof value === "object" ? value : {};
  const horizontal = finiteNumber(source.horizontal, fallback.left);
  const vertical = finiteNumber(source.vertical, fallback.top);
  const x = finiteNumber(source.x, horizontal);
  const y = finiteNumber(source.y, vertical);

  return {
    top: finiteNumber(source.top, y),
    right: finiteNumber(source.right, x),
    bottom: finiteNumber(source.bottom, y),
    left: finiteNumber(source.left, x),
  };
}

export function frame(x, y, width, height, extra = {}) {
  const normalizedX = finiteNumber(x, 0);
  const normalizedY = finiteNumber(y, 0);

  return normalizeFrame({
    ...extra,
    x: normalizedX,
    y: normalizedY,
    left: normalizedX,
    top: normalizedY,
    width: Math.max(0, finiteNumber(width, 0)),
    height: Math.max(0, finiteNumber(height, 0)),
  });
}

export function fullSlide(options = {}) {
  const slide = normalizeSlideSize(options.slide ?? options);

  return frame(0, 0, slide.width, slide.height, {
    name: options.name ?? "full-slide",
  });
}

export function contentFrame(options = {}) {
  const slide = normalizeSlideSize(options.slide);
  const margins = normalizeInsets(options.margins ?? options, MARGINS);

  return frame(
    margins.left,
    margins.top,
    slide.width - margins.left - margins.right,
    slide.height - margins.top - margins.bottom,
    {
      name: options.name ?? "content-frame",
      margins,
    },
  );
}

export function inset(inputFrame, amount = 0, options = {}) {
  const source = normalizeFrame(inputFrame ?? fullSlide());
  const padding = normalizeInsets(amount, normalizeInsets(options.fallback ?? 0));

  return frame(
    source.x + padding.left,
    source.y + padding.top,
    source.width - padding.left - padding.right,
    source.height - padding.top - padding.bottom,
    {
      name: options.name ?? source.name,
      margins: padding,
    },
  );
}

export function columns(inputFrame, count = 2, options = {}) {
  const source = normalizeFrame(inputFrame ?? contentFrame());
  const columnCount = Math.max(1, Math.floor(finiteNumber(count, 1)));
  const gap = Math.max(0, finiteNumber(options.gap, GRID.gap));
  const width = (source.width - gap * (columnCount - 1)) / columnCount;

  return Array.from({ length: columnCount }, (_, index) =>
    frame(source.x + index * (width + gap), source.y, width, source.height, {
      name: options.name ? `${options.name}-${index + 1}` : `column-${index + 1}`,
      index,
      count: columnCount,
      gap,
    }),
  );
}

export function rows(inputFrame, count = 2, options = {}) {
  const source = normalizeFrame(inputFrame ?? contentFrame());
  const rowCount = Math.max(1, Math.floor(finiteNumber(count, 1)));
  const gap = Math.max(0, finiteNumber(options.gap, GRID.gap));
  const height = (source.height - gap * (rowCount - 1)) / rowCount;

  return Array.from({ length: rowCount }, (_, index) =>
    frame(source.x, source.y + index * (height + gap), source.width, height, {
      name: options.name ? `${options.name}-${index + 1}` : `row-${index + 1}`,
      index,
      count: rowCount,
      gap,
    }),
  );
}

export function gridSpan(inputFrame, options = {}) {
  const source = normalizeFrame(inputFrame ?? contentFrame());
  const columnCount = Math.max(1, Math.floor(finiteNumber(options.columns, GRID.columns)));
  const gap = Math.max(0, finiteNumber(options.gap, GRID.gap));
  const start = Math.max(1, Math.floor(finiteNumber(options.start ?? options.column, 1)));
  const span = Math.max(1, Math.floor(finiteNumber(options.span, 1)));
  const safeStart = Math.min(start, columnCount);
  const safeSpan = Math.min(span, columnCount - safeStart + 1);
  const columnWidth = (source.width - gap * (columnCount - 1)) / columnCount;
  const x = source.x + (safeStart - 1) * (columnWidth + gap);
  const width = columnWidth * safeSpan + gap * (safeSpan - 1);

  if (!options.rows) {
    return frame(x, source.y, width, source.height, {
      name: options.name ?? "grid-span",
      columns: columnCount,
      start: safeStart,
      span: safeSpan,
      gap,
    });
  }

  const rowCount = Math.max(1, Math.floor(finiteNumber(options.rows, 1)));
  const rowStart = Math.max(1, Math.floor(finiteNumber(options.row, 1)));
  const rowSpan = Math.max(1, Math.floor(finiteNumber(options.rowSpan, 1)));
  const safeRowStart = Math.min(rowStart, rowCount);
  const safeRowSpan = Math.min(rowSpan, rowCount - safeRowStart + 1);
  const rowGap = Math.max(0, finiteNumber(options.rowGap, gap));
  const rowHeight = (source.height - rowGap * (rowCount - 1)) / rowCount;
  const y = source.y + (safeRowStart - 1) * (rowHeight + rowGap);
  const height = rowHeight * safeRowSpan + rowGap * (safeRowSpan - 1);

  return frame(x, y, width, height, {
    name: options.name ?? "grid-span",
    columns: columnCount,
    rows: rowCount,
    start: safeStart,
    span: safeSpan,
    row: safeRowStart,
    rowSpan: safeRowSpan,
    gap,
    rowGap,
  });
}

export function stack(inputFrame, count = 2, options = {}) {
  return rows(inputFrame, count, options);
}

export function split(inputFrame, ratios = [1, 1], options = {}) {
  const source = normalizeFrame(inputFrame ?? contentFrame());
  const values = ratios.length > 0 ? ratios : [1];
  const gap = Math.max(0, finiteNumber(options.gap, GRID.gap));
  const total = values.reduce((sum, value) => sum + Math.max(0, finiteNumber(value, 0)), 0) || 1;
  const available = source.width - gap * (values.length - 1);
  let x = source.x;

  return values.map((value, index) => {
    const width = available * (Math.max(0, finiteNumber(value, 0)) / total);
    const output = frame(x, source.y, width, source.height, {
      name: options.name ? `${options.name}-${index + 1}` : `split-${index + 1}`,
      index,
      ratio: value,
      gap,
    });
    x += width + gap;
    return output;
  });
}

export function alignWithin(containerFrame, boxSize = {}, options = {}) {
  const source = normalizeFrame(containerFrame ?? contentFrame());
  const width = Math.min(source.width, finiteNumber(boxSize.width ?? boxSize.w, source.width));
  const height = Math.min(source.height, finiteNumber(boxSize.height ?? boxSize.h, source.height));
  const horizontal = options.horizontal ?? options.x ?? "center";
  const vertical = options.vertical ?? options.y ?? "center";
  const x = horizontal === "left"
    ? source.x
    : horizontal === "right"
      ? source.x + source.width - width
      : source.x + (source.width - width) / 2;
  const y = vertical === "top"
    ? source.y
    : vertical === "bottom"
      ? source.y + source.height - height
      : source.y + (source.height - height) / 2;

  return frame(x, y, width, height, {
    name: options.name ?? "aligned-frame",
  });
}

export function createJudgmentKitLayout(options = {}) {
  const defaultSlide = normalizeSlideSize(
    options.slide ?? options.slideSize ?? options.slide_size ?? options,
  );
  const scopedSlideSize = Object.freeze({
    width: defaultSlide.width,
    height: defaultSlide.height,
    w: defaultSlide.width,
    h: defaultSlide.height,
    aspectRatio: defaultSlide.width / defaultSlide.height,
  });

  function scopedFullSlide(fullSlideOptions = {}) {
    const hasExplicitSlide =
      Boolean(fullSlideOptions.slide) ||
      Number.isFinite(fullSlideOptions.width) ||
      Number.isFinite(fullSlideOptions.w) ||
      Number.isFinite(fullSlideOptions.height) ||
      Number.isFinite(fullSlideOptions.h);

    return fullSlide(
      hasExplicitSlide
        ? fullSlideOptions
        : { ...fullSlideOptions, slide: scopedSlideSize },
    );
  }

  function scopedContentFrame(contentOptions = {}) {
    return contentFrame({
      ...contentOptions,
      slide: contentOptions.slide ?? scopedSlideSize,
    });
  }

  return {
    SLIDE_WIDTH: scopedSlideSize.width,
    SLIDE_HEIGHT: scopedSlideSize.height,
    SLIDE_SIZE: scopedSlideSize,
    MARGINS,
    GRID,
    normalizeFrame,
    frame,
    fullSlide: scopedFullSlide,
    contentFrame: scopedContentFrame,
    inset(inputFrame, amount = 0, insetOptions = {}) {
      return inset(inputFrame ?? scopedFullSlide(), amount, insetOptions);
    },
    columns(inputFrame, count = 2, columnOptions = {}) {
      return columns(inputFrame ?? scopedContentFrame(), count, columnOptions);
    },
    rows(inputFrame, count = 2, rowOptions = {}) {
      return rows(inputFrame ?? scopedContentFrame(), count, rowOptions);
    },
    gridSpan(inputFrame, gridOptions = {}) {
      return gridSpan(inputFrame ?? scopedContentFrame(), gridOptions);
    },
    stack(inputFrame, count = 2, stackOptions = {}) {
      return rows(inputFrame ?? scopedContentFrame(), count, stackOptions);
    },
    split(inputFrame, ratios = [1, 1], splitOptions = {}) {
      return split(inputFrame ?? scopedContentFrame(), ratios, splitOptions);
    },
    alignWithin(containerFrame, boxSize = {}, alignOptions = {}) {
      return alignWithin(containerFrame ?? scopedContentFrame(), boxSize, alignOptions);
    },
  };
}

export default {
  SLIDE_WIDTH,
  SLIDE_HEIGHT,
  SLIDE_SIZE,
  MARGINS,
  GRID,
  normalizeFrame,
  frame,
  fullSlide,
  contentFrame,
  inset,
  columns,
  rows,
  gridSpan,
  stack,
  split,
  alignWithin,
  createJudgmentKitLayout,
};
