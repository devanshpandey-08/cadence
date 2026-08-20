import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, fmtDate, Icon, isoOf, kfmt, money, PLATFORMS, PlatformIcon } from '../meta';
import { toCsv } from '../services/csv';
import { Btn, Card, CountUp, Pill, SectionTitle, Seg, Spark } from '../components/ui';

type Range = '7' | '30' | '90';

/* deterministic cohort matrix — same shape a retention warehouse returns */
function cohortCell(m: number, k: number): number {
  if (k === 0) return 100;
  const base = [64, 58, 61, 55, 52, 49][m] ?? 50;
  const jitter = ((m * 7 + k * 13) % 9) - 4;
  return Math.max(2, Math.round(base * Math.pow(0.72, k - 1)) + jitter);
}
const cohortColor = (v: number) => `rgba(224, 145, 60, ${Math.min(0.92, v / 100)})`;

export function Insights() {
  const { s, a } = useApp();
  const [range, setRange] = useState<Range>('30');
  const f = Number(range) / 30;

  const funnel = useMemo(() => {
    const pagesViews = s.pages.reduce((n, p) => n + p.views, 0);
    const won = s.deals.filter(d => d.stage === 'won');
    const steps = [
      { label: 'Visitors', n: Math.round(pagesViews * 1.6 * f), tone: '#7fa3c9' },
      { label: 'Leads', n: Math.round(s.contacts.length * 3.4 * f), tone: '#6fb5a3' },
      { label: 'Qualified', n: s.deals.filter(d => d.stage !== 'lead').length, tone: '#d9b45c' },
      { label: 'Proposal', n: s.deals.filter(d => ['proposal', 'negotiation', 'won', 'lost'].includes(d.stage)).length, tone: '#e0713a' },
      { label: 'Closed won', n: won.length, tone: '#e0913c' },
    ];
    return steps;
  }, [s.pages, s.contacts, s.deals, f]);

  const revenue = s.deals.filter(d => d.stage === 'won').reduce((n, d) => n + d.value, 0);
  const max = funnel[0].n || 1;

  const topPosts = useMemo(() =>
    [...s.posts].filter(p => p.status === 'published').sort((x, y) => (y.likes ?? 0) - (x.likes ?? 0)).slice(0, 5),
  [s.posts]);

  const exportFunnel = () => {
    const csv = toCsv(['stage', 'count', 'conversion_from_previous'],
      funnel.map((st, i) => [st.label, String(st.n), i === 0 ? '—' : `${Math.round((st.n / (funnel[i - 1].n || 1)) * 100)}%`]));
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const el = document.createElement('a');
    el.href = url; el.download = `cadence-funnel-${range}d.csv`; el.click();
    URL.revokeObjectURL(url);
    a.toast('Funnel exported — formulas neutralized for Excel', 'info');
  };

  const tiles = [
    { label: 'Revenue closed', v: Math.round(revenue * f), prefix: '$', delta: '+22%', color: '#1e6b4f', series: [4, 6, 5, 8, 7, 10, 9, 12] },
    { label: 'New contacts', v: Math.round(s.contacts.length * 2.1 * f), delta: '+18%', color: '#2c8c7a', series: [6, 5, 7, 9, 8, 11, 10, 13] },
    { label: 'Engagement rate', v: 4.6, suffix: '%', delta: '+0.8pt', color: '#e0713a', series: [3, 4, 4, 5, 4, 6, 5, 7] },
    { label: 'Email CTR', v: 11.2, suffix: '%', delta: '+1.4pt', color: '#7fa3c9', series: [8, 9, 8, 10, 11, 10, 12, 11] },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-moss" />Phase 2 · Business intelligence
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">Insights</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            Funnels, cohorts and leaderboards straight off the unified database — pre-aggregated nightly in production, live here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Seg options={[{ id: '7', label: '7d' }, { id: '30', label: '30d' }, { id: '90', label: '90d' }]} value={range} onChange={setRange} />
          <Btn variant="outline" onClick={exportFunnel}><Icon name="download" size={13} /> Export CSV</Btn>
        </div>
      </div>

      <div className="stagger grid grid-cols-12 gap-4">
        {tiles.map(t => (
          <Card key={t.label} className="col-span-12 p-4 sm:col-span-6 xl:col-span-3" hover>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">{t.label}</p>
              <span className="rounded-full bg-mint px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-pine">{t.delta}</span>
            </div>
            <div className="mt-1.5 flex items-end justify-between gap-2">
              <CountUp value={t.v} prefix={t.prefix ?? ''} suffix={t.suffix ?? ''} className="font-display text-[26px] font-bold leading-none tracking-tight text-ink" />
              <Spark data={t.series} color={t.color} w={92} h={30} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 p-4 lg:col-span-5">
          <SectionTitle right={<Pill color="#1e6b4f" tint="#e2ede6" dot>live from CRM</Pill>}>Visitor → revenue funnel</SectionTitle>
          <div className="space-y-2.5">
            {funnel.map((st, i) => {
              const prev = i > 0 ? funnel[i - 1].n : st.n;
              const conv = i === 0 ? 100 : Math.round((st.n / (prev || 1)) * 100);
              return (
                <div key={st.label}>
                  <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
                    <span className="font-semibold text-ink2">{st.label}</span>
                    <span className="tnum font-mono font-bold text-ink">{st.n.toLocaleString()}
                      {i > 0 && <span className={cx('ml-2 text-[10px] font-semibold', conv < 40 ? 'text-danger' : 'text-mut')}>{conv}% →</span>}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-line/70">
                    <div className="anim-grow h-full rounded-full" style={{ width: `${Math.max(2, (st.n / max) * 100)}%`, background: st.tone, animationDelay: `${i * 90}ms` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 rounded-lg bg-paper/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-mut">
            Biggest drop: <span className="font-semibold text-ink2">Leads → Qualified ({Math.round((funnel[2].n / (funnel[1].n || 1)) * 100)}%)</span>. Wire a demo-request form to that gap.
          </p>
        </Card>

        <Card className="col-span-12 overflow-hidden p-4 lg:col-span-7">
          <SectionTitle right={<span className="font-mono text-[9.5px] uppercase tracking-wider text-faint">monthly cohorts · retention %</span>}>Retention cohorts</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-separate" style={{ borderSpacing: 3 }}>
              <thead>
                <tr>
                  <th className="pb-1 text-left font-mono text-[9px] font-semibold uppercase tracking-wider text-mut">Cohort</th>
                  {Array.from({ length: 7 }, (_, k) => (
                    <th key={k} className="pb-1 text-center font-mono text-[9px] font-semibold uppercase tracking-wider text-mut">{k === 0 ? 'M0' : `M+${k}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, m) => {
                  const d = new Date(); d.setMonth(d.getMonth() - (5 - m));
                  return (
                    <tr key={m}>
                      <td className="pr-2 font-mono text-[10px] font-semibold text-ink2">{d.toLocaleString('en', { month: 'short' })}</td>
                      {Array.from({ length: 7 }, (_, k) => {
                        const v = cohortCell(m, k);
                        const future = (5 - m) < k;
                        return (
                          <td key={k} className="h-8 rounded-md text-center align-middle">
                            {future ? <span className="text-[9px] text-faint">·</span> : (
                              <span className="tnum block rounded-md py-1.5 font-mono text-[10px] font-bold" style={{ background: cohortColor(v), color: v > 45 ? '#191410' : '#f3efe6' }}>
                                {v}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 text-[10.5px] text-mut">M0 = signup month. Healthy B2B SaaS holds <span className="font-mono font-semibold text-ink2">&gt;40% by M+3</span> — you're at {cohortCell(5, 3)}%.</p>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 p-4 lg:col-span-6">
          <SectionTitle>Top posts by engagement</SectionTitle>
          <div className="space-y-1.5">
            {topPosts.map((p, i) => (
              <button key={p.id} onClick={() => a.openComposer({ postId: p.id })} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-paper/70">
                <span className="font-display text-[15px] font-bold text-faint">{i + 1}</span>
                <span className="flex shrink-0 -space-x-1">{p.platforms.map(pl => <PlatformIcon key={pl} p={pl} size={16} className="rounded-[5px] ring-2 ring-card" />)}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{p.text}</span>
                <span className="tnum flex shrink-0 items-center gap-1 font-mono text-[10.5px] font-bold text-ember"><Icon name="heart" size={11} /> {(p.likes ?? 0).toLocaleString()}</span>
              </button>
            ))}
            {topPosts.length === 0 && <p className="py-5 text-center text-xs text-mut">Publish a post to populate the leaderboard.</p>}
          </div>
        </Card>

        <Card className="col-span-12 p-4 lg:col-span-6">
          <SectionTitle right={<Pill color="#1e6b4f" tint="#e2ede6">{money(revenue)} won</Pill>}>Deal leaderboard</SectionTitle>
          <div className="space-y-1.5">
            {[...s.deals].sort((x, y) => y.value - x.value).slice(0, 5).map(d => {
              const c = s.contacts.find(x => x.id === d.contactId);
              return (
                <button key={d.id} onClick={() => a.openDeal(d.id)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-paper/70">
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[12px] font-semibold text-ink">{d.name}</p>
                    <p className="truncate text-[10px] text-mut">{c?.name} · {fmtDate(d.close)}</p>
                  </div>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-line/70">
                    <div className="anim-grow h-full rounded-full bg-moss" style={{ width: `${(d.value / (s.deals[0]?.value || 1)) * 100}%` }} />
                  </div>
                  <span className="tnum w-[70px] shrink-0 text-right font-mono text-[11px] font-bold text-ink">{money(d.value)}</span>
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
