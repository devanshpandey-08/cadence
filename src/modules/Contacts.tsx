import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp, useCanEdit } from '../store';
import { toCsv } from '../services/csv';
import { TAG_OPTIONS } from '../data';
import { addDays, cx, Icon, isoOf, money, relTime, TODAY, uid } from '../meta';
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

/** Deterministic engagement score (0–100) — the same model AI Studio surfaces. */
export function contactScore(c: Contact, deals: { contactId: string; stage: string; value: number }[], today: string): number {
  let sc = 20;
  if (c.source === 'Form') sc += 15;
  if (c.source === 'Social') sc += 10;
  const won = deals.filter(d => d.contactId === c.id && d.stage === 'won');
  sc += Math.min(25, won.length * 15);
  sc += Math.min(15, deals.filter(d => d.contactId === c.id && !['won', 'lost'].includes(d.stage)).length * 8);
  const days = Math.round((new Date(today + 'T00:00:00').getTime() - new Date(c.lastActivity + 'T00:00:00').getTime()) / 864e5);
  sc += Math.max(0, 20 - days);
  if (c.tags.includes('vip')) sc += 10;
  return Math.min(100, Math.max(0, Math.round(sc)));
}
const BAND = (sc: number) => sc >= 70 ? { label: 'Hot', color: '#e5484d', tint: '#ffe0df' } : sc >= 45 ? { label: 'Warm', color: '#e86a17', tint: '#ffe9d4' } : { label: 'Nurture', color: '#3d6bff', tint: '#e3eaff' };

