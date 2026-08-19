import { useEffect, useMemo, useState } from 'react';
import { useApp, useCanEdit } from '../store';
import { cx, Icon, isoOf, relTime, TODAY } from '../meta';
import type { Task } from '../types';
import { Avatar, Btn, Card, EmptyState, IconBtn, inputCls, SectionTitle, Toggle } from '../components/ui';

const PRIO_META: Record<Task['priority'], { label: string; color: string; tint: string; means: string; weight: number }> = {
  high: { label: 'High', color: '#c0453a', tint: '#fbe7e5', means: 'Act today — reminder pings you 24h before due', weight: 0 },
  med: { label: 'Medium', color: '#b26e14', tint: '#f8edd8', means: 'This week — reminder on the due date, 9am', weight: 1 },
  low: { label: 'Low', color: '#71766d', tint: '#eceee8', means: 'Backlog — no reminder until you look', weight: 2 },
};

function PrioChip({ p, onClick, active, showMeaning }: { p: Task['priority']; onClick?: () => void; active?: boolean; showMeaning?: boolean }) {
  const m = PRIO_META[p];
  const inner = (
    <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ color: m.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />{m.label}
    </span>
  );
  if (!onClick) return <span title={m.means} className="rounded-md px-1.5 py-[2px]" style={{ background: m.tint }}>{inner}</span>;
  return (
    <button onClick={onClick} title={m.means}
      className={cx('press rounded-md px-2 py-1 text-[11px] font-semibold transition-all',
        active ? 'ring-2 ring-offset-1 ring-offset-card' : 'opacity-60 hover:opacity-100')}
      style={{ background: m.tint, ['--tw-ring-color' as string]: m.color }}>
      <span className="flex items-center gap-1.5">
        {inner}
        {showMeaning && <span className="hidden font-sans text-[10px] font-medium normal-case tracking-normal text-ink2 md:inline">· {m.means.split(' — ')[0]}</span>}
      </span>
    </button>
  );
}

function TaskRow({ t }: { t: Task }) {
  const { s, a } = useApp();
  const deal = s.deals.find(d => d.id === t.dealId);
  const contact = s.contacts.find(c => c.id === t.contactId);
  const overdue = !t.done && t.due < TODAY;
  const urgent = overdue && t.priority === 'high';
  return (
    <div className={cx('group flex items-center gap-2.5 rounded-lg border px-2 py-2 transition hover:bg-paper/70',
      urgent ? 'border-danger/30 bg-dangerbg/30' : 'border-transparent hover:border-line', t.done && 'opacity-55')}>
      <button onClick={() => a.toggleTask(t.id)}
        className={cx('grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[6px] border transition-all active:scale-90',
          t.done ? 'border-moss bg-moss text-card' : 'border-line2 bg-card hover:border-moss')}>
        {t.done && <Icon name="check" size={11} sw={3} />}
      </button>
      <PrioChip p={t.priority} />
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-[12.5px] font-medium', t.done ? 'text-faint line-through' : 'text-ink')}>{t.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {t.auto && (
            <span className="flex items-center gap-0.5 rounded bg-mint px-1.5 py-[1px] font-mono text-[8.5px] font-bold uppercase tracking-wider text-pine" title="Created automatically when a deal moved to Proposal">
              <Icon name="bolt" size={8} /> auto
            </span>
          )}
          {t.priority === 'high' && !t.done && (
            <span className="flex items-center gap-0.5 rounded bg-paper px-1.5 py-[1px] font-mono text-[8.5px] font-semibold text-mut ring-1 ring-line" title={PRIO_META.high.means}>
              <Icon name="bell" size={8} /> 24h reminder
            </span>
          )}
          {deal && (
            <button onClick={() => a.openDeal(deal.id)} className="flex items-center gap-1 rounded bg-steelbg px-1.5 py-[1px] font-mono text-[9px] font-semibold text-steel transition hover:brightness-95">
              <Icon name="kanban" size={9} />{deal.name.length > 26 ? deal.name.slice(0, 26) + '…' : deal.name}
            </button>
          )}
          {contact && (
            <button onClick={() => a.openContact(contact.id)} className="flex items-center gap-1 rounded bg-paper px-1.5 py-[1px] font-mono text-[9px] font-semibold text-mut ring-1 ring-line transition hover:text-ink">
              <Icon name="users" size={9} />{contact.name}
            </button>
          )}
        </div>
      </div>
      {urgent && <span className="shrink-0 rounded-md bg-danger px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-white">overdue</span>}
      <span className={cx('shrink-0 font-mono text-[10px] font-semibold', overdue ? 'text-danger' : 'text-mut')}>
        {overdue && !urgent && <Icon name="alert" size={10} className="mr-0.5 inline" />}{relTime(t.due)}
      </span>
      <Avatar name={t.assignee} size={22} />
      <IconBtn name="trash" title="Delete task" className="opacity-0 transition group-hover:opacity-100 hover:bg-dangerbg hover:text-danger" onClick={() => a.removeTask(t.id)} />
    </div>
  );
}

