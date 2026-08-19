import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, PLATFORMS, PlatformIcon } from '../meta';
import type { Platform } from '../types';
import { Avatar, Btn, Card, CountUp, Pill, SectionTitle, Seg, Spark } from '../components/ui';

type Tool = 'writer' | 'subject' | 'reply' | 'sentiment' | 'besttime' | 'leads';
type Tone = 'bold' | 'warm' | 'expert';

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

/* ---------- generation engine: tone hooks × platform formats × topic ---------- */
const pick = <T,>(arr: T[], last: number): [T, number] => {
  let i = Math.floor(Math.random() * arr.length);
  if (arr.length > 1 && i === last) i = (i + 1) % arr.length;
  return [arr[i], i];
};

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const kw = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2).slice(0, 3);

const HOOKS: Record<Tone, ((t: string) => string)[]> = {
  bold: [
    t => `Stop scrolling — we need to talk about ${t}.`,
    t => `Unpopular opinion: ${t} is easier than everyone pretends.`,
    t => `Everyone's doing ${t} wrong. Here's what we do instead.`,
    t => `${cap(t)} isn't a tactic. It's a discipline.`,
  ],
  warm: [
    t => `There's a small moment in every ${t} that makes it all worth it.`,
    t => `Come sit with us for a minute — today is all about ${t}.`,
    t => `Some things are better shared. ${cap(t)}, for instance.`,
    t => `We saved you a seat. Today's brew: ${t}.`,
  ],
  expert: [
    t => `After 90 days of measuring ${t}, three numbers changed our mind.`,
    t => `We ran 40+ tests on ${t}. The results surprised us.`,
    t => `If you only read one thing about ${t} this quarter, make it this.`,
    t => `${cap(t)}: what the data actually says.`,
  ],
};

const BODIES: Record<string, ((t: string) => string)[]> = {
  linkedin: [
    t => `Three things we learned the hard way:\n\n1. Consistency beats intensity — small weekly wins compound.\n2. People buy the story behind ${t}, not the feature list.\n3. Shipping fast is now table stakes, not a differentiator.\n\nIf your team touches ${t}, I'd genuinely love to compare notes.`,
    t => `We used to treat ${t} as a side project. It's now our #1 growth lever.\n\nThe shift was simple: one owner, one metric, one weekly review.\n\nNo new tools. No new hires. Just focus.`,
    t => `Most ${t} advice online is recycled. So here's ours, unfiltered:\n\n→ Start smaller than feels comfortable\n→ Publish before you're proud of it\n→ Let the replies set next week's agenda`,
  ],
  instagram: [
    t => `POV: it's ${t} day and the whole roastery smells different. ✨\n\nSmall batch. Roasted this morning. Gone by Friday.\n\nLink in bio before it sells out.`,
    t => `This is your sign to take ${t} seriously. 📸\n\nBehind the scenes: 6am starts, 3 cupping rounds, one very tired roaster.\n\nWorth every second.`,
    t => `New drop alert 🚨 ${cap(t)} just hit the shelves.\n\nFirst 20 orders get a handwritten tasting card.`,
  ],
  x: [
    t => `hot take: your ${t} isn't the problem. your follow-up is.`,
    t => `we spent 90 days on ${t} so you don't have to. thread:`,
    t => `${t}, ranked by what actually moves the number:\n\n1. speed\n2. story\n3. everything else`,
  ],
  facebook: [
    t => `This week at the roastery: ${t} is back, and we're doing it in small batches for the first time.\n\nCome by Thursday for cupping night — first pour's on us.`,
    t => `Big news, friends: ${cap(t)} is officially live.\n\nWe kept it small on purpose — 300 bags, hand-stamped, gone when they're gone.`,
  ],
  tiktok: [
    t => `things nobody tells you about ${t} ☕\n\n1. day 1 is chaos\n2. day 30 is routine\n3. day 90 is when it gets fun`,
    t => `POV: you finally nailed ${t} and the whole shop can smell it`,
  ],
  youtube: [
    t => `${cap(t)} — the full breakdown.\n\nWhat we tried, what failed, and the exact setup that finally worked.`,
    t => `We tested ${t} for 90 days straight. Here's everything.`,
  ],
  pinterest: [
    t => `5 ways to make ${t} work for a small team — save this for your next planning session. 📌`,
    t => `The ${t} checklist we wish we'd had on day one. Pin it, thank us later.`,
  ],
  gmb: [
    t => `${cap(t)} is here this week at Ember & Oak.\n\nStop by before Saturday — mention this post for a free tasting flight.`,
    t => `Fresh in: ${t}. Roasted on-site, served all week.\n\nBook a table or just walk in — we'll save you a seat.`,
  ],
};

const CLOSERS: Record<Tone, string[]> = {
  bold: ['No fluff. Just the beans.', 'Do it scared. Ship it anyway.', 'Your move.'],
  warm: ['Come taste it with us. ☕', 'We saved you a cup.', 'See you at the bar.'],
  expert: ['Full data on request.', 'Methodology in the comments.', 'Happy to share the spreadsheet.'],
};

