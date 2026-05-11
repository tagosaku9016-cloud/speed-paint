import { useRef } from 'react';

type Props = {
  previewUrl: string | null;
  onSelect: (file: File) => void;
  disabled?: boolean;
};

export function ImagePicker({ previewUrl, onSelect, disabled }: Props) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onSelect(file);
    e.target.value = '';
  };

  return (
    <section className="card">
      <h2>1. 画像を選ぶ</h2>
      <div className="picker-row">
        <button
          className="primary"
          onClick={() => libraryRef.current?.click()}
          disabled={disabled}
        >
          📷 写真を選ぶ
        </button>
        <button onClick={() => cameraRef.current?.click()} disabled={disabled}>
          📸 撮影する
        </button>
      </div>
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleChange}
      />
      {previewUrl && (
        <div className="preview-wrap">
          <img src={previewUrl} alt="プレビュー" />
        </div>
      )}
    </section>
  );
}
