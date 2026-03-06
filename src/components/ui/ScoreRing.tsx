interface ScoreRingProps {
  score: number;
  max?: number;
}

export function ScoreRing({ score, max = 10 }: ScoreRingProps) {
  const pct = (score / max) * 100;
  const color =
    pct >= 80 ? 'text-green-500' :
    pct >= 50 ? 'text-yellow-500' :
    'text-red-500';
  const strokeColor =
    pct >= 80 ? 'stroke-green-500' :
    pct >= 50 ? 'stroke-yellow-500' :
    'stroke-red-500';

  return (
    <div className="relative inline-flex items-center justify-center w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="34" fill="none" strokeWidth="6" className="stroke-neutral-200" />
        <circle
          cx="40" cy="40" r="34" fill="none" strokeWidth="6"
          className={strokeColor}
          strokeLinecap="round"
          strokeDasharray={`${(pct / 100) * 213.6} 213.6`}
        />
      </svg>
      <span className={`absolute font-heading font-bold text-xl ${color}`}>{score}</span>
    </div>
  );
}
