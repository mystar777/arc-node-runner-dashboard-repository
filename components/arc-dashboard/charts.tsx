'use client';

import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

export function LatencySpark({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }));
  if (!data.length) {
    return <div className="h-10 w-full rounded bg-dash-raised/60" />;
  }
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lgLat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke="#60a5fa" strokeWidth={1.5} fill="url(#lgLat)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HeadProgressionChart({
  series
}: {
  series: { t: string; local: number; network: number }[];
}) {
  if (!series.length) {
    return (
      <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-dash-border text-[12px] text-dash-muted">
        폴링 데이터가 쌓이면 그래프가 표시됩니다.
      </div>
    );
  }
  let s = series;
  if (s.length === 1) {
    s = [...s, { ...s[0], t: `${s[0].t}-b` }];
  }
  const data = s.map((row) => ({ ...row, label: row.t.slice(11, 19) }));
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={44}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: '#121b2c',
              border: '1px solid #243049',
              borderRadius: 8,
              fontSize: 12
            }}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Line type="monotone" dataKey="local" name="Local head" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="network" name="Network head" stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MicroMetricLines({
  rpcSeries,
  importSeries,
  syncSeries
}: {
  rpcSeries: { x: number; y: number }[];
  importSeries: { x: number; y: number }[];
  syncSeries: { x: number; y: number }[];
}) {
  const pad = (arr: { x: number; y: number }[]) => (arr.length ? arr : [{ x: 0, y: 0 }]);
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {[
        { title: 'RPC 응답 시간', data: pad(rpcSeries), stroke: '#3b82f6' },
        { title: '블록 수집률 (상대)', data: pad(importSeries), stroke: '#a78bfa' },
        { title: '싱크 스테이지 (상대)', data: pad(syncSeries), stroke: '#22c55e' }
      ].map((c) => (
        <div key={c.title} className="rounded-lg border border-dash-border bg-dash-surface/80 p-2">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-dash-muted">{c.title}</p>
          <div className="h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={c.data} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
                <Line type="monotone" dataKey="y" stroke={c.stroke} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
