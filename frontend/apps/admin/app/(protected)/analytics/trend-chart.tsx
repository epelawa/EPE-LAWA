type TrendChartProps = {
  label: string;
  points: { day: string; total: number }[];
};

export default function TrendChart({ label, points }: TrendChartProps) {
  if (!points.length) {
    return <p className="ui-meta">No data recorded for this metric yet.</p>;
  }
  const width = 560;
  const height = 140;
  const pad = 8;
  const max = Math.max(...points.map((point) => point.total), 1);
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((point, index) => {
    const x = pad + index * stepX;
    const y = height - pad - (point.total / max) * (height - pad * 2);
    return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
  });
  const line = coords.join(" ");
  const area = `${pad},${height - pad} ${line} ${pad + (points.length - 1) * stepX},${height - pad}`;
  const total = points.reduce((sum, point) => sum + point.total, 0);
  const peak = points.reduce((best, point) => (point.total > best.total ? point : best), points[0]);

  return <figure className="ui-stack-sm" role="img" aria-label={`${label}: ${total} in the selected period, highest day ${peak.day} with ${peak.total}.`}>
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <title>{label}</title>
      {total > 0 ? (<>
        <polygon points={area} fill="var(--ep-primary, #477fe0)" opacity="0.12" />
        <polyline points={line} fill="none" stroke="var(--ep-primary, #477fe0)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </>) : (
        <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="var(--ep-text-muted, #40516F)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
    <figcaption className="ui-meta">
      {label} · {total} in the period · peak {peak.total} on {peak.day}
    </figcaption>
  </figure>;
}
