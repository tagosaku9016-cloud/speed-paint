import { BRUSHES, type BrushKind } from '../lib/brushes';

export type Quality = 'standard' | 'high';

export type Style = {
  brush: BrushKind;
  speed: number;
  durationSec: number;
  quality: Quality;
};

type Props = {
  value: Style;
  onChange: (v: Style) => void;
  disabled?: boolean;
};

const SPEEDS = [0.5, 1, 2, 3];
const DURATIONS = [10, 30, 60];
const QUALITIES: Array<{ key: Quality; label: string }> = [
  { key: 'standard', label: '標準' },
  { key: 'high', label: '高画質' },
];

export function StylePanel({ value, onChange, disabled }: Props) {
  return (
    <section className="card">
      <h2>2. スタイルを選ぶ</h2>

      <div className="field">
        <label>ブラシ</label>
        <div className="chip-row">
          {BRUSHES.map((b) => (
            <button
              key={b.kind}
              className={value.brush === b.kind ? 'chip selected' : 'chip'}
              onClick={() => onChange({ ...value, brush: b.kind })}
              disabled={disabled}
            >
              <span>{b.emoji}</span>
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>再生速度</label>
        <div className="chip-row">
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={value.speed === s ? 'chip selected' : 'chip'}
              onClick={() => onChange({ ...value, speed: s })}
              disabled={disabled}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>動画の長さ</label>
        <div className="chip-row">
          {DURATIONS.map((d) => (
            <button
              key={d}
              className={value.durationSec === d ? 'chip selected' : 'chip'}
              onClick={() => onChange({ ...value, durationSec: d })}
              disabled={disabled}
            >
              {d}秒
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>画質</label>
        <div className="chip-row">
          {QUALITIES.map((q) => (
            <button
              key={q.key}
              className={value.quality === q.key ? 'chip selected' : 'chip'}
              onClick={() => onChange({ ...value, quality: q.key })}
              disabled={disabled}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export const defaultStyle: Style = {
  brush: 'pencil',
  speed: 1,
  durationSec: 30,
  quality: 'standard',
};
