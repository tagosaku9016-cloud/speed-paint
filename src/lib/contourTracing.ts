export type Point = { x: number; y: number };
export type Stroke = { points: Point[] };

const NEIGHBORS_8: Array<[number, number]> = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

export function extractStrokes(
  edges: Uint8Array,
  width: number,
  height: number,
  minLength = 8,
): Stroke[] {
  const visited = new Uint8Array(edges.length);
  const strokes: Stroke[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edges[idx] !== 1 || visited[idx]) continue;
      const points = trace(edges, visited, width, height, x, y);
      if (points.length >= minLength) {
        strokes.push({ points });
      }
    }
  }

  strokes.sort((a, b) => b.points.length - a.points.length);
  return strokes;
}

function trace(
  edges: Uint8Array,
  visited: Uint8Array,
  width: number,
  height: number,
  startX: number,
  startY: number,
): Point[] {
  const points: Point[] = [];
  let x = startX;
  let y = startY;
  let prevDir = 0;
  const maxSteps = 4096;

  for (let step = 0; step < maxSteps; step++) {
    const idx = y * width + x;
    if (visited[idx]) break;
    visited[idx] = 1;
    points.push({ x, y });

    let found = false;
    for (let i = 0; i < 8; i++) {
      const dir = (prevDir + 6 + i) & 7;
      const [dx, dy] = NEIGHBORS_8[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (edges[nIdx] === 1 && !visited[nIdx]) {
        x = nx;
        y = ny;
        prevDir = dir;
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  return points;
}

export function countTotalPoints(strokes: Stroke[]): number {
  let sum = 0;
  for (const s of strokes) sum += s.points.length;
  return sum;
}
