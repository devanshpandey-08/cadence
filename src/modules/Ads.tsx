import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, kfmt, money } from '../meta';
import { Btn, Card, CountUp, Pill, SectionTitle, Toggle } from '../components/ui';

type AdPlatform = 'Meta' | 'Google' | 'LinkedIn' | 'TikTok';

interface AdCampaign {
  id: string; name: string; platform: AdPlatform; objective: string; active: boolean;
  budget: number; spent: number; impressions: number; clicks: number; conversions: number; revenue: number;
}

const SEED: AdCampaign[] = [
  { id: 'ad1', name: 'Spring blend — prospecting', platform: 'Meta', objective: 'Conversions', active: true, budget: 1500, spent: 934, impressions: 182400, clicks: 4210, conversions: 168, revenue: 6720 },
  { id: 'ad2', name: 'Wholesale lead gen', platform: 'LinkedIn', objective: 'Lead gen', active: true, budget: 2200, spent: 1410, impressions: 61200, clicks: 940, conversions: 41, revenue: 18400 },
  { id: 'ad3', name: 'Cold brew — retargeting', platform: 'Meta', objective: 'Conversions', active: true, budget: 900, spent: 402, impressions: 96800, clicks: 2870, conversions: 121, revenue: 3630 },
  { id: 'ad4', name: 'Brand search', platform: 'Google', objective: 'Search', active: true, budget: 600, spent: 288, impressions: 24100, clicks: 1830, conversions: 96, revenue: 2880 },
  { id: 'ad5', name: 'Latte art — awareness', platform: 'TikTok', objective: 'Video views', active: false, budget: 800, spent: 566, impressions: 240300, clicks: 1980, conversions: 22, revenue: 440 },
];

const PLAT_COLOR: Record<AdPlatform, string> = {
  Meta: '#1877f2', Google: '#c2483b', LinkedIn: '#0a66c2', TikTok: '#0f9a96',
};

