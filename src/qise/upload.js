/* Pure policy for the on-device selfie fallback. Decoding stays in the UI. */

export const MAX_SELFIE_BYTES = 15 * 1024 * 1024;
export const MAX_SELFIE_EDGE = 2048;
export const MIN_SELFIE_EDGE = 480;

export function validateSelfieFile(file) {
  if (!file) return { ok: false, message: "Choose a selfie to continue." };
  if (typeof file.type !== "string" || !file.type.startsWith("image/")) {
    return { ok: false, message: "Choose an image file from your photo library." };
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, message: "That image is empty. Choose another selfie." };
  }
  if (file.size > MAX_SELFIE_BYTES) {
    return { ok: false, message: "That selfie is over 15 MB. Choose a smaller original." };
  }
  return { ok: true, message: null };
}

export function fitSelfieDimensions(width, height, maxEdge = MAX_SELFIE_EDGE) {
  if (!(width > 0) || !(height > 0) || !(maxEdge > 0)) return null;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    originalWidth: width,
    originalHeight: height,
    scale,
  };
}

export function validateSelfieDimensions(width, height) {
  if (!(width > 0) || !(height > 0)) {
    return { ok: false, message: "That image could not be read. Choose another selfie." };
  }
  if (Math.min(width, height) < MIN_SELFIE_EDGE) {
    return { ok: false, message: "Choose a clearer selfie at least 480 pixels on its shortest side." };
  }
  return { ok: true, message: null };
}
