import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, kfmt, relTime, TODAY } from '../meta';
import { Avatar, Btn, Card, CountUp, Pill, SectionTitle, Seg, Toggle } from '../components/ui';

/* ---------- identity resolution ---------- */
interface Identity {
  id: string;
  canonical: string;          // resolved master name
  confidence: number;         // 0–100 match score
  email?: string;
  signals: { key: string; value: string; weight: number }[];
  merged: string[];           // source records folded in
  status: 'resolved' | 'suggested' | 'conflict';
}

const IDENTITIES: Identity[] = [
  {
    id: 'id1', canonical: 'Ingrid Halvorsen', confidence: 97, email: 'ingrid@fjordcoffee.com',
    signals: [
      { key: 'email', value: 'ingrid@fjordcoffee.com', weight: 40 },
      { key: 'email', value: 'i.halvorsen@fjord.no', weight: 38 },
      { key: 'device', value: 'fp_8ac21d (shared)', weight: 12 },
      { key: 'company', value: 'Fjord Coffee Co.', weight: 7 },
    ],
    merged: ['HubSpot #4821', 'Klaviyo profile_9', 'IG @ingrid.brews'], status: 'resolved',
  },
  {
    id: 'id2', canonical: 'Marcus Webb', confidence: 91, email: 'marcus@kettlehouse.com',
    signals: [
      { key: 'email', value: 'marcus@kettlehouse.com', weight: 40 },
      { key: 'phone', value: '+1 (503) 555-0142', weight: 30 },
      { key: 'linkedin', value: 'li_uid_77120', weight: 21 },
    ],
    merged: ['HubSpot #3110', 'X @marcuswebb'], status: 'resolved',
  },
  {
    id: 'id3', canonical: 'Ruth Adler', confidence: 74, email: 'ruth@northloop.cafe',
    signals: [
      { key: 'email', value: 'ruth@northloop.cafe', weight: 40 },
      { key: 'device', value: 'fp_c44e02', weight: 20 },
      { key: 'company', value: 'North Loop Café', weight: 14 },
    ],
    merged: ['Klaviyo profile_22'], status: 'suggested',
  },
  {
    id: 'id4', canonical: 'Sofia Reyes', confidence: 58, email: undefined,
    signals: [
      { key: 'device', value: 'fp_119be7', weight: 33 },
      { key: 'instagram', value: '@sofia.roasts', weight: 25 },
    ],
    merged: [], status: 'conflict',
  },
];

/* ---------- UTM persistence ---------- */
const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid', 'msclkid'];
const RECENT_VISITS = [
  { visitor: 'fp_8ac21d', source: 'linkedin', medium: 'paid-social', campaign: 'spring-blend-25', page: '/wholesale', at: '2m ago' },
  { visitor: 'fp_c44e02', source: 'google', medium: 'cpc', campaign: 'cold-brew-search', page: '/', at: '14m ago' },
  { visitor: 'fp_119be7', source: 'instagram', medium: 'organic', campaign: '—', page: '/spring-blend', at: '31m ago' },
  { visitor: 'fp_02d9ff', source: 'newsletter', medium: 'email', campaign: 'june-drop', page: '/demo', at: '1h ago' },
  { visitor: 'fp_77b3c1', source: 'facebook', medium: 'paid-social', campaign: 'retarget-cart', page: '/checkout', at: '2h ago' },
];

/* ---------- real-time event stream ---------- */
interface StreamEvent { id: string; type: string; actor: string; detail: string; ts: string; }
const EVENT_POOL = [
  { type: 'pageview', actor: 'fp_8ac21d', detail: '/wholesale · linkedin/paid-social' },
  { type: 'identify', actor: 'ingrid@fjordcoffee.com', detail: 'merged 3 profiles → master' },
  { type: 'form_submit', actor: 'marcus@kettlehouse.com', detail: 'Demo request · cold-brew-search' },
  { type: 'email_open', actor: 'ruth@northloop.cafe', detail: '"June drop" · predictive slot' },
  { type: 'email_click', actor: 'ruth@northloop.cafe', detail: 'CTA → /spring-blend' },
  { type: 'deal_moved', actor: 'Maya Chen', detail: 'Fjord Coffee → Negotiation' },
  { type: 'ad_click', actor: 'fp_77b3c1', detail: 'Meta · retarget-cart · $0.84' },
  { type: 'post_published', actor: 'Cadence queue', detail: 'Instagram Reel · spring blend' },
  { type: 'identity_match', actor: 'fp_119be7', detail: 'device+IG → Sofia Reyes (0.82)' },
  { type: 'sms_delivered', actor: '+1 503 555 0117', detail: 'booking reminder · Twilio' },
];

