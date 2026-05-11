export type ProcessedImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  gray: Uint8ClampedArray;
  edges: Uint8Array;
};

const MAX_LONG_EDGE = 1024;

export async function loadAndPrepare(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const rgba = ctx.getImageData(0, 0, width, height).data;
  const gray = toGrayscale(rgba, width, height);
  const edges = sobelEdges(gray, width, height);

  return { width, height, rgba, gray, edges };
}

function toGrayscale(rgba: Uint8ClampedArray, w: number, h: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    out[j] = (rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114) | 0;
  }
  return out;
}

function sobelEdges(gray: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const threshold = 70;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
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
      out[i] = mag > threshold ? 1 : 0;
    }
  }
  return out;
}

export function sampleColorAt(img: ProcessedImage, x: number, y: number): [number, number, number] {
  const i = (Math.floor(y) * img.width + Math.floor(x)) * 4;
  return [img.rgba[i], img.rgba[i + 1], img.rgba[i + 2]];
}
