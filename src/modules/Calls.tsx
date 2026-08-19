import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { Avatar, Btn, Card, CountUp, Pill, SectionTitle } from '../components/ui';

interface CallLog {
  id: string; contact: string; company: string; direction: 'out' | 'in';
  duration: number; // seconds
  when: string; outcome: string; recorded: boolean; transcript: string;
}

const SEED_LOG: CallLog[] = [
  { id: 'cl1', contact: 'Ingrid Halvorsen', company: 'Café Astra', direction: 'out', duration: 742, when: 'Today · 10:12', outcome: 'Proposal discussed', recorded: true, transcript: '…we can commit to 60-day terms if volume stays above 40kg/month. I will send the revised MSAA today…' },
  { id: 'cl2', contact: 'Sofia Reyes', company: 'Hotel Verdant', direction: 'in', duration: 318, when: 'Today · 09:03', outcome: 'Left voicemail', recorded: true, transcript: '…following up on the minibar single-serve pouches. Call me back when you have the sleeve mockups…' },
  { id: 'cl3', contact: 'Harriet Boone', company: 'Cascade Provisions', direction: 'out', duration: 505, when: 'Yesterday · 16:44', outcome: 'Meeting booked', recorded: false, transcript: '…booked a cupping for Thursday 2pm to compare the spring blend against their current supplier…' },
  { id: 'cl4', contact: 'Leo Martins', company: 'Driftwood Café', direction: 'out', duration: 187, when: 'Yesterday · 11:20', outcome: 'Pricing sent', recorded: true, transcript: '…sent the wholesale tier sheet. They are deciding between us and Nord Beans by Friday…' },
];

const OUTCOMES = ['Proposal discussed', 'Meeting booked', 'Pricing sent', 'Left voicemail', 'Follow-up set'];

function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function Waveform({ live }: { live: boolean }) {
  const bars = 28;
  return (
    <div className="flex h-12 items-center justify-center gap-[3px]">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i}
          className={cx('w-[3px] rounded-full', live ? 'bg-lime' : 'bg-line2')}
          style={live ? {
            height: `${8 + Math.abs(Math.sin((i * 7919 + Date.now() / 60) % 6.28)) * 34}px`,
            animation: `pulsedot ${0.6 + (i % 5) * 0.13}s ease-in-out ${i * 0.04}s infinite`,
          } : { height: `${6 + (i % 4) * 5}px` }} />
      ))}
    </div>
  );
}

