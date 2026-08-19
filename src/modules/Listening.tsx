import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, kfmt, PLATFORMS, PlatformIcon, uid } from '../meta';
import type { Platform } from '../types';
import { Btn, Card, CountUp, IconBtn, Pill, SectionTitle, Seg, Spark } from '../components/ui';

type Sent = 'pos' | 'neu' | 'neg';

interface Mention {
  id: string; platform: Platform; author: string; handle: string; text: string;
  sent: Sent; reach: number; ago: string; keyword: string;
}

const SEED_MENTIONS: Mention[] = [
  { id: 'm1', platform: 'x', author: 'Fred K', handle: '@flatwhitefred', text: 'the ember & oak cold brew got me through finals week. genuinely the best in the city', sent: 'pos', reach: 12400, ago: '12m', keyword: 'cold brew' },
  { id: 'm2', platform: 'instagram', author: 'Oat Milk Only', handle: '@oatmilkonly', text: 'tasted the spring blend at @emberandoak — floral, bright, zero bitterness. recipe notes in our story', sent: 'pos', reach: 41200, ago: '34m', keyword: 'spring blend' },
  { id: 'm3', platform: 'tiktok', author: 'Felix Marsh', handle: '@felixbrews', text: 'latte art with ember & oak beans hits different 🙌 dialing guide pt.2 tomorrow', sent: 'pos', reach: 88300, ago: '1h', keyword: 'latte art' },
  { id: 'm4', platform: 'linkedin', author: 'Ingrid Halvorsen', handle: 'Café Astra', text: "Evaluating wholesale partners. Ember & Oak's 24h shipping promise is exactly what multi-location programs need.", sent: 'pos', reach: 3100, ago: '2h', keyword: 'wholesale' },
  { id: 'm5', platform: 'facebook', author: 'Tessa Brandt', handle: 'Bluebird Deli', text: 'our counter cart from Ember & Oak sold out by noon at the market — restock request sent!', sent: 'pos', reach: 890, ago: '3h', keyword: 'counter cart' },
  { id: 'm6', platform: 'x', author: 'Sam R', handle: '@samroasts', text: 'waited 9 days for my ember & oak order. tracking never updated once. disappointing', sent: 'neg', reach: 2400, ago: '4h', keyword: 'shipping' },
  { id: 'm7', platform: 'instagram', author: 'Daily Grind PDX', handle: '@dailygrindpdx', text: 'ember & oak cupping night review — solid lineup, though the huila ran out fast', sent: 'neu', reach: 5600, ago: '6h', keyword: 'cupping' },
  { id: 'm8', platform: 'x', author: 'Priya N', handle: '@priyacoffee', text: 'anyone else getting notes of stone fruit in the new huila single origin?', sent: 'neu', reach: 1700, ago: '8h', keyword: 'huila' },
];

const KEYWORDS = ['spring blend', 'cold brew', 'wholesale', 'shipping', 'cupping', 'huila'];

const INCOMING: Omit<Mention, 'id' | 'ago'>[] = [
  { platform: 'instagram', author: 'Rosa Delgado', handle: '@rosabrews', text: 'pour-over bar stocked with @emberandoak huila — customers keep asking what it is', sent: 'pos', reach: 2300, keyword: 'huila' },
  { platform: 'x', author: 'Kenji Sato', handle: '@kenjisips', text: 'ember & oak wholesale sample arrived in 2 days. packaging is lovely, cupping tomorrow', sent: 'pos', reach: 940, keyword: 'wholesale' },
  { platform: 'facebook', author: 'Harbor Books Café', handle: 'Harbor Books', text: 'third month on the ember & oak subscription — zero missed deliveries so far', sent: 'pos', reach: 410, keyword: 'wholesale' },
  { platform: 'tiktok', author: 'Mia Torres', handle: '@mialattes', text: 'rating every cold brew in portland pt.4 — ember & oak is currently #1, fight me', sent: 'pos', reach: 51200, keyword: 'cold brew' },
  { platform: 'x', author: 'Dana W', handle: '@danadrinks', text: 'spring blend espresso pulled a little sour on my setup. anyone else? might be my grind', sent: 'neu', reach: 620, keyword: 'spring blend' },
  { platform: 'linkedin', author: 'Marcus Lindt', handle: 'Lindt Hospitality Group', text: 'Shortlisting coffee partners for 6 venues. Impressed by Ember & Oak\'s traceability reporting.', sent: 'pos', reach: 1800, keyword: 'wholesale' },
  { platform: 'instagram', author: 'Slow Mornings', handle: '@slowmorningspdx', text: 'cupping night was packed — the washed ethiopia flew off the table first', sent: 'neu', reach: 3300, keyword: 'cupping' },
];

