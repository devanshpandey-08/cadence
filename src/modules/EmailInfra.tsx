import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { Btn, Card, Pill, SectionTitle, Seg, Spark } from '../components/ui';

/* ---------- dedicated IP + deliverability ---------- */
const DOMAIN_STATS = [
  { domain: 'emberandoak.com', ip: 'dedicated · 198.51.100.7', volume: '48.2K/mo', rep: 98.2, status: 'warm' },
];
const AUTH_ROWS = [
  { proto: 'SPF', detail: 'v=spf1 include:spf.cadence.site ~all', ok: true },
  { proto: 'DKIM', detail: 'cadence._domainkey · 2048-bit', ok: true },
  { proto: 'DMARC', detail: 'p=quarantine · rua=mailto:dmarc@emberandoak.com', ok: true },
  { proto: 'TLS', detail: 'opportunistic · MTA-STS published', ok: true },
  { proto: 'BIMI', detail: 'logo pending VM-C', ok: false },
];
const HEALTH_SERIES = [96, 97, 97, 98, 98, 98, 99, 98, 98, 99, 99, 98, 98, 99];
const WARMUP = [
  { day: 'Day 1–7', limit: '200/day', done: true },
  { day: 'Day 8–14', limit: '500/day', done: true },
  { day: 'Day 15–21', limit: '1,000/day', done: true },
  { day: 'Day 22–30', limit: '2,500/day', done: true },
  { day: 'Day 31+', limit: 'unthrottled', done: false },
];

/* ---------- transactional email API ---------- */
const TX_LOG = [
  { id: 'tx_9f2', type: 'order_confirmation', to: 'ingrid@fjordcoffee.com', status: 'delivered', ms: 212, at: '12s ago' },
  { id: 'tx_9f1', type: 'welcome', to: 'marcus@kettlehouse.com', status: 'delivered', ms: 187, at: '48s ago' },
  { id: 'tx_9f0', type: 'password_reset', to: 'ruth@northloop.cafe', status: 'delivered', ms: 240, at: '2m ago' },
  { id: 'tx_9ef', type: 'booking_reminder', to: 'sofia@grindhouse.pdx', status: 'opened', ms: 198, at: '11m ago' },
  { id: 'tx_9ee', type: 'order_confirmation', to: 'lena@beanbarrel.com', status: 'clicked', ms: 231, at: '26m ago' },
  { id: 'tx_9ed', type: 'shipping_notice', to: 'tom@kettlehouse.com', status: 'delivered', ms: 205, at: '1h ago' },
];

const TX_SNIPPET = `curl -X POST https://api.cadence.site/v1/email \\
  -H "Authorization: Bearer ck_live_9f2e81b4" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "{{first_name}}@{{company}}.com",
    "template": "order_confirmation",
    "data": { "order_id": "E&O-2214", "total": "$84.00" }
  }'`;

/* ---------- predictive send time ---------- */
const HOURS = Array.from({ length: 24 }, (_, h) => {
  // engagement likelihood curve — peaks mid-morning & early evening
  const morning = Math.exp(-Math.pow(h - 10, 2) / 8) * 0.9;
  const evening = Math.exp(-Math.pow(h - 18, 2) / 10) * 0.75;
  const base = 0.12;
  return Math.round((base + morning + evening) * 100);
});
const AUDIENCES = [
  { id: 'wholesale', label: 'Wholesale partners', best: 9, lift: '+31%', opens: 48.2 },
  { id: 'retail', label: 'Retail subscribers', best: 18, lift: '+24%', opens: 39.6 },
  { id: 'trial', label: 'Trial users', best: 11, lift: '+42%', opens: 55.8 },
];

function fmtHour(h: number) {
  const hh = h % 12 || 12;
  return `${hh}${h < 12 ? 'a' : 'p'}`;
}

