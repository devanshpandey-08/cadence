import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { Card, Field, inputCls, Pill, SectionTitle } from '../components/ui';

interface Kw { kw: string; vol: number; rank: number; delta: number }
const KEYWORDS: Kw[] = [
  { kw: 'social crm', vol: 2400, rank: 4, delta: 2 },
  { kw: 'hubspot alternative', vol: 1900, rank: 7, delta: 1 },
  { kw: 'buffer alternative', vol: 1300, rank: 3, delta: 0 },
  { kw: 'social media scheduler with crm', vol: 720, rank: 2, delta: 4 },
  { kw: 'instagram comment to crm', vol: 390, rank: 1, delta: 1 },
  { kw: 'small business crm flat pricing', vol: 260, rank: 9, delta: -2 },
];

const kwState = (k: Kw) => k.rank <= 3 ? { label: 'Top 3', c: '#1e6b4f', t: '#e2ede6' }
  : k.delta > 0 ? { label: 'Rising', c: '#2c8c7a', t: '#dcebe4' }
    : k.delta < 0 ? { label: 'Slipping', c: '#b23a2e', t: '#f6e0db' }
      : { label: 'Steady', c: '#575046', t: '#ece7da' };

export function Seo() {
  const { s } = useApp();
  const page = s.pages[0];
  const [title, setTitle] = useState('Cadence — CRM + Social Scheduler for Small Teams');
  const [desc, setDesc] = useState('One login for your CRM, social calendar, email and landing pages. Flat $79/mo — no per-contact tax. Switch from Buffer + HubSpot in an afternoon.');

  /* audit checks — several computed from real workspace data */
  const checks = useMemo(() => {
    const slugOk = s.pages.every(p => /^[a-z0-9-]+$/.test(p.slug));
    const enoughPages = s.pages.length >= 3;
    const titleOk = title.length >= 30 && title.length <= 60;
    const descOk = desc.length >= 70 && desc.length <= 160;
    return [
      { label: 'Meta titles within 30–60 chars', pass: titleOk, detail: `currently ${title.length} chars` },
      { label: 'Meta descriptions 70–160 chars', pass: descOk, detail: `currently ${desc.length} chars` },
      { label: 'Clean URL slugs (lowercase, hyphens)', pass: slugOk, detail: `${s.pages.length} pages checked` },
      { label: 'At least 3 indexable landing pages', pass: enoughPages, detail: `${s.pages.length} published` },
      { label: 'HTTPS + canonical tags', pass: true, detail: 'enforced at publish time' },
      { label: 'Core Web Vitals — LCP < 2.5s', pass: true, detail: 'LCP 1.8s · INP 140ms · CLS 0.02' },
      { label: 'Open Graph + Twitter cards', pass: true, detail: 'auto-generated from meta fields' },
      { label: 'Structured data (Product, FAQ)', pass: false, detail: 'add JSON-LD schema — quick win' },
    ];
  }, [s.pages, title, desc]);

  const score = Math.round((checks.filter(c => c.pass).length / checks.length) * 100);
  const C = 2 * Math.PI * 40;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-moss" />Phase 2 · Organic growth
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">SEO suite</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            Audit, rank tracking and SERP preview for your published pages. Rank data in production feeds from DataForSEO/Ahrefs — the workflow is identical.
          </p>
        </div>
        <Pill color="#1e6b4f" tint="#e2ede6" dot>{page ? `/${page.slug}` : 'no pages yet'}</Pill>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* audit */}
        <Card className="col-span-12 p-4 lg:col-span-4">
          <SectionTitle>Site audit</SectionTitle>
          <div className="flex items-center gap-4">
            <div className="relative h-[104px] w-[104px] shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#e6dfd0" strokeWidth="9" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={score >= 80 ? '#1e6b4f' : '#d9b45c'} strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center leading-none">
                  <p className="tnum font-display text-[26px] font-bold text-ink">{score}</p>
                  <p className="mt-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider text-mut">/ 100</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {[
                { l: 'Passed', n: checks.filter(c => c.pass).length, c: '#1e6b4f' },
                { l: 'To fix', n: checks.filter(c => !c.pass).length, c: '#b23a2e' },
                { l: 'Est. traffic impact', n: '+12%', c: '#2c8c7a' },
              ].map(x => (
                <div key={x.l} className="flex items-center justify-between rounded-lg bg-paper/70 px-2.5 py-1.5">
                  <span className="text-[11px] font-medium text-mut">{x.l}</span>
                  <span className="tnum font-mono text-[12px] font-bold" style={{ color: x.c }}>{x.n}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {checks.map(c => (
              <div key={c.label} className="flex items-start gap-2 rounded-lg px-1.5 py-1.5 transition hover:bg-paper/70">
                <span className={cx('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full', c.pass ? 'bg-moss text-night' : 'bg-dangerbg text-danger')}>
                  <Icon name={c.pass ? 'check' : 'alert'} size={9} sw={3.2} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold leading-snug text-ink2">{c.label}</p>
                  <p className="font-mono text-[9.5px] text-faint">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* rank tracker */}
        <Card className="col-span-12 overflow-hidden p-4 lg:col-span-4">
          <SectionTitle right={<span className="font-mono text-[9.5px] uppercase tracking-wider text-faint">Δ 7 days</span>}>Keyword ranks</SectionTitle>
          <div className="space-y-1">
            {KEYWORDS.map(k => {
              const st = kwState(k);
              return (
                <div key={k.kw} className="flex items-center gap-2.5 rounded-lg px-1.5 py-2 transition hover:bg-paper/70">
                  <div className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg font-display text-[14px] font-bold',
                    k.rank <= 3 ? 'bg-moss text-night' : 'bg-paper text-ink2 ring-1 ring-line')}>{k.rank}</div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[12px] font-semibold text-ink">{k.kw}</p>
                    <p className="tnum font-mono text-[9.5px] text-mut">{k.vol.toLocaleString()} searches/mo</p>
                  </div>
                  <span className={cx('tnum flex shrink-0 items-center gap-0.5 font-mono text-[10px] font-bold',
                    k.delta > 0 ? 'text-moss' : k.delta < 0 ? 'text-danger' : 'text-faint')}>
                    {k.delta !== 0 && <Icon name={k.delta > 0 ? 'trend' : 'chevd'} size={10} sw={2.6} />}{k.delta > 0 ? `+${k.delta}` : k.delta}
                  </span>
                  <Pill color={st.c} tint={st.t}>{st.label}</Pill>
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 rounded-lg bg-paper/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-mut">
            You own <span className="font-mono font-semibold text-ink2">#1 for "instagram comment to crm"</span> — a category-defining long tail. Write two more posts targeting it.
          </p>
        </Card>

        {/* SERP preview */}
        <Card className="col-span-12 p-4 lg:col-span-4">
          <SectionTitle>SERP preview</SectionTitle>
          <div className="space-y-3">
            <Field label="Title" hint={`${title.length}/60`}>
              <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} />
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-line/70">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (title.length / 60) * 100)}%`, background: title.length > 60 ? '#b23a2e' : '#1e6b4f' }} />
              </div>
            </Field>
            <Field label="Description" hint={`${desc.length}/160`}>
              <textarea rows={3} className={cx(inputCls, 'resize-none')} value={desc} onChange={e => setDesc(e.target.value)} />
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-line/70">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (desc.length / 160) * 100)}%`, background: desc.length > 160 ? '#b23a2e' : '#2c8c7a' }} />
              </div>
            </Field>
            <div className="rounded-lg border border-line bg-white p-3.5 shadow-[0_1px_3px_rgb(38_32_25/0.08)]">
              <p className="font-mono text-[10.5px] text-[#202124]">emberandoak.com <span className="text-[#5f6368]">› {page?.slug ?? 'home'}</span></p>
              <p className="mt-0.5 truncate text-[16px] leading-snug text-[#1a0dab]">{title || 'Your title appears here'}</p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-[#4d5156]">{desc}</p>
            </div>
            <p className="text-[10.5px] leading-relaxed text-mut">
              Live — edit above and watch Google's result card update. Truncated titles lose up to <span className="font-mono font-semibold text-ink2">30% CTR</span>.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
