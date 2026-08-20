import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, money } from '../meta';
import { Card, Pill, SectionTitle, Seg } from '../components/ui';

type Channel = 'Organic' | 'Paid social' | 'Email' | 'LinkedIn' | 'Instagram' | 'Referral';
type Model = 'first' | 'last' | 'linear' | 'decay' | 'position';

interface Journey { id: string; value: number; touches: { ch: Channel; d: number }[] } // d = days before conversion

const JOURNEYS: Journey[] = [
  { id: 'j1', value: 9800, touches: [{ ch: 'Instagram', d: 21 }, { ch: 'Email', d: 14 }, { ch: 'LinkedIn', d: 6 }, { ch: 'Paid social', d: 1 }] },
  { id: 'j2', value: 4200, touches: [{ ch: 'Organic', d: 9 }, { ch: 'Email', d: 2 }] },
  { id: 'j3', value: 12500, touches: [{ ch: 'Paid social', d: 30 }, { ch: 'Instagram', d: 18 }, { ch: 'Email', d: 10 }, { ch: 'Referral', d: 3 }, { ch: 'LinkedIn', d: 0 }] },
  { id: 'j4', value: 2600, touches: [{ ch: 'Referral', d: 4 }] },
  { id: 'j5', value: 7400, touches: [{ ch: 'LinkedIn', d: 15 }, { ch: 'Organic', d: 8 }, { ch: 'Paid social', d: 2 }] },
  { id: 'j6', value: 5100, touches: [{ ch: 'Email', d: 12 }, { ch: 'Instagram', d: 5 }, { ch: 'Email', d: 1 }] },
  { id: 'j7', value: 3300, touches: [{ ch: 'Organic', d: 6 }, { ch: 'Referral', d: 1 }] },
  { id: 'j8', value: 8900, touches: [{ ch: 'Paid social', d: 25 }, { ch: 'LinkedIn', d: 12 }, { ch: 'Instagram', d: 4 }, { ch: 'Email', d: 0 }] },
  { id: 'j9', value: 1900, touches: [{ ch: 'Instagram', d: 3 }] },
  { id: 'j10', value: 6700, touches: [{ ch: 'Organic', d: 19 }, { ch: 'Paid social', d: 9 }, { ch: 'Referral', d: 2 }] },
];

const CHANNELS: Channel[] = ['Organic', 'Paid social', 'Email', 'LinkedIn', 'Instagram', 'Referral'];
const CH_COLOR: Record<Channel, string> = {
  Organic: '#6fb5a3', 'Paid social': '#7fa3c9', Email: '#d9b45c', LinkedIn: '#9db8dd', Instagram: '#e2618f', Referral: '#e0713a',
};

const MODELS: { id: Model; label: string; rule: string }[] = [
  { id: 'first', label: 'First touch', rule: '100% to the channel that started the journey' },
  { id: 'last', label: 'Last touch', rule: '100% to the channel that closed it' },
  { id: 'linear', label: 'Linear', rule: 'Credit split evenly across every touch' },
  { id: 'decay', label: 'Time decay', rule: 'Recency-weighted · 7-day half-life' },
  { id: 'position', label: 'Position (U)', rule: '40% first · 40% last · 20% shared middle' },
];

function weights(j: Journey, m: Model): number[] {
  const n = j.touches.length;
  const w = j.touches.map((t, i) => {
    switch (m) {
      case 'first': return i === 0 ? 1 : 0;
      case 'last': return i === n - 1 ? 1 : 0;
      case 'linear': return 1 / n;
      case 'decay': return Math.pow(2, -t.d / 7);
      case 'position': return n === 1 ? 1 : (i === 0 || i === n - 1) ? 0.4 : 0.2 / Math.max(1, n - 2);
    }
  });
  const sum = w.reduce((a, b) => a + b, 0) || 1;
  return w.map(x => x / sum);
}