type SmartView = 'all' | 'hot' | 'stalled' | 'new' | 'vip';

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
  const [gdprOpen, setGdprOpen] = useState(false);
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

        {/* communication preferences + GDPR */}
        <div className="mt-4 rounded-lg border border-line bg-card p-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Consent · GDPR / CCPA</p>
            <span className="font-mono text-[9px] text-faint">{c.gdprConsentAt ? `consented ${c.gdprConsentAt}` : 'no audit trail'}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">
            {([['email', 'Email'], ['sms', 'SMS'], ['phone', 'Phone']] as const).map(([k, label]) => {
              const prefs = c.prefs ?? { email: true, sms: true, phone: true };
              return (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-[11.5px] font-medium text-ink2">
                  <input type="checkbox" checked={prefs[k]}
                    onChange={e => {
                      a.patchContact(c.id, { prefs: { ...prefs, [k]: e.target.checked }, gdprConsentAt: isoOf(new Date()) });
                      a.toast(`${label} ${e.target.checked ? 'opted in' : 'opted out'} — suppression lists updated`, 'info');
                    }}
                    className="h-3.5 w-3.5 accent-[#0b7a55]" />
                  {label}
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2 border-t border-line pt-2.5">
            <Btn size="sm" variant="ghost" onClick={() => setGdprOpen(true)}><Icon name="shield" size={12} /> GDPR tools</Btn>
            <span className="ml-auto font-mono text-[9px] text-faint">suppressed channels are skipped on every send</span>
          </div>
        </div>
        {gdprOpen && (
          <Modal open onClose={() => setGdprOpen(false)} title="GDPR tools" sub={`${c.name} · right to access, portability & erasure`} w="max-w-sm"
            footer={<Btn variant="ghost" onClick={() => setGdprOpen(false)}>Close</Btn>}>
            <div className="space-y-2">
              <Btn variant="outline" className="w-full" onClick={() => {
                const csv = toCsv(['field', 'value'], [['name', c.name], ['email', c.email], ['phone', c.phone ?? ''], ['company', c.company], ['tags', c.tags.join('|')]]);
                const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
                const el = document.createElement('a'); el.href = url; el.download = `${c.name.replace(/\s+/g, '-').toLowerCase()}-data.csv`; el.click();
                URL.revokeObjectURL(url);
                a.toast('Data exported — right to portability fulfilled');
                setGdprOpen(false);
              }}><Icon name="download" size={13} /> Export all data</Btn>
              <Btn variant="outline" className="w-full" onClick={() => {
                a.patchContact(c.id, { name: 'Anonymized User', email: `anon-${c.id.slice(0, 6)}@erased.local`, phone: undefined, anonymized: true, tags: [], gdprConsentAt: isoOf(new Date()) });
                a.logActivity(c.id, 'note', 'GDPR anonymization processed — PII scrubbed');
                a.toast('Contact anonymized — PII scrubbed, record kept for audit', 'warning');
                setGdprOpen(false); close();
              }}><Icon name="eye" size={13} /> Anonymize (keep record)</Btn>
              <Btn variant="danger" className="w-full" onClick={() => { a.removeContact(c.id); setGdprOpen(false); close(); }}>
                <Icon name="trash" size={13} /> Erase completely
              </Btn>
            </div>
          </Modal>
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
  const can = useCanEdit();
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<SmartView>('all');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkTag, setBulkTag] = useState('');
  const [gdprTarget, setGdprTarget] = useState<string | null>(null);

  useEffect(() => {
    if (s.create === 'contact') { setAddOpen(true); a.ui({ create: null }); }
  }, [s.create, a]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    s.contacts.forEach(c => c.tags.forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)));
    return Array.from(counts.entries()).sort((x, y) => y[1] - x[1]).slice(0, 6);
  }, [s.contacts]);

  const today = TODAY;
  const rows = useMemo(() => s.contacts.filter(c => {
    const t = q.trim().toLowerCase();
    if (t && !(c.name + c.company + c.email + c.title).toLowerCase().includes(t)) return false;
    if (src !== 'all' && c.source !== src) return false;
    if (tag && !c.tags.includes(tag)) return false;
    if (c.anonymized) return false; // erased contacts never surface
    if (view === 'hot' && contactScore(c, s.deals, today) < 70) return false;
    if (view === 'vip' && !c.tags.includes('vip')) return false;
    if (view === 'new') {
      const days = Math.round((new Date(today + 'T00:00:00').getTime() - new Date(c.createdAt + 'T00:00:00').getTime()) / 864e5);
      if (days > 7) return false;
    }
    if (view === 'stalled') {
      const days = Math.round((new Date(today + 'T00:00:00').getTime() - new Date(c.lastActivity + 'T00:00:00').getTime()) / 864e5);
      if (days < 14) return false;
    }
    return true;
  }), [s.contacts, q, src, tag, view, s.deals, today]);

  /* ---------- bulk actions ---------- */
  const toggleSel = (id: string) => setSel(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const bulk = {
    addTag: () => {
      if (!bulkTag.trim()) return;
      [...sel].forEach(id => { const c = s.contacts.find(x => x.id === id); if (c) a.patchContact(id, { tags: Array.from(new Set([...c.tags, bulkTag.trim()])) }); });
      a.toast(`Tagged ${sel.size} contacts with "${bulkTag.trim()}"`);
      setBulkTag(''); setSel(new Set());
    },
    assign: (owner: string) => {
      [...sel].forEach(id => a.patchContact(id, { owner }));
      a.toast(`Reassigned ${sel.size} contacts to ${owner}`);
      setSel(new Set());
    },
    del: () => {
      [...sel].forEach(id => a.removeContact(id));
      a.toast(`Deleted ${sel.size} contacts`, 'warning');
      setSel(new Set());
    },
    export: () => {
      const list = s.contacts.filter(c => sel.has(c.id));
      const csv = toCsv(['name', 'email', 'phone', 'company', 'title', 'source', 'tags', 'owner', 'created'],
        list.map(c => [c.name, c.email, c.phone ?? '', c.company, c.title, c.source, c.tags.join('|'), c.owner, c.createdAt]));
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const el = document.createElement('a'); el.href = url; el.download = 'cadence-selection.csv'; el.click();
      URL.revokeObjectURL(url);
      a.toast(`Exported ${list.length} selected contacts`);
    },
  };

  const exportCsv = () => {
    const csv = toCsv(
      ['name', 'email', 'phone', 'company', 'title', 'source', 'tags', 'owner', 'created'],
      rows.map(c => [c.name, c.email, c.phone ?? '', c.company, c.title, c.source, c.tags.join('|'), c.owner, c.createdAt]),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const el = document.createElement('a');
    el.href = url; el.download = 'cadence-contacts.csv'; el.click();
    URL.revokeObjectURL(url);
    a.toast(`Exported ${rows.length} contacts to CSV`);
  };

  const VIEWS: { id: SmartView; label: string }[] = [
    { id: 'all', label: 'All' }, { id: 'hot', label: '🔥 Hot' }, { id: 'new', label: 'New · 7d' }, { id: 'stalled', label: 'Stalled · 14d+' }, { id: 'vip', label: 'VIP' },
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => setView(v.id)}
            className={cx('rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all active:scale-95',
              view === v.id ? 'border-moss bg-moss text-night shadow-btn' : 'border-line bg-card text-mut hover:border-line2 hover:text-ink2')}>
            {v.label}
          </button>
        ))}
        <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-faint">saved segments</span>
      </div>

      {sel.size > 0 && (
        <div className="anim-rise flex flex-wrap items-center gap-2 rounded-xl border border-moss/50 bg-mint/60 px-3.5 py-2.5">
          <span className="font-mono text-[11.5px] font-bold text-pine">{sel.size} selected</span>
          <div className="flex items-center gap-1.5">
            <input value={bulkTag} onChange={e => setBulkTag(e.target.value)} placeholder="tag…"
              className="h-7 w-24 rounded-md border border-line bg-card px-2 font-mono text-[10.5px] outline-none focus:border-moss" />
            <Btn size="sm" variant="outline" onClick={bulk.addTag}><Icon name="tag" size={12} /> Tag</Btn>
          </div>
          <select onChange={e => { if (e.target.value) bulk.assign(e.target.value); e.target.value = ''; }} defaultValue=""
            className="h-7 rounded-md border border-line bg-card px-2 text-[11px] font-medium outline-none">
            <option value="" disabled>Assign to…</option>
            {s.users.filter(u => u.role !== 'viewer').map(u => <option key={u.id}>{u.name}</option>)}
          </select>
          <Btn size="sm" variant="outline" onClick={bulk.export}><Icon name="download" size={12} /> Export</Btn>
          <Btn size="sm" variant="dangerGhost" onClick={bulk.del}><Icon name="trash" size={12} /> Delete</Btn>
          <button onClick={() => setSel(new Set())} className="ml-auto text-[11px] font-semibold text-mut transition hover:text-ink">Clear</button>
        </div>
      )}

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
          <Btn variant="outline" disabled={!can} onClick={() => setImportOpen(true)}><Icon name="upload" size={14} /> Import</Btn>
          <Btn disabled={!can} onClick={() => setAddOpen(true)}><Icon name="plus" size={14} sw={2.4} /> Add contact</Btn>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-paper/70">
                <th className="w-10 px-3 py-2.5">
                  <button onClick={() => setSel(sel.size === rows.length ? new Set() : new Set(rows.map(c => c.id)))}
                    className={cx('grid h-4 w-4 place-items-center rounded border transition', sel.size === rows.length && rows.length > 0 ? 'border-moss bg-moss text-night' : 'border-line2 bg-card')}
                    title="Select all">
                    {sel.size === rows.length && rows.length > 0 && <Icon name="check" size={10} sw={3.4} />}
                  </button>
                </th>
                {['Contact', 'Score', 'Company', 'Source', 'Tags', 'Deals', 'Last activity', 'Owner'].map(h => (
                  <th key={h} className="px-4 py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(c => {
                const deals = s.deals.filter(d => d.contactId === c.id);
                return (
                  <tr key={c.id} onClick={() => a.ui({ contactId: c.id })}
                    className={cx('cursor-pointer border-b border-line/70 transition last:border-0 hover:bg-mint/35', sel.has(c.id) && 'bg-mint/40')}>
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleSel(c.id)}
                        className={cx('grid h-4 w-4 place-items-center rounded border transition', sel.has(c.id) ? 'border-moss bg-moss text-night' : 'border-line2 bg-card hover:border-moss')}>
                        {sel.has(c.id) && <Icon name="check" size={10} sw={3.4} />}
                      </button>
                    </td>
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
                      {(() => {
                        const sc = contactScore(c, s.deals, today);
                        const b = BAND(sc);
                        return <Pill color={b.color} tint={b.tint} className="tnum">{sc} · {b.label}</Pill>;
                      })()}
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
                <tr><td colSpan={9} className="px-4 py-10 text-center text-xs text-mut">No contacts match these filters.</td></tr>
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
