const COLOR_MAP: Record<string, string> = {
  growth: 'bg-growth-50 text-growth-700 border-growth-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-neutral-100 text-neutral-700 border-neutral-200',
};

interface TagListProps {
  items: string[];
  color?: string;
}

export function TagList({ items, color = 'growth' }: TagListProps) {
  if (!items.length) return <span className="text-neutral-400 italic text-sm">None detected</span>;
  const cls = COLOR_MAP[color] ?? COLOR_MAP.growth;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => (
        <span key={i} className={`inline-block px-3 py-1 rounded-md text-sm border ${cls}`}>
          {item}
        </span>
      ))}
    </div>
  );
}
