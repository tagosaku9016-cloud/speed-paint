import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePicker } from './components/ImagePicker';
import { StylePanel, defaultStyle, type Style } from './components/StylePanel';
import { ProgressView } from './components/ProgressView';
import { ResultPlayer } from './components/ResultPlayer';
import { loadAndPrepare, type ProcessedImage } from './lib/imageProcessing';
import { extractStrokes } from './lib/contourTracing';
import { renderSpeedPaint, type PhaseName } from './lib/phaseRenderer';
import { CanvasRecorder, isRecordingSupported } from './lib/videoRecorder';
import './App.css';

type AppState =
  | { kind: 'idle' }
  | { kind: 'ready'; file: File; previewUrl: string }
  | { kind: 'generating'; file: File; previewUrl: string }
  | { kind: 'done'; blob: Blob; extension: 'mp4' | 'webm'; previewUrl: string }
  | { kind: 'error'; message: string; previewUrl?: string };

export function App() {
  const [state, setState] = useState<AppState>({ kind: 'idle' });
  const [style, setStyle] = useState<Style>(defaultStyle);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<PhaseName | null>(null);
  const [recordingSupported] = useState(() => isRecordingSupported());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    return () => {
      if (state.kind === 'ready' || state.kind === 'generating' || state.kind === 'done') {
        URL.revokeObjectURL(state.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      setState((prev) => {
        if (prev.kind === 'ready' || prev.kind === 'done') URL.revokeObjectURL(prev.previewUrl);
        return { kind: 'ready', file, previewUrl: url };
      });
      setProgress(0);
      setPhase(null);
    },
    [],
  );

  const handleGenerate = useCallback(async () => {
    if (state.kind !== 'ready') return;
    if (!recordingSupported) {
      setState({ kind: 'error', message: 'お使いのブラウザは動画録画に対応していません。', previewUrl: state.previewUrl });
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    cancelRef.current = false;
    setProgress(0);
    setPhase('draft');
    setState({ kind: 'generating', file: state.file, previewUrl: state.previewUrl });

    let img: ProcessedImage;
    try {
      img = await loadAndPrepare(state.file);
    } catch {
      setState({ kind: 'error', message: '画像を読み込めませんでした。別の画像を試してください。', previewUrl: state.previewUrl });
      return;
    }

    const targetLong = style.quality === 'high' ? 1080 : 720;
    const scale = targetLong / Math.max(img.width, img.height);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    ctx.imageSmoothingEnabled = true;
    ctx.scale(scale, scale);

    const strokes = extractStrokes(img.edges, img.width, img.height);
    if (strokes.length === 0) {
      setState({ kind: 'error', message: 'エッジが検出できませんでした。輪郭のはっきりした画像を試してください。', previewUrl: state.previewUrl });
      return;
    }

    let recorder: CanvasRecorder;
    try {
      recorder = new CanvasRecorder(canvas);
      recorder.start(30);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '録画開始に失敗しました';
      setState({ kind: 'error', message: msg, previewUrl: state.previewUrl });
      return;
    }

    try {
      await renderSpeedPaint({
        ctx,
        image: img,
        strokes,
        brush: style.brush,
        durationMs: style.durationSec * 1000,
        speedMultiplier: style.speed,
        onProgress: (p, ph) => {
          setProgress(p);
          setPhase(ph);
        },
        shouldCancel: () => cancelRef.current,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '描画中にエラーが発生しました';
      setState({ kind: 'error', message: msg, previewUrl: state.previewUrl });
      try {
        await recorder.stop();
      } catch {
        // ignore
      }
      return;
    }

    if (cancelRef.current) {
      try {
        await recorder.stop();
      } catch {
        // ignore
      }
      setState({ kind: 'ready', file: state.file, previewUrl: state.previewUrl });
      return;
    }

    await new Promise((r) => setTimeout(r, 250));

    let result: Awaited<ReturnType<CanvasRecorder['stop']>>;
    try {
      result = await recorder.stop();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '録画の終了に失敗しました';
      setState({ kind: 'error', message: msg, previewUrl: state.previewUrl });
      return;
    }

    setState({ kind: 'done', blob: result.blob, extension: result.extension, previewUrl: state.previewUrl });
  }, [state, style, recordingSupported]);

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const handleReset = () => {
    if (state.kind === 'done' || state.kind === 'ready' || state.kind === 'generating') {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState({ kind: 'idle' });
    setProgress(0);
    setPhase(null);
  };

  const previewUrl =
    state.kind === 'ready' || state.kind === 'generating' || state.kind === 'done'
      ? state.previewUrl
      : state.kind === 'error'
        ? state.previewUrl ?? null
        : null;

  return (
    <main className="app">
      <header>
        <h1>🎨 Speed Paint</h1>
        <p className="tagline">写真から手描き風タイムラプス動画を作成</p>
      </header>

      {!recordingSupported && (
        <section className="card error">
          <p>
            ⚠️ お使いのブラウザは動画録画API（MediaRecorder）に対応していません。
            最新版のSafari / Chromeでお試しください。
          </p>
        </section>
      )}

      {(state.kind === 'idle' || state.kind === 'ready' || state.kind === 'error') && (
        <ImagePicker
          previewUrl={previewUrl ?? null}
          onSelect={handleSelect}
          disabled={false}
        />
      )}

      {(state.kind === 'ready' || state.kind === 'error') && (
        <>
          <StylePanel value={style} onChange={setStyle} />
          <section className="card">
            <button
              className="primary fullwidth"
              onClick={handleGenerate}
              disabled={state.kind === 'error' && !state.previewUrl}
            >
              ✨ 動画を作る
            </button>
          </section>
        </>
      )}

      {state.kind === 'error' && (
        <section className="card error">
          <p>{state.message}</p>
          <button className="ghost" onClick={handleReset}>
            最初に戻る
          </button>
        </section>
      )}

      {state.kind === 'generating' && (
        <ProgressView progress={progress} phase={phase} onCancel={handleCancel} />
      )}

      {state.kind === 'done' && (
        <ResultPlayer blob={state.blob} extension={state.extension} onReset={handleReset} />
      )}

      <div className="hidden-canvas-wrap">
        <canvas ref={canvasRef} />
      </div>

      <footer className="footer">
        <small>すべての処理はブラウザ内で実行されます。画像はサーバーに送信されません。</small>
      </footer>
    </main>
  );
}
