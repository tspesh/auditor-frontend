interface StatProps {
  label: string;
  value: number;
  alert?: boolean;
}

export function Stat({ label, value, alert = false }: StatProps) {
  return (
    <div className="text-center p-3 bg-neutral-50 rounded-lg">
      <p className={`text-2xl font-heading font-bold ${alert ? 'text-red-500' : 'text-neutral-900'}`}>
        {value}
      </p>
      <p className="text-xs text-neutral-500 mt-1">{label}</p>
    </div>
  );
}
