"use client";

interface QuotaIndicatorProps {
  remaining: number;
  total: number;
  resourceName: string;
}

export default function QuotaIndicator({ remaining, total, resourceName }: QuotaIndicatorProps) {
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
  const isLow = remaining <= 1;

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
      isLow
        ? "border-red-500/20 bg-red-500/5 text-red-600"
        : "border-border bg-muted/30 text-muted-foreground"
    }`}>
      <div className="flex-1 min-w-0">
        <span className="font-semibold">{remaining}</span>
        <span className="mx-1">/</span>
        <span>{total}</span>
        <span className="ml-1.5">{resourceName} remaining today</span>
      </div>
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isLow ? "bg-red-500" : "bg-ecu-purple"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
