// Checks a seller's photo before upload so unreadable photos are retaken at
// the source instead of being discovered during review. Pure functions over
// pixel data: no DOM, so the same code runs in the browser and in tests.

// Photos are analysed at this long-edge size (never upscaled).
export const ANALYSIS_EDGE = 1024;
// The original photo's long edge, in pixels.
export const MIN_EDGE_REJECT = 700;
export const MIN_EDGE_WARN = 1200;

const TILES = 8;

export function analysisSize(width, height) {
  const scale = Math.min(1, ANALYSIS_EDGE / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

// `data` is RGBA, as returned by CanvasRenderingContext2D.getImageData.
export function photoMetrics({ data, width, height }) {
  const count = width * height;
  const luma = new Float32Array(count);
  let lit = 0;
  let blown = 0;
  for (let i = 0, p = 0; i < count; i++, p += 4) {
    const value = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    luma[i] = value;
    if (value >= 70) lit++;
    if (value >= 250) blown++;
  }
  // Edge strength per tile. A sharp photo has at least some crisp regions (a
  // label, a card border) even when most of the frame is a plain background,
  // so the photo is scored by its sharpest tiles, not its average.
  const tileW = Math.floor(width / TILES);
  const tileH = Math.floor(height / TILES);
  const scores = [];
  if (tileW >= 4 && tileH >= 4)
    for (let ty = 0; ty < TILES; ty++)
      for (let tx = 0; tx < TILES; tx++) {
        let sum = 0;
        let squares = 0;
        let n = 0;
        const x0 = Math.max(1, tx * tileW);
        const x1 = Math.min(width - 1, (tx + 1) * tileW);
        const y0 = Math.max(1, ty * tileH);
        const y1 = Math.min(height - 1, (ty + 1) * tileH);
        for (let y = y0; y < y1; y++)
          for (let x = x0; x < x1; x++) {
            const i = y * width + x;
            const edge =
              luma[i - 1] +
              luma[i + 1] +
              luma[i - width] +
              luma[i + width] -
              4 * luma[i];
            sum += edge;
            squares += edge * edge;
            n++;
          }
        if (n) scores.push(squares / n - (sum / n) ** 2);
      }
  scores.sort((a, b) => a - b);
  return {
    sharpness: scores.length ? scores[Math.floor(scores.length * 0.9)] : 0,
    litShare: count ? lit / count : 0,
    blownShare: count ? blown / count : 0,
  };
}

export const LIMITS = {
  // Calibrated on real slab photos: sharp ones score in the thousands, a
  // visibly soft one a few hundred, an unreadable one under about 40.
  sharpnessReject: 50,
  sharpnessWarn: 250,
  litShareReject: 0.02,
  litShareWarn: 0.08,
  blownShareWarn: 0.35,
};

// Returns { reject, warnings }. `reject` is a message when the photo is
// clearly unusable; `warnings` are shown beside a photo that was accepted.
export function assessPhoto(metrics, source) {
  const edge = Math.max(source.width, source.height);
  if (edge < MIN_EDGE_REJECT)
    return {
      reject:
        "This photo is too small to read. Retake it with your camera, or choose the original photo.",
      warnings: [],
    };
  if (metrics.litShare < LIMITS.litShareReject)
    return {
      reject:
        "This photo is too dark to see the item. Retake it in brighter light.",
      warnings: [],
    };
  if (metrics.sharpness < LIMITS.sharpnessReject)
    return {
      reject:
        "This photo is too blurry to read. Hold steady, tap to focus on the label and retake it.",
      warnings: [],
    };
  const warnings = [];
  if (metrics.sharpness < LIMITS.sharpnessWarn)
    warnings.push("May be blurry. Check that the label is readable.");
  if (metrics.litShare < LIMITS.litShareWarn)
    warnings.push("Looks dark. Brighter light will show more detail.");
  if (metrics.blownShare > LIMITS.blownShareWarn)
    warnings.push("Strong glare or overexposure. Tilt the item away from the light.");
  if (edge < MIN_EDGE_WARN)
    warnings.push("Low resolution. Small text may be hard to read.");
  return { reject: null, warnings };
}
