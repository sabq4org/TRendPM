export function Sparkline({
  data,
  w = 60,
  h = 20,
  color = "var(--accent)",
}: {
  data: number[];
  w?: number;
  h?: number;
  color?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });
  const path = "M " + pts.map((p) => p.join(" ")).join(" L ");
  const area = path + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg className="chart" width={w} height={h} style={{ display: "block" }}>
      <path d={area} fill={color} className="chart-area" />
      <path d={path} stroke={color} className="chart-line" />
    </svg>
  );
}

export function VelocityChart({ data = [18, 22, 19, 24, 27, 23, 29, 31] }: { data?: number[] }) {
  const w = 540;
  const h = 160;
  const p = 28;
  const max = Math.max(...data) * 1.2;
  const bw = (w - p * 2) / data.length;
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }}>
      {[0, 0.25, 0.5, 0.75, 1].map((r) => {
        const y = p + (h - p * 2) * (1 - r);
        return (
          <g key={r}>
            <line x1={p} x2={w - p} y1={y} y2={y} className="chart-grid" />
            <text x={p - 6} y={y + 3} textAnchor="end" className="chart-axis">
              {Math.round(max * r)}
            </text>
          </g>
        );
      })}
      {data.map((v, i) => {
        const bh = (v / max) * (h - p * 2);
        const x = p + i * bw + 4;
        const y = h - p - bh;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={bw - 8}
              height={bh}
              fill="var(--accent)"
              opacity={i === data.length - 1 ? 1 : 0.5}
              rx={2}
            />
            <text x={x + (bw - 8) / 2} y={h - p + 12} textAnchor="middle" className="chart-axis">
              W{i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function BurnDown() {
  const ideal = [100, 88, 75, 63, 50, 38, 25, 13, 0];
  const actual = [100, 92, 84, 78, 68, 58, 52, 44];
  const w = 540;
  const h = 140;
  const p = 24;
  const xStep = (w - p * 2) / (ideal.length - 1);
  const toPath = (arr: number[]) =>
    "M " +
    arr
      .map((v, i) => `${p + i * xStep} ${p + (1 - v / 100) * (h - p * 2)}`)
      .join(" L ");
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }}>
      {[0, 0.5, 1].map((r) => {
        const y = p + (h - p * 2) * (1 - r);
        return <line key={r} x1={p} x2={w - p} y1={y} y2={y} className="chart-grid" />;
      })}
      <path d={toPath(ideal)} stroke="var(--text-4)" strokeDasharray="3 3" fill="none" strokeWidth={1} />
      <path d={toPath(actual)} stroke="var(--accent)" fill="none" strokeWidth={1.5} />
      {actual.map((v, i) => (
        <circle
          key={i}
          cx={p + i * xStep}
          cy={p + (1 - v / 100) * (h - p * 2)}
          r={2}
          fill="var(--accent)"
        />
      ))}
    </svg>
  );
}