export function Calls() {
  const { s, a } = useApp();
  const [phase, setPhase] = useState<'idle' | 'ringing' | 'live'>('idle');
  const [secs, setSecs] = useState(0);
  const [target, setTarget] = useState(s.contacts[0]?.name ?? '');
  const [log, setLog] = useState<CallLog[]>(SEED_LOG);
  const [num, setNum] = useState('');
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const contact = s.contacts.find(c => c.name === target);

  const start = () => {
    if (phase !== 'idle') return;
    setPhase('ringing'); setSecs(0);
    window.setTimeout(() => {
      setPhase('live');
      timer.current = window.setInterval(() => setSecs(x => x + 1), 1000);
    }, 1800);
  };

  const end = () => {
    if (timer.current) window.clearInterval(timer.current);
    const duration = phase === 'live' ? secs : 0;
    if (contact) {
      setLog(l => [{
        id: `cl${Date.now()}`, contact: contact.name, company: contact.company, direction: 'out',
        duration, when: 'Just now', outcome: duration > 60 ? OUTCOMES[secs % OUTCOMES.length] : 'No answer',
        recorded: duration > 30, transcript: duration > 30 ? `…call with ${contact.name} (${contact.company}) captured and transcribed. Key points queued for the timeline…` : '',
      }, ...l]);
      if (duration > 0) a.logActivity(contact.id, 'call', `Outbound call · ${fmtDur(duration)}`);
    }
    setPhase('idle');
    if (duration > 0) a.toast(`Call logged · ${fmtDur(duration)}${duration > 30 ? ' · recorded & transcribed' : ''}`, 'info');
  };

  const stats = useMemo(() => {
    const total = log.length;
    const answered = log.filter(l => l.duration > 0).length;
    const avg = Math.round(log.reduce((n, l) => n + l.duration, 0) / Math.max(1, total));
    return { total, rate: Math.round((answered / total) * 100), avg };
  }, [log]);

  const padKey = (k: string) => setNum(n => (n + k).slice(0, 14));

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[
          { l: 'Calls this week', v: stats.total + 18, icon: 'phone', c: '#0e7a52' },
          { l: 'Connect rate', v: stats.rate, suffix: '%', icon: 'trend', c: '#3e7cb1' },
          { l: 'Avg duration', v: Math.round(stats.avg / 60), suffix: 'm', icon: 'clock', c: '#a96f14' },
          { l: 'Auto-logged to CRM', v: 100, suffix: '%', icon: 'bolt', c: '#2f8f83' },
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

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[360px_1fr]">
        {/* dialer */}
        <Card className="overflow-hidden">
          <div className="glow-top relative border-b border-line bg-night p-5 text-center text-card">
            <div className="bg-dots pointer-events-none absolute inset-0 opacity-25" />
            <div className="relative">
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full border-2 border-nightline bg-lime/10 ring-1 ring-lime/30">
                <Avatar name={target || '?'} size={52} />
              </div>
              <p className="font-display text-[17px] font-bold tracking-tight">{target || 'Unknown'}</p>
              <p className="font-mono text-[10.5px] text-nighttx">{contact ? `${contact.company} · ${contact.phone ?? '+1 (503) 555-0100'}` : num || 'select a contact'}</p>
              <p className={cx('mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em]',
                phase === 'idle' ? 'text-nighttx' : phase === 'ringing' ? 'text-butter' : 'text-lime')}>
                {phase === 'idle' ? 'Ready' : phase === 'ringing' ? 'Calling…' : `In call · ${fmtDur(secs)}`}
              </p>
              <div className="mt-2"><Waveform live={phase === 'live'} /></div>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <select value={target} onChange={e => setTarget(e.target.value)}
              className="h-9 w-full rounded-lg border border-line bg-card px-2.5 text-[12.5px] font-medium outline-none transition focus:border-moss">
              {s.contacts.slice(0, 12).map(c => <option key={c.id} value={c.name}>{c.name} — {c.company}</option>)}
            </select>

            <div className="grid grid-cols-3 gap-1.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => (
                <button key={k} onClick={() => padKey(k)}
                  className="h-10 rounded-lg border border-line bg-card font-mono text-[15px] font-semibold text-ink2 transition-all hover:border-moss/50 hover:bg-mint/50 active:scale-95">{k}</button>
              ))}
            </div>
            {num && <p className="text-center font-mono text-[13px] font-bold tracking-widest text-ink">{num}</p>}

            <div className="flex items-center justify-center gap-3 pt-1">
              {phase === 'idle' ? (
                <button onClick={start}
                  className="flex h-14 items-center gap-2.5 rounded-full bg-moss px-8 text-[15px] font-bold text-card shadow-lift transition-all hover:bg-pine hover:shadow-pop active:scale-95">
                  <Icon name="phone" size={18} /> Call
                </button>
              ) : (
                <>
                  {phase === 'live' && (
                    <button onClick={() => a.toast('Muted', 'info')} title="Mute"
                      className="grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-mut transition hover:text-ink active:scale-95"><Icon name="message" size={16} /></button>
                  )}
                  <button onClick={end}
                    className="flex h-14 items-center gap-2.5 rounded-full bg-danger px-8 text-[15px] font-bold text-card shadow-lift transition-all hover:brightness-110 active:scale-95">
                    <Icon name="phone" size={18} className="rotate-[135deg]" /> End
                  </button>
                </>
              )}
            </div>
            <p className="text-center text-[10px] text-faint">VoIP via connected provider (Phase 2) · every call auto-logs to the contact timeline</p>
          </div>
        </Card>

        {/* call log */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="font-display text-[14px] font-bold text-ink">Call log</p>
            <Pill color="#0e7a52" tint="#e2efe7" dot>recording on</Pill>
          </div>
          <div className="divide-y divide-line/70">
            {log.map(c => (
              <div key={c.id} className="anim-rise px-4 py-3 transition hover:bg-mint/30">
                <div className="flex items-center gap-3">
                  <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', c.direction === 'out' ? 'bg-mint text-moss' : 'bg-steelbg text-steel')}>
                    <Icon name={c.direction === 'out' ? 'phone' : 'phone'} size={15} className={c.direction === 'in' ? '-scale-x-100' : ''} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[12.5px] font-bold text-ink">{c.contact}</p>
                      <span className="truncate font-mono text-[10px] text-faint">{c.company} · {c.when}</span>
                    </div>
                    <p className="text-[11px] text-mut">{c.outcome} · {c.duration > 0 ? fmtDur(c.duration) : 'no answer'}</p>
                  </div>
                  {c.recorded && <span className="flex items-center gap-1 rounded-md bg-paper px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-mut ring-1 ring-line"><Icon name="play" size={9} /> rec</span>}
                  <span className={cx('font-mono text-[10px] font-semibold', c.duration > 0 ? 'text-moss' : 'text-faint')}>{c.direction === 'out' ? '↗ out' : '↙ in'}</span>
                </div>
                {c.transcript && (
                  <p className="mt-2 ml-12 rounded-lg border border-line bg-paper/60 px-3 py-2 text-[11px] italic leading-relaxed text-mut">
                    <span className="mr-1 font-mono text-[8.5px] font-bold uppercase not-italic tracking-wider text-steel">transcript</span>{c.transcript}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