const EVENT_COLOR: Record<string, string> = {
  pageview: '#7fa3c9', identify: '#e0913c', form_submit: '#6fb5a3', email_open: '#d9b45c',
  email_click: '#d9b45c', deal_moved: '#2c8c7a', ad_click: '#e2618f', post_published: '#e0713a',
  identity_match: '#e0913c', sms_delivered: '#7fa3c9',
};

function useEventStream(active: boolean) {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const cursor = useRef(0);
  useEffect(() => {
    if (!active || paused) return;
    const seed = () => Array.from({ length: 6 }, () => makeEvent());
    const makeEvent = (): StreamEvent => {
      const p = EVENT_POOL[cursor.current % EVENT_POOL.length];
      cursor.current += 1;
      return { id: `ev${cursor.current}`, ...p, ts: new Date().toLocaleTimeString([], { hour12: false }) };
    };
    setEvents(seed());
    const t = window.setInterval(() => {
      setEvents(es => [makeEvent(), ...es].slice(0, 9));
    }, 2600);
    return () => window.clearInterval(t);
  }, [active, paused]);
  return { events, paused, setPaused };
}

/* ================= module ================= */
export function Cdp() {
  const { s, a } = useApp();
  const [tab, setTab] = useState<'identity' | 'utm' | 'stream'>('identity');
  const [autoMerge, setAutoMerge] = useState(true);
  const [ids, setIds] = useState(IDENTITIES);
  const { events, paused, setPaused } = useEventStream(tab === 'stream');
  const [dedupeRate] = useState(18.4);

  const resolved = ids.filter(i => i.status === 'resolved').length;
  const suggested = ids.filter(i => i.status === 'suggested').length;
  const conflicts = ids.filter(i => i.status === 'conflict').length;

  const acceptMerge = (id: string) => {
    setIds(list => list.map(i => i.id === id ? { ...i, status: 'resolved', confidence: Math.max(i.confidence, 88) } : i));
    a.toast('Profiles merged into master record — timeline unified', 'success');
  };
  const dismiss = (id: string) => {
    setIds(list => list.filter(i => i.id !== id));
    a.toast('Suggestion dismissed', 'info');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-moss" />P0 · Customer Data Platform
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">Identity & event graph</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            One person, every device, every source. Resolve duplicates, persist UTM intent across sessions, and watch the event firehose feed attribution.
          </p>
        </div>
        <Seg size="sm" value={tab} onChange={setTab} options={[
          { id: 'identity', label: 'Identity' }, { id: 'utm', label: 'UTM engine' }, { id: 'stream', label: 'Live stream' },
        ]} />
      </div>

      <div className="stagger grid grid-cols-12 gap-4">
        <Card className="col-span-12 p-4 sm:col-span-6 xl:col-span-3" hover>
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Resolved identities</p>
          <CountUp value={resolved} className="mt-1.5 block font-display text-[30px] font-bold leading-none tracking-tight text-ink" />
          <p className="mt-2 text-[10.5px] text-faint">dedupe rate <span className="tnum font-mono font-bold text-teal">{dedupeRate}%</span></p>
        </Card>
        <Card className="col-span-12 p-4 sm:col-span-6 xl:col-span-3" hover>
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Pending review</p>
          <CountUp value={suggested + conflicts} className="mt-1.5 block font-display text-[30px] font-bold leading-none tracking-tight text-ink" />
          <p className="mt-2 text-[10.5px] text-faint">{conflicts} conflict{conflicts === 1 ? '' : 's'} need a human</p>
        </Card>
        <Card className="col-span-12 p-4 sm:col-span-6 xl:col-span-3" hover>
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Events · 24h</p>
          <CountUp value={12480} className="mt-1.5 block font-display text-[30px] font-bold leading-none tracking-tight text-ink" />
          <p className="mt-2 text-[10.5px] text-faint">streaming at <span className="tnum font-mono font-bold text-moss">52 ev/s</span></p>
        </Card>
        <Card className="col-span-12 p-4 sm:col-span-6 xl:col-span-3" hover>
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Matched to contact</p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <CountUp value={94} suffix="%" className="font-display text-[30px] font-bold leading-none tracking-tight text-ink" />
          </div>
          <p className="mt-2 text-[10.5px] text-faint">of events tied to a CRM record</p>
        </Card>
      </div>

      {/* identity resolution */}
      {tab === 'identity' && (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 p-4 lg:col-span-8">
            <SectionTitle right={
              <label className="flex items-center gap-2 text-[11px] font-semibold text-mut">
                auto-merge ≥90% <Toggle on={autoMerge} onChange={v => { setAutoMerge(v); a.toast(v ? 'High-confidence matches merge automatically' : 'All merges now require review', v ? 'success' : 'info'); }} />
              </label>
            }>
              Identity matches
            </SectionTitle>
            <div className="space-y-2.5">
              {ids.map(person => (
                <div key={person.id} className={cx('rounded-lg border p-3 transition',
                  person.status === 'resolved' ? 'border-line bg-paper/40' : person.status === 'suggested' ? 'border-moss/40 bg-mint/25' : 'border-danger/40 bg-dangerbg/30')}>
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={person.canonical} size={34} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-[13px] font-bold text-ink">{person.canonical}</p>
                      <p className="font-mono text-[9.5px] text-mut">{person.email ?? 'no email — device/IG signals only'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cx('tnum rounded-full px-2 py-0.5 font-mono text-[10px] font-bold',
                        person.confidence >= 85 ? 'bg-mint text-pine' : person.confidence >= 65 ? 'bg-amberbg text-amber' : 'bg-dangerbg text-danger')}>
                        {person.confidence}% match
                      </span>
                      <Pill color={person.status === 'resolved' ? '#2c8c7a' : person.status === 'suggested' ? '#a3690e' : '#b23a2e'}
                        tint={person.status === 'resolved' ? '#dcebe4' : person.status === 'suggested' ? '#f5e7cb' : '#f6e0db'}>
                        {person.status}
                      </Pill>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {person.signals.map((sig, i) => (
                      <span key={i} className="flex items-center gap-1.5 rounded-md border border-line bg-card px-2 py-1 font-mono text-[9.5px] text-ink2">
                        <span className="font-bold uppercase text-mut">{sig.key}</span> {sig.value}
                        <span className="rounded bg-paper px-1 font-bold text-moss">+{sig.weight}</span>
                      </span>
                    ))}
                  </div>
                  {person.merged.length > 0 && (
                    <p className="mt-2 text-[10px] text-mut">folded in: <span className="font-mono">{person.merged.join(' · ')}</span></p>
                  )}
                  {person.status !== 'resolved' && (
                    <div className="mt-2.5 flex gap-2">
                      <Btn size="sm" onClick={() => acceptMerge(person.id)}><Icon name="check" size={12} sw={2.6} /> Merge into master</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => dismiss(person.id)}>Dismiss</Btn>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="col-span-12 p-4 lg:col-span-4">
            <SectionTitle>How matching scores</SectionTitle>
            <div className="space-y-2">
              {[
                { k: 'Exact email', w: 40, c: '#2c8c7a' },
                { k: 'Email variant (initial/domain)', w: 38, c: '#6fb5a3' },
                { k: 'Phone match', w: 30, c: '#7fa3c9' },
                { k: 'Device fingerprint', w: 33, c: '#d9b45c' },
                { k: 'Social handle', w: 25, c: '#e2618f' },
                { k: 'Company + title', w: 14, c: '#e0713a' },
              ].map(x => (
                <div key={x.k}>
                  <div className="mb-1 flex items-baseline justify-between text-[11px]">
                    <span className="font-medium text-ink2">{x.k}</span>
                    <span className="tnum font-mono font-bold text-ink">+{x.w}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-line/70">
                    <div className="anim-grow h-full rounded-full" style={{ width: `${(x.w / 40) * 100}%`, background: x.c }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-paper/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-mut">
              <Icon name="bolt" size={11} className="mr-1 inline text-ember" />
              Weights sum to a 0–100 confidence. ≥90 auto-merges (when enabled), 65–89 waits for review, &lt;65 stays split to avoid false merges.
            </p>
          </Card>
        </div>
      )}

      {/* UTM persistence */}
      {tab === 'utm' && (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 p-4 lg:col-span-7">
            <SectionTitle right={<Pill color="#2c8c7a" tint="#dcebe4" dot>first-party cookie · 90-day TTL</Pill>}>
              Persisted parameters
            </SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {UTM_PARAMS.map(p => (
                <span key={p} className="rounded-md border border-line bg-night px-2.5 py-1.5 font-mono text-[10.5px] font-semibold text-lime">
                  {p}<span className="ml-1 text-nighttx">✓</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-relaxed text-mut">
              Captured on first touch, stored first-party, and <span className="font-semibold text-ink">survive the anonymous → identified handoff</span>. When a visitor converts, every parameter retro-attaches to their contact and all their deals.
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-line bg-paper/70">
                    {['Visitor', 'source', 'medium', 'campaign', 'landing', ''].map((h, i) => (
                      <th key={i} className="px-3 py-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-mut">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RECENT_VISITS.map((v, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-0 transition hover:bg-mint/20">
                      <td className="px-3 py-2 font-mono text-[10px] text-ink2">{v.visitor}</td>
                      <td className="px-3 py-2 font-mono text-[10px] font-bold text-moss">{v.source}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-mut">{v.medium}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-ink2">{v.campaign}</td>
                      <td className="px-3 py-2 font-mono text-[10px] text-mut">{v.page}</td>
                      <td className="px-3 py-2 font-mono text-[9px] text-faint">{v.at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="col-span-12 space-y-4 lg:col-span-5">
            <Card className="p-4">
              <SectionTitle>Anonymous → identified handoff</SectionTitle>
              <div className="space-y-1.5">
                {[
                  { step: '1', text: 'Visitor lands with ?utm_source=linkedin&gclid=…', icon: 'globe' },
                  { step: '2', text: 'Params written to _cadence_id (first-party, 90d)', icon: 'tag' },
                  { step: '3', text: '3 pageviews + ad click accumulate on the fingerprint', icon: 'trend' },
                  { step: '4', text: 'Submits demo form → identify() call fires', icon: 'users' },
                  { step: '5', text: 'All stored params merge onto the contact + create attribution path', icon: 'check' },
                ].map(x => (
                  <div key={x.step} className="flex items-center gap-2.5 rounded-lg border border-line bg-paper/40 px-2.5 py-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-moss font-mono text-[10px] font-bold text-night">{x.step}</span>
                    <Icon name={x.icon} size={14} className="shrink-0 text-mut" />
                    <p className="text-[11px] leading-snug text-ink2">{x.text}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <SectionTitle>Capture snippet</SectionTitle>
              <pre className="overflow-x-auto rounded-lg border border-nightline bg-night p-3 font-mono text-[10px] leading-relaxed text-lime">{`<script async src="https://id.cadence.site/capture.js"
  data-site="emberandoak" data-ttl="90"></script>`}</pre>
            </Card>
          </div>
        </div>
      )}

      {/* live event stream */}
      {tab === 'stream' && (
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 overflow-hidden lg:col-span-8">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionTitle>
                <span className="flex items-center gap-2">
                  Real-time event firehose
                  <span className={cx('flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase', paused ? 'bg-amberbg text-amber' : 'bg-mint text-pine')}>
                    <span className={cx('h-1.5 w-1.5 rounded-full', paused ? 'bg-amber' : 'live-dot bg-lime')} />{paused ? 'paused' : 'live'}
                  </span>
                </span>
              </SectionTitle>
              <Btn size="sm" variant={paused ? 'primary' : 'outline'} onClick={() => setPaused(p => !p)}>
                <Icon name={paused ? 'play' : 'clock'} size={12} />{paused ? 'Resume' : 'Pause'}
              </Btn>
            </div>
            <div className="divide-y divide-line/60 bg-night/40">
              {events.map((e, i) => (
                <div key={e.id} className={cx('flex items-center gap-3 px-4 py-2.5', i === 0 && !paused && 'anim-rise')}>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: (EVENT_COLOR[e.type] ?? '#7fa3c9') + '22', color: EVENT_COLOR[e.type] ?? '#7fa3c9' }}>
                    <Icon name={e.type.startsWith('email') ? 'mail' : e.type === 'pageview' ? 'eye' : e.type === 'deal_moved' ? 'kanban' : e.type.startsWith('identity') ? 'users' : 'bolt'} size={13} />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[12px] font-semibold text-ink"><span className="font-mono text-[10px] uppercase tracking-wide" style={{ color: EVENT_COLOR[e.type] }}>{e.type}</span> <span className="text-mut">·</span> {e.actor}</p>
                    <p className="truncate font-mono text-[10px] text-mut">{e.detail}</p>
                  </div>
                  <span className="tnum shrink-0 font-mono text-[9.5px] text-faint">{e.ts}</span>
                </div>
              ))}
              {events.length === 0 && <p className="px-4 py-10 text-center text-xs text-mut">{paused ? 'Stream paused.' : 'Connecting…'}</p>}
            </div>
          </Card>

          <Card className="col-span-12 p-4 lg:col-span-4">
            <SectionTitle>Where events flow</SectionTitle>
            <div className="space-y-2">
              {[
                { icon: 'link', text: 'Attribution — stitches conversion paths', tone: '#35598f' },
                { icon: 'kanban', text: 'Deal scoring — engagement boosts priority', tone: '#2c8c7a' },
                { icon: 'users', text: 'Identity graph — feeds match confidence', tone: '#e0913c' },
                { icon: 'refresh', text: 'Automations — trigger on any event type', tone: '#e2618f' },
                { icon: 'trend', text: 'Insights — powers funnels & cohorts', tone: '#d9b45c' },
              ].map(x => (
                <div key={x.text} className="flex items-center gap-2.5 rounded-lg border border-line bg-paper/40 px-2.5 py-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: x.tone + '22', color: x.tone }}><Icon name={x.icon} size={13} /></span>
                  <p className="text-[11px] leading-snug text-ink2">{x.text}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-paper/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-mut">
              <Icon name="bolt" size={11} className="mr-1 inline text-ember" />
              In production this is a Kafka/Redis-Stream topic replayed here — every downstream consumer reads the same ordered log.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
