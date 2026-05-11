import type { PhaseName } from '../lib/phaseRenderer';

type Props = {
  progress: number;
  phase: PhaseName | null;
  onCancel: () => void;
};

const PHASE_LABEL: Record<PhaseName, string> = {
  draft: '下書き中...',
  lineart: '線画を描いてます...',
  fill: '色を塗っています...',
  finish: '仕上げ中...',
};

export function ProgressView({ progress, phase, onCancel }: Props) {
  const pct = Math.round(progress * 100);
  return (
    <section className="card">
      <h2>動画を生成中</h2>
      <p className="muted">{phase ? PHASE_LABEL[phase] : '準備中...'}</p>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${pct}%` }} />
      </div>
      <p className="muted">{pct}%</p>
      <p className="warn">⚠️ 画面を消さずにお待ちください</p>
      <button className="ghost" onClick={onCancel}>
        キャンセル
      </button>
    </section>
  );
}
