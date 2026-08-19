import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { TAG_OPTIONS } from '../data';
import { addDays, cx, Icon, isoOf, money, relTime, uid } from '../meta';
import type { Contact, Source } from '../types';
import { Avatar, Btn, Card, Drawer, Field, IconBtn, inputCls, Modal, Pill, Tag } from '../components/ui';

const ACT_ICON: Record<string, string> = { email: 'mail', call: 'phone', meeting: 'video', note: 'file', form: 'layout', social: 'message', deal: 'kanban' };
const SOURCE_META: Record<Source, { color: string; tint: string }> = {
  Form: { color: '#3e7cb1', tint: '#e5eef6' },
  Import: { color: '#7a5fa8', tint: '#efeaf6' },
  Social: { color: '#0e7a52', tint: '#e2efe7' },
  Manual: { color: '#6e776f', tint: '#eceee7' },
  Webinar: { color: '#a96f14', tint: '#f7ecd6' },
  Chat: { color: '#2f8f83', tint: '#e1f0ee' },
};

const IMPORTED: Array<Omit<Contact, 'id' | 'createdAt' | 'lastActivity' | 'timeline'>> = [
  { name: 'Harriet Boone', email: 'harriet@cascadeprovisions.com', company: 'Cascade Provisions', title: 'Purchasing Lead', source: 'Import', tags: ['wholesale'], owner: 'Maya Chen', phone: '+1 (503) 555-0195' },
  { name: 'Leo Martins', email: 'leo@driftwoodcafe.pt', company: 'Driftwood Café', title: 'Owner', source: 'Import', tags: ['lead'], owner: 'Jonas Berg' },
  { name: 'Yuki Tanaka', email: 'yuki@kissaroasters.jp', company: 'Kissa Roasters', title: 'Head Buyer', source: 'Import', tags: ['wholesale', 'partner'], owner: 'Priya Nair' },
];

function makeImported(): Contact[] {
  const today = isoOf(new Date());
  return IMPORTED.map(c => ({
    ...c, id: uid(), createdAt: today, lastActivity: today,
    timeline: [{ id: uid(), type: 'note' as const, text: 'Imported from HubSpot — properties auto-mapped', at: today }],
  }));
}

