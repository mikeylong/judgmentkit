#!/usr/bin/env python3
"""Build contact sheets for presentation template exploration PNGs."""

from __future__ import annotations

import argparse
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SLIDE_RE = re.compile(r"slide-(\d+)\.png$", re.IGNORECASE)


def slide_number(path: Path) -> int:
    match = SLIDE_RE.search(path.name)
    return int(match.group(1)) if match else 0


def slide_pngs(input_dir: Path, start_slide: int | None = None, end_slide: int | None = None) -> list[Path]:
    files = sorted(input_dir.glob("slide-*.png"), key=slide_number)
    if start_slide is not None:
        files = [file for file in files if slide_number(file) >= start_slide]
    if end_slide is not None:
        files = [file for file in files if slide_number(file) <= end_slide]
    if not files:
        raise SystemExit(f"No slide PNG files found in {input_dir}")
    return files


def load_font(size: int) -> ImageFont.ImageFont:
    for font_path in (
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial.ttf",
    ):
        try:
            return ImageFont.truetype(font_path, size)
        except OSError:
            pass
    return ImageFont.load_default()


def resize_to_width(image: Image.Image, width: int) -> Image.Image:
    ratio = image.height / image.width
    height = max(1, round(width * ratio))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def draw_label(draw: ImageDraw.ImageDraw, position: tuple[int, int], label: str, font: ImageFont.ImageFont) -> None:
    draw.text(position, label, fill=(60, 60, 60), font=font)


def build_single_sheet(
    input_dir: Path,
    output_file: Path,
    columns: int,
    thumb_width: int,
    start_slide: int | None,
    end_slide: int | None,
) -> None:
    files = slide_pngs(input_dir, start_slide, end_slide)
    padding = 18
    label_height = 24
    font = load_font(14)
    thumbs = [(file, resize_to_width(Image.open(file).convert("RGB"), thumb_width)) for file in files]
    thumb_height = max(image.height for _, image in thumbs)
    rows = math.ceil(len(thumbs) / columns)
    sheet = Image.new(
        "RGB",
        (
            padding + columns * (thumb_width + padding),
            padding + rows * (thumb_height + label_height + padding),
        ),
        "white",
    )
    draw = ImageDraw.Draw(sheet)

    for index, (file, image) in enumerate(thumbs):
        column = index % columns
        row = index // columns
        x = padding + column * (thumb_width + padding)
        y = padding + row * (thumb_height + label_height + padding)
        sheet.paste(image, (x, y))
        draw.rectangle((x, y, x + thumb_width - 1, y + image.height - 1), outline=(210, 210, 210), width=1)
        draw_label(draw, (x, y + thumb_height + 5), f"Slide {slide_number(file):02d}", font)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_file)


def build_comparison_sheet(
    left_dir: Path,
    right_dir: Path,
    output_file: Path,
    columns: int,
    thumb_width: int,
    left_label: str,
    right_label: str,
    start_slide: int | None,
    end_slide: int | None,
) -> None:
    left_files = {slide_number(file): file for file in slide_pngs(left_dir, start_slide, end_slide)}
    right_files = {slide_number(file): file for file in slide_pngs(right_dir, start_slide, end_slide)}
    left_numbers = set(left_files)
    right_numbers = set(right_files)
    if left_numbers != right_numbers:
        missing_left = sorted(right_numbers - left_numbers)
        missing_right = sorted(left_numbers - right_numbers)
        raise SystemExit(
            "Comparison slide sets differ: "
            f"missing from left={missing_left or 'none'}, missing from right={missing_right or 'none'}"
        )

    numbers = sorted(left_numbers)
    if not numbers:
        raise SystemExit(f"No matching slide PNG files found in {left_dir} and {right_dir}")

    padding = 18
    gutter = 8
    label_height = 42
    font = load_font(14)
    small_font = load_font(12)
    pairs = []
    pair_width = thumb_width * 2 + gutter
    pair_height = 0

    for number in numbers:
        left = resize_to_width(Image.open(left_files[number]).convert("RGB"), thumb_width)
        right = resize_to_width(Image.open(right_files[number]).convert("RGB"), thumb_width)
        height = max(left.height, right.height)
        pair_height = max(pair_height, height)
        pairs.append((number, left, right, height))

    rows = math.ceil(len(pairs) / columns)
    sheet = Image.new(
        "RGB",
        (
            padding + columns * (pair_width + padding),
            padding + rows * (pair_height + label_height + padding),
        ),
        "white",
    )
    draw = ImageDraw.Draw(sheet)

    for index, (number, left, right, _) in enumerate(pairs):
        column = index % columns
        row = index // columns
        x = padding + column * (pair_width + padding)
        y = padding + row * (pair_height + label_height + padding)
        sheet.paste(left, (x, y))
        sheet.paste(right, (x + thumb_width + gutter, y))
        draw.rectangle((x, y, x + thumb_width - 1, y + left.height - 1), outline=(210, 210, 210), width=1)
        draw.rectangle(
            (x + thumb_width + gutter, y, x + pair_width - 1, y + right.height - 1),
            outline=(210, 210, 210),
            width=1,
        )
        draw_label(draw, (x, y + pair_height + 5), f"Slide {number:02d}", font)
        draw_label(draw, (x, y + pair_height + 23), left_label, small_font)
        draw_label(draw, (x + thumb_width + gutter, y + pair_height + 23), right_label, small_font)

    output_file.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_file)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output-file", type=Path, required=True)
    parser.add_argument("--right-dir", type=Path)
    parser.add_argument("--columns", type=int, default=5)
    parser.add_argument("--thumb-width", type=int, default=320)
    parser.add_argument("--left-label", default="left")
    parser.add_argument("--right-label", default="right")
    parser.add_argument("--start-slide", type=int)
    parser.add_argument("--end-slide", type=int)
    args = parser.parse_args()

    if args.right_dir:
        build_comparison_sheet(
            args.input_dir,
            args.right_dir,
            args.output_file,
            args.columns,
            args.thumb_width,
            args.left_label,
            args.right_label,
            args.start_slide,
            args.end_slide,
        )
    else:
        build_single_sheet(
            args.input_dir,
            args.output_file,
            args.columns,
            args.thumb_width,
            args.start_slide,
            args.end_slide,
        )


if __name__ == "__main__":
    main()
