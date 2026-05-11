export type RecorderResult = {
  blob: Blob;
  mimeType: string;
  extension: 'mp4' | 'webm';
};

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export function pickSupportedMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(m)) return m;
    } catch {
      // ignore
    }
  }
  return null;
}

export function isRecordingSupported(): boolean {
  return pickSupportedMime() !== null;
}

export class CanvasRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType: string;
  private donePromise: Promise<RecorderResult> | null = null;

  constructor(private canvas: HTMLCanvasElement, mime?: string) {
    const picked = mime ?? pickSupportedMime();
    if (!picked) throw new Error('お使いのブラウザは動画録画に対応していません。');
    this.mimeType = picked;
  }

  start(fps = 30, bitsPerSecond = 4_000_000): void {
    const stream = this.canvas.captureStream(fps);
    const recorder = new MediaRecorder(stream, {
      mimeType: this.mimeType,
      videoBitsPerSecond: bitsPerSecond,
    });
    this.mediaRecorder = recorder;
    this.chunks = [];

    this.donePromise = new Promise<RecorderResult>((resolve, reject) => {
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) this.chunks.push(e.data);
      };
      recorder.onstop = () => {
        const ext: 'mp4' | 'webm' = this.mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(this.chunks, { type: this.mimeType });
        resolve({ blob, mimeType: this.mimeType, extension: ext });
      };
      recorder.onerror = (e) => reject(e);
    });

    recorder.start(100);
  }

  async stop(): Promise<RecorderResult> {
    if (!this.mediaRecorder || !this.donePromise) {
      throw new Error('Recorder not started');
    }
    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    return this.donePromise;
  }
}
