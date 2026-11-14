import { useState } from "react";

// Small SVG charts in the FitConsole style: one y-axis, thin marks, hover tooltip, legend for 2+ series.
const W = 640;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;

function niceMax(value) {
  if (value <= 5) return 5;
  const step = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / step) * step;
}

function Tooltip({ point }) {
  if (!point) return null;
  return <div className="viz-tooltip" style={{ left: `${(point.x / W) * 100}%`, top: `${(point.y / H) * 100}%` }} role="status">
    <b>{point.title}</b>
    {point.rows.map(([label, value, color]) => <span key={label}>{color && <i style={{ background: color }} aria-hidden="true" />}{label}<em>{value}</em></span>)}
  </div>;
}

// Bars for one measure, with an optional target tick per bar (for example scheduled sessions).
export function BarChart({ data, value, target, label, targetLabel, format = (v) => v, color = "var(--viz-1)", ariaLabel }) {
  const [hover, setHover] = useState(null);
  const max = niceMax(Math.max(1, ...data.map((row) => Math.max(row[value] ?? 0, target ? row[target] ?? 0 : 0))));
  const slot = innerW / Math.max(1, data.length);
  const barW = Math.min(28, slot * 0.6);
  const y = (v) => PAD.top + innerH - (v / max) * innerH;
  return <figure className="viz">
    {target && <figcaption className="viz-legend"><span><i style={{ background: color }} />{label}</span><span><i className="viz-tick-swatch" />{targetLabel}</span></figcaption>}
    <div className="viz-frame">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((t) => <g key={t}><line className="viz-grid" x1={PAD.left} x2={W - PAD.right} y1={y(max * t)} y2={y(max * t)} /><text className="viz-axis" x={PAD.left - 6} y={y(max * t) + 3} textAnchor="end">{Math.round(max * t)}</text></g>)}
        {data.map((row, index) => {
          const cx = PAD.left + slot * index + slot / 2;
          const v = row[value] ?? 0;
          const top = y(v);
          const height = Math.max(0, PAD.top + innerH - top);
          return <g key={row.key} onMouseEnter={() => setHover({ x: cx, y: Math.min(top, target ? y(row[target] ?? 0) : top), title: row.label, rows: [[label, format(v), color], ...(target ? [[targetLabel, format(row[target] ?? 0)]] : [])] })}>
            <rect className="viz-hit" x={cx - slot / 2} y={PAD.top} width={slot} height={innerH} />
            {height > 0 && <path d={`M${cx - barW / 2},${PAD.top + innerH} V${top + Math.min(4, height)} Q${cx - barW / 2},${top} ${cx - barW / 2 + Math.min(4, height)},${top} H${cx + barW / 2 - Math.min(4, height)} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + Math.min(4, height)} V${PAD.top + innerH} Z`} fill={color} opacity={hover && hover.title !== row.label ? 0.55 : 1} />}
            {target && row[target] > 0 && <line className="viz-tick" x1={cx - barW / 2 - 4} x2={cx + barW / 2 + 4} y1={y(row[target])} y2={y(row[target])} />}
            {(data.length <= 14 || index % Math.ceil(data.length / 10) === 0) && <text className="viz-axis" x={cx} y={H - 8} textAnchor="middle">{row.short ?? row.label}</text>}
          </g>;
        })}
        <line className="viz-baseline" x1={PAD.left} x2={W - PAD.right} y1={PAD.top + innerH} y2={PAD.top + innerH} />
      </svg>
      <Tooltip point={hover} />
    </div>
  </figure>;
}

// Lines sharing one y-scale (e.g. three 1–5 wellness scores, or weight in kg).
export function LineChart({ data, series, yDomain, format = (v) => v, ariaLabel }) {
  const [hover, setHover] = useState(null);
  const values = data.flatMap((row) => series.map((item) => row[item.key])).filter((v) => v != null);
  const [minY, maxY] = yDomain ?? [Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)];
  const x = (index) => PAD.left + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (v) => PAD.top + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;
  const ticks = [minY, (minY + maxY) / 2, maxY];
  const nearest = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - box.left) / box.width) * W;
    const index = Math.max(0, Math.min(data.length - 1, Math.round(((px - PAD.left) / innerW) * (data.length - 1))));
    const row = data[index];
    setHover({ index, x: x(index), y: PAD.top, title: row.label, rows: series.filter((item) => row[item.key] != null).map((item) => [item.label, format(row[item.key]), item.color]) });
  };
  return <figure className="viz">
    {series.length > 1 && <figcaption className="viz-legend">{series.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}</figcaption>}
    <div className="viz-frame">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} onMouseMove={nearest} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => <g key={t}><line className="viz-grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} /><text className="viz-axis" x={PAD.left - 6} y={y(t) + 3} textAnchor="end">{Number(t.toFixed(1))}</text></g>)}
        {data.map((row, index) => (data.length <= 12 || index % Math.ceil(data.length / 8) === 0) && <text key={row.key} className="viz-axis" x={x(index)} y={H - 8} textAnchor="middle">{row.short ?? row.label}</text>)}
        {series.map((item) => {
          const points = data.map((row, index) => (row[item.key] == null ? null : [x(index), y(row[item.key])])).filter(Boolean);
          if (!points.length) return null;
          const last = points.at(-1);
          return <g key={item.key}>
            <polyline fill="none" stroke={item.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={points.map((p) => p.join(",")).join(" ")} />
            {points.length <= 16 && points.map(([px, py]) => <circle key={`${px}-${py}`} cx={px} cy={py} r="4" fill={item.color} stroke="var(--surface)" strokeWidth="2" />)}
            {series.length > 1 && series.length <= 4 && <text className="viz-direct" x={Math.min(last[0] + 6, W - 2)} y={last[1] + 3} textAnchor={last[0] > W - 60 ? "end" : "start"}>{item.label}</text>}
          </g>;
        })}
        {hover && <line className="viz-crosshair" x1={hover.x} x2={hover.x} y1={PAD.top} y2={PAD.top + innerH} />}
      </svg>
      <Tooltip point={hover} />
    </div>
  </figure>;
}