const SUFFIX: Record<string, (t: string) => string> = {
  linkedin: () => '',
  instagram: t => `\n\n#${kw(t).join(' #') || 'smallbatch'} #specialtycoffee #roasterylife #pdxcoffee`,
  x: () => '\n\n(that\'s the post.)',
  facebook: () => '\n\n📍 Ember & Oak · Portland · open 7–6',
  tiktok: () => '\n\n#coffeetok #smallbusiness #behindthescenes',
  youtube: () => '\n\n⏱ Chapters + the full notes in the description.',
  pinterest: () => '\n\nFollow for a new checklist every week.',
  gmb: () => '\n\n⭐ Love it? Leave a review — it genuinely helps.',
};

function generateCopy(plat: Platform, tone: Tone, topicRaw: string, memory: Record<string, number>): string {
  const t = topicRaw.trim().toLowerCase() || 'our spring roast';
  const [hook, hi] = pick(HOOKS[tone], memory[`${tone}-hook`] ?? -1);
  memory[`${tone}-hook`] = hi;
  const bodies = BODIES[plat] ?? BODIES.linkedin;
  const [body, bi] = pick(bodies, memory[`${plat}-body`] ?? -1);
  memory[`${plat}-body`] = bi;
  const [closer, ci] = pick(CLOSERS[tone], memory[`${tone}-closer`] ?? -1);
  memory[`${tone}-closer`] = ci;
  const suffix = (SUFFIX[plat] ?? (() => ''))(t);
  return `${hook(t)}\n\n${body(t)}\n\n${closer}${suffix}`;
}

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
  score >= 70 ? { label: 'Hot', color: '#e5484d', tint: '#ffe0df' }
    : score >= 45 ? { label: 'Warm', color: '#e86a17', tint: '#ffe9d4' }
      : { label: 'Nurture', color: '#3d6bff', tint: '#e3eaff' };

/* ================= tool panels ================= */

