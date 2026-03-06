interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-neutral-200 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50">
        <h3 className="font-heading font-semibold text-lg text-neutral-900">{title}</h3>
      </div>
      <div className="px-6 py-6">
        {children}
      </div>
    </div>
  );
}
