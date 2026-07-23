// Small SVG line+dot chart in the Signal Terminal accent, per the design
// handoff's "Drafts per run" panel. Pure/presentational — safe in server
// components.
export default function Sparkline({ values, height = 48 }: { values: number[]; height?: number }) {
  if (values.length === 0) {
    return <div className="font-mono text-[12px] text-term-dim">no data yet</div>;
  }
  const W = 320;
  const max = Math.max(...values, 1);
  const points = values.map((v, i) => {
    const x = values.length === 1 ? W / 2 : (i / (values.length - 1)) * W;
    const y = height - 4 - (v / (max * 1.15)) * (height - 8);
    return { x, y };
  });

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none">
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="oklch(0.82 0.19 150)"
          strokeWidth="2"
        />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="oklch(0.82 0.19 150)" />
      ))}
    </svg>
  );
}
