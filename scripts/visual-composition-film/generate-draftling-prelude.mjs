#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(
      ROOT,
      "output/playwright/public-mcp-demo/judgmentkit-draftling-prelude.wav",
    );
const SAMPLE_RATE = 48_000;
const CHANNELS = 2;
const DURATION_SECONDS = 38.2;
const FRAME_COUNT = Math.round(SAMPLE_RATE * DURATION_SECONDS);
const left = new Float64Array(FRAME_COUNT);
const right = new Float64Array(FRAME_COUNT);

function mixSample(frame, sample, pan = 0) {
  if (frame < 0 || frame >= FRAME_COUNT) return;
  const normalizedPan = Math.max(-1, Math.min(1, pan));
  const angle = ((normalizedPan + 1) * Math.PI) / 4;
  left[frame] += sample * Math.cos(angle);
  right[frame] += sample * Math.sin(angle);
}

function addPluck(time, frequency, {
  duration = 0.42,
  gain = 0.13,
  pan = 0,
} = {}) {
  const start = Math.round(time * SAMPLE_RATE);
  const length = Math.round(duration * SAMPLE_RATE);
  for (let offset = 0; offset < length; offset += 1) {
    const t = offset / SAMPLE_RATE;
    const envelope = Math.sin(Math.min(1, t / 0.018) * Math.PI / 2)
      * Math.exp((-7.2 * t) / duration);
    const body = Math.sin(2 * Math.PI * frequency * t)
      + 0.28 * Math.sin(2 * Math.PI * frequency * 2 * t + 0.18)
      + 0.08 * Math.sin(2 * Math.PI * frequency * 3 * t + 0.42);
    mixSample(start + offset, gain * envelope * body, pan);
  }
}

let noiseState = 0x4a4b4452;
function deterministicNoise() {
  noiseState ^= noiseState << 13;
  noiseState ^= noiseState >>> 17;
  noiseState ^= noiseState << 5;
  return ((noiseState >>> 0) / 0xffffffff) * 2 - 1;
}

function addStamp(time, frequency = 142, pan = 0) {
  const start = Math.round(time * SAMPLE_RATE);
  const duration = 0.19;
  const length = Math.round(duration * SAMPLE_RATE);
  for (let offset = 0; offset < length; offset += 1) {
    const t = offset / SAMPLE_RATE;
    const envelope = Math.exp(-24 * t);
    const pitch = frequency * (1 - 0.28 * (t / duration));
    const thump = Math.sin(2 * Math.PI * pitch * t);
    const texture = deterministicNoise() * Math.exp(-58 * t);
    mixSample(start + offset, (0.17 * thump + 0.055 * texture) * envelope, pan);
  }
}

function addAirSweep(time, duration = 0.68, panStart = -0.6, panEnd = 0.72) {
  const start = Math.round(time * SAMPLE_RATE);
  const length = Math.round(duration * SAMPLE_RATE);
  let previous = 0;
  for (let offset = 0; offset < length; offset += 1) {
    const t = offset / SAMPLE_RATE;
    const progress = t / duration;
    const attack = Math.min(1, progress / 0.22);
    const release = Math.max(0, 1 - progress);
    const raw = deterministicNoise();
    const filtered = previous * 0.86 + raw * 0.14;
    previous = filtered;
    const shimmer = Math.sin(2 * Math.PI * (620 + 760 * progress) * t) * 0.18;
    mixSample(
      start + offset,
      (filtered * 0.045 + shimmer * 0.035) * attack * release,
      panStart + (panEnd - panStart) * progress,
    );
  }
}

function addWarmBed(startTime, endTime) {
  const start = Math.round(startTime * SAMPLE_RATE);
  const end = Math.min(FRAME_COUNT, Math.round(endTime * SAMPLE_RATE));
  for (let frame = start; frame < end; frame += 1) {
    const t = (frame - start) / SAMPLE_RATE;
    const duration = endTime - startTime;
    const fadeIn = Math.min(1, t / 0.75);
    const fadeOut = Math.min(1, Math.max(0, (duration - t) / 0.9));
    const envelope = 0.025 * fadeIn * fadeOut;
    const body = Math.sin(2 * Math.PI * 196 * t)
      + 0.45 * Math.sin(2 * Math.PI * 293.66 * t + 0.4);
    mixSample(frame, envelope * body, -0.08);
  }
}

addWarmBed(0, 6.55);

[
  [0.42, 392.0, -0.55],
  [0.72, 493.88, -0.22],
  [1.03, 587.33, 0.18],
  [1.34, 659.25, 0.48],
  [2.08, 493.88, -0.38],
  [2.38, 587.33, -0.04],
  [2.68, 739.99, 0.34],
  [3.38, 440.0, -0.46],
  [3.69, 554.37, -0.08],
  [4.0, 659.25, 0.38],
  [4.72, 587.33, -0.2],
  [4.98, 739.99, 0.18],
  [5.24, 880.0, 0.5],
].forEach(([time, frequency, pan]) => addPluck(time, frequency, { pan }));

addStamp(1.4, 138, -0.45);
addStamp(2.5, 152, -0.1);
addStamp(3.9, 166, 0.48);
addPluck(5.18, 783.99, { duration: 0.58, gain: 0.15, pan: -0.32 });
addPluck(5.3, 987.77, { duration: 0.62, gain: 0.13, pan: 0.06 });
addPluck(5.42, 1174.66, { duration: 0.68, gain: 0.115, pan: 0.4 });
addAirSweep(5.92, 0.72, -0.35, 0.78);

let peak = 0;
for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
  peak = Math.max(peak, Math.abs(left[frame]), Math.abs(right[frame]));
}
const normalization = peak > 0 ? Math.min(1, 0.72 / peak) : 1;
const dataBytes = FRAME_COUNT * CHANNELS * 2;
const buffer = Buffer.alloc(44 + dataBytes);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataBytes, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(CHANNELS, 22);
buffer.writeUInt32LE(SAMPLE_RATE, 24);
buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * 2, 28);
buffer.writeUInt16LE(CHANNELS * 2, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataBytes, 40);

let cursor = 44;
for (let frame = 0; frame < FRAME_COUNT; frame += 1) {
  const l = Math.max(-1, Math.min(1, left[frame] * normalization));
  const r = Math.max(-1, Math.min(1, right[frame] * normalization));
  buffer.writeInt16LE(Math.round(l * 32767), cursor);
  buffer.writeInt16LE(Math.round(r * 32767), cursor + 2);
  cursor += 4;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, buffer);
process.stdout.write(`${OUTPUT}\n`);