const SENT_META: Record<Sent, { label: string; color: string; tint: string; icon: string }> = {
  pos: { label: 'Positive', color: '#0e7a52', tint: '#e2efe7', icon: 'trend' },
  neu: { label: 'Neutral', color: '#6e776f', tint: '#eceee7', icon: 'dot' },
  neg: { label: 'Negative', color: '#c2483b', tint: '#f8e6e2', icon: 'alert' },
};

export function Listening() {
  const { a } = useApp();
  const [sent, setSent] = useState<'all' | Sent>('all');
  const [kw, setKw] = useState<string | null>(null);
  const [newKw, setNewKw] = useState('');
  const [tracked, setTracked] = useState(KEYWORDS);
  const [mentions, setMentions] = useState<Mention[]>(SEED_MENTIONS);
  const [flash, setFlash] = useState(false);
  const cursor = useRef(0);

  // new mentions stream in while you watch
  useEffect(() => {
    const t = window.setInterval(() => {
      const next = INCOMING[cursor.current % INCOMING.length];
      cursor.current += 1;
      setMentions(ms => [{ ...next, id: uid(), ago: 'now' }, ...ms].slice(0, 14));
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1600);
    }, 13000);
    return () => window.clearInterval(t);
  }, []);

  const feed = useMemo(() => mentions.filter(m =>
    (sent === 'all' || m.sent === sent) && (!kw || m.keyword === kw)
  ), [mentions, sent, kw]);

  const counts = {
    pos: mentions.filter(m => m.sent === 'pos').length,
    neu: mentions.filter(m => m.sent === 'neu').length,
    neg: mentions.filter(m => m.sent === 'neg').length,
  };
  const posRate = Math.round((counts.pos / mentions.length) * 100);
  const reach = mentions.reduce((n, m) => n + m.reach, 0);

  const competitors = [
    { name: 'Ember & Oak', sov: 42, color: '#0e7a52', you: true },
    { name: 'Nord Beans', sov: 27, color: '#3e7cb1' },
    { name: 'Driftwood', sov: 18, color: '#a96f14' },
    { name: 'Other', sov: 13, color: '#c3cab8' },
  ];

  const addKw = () => {
    const v = newKw.trim().toLowerCase();
    if (v && !tracked.includes(v)) { setTracked(t => [...t, v]); a.toast(`Now tracking "${v}"`, 'info'); }
    setNewKw('');
  };

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[
          { l: 'Mentions · 24h', v: mentions.length, icon: 'message', c: '#0e7a52' },
          { l: 'Positive share', v: posRate, suffix: '%', icon: 'heart', c: '#2f8f83' },
          { l: 'Potential reach', v: reach, icon: 'globe', c: '#3e7cb1', fmt: kfmt },
          { l: 'Needs response', v: counts.neg, icon: 'alert', c: '#c2483b' },
        ].map(k => (
          <Card key={k.l} className="p-4" hover>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">{k.l}</p>
              <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: k.c + '1c', color: k.c }}><Icon name={k.icon} size={13} /></span>
            </div>
            <CountUp value={k.v} suffix={k.suffix ?? ''} className="mt-1 font-display text-[24px] font-bold tracking-tight text-ink" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_300px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <p className="font-display text-[14px] font-bold text-ink">Live mention feed</p>
            <span className={cx('flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider transition-colors duration-500',
              flash ? 'bg-mint text-pine' : 'text-moss')}>
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" /> {flash ? 'new mention' : 'streaming'}
            </span>
            <div className="ml-auto"><Seg size="sm" value={sent} onChange={setSent} options={[{ id: 'all', label: 'All' }, { id: 'pos', label: 'Positive' }, { id: 'neu', label: 'Neutral' }, { id: 'neg', label: 'Negative' }]} /></div>
          </div>
          <div className="divide-y divide-line/70">
            {feed.map(m => {
              const sm = SENT_META[m.sent];
              return (
                <div key={m.id} className="anim-rise flex items-start gap-3 px-4 py-3 transition hover:bg-mint/30">
                  <PlatformIcon p={m.platform} size={26} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12.5px] font-bold text-ink">{m.author}</p>
                      <span className="font-mono text-[10px] text-faint">{m.handle} · {m.ago === 'now' ? 'just now' : `${m.ago} ago`}</span>
                      <span className="ml-auto flex items-center gap-1 font-mono text-[9.5px] text-faint"><Icon name="eye" size={11} /> {kfmt(m.reach)}</span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink2">{m.text}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <Pill color={sm.color} tint={sm.tint}><Icon name={sm.icon} size={10} /> {sm.label}</Pill>
                      <span className="rounded-full bg-paper px-2 py-0.5 font-mono text-[9px] font-semibold text-mut ring-1 ring-line">#{m.keyword}</span>
                      {m.sent === 'neg' && <Btn size="sm" variant="outline" onClick={() => a.nav('inbox')}><Icon name="reply" size={11} /> Handle in inbox</Btn>}
                    </div>
                  </div>
                </div>
              );
            })}
            {feed.length === 0 && <p className="px-4 py-8 text-center text-xs text-mut">No mentions match these filters.</p>}
          </div>
        </Card>

        <div className="space-y-3.5">
          <Card className="p-4">
            <SectionTitle>Tracked keywords</SectionTitle>
            <div className="mb-2.5 flex gap-1.5">
              <input className="h-8 flex-1 rounded-lg border border-line bg-card px-2.5 text-[12px] outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" placeholder="add keyword…" value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKw()} />
              <IconBtn name="plus" onClick={addKw} className="border border-line bg-card" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tracked.map(k => (
                <button key={k} onClick={() => setKw(kw === k ? null : k)}
                  className={cx('rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95',
                    kw === k ? 'border-moss bg-moss text-card shadow-sm' : 'border-line bg-card text-mut hover:border-moss/50 hover:text-pine')}>
                  #{k}
                </button>
              ))}
            </div>
            {kw && <button onClick={() => setKw(null)} className="mt-2 text-[10.5px] font-bold text-moss hover:text-pine">Clear filter ×</button>}
          </Card>

          <Card className="p-4">
            <SectionTitle>Share of voice</SectionTitle>
            <div className="space-y-2.5">
              {competitors.map(c => (
                <div key={c.name}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className={cx('font-semibold', c.you ? 'text-moss' : 'text-ink2')}>{c.name}{c.you && ' (you)'}</span>
                    <span className="font-mono font-bold text-ink">{c.sov}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line/70">
                    <div className="anim-grow h-full rounded-full" style={{ width: `${c.sov}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle>Mention volume · 7d</SectionTitle>
            <Spark data={[4, 6, 5, 8, 7, 10, 8]} color="#0e7a52" w={240} h={60} />
            <p className="mt-2 text-[10.5px] leading-relaxed text-mut">Cupping night and the latte-art video drove this week's spike. Negative volume flat at 1.</p>
          </Card>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <Icon name="bolt" size={12} className="text-moss" /> Listening ingests platform webhooks + keyword crawls into the same unified database — mentions from customers you already know link straight to their CRM profile.
      </p>
    </div>
  );
}
