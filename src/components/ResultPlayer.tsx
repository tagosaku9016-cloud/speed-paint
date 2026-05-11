import { useEffect, useState } from 'react';
import { shareOrDownload, triggerDownload } from '../lib/shareSave';

type Props = {
  blob: Blob;
  extension: 'mp4' | 'webm';
  onReset: () => void;
};

export function ResultPlayer({ blob, extension, onReset }: Props) {
  const [url, setUrl] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const filename = `speed-paint-${Date.now()}.${extension}`;

  const handleSave = async () => {
    setStatus('保存準備中...');
    try {
      const result = await shareOrDownload(blob, filename);
      setStatus(result === 'shared' ? '共有シートから保存できます' : 'ダウンロードしました');
    } catch {
      setStatus('保存に失敗しました');
    }
  };

  const handleDownload = () => {
    triggerDownload(blob, filename);
    setStatus('ダウンロードしました');
  };

  return (
    <section className="card">
      <h2>✨ 完成しました</h2>
      {url && (
        <video
          src={url}
          controls
          playsInline
          muted
          autoPlay
          loop
          style={{ width: '100%', borderRadius: 12 }}
        />
      )}
      <div className="button-stack">
        <button className="primary" onClick={handleSave}>
          📤 保存 / 共有
        </button>
        <button onClick={handleDownload}>📥 ダウンロード</button>
        <button className="ghost" onClick={onReset}>
          🔄 もう一度作る
        </button>
      </div>
      {status && <p className="muted">{status}</p>}
      <p className="muted small">
        ファイル形式: {extension.toUpperCase()}
        {extension === 'webm' && '（このブラウザはMP4出力に未対応）'}
      </p>
    </section>
  );
}
