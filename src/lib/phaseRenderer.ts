import { drawLineSegment, paintBlob, type BrushKind } from './brushes';
import { sampleColorAt, type ProcessedImage } from './imageProcessing';
import { countTotalPoints, type Stroke } from './contourTracing';

export type PhaseName = 'draft' | 'lineart' | 'fill' | 'finish';

export type RenderOptions = {
  ctx: CanvasRenderingContext2D;
  image: ProcessedImage;
  strokes: Stroke[];
  brush: BrushKind;
  durationMs: number;
  speedMultiplier: number;
  onProgress: (progress: number, phase: PhaseName) => void;
  shouldCancel: () => boolean;
};

const PHASE_WEIGHTS: Record<PhaseName, number> = {
  draft: 0.1,
  lineart: 0.4,
  fill: 0.35,
  finish: 0.15,
};

export async function renderSpeedPaint(opts: RenderOptions): Promise<void> {
  const { ctx, image, strokes, brush, durationMs, speedMultiplier, onProgress, shouldCancel } = opts;
  ctx.fillStyle = '#fbfaf6';
  ctx.fillRect(0, 0, image.width, image.height);

  const totalDuration = durationMs / Math.max(0.1, speedMultiplier);
  const startedAt = performance.now();

  await runPhase('draft', PHASE_WEIGHTS.draft * totalDuration, (p) => {
    drawDraftBatch(ctx, strokes, p);
    onProgress(globalProgress('draft', p), 'draft');
  }, shouldCancel, startedAt);

  if (shouldCancel()) return;

  const total = countTotalPoints(strokes);
  await runPhase('lineart', PHASE_WEIGHTS.lineart * totalDuration, (p) => {
    drawLineartUpTo(ctx, strokes, brush, p, total);
    onProgress(globalProgress('lineart', p), 'lineart');
  }, shouldCancel, startedAt);

  if (shouldCancel()) return;

  await runPhase('fill', PHASE_WEIGHTS.fill * totalDuration, (p) => {
    drawFillUpTo(ctx, image, strokes, brush, p, total);
    onProgress(globalProgress('fill', p), 'fill');
  }, shouldCancel, startedAt);

  if (shouldCancel()) return;

  await runPhase('finish', PHASE_WEIGHTS.finish * totalDuration, (p) => {
    drawFinishUpTo(ctx, image, strokes, brush, p);
    onProgress(globalProgress('finish', p), 'finish');
  }, shouldCancel, startedAt);

  onProgress(1, 'finish');
}

function globalProgress(phase: PhaseName, phaseProgress: number): number {
  const order: PhaseName[] = ['draft', 'lineart', 'fill', 'finish'];
  let base = 0;
  for (const p of order) {
    if (p === phase) return base + PHASE_WEIGHTS[p] * phaseProgress;
    base += PHASE_WEIGHTS[p];
  }
  return base;
}

function runPhase(
  _name: PhaseName,
  duration: number,
  onTick: (progress: number) => void,
  shouldCancel: () => boolean,
  globalStart: number,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const phaseStart = performance.now();
    const loop = () => {
      if (shouldCancel()) {
        resolve();
        return;
      }
      const elapsed = performance.now() - phaseStart;
      const p = Math.min(1, elapsed / Math.max(1, duration));
      onTick(p);
      if (p >= 1) {
        resolve();
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    void globalStart;
  });
}

function drawDraftBatch(ctx: CanvasRenderingContext2D, strokes: Stroke[], progress: number): void {
  const limit = Math.floor(strokes.length * progress);
  ctx.save();
  ctx.strokeStyle = 'rgba(120,120,130,0.18)';
  ctx.lineWidth = 0.7;
  for (let s = 0; s < limit; s++) {
    const pts = strokes[s].points;
    if (pts.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    const step = Math.max(2, Math.floor(pts.length / 12));
    for (let i = step; i < pts.length; i += step) {
      const jx = (Math.random() - 0.5) * 1.5;
      const jy = (Math.random() - 0.5) * 1.5;
      ctx.lineTo(pts[i].x + jx, pts[i].y + jy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawLineartUpTo(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  brush: BrushKind,
  progress: number,
  totalPoints: number,
): void {
  const drawUntil = Math.floor(totalPoints * progress);
  let drawn = 0;
  for (const stroke of strokes) {
    const pts = stroke.points;
    if (drawn + pts.length <= drawUntil) {
      drawWholeStroke(ctx, brush, pts);
      drawn += pts.length;
    } else {
      const partial = drawUntil - drawn;
      if (partial > 1) drawWholeStroke(ctx, brush, pts.slice(0, partial));
      break;
    }
  }
}

function drawWholeStroke(
  ctx: CanvasRenderingContext2D,
  brush: BrushKind,
  pts: Array<{ x: number; y: number }>,
): void {
  for (let i = 1; i < pts.length; i++) {
    drawLineSegment(ctx, brush, pts[i - 1], pts[i], 1);
  }
}

function drawFillUpTo(
  ctx: CanvasRenderingContext2D,
  image: ProcessedImage,
  strokes: Stroke[],
  brush: BrushKind,
  progress: number,
  totalPoints: number,
): void {
  const fillCount = Math.floor(totalPoints * progress);
  let processed = 0;
  for (const stroke of strokes) {
    const pts = stroke.points;
    const step = Math.max(4, Math.floor(pts.length / 20));
    for (let i = 0; i < pts.length; i += step) {
      if (processed > fillCount) return;
      const p = pts[i];
      const color = sampleColorAt(image, p.x, p.y);
      const radius = brush === 'watercolor' ? 12 : brush === 'marker' ? 9 : 7;
      paintBlob(ctx, p.x, p.y, radius, color, 0.85, brush);
      processed += step;
    }
  }
}

function drawFinishUpTo(
  ctx: CanvasRenderingContext2D,
  image: ProcessedImage,
  strokes: Stroke[],
  brush: BrushKind,
  progress: number,
): void {
  const limit = Math.floor(strokes.length * progress);
  for (let s = 0; s < limit; s++) {
    const pts = strokes[s].points;
    for (let i = 0; i < pts.length; i += 5) {
      const p = pts[i];
      const color = sampleColorAt(image, p.x, p.y);
      const darker: [number, number, number] = [
        Math.floor(color[0] * 0.7),
        Math.floor(color[1] * 0.7),
        Math.floor(color[2] * 0.75),
      ];
      paintBlob(ctx, p.x, p.y, 3, darker, 0.5, brush);
    }
  }
}
