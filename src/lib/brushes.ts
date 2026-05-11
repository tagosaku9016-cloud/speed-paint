import type { Point } from './contourTracing';

export type BrushKind = 'pencil' | 'pen' | 'marker' | 'watercolor';

export type BrushConfig = {
  kind: BrushKind;
  label: string;
  emoji: string;
};

export const BRUSHES: BrushConfig[] = [
  { kind: 'pencil', label: '鉛筆', emoji: '✏️' },
  { kind: 'pen', label: 'ペン', emoji: '🖊️' },
  { kind: 'marker', label: 'マーカー', emoji: '🖍️' },
  { kind: 'watercolor', label: '水彩', emoji: '🎨' },
];

export function drawLineSegment(
  ctx: CanvasRenderingContext2D,
  kind: BrushKind,
  p1: Point,
  p2: Point,
  opacity: number,
): void {
  ctx.save();
  switch (kind) {
    case 'pencil': {
      ctx.strokeStyle = `rgba(40,40,40,${0.55 * opacity})`;
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      const jx = (Math.random() - 0.5) * 1.2;
      const jy = (Math.random() - 0.5) * 1.2;
      ctx.beginPath();
      ctx.moveTo(p1.x + jx, p1.y + jy);
      ctx.lineTo(p2.x + jx, p2.y + jy);
      ctx.stroke();
      break;
    }
    case 'pen': {
      ctx.strokeStyle = `rgba(15,15,20,${0.95 * opacity})`;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      break;
    }
    case 'marker': {
      ctx.strokeStyle = `rgba(30,30,40,${0.4 * opacity})`;
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      break;
    }
    case 'watercolor': {
      ctx.strokeStyle = `rgba(60,60,80,${0.25 * opacity})`;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      const jx = (Math.random() - 0.5) * 0.8;
      const jy = (Math.random() - 0.5) * 0.8;
      ctx.beginPath();
      ctx.moveTo(p1.x + jx, p1.y + jy);
      ctx.lineTo(p2.x + jx, p2.y + jy);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export function paintBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  rgb: [number, number, number],
  opacity: number,
  kind: BrushKind,
): void {
  ctx.save();
  const [r, g, b] = rgb;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  const edgeAlpha = kind === 'watercolor' ? 0 : 0.1 * opacity;
  grad.addColorStop(0, `rgba(${r},${g},${b},${0.55 * opacity})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},${edgeAlpha})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
