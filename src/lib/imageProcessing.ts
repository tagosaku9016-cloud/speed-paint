export type ProcessedImage = {
  width: number;
  height: number;
  lineMask: Uint8Array;
  bgColor: string;
  sourceCanvas: HTMLCanvasElement;
};

const MAX_LONG_EDGE = 1024;

export async function loadAndPrepare(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = width;
  sourceCanvas.height = height;
  const sctx = sourceCanvas.getContext('2d');
  if (!sctx) throw new Error('Canvas 2D context unavailable');
  sctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const rgba = sctx.getImageData(0, 0, width, height).data;
  const gray = toGrayscale(rgba, width, height);
  const lineMask = buildLineMask(gray, width, height);
  const bgColor = sampleBackgroundColor(rgba, width, height);

  return { width, height, lineMask, bgColor, sourceCanvas };
}

function toGrayscale(rgba: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    out[j] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0;
  }
  return out;
}

function buildLineMask(gray: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const darkThreshold = 110;
  const sobelThreshold = 95;
  const out = new Uint8Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (gray[i] < darkThreshold) {
        out[i] = 1;
        continue;
      }
      const tl = gray[i - w - 1];
      const tc = gray[i - w];
      const tr = gray[i - w + 1];
      const ml = gray[i - 1];
      const mr = gray[i + 1];
      const bl = gray[i + w - 1];
      const bc = gray[i + w];
      const br = gray[i + w + 1];
      const gx = -tl - 2 * ml - bl + tr + 2 * mr + br;
      const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;
      const mag = Math.hypot(gx, gy);
      if (mag > sobelThreshold) out[i] = 1;
    }
  }
  return thinMask(out, w, h);
}

function thinMask(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const n = mask[i - 1] + mask[i + 1] + mask[i - w] + mask[i + w];
      if (n >= 1) out[i] = 1;
    }
  }
  return out;
}

function sampleBackgroundColor(rgba: Uint8ClampedArray, w: number, h: number): string {
  const sample = Math.min(24, Math.floor(Math.min(w, h) / 12));
  const corners: Array<[number, number]> = [
    [0, 0],
    [w - sample, 0],
    [0, h - sample],
    [w - sample, h - sample],
  ];
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let totalN = 0;
  for (const [cx, cy] of corners) {
    for (let y = cy; y < cy + sample; y++) {
      for (let x = cx; x < cx + sample; x++) {
        const i = (y * w + x) * 4;
        totalR += rgba[i];
        totalG += rgba[i + 1];
        totalB += rgba[i + 2];
        totalN++;
      }
    }
  }
  const r = Math.round(totalR / totalN);
  const g = Math.round(totalG / totalN);
  const b = Math.round(totalB / totalN);
  return `rgb(${r}, ${g}, ${b})`;
}