export function Attribution() {
  const { s } = useApp();
  const [model, setModel] = useState<Model>('position');
  const wonRevenue = s.deals.filter(d => d.stage === 'won').reduce((n, d) => n + d.value, 0);

  const credited = useMemo(() => {
    const per: Record<Channel, { credit: number; value: number; touches: number }> =
      Object.fromEntries(CHANNELS.map(c => [c, { credit: 0, value: 0, touches: 0 }])) as never;
    JOURNEYS.forEach(j => {
      const w = weights(j, model);
      j.touches.forEach((t, i) => {
        per[t.ch].credit += w[i];
        per[t.ch].value += w[i] * j.value;
        per[t.ch].touches += 1;
      });
    });
    return CHANNELS.map(c => ({ ch: c, ...per[c] }))
      .sort((a, b) => b.value - a.value);
  }, [model]);

  const totalValue = JOURNEYS.reduce((n, j) => n + j.value, 0);
  const maxVal = credited[0]?.value ?? 1;
  const meta = MODELS.find(m => m.id === model)!;

  /* rank shift vs last-touch — where the model changes the story */
  const lastTouch = useMemo(() => {
    const per = new Map<Channel, number>();
    JOURNEYS.forEach(j => {
      const w = weights(j, 'last');
      j.touches.forEach((t, i) => per.set(t.ch, (per.get(t.ch) ?? 0) + w[i] * j.value));
    });
    return new Map(CHANNELS.map(c => [c, per.get(c) ?? 0] as const));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-moss" />Phase 2 · Measurement
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">Attribution</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            {JOURNEYS.length} tracked conversion paths · {money(totalValue)} influenced. Switch models and watch credit move — this is exactly why multi-touch beats last-click.
          </p>
        </div>
        <Seg size="sm" options={MODELS.map(m => ({ id: m.id, label: m.label }))} value={model} onChange={setModel} />
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 p-4 lg:col-span-7">
          <SectionTitle right={<Pill color="#1e6b4f" tint="#e2ede6">{meta.rule}</Pill>}>
            Revenue credited by channel
          </SectionTitle>
          <div className="space-y-3">
            {credited.map((row, i) => (
              <div key={row.ch}>
                <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
                  <span className="flex items-center gap-2 font-semibold text-ink2">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CH_COLOR[row.ch] }} />{row.ch}
                    <span className="font-mono text-[9px] uppercase tracking-wider text-faint">{row.touches} touches</span>
                  </span>
                  <span className="tnum font-mono font-bold text-ink">
                    {money(Math.round(row.value))}
                    <span className="ml-2 text-[10px] font-semibold text-mut">{((row.credit / JOURNEYS.length) * 100).toFixed(0)}% credit</span>
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-md bg-line/70">
                  <div className="h-full rounded-md transition-all duration-500" style={{ width: `${(row.value / maxVal) * 100}%`, background: CH_COLOR[row.ch], transitionTimingFunction: 'var(--spring)' }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3.5 flex items-start gap-1.5 rounded-lg bg-paper/70 px-3 py-2 text-[10.5px] leading-relaxed text-mut">
            <Icon name="bolt" size={12} className="mt-0.5 shrink-0 text-ember" />
            CRM tie-in: closed-won pipeline in this workspace is <span className="font-mono font-semibold text-ink2">{money(wonRevenue)}</span> — in production, journeys are stitched from UTM params, post links and deal sources.
          </p>
        </Card>

        <div className="col-span-12 space-y-4 lg:col-span-5">
          <Card className="p-4">
            <SectionTitle>Where the model changes the story</SectionTitle>
            <div className="space-y-1.5">
              {credited.map(row => {
                const lt = lastTouch.get(row.ch) ?? 0;
                const delta = row.value - lt;
                const pct = lt > 0 ? (delta / lt) * 100 : delta > 0 ? 100 : 0;
                return (
                  <div key={row.ch} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-paper/70">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: CH_COLOR[row.ch] }} />
                    <span className="flex-1 text-[12px] font-medium text-ink2">{row.ch}</span>
                    <span className={cx('tnum rounded-full px-2 py-0.5 font-mono text-[10px] font-bold',
                      Math.abs(pct) < 5 ? 'bg-paper text-mut ring-1 ring-line' : pct > 0 ? 'bg-mint text-pine' : 'bg-dangerbg text-danger')}>
                      {pct > 0 ? '▲' : pct < 0 ? '▼' : '＝'} {Math.abs(pct).toFixed(0)}% vs last-touch
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2.5 text-[10.5px] leading-relaxed text-mut">
              Last-touch over-rewards closers and starves top-of-funnel. Rule of thumb from 2026 industry surveys: multi-touch teams cut CPA <span className="font-mono font-semibold text-ink2">14–36%</span>.
            </p>
          </Card>

          <Card className="p-4">
            <SectionTitle>Recent conversion paths</SectionTitle>
            <div className="space-y-2">
              {JOURNEYS.slice(0, 5).map(j => (
                <div key={j.id} className="rounded-lg border border-line bg-paper/50 p-2.5">
                  <div className="flex items-center gap-1.5">
                    {j.touches.map((t, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold" style={{ background: CH_COLOR[t.ch] + '22', color: CH_COLOR[t.ch] }}>
                          {t.ch.split(' ')[0]}<span className="opacity-60">-{t.d}d</span>
                        </span>
                        {i < j.touches.length - 1 && <Icon name="chevr" size={10} className="text-faint" />}
                      </span>
                    ))}
                  </div>
                  <p className="tnum mt-1.5 font-mono text-[10px] text-mut">converted · deal value {money(j.value)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
