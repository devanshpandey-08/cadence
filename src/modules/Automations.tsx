import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, kfmt } from '../meta';
import { LIST_SIZES } from '../data';
import { Btn, Card, CountUp, IconBtn, Pill, SectionTitle, Seg, Toggle } from '../components/ui';

type StepKind = 'wait' | 'email' | 'branch' | 'sms' | 'task';

interface Step { id: string; kind: StepKind; title: string; meta: string; }
interface Sequence {
  id: string; name: string; list: string; trigger: string; active: boolean;
  enrolled: number; completed: number; sent: number; steps: Step[];
}

const SEED: Sequence[] = [
  {
    id: 'sq1', name: 'Wholesale welcome', list: 'Wholesale leads', trigger: 'Submits "Wholesale inquiry" form', active: true,
    enrolled: 412, completed: 287, sent: 1204,
    steps: [
      { id: 's1', kind: 'wait', title: 'Wait 1 hour', meta: 'let the intent stay warm' },
      { id: 's2', kind: 'email', title: 'Welcome + price list', meta: 'template: wholesale-welcome-v3' },
      { id: 's3', kind: 'branch', title: 'Opened welcome email?', meta: 'yes → price guide · no → case studies' },
      { id: 's4', kind: 'wait', title: 'Wait 3 days', meta: ' Fri 09:00 local send window' },
      { id: 's5', kind: 'email', title: 'Roastery tour invite', meta: 'template: tour-invite' },
      { id: 's6', kind: 'task', title: 'Create follow-up call task', meta: 'assigned to owner · due in 2 days' },
    ],
  },
  {
    id: 'sq2', name: 'Trial nurture — cold brew', list: 'Trial customers', trigger: 'First order placed', active: true,
    enrolled: 1268, completed: 640, sent: 3911,
    steps: [
      { id: 's1', kind: 'wait', title: 'Wait 2 days', meta: 'after delivery window' },
      { id: 's2', kind: 'email', title: 'Brew guide + video', meta: 'template: brew-guide' },
      { id: 's3', kind: 'branch', title: 'Clicked brew guide?', meta: 'yes → subscription offer · no → flavor quiz' },
      { id: 's4', kind: 'email', title: 'Subscribe & save 15%', meta: 'template: sub-offer-15' },
    ],
  },
  {
    id: 'sq3', name: 'Win-back — lapsed cafés', list: 'Lapsed 90d', trigger: 'No order in 90 days', active: false,
    enrolled: 96, completed: 12, sent: 184,
    steps: [
      { id: 's1', kind: 'email', title: 'We miss you — new spring menu', meta: 'template: winback-spring' },
      { id: 's2', kind: 'wait', title: 'Wait 7 days', meta: '' },
      { id: 's3', kind: 'sms', title: 'SMS: 10% back-on-board code', meta: 'via connected SMS provider' },
    ],
  },
];

const STEP_META: Record<StepKind, { icon: string; color: string; tint: string; label: string }> = {
  wait: { icon: 'clock', color: '#6e776f', tint: '#eceee7', label: 'Wait' },
  email: { icon: 'mail', color: '#0e7a52', tint: '#e2efe7', label: 'Email' },
  branch: { icon: 'filter', color: '#a96f14', tint: '#f7ecd6', label: 'Branch' },
  sms: { icon: 'message', color: '#3e7cb1', tint: '#e5eef6', label: 'SMS' },
  task: { icon: 'checksq', color: '#2f8f83', tint: '#e1f0ee', label: 'Task' },
};

function StepCard({ step, onRemove, last }: { step: Step; onRemove: () => void; last?: boolean }) {
  const m = STEP_META[step.kind];
  return (
    <div className="relative">
      <div className="group anim-rise flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lift">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: m.tint, color: m.color }}><Icon name={m.icon} size={16} /></span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[12.5px] font-bold text-ink">{step.title}</p>
          <p className="truncate font-mono text-[9.5px] text-mut">{step.meta || m.label}</p>
        </div>
        <span className="rounded-md px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider" style={{ color: m.color, background: m.tint }}>{m.label}</span>
        <IconBtn name="trash" title="Remove step" className="opacity-0 transition group-hover:opacity-100 hover:bg-dangerbg hover:text-danger" onClick={onRemove} />
      </div>
      {!last && (
        <div className="relative mx-auto h-6 w-px bg-line2">
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-x-4 border-t-[5px] border-x-transparent border-t-line2" />
        </div>
      )}
    </div>
  );
}

