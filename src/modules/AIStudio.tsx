import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, PLATFORMS, PlatformIcon } from '../meta';
import type { Platform } from '../types';
import { Avatar, Btn, Card, CountUp, Pill, SectionTitle, Seg, Spark } from '../components/ui';

type Tool = 'writer' | 'subject' | 'reply' | 'sentiment' | 'besttime' | 'leads';

const TOOLS: { id: Tool; label: string; icon: string; tag: string; blurb: string }[] = [
  { id: 'writer', label: 'Post Writer', icon: 'edit', tag: 'Generate', blurb: 'Platform-tuned copy in your brand voice' },
  { id: 'subject', label: 'Subject Lines', icon: 'mail', tag: 'Email', blurb: 'High-open subject lines, scored' },
  { id: 'reply', label: 'Reply Suggest', icon: 'reply', tag: 'Inbox', blurb: 'Draft replies for open conversations' },
  { id: 'sentiment', label: 'Sentiment', icon: 'heart', tag: 'Analyze', blurb: 'Read the room before you respond' },
  { id: 'besttime', label: 'Best Time', icon: 'clock', tag: 'Predict', blurb: 'When each network actually engages' },
  { id: 'leads', label: 'Lead Scores', icon: 'trend', tag: 'Score', blurb: 'Which contacts are ready to buy' },
];

/* ---------- simulated streaming text ---------- */
function useStreamer() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);
  const stream = (full: string, onDone?: () => void) => {
    if (timer.current) window.clearInterval(timer.current);
    setBusy(true); setText('');
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 2 + Math.floor(Math.random() * 3);
      setText(full.slice(0, i));
      if (i >= full.length) {
        if (timer.current) window.clearInterval(timer.current);
        setBusy(false);
        onDone?.();
      }
    }, 14);
  };
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);
  return { text, busy, stream };
}

/* ---------- deterministic "AI" helpers ---------- */
const POST_IDEAS: Record<string, (topic: string) => string> = {
  linkedin: t => `We just wrapped a ${t.toLowerCase()} session and three things surprised us.\n\n1. Small batches beat volume on consistency.\n2. Our wholesale partners care about story, not just price.\n3. Shipping within 24h is now table stakes.\n\nIf you run a café program, we'd love to compare notes. ☕`,
  instagram: t => `POV: it's roast day and the ${t.toLowerCase()} just hit the cooling tray. 🔥\n\nSmall batch. Shipped in 24h. Gone by Friday.\n\nTap the link in bio to grab the spring drop. #specialtycoffee #roastery`,
  x: t => `hot take: your ${t.toLowerCase()} is fine. your follow-up is the problem.\n\nwe ship in 24h and reply in 2h. that's the whole moat.`,
  facebook: t => `This week at the roastery: our ${t.toLowerCase()} is back, and we're roasting it in small batches for the first time.\n\nCome by Thursday for cupping night — first pour's on us.`,
};

function useLeadScores() {
  const { s } = useApp();
  return useMemo(() => s.contacts.map(c => {
    const deals = s.deals.filter(d => d.contactId === c.id);
    const value = deals.reduce((n, d) => n + d.value, 0);
    const recency = Math.max(0, 30 - Math.min(30, Math.floor((Date.now() - new Date(c.lastActivity).getTime()) / 864e5)));
    let score = 18;
    if (c.tags.includes('wholesale')) score += 22;
    if (c.tags.includes('lead')) score += 12;
    if (c.source === 'Form') score += 14;
    if (deals.length > 0) score += 16;
    if (value > 10000) score += 12;
    score += Math.round(recency / 3);
    const factors: { label: string; pts: number }[] = [];
    if (c.tags.includes('wholesale')) factors.push({ label: 'Wholesale tag', pts: 22 });
    if (deals.length > 0) factors.push({ label: `${deals.length} open deal${deals.length > 1 ? 's' : ''}`, pts: 16 });
    if (c.source === 'Form') factors.push({ label: 'Inbound form', pts: 14 });
    if (recency > 20) factors.push({ label: 'Active recently', pts: 8 });
    return { c, score: Math.min(99, score), value, factors };
  }).sort((a, b) => b.score - a.score).slice(0, 8), [s.contacts, s.deals]);
}

const BAND = (score: number) =>
  score >= 70 ? { label: 'Hot', color: '#0e7a52', tint: '#e2efe7' }
    : score >= 45 ? { label: 'Warm', color: '#a96f14', tint: '#f7ecd6' }
      : { label: 'Nurture', color: '#6e776f', tint: '#eceee7' };

/* ================= tool panels ================= */