function WriterPanel() {
  const { a } = useApp();
  const [topic, setTopic] = useState('spring blend wholesale launch');
  const [tone, setTone] = useState<Tone>('bold');
  const [plat, setPlat] = useState<Platform>('linkedin');
  const { text, busy, stream } = useStreamer();
  const [variants, setVariants] = useState<{ plat: Platform; body: string }[]>([]);
  const memory = useRef<Record<string, number>>({});

  const generate = () => {
    const body = generateCopy(plat, tone, topic, memory.current);
    stream(body, () => setVariants(v => [{ plat, body }, ...v.filter(x => !(x.plat === plat && x.body === body))].slice(0, 4)));
  };

  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1fr_300px]">
      <Card className="p-4">
        <SectionTitle>Compose prompt</SectionTitle>
        <label className="block">
          <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">What's the post about?</span>
          <input className="h-9 w-full rounded-lg border-[1.5px] border-ink bg-card px-3 text-[13px] font-medium outline-none transition placeholder:text-faint focus:shadow-hard-sm" value={topic} onChange={e => setTopic(e.target.value)} />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Seg size="sm" value={tone} onChange={setTone} options={[{ id: 'bold', label: 'Bold' }, { id: 'warm', label: 'Warm' }, { id: 'expert', label: 'Expert' }]} />
          <div className="ml-auto flex -space-x-1">
            {(Object.keys(PLATFORMS) as Platform[]).map(p => (
              <button key={p} onClick={() => setPlat(p)} title={PLATFORMS[p].name}
                className={cx('rounded-md p-0.5 transition-all', plat === p ? 'bg-butter ring-2 ring-ink shadow-hard-sm' : 'opacity-45 hover:opacity-90')}>
                <PlatformIcon p={p} size={19} />
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

const SUBJECT_POOL: ((c: string) => { s: string; open: number })[] = [
  c => ({ s: `☕ The ${c.split(' ')[0]} drop your café has been asking about`, open: 44 }),
  c => ({ s: `Last call: ${c} ends Friday`, open: 41 }),
  () => ({ s: 'Your spring menu is missing this one drink', open: 38 }),
  c => ({ s: `${cap(c)} — 24h ship, small batch`, open: 36 }),
  () => ({ s: 'Quick question about your cold brew program', open: 52 }),
  c => ({ s: `We tested ${c.split(' ')[0]} 40 ways. One won.`, open: 47 }),
  c => ({ s: `${cap(c)}: the numbers behind our best week yet`, open: 43 }),
  () => ({ s: '3 signs your coffee program is leaving money on the table', open: 49 }),
  c => ({ s: `You asked, we listened — ${c} is here`, open: 40 }),
  () => ({ s: 'The 2-minute read every café owner should see', open: 37 }),
  c => ({ s: `${cap(c)} + your espresso bar = ?`, open: 45 }),
  () => ({ s: 'One tweak that cut our prep time in half', open: 42 }),
];

function SubjectPanel() {
  const { a } = useApp();
  const [ctx, setCtx] = useState('cold brew summer drop for wholesale partners');
  const { busy, stream } = useStreamer();
  const [lines, setLines] = useState<{ s: string; open: number }[]>([]);
  const [reveal, setReveal] = useState(0);
  const used = useRef<number[]>([]);

  const generate = () => {
    const c = ctx.trim().toLowerCase() || 'our summer drop';
    // draw 5 distinct templates, never repeating the previous batch
    const poolIdx = SUBJECT_POOL.map((_, i) => i);
    const fresh = poolIdx.filter(i => !used.current.includes(i));
    const source = fresh.length >= 5 ? fresh : poolIdx;
    const drawn: number[] = [];
    while (drawn.length < 5) {
      const i = source.splice(Math.floor(Math.random() * source.length), 1)[0];
      drawn.push(i);
      if (source.length === 0) break;
    }
    used.current = drawn;
    const base = drawn.map(i => {
      const line = SUBJECT_POOL[i](c);
      return { s: line.s, open: Math.min(58, Math.max(31, line.open + Math.floor(Math.random() * 7) - 3)) };
    });
    setLines(base); setReveal(0);
    stream('x'.repeat(10), () => undefined);
    base.forEach((_, i) => window.setTimeout(() => setReveal(i + 1), 200 + i * 220));
  };

  return (
    <Card className="p-4">
      <SectionTitle>Campaign context</SectionTitle>
      <div className="flex gap-2">
        <input className="h-9 flex-1 rounded-lg border-[1.5px] border-ink bg-card px-3 text-[13px] font-medium outline-none transition placeholder:text-faint focus:shadow-hard-sm" value={ctx} onChange={e => setCtx(e.target.value)} />
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

const REPLY_POOL: Record<string, ((who: string, last: string) => string)[]> = {
  dm: [
    (who, last) => `Hi ${who} — thanks for the message! Short answer: yes, we can do that. I'll send pricing and current availability over today. Anything specific you'd like included?`,
    (who) => `Hey ${who}! Great timing — we just opened slots for next month. Want me to pencil you in for a quick call this week?`,
    (who) => `${who} 🙌 appreciate you reaching out. Let me check with the roastery team and get back to you before end of day with details.`,
  ],
  comment: [
    (who) => `Thank you ${who}! That genuinely made our morning. The next batch drops Friday — we'll save you one if you're quick. ☕`,
    (who) => `${who} you have great taste 😄 that one's our most-requested roast — link's in bio if you want the full tasting notes.`,
    (who) => `Love this, ${who}! We cupped it three times before shipping. Come by the bar if you're ever in Portland — first pour's on us.`,
  ],
  mention: [
    (who) => `Thanks for the shoutout, ${who}! We're blushing. 🙏 If you ever want to collab on a roast, our DMs are open.`,
    (who) => `${who} — this means a lot! We'll share it on our story with full credit. Keep the great content coming.`,
  ],
};

function ReplyPanel() {
  const { s, a } = useApp();
  const open = s.threads.filter(t => t.status !== 'resolved');
  const [sel, setSel] = useState(open[0]?.id ?? '');
  const { text, busy, stream } = useStreamer();
  const thread = s.threads.find(t => t.id === sel);
  const lastReply = useRef<Record<string, number>>({});
  const generate = () => {
    if (!thread) return;
    const pool = REPLY_POOL[thread.kind] ?? REPLY_POOL.dm;
    const who = thread.person.replace('@', '').split(' ')[0];
    const last = thread.messages[thread.messages.length - 1]?.text ?? '';
    const [body, idx] = pick(pool, lastReply.current[thread.id] ?? -1);
    lastReply.current[thread.id] = idx;
    stream(body(who, last));
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
        <SectionTitle right={thread ? <Pill color="#3d6bff" tint="#e3eaff">{PLATFORMS[thread.platform].name}</Pill> : undefined}>Draft reply</SectionTitle>
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
  const color = res ? (res.score >= 66 ? '#2e9e4f' : res.score >= 40 ? '#e86a17' : '#e5484d') : '#75756b';
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
      <div className="glow-top relative overflow-hidden rounded-xl border-2 border-ink bg-night p-4 text-card shadow-hard-lg">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="sticker grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-lime text-ink shadow-hard-sm"><Icon name="bolt" size={22} sw={2.2} /></span>
          <div className="min-w-[220px] flex-1">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-lime">Phase 3 · Intelligence</p>
            <h1 className="font-display text-[24px] font-bold leading-tight tracking-tight">AI Studio <span className="text-nighttx">— {active.label}</span></h1>
            <p className="text-[12px] text-nighttx">{active.blurb}. Runs on-device in the demo — your data never leaves the workspace.</p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-nighttx">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-lime" /> model warm · $0 marginal cost
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
