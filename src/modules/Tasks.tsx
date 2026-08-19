import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, fmtDate, Icon, isoOf, relTime, TODAY } from '../meta';
import type { Task } from '../types';
import { Avatar, Btn, Card, EmptyState, IconBtn, inputCls, SectionTitle, Toggle } from '../components/ui';

const PRIO = { high: '#c2483b', med: '#a96f14', low: '#8a978d' } as const;

function TaskRow({ t }: { t: Task }) {
  const { s, a } = useApp();
  const deal = s.deals.find(d => d.id === t.dealId);
  const contact = s.contacts.find(c => c.id === t.contactId);
  const overdue = !t.done && t.due < TODAY;
  return (
    <div className={cx('group flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 transition hover:border-line hover:bg-paper/70', t.done && 'opacity-55')}>
      <button onClick={() => a.toggleTask(t.id)}
        className={cx('grid h-[19px] w-[19px] shrink-0 place-items-center rounded-[6px] border transition-all active:scale-90',
          t.done ? 'border-moss bg-moss text-card' : 'border-line2 bg-card hover:border-moss')}>
        {t.done && <Icon name="check" size={11} sw={3} />}
      </button>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: PRIO[t.priority] }} title={`${t.priority} priority`} />
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-[12.5px] font-medium', t.done ? 'text-faint line-through' : 'text-ink')}>{t.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          {t.auto && (
            <span className="flex items-center gap-0.5 rounded bg-mint px-1.5 py-[1px] font-mono text-[8.5px] font-bold uppercase tracking-wider text-pine" title="Created by pipeline automation">
              <Icon name="bolt" size={8} /> auto
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
      <span className={cx('shrink-0 font-mono text-[10px] font-semibold', overdue ? 'text-danger' : 'text-mut')}>
        {overdue && <Icon name="alert" size={10} className="mr-0.5 inline" />}{relTime(t.due)}
      </span>
      <Avatar name={t.assignee} size={22} />
      <IconBtn name="trash" title="Delete task" className="opacity-0 transition group-hover:opacity-100 hover:bg-dangerbg hover:text-danger" onClick={() => a.removeTask(t.id)} />
    </div>
  );
}

export function Tasks() {
  const { s, a } = useApp();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(TODAY);
  const [prio, setPrio] = useState<Task['priority']>('med');
  const [assignee, setAssignee] = useState('Maya Chen');
  const [dealId, setDealId] = useState('');
  const [autoRule, setAutoRule] = useState(true);

  useEffect(() => {
    if (s.create === 'task') { setAutoRule(true); a.ui({ create: null }); }
  }, [s.create, a]);

  const groups = useMemo(() => {
    const open = s.tasks.filter(t => !t.done);
    return {
      overdue: open.filter(t => t.due < TODAY).sort((x, y) => x.due.localeCompare(y.due)),
      today: open.filter(t => t.due === TODAY),
      upcoming: open.filter(t => t.due > TODAY).sort((x, y) => x.due.localeCompare(y.due)),
      done: s.tasks.filter(t => t.done),
    };
  }, [s.tasks]);

  const add = () => {
    if (!title.trim()) return;
    a.addTask({ title: title.trim(), due, priority: prio, assignee, dealId: dealId || undefined });
    setTitle('');
  };

  const section = (label: string, list: Task[], tone?: string) => list.length === 0 ? null : (
    <div key={label}>
      <SectionTitle right={<span className="font-mono text-[10.5px] font-bold" style={{ color: tone ?? '#6e776f' }}>{list.length}</span>}>{label}</SectionTitle>
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
            <select value={prio} onChange={e => setPrio(e.target.value as Task['priority'])} className={cx(inputCls, 'w-auto')}>
              <option value="high">High</option><option value="med">Medium</option><option value="low">Low</option>
            </select>
            <select value={assignee} onChange={e => setAssignee(e.target.value)} className={cx(inputCls, 'w-auto')}>
              {s.users.filter(u => u.role !== 'viewer').map(u => <option key={u.id}>{u.name}</option>)}
            </select>
            <Btn onClick={add}><Icon name="plus" size={14} sw={2.4} /> Add</Btn>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Link to deal</span>
            <select value={dealId} onChange={e => setDealId(e.target.value)} className={cx(inputCls, 'w-auto max-w-[260px]')}>
              <option value="">No link</option>
              {s.deals.filter(d => !['won', 'lost'].includes(d.stage)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </Card>

        {section(`Overdue`, groups.overdue, '#c2483b')}
        {section('Today', groups.today, '#a96f14')}
        {section('Upcoming', groups.upcoming)}
        {groups.overdue.length + groups.today.length + groups.upcoming.length === 0 && (
          <EmptyState icon="checksq" title="All clear" sub="No open tasks. Log a call or move a deal to Proposal — the automation will give you work." />
        )}
        {groups.done.length > 0 && (
          <div>
            <SectionTitle right={<span className="font-mono text-[10.5px] font-bold text-faint">{groups.done.length}</span>}>Completed</SectionTitle>
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
              <p className="mt-1 text-[10.5px] leading-relaxed text-mut">Create task <span className="font-mono text-[10px] font-semibold text-ink2">"Send contract — deal name"</span>, due tomorrow, assigned to the deal owner.</p>
              <p className="mt-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-moss">Fired {s.tasks.filter(t => t.auto).length}× this month</p>
            </div>
            <div className="rounded-lg border border-line bg-paper/70 p-2.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink"><Icon name="clock" size={12} className="text-amber" /> Due in 24h</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-mut">Email + push reminder to the assignee the day before anything is due.</p>
              <p className="mt-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-amber">Always on</p>
            </div>
            <div className="rounded-lg border border-line bg-paper/70 p-2.5">
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-ink"><Icon name="send" size={12} className="text-steel" /> Post approved</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-mut">Approved posts auto-schedule to their slot — no second touch needed. Pending posts auto-approve after 24h.</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <SectionTitle>This week's activity log</SectionTitle>
          <div className="space-y-1.5">
            {[
              { icon: 'phone', text: '14 calls logged', tone: '#0e7a52' },
              { icon: 'mail', text: '31 emails tracked', tone: '#3e7cb1' },
              { icon: 'video', text: '6 meetings held', tone: '#a96f14' },
              { icon: 'message', text: '48 social replies', tone: '#2f8f83' },
            ].map(x => (
              <div key={x.text} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5">
                <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: x.tone + '1c', color: x.tone }}><Icon name={x.icon} size={13} /></span>
                <span className="text-xs font-medium text-ink2">{x.text}</span>
                <span className="ml-auto font-mono text-[9.5px] text-faint">{fmtDate(isoOf(new Date()))}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
