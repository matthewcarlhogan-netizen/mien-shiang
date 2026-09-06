/*
 * A deterministic, injectable synthetic capture for E2E.
 *
 * Node-side: builds one frame of pixel data and its matching landmark mesh,
 * both from the SAME canonical reference mesh every unit test in this repo
 * already uses (tests/fixtures/canonical-face.js) — no real face appears
 * here, and none should. The browser-side halves (a fake getUserMedia
 * backed by canvas.captureStream(), and a fake MediaPipe bundle whose
 * detectForVideo returns this exact mesh) are injected by the E2E spec via
 * page.addInitScript / page.route, never by changing src/.
 *
 * This is explicitly NOT a MediaPipe accuracy test — the landmark mesh is
 * supplied directly, not detected. It exists to drive the REAL gate chain,
 * capture-runtime and finalisation path end to end deterministically, which
 * nothing in this repository's browser tests did before (see the CI job's
 * own launchArgs bug this correction also fixes). A separate, lighter smoke
 * test still loads the real MediaPipe bundle to prove IT still loads.
 */
import { syntheticFace, FRAME_W, FRAME_H } from "../../tests/qise/fixtures/synthetic.js";
import { canonicalFace } from "../../tests/fixtures/canonical-face.js";

/**
 * The shared fixture's fill is deliberately FLAT per region — it isolates
 * colour measurement, which is exactly wrong for the `filter` (sharpness)
 * gate, whose Laplacian variance is zero-by-construction on a constant
 * region. A small, zero-mean, high-frequency dither gives it something real
 * to measure without moving the median colour any statistic here reads.
 */
function withTexture(img, amplitude = 8) {
  const data = Uint8ClampedArray.from(img.data);
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const delta = ((x + y) % 2 === 0) ? amplitude : -amplitude;
      data[i] = img.data[i] + delta;
      data[i + 1] = img.data[i + 1] + delta;
      data[i + 2] = img.data[i + 2] + delta;
    }
  }
  return { width: img.width, height: img.height, data };
}

/**
 * @param {{bizygomaticFraction?: number, skin?: number[], sclera?: number[]}} [options]
 * @returns {{width:number, height:number, pixelsBase64:string, normalizedLandmarks:Array<{x:number,y:number,z:number}>}}
 */
export function buildSyntheticCapture({
  bizygomaticFraction = 0.55, skin = [200, 150, 140], sclera = [232, 230, 226],
} = {}) {
  const pts = canonicalFace({
    bizygomatic: Math.round(FRAME_W * bizygomaticFraction),
    cx: FRAME_W / 2,
    cy: FRAME_H / 2,
  });
  const { img } = syntheticFace({ pts, skin, sclera });
  const textured = withTexture(img);
  const normalizedLandmarks = pts.map((p) => ({
    x: p.x / FRAME_W,
    y: p.y / FRAME_H,
    z: typeof p.z === "number" ? p.z / FRAME_W : 0,
  }));
  return {
    width: FRAME_W,
    height: FRAME_H,
    pixelsBase64: Buffer.from(textured.data.buffer, textured.data.byteOffset, textured.data.byteLength)
      .toString("base64"),
    normalizedLandmarks,
  };
}

/**
 * The fake MediaPipe ES module served in place of vendor/mediapipe/vision_bundle.mjs.
 * Returns the SAME fixed mesh every call — a static face, which is also the
 * easiest possible input for the motion gate (zero drift by construction).
 *
 * @param {Array<{x:number,y:number,z:number}>} normalizedLandmarks
 */
export function fakeMediaPipeModuleSource(normalizedLandmarks) {
  const mesh = JSON.stringify(normalizedLandmarks);
  return `
    const MESH = ${mesh};
    export class FaceLandmarker {
      static async createFromOptions() { return new FaceLandmarker(); }
      detectForVideo() { return { faceLandmarks: [MESH] }; }
      close() {}
    }
    export class FilesetResolver {
      static async forVisionTasks() { return {}; }
    }
  `;
}

/**
 * Script text installed via page.addInitScript(): replaces
 * navigator.mediaDevices.getUserMedia with one that paints the supplied
 * pixel data onto an offscreen canvas, once, and streams it via
 * canvas.captureStream() — a real MediaStream, real video element, real
 * decode path, with fully controlled and known content.
 */
export function fakeGetUserMediaInitScript({ width, height, pixelsBase64 }) {
  return `(() => {
    const WIDTH = ${width};
    const HEIGHT = ${height};
    const PIXELS_BASE64 = ${JSON.stringify(pixelsBase64)};

    function decodePixels() {
      const binary = atob(PIXELS_BASE64);
      const bytes = new Uint8ClampedArray(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }

    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");
    const imageData = new ImageData(decodePixels(), WIDTH, HEIGHT);
    ctx.putImageData(imageData, 0, 0);
    // Redraw every animation frame so captureStream's track stays "live" and
    // readyState/currentTime actually advance — a canvas painted once and
    // never touched again produces a stream some browsers treat as ended.
    function keepAlive() {
      ctx.putImageData(imageData, 0, 0);
      requestAnimationFrame(keepAlive);
    }
    requestAnimationFrame(keepAlive);

    const stream = canvas.captureStream(30);

    const realGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (constraints && constraints.video) return stream;
        return realGetUserMedia ? realGetUserMedia(constraints) : stream;
      };
    }
  })();`;
}
