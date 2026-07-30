/** Egyszerű kétsoros terület-chart (kérések + kattintások), külső lib nélkül. */
export function MiniChart({ a, b, height = 180 }: { a: number[]; b: number[]; height?: number }) {
  const W = 640;
  const H = height;
  const pad = 8;
  const max = Math.max(...a, ...b, 1);
  const stepX = (W - pad * 2) / Math.max(1, a.length - 1);
  const toPts = (arr: number[]) =>
    arr.map((v, i) => `${pad + i * stepX},${H - pad - (v / max) * (H - pad * 2)}`);
  const line = (arr: number[]) => toPts(arr).join(" ");
  const area = (arr: number[]) => `${pad},${H - pad} ${line(arr)} ${W - pad},${H - pad}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" preserveAspectRatio="none" role="img" aria-label="Kérések és kattintások az elmúlt 14 napban">
      <defs>
        <linearGradient id="fillReq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#007BC1" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#007BC1" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area(a)} fill="url(#fillReq)" />
      <polyline points={line(a)} fill="none" stroke="#007BC1" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={line(b)} fill="none" stroke="#44E3EC" strokeWidth="3" strokeDasharray="2 7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