export function Tasks() {
  const { s, a } = useApp();
  const can = useCanEdit();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(TODAY);
  const [prio, setPrio] = useState<Task['priority']>('med');
  const [assignee, setAssignee] = useState('Maya Chen');
  const [dealId, setDealId] = useState('');
  const [autoRule, setAutoRule] = useState(true);
  const [filter, setFilter] = useState<'all' | Task['priority']>('all');

  useEffect(() => {
    if (s.create === 'task') { setAutoRule(true); a.ui({ create: null }); }
  }, [s.create, a]);

  const sortFn = (x: Task, y: Task) =>
    PRIO_META[x.priority].weight - PRIO_META[y.priority].weight || x.due.localeCompare(y.due);

  const groups = useMemo(() => {
    const open = s.tasks.filter(t => !t.done && (filter === 'all' || t.priority === filter));
    return {
      overdue: open.filter(t => t.due < TODAY).sort(sortFn),
      today: open.filter(t => t.due === TODAY).sort(sortFn),
      upcoming: open.filter(t => t.due > TODAY).sort(sortFn),
      done: s.tasks.filter(t => t.done && (filter === 'all' || t.priority === filter)),
    };
  }, [s.tasks, filter]);

  const openCount = s.tasks.filter(t => !t.done).length;

  const add = () => {
    if (!title.trim()) return;
    a.addTask({ title: title.trim(), due, priority: prio, assignee, dealId: dealId || undefined });
    setTitle('');
  };

  const section = (label: string, list: Task[], tone?: string, hint?: string) => list.length === 0 ? null : (
    <div key={label}>
      <SectionTitle right={
        <span className="flex items-center gap-2">
          {hint && <span className="hidden font-mono text-[9px] font-medium uppercase tracking-wider text-faint sm:inline">{hint}</span>}
          <span className="tnum font-mono text-[10.5px] font-bold" style={{ color: tone ?? '#71766d' }}>{list.length}</span>
        </span>
      }>{label}</SectionTitle>
      <div className="space-y-0.5">{list.map(t => <TaskRow key={t.id} t={t} />)}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-12 gap-3.5">
      <div className="col-span-12 space-y-5 lg:col-span-8">
        <Card className="p-3.5">
          <p className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Quick add</p>
          <div className="flex flex-wrap items-center gap-2">
            <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()}
              placeholder='Log a call, a follow-up, a "send contract"…'
              className={cx(inputCls, 'min-w-[220px] flex-1')} />
            <input type="date" value={due} onChange={e => setDue(e.target.value)} className={cx(inputCls, 'w-auto')} />
            <select value={assignee} onChange={e => setAssignee(e.target.value)} className={cx(inputCls, 'w-auto')}>
              {s.users.filter(u => u.role !== 'viewer').map(u => <option key={u.id}>{u.name}</option>)}
            </select>
            <Btn onClick={add} disabled={!can} title={can ? 'Add task' : 'Read-only role'}><Icon name="plus" size={14} sw={2.4} /> Add</Btn>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Priority</span>
            <div className="flex items-center gap-1">
              {(['high', 'med', 'low'] as Task['priority'][]).map(p => {
                const m = PRIO_META[p];
                const on = prio === p;
                return (
                  <button key={p} onClick={() => setPrio(p)} title={m.means}
                    className={cx('press flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-all',
                      on ? 'border-transparent text-ink shadow-[0_1px_3px_rgb(27_27_23/0.12)]' : 'border-line bg-card text-mut hover:text-ink')}
                    style={on ? { background: m.tint } : undefined}>
                    <span className={cx('grid h-3.5 w-3.5 place-items-center rounded-full border', on ? 'border-transparent' : 'border-line2')}
                      style={on ? { background: m.color } : undefined}>
                      {on && <Icon name="check" size={8} sw={3.4} className="text-white" />}
                    </span>
                    {m.label}
                  </button>
                );
              })}
            </div>
            <span className="text-[10.5px] text-faint">{PRIO_META[prio].means}</span>
            <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Deal</span>
            <select value={dealId} onChange={e => setDealId(e.target.value)} className={cx(inputCls, 'w-auto max-w-[240px]')}>
              <option value="">No link</option>
              {s.deals.filter(d => !['won', 'lost'].includes(d.stage)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </Card>

        {/* what priority means + filter */}
        <Card className="flex flex-wrap items-center gap-2 px-3.5 py-3">
          <span className="mr-1 flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">
            <Icon name="filter" size={11} /> Filter
          </span>
          <button onClick={() => setFilter('all')}
            className={cx('press rounded-md border px-2 py-1 text-[11px] font-semibold transition-all',
              filter === 'all' ? 'border-ink/70 bg-night text-card' : 'border-line bg-card text-mut hover:text-ink')}>
            All open · {openCount}
          </button>
          {(['high', 'med', 'low'] as Task['priority'][]).map(p => (
            <PrioChip key={p} p={p} showMeaning active={filter === p}
              onClick={() => setFilter(f => (f === p ? 'all' : p))} />
          ))}
          <span className="ml-auto hidden text-[10.5px] text-faint lg:block">
            Priority drives the reminder cadence — <span className="font-semibold text-ink2">High = 24h early</span>, Medium = due-date morning, Low = silent.
          </span>
        </Card>

        {section('Overdue', groups.overdue, '#c0453a', 'oldest first · High on top')}
        {section('Today', groups.today, '#b26e14', 'sorted by priority')}
        {section('Upcoming', groups.upcoming, undefined, 'sorted by priority')}
        {groups.overdue.length + groups.today.length + groups.upcoming.length === 0 && (
          <EmptyState icon="checksq" title={filter === 'all' ? 'All clear' : `No ${PRIO_META[filter as Task['priority']]?.label.toLowerCase()} tasks`}
            sub={filter === 'all' ? 'No open tasks. Log a call or move a deal to Proposal — the automation will give you work.' : 'Nothing at this priority right now. Clear the filter to see everything.'} />
        )}
        {groups.done.length > 0 && (
          <div>
            <SectionTitle right={<span className="tnum font-mono text-[10.5px] font-bold text-faint">{groups.done.length}</span>}>Completed</SectionTitle>
            <div className="space-y-0.5">{groups.done.map(t => <TaskRow key={t.id} t={t} />)}</div>
          </div>
        )}
      </div>

      <div className="col-span-12 space-y-3.5 lg:col-span-4">
        <Card className="p-4">
          <SectionTitle right={<Toggle on={autoRule} onChange={v => { setAutoRule(v); a.toast(v ? 'Automation armed — moves to Proposal create tasks' : 'Automation paused', v ? 'success' : 'warning'); }} />}>
            Automations
          </SectionTitle>
          <div className={cx('space-y-2.5 transition-opacity', !autoRule && 'opacity-45')}>
            <div className="rounded-lg border border-line bg-paper/70 p-2.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink"><Icon name="bolt" size={12} className="text-moss" /> Deal → Proposal</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-mut">Creates <span className="font-mono text-[10px] font-semibold text-ink2">"Send contract — deal name"</span> as a <span className="font-semibold" style={{ color: PRIO_META.high.color }}>High</span> task, due tomorrow, owned by the deal's owner.</p>
              <p className="mt-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-moss">Fired {s.tasks.filter(t => t.auto).length}× this month</p>
            </div>
            <div className="rounded-lg border border-line bg-paper/70 p-2.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink"><Icon name="bell" size={12} className="text-amber" /> Reminders by priority</p>
              <ul className="mt-1 space-y-1 text-[10.5px] leading-relaxed text-mut">
                <li><span className="font-bold" style={{ color: PRIO_META.high.color }}>High</span> — email + push <span className="font-semibold text-ink2">24h before due</span></li>
                <li><span className="font-bold" style={{ color: PRIO_META.med.color }}>Medium</span> — reminder at 9am on the due date</li>
                <li><span className="font-bold" style={{ color: PRIO_META.low.color }}>Low</span> — silent until you open the list</li>
              </ul>
            </div>
            <div className="rounded-lg border border-line bg-paper/70 p-2.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink"><Icon name="send" size={12} className="text-steel" /> Post approved</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-mut">Approved posts auto-schedule to their slot — no second touch needed. Pending posts auto-approve after 24h.</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle right={<span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-moss"><span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" /> live</span>}>
            This week's activity
          </SectionTitle>
          <div className="space-y-1.5">
            {[
              { icon: 'phone', text: '14 calls logged', tone: '#0e7a52' },
              { icon: 'mail', text: '31 emails tracked', tone: '#3e7cb1' },
              { icon: 'video', text: '6 meetings held', tone: '#a96f14' },
              { icon: 'message', text: `${s.threads.length + 41} social replies`, tone: '#2f8f83' },
            ].map(x => (
              <div key={x.text} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: x.tone + '1c', color: x.tone }}><Icon name={x.icon} size={13} /></span>
                <span className="text-xs font-medium text-ink2">{x.text}</span>
                <span className="ml-auto font-mono text-[9.5px] text-faint">{isoOf(new Date())}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