/* ---------------- import modal ---------------- */
function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { a } = useApp();
  const [tab, setTab] = useState<'hubspot' | 'csv'>('hubspot');
  const [key, setKey] = useState('');
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const timer = useRef<number | null>(null);

  const steps = tab === 'hubspot'
    ? ['Connecting to HubSpot', 'Pulling contacts (up to 50K)', 'Pulling companies & deals', 'Mapping properties → Cadence fields', 'Writing to unified database']
    : ['Reading CSV', 'Detecting columns', 'Mapping to contact fields', 'Writing to unified database'];

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const start = () => {
    setRunning(true);
    setStep(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        if (timer.current) window.clearInterval(timer.current);
        a.importContacts(makeImported());
        setRunning(false);
        onClose();
      } else setStep(i);
    }, 620);
  };

  return (
    <Modal open={open} onClose={onClose} title="Import contacts" sub="One-click from HubSpot, or any CSV. Duplicates are merged by email." w="max-w-md">
      <div className="mb-4 flex gap-1.5">
        {(['hubspot', 'csv'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setStep(0); }}
            className={cx('flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition',
              tab === t ? 'border-moss bg-mint/60 text-pine' : 'border-line bg-card text-mut hover:border-line2')}>
            {t === 'hubspot' ? 'One-click HubSpot' : 'CSV upload'}
          </button>
        ))}
      </div>

      {tab === 'hubspot' ? (
        <div className="space-y-3">
          <Field label="HubSpot private app key" hint="pat-na1-…" req>
            <input className={inputCls} value={key} onChange={e => setKey(e.target.value)} placeholder="pat-na1-1a2b3c4d-…" />
          </Field>
          <p className="rounded-lg bg-paper px-3 py-2 text-[11px] leading-relaxed text-mut">
            We pull <span className="font-semibold text-ink2">contacts, companies, deals, lists and email templates</span>, auto-map properties to Cadence fields and show a preview. Under 10 minutes for 50K contacts.
          </p>
        </div>
      ) : (
        <button onClick={() => !running && start()}
          className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-line2 bg-paper/60 px-4 py-7 transition hover:border-moss hover:bg-mint/40">
          <Icon name="upload" size={22} className="text-mut" />
          <p className="text-xs font-semibold text-ink2">Drop contacts.csv here or click to browse</p>
          <p className="font-mono text-[10px] text-faint">name, email, company, title, tags…</p>
        </button>
      )}

      {running && (
        <div className="mt-4 space-y-2 rounded-lg border border-line bg-paper/70 p-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-moss transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          <div className="space-y-1">
            {steps.map((st, i) => (
              <p key={st} className={cx('flex items-center gap-2 text-[11px]', i < step ? 'text-moss' : i === step ? 'font-semibold text-ink' : 'text-faint')}>
                {i < step ? <Icon name="check" size={11} sw={3} /> : i === step ? <span className="live-dot h-1.5 w-1.5 rounded-full bg-amber" /> : <span className="h-1.5 w-1.5 rounded-full bg-line2" />}
                {st}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        {tab === 'hubspot' && (
          <Btn onClick={start} disabled={running || key.trim().length < 6}>
            <Icon name="download" size={14} /> {running ? 'Importing…' : 'Start import'}
          </Btn>
        )}
      </div>
    </Modal>
  );
}

/* ---------------- add contact modal ---------------- */
function AddContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, a } = useApp();
  const [f, setF] = useState({ name: '', email: '', company: '', title: '', source: 'Manual' as Source, tags: '', owner: 'Maya Chen' });
  const [err, setErr] = useState('');

  const submit = () => {
    if (!f.name.trim() || !f.email.includes('@')) { setErr('Name and a valid email are required.'); return; }
    a.addContact({
      name: f.name.trim(), email: f.email.trim(), company: f.company.trim() || '—', title: f.title.trim() || '—',
      source: f.source, tags: f.tags.split(',').map(t => t.trim()).filter(Boolean), owner: f.owner,
    });
    setF({ name: '', email: '', company: '', title: '', source: 'Manual', tags: '', owner: 'Maya Chen' });
    setErr('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New contact" sub="People and companies live in one unified database." w="max-w-md"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={submit}><Icon name="plus" size={14} /> Add contact</Btn></>}>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Full name" req><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Ada Quist" /></Field></div>
        <div className="col-span-2"><Field label="Email" req><input className={inputCls} value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="ada@company.com" /></Field></div>
        <Field label="Company">
          <input className={inputCls} list="cos" value={f.company} onChange={e => setF({ ...f, company: e.target.value })} placeholder="Company" />
          <datalist id="cos">{s.companies.map(c => <option key={c.id} value={c.name} />)}</datalist>
        </Field>
        <Field label="Job title"><input className={inputCls} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Head Buyer" /></Field>
        <Field label="Source">
          <select className={inputCls} value={f.source} onChange={e => setF({ ...f, source: e.target.value as Source })}>
            {Object.keys(SOURCE_META).map(so => <option key={so}>{so}</option>)}
          </select>
        </Field>
        <Field label="Owner">
          <select className={inputCls} value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })}>
            {s.users.map(u => <option key={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <div className="col-span-2"><Field label="Tags" hint="comma separated"><input className={inputCls} value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} placeholder="wholesale, vip" /></Field></div>
      </div>
      {err && <p className="anim-shake mt-3 rounded-lg bg-dangerbg px-3 py-2 text-xs font-medium text-danger">{err}</p>}
    </Modal>
  );
}

/* ---------------- contact drawer ---------------- */
function ContactDrawer() {
  const { s, a } = useApp();
  const c = s.contacts.find(x => x.id === s.contactId) ?? null;
  const [tagIn, setTagIn] = useState('');
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  if (!c) return null;

  const deals = s.deals.filter(d => d.contactId === c.id);
  const close = () => a.ui({ contactId: null });

  const quick = (type: 'call' | 'email' | 'note', text: string) => {
    a.logActivity(c.id, type, text);
    a.toast(type === 'call' ? 'Call logged to timeline' : type === 'email' ? 'Email logged to timeline' : 'Note added');
  };

  return (
    <Drawer open onClose={close}>
      <div className="border-b border-line bg-paper/60 px-5 py-4">
        <div className="flex items-start gap-3.5">
          <Avatar name={c.name} size={46} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[19px] font-bold tracking-tight text-ink">{c.name}</h2>
              {c.fromSocial && <Pill color="#0e7a52" tint="#e2efe7"><Icon name="bolt" size={10} /> from social</Pill>}
            </div>
            <p className="text-xs text-mut">{c.title} · {c.company}</p>
          </div>
          <IconBtn name="x" onClick={close} title="Close" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
          <span className="flex items-center gap-1.5 text-ink2 truncate"><Icon name="mail" size={13} className="text-mut" />{c.email}</span>
          <span className="flex items-center gap-1.5 text-ink2"><Icon name="phone" size={13} className="text-mut" />{c.phone ?? '—'}</span>
          <span className="flex items-center gap-1.5 text-ink2"><Icon name="tag" size={13} className="text-mut" />{c.source}</span>
          <span className="flex items-center gap-1.5 text-ink2"><Icon name="users" size={13} className="text-mut" />{c.owner}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {c.tags.map(t => (
            <Tag key={t} onX={() => a.patchContact(c.id, { tags: c.tags.filter(x => x !== t) })}>{t}</Tag>
          ))}
          <input value={tagIn} onChange={e => setTagIn(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && tagIn.trim()) {
                a.patchContact(c.id, { tags: Array.from(new Set([...c.tags, tagIn.trim()])) });
                setTagIn('');
              }
            }}
            placeholder="+ tag" list="tagopts"
            className="w-16 rounded-md border border-dashed border-line2 bg-transparent px-1.5 py-[2px] font-mono text-[10.5px] outline-none focus:border-moss" />
          <datalist id="tagopts">{TAG_OPTIONS.map(t => <option key={t} value={t} />)}</datalist>
        </div>
        <div className="mt-4 flex gap-2">
          <Btn size="sm" variant="outline" onClick={() => quick('call', 'Call logged — 6 min')}><Icon name="phone" size={13} /> Log call</Btn>
          <Btn size="sm" variant="outline" onClick={() => quick('email', 'Email sent — "Checking in on the proposal"')}><Icon name="mail" size={13} /> Log email</Btn>
          <Btn size="sm" variant="outline" onClick={() => setNoteOpen(o => !o)}><Icon name="file" size={13} /> Note</Btn>
        </div>
        {noteOpen && (
          <div className="anim-rise mt-2.5 rounded-lg border border-line bg-card p-2">
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Write a note for the timeline…"
              className="w-full resize-none bg-transparent text-xs outline-none placeholder:text-faint" />
            <div className="flex justify-end">
              <Btn size="sm" onClick={() => { if (note.trim()) { quick('note', `Note — ${note.trim()}`); setNote(''); setNoteOpen(false); } }}>Save note</Btn>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5 px-5 py-4">
        {deals.length > 0 && (
          <div>
            <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-mut">Deals · {deals.length}</h3>
            <div className="space-y-1.5">
              {deals.map(d => (
                <button key={d.id} onClick={() => a.openDeal(d.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2 text-left transition hover:border-moss/50 hover:bg-mint/40">
                  <Icon name="kanban" size={14} className="text-mut" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{d.name}</span>
                  <span className="font-mono text-[11px] font-bold text-ink2">{money(d.value)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-mut">Timeline · every touchpoint</h3>
          <div className="relative space-y-0.5 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-line">
            {c.timeline.map(t => (
              <div key={t.id} className="relative flex items-start gap-3 rounded-lg px-0.5 py-2 transition hover:bg-paper/80">
                <span className="relative z-10 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-line bg-card text-mut">
                  <Icon name={ACT_ICON[t.type]} size={12} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug text-ink2">{t.text}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-faint">{relTime(t.at)} · {t.at}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="border-t border-line pt-3 font-mono text-[10px] text-faint">Contact since {c.createdAt} · last activity {relTime(c.lastActivity)}</p>
      </div>
    </Drawer>
  );
}

/* ---------------- main ---------------- */
export function Contacts() {
  const { s, a } = useApp();
  const [q, setQ] = useState('');
  const [src, setSrc] = useState<'all' | Source>('all');
  const [tag, setTag] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    if (s.create === 'contact') { setAddOpen(true); a.ui({ create: null }); }
  }, [s.create, a]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    s.contacts.forEach(c => c.tags.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((x, y) => y[1] - x[1]).slice(0, 6);
  }, [s.contacts]);

  const rows = useMemo(() => s.contacts.filter(c => {
    const t = q.trim().toLowerCase();
    if (t && !(c.name + c.company + c.email + c.title).toLowerCase().includes(t)) return false;
    if (src !== 'all' && c.source !== src) return false;
    if (tag && !c.tags.includes(tag)) return false;
    return true;
  }), [s.contacts, q, src, tag]);

  const exportCsv = () => {
    const head = 'name,email,phone,company,title,source,tags,owner,created';
    const body = rows.map(c => [c.name, c.email, c.phone ?? '', c.company, c.title, c.source, c.tags.join('|'), c.owner, c.createdAt]
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([head + '\n' + body], { type: 'text/csv' }));
    const el = document.createElement('a');
    el.href = url; el.download = 'cadence-contacts.csv'; el.click();
    URL.revokeObjectURL(url);
    a.toast(`Exported ${rows.length} contacts to CSV`);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search people…"
            className="h-9 w-[220px] rounded-lg border border-line bg-card pl-8 pr-3 text-[13px] outline-none transition placeholder:text-faint focus:border-moss focus:ring-2 focus:ring-moss/15" />
        </div>
        <select value={src} onChange={e => setSrc(e.target.value as 'all' | Source)}
          className="h-9 rounded-lg border border-line bg-card px-2.5 text-xs font-medium text-ink2 outline-none focus:border-moss">
          <option value="all">All sources</option>
          {Object.keys(SOURCE_META).map(so => <option key={so}>{so}</option>)}
        </select>
        <div className="flex flex-wrap items-center gap-1">
          {topTags.map(([t, n]) => (
            <button key={t} onClick={() => setTag(tag === t ? null : t)}
              className={cx('rounded-full border px-2 py-1 font-mono text-[10.5px] font-medium transition',
                tag === t ? 'border-moss bg-mint text-pine' : 'border-line bg-card text-mut hover:border-line2 hover:text-ink2')}>
              {t} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Btn variant="outline" size="md" onClick={exportCsv}><Icon name="download" size={14} /> Export</Btn>
          <Btn variant="outline" onClick={() => setImportOpen(true)}><Icon name="upload" size={14} /> Import</Btn>
          <Btn onClick={() => setAddOpen(true)}><Icon name="plus" size={14} sw={2.4} /> Add contact</Btn>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-paper/70">
                {['Contact', 'Company', 'Source', 'Tags', 'Deals', 'Last activity', 'Owner'].map(h => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const deals = s.deals.filter(d => d.contactId === c.id);
                return (
                  <tr key={c.id} onClick={() => a.ui({ contactId: c.id })}
                    className="cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-mint/35">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={c.name} size={30} />
                        <div className="leading-tight">
                          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                            {c.name}
                            {c.fromSocial && <span title="Auto-created from a social comment"><Icon name="bolt" size={11} className="text-moss" /></span>}
                          </p>
                          <p className="text-[10.5px] text-faint">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-medium text-ink2">{c.company}</p>
                      <p className="text-[10.5px] text-faint">{c.title}</p>
                    </td>
                    <td className="px-4 py-2.5"><Pill color={SOURCE_META[c.source].color} tint={SOURCE_META[c.source].tint}>{c.source}</Pill></td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {c.tags.slice(0, 2).map(t => <Tag key={t}>{t}</Tag>)}
                        {c.tags.length > 2 && <span className="font-mono text-[10px] text-faint">+{c.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {deals.length ? (
                        <span className="font-mono text-[11.5px] font-bold text-ink">{deals.length} · {money(deals.reduce((x, d) => x + d.value, 0))}</span>
                      ) : <span className="text-[11px] text-faint">—</span>}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-mut">{relTime(c.lastActivity)}</td>
                    <td className="px-4 py-2.5"><Avatar name={c.owner} size={24} /></td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-mut">No contacts match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-line bg-paper/60 px-4 py-2.5">
          <p className="font-mono text-[10.5px] text-mut">{rows.length} of {s.contacts.length} contacts · unlimited on every plan</p>
          <p className="hidden items-center gap-1.5 text-[10.5px] text-faint sm:flex"><Icon name="bolt" size={11} className="text-moss" /> social commenters are added automatically</p>
        </div>
      </Card>

      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <ContactDrawer />
    </div>
  );
}
