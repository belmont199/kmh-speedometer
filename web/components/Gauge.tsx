interface GaugeProps {
  /** Current speed in km/h. */
  kmh: number;
  /** Top of the scale in km/h. */
  max?: number;
  children?: React.ReactNode;
}

const START = 135; // degrees, measured clockwise from 3 o'clock
const SWEEP = 270;
const C = 150; // centre of the 300×300 viewBox

function polar(r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(a), y: C + r * Math.sin(a) };
}

function arc(r: number, from: number, to: number) {
  const a = polar(r, from);
  const b = polar(r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function colorFor(kmh: number) {
  if (kmh >= 110) return "var(--red)";
  if (kmh >= 80) return "var(--amber)";
  return "var(--green)";
}

export function Gauge({ kmh, max = 200, children }: GaugeProps) {
  const clamped = Math.max(0, Math.min(kmh, max));
  const end = START + (clamped / max) * SWEEP;
  const ticks = [];
  for (let v = 0; v <= max; v += 10) {
    const deg = START + (v / max) * SWEEP;
    const major = v % 20 === 0;
    const p1 = polar(major ? 112 : 117, deg);
    const p2 = polar(124, deg);
    ticks.push(
      <line
        key={v}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        className={v <= clamped ? "tick tick-on" : "tick"}
        strokeWidth={major ? 3 : 1.5}
      />,
    );
    if (major && v % 40 === 0) {
      const t = polar(96, deg);
      ticks.push(
        <text key={`l${v}`} x={t.x} y={t.y} className="tick-label" textAnchor="middle" dominantBaseline="central">
          {v}
        </text>,
      );
    }
  }

  return (
    <div className="gauge">
      <svg viewBox="0 0 300 300" aria-hidden="true">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d={arc(136, START, START + SWEEP)} className="track" />
        {clamped > 0.5 && (
          <path d={arc(136, START, end)} className="fill" stroke={colorFor(kmh)} filter="url(#glow)" />
        )}
        {ticks}
      </svg>
      <div className="gauge-center">{children}</div>
    </div>
  );
}