export function Ads() {
  const { a } = useApp();
  const [camps, setCamps] = useState<AdCampaign[]>(SEED);

  const totals = useMemo(() => {
    const spent = camps.reduce((n, c) => n + c.spent, 0);
    const imp = camps.reduce((n, c) => n + c.impressions, 0);
    const clicks = camps.reduce((n, c) => n + c.clicks, 0);
    const rev = camps.reduce((n, c) => n + c.revenue, 0);
    return {
      spent, imp, clicks, rev,
      ctr: (clicks / imp) * 100,
      cpc: spent / clicks,
      roas: rev / spent,
      budget: camps.reduce((n, c) => n + c.budget, 0),
    };
  }, [camps]);

  const byPlatform = useMemo(() => {
    const m = new Map<AdPlatform, number>();
    camps.forEach(c => m.set(c.platform, (m.get(c.platform) ?? 0) + c.spent));
    return [...m.entries()].sort((x, y) => y[1] - x[1]);
  }, [camps]);

  const toggle = (id: string) => setCamps(cs => cs.map(c => {
    if (c.id !== id) return c;
    a.toast(c.active ? `"${c.name}" paused` : `"${c.name}" resumed`, c.active ? 'warning' : 'success');
    return { ...c, active: !c.active };
  }));

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        {[
          { l: 'Spend · 30d', v: totals.spent, prefix: '$', icon: 'send', c: '#c2483b', fmt: kfmt },
          { l: 'Impressions', v: totals.imp, icon: 'eye', c: '#3e7cb1', fmt: kfmt },
          { l: 'Avg CTR', v: totals.ctr, suffix: '%', icon: 'trend', c: '#0e7a52' },
          { l: 'Avg CPC', v: totals.cpc, prefix: '$', icon: 'tag', c: '#a96f14' },
          { l: 'Blended ROAS', v: totals.roas, suffix: '×', icon: 'bolt', c: '#2f8f83' },
        ].map(k => (
          <Card key={k.l} className="p-4" hover>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-mut">{k.l}</p>
              <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: k.c + '1c', color: k.c }}><Icon name={k.icon} size={13} /></span>
            </div>
            <CountUp value={Math.round(k.v * 100) / 100} prefix={k.prefix ?? ''} suffix={k.suffix ?? ''} className="mt-1 font-display text-[22px] font-bold tracking-tight text-ink" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_280px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-[14px] font-bold text-ink">Ad campaigns</p>
            <Btn size="sm" onClick={() => a.toast('Ad creation flows through each platform API (Phase 3)', 'info')}><Icon name="plus" size={13} sw={2.4} /> New campaign</Btn>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-line bg-paper/70">
                  {['Campaign', 'Status', 'Budget pacing', 'Impr.', 'Clicks', 'CTR', 'Conv.', 'ROAS', ''].map((h, i) => (
                    <th key={i} className="px-3.5 py-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-mut">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {camps.map(c => {
                  const ctr = (c.clicks / c.impressions) * 100;
                  const roas = c.revenue / c.spent;
                  const pacing = (c.spent / c.budget) * 100;
                  return (
                    <tr key={c.id} className="border-b border-line/70 transition last:border-0 hover:bg-mint/30">
                      <td className="px-3.5 py-3">
                        <p className="text-[12.5px] font-bold text-ink">{c.name}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 font-mono text-[9.5px] text-mut">
                          <span className="h-2 w-2 rounded-[3px]" style={{ background: PLAT_COLOR[c.platform] }} />{c.platform} · {c.objective}
                        </p>
                      </td>
                      <td className="px-3.5 py-3">
                        <Pill color={c.active ? '#0e7a52' : '#6e776f'} tint={c.active ? '#e2efe7' : '#eceee7'} dot={c.active}>{c.active ? 'Active' : 'Paused'}</Pill>
                      </td>
                      <td className="px-3.5 py-3">
                        <div className="w-[120px]">
                          <div className="mb-1 flex justify-between font-mono text-[9px] text-mut"><span>{money(c.spent)}</span><span>{money(c.budget)}</span></div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-line/80">
                            <div className="anim-grow h-full rounded-full" style={{ width: `${Math.min(100, pacing)}%`, background: pacing > 90 ? '#c2483b' : pacing > 70 ? '#a96f14' : '#0e7a52' }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3.5 py-3 font-mono text-[11px] font-semibold text-ink2">{kfmt(c.impressions)}</td>
                      <td className="px-3.5 py-3 font-mono text-[11px] font-semibold text-ink2">{kfmt(c.clicks)}</td>
                      <td className="px-3.5 py-3 font-mono text-[11px] text-ink2">{ctr.toFixed(2)}%</td>
                      <td className="px-3.5 py-3 font-mono text-[11px] font-semibold text-ink">{c.conversions}</td>
                      <td className="px-3.5 py-3">
                        <span className={cx('rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-bold', roas >= 3 ? 'bg-mint text-pine' : roas >= 1.5 ? 'bg-amberbg text-amber' : 'bg-dangerbg text-danger')}>{roas.toFixed(1)}×</span>
                      </td>
                      <td className="px-3.5 py-3">
                        <Toggle on={c.active} onChange={() => toggle(c.id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-3.5">
          <Card className="p-4">
            <SectionTitle>Spend by platform</SectionTitle>
            <div className="space-y-2.5">
              {byPlatform.map(([p, v]) => (
                <div key={p}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 font-semibold text-ink2"><span className="h-2 w-2 rounded-[3px]" style={{ background: PLAT_COLOR[p] }} />{p}</span>
                    <span className="font-mono font-bold text-ink">{money(v)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line/70">
                    <div className="anim-grow h-full rounded-full" style={{ width: `${(v / totals.spent) * 100}%`, background: PLAT_COLOR[p] }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle>Optimizer</SectionTitle>
            <div className="space-y-2">
              {[
                { icon: 'bolt', c: '#0e7a52', t: 'Shift $200 → Wholesale lead gen', d: 'ROAS 13× vs 4.5× account avg. Highest-value conversions this month.' },
                { icon: 'alert', c: '#a96f14', t: 'Spring blend nearing cap', d: 'Pacing at 62% of budget with 9 days left — safe to increase daily cap 15%.' },
                { icon: 'trend', c: '#3e7cb1', t: 'Retargeting frequency 4.1', d: 'Creative fatigue risk — rotate the cold brew asset set this week.' },
              ].map(x => (
                <div key={x.t} className="flex gap-2.5 rounded-lg border border-line bg-paper/50 p-2.5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{ background: x.c + '1c', color: x.c }}><Icon name={x.icon} size={12} /></span>
                  <div><p className="text-[11.5px] font-bold text-ink">{x.t}</p><p className="text-[10px] leading-relaxed text-mut">{x.d}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <Icon name="bolt" size={12} className="text-moss" /> Ad spend pulls from each network's reporting API nightly — attribution ties conversions back to CRM contacts, so revenue per lead is real, not vanity.
      </p>
    </div>
  );
}
