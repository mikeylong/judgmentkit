# Slab J optical correction for 16px

The production master preserves selected A exactly. `svg/optical-16.svg` is a separately documented derivative for the minimum-size favicon, using the same 64 × 64 coordinate system and three-piece construction.

| Feature | Selected master at 16px | Optical variant at 16px |
| --- | --- | --- |
| Outer vertical edges | x=3.5 and 12.5px | x=3 and 13px |
| Upright vertical edges | x=9.5 and 12.5px | x=10 and 13px |
| Left return vertical edges | x=3.5 and 6px | x=3 and 6px |
| Visible width | 9px | 10px |
| Nickel band at right | 2.5px | 3px |
| Upright-to-return gap | About 0.88px perpendicular to the return edge | At least 1px |
| Top/bottom extents | y=0.5…15.5px | y=0.5…15.5px |

Optical coordinates:

```text
Cap:     12,12 52,2 52,12 12,22
Upright: 40,20 52,17 52,38 40,41
Return:  12,40 24,40 24,50 52,42 52,54 24,62 12,57
```

The cap widens slightly. The upright moves toward the right and ends slightly higher. The left return thickens, and its main nickel band gains half a pixel. The original slope directions, overall vertical extents, three separated pieces, and primary nickel policy remain intact. No flat cap, dot, bracket, or other neighboring-concept primitive is introduced.

The favicon SVG selects this geometry at viewport widths up to 20px, covering the 16px application. Larger viewports use the canonical master. The ICO uses the optical geometry for its 16px frame and canonical geometry for 32 and 48px. Dedicated fixed 16px SVGs and PNGs are included. App icons, lockups, and all standard mark exports use the original master.

Direct light, dark, and monochrome inspection found crisper vertical edges, a more visible lower return, and a clearer lower cut. The detached family construction still permits a broken-J or hook reading; no universal letter-recognition claim is made.

The before/after proof preserves actual 16px samples and labels enlarged pixels separately. The enlarged crops are diagnostic views, not substitutes for the actual-size check.
