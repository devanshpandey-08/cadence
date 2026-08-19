import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, fmtDate, Icon, isoOf, money, relTime, stageMeta, STAGES, TODAY, uid } from '../meta';
import type { Deal, Stage } from '../types';
import { Avatar, Btn, Card, Drawer, Field, IconBtn, inputCls, Modal, Pill, Seg } from '../components/ui';

function AddDealModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, a } = useApp();
  const [f, setF] = useState({ name: '', contactId: '', value: '5000', stage: 'lead' as Stage, close: isoOf(new Date(Date.now() + 14 * 864e5)), owner: 'Maya Chen' });
  const [err, setErr] = useState('');

  const submit = () => {
    if (!f.name.trim() || !f.contactId) { setErr('Pick a name and a contact.'); return; }
    a.addDeal({ name: f.name.trim(), contactId: f.contactId, value: Math.max(0, Number(f.value) || 0), stage: f.stage, owner: f.owner, close: f.close });
    setF({ ...f, name: '', contactId: '' });
    setErr('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New deal" sub="Link every deal to a contact — one contact can have many deals." w="max-w-md"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={submit}><Icon name="plus" size={14} /> Create deal</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Deal name" req><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Café Astra — annual wholesale" /></Field></div>
        <div className="col-span-2">
          <Field label="Contact" req>
            <select className={inputCls} value={f.contactId} onChange={e => setF({ ...f, contactId: e.target.value })}>
              <option value="">Choose contact…</option>
              {s.contacts.map(c => <option key={c.id} value={c.id}>{c.name} — {c.company}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Value (USD)"><input type="number" className={inputCls} value={f.value} onChange={e => setF({ ...f, value: e.target.value })} /></Field>
        <Field label="Stage">
          <select className={inputCls} value={f.stage} onChange={e => setF({ ...f, stage: e.target.value as Stage })}>
            {STAGES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
          </select>
        </Field>
        <Field label="Expected close"><input type="date" className={inputCls} value={f.close} onChange={e => setF({ ...f, close: e.target.value })} /></Field>
        <Field label="Owner">
          <select className={inputCls} value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })}>
            {s.users.filter(u => u.role !== 'viewer').map(u => <option key={u.id}>{u.name}</option>)}
          </select>
        </Field>
      </div>
      {err && <p className="anim-shake mt-3 rounded-lg bg-dangerbg px-3 py-2 text-xs font-medium text-danger">{err}</p>}
    </Modal>
  );
}

