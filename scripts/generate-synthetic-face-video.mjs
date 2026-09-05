#!/usr/bin/env node
/**
 * Generate a synthetic face video for camera integration testing.
 *
 * Produces a deterministic Y4M video file suitable for Playwright's
 * --use-file-for-fake-video-capture flag. Creates a skin-tone video with
 * subtle texture/motion to exercise MediaPipe landmark detection.
 *
 * Output: a 320x240 YUV4MPEG2 video, ~3 seconds, no biometric identity.
 * Uses only Node built-ins; no external dependencies.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const OUTPUT_PATH = 'tests/fixtures/synthetic-face.y4m';
const WIDTH = 320;
const HEIGHT = 240;
const FPS = 30;
const DURATION_FRAMES = 90; // 3 seconds at 30fps

/**
 * Generate a single synthetic frame as raw RGB data.
 * Creates a skin-tone face region with subtle texture and animating eye areas.
 * @param {number} frameNum - current frame number
 * @returns {Uint8Array} RGB pixel data (WIDTH * HEIGHT * 3 bytes)
 */
function generateRGBFrame(frameNum) {
  const frameData = new Uint8Array(WIDTH * HEIGHT * 3);
  const centerX = WIDTH / 2;
  const centerY = HEIGHT / 2;

  // Base skin tone: neutral warm tone (RGB for #B89968)
  const skinR = 184;
  const skinG = 153;
  const skinB = 104;

  // Animate lighting: subtle oscillating brightness
  const lighting = 1 + 0.1 * Math.sin((frameNum / DURATION_FRAMES) * Math.PI * 2);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const idx = (y * WIDTH + x) * 3;
      const dx = (x - centerX) / centerX;
      const dy = (y - centerY) / centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Create face region (ellipse, wider than tall)
      if (dist < 1.2) {
        // Within face bounds
        let r = skinR;
        let g = skinG;
        let b = skinB;

        // Add subtle texture (fake skin texture)
        const texture = Math.sin(x * 0.05) * Math.sin(y * 0.05) * 10 + 5;
        r = Math.min(255, r + texture * lighting);
        g = Math.min(255, g + texture * lighting * 0.8);
        b = Math.min(255, b + texture * lighting * 0.6);

        // Eye regions (animated)
        const leftEyeX = centerX - WIDTH * 0.15;
        const rightEyeX = centerX + WIDTH * 0.15;
        const eyesY = centerY - HEIGHT * 0.15;
        const leftEyeDist = Math.sqrt((x - leftEyeX) ** 2 + (y - eyesY) ** 2);
        const rightEyeDist = Math.sqrt((x - rightEyeX) ** 2 + (y - eyesY) ** 2);

        if (leftEyeDist < 12 || rightEyeDist < 12) {
          // Eye region: much darker
          const eyeDarkness = 0.2;
          r = Math.floor(r * eyeDarkness);
          g = Math.floor(g * eyeDarkness);
          b = Math.floor(b * eyeDarkness);
        }

        frameData[idx] = Math.min(255, Math.floor(r * lighting));
        frameData[idx + 1] = Math.min(255, Math.floor(g * lighting));
        frameData[idx + 2] = Math.min(255, Math.floor(b * lighting));
      } else {
        // Background: neutral gray
        frameData[idx] = 200;
        frameData[idx + 1] = 200;
        frameData[idx + 2] = 200;
      }
    }
  }

  return frameData;
}

/**
 * Convert RGB pixel data to YUV 4:2:0 format.
 * @param {Uint8Array} rgbData - RGB pixels (W*H*3 bytes)
 * @returns {Uint8Array} YUV 4:2:0 plane data
 */
function rgbToYUV420(rgbData) {
  const yPlane = new Uint8Array(WIDTH * HEIGHT);
  const uPlane = new Uint8Array((WIDTH * HEIGHT) / 4);
  const vPlane = new Uint8Array((WIDTH * HEIGHT) / 4);

  // Extract Y plane
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const r = rgbData[i * 3];
    const g = rgbData[i * 3 + 1];
    const b = rgbData[i * 3 + 2];
    yPlane[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Subsample RGB to create U/V (4:2:0)
  let uvIdx = 0;
  for (let y = 0; y < HEIGHT; y += 2) {
    for (let x = 0; x < WIDTH; x += 2) {
      // Average 2x2 block
      let rSum = 0,
        gSum = 0,
        bSum = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px < WIDTH && py < HEIGHT) {
            const idx = (py * WIDTH + px) * 3;
            rSum += rgbData[idx];
            gSum += rgbData[idx + 1];
            bSum += rgbData[idx + 2];
          }
        }
      }
      rSum /= 4;
      gSum /= 4;
      bSum /= 4;

      // BT.601 color matrix
      uPlane[uvIdx] = Math.round(-0.14713 * rSum - 0.28886 * gSum + 0.436 * bSum + 128);
      vPlane[uvIdx] = Math.round(0.615 * rSum - 0.51499 * gSum - 0.10001 * bSum + 128);
      uvIdx++;
    }
  }

  return Buffer.concat([Buffer.from(yPlane), Buffer.from(uPlane), Buffer.from(vPlane)]);
}

/**
 * Main: generate video file.
 */
function generateVideo() {
  console.log(`Generating synthetic face video: ${WIDTH}x${HEIGHT} @ ${FPS}fps, ${DURATION_FRAMES} frames`);
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });

  const frames = [];

  // Generate frame sequence
  for (let i = 0; i < DURATION_FRAMES; i++) {
    const rgbFrame = generateRGBFrame(i);
    const yuvFrame = rgbToYUV420(rgbFrame);
    frames.push(yuvFrame);

    if ((i + 1) % 30 === 0) {
      console.log(`  Frame ${i + 1}/${DURATION_FRAMES}`);
    }
  }

  // Write Y4M file with header
  const header = Buffer.from(`YUV4MPEG2 W${WIDTH} H${HEIGHT} F${FPS}:1 Ip A1:1 C420\n`);
  const frameHeader = Buffer.from('FRAME\n');

  const chunks = [header];
  for (const frame of frames) {
    chunks.push(frameHeader);
    chunks.push(frame);
  }

  const fileContent = Buffer.concat(chunks);
  writeFileSync(OUTPUT_PATH, fileContent);

  const sizeKB = (fileContent.length / 1024).toFixed(1);
  console.log(`✓ Wrote ${OUTPUT_PATH} (${sizeKB} KB)`);
}

generateVideo();
