import { drawLineSegment, type BrushKind } from './brushes';
import type { ProcessedImage } from './imageProcessing';
import type { Point, Stroke } from './contourTracing';

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
  draft: 0.15,
  lineart: 0.2,
  fill: 0.45,
  finish: 0.2,
};

export async function renderSpeedPaint(opts: RenderOptions): Promise<void> {
  const { ctx, image, strokes, brush, durationMs, speedMultiplier, onProgress, shouldCancel } = opts;

  ctx.fillStyle = image.bgColor;
  ctx.fillRect(0, 0, image.width, image.height);

  const totalDuration = durationMs / Math.max(0.1, speedMultiplier);
  const totalPoints = strokes.reduce((s, st) => s + st.points.length, 0);

  await runStrokePhase(
    ctx,
    strokes,
    totalPoints,
    brush,
    image,
    'sketch',
    totalDuration * PHASE_WEIGHTS.draft,
    (p) => onProgress(globalProgress('draft', p), 'draft'),
    shouldCancel,
  );
  if (shouldCancel()) return;

  await runStrokePhase(
    ctx,
    strokes,
    totalPoints,
    brush,
    image,
    'lineart',
    totalDuration * PHASE_WEIGHTS.lineart,
    (p) => onProgress(globalProgress('lineart', p), 'lineart'),
    shouldCancel,
  );
  if (shouldCancel()) return;

  await runStrokePhase(
    ctx,
    strokes,
    totalPoints,
    brush,
    image,
    'reveal',
    totalDuration * PHASE_WEIGHTS.fill,
    (p) => onProgress(globalProgress('fill', p), 'fill'),
    shouldCancel,
  );
  if (shouldCancel()) return;

  await runFinishPhase(
    ctx,
    image,
    totalDuration * PHASE_WEIGHTS.finish,
    (p) => onProgress(globalProgress('finish', p), 'finish'),
    shouldCancel,
  );

  ctx.drawImage(image.sourceCanvas, 0, 0, image.width, image.height);
  onProgress(1, 'finish');
}

type PhaseStyle = 'sketch' | 'lineart' | 'reveal';

function runStrokePhase(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  totalPoints: number,
  brush: BrushKind,
  image: ProcessedImage,
  style: PhaseStyle,
  duration: number,
  onProgress: (p: number) => void,
  shouldCancel: () => boolean,
): Promise<void> {
  return new Promise((resolve) => {
    let drawnIndex = 0;
    const start = performance.now();

    function step() {
      if (shouldCancel()) {
        resolve();
        return;
      }
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / Math.max(1, duration));
      const target = Math.floor(totalPoints * t);
      if (target > drawnIndex) {
        drawSegments(ctx, strokes, drawnIndex, target, brush, style, image);
        drawnIndex = target;
      }
      onProgress(t);
      if (t >= 1) resolve();
      else requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function drawSegments(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  fromIdx: number,
  toIdx: number,
  brush: BrushKind,
  style: PhaseStyle,
  image: ProcessedImage,
): void {
  let cumulative = 0;
  for (const stroke of strokes) {
    const pts = stroke.points;
    const start = cumulative;
    const end = cumulative + pts.length;
    if (fromIdx >= end) {
      cumulative = end;
      continue;
    }
    if (toIdx <= start) break;

    const localFrom = Math.max(0, fromIdx - start);
    const localTo = Math.min(pts.length, toIdx - start);

    for (let i = Math.max(1, localFrom); i < localTo; i++) {
      drawOneSegment(ctx, pts[i - 1], pts[i], brush, style, image);
    }
    cumulative = end;
  }
}

function drawOneSegment(
  ctx: CanvasRenderingContext2D,
  p1: Point,
  p2: Point,
  brush: BrushKind,
  style: PhaseStyle,
  image: ProcessedImage,
): void {
  if (style === 'sketch') {
    drawSketchSegment(ctx, p1, p2);
  } else if (style === 'lineart') {
    drawLineSegment(ctx, brush, p1, p2, 1);
  } else {
    revealAt(ctx, image, p2.x, p2.y, brushRadius(brush));
  }
}

function drawSketchSegment(ctx: CanvasRenderingContext2D, p1: Point, p2: Point): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(120, 120, 130, 0.45)';
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'round';
  const jx = (Math.random() - 0.5) * 1.6;
  const jy = (Math.random() - 0.5) * 1.6;
  ctx.beginPath();
  ctx.moveTo(p1.x + jx, p1.y + jy);
  ctx.lineTo(p2.x + jx, p2.y + jy);
  ctx.stroke();
  ctx.restore();
}

function brushRadius(brush: BrushKind): number {
  switch (brush) {
    case 'pencil':
      return 14;
    case 'pen':
      return 16;
    case 'marker':
      return 22;
    case 'watercolor':
      return 26;
  }
}

function revealAt(
  ctx: CanvasRenderingContext2D,
  image: ProcessedImage,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image.sourceCanvas, 0, 0, image.width, image.height);
  ctx.restore();
}

function runFinishPhase(
  ctx: CanvasRenderingContext2D,
  image: ProcessedImage,
  duration: number,
  onProgress: (p: number) => void,
  shouldCancel: () => boolean,
): Promise<void> {
  const points = generateFillGrid(image.width, image.height, 36);
  const total = points.length;

  return new Promise((resolve) => {
    let drawnIdx = 0;
    const start = performance.now();

    function step() {
      if (shouldCancel()) {
        resolve();
        return;
      }
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / Math.max(1, duration));
      const target = Math.floor(total * t);
      for (let i = drawnIdx; i < target; i++) {
        revealAt(ctx, image, points[i].x, points[i].y, 30);
      }
      drawnIdx = target;
      onProgress(t);
      if (t >= 1) resolve();
      else requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

function generateFillGrid(w: number, h: number, spacing: number): Point[] {
  const pts: Point[] = [];
  for (let y = spacing / 2; y < h; y += spacing) {
    for (let x = spacing / 2; x < w; x += spacing) {
      pts.push({ x, y });
    }
  }
  for (let i = pts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pts[i], pts[j]] = [pts[j], pts[i]];
  }
  return pts;
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
