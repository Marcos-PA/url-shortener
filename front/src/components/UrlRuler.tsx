const STEPS = [5, 10, 20, 25, 50, 100, 200, 250, 500];

// Compares the character count of the original URL and the short link on a shared scale.
export default function UrlRuler({ original, short }: { original: string; short: string }) {
  const max = Math.max(original.length, short.length);
  const step = STEPS.find((s) => max / s <= 8) ?? 1000;
  const scale = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: scale / step + 1 }, (_, i) => i * step);
  const saved = Math.round((1 - short.length / original.length) * 100);
  const pct = (n: number) => `${(n / scale) * 100}%`;

  const bars = [
    { label: "Original", length: original.length, color: "bg-muted-foreground" },
    { label: "Short", length: short.length, color: "bg-primary" },
  ];

  return (
    <figure className="flex flex-col gap-2" aria-label={`Original ${original.length} characters, short ${short.length} characters`}>
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{b.label}</span>
            <span className="font-mono">{b.length} chars</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div className={`h-full rounded-full ${b.color}`} style={{ width: pct(b.length) }} />
          </div>
        </div>
      ))}

      <div className="relative mt-1 h-7 border-t border-border" aria-hidden>
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center first:translate-x-0 first:items-start last:-translate-x-full last:items-end"
            style={{ left: pct(t) }}
          >
            <div className="h-2 w-px bg-border" />
            <span className="font-mono text-[10px] text-muted-foreground">{t}</span>
          </div>
        ))}
      </div>

      <figcaption className="text-xs text-muted-foreground">
        {saved >= 0 ? `${saved}% shorter` : `${-saved}% longer: this URL was already short`}
      </figcaption>
    </figure>
  );
}
