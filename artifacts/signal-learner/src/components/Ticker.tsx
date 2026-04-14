import { useEffect, useRef, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TickerEntry {
  asset: string;
  price: number;
  change: number;
  changePercent: number;
}

async function fetchTicker(): Promise<TickerEntry[]> {
  const res = await fetch("/api/ticker");
  if (!res.ok) return [];
  return res.json();
}

export function Ticker() {
  const [data, setData] = useState<TickerEntry[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const d = await fetchTicker();
      if (mounted) setData(d);
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  if (data.length === 0) return null;

  // Duplicate for infinite scroll effect
  const items = [...data, ...data];

  return (
    <div className="w-full overflow-hidden border-b border-border bg-card/80 backdrop-blur-sm h-9 flex items-center select-none">
      <div className="shrink-0 px-3 border-r border-border h-full flex items-center bg-primary/10">
        <span className="text-[9px] font-bold text-primary uppercase tracking-widest whitespace-nowrap">Live Prices</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div
          ref={trackRef}
          className="flex gap-0 whitespace-nowrap animate-ticker"
          style={{ animationDuration: `${data.length * 4}s` }}
        >
          {items.map((item, i) => {
            const up = item.change > 0;
            const down = item.change < 0;
            return (
              <div
                key={`${item.asset}-${i}`}
                className="flex items-center gap-2 px-5 border-r border-border/30 h-9 shrink-0"
              >
                <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono">{item.asset}</span>
                <span className="text-[11px] font-bold font-mono text-foreground">
                  {item.price >= 1000
                    ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : item.price < 1
                    ? item.price.toFixed(5)
                    : item.price.toFixed(4)}
                </span>
                <span className={`flex items-center gap-0.5 text-[10px] font-mono font-bold ${up ? 'text-success' : down ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {up ? <TrendingUp className="w-2.5 h-2.5" /> : down ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                  {up ? '+' : ''}{item.changePercent.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