export function EmailInfra() {
  const { s, a } = useApp();
  const [tab, setTab] = useState<'deliver' | 'tx' | 'predict'>('deliver');
  const [aud, setAud] = useState(AUDIENCES[0]);
  const [copied, setCopied] = useState(false);
  const [throttle, setThrottle] = useState(false);

  const best = HOURS.indexOf(Math.max(...HOURS));
  const maxH = Math.max(...HOURS);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-moss" />P1 · Email infrastructure
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">Deliverability & transactional</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            A dedicated IP with a monitored reputation, a transactional API that never shares the marketing pool, and send-time prediction learned from your audience.
          </p>
        </div>
        <Seg size="sm" value={tab} onChange={setTab} options={[
          { id: 'deliver', label: 'Dedicated IP' }, { id: 'tx', label: 'Transactional API' }, { id: 'predict', label: 'Predictive send' },
        ]} />
      </div>

      {/* dedicated IP + deliverability */}
      {tab === 'deliver' && (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 p-4 lg:col-span-5">
            <SectionTitle right={<Pill color="#2c8c7a" tint="#dcebe4" dot>reputation 98.2 · healthy</Pill>}>
              Sender health · 14d
            </SectionTitle>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">IP reputation</p>
                <p className="tnum mt-1 font-display text-[34px] font-bold leading-none tracking-tight text-ink">98.2<span className="text-[16px] text-mut">/100</span></p>
                <p className="mt-2 text-[11px] text-faint">bounce <span className="tnum font-mono font-bold text-teal">0.3%</span> · complaints <span className="tnum font-mono font-bold text-teal">0.01%</span></p>
              </div>
              <Spark data={HEALTH_SERIES} color="#2c8c7a" w={150} h={52} />
            </div>
            <div className="mt-4 space-y-1.5">
              {AUTH_ROWS.map(r => (
                <div key={r.proto} className="flex items-center gap-2.5 rounded-lg border border-line bg-paper/40 px-2.5 py-2">
                  <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full', r.ok ? 'bg-moss text-night' : 'bg-amberbg text-amber')}>
                    <Icon name={r.ok ? 'check' : 'clock'} size={10} sw={3} />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[11.5px] font-bold text-ink">{r.proto}</p>
                    <p className="truncate font-mono text-[9px] text-mut">{r.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="col-span-12 space-y-4 lg:col-span-4">
            <Card className="p-4">
              <SectionTitle right={
                <label className="flex items-center gap-2 text-[10.5px] font-semibold text-mut">
                  smart throttle <button onClick={() => { setThrottle(t => !t); a.toast(throttle ? 'Throttling off — full send rate' : 'Throttling on — pausing during low-reputation windows', throttle ? 'info' : 'success'); }}
                    className={cx('relative h-4 w-8 rounded-full transition-colors', throttle ? 'bg-moss' : 'bg-line2')}>
                    <span className={cx('absolute top-0.5 h-3 w-3 rounded-full bg-card transition-all', throttle ? 'left-[18px]' : 'left-0.5')} />
                  </button>
                </label>
              }>
                Warm-up schedule
              </SectionTitle>
              <div className="space-y-1.5">
                {WARMUP.map((w, i) => (
                  <div key={w.day} className={cx('flex items-center gap-2.5 rounded-lg px-2 py-1.5', w.done ? 'bg-mint/30' : 'bg-paper/40 border border-dashed border-line2')}>
                    <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[9px] font-bold', w.done ? 'bg-moss text-night' : 'border border-line2 text-mut')}>
                      {w.done ? <Icon name="check" size={10} sw={3} /> : i + 1}
                    </span>
                    <p className="flex-1 text-[11.5px] font-medium text-ink2">{w.day}</p>
                    <span className="tnum font-mono text-[10px] font-bold text-mut">{w.limit}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <SectionTitle>Domain</SectionTitle>
              {DOMAIN_STATS.map(d => (
                <div key={d.domain}>
                  <p className="font-mono text-[11px] font-bold text-ink">{d.domain}</p>
                  <p className="font-mono text-[9.5px] text-mut">{d.ip} · {d.volume}</p>
                </div>
              ))}
            </Card>
          </div>

          <Card className="col-span-12 p-4 lg:col-span-3">
            <SectionTitle>Why dedicated?</SectionTitle>
            <ul className="space-y-2 text-[11px] leading-relaxed text-ink2">
              {[
                'Shared pools inherit other senders\u2019 spam — a dedicated IP isolates your reputation.',
                'Warm-up ramps volume so ISPs learn to trust you before big campaigns.',
                'Transactional + marketing stay on separate streams so receipts never hit the promo tab.',
              ].map(x => (
                <li key={x} className="flex items-start gap-1.5"><Icon name="check" size={11} sw={3} className="mt-[3px] shrink-0 text-moss" />{x}</li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* transactional API */}
      {tab === 'tx' && (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 p-4 lg:col-span-7">
            <SectionTitle right={<Pill color="#35598f" tint="#e3e9f2" dot>p50 212ms · p99 480ms</Pill>}>
              Transactional log · last hour
            </SectionTitle>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-line bg-paper/70">
                    {['Template', 'To', 'Status', 'Latency', ''].map((h, i) => (
                      <th key={i} className="px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-mut">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TX_LOG.map(t => (
                    <tr key={t.id} className="border-b border-line/60 last:border-0 transition hover:bg-mint/20">
                      <td className="px-3 py-2 font-mono text-[10px] font-bold text-moss">{t.type}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-ink2">{t.to}</td>
                      <td className="px-3 py-2">
                        <Pill color={t.status === 'delivered' ? '#2c8c7a' : t.status === 'opened' ? '#a3690e' : '#35598f'}
                          tint={t.status === 'delivered' ? '#dcebe4' : t.status === 'opened' ? '#f5e7cb' : '#e3e9f2'}>{t.status}</Pill>
                      </td>
                      <td className="tnum px-3 py-2 font-mono text-[10px] text-mut">{t.ms}ms</td>
                      <td className="px-3 py-2 font-mono text-[9px] text-faint">{t.at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-mut">
              <Icon name="bolt" size={11} className="mt-0.5 shrink-0 text-ember" />
              Transactional mail bypasses campaign throttles and list rules — a receipt always sends, even mid-warm-up. Webhooks fire on delivered / opened / clicked / bounced.
            </p>
          </Card>

          <div className="col-span-12 space-y-4 lg:col-span-5">
            <Card className="p-4">
              <SectionTitle right={copied ? <Pill color="#2c8c7a" tint="#dcebe4">copied</Pill> : undefined}>Send an email</SectionTitle>
              <pre className="overflow-x-auto rounded-lg border border-nightline bg-night p-3 font-mono text-[9.5px] leading-relaxed text-lime">{TX_SNIPPET}</pre>
              <button
                onClick={() => { try { void navigator.clipboard.writeText(TX_SNIPPET); } catch { /* noop */ } setCopied(true); window.setTimeout(() => setCopied(false), 2000); a.toast('cURL copied — swap in your live key', 'info'); }}
                className="press mt-2.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-line2 bg-card text-xs font-semibold text-ink transition hover:border-moss hover:text-pine">
                <Icon name="copy" size={13} /> Copy request
              </button>
            </Card>
            <Card className="p-4">
              <SectionTitle>Templates</SectionTitle>
              <div className="flex flex-wrap gap-1.5">
                {['welcome', 'order_confirmation', 'password_reset', 'booking_reminder', 'shipping_notice', 'invoice'].map(t => (
                  <span key={t} className="rounded-md border border-line bg-paper px-2 py-1 font-mono text-[10px] font-semibold text-ink2">{t}</span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* predictive send time */}
      {tab === 'predict' && (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 p-4 lg:col-span-8">
            <SectionTitle right={<Pill color="#e0913c" tint="#f5e7cb" dot>learned from {s.contacts.length * 1030} recipient open-times</Pill>}>
              Best hour to send · {aud.label}
            </SectionTitle>
            <div className="flex h-40 items-end gap-1">
              {HOURS.map((v, h) => {
                const isBest = h === best;
                return (
                  <div key={h} className="group flex flex-1 flex-col items-center gap-1">
                    <div className="relative w-full overflow-hidden rounded-t-[3px]" style={{ height: `${Math.max(4, (v / maxH) * 100)}%` }}>
                      <div className={cx('anim-grow absolute inset-0 origin-bottom', isBest ? 'bg-ember' : 'bg-line2 group-hover:bg-mut')}
                        style={{ animationDelay: `${h * 22}ms`, transformOrigin: 'bottom' }} />
                    </div>
                    {h % 3 === 0 && <span className={cx('font-mono text-[8px]', isBest ? 'font-bold text-ember' : 'text-faint')}>{fmtHour(h)}</span>}
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-night px-3.5 py-3">
              <Icon name="bolt" size={16} className="shrink-0 text-ember" />
              <p className="flex-1 text-[12px] text-ink">
                Send <span className="font-bold text-lime">{aud.label}</span> at <span className="tnum font-bold text-lime">{fmtHour(aud.best)}m</span> — modeled lift <span className="tnum font-bold text-lime">{aud.lift}</span> over send-now.
              </p>
              <Btn size="sm" onClick={() => a.toast(`Next campaign will fire at ${fmtHour(aud.best)}m local per recipient`, 'success')}>
                Apply to next campaign
              </Btn>
            </div>
          </Card>

          <Card className="col-span-12 p-4 lg:col-span-4">
            <SectionTitle>Audiences</SectionTitle>
            <div className="space-y-1.5">
              {AUDIENCES.map(x => (
                <button key={x.id} onClick={() => setAud(x)}
                  className={cx('flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition', aud.id === x.id ? 'border-moss bg-mint/30' : 'border-line hover:border-line2')}>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[12px] font-bold text-ink">{x.label}</p>
                    <p className="font-mono text-[9.5px] text-mut">avg open {x.opens}%</p>
                  </div>
                  <span className="tnum rounded-full bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-pine">{x.lift}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-paper/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-mut">
              <Icon name="bolt" size={11} className="mr-1 inline text-ember" />
              Per-recipient optimization schedules each email at that person\u2019s historical open window, not a single global hour.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