function WriterPanel() {
  const { a } = useApp();
  const [topic, setTopic] = useState('spring blend wholesale launch');
  const [tone, setTone] = useState<'bold' | 'warm' | 'expert'>('bold');
  const [plat, setPlat] = useState<Platform>('linkedin');
  const { text, busy, stream } = useStreamer();
  const [variants, setVariants] = useState<{ plat: Platform; body: string }[]>([]);

  const generate = () => {
    const gen = POST_IDEAS[plat] ?? POST_IDEAS.linkedin;
    const body = gen(topic) + (tone === 'bold' ? '\n\nNo fluff. Just the beans.' : tone === 'warm' ? '\n\nCome taste it with us.' : '\n\nData on request.');
    stream(body, () => setVariants(v => [{ plat, body }, ...v.filter(x => x.plat !== plat)].slice(0, 3)));
  };

  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_300px]">
      <Card className="p-4">
        <SectionTitle>Compose prompt</SectionTitle>
        <label className="block">
          <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">What's the post about?</span>
          <input className="h-9 w-full rounded-lg border border-line bg-card px-3 text-[13px] outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" value={topic} onChange={e => setTopic(e.target.value)} />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Seg size="sm" value={tone} onChange={setTone} options={[{ id: 'bold', label: 'Bold' }, { id: 'warm', label: 'Warm' }, { id: 'expert', label: 'Expert' }]} />
          <div className="ml-auto flex -space-x-1">
            {(['linkedin', 'instagram', 'x', 'facebook'] as Platform[]).map(p => (
              <button key={p} onClick={() => setPlat(p)} title={PLATFORMS[p].name}
                className={cx('rounded-md p-0.5 transition-all', plat === p ? 'bg-mint ring-1 ring-moss/40' : 'opacity-50 hover:opacity-90')}>
                <PlatformIcon p={p} size={20} />
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Btn onClick={generate} disabled={busy || !topic.trim()}>
            <Icon name={busy ? 'refresh' : 'bolt'} size={14} /> {busy ? 'Writing…' : 'Generate post'}
          </Btn>
          {text && !busy && <Btn variant="outline" size="sm" onClick={() => { try { void navigator.clipboard.writeText(text); } catch { /*noop*/ } a.toast('Copied to clipboard', 'info'); }}><Icon name="copy" size={13} /> Copy</Btn>}
        </div>
        {text && (
          <div className="anim-rise mt-4 rounded-xl border border-line bg-paper/70 p-3.5">
            <p className="mb-2 flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-mut">
              <PlatformIcon p={plat} size={13} /> {PLATFORMS[plat].name} draft
              {busy && <span className="live-dot ml-1 text-moss">●</span>}
            </p>
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink">{text}<span className={cx('text-moss', !busy && 'hidden')}>▍</span></p>
          </div>
        )}
      </Card>
      <Card className="p-4">
        <SectionTitle>Variations</SectionTitle>
        {variants.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line2 bg-paper/60 px-3 py-6 text-center text-xs text-mut">Generate to collect platform variations here.</p>
        ) : variants.map((v, i) => (
          <div key={i} className="anim-rise mb-2 rounded-lg border border-line bg-paper/60 p-2.5">
            <p className="mb-1 flex items-center gap-1.5"><PlatformIcon p={v.plat} size={14} /><span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-mut">{PLATFORMS[v.plat].name}</span></p>
            <p className="line-clamp-3 text-[11px] leading-snug text-ink2">{v.body}</p>
            <button onClick={() => { try { void navigator.clipboard.writeText(v.body); } catch { /*noop*/ } a.toast('Variation copied', 'info'); }} className="mt-1.5 text-[10.5px] font-bold text-moss hover:text-pine">Copy →</button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function SubjectPanel() {
  const { a } = useApp();
  const [ctx, setCtx] = useState('cold brew summer drop for wholesale partners');
  const { busy, stream } = useStreamer();
  const [lines, setLines] = useState<{ s: string; open: number }[]>([]);
  const [reveal, setReveal] = useState(0);

  const generate = () => {
    const base = [
      { s: `☕ The ${ctx.split(' ')[0]} drop your café has been asking about`, open: 44 },
      { s: `Last call: ${ctx} ends Friday`, open: 41 },
      { s: `Your spring menu is missing this one drink`, open: 38 },
      { s: `${ctx} — 24h ship, small batch`, open: 36 },
      { s: `Quick question about your cold brew program`, open: 52 },
    ];
    setLines(base); setReveal(0);
    setLines([]);
    stream('x'.repeat(10), () => undefined);
    base.forEach((b, i) => window.setTimeout(() => setReveal(i + 1), 200 + i * 220));
    window.setTimeout(() => setLines(base), 120);
  };

  return (
    <Card className="p-4">
      <SectionTitle>Campaign context</SectionTitle>
      <div className="flex gap-2">
        <input className="h-9 flex-1 rounded-lg border border-line bg-card px-3 text-[13px] outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" value={ctx} onChange={e => setCtx(e.target.value)} />
        <Btn onClick={generate} disabled={busy}><Icon name="bolt" size={14} /> Score 5</Btn>
      </div>
      {lines.length > 0 && (
        <div className="mt-4 space-y-2">
          {lines.slice(0, reveal).map((l, i) => (
            <div key={i} className="anim-rise flex items-center gap-3 rounded-lg border border-line bg-paper/60 px-3 py-2.5">
              <span className={cx('grid h-9 w-12 shrink-0 place-items-center rounded-lg font-mono text-[13px] font-bold', l.open >= 44 ? 'bg-mint text-pine' : l.open >= 38 ? 'bg-amberbg text-amber' : 'bg-line/70 text-mut')}>{l.open}%</span>
              <p className="flex-1 text-[13px] font-medium text-ink">{l.s}</p>
              <button onClick={() => { try { void navigator.clipboard.writeText(l.s); } catch { /*noop*/ } a.toast('Subject copied', 'info'); }} className="text-faint transition hover:text-moss"><Icon name="copy" size={14} /></button>
            </div>
          ))}
          <p className="pt-1 text-[10.5px] text-faint">Predicted open rate modeled on your last 12 sends · personalization tokens auto-insert on send.</p>
        </div>
      )}
    </Card>
  );
}

function ReplyPanel() {
  const { s, a } = useApp();
  const open = s.threads.filter(t => t.status !== 'resolved');
  const [sel, setSel] = useState(open[0]?.id ?? '');
  const { text, busy, stream } = useStreamer();
  const thread = s.threads.find(t => t.id === sel);
  const generate = () => {
    if (!thread) return;
    stream(`Hi ${thread.person.replace('@', '')} — thanks so much for reaching out! Yes, we can absolutely help with that. I've looped in our team and we'll get you pricing and availability within the day. Anything else you'd like us to include?`);
  };
  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[260px_1fr]">
      <Card className="p-3">
        <SectionTitle>Open threads</SectionTitle>
        <div className="space-y-1">
          {open.map(t => (
            <button key={t.id} onClick={() => { setSel(t.id); }}
              className={cx('flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition', sel === t.id ? 'border-moss/50 bg-mint/60' : 'border-transparent hover:bg-paper/80')}>
              <PlatformIcon p={t.platform} size={18} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11.5px] font-bold text-ink">{t.person}</span>
                <span className="block truncate text-[10px] text-mut">{t.preview}</span>
              </span>
            </button>
          ))}
          {open.length === 0 && <p className="py-4 text-center text-xs text-mut">All caught up. 🎉</p>}
        </div>
      </Card>
      <Card className="p-4">
        <SectionTitle right={thread ? <Pill color="#0e7a52" tint="#e2efe7">{PLATFORMS[thread.platform].name}</Pill> : undefined}>Draft reply</SectionTitle>
        {thread && <p className="mb-3 rounded-lg bg-paper/70 px-3 py-2 text-[11.5px] italic text-mut">"{thread.messages[thread.messages.length - 1].text}"</p>}
        <div className="flex items-center gap-2">
          <Btn onClick={generate} disabled={busy || !thread}><Icon name={busy ? 'refresh' : 'bolt'} size={14} /> {busy ? 'Drafting…' : 'Suggest reply'}</Btn>
          {text && !busy && <Btn variant="primary" size="sm" onClick={() => { if (thread) { a.replyThread(thread.id, text); a.toast('Reply sent from AI draft'); } }}><Icon name="send" size={13} /> Send via inbox</Btn>}
        </div>
        {text && (
          <div className="anim-rise mt-3 rounded-xl border border-line bg-paper/70 p-3.5">
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink">{text}<span className={cx('text-moss', !busy && 'hidden')}>▍</span></p>
          </div>
        )}
      </Card>
    </div>
  );
}

function SentimentPanel() {
  const { s } = useApp();
  const [txt, setTxt] = useState('The counter cart worked great at our weekend market 🙌 Sold out by noon!');
  const [res, setRes] = useState<null | { score: number; label: string; why: string }>(null);
  const [busy, setBusy] = useState(false);
  const quick = s.threads.slice(0, 4);
  const analyze = (t: string) => {
    setTxt(t); setBusy(true); setRes(null);
    window.setTimeout(() => {
      const pos = (t.match(/[🙌🔥❤️!]|great|love|amazing|thanks|sold out|awesome|perfect/gi) ?? []).length;
      const neg = (t.match(/bad|terrible|slow|issue|problem|angry|worst|refund/gi) ?? []).length;
      const score = Math.max(2, Math.min(98, 52 + pos * 14 - neg * 18));
      const label = score >= 66 ? 'Positive' : score >= 40 ? 'Neutral' : 'Negative';
      setRes({ score, label, why: score >= 66 ? 'Enthusiastic language and positive emoji detected. Great candidate for a testimonial or repost.' : score >= 40 ? 'Informational tone. Respond promptly to keep momentum.' : 'Frustration detected. Escalate to a human and reply within the hour.' });
      setBusy(false);
    }, 700);
  };
  const color = res ? (res.score >= 66 ? '#0e7a52' : res.score >= 40 ? '#a96f14' : '#c2483b') : '#6e776f';
  return (
    <Card className="p-4">
      <SectionTitle>Analyze a message</SectionTitle>
      <textarea className="h-20 w-full resize-none rounded-lg border border-line bg-card px-3 py-2 text-[13px] outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15" value={txt} onChange={e => setTxt(e.target.value)} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Btn onClick={() => analyze(txt)} disabled={busy}><Icon name="heart" size={14} /> {busy ? 'Reading…' : 'Analyze'}</Btn>
        <span className="font-mono text-[9px] uppercase tracking-wider text-faint">try an inbox thread:</span>
        {quick.map(t => <button key={t.id} onClick={() => analyze(t.messages[t.messages.length - 1].text)} className="rounded-full border border-line bg-card px-2 py-0.5 text-[10px] font-semibold text-mut transition hover:border-moss hover:text-pine">{t.person.split(' ')[0]}</button>)}
      </div>
      {res && (
        <div className="anim-rise mt-4 flex items-center gap-4 rounded-xl border border-line bg-paper/70 p-4">
          <div className="relative h-16 w-16 shrink-0">
            <svg viewBox="0 0 64 64" className="-rotate-90">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#e3e6dc" strokeWidth="7" />
              <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={163} strokeDashoffset={163 - (res.score / 100) * 163} className="transition-all duration-700" />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-mono text-[15px] font-bold" style={{ color }}>{res.score}</span>
          </div>
          <div>
            <p className="text-[15px] font-bold" style={{ color }}>{res.label}</p>
            <p className="mt-0.5 max-w-[420px] text-[11.5px] leading-relaxed text-mut">{res.why}</p>
          </div>
        </div>
      )}
    </Card>
  );
}

function BestTimePanel() {
  const [plat, setPlat] = useState<Platform>('linkedin');
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = ['8a', '10a', '12p', '2p', '4p', '6p', '8p'];
  // deterministic pseudo-heat per platform
  const heat = (d: number, h: number) => {
    const seed = (plat.length * 7 + d * 13 + h * 5) % 10;
    const base = plat === 'linkedin' ? (d < 5 && h >= 1 && h <= 3 ? 8 : 3) : plat === 'instagram' ? (h >= 4 ? 8 : 4) : plat === 'tiktok' ? (h >= 5 ? 9 : 3) : (h >= 2 && h <= 5 ? 7 : 4);
    return Math.min(10, base + (seed > 6 ? 2 : 0));
  };
  return (
    <Card className="p-4">
      <SectionTitle right={
        <div className="flex -space-x-1">
          {(['linkedin', 'instagram', 'x', 'tiktok', 'facebook'] as Platform[]).map(p => (
            <button key={p} onClick={() => setPlat(p)} className={cx('rounded-md p-0.5 transition-all', plat === p ? 'bg-mint ring-1 ring-moss/40' : 'opacity-50 hover:opacity-90')}><PlatformIcon p={p} size={20} /></button>
          ))}
        </div>
      }>Predicted engagement · {PLATFORMS[plat].name}</SectionTitle>
      <div className="mt-3 overflow-x-auto">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `40px repeat(${hours.length}, 56px)` }}>
          <span />
          {hours.map(h => <span key={h} className="text-center font-mono text-[9px] font-semibold uppercase text-faint">{h}</span>)}
          {days.map((d, di) => (
            <div key={d} className="contents">
              <span className="pr-1 text-right font-mono text-[10px] font-semibold text-mut">{d}</span>
              {hours.map((_, hi) => {
                const v = heat(di, hi);
                return (
                  <div key={hi} title={`${d} ${hours[hi]} · engagement ${v}/10`}
                    className="flex h-9 items-center justify-center rounded-md transition-transform hover:scale-105"
                    style={{ background: `rgba(14,122,82,${0.06 + v * 0.085})` }}>
                    {v >= 8 && <span className="h-1.5 w-1.5 rounded-full bg-card shadow" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-faint"><Icon name="bolt" size={12} className="text-moss" /> Brightest cells = your audience's peak. Schedule into them from the calendar.</p>
    </Card>
  );
}

function LeadsPanel() {
  const { a } = useApp();
  const scored = useLeadScores();
  const avg = Math.round(scored.reduce((n, x) => n + x.score, 0) / Math.max(1, scored.length));
  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[280px_1fr]">
      <Card className="p-4">
        <SectionTitle>Model</SectionTitle>
        <p className="text-[11.5px] leading-relaxed text-mut">Scores blend <span className="font-semibold text-ink2">deal value, tag signals, inbound source and recency</span> — the same features a production model trains on. No API calls, no per-use cost.</p>
        <div className="mt-4">
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Portfolio avg</p>
          <CountUp value={avg} className="font-display text-[34px] font-bold text-ink" />
          <Spark data={[38, 41, 40, 45, 47, 52, avg]} color="#0e7a52" w={180} h={44} />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <div className="border-b border-line px-4 py-3"><p className="font-display text-[14px] font-bold text-ink">Highest-intent contacts</p></div>
        <div className="divide-y divide-line/70">
          {scored.map(({ c, score, value, factors }) => {
            const b = BAND(score);
            return (
              <button key={c.id} onClick={() => a.openContact(c.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-mint/40">
                <Avatar name={c.name} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-bold text-ink">{c.name}</p>
                  <p className="truncate text-[10.5px] text-mut">{c.company} · {factors.map(f => f.label).join(' · ') || 'baseline'}</p>
                </div>
                {value > 0 && <span className="hidden font-mono text-[10.5px] font-semibold text-steel sm:block">${(value / 1000).toFixed(0)}K pipeline</span>}
                <div className="flex w-24 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/80"><div className="anim-grow h-full rounded-full" style={{ width: `${score}%`, background: b.color }} /></div>
                  <span className="font-mono text-[11px] font-bold" style={{ color: b.color }}>{score}</span>
                </div>
                <Pill color={b.color} tint={b.tint}>{b.label}</Pill>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ================= module shell ================= */
export function AIStudio() {
  const [tool, setTool] = useState<Tool>('writer');
  const active = TOOLS.find(t => t.id === tool) ?? TOOLS[0];
  return (
    <div className="space-y-3.5">
      <div className="glow-top relative overflow-hidden rounded-xl border border-nightline bg-night p-4 text-card">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-moss/20 text-moss"><Icon name="bolt" size={22} /></span>
          <div className="min-w-[220px] flex-1">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">Phase 3 · Intelligence</p>
            <h1 className="font-display text-[24px] font-bold leading-tight tracking-tight">AI Studio <span className="text-nighttx">— {active.label}</span></h1>
            <p className="text-[12px] text-nighttx">{active.blurb}. Runs on-device in the demo — your data never leaves the workspace.</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] text-nighttx">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" /> model warm · $0 marginal cost
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[220px_1fr]">
        <div className="flex gap-1.5 overflow-x-auto lg:flex-col lg:overflow-visible">
          {TOOLS.map(t => (
            <button key={t.id} onClick={() => setTool(t.id)}
              className={cx('group flex min-w-[150px] shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all lg:min-w-0',
                tool === t.id ? 'border-moss/50 bg-card shadow-lift' : 'border-line bg-card/60 hover:border-line2 hover:bg-card')}>
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors', tool === t.id ? 'bg-moss text-card' : 'bg-paper text-mut group-hover:text-ink')}>
                <Icon name={t.icon} size={15} />
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[12px] font-bold text-ink">{t.label}</span>
                <span className="block font-mono text-[8.5px] font-semibold uppercase tracking-wider text-faint">{t.tag}</span>
              </span>
            </button>
          ))}
        </div>
        <div key={tool} className="anim-rise min-w-0">
          {tool === 'writer' && <WriterPanel />}
          {tool === 'subject' && <SubjectPanel />}
          {tool === 'reply' && <ReplyPanel />}
          {tool === 'sentiment' && <SentimentPanel />}
          {tool === 'besttime' && <BestTimePanel />}
          {tool === 'leads' && <LeadsPanel />}
        </div>
      </div>
    </div>
  );
}