export function Automations() {
  const { a } = useApp();
  const [seqs, setSeqs] = useState<Sequence[]>(SEED);
  const [selId, setSelId] = useState('sq1');
  const sel = seqs.find(x => x.id === selId) ?? seqs[0];

  const totals = useMemo(() => ({
    active: seqs.filter(s => s.active).length,
    enrolled: seqs.reduce((n, s) => n + s.enrolled, 0),
    sent: seqs.reduce((n, s) => n + s.sent, 0),
    rate: Math.round((seqs.reduce((n, s) => n + s.completed, 0) / Math.max(1, seqs.reduce((n, s) => n + s.enrolled, 0))) * 100),
  }), [seqs]);

  const patch = (id: string, p: Partial<Sequence>) => setSeqs(ss => ss.map(s => (s.id === id ? { ...s, ...p } : s)));

  const addStep = (kind: StepKind) => {
    const presets: Record<StepKind, { title: string; meta: string }> = {
      wait: { title: 'Wait 2 days', meta: 'respects send windows' },
      email: { title: 'New email step', meta: 'template: untitled' },
      branch: { title: 'Opened previous email?', meta: 'yes → path A · no → path B' },
      sms: { title: 'SMS touch', meta: 'via connected provider' },
      task: { title: 'Create task for owner', meta: 'due in 2 days' },
    };
    const p = presets[kind];
    patch(sel.id, { steps: [...sel.steps, { id: `st${Date.now()}`, kind, ...p }] });
    a.toast(`${STEP_META[kind].label} step added to "${sel.name}"`, 'info');
  };

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[
          { l: 'Active sequences', v: totals.active, icon: 'bolt', c: '#0e7a52' },
          { l: 'Contacts enrolled', v: totals.enrolled, icon: 'users', c: '#3e7cb1', fmt: kfmt },
          { l: 'Automated sends', v: totals.sent, icon: 'send', c: '#a96f14', fmt: kfmt },
          { l: 'Completion rate', v: totals.rate, icon: 'trend', c: '#2f8f83', suffix: '%' },
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

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[300px_1fr]">
        <Card className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-3.5 py-3">
            <p className="font-display text-[13.5px] font-bold text-ink">Sequences</p>
            <Btn size="sm" variant="outline" onClick={() => {
              const id = `sq${Date.now()}`;
              setSeqs(ss => [...ss, { id, name: 'Untitled sequence', list: Object.keys(LIST_SIZES)[0], trigger: 'Manually enrolled', active: false, enrolled: 0, completed: 0, sent: 0, steps: [{ id: 'st1', kind: 'email', title: 'First touch', meta: 'template: untitled' }] }]);
              setSelId(id);
            }}><Icon name="plus" size={13} sw={2.4} /> New</Btn>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {seqs.map(s => (
              <button key={s.id} onClick={() => setSelId(s.id)}
                className={cx('w-full rounded-xl border p-3 text-left transition-all', selId === s.id ? 'border-moss/50 bg-mint/50 shadow-sm' : 'border-transparent hover:bg-paper/80')}>
                <div className="flex items-center justify-between gap-2">
                  <p className={cx('truncate text-[12.5px] font-bold', s.active ? 'text-ink' : 'text-mut')}>{s.name}</p>
                  {s.active && <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-moss" />}
                </div>
                <p className="mt-0.5 truncate font-mono text-[9.5px] text-mut">{s.list} · {s.steps.length} steps</p>
                <div className="mt-2 flex items-center gap-3 font-mono text-[9.5px] text-faint">
                  <span>{kfmt(s.enrolled)} enrolled</span><span>{kfmt(s.sent)} sent</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <div className="min-w-[200px] flex-1">
              <p className="font-display text-[17px] font-bold tracking-tight text-ink">{sel.name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-mut">
                <Icon name="bolt" size={12} className="text-moss" /> Trigger: <span className="font-semibold text-ink2">{sel.trigger}</span> · list <span className="font-mono text-[10px] font-bold text-steel">{sel.list}</span>
              </p>
            </div>
            <span className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-mut">
              {sel.active ? 'Running' : 'Paused'}
              <Toggle on={sel.active} onChange={v => { patch(sel.id, { active: v }); a.toast(v ? `"${sel.name}" is live — enrolling new matches` : `"${sel.name}" paused`, v ? 'success' : 'warning'); }} />
            </span>
          </div>

          <div className="rounded-xl border border-line bg-paper/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-night text-card"><Icon name="bolt" size={14} /></span>
              <div className="leading-tight">
                <p className="text-[12px] font-bold text-ink">Trigger</p>
                <p className="font-mono text-[9.5px] text-mut">{sel.trigger}</p>
              </div>
            </div>
            <div className="mx-auto mb-2 h-5 w-px bg-line2" />
            {sel.steps.map((st, i) => (
              <StepCard key={st.id} step={st} last={i === sel.steps.length - 1}
                onRemove={() => { patch(sel.id, { steps: sel.steps.filter(x => x.id !== st.id) }); a.toast('Step removed', 'warning'); }} />
            ))}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-mut">Add step</span>
              {(Object.keys(STEP_META) as StepKind[]).map(k => (
                <button key={k} onClick={() => addStep(k)}
                  className="flex items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-1.5 text-[11px] font-bold transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-95"
                  style={{ color: STEP_META[k].color }}>
                  <Icon name={STEP_META[k].icon} size={12} /> {STEP_META[k].label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {[
              { l: 'Enrolled', v: sel.enrolled },
              { l: 'Completed', v: sel.completed },
              { l: 'Emails sent', v: sel.sent },
            ].map(k => (
              <div key={k.l} className="rounded-lg border border-line bg-card px-3 py-2.5">
                <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] text-mut">{k.l}</p>
                <CountUp value={k.v} className="font-display text-[18px] font-bold text-ink" />
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[10.5px] text-faint">
            <Icon name="mail" size={12} className="text-moss" /> Delivered through Cadence sending (Phase 2) — DKIM/SPF authenticated, bounces &amp; unsubscribes handled automatically.
          </p>
        </Card>
      </div>
    </div>
  );
}
