import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { Card, CountUp, Pill, SectionTitle, Spark } from '../components/ui';

const DAYS = Array.from({ length: 14 }, (_, i) => 220 + Math.round(90 * Math.sin(i / 2.1) + ((i * 37) % 45)));

const SOURCES = [
  { label: 'Organic search', v: 41, color: '#2c8c7a' },
  { label: 'Direct', v: 23, color: '#7fa3c9' },
  { label: 'Social', v: 18, color: '#e2618f' },
  { label: 'Email', v: 11, color: '#d9b45c' },
  { label: 'Paid', v: 7, color: '#e0713a' },
];
const DEVICES = [
  { label: 'Mobile', v: 58, icon: 'phone' },
  { label: 'Desktop', v: 35, icon: 'layout' },
  { label: 'Tablet', v: 7, icon: 'dash' },
];

const SNIPPET = `<script async src="https://stats.cadence.site/js/s.js" data-site="emberandoak"></script>`;

export function WebAnalytics() {
  const { s, a } = useApp();
  const [live, setLive] = useState(14);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = window.setInterval(() => setLive(v => Math.max(3, v + Math.floor(Math.random() * 5) - 2)), 2800);
    return () => window.clearInterval(t);
  }, []);

  const totalViews = useMemo(() => DAYS.reduce((x, y) => x + y, 0), []);
  const topPages = useMemo(() => [...s.pages].sort((x, y) => y.views - x.views).slice(0, 6), [s.pages]);
  const maxViews = topPages[0]?.views || 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-moss" />Phase 2 · First-party analytics
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">Web analytics</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            Cookieless, GDPR-clean, one lightweight script — the Plausible/Umami model, owned by you, tied to your landing pages.
          </p>
        </div>
        <Pill color="#1e6b4f" tint="#e2ede6" dot>tracking · emberandoak.com</Pill>
      </div>

      <div className="stagger grid grid-cols-12 gap-4">
        <Card className="col-span-12 p-4 sm:col-span-6 xl:col-span-3" hover>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">On site right now</p>
            <span className="relative flex h-2 w-2"><span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-moss text-moss" /><span className="relative inline-flex h-2 w-2 rounded-full bg-moss" /></span>
          </div>
          <CountUp value={live} className="mt-1.5 block font-display text-[30px] font-bold leading-none tracking-tight text-ink" />
          <p className="mt-2 text-[10.5px] text-faint">updates as sessions open & close</p>
        </Card>
        <Card className="col-span-12 p-4 sm:col-span-6 xl:col-span-3" hover>
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Pageviews · 14d</p>
          <div className="mt-1.5 flex items-end justify-between gap-2">
            <CountUp value={totalViews} className="font-display text-[30px] font-bold leading-none tracking-tight text-ink" />
            <Spark data={DAYS} color="#2c8c7a" w={92} h={34} />
          </div>
          <p className="mt-2 text-[10.5px] text-faint">+21% vs previous 14 days</p>
        </Card>
        <Card className="col-span-12 p-4 sm:col-span-6 xl:col-span-3" hover>
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Bounce rate</p>
          <p className="tnum mt-1.5 font-display text-[30px] font-bold leading-none tracking-tight text-ink">38.4%</p>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line/70"><div className="anim-grow h-full rounded-full bg-d9b45c" style={{ width: '38.4%', background: '#d9b45c' }} /></div>
          <p className="mt-2 text-[10.5px] text-faint">under 45% is healthy for SaaS</p>
        </Card>
        <Card className="col-span-12 p-4 sm:col-span-6 xl:col-span-3" hover>
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Avg. visit</p>
          <p className="tnum mt-1.5 font-display text-[30px] font-bold leading-none tracking-tight text-ink">2m 41s</p>
          <p className="mt-2 text-[10.5px] text-faint">3.2 pages per session</p>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 p-4 lg:col-span-5">
          <SectionTitle right={<Pill color="#2c8c7a" tint="#dcebe4" dot>from your landing pages</Pill>}>Top pages</SectionTitle>
          <div className="space-y-2.5">
            {topPages.map(p => (
              <div key={p.id}>
                <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
                  <span className="font-mono font-semibold text-ink2">/{p.slug}</span>
                  <span className="tnum font-mono font-bold text-ink">{p.views.toLocaleString()}
                    <span className="ml-2 text-[9.5px] font-semibold text-mut">{p.submissions} conv · {p.views ? Math.round((p.submissions / p.views) * 100) : 0}%</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line/70">
                  <div className="anim-grow h-full rounded-full bg-moss" style={{ width: `${(p.views / maxViews) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 p-4 sm:col-span-6 lg:col-span-4">
          <SectionTitle>Traffic sources</SectionTitle>
          <div className="space-y-2.5">
            {SOURCES.map(src => (
              <div key={src.label}>
                <div className="mb-1 flex items-baseline justify-between text-[11.5px]">
                  <span className="font-medium text-ink2">{src.label}</span>
                  <span className="tnum font-mono font-bold text-ink">{src.v}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line/70">
                  <div className="anim-grow h-full rounded-full" style={{ width: `${src.v}%`, background: src.color }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="col-span-12 space-y-4 sm:col-span-6 lg:col-span-3">
          <Card className="p-4">
            <SectionTitle>Devices</SectionTitle>
            <div className="space-y-2">
              {DEVICES.map(d => (
                <div key={d.label} className="flex items-center gap-2.5">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-paper text-mut ring-1 ring-line"><Icon name={d.icon} size={13} /></span>
                  <span className="flex-1 text-[12px] font-medium text-ink2">{d.label}</span>
                  <span className="tnum font-mono text-[11px] font-bold text-ink">{d.v}%</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <SectionTitle right={copied ? <Pill color="#1e6b4f" tint="#e2ede6">copied</Pill> : undefined}>Tracking snippet</SectionTitle>
            <pre className="overflow-x-auto rounded-lg border border-nightline bg-night p-3 font-mono text-[10px] leading-relaxed text-lime">{SNIPPET}</pre>
            <button
              onClick={() => { try { void navigator.clipboard.writeText(SNIPPET); } catch { /* noop */ } setCopied(true); window.setTimeout(() => setCopied(false), 2000); a.toast('Snippet copied — 1 script, no cookie banner needed', 'info'); }}
              className="press mt-2.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-line2 bg-card text-xs font-semibold text-ink transition hover:border-moss hover:text-pine">
              <Icon name="copy" size={13} /> Copy snippet
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