function DealDrawer() {
  const { s, a } = useApp();
  const d = s.deals.find(x => x.id === s.dealId) ?? null;
  const [note, setNote] = useState('');
  if (!d) return null;
  const c = s.contacts.find(x => x.id === d.contactId);
  const sm = stageMeta(d.stage);
  const close = () => a.ui({ dealId: null });

  return (
    <Drawer open onClose={close}>
      <div className="border-b border-line bg-paper/60 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Deal</p>
            <h2 className="font-display text-[19px] font-bold tracking-tight text-ink">{d.name}</h2>
          </div>
          <IconBtn name="x" onClick={close} title="Close" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="font-display text-[24px] font-bold tracking-tight text-ink">{money(d.value)}</span>
          <Pill color={sm.color} tint={sm.tint} dot>{sm.label}</Pill>
          {d.close < TODAY && !['won', 'lost'].includes(d.stage) && <Pill color="#c2483b" tint="#f8e6e2">past due</Pill>}
        </div>
        {/* stage stepper */}
        <div className="mt-4">
          <p className="mb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Move stage — automation fires on Proposal</p>
          <div className="flex gap-1">
            {STAGES.map(st => (
              <button key={st.id} onClick={() => a.moveDeal(d.id, st.id)} title={st.label}
                className={cx('h-8 flex-1 rounded-md border text-[10px] font-bold transition-all active:scale-95',
                  d.stage === st.id ? 'text-card shadow-sm' : 'border-line bg-card text-mut hover:border-line2 hover:text-ink2')}
                style={d.stage === st.id ? { background: st.color, borderColor: st.color } : undefined}>
                {st.label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value (USD)">
            <input type="number" defaultValue={d.value} key={d.value}
              onBlur={e => { const v = Number(e.target.value); if (!Number.isNaN(v) && v !== d.value) { a.patchDeal(d.id, { value: v }); a.toast('Deal value updated'); } }}
              className={inputCls} />
          </Field>
          <Field label="Expected close">
            <input type="date" defaultValue={d.close} key={d.close}
              onBlur={e => { if (e.target.value && e.target.value !== d.close) { a.patchDeal(d.id, { close: e.target.value }); a.toast('Close date updated'); } }}
              className={inputCls} />
          </Field>
          <Field label="Owner">
            <select defaultValue={d.owner} onChange={e => { a.patchDeal(d.id, { owner: e.target.value }); a.toast(`Assigned to ${e.target.value}`); }} className={inputCls}>
              {s.users.filter(u => u.role !== 'viewer').map(u => <option key={u.id}>{u.name}</option>)}
            </select>
          </Field>
          <Field label="Contact">
            {c ? (
              <button onClick={() => a.openContact(c.id)} className="flex w-full items-center gap-2 rounded-lg border border-line bg-card px-3 py-2 text-left transition hover:border-moss/50 hover:bg-mint/40">
                <Avatar name={c.name} size={22} />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{c.name}</span>
                <Icon name="external" size={12} className="text-mut" />
              </button>
            ) : <p className="text-xs text-faint">—</p>}
          </Field>
        </div>

        <div>
          <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-mut">Notes · {d.notes.length}</h3>
          <div className="rounded-lg border border-line bg-card p-2">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Add a note — negotiation points, next steps…"
              className="w-full resize-none bg-transparent text-xs outline-none placeholder:text-faint" />
            <div className="flex justify-end">
              <Btn size="sm" onClick={() => {
                if (!note.trim()) return;
                a.patchDeal(d.id, { notes: [{ id: uid(), text: note.trim(), at: isoOf(new Date()), by: 'Maya Chen' }, ...d.notes] });
                setNote('');
                a.toast('Note added');
              }}>Add note</Btn>
            </div>
          </div>
          <div className="mt-2 space-y-2">
            {d.notes.map(n => (
              <div key={n.id} className="anim-rise rounded-lg border border-line bg-paper/70 px-3 py-2.5">
                <p className="text-xs leading-relaxed text-ink2">{n.text}</p>
                <p className="mt-1.5 font-mono text-[10px] text-faint">{n.by} · {relTime(n.at)}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="border-t border-line pt-3 font-mono text-[10px] text-faint">Created {relTime(d.created)} · linked tasks auto-create when moved to Proposal</p>
      </div>
    </Drawer>
  );
}

export function Deals() {
  const { s, a } = useApp();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [addOpen, setAddOpen] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Stage | null>(null);

  useEffect(() => {
    if (s.create === 'deal') { setAddOpen(true); a.ui({ create: null }); }
  }, [s.create, a]);

  const open = s.deals.filter(d => !['won', 'lost'].includes(d.stage));
  const pipeline = open.reduce((x, d) => x + d.value, 0);
  const wonSum = s.deals.filter(d => d.stage === 'won').reduce((x, d) => x + d.value, 0);

  const byStage = useMemo(() => {
    const m = new Map<Stage, Deal[]>();
    STAGES.forEach(st => m.set(st.id, []));
    s.deals.forEach(d => m.get(d.stage)?.push(d));
    return m;
  }, [s.deals]);

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-5">
          <div>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Open pipeline</p>
            <p className="font-display text-[21px] font-bold leading-tight tracking-tight text-ink">{money(pipeline)}</p>
          </div>
          <div className="h-8 w-px bg-line" />
          <div>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Closed won</p>
            <p className="font-display text-[21px] font-bold leading-tight tracking-tight text-moss">{money(wonSum)}</p>
          </div>
          <div className="hidden h-8 w-px bg-line sm:block" />
          <div className="hidden sm:block">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Open deals</p>
            <p className="font-display text-[21px] font-bold leading-tight tracking-tight text-ink">{open.length}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Seg options={[{ id: 'board', label: 'Board' }, { id: 'list', label: 'List' }]} value={view} onChange={setView} />
          <Btn onClick={() => setAddOpen(true)}><Icon name="plus" size={14} sw={2.4} /> New deal</Btn>
        </div>
      </div>

      {view === 'board' ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
          <div className="flex min-w-max gap-3">
            {STAGES.map(st => {
              const deals = byStage.get(st.id) ?? [];
              const total = deals.reduce((x, d) => x + d.value, 0);
              return (
                <div key={st.id}
                  onDragOver={e => { e.preventDefault(); setOverCol(st.id); }}
                  onDragLeave={() => setOverCol(c => (c === st.id ? null : c))}
                  onDrop={e => {
                    e.preventDefault();
                    const id = e.dataTransfer.getData('text/deal') || dragId;
                    if (id) a.moveDeal(id, st.id);
                    setOverCol(null); setDragId(null);
                  }}
                  className={cx('flex w-[248px] shrink-0 flex-col rounded-xl border bg-paper/70 transition-all',
                    overCol === st.id ? 'border-moss bg-mint/50 ring-2 ring-moss/20' : 'border-line')}>
                  <div className="flex items-center gap-2 px-3 pb-1.5 pt-3">
                    <span className="h-2.5 w-2.5 rounded-[4px]" style={{ background: st.color }} />
                    <span className="text-xs font-bold text-ink">{st.label}</span>
                    <span className="font-mono text-[10px] font-semibold text-mut">{deals.length}</span>
                    <span className="ml-auto font-mono text-[10.5px] font-bold text-ink2">${(total / 1000).toFixed(1)}K</span>
                  </div>
                  <div className="flex-1 space-y-2 overflow-y-auto p-2 pt-1" style={{ minHeight: 120, maxHeight: 'calc(100vh - 268px)' }}>
                    {deals.map(d => {
                      const c = s.contacts.find(x => x.id === d.contactId);
                      const overdue = d.close < TODAY && !['won', 'lost'].includes(d.stage);
                      return (
                        <div key={d.id}
                          draggable
                          onDragStart={e => { e.dataTransfer.setData('text/deal', d.id); e.dataTransfer.effectAllowed = 'move'; setDragId(d.id); }}
                          onDragEnd={() => { setDragId(null); setOverCol(null); }}
                          onClick={() => a.ui({ dealId: d.id })}
                          className={cx('cursor-grab rounded-lg border border-line bg-card p-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-line2 hover:shadow-lift active:cursor-grabbing',
                            dragId === d.id && 'drag-ghost rotate-1')}>
                          <p className="text-xs font-semibold leading-snug text-ink">{d.name}</p>
                          <p className="mt-1 font-mono text-[13px] font-bold text-ink2">{money(d.value)}</p>
                          <div className="mt-2 flex items-center gap-1.5 border-t border-line pt-2">
                            {c && <><Avatar name={c.name} size={18} /><span className="min-w-0 flex-1 truncate text-[10.5px] text-mut">{c.name}</span></>}
                            <span className={cx('flex items-center gap-1 font-mono text-[9.5px]', overdue ? 'font-bold text-danger' : 'text-faint')}>
                              <Icon name="clock" size={10} />{fmtDate(d.close)}
                            </span>
                            <Avatar name={d.owner} size={18} />
                          </div>
                        </div>
                      );
                    })}
                    {deals.length === 0 && (
                      <div className="grid place-items-center rounded-lg border border-dashed border-line2 py-6 text-[10.5px] text-faint">
                        Drop a deal here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line bg-paper/70">
                  {['Deal', 'Contact', 'Stage', 'Value', 'Owner', 'Close'].map(h => (
                    <th key={h} className="px-4 py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.deals.map(d => {
                  const c = s.contacts.find(x => x.id === d.contactId);
                  const sm = stageMeta(d.stage);
                  return (
                    <tr key={d.id} className="cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-mint/35" onClick={() => a.ui({ dealId: d.id })}>
                      <td className="px-4 py-2.5 text-xs font-semibold text-ink">{d.name}</td>
                      <td className="px-4 py-2.5">
                        {c && <span className="flex items-center gap-1.5 text-xs text-ink2"><Avatar name={c.name} size={20} />{c.name}</span>}
                      </td>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <select value={d.stage} onChange={e => a.moveDeal(d.id, e.target.value as Stage)}
                          className="rounded-full border-0 py-1 pl-2.5 pr-7 text-[11px] font-semibold outline-none ring-1 ring-inset ring-transparent transition focus:ring-moss"
                          style={{ color: sm.color, background: sm.tint }}>
                          {STAGES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11.5px] font-bold text-ink">{money(d.value)}</td>
                      <td className="px-4 py-2.5"><Avatar name={d.owner} size={22} /></td>
                      <td className={cx('px-4 py-2.5 font-mono text-[11px]', d.close < TODAY && !['won', 'lost'].includes(d.stage) ? 'font-bold text-danger' : 'text-mut')}>{fmtDate(d.close)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <Icon name="bolt" size={12} className="text-moss" />
        Automation: when a deal moves to <span className="font-semibold text-ink2">Proposal</span>, a "Send contract" task is created automatically.
      </p>

      <AddDealModal open={addOpen} onClose={() => setAddOpen(false)} />
      <DealDrawer />
    </div>
  );
}
