import { useState } from 'react';
import { useApp } from '../store';
import { addDays, cx, Icon, isoOf, kfmt, pct } from '../meta';
import type { FormDef, PageDef } from '../types';
import { Avatar, Btn, Card, Field, IconBtn, inputCls, Modal, Pill, SectionTitle, Seg, Toggle } from '../components/ui';

const FORM_TYPES = [
  { id: 'embedded', label: 'Embedded', desc: 'HTML snippet for any site', icon: 'layout' },
  { id: 'popup', label: 'Popup', desc: 'Time, scroll % or exit-intent triggers', icon: 'bolt' },
  { id: 'standalone', label: 'Standalone', desc: 'Hosted page with its own URL', icon: 'globe' },
] as const;

const PAGE_TEMPLATES: { id: PageDef['template']; label: string; desc: string }[] = [
  { id: 'squeeze', label: 'Squeeze page', desc: 'One offer, one form' },
  { id: 'webinar', label: 'Webinar', desc: 'Date, host, register' },
  { id: 'ebook', label: 'Ebook download', desc: 'Cover + gated form' },
  { id: 'demo', label: 'Demo request', desc: 'Calendar + form' },
  { id: 'thankyou', label: 'Thank you', desc: 'Next steps + share' },
];

function Wireframe({ t, small }: { t: PageDef['template']; small?: boolean }) {
  const b = 'rounded-[3px] bg-line2';
  const acc = 'rounded-[3px] bg-moss/60';
  return (
    <div className={cx('flex w-full flex-col gap-1 rounded-lg border border-line bg-card', small ? 'aspect-[16/10] p-2' : 'aspect-[4/3] p-3')}>
      <div className={cx(b, 'h-1.5 w-1/3')} />
      {t === 'squeeze' && <><div className={cx(b, 'mt-1 h-2.5 w-4/5')} /><div className={cx(b, 'h-1.5 w-2/3')} /><div className={cx(acc, 'mt-auto h-3 w-1/2')} /></>}
      {t === 'webinar' && <><div className="flex gap-1.5"><div className={cx(b, 'h-8 w-1/3')} /><div className="flex-1 space-y-1"><div className={cx(b, 'h-1.5 w-full')} /><div className={cx(b, 'h-1.5 w-2/3')} /></div></div><div className={cx(acc, 'mt-auto h-3 w-2/5')} /></>}
      {t === 'ebook' && <><div className="flex flex-1 gap-1.5"><div className={cx(b, 'h-full w-1/4')} /><div className="flex-1 space-y-1"><div className={cx(b, 'h-2 w-3/4')} /><div className={cx(b, 'h-1.5 w-full')} /><div className={cx(b, 'h-1.5 w-5/6')} /></div></div><div className={cx(acc, 'h-3 w-1/2')} /></>}
      {t === 'demo' && <><div className={cx(b, 'h-2 w-1/2')} /><div className="grid flex-1 grid-cols-2 gap-1"><div className={cx(b, 'h-full')} /><div className="space-y-1"><div className={cx(b, 'h-1.5 w-full')} /><div className={cx(b, 'h-1.5 w-full')} /><div className={cx(acc, 'h-2.5 w-2/3')} /></div></div></>}
      {t === 'thankyou' && <><div className="grid flex-1 place-items-center"><div className="grid h-6 w-6 place-items-center rounded-full bg-mint text-moss"><Icon name="check" size={13} sw={3} /></div></div><div className={cx(b, 'mx-auto h-1.5 w-1/2')} /></>}
    </div>
  );
}

function NewFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { a } = useApp();
  const [f, setF] = useState({ name: '', type: 'embedded' as FormDef['type'], template: 'Contact' });
  const [err, setErr] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="New form" sub="On submit → add to list → welcome email → notify owner → create deal." w="max-w-md"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => {
          if (!f.name.trim()) { setErr('Give the form a name.'); return; }
          a.addForm({ name: f.name.trim(), type: f.type, template: f.template });
          setF({ name: '', type: 'embedded', template: 'Contact' }); setErr(''); onClose();
        }}><Icon name="plus" size={14} /> Create form</Btn></>}>
      <div className="space-y-3">
        <Field label="Form name" req><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Wholesale inquiry" /></Field>
        <Field label="Type">
          <div className="grid grid-cols-3 gap-2">
            {FORM_TYPES.map(t => (
              <button key={t.id} onClick={() => setF({ ...f, type: t.id })}
                className={cx('rounded-lg border p-2.5 text-left transition', f.type === t.id ? 'border-moss bg-mint/60' : 'border-line bg-card hover:border-line2')}>
                <Icon name={t.icon} size={15} className={f.type === t.id ? 'text-moss' : 'text-mut'} />
                <p className="mt-1 text-[11.5px] font-bold text-ink">{t.label}</p>
                <p className="mt-0.5 text-[9.5px] leading-snug text-mut">{t.desc}</p>
              </button>
            ))}
          </div>
        </Field>
        <Field label="Template">
          <select className={inputCls} value={f.template} onChange={e => setF({ ...f, template: e.target.value })}>
            {['Blank', 'Contact', 'Newsletter', 'Demo request', 'Event RSVP'].map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        {err && <p className="anim-shake rounded-lg bg-dangerbg px-3 py-2 text-xs font-medium text-danger">{err}</p>}
      </div>
    </Modal>
  );
}

function NewPageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { a } = useApp();
  const [f, setF] = useState({ name: '', template: 'squeeze' as PageDef['template'] });
  const [err, setErr] = useState('');
  const slug = f.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return (
    <Modal open={open} onClose={onClose} title="New landing page" sub="Blocks: hero, text, image, form, CTA, testimonial, footer. SEO built in." w="max-w-md"
      footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => {
          if (!f.name.trim() || !slug) { setErr('Name the page — the slug writes itself.'); return; }
          a.addPage({ name: f.name.trim(), slug, template: f.template });
          setF({ name: '', template: 'squeeze' }); setErr(''); onClose();
        }}><Icon name="plus" size={14} /> Publish page</Btn></>}>
      <div className="space-y-3">
        <Field label="Page name" req><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Summer Cold Brew" /></Field>
        <p className="rounded-lg bg-paper px-3 py-2 font-mono text-[10.5px] text-mut">
          URL: <span className="font-semibold text-pine">{slug || 'slug'}.emberandoak.cadence.site</span> <span className="text-faint">· or CNAME your own domain</span>
        </p>
        <Field label="Template">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PAGE_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setF({ ...f, template: t.id })}
                className={cx('rounded-lg border p-1.5 text-left transition', f.template === t.id ? 'border-moss bg-mint/60 ring-1 ring-moss/30' : 'border-line bg-card hover:border-line2')}>
                <Wireframe t={t.id} small />
                <p className="mt-1.5 text-[10.5px] font-bold text-ink">{t.label}</p>
                <p className="text-[9px] text-mut">{t.desc}</p>
              </button>
            ))}
          </div>
        </Field>
        {err && <p className="anim-shake rounded-lg bg-dangerbg px-3 py-2 text-xs font-medium text-danger">{err}</p>}
      </div>
    </Modal>
  );
}

const SEED_EVENTS = [
  { id: 'ev1', name: 'Quick intro', dur: 15, round: false, buffer: 5, active: true },
  { id: 'ev2', name: 'Cupping consult', dur: 30, round: true, buffer: 10, active: true },
  { id: 'ev3', name: 'Wholesale walkthrough', dur: 60, round: true, buffer: 15, active: false },
];

const SEED_BOOKINGS = [
  { who: 'Ingrid Halvorsen', type: 'Wholesale walkthrough', when: `${isoOf(addDays(new Date(), 1))} · 10:00`, host: 'Maya Chen' },
  { who: 'Sofia Reyes', type: 'Cupping consult', when: `${isoOf(addDays(new Date(), 2))} · 14:30`, host: 'Round-robin → Priya' },
  { who: 'Ruth Adler', type: 'Quick intro', when: `${isoOf(addDays(new Date(), 4))} · 09:15`, host: 'Round-robin → Jonas' },
];

function BookingPanel() {
  const { a } = useApp();
  const [events, setEvents] = useState(SEED_EVENTS);
  const [google, setGoogle] = useState(true);
  const [outlook, setOutlook] = useState(false);

  const patchEvent = (id: string, p: Partial<(typeof SEED_EVENTS)[number]>) =>
    setEvents(ev => ev.map(e => (e.id === id ? { ...e, ...p } : e)));

  return (
    <div className="grid grid-cols-12 gap-3.5">
      <Card className="col-span-12 flex flex-wrap items-center gap-3 border-moss/30 bg-mint/40 p-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-moss text-card"><Icon name="calendar" size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-ink">Booking page · <span className="font-mono text-[11.5px] font-semibold text-pine">book.emberandoak.com/book</span></p>
          <p className="text-[11px] text-mut">Calendar booking with Google & Outlook sync (OAuth) · embed on landing pages and in email signatures.</p>
        </div>
        <Btn variant="outline" size="sm" onClick={() => { try { void navigator.clipboard.writeText('https://book.emberandoak.com/book'); } catch { /* noop */ } a.toast('Booking URL copied', 'info'); }}><Icon name="link" size={13} /> Copy URL</Btn>
        <Btn size="sm" onClick={() => { try { void navigator.clipboard.writeText('<a href="https://book.emberandoak.com/book">Book a cupping →</a>'); } catch { /* noop */ } a.toast('Embed snippet copied for signatures & pages', 'info'); }}><Icon name="copy" size={13} /> Copy embed</Btn>
      </Card>

      <div className="col-span-12 grid grid-cols-1 gap-3.5 lg:col-span-5">
        <Card className="p-4">
          <SectionTitle>Calendar sync</SectionTitle>
          {[
            { name: 'Google Calendar', user: 'maya@emberandoak.com', on: google, set: setGoogle },
            { name: 'Outlook Calendar', user: 'team@emberandoak.com', on: outlook, set: setOutlook },
          ].map(cal => (
            <div key={cal.name} className={cx('mb-2 flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition', cal.on ? 'border-line bg-paper/50' : 'border-dashed border-line2 bg-transparent')}>
              <span className={cx('grid h-8 w-8 place-items-center rounded-lg', cal.on ? 'bg-mint text-moss' : 'bg-paper text-faint')}><Icon name="refresh" size={14} /></span>
              <div className="flex-1 leading-tight">
                <p className="text-xs font-bold text-ink">{cal.name}</p>
                <p className="font-mono text-[9.5px] text-mut">{cal.on ? cal.user + ' · OAuth' : 'Not connected'}</p>
              </div>
              <Toggle on={cal.on} onChange={v => { cal.set(v); a.toast(v ? `${cal.name} synced via OAuth — busy slots blocked` : `${cal.name} disconnected`, v ? 'success' : 'warning'); }} />
            </div>
          ))}
          <p className="mt-1 text-[10.5px] leading-relaxed text-mut">Busy time is blocked automatically. Buffer time keeps back-to-back bookings from colliding.</p>
        </Card>

        <Card className="p-4">
          <SectionTitle right={<Pill color="#0e7a52" tint="#e2efe7" dot>{SEED_BOOKINGS.length} this week</Pill>}>Upcoming bookings</SectionTitle>
          <div className="space-y-1.5">
            {SEED_BOOKINGS.map(b => (
              <div key={b.who} className="flex items-center gap-2.5 rounded-lg border border-line bg-paper/50 px-2.5 py-2">
                <Avatar name={b.who} size={26} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[11.5px] font-bold text-ink">{b.who}</p>
                  <p className="truncate text-[10px] text-mut">{b.type}</p>
                </div>
                <div className="text-right leading-tight">
                  <p className="font-mono text-[9.5px] font-semibold text-ink2">{b.when}</p>
                  <p className="font-mono text-[8.5px] text-faint">{b.host}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="col-span-12 p-4 lg:col-span-7">
        <SectionTitle>Event types · fixed duration, round-robin, buffer time</SectionTitle>
        <div className="space-y-2.5">
          {events.map(ev => (
            <div key={ev.id} className={cx('rounded-xl border p-3 transition', ev.active ? 'border-line bg-card' : 'border-dashed border-line2 bg-paper/40')}>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={cx('grid h-9 w-9 place-items-center rounded-lg', ev.active ? 'bg-steelbg text-steel' : 'bg-paper text-faint')}><Icon name="video" size={15} /></span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className={cx('text-[13px] font-bold', ev.active ? 'text-ink' : 'text-mut')}>{ev.name}</p>
                  <p className="font-mono text-[9.5px] text-mut">/{ev.name.toLowerCase().replace(/\s+/g, '-')} · {ev.buffer} min buffer</p>
                </div>
                <Seg size="sm" value={String(ev.dur) as '15' | '30' | '60'}
                  onChange={v => { patchEvent(ev.id, { dur: Number(v) }); a.toast(`${ev.name} is now ${v} minutes`, 'info'); }}
                  options={[{ id: '15', label: '15m' }, { id: '30', label: '30m' }, { id: '60', label: '60m' }]} />
                <Toggle on={ev.active} onChange={v => { patchEvent(ev.id, { active: v }); a.toast(v ? `"${ev.name}" is bookable` : `"${ev.name}" hidden from the booking page`, v ? 'success' : 'warning'); }} />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
                <button onClick={() => { patchEvent(ev.id, { round: !ev.round }); a.toast(!ev.round ? `${ev.name} rotates through Maya → Jonas → Priya` : `${ev.name} assigned to you only`, 'info'); }}
                  className={cx('flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-bold transition',
                    ev.round ? 'border-moss/40 bg-mint text-pine' : 'border-line bg-card text-mut hover:border-line2')}>
                  <Icon name="refresh" size={11} /> Round-robin {ev.round ? 'on' : 'off'}
                </button>
                <select value={ev.buffer} onChange={e => { patchEvent(ev.id, { buffer: Number(e.target.value) }); a.toast(`Buffer set to ${e.target.value} min`, 'info'); }}
                  className="rounded-md border border-line bg-card px-1.5 py-1 font-mono text-[10px] font-semibold text-ink2 outline-none focus:border-moss">
                  {[0, 5, 10, 15, 30].map(b => <option key={b} value={b}>{b} min buffer</option>)}
                </select>
                <button onClick={() => { try { void navigator.clipboard.writeText(`https://book.emberandoak.com/book/${ev.name.toLowerCase().replace(/\s+/g, '-')}`); } catch { /* noop */ } a.toast('Event link copied', 'info'); }}
                  className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-bold text-steel transition hover:bg-steelbg">
                  <Icon name="link" size={11} /> Copy event link
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function Marketing() {
  const { s, a } = useApp();
  const [tab, setTab] = useState<'forms' | 'pages' | 'booking'>('forms');
  const [newForm, setNewForm] = useState(false);
  const [newPage, setNewPage] = useState(false);
  const [preview, setPreview] = useState<PageDef | null>(null);

  const copyEmbed = (f: FormDef) => {
    const code = f.type === 'popup'
      ? `<script async src="https://forms.cadence.site/${f.name.toLowerCase().replace(/\s+/g, '-')}.js" data-trigger="exit-intent"></script>`
      : `<iframe src="https://forms.cadence.site/${f.name.toLowerCase().replace(/\s+/g, '-')}" width="100%" height="480" style="border:0"></iframe>`;
    try { void navigator.clipboard.writeText(code); } catch { /* clipboard unavailable */ }
    a.toast(`${f.type === 'popup' ? 'Popup script' : 'Embed snippet'} copied to clipboard`, 'info');
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Seg options={[{ id: 'forms', label: `Forms · ${s.forms.length}` }, { id: 'pages', label: `Pages · ${s.pages.length}` }, { id: 'booking', label: 'Booking' }]} value={tab} onChange={setTab} />
        <div className="ml-auto">
          {tab === 'forms' && <Btn onClick={() => setNewForm(true)}><Icon name="plus" size={14} sw={2.4} /> New form</Btn>}
          {tab === 'pages' && <Btn onClick={() => setNewPage(true)}><Icon name="plus" size={14} sw={2.4} /> New page</Btn>}
        </div>
      </div>

      {tab === 'forms' ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {s.forms.map(f => {
            const tm = FORM_TYPES.find(t => t.id === f.type);
            return (
              <Card key={f.id} className="p-4" hover>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-mint text-moss"><Icon name={tm?.icon ?? 'layout'} size={16} /></span>
                    <div>
                      <p className="text-[13px] font-bold text-ink">{f.name}</p>
                      <p className="text-[10.5px] text-mut">{tm?.label} · {f.template} template</p>
                    </div>
                  </div>
                  <Toggle on={f.active} onChange={v => { a.patchForm(f.id, { active: v }); a.toast(v ? `"${f.name}" is live` : `"${f.name}" paused`, v ? 'success' : 'warning'); }} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-paper px-2.5 py-2">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-mut">Submissions</p>
                    <p className="font-display text-[17px] font-bold text-ink">{f.submissions.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg bg-paper px-2.5 py-2">
                    <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-mut">Conversion</p>
                    <p className="font-display text-[17px] font-bold text-moss">{f.conv}%</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-1.5">
                  <Btn size="sm" variant="outline" className="flex-1" onClick={() => copyEmbed(f)}><Icon name="copy" size={12} /> Copy {f.type === 'popup' ? 'script' : 'embed'}</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => a.toast(`Opening submissions for "${f.name}"… ${f.submissions} rows`, 'info')}><Icon name="eye" size={12} /> Data</Btn>
                </div>
              </Card>
            );
          })}
        </div>
      ) : tab === 'pages' ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {s.pages.map(pg => (
            <Card key={pg.id} className="flex flex-col p-3" hover>
              <button onClick={() => setPreview(pg)} className="text-left"><Wireframe t={pg.template} /></button>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <p className="truncate text-[12.5px] font-bold text-ink">{pg.name}</p>
                <Pill color={pg.status === 'live' ? '#0e7a52' : '#6e776f'} tint={pg.status === 'live' ? '#e2efe7' : '#eceee7'} dot>{pg.status}</Pill>
              </div>
              <p className="truncate font-mono text-[9.5px] text-faint">{pg.slug}.emberandoak.cadence.site</p>
              <div className="mt-2 flex items-center gap-3 border-t border-line pt-2 font-mono text-[10px] text-mut">
                <span className="flex items-center gap-1"><Icon name="eye" size={11} />{kfmt(pg.views)}</span>
                <span className="flex items-center gap-1"><Icon name="file" size={11} />{pg.submissions}</span>
                <span className="ml-auto font-bold text-moss">{pg.views ? pct(pg.submissions, pg.views) : '—'}</span>
              </div>
              <div className="mt-2 flex gap-1.5">
                <Btn size="sm" variant="outline" className="flex-1" onClick={() => setPreview(pg)}><Icon name="eye" size={12} /> Preview</Btn>
                <Btn size="sm" variant="ghost" onClick={() => { try { void navigator.clipboard.writeText(`https://${pg.slug}.emberandoak.cadence.site`); } catch { /* noop */ } a.toast('Live URL copied', 'info'); }}><Icon name="link" size={12} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'booking' && <BookingPanel />}

      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <Icon name="bolt" size={12} className="text-moss" /> Every submission flows into the unified CRM — list, welcome email, owner notification and deal, in that order.
      </p>

      <NewFormModal open={newForm} onClose={() => setNewForm(false)} />
      <NewPageModal open={newPage} onClose={() => setNewPage(false)} />

      <Modal open={!!preview} onClose={() => setPreview(null)} title={preview?.name ?? ''} sub={`https://${preview?.slug}.emberandoak.cadence.site · meta title & description editable`} w="max-w-sm">
        {preview && (
          <div className="space-y-3">
            <Wireframe t={preview.template} />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-paper px-2 py-2"><p className="font-mono text-[9px] uppercase tracking-wider text-mut">Views</p><p className="font-display text-[15px] font-bold text-ink">{kfmt(preview.views)}</p></div>
              <div className="rounded-lg bg-paper px-2 py-2"><p className="font-mono text-[9px] uppercase tracking-wider text-mut">Leads</p><p className="font-display text-[15px] font-bold text-ink">{preview.submissions}</p></div>
              <div className="rounded-lg bg-paper px-2 py-2"><p className="font-mono text-[9px] uppercase tracking-wider text-mut">Conv.</p><p className="font-display text-[15px] font-bold text-moss">{preview.views ? pct(preview.submissions, preview.views) : '—'}</p></div>
            </div>
          </div>
        )}
      </Modal>
      {/* keep Avatar referenced for future blocks */}
      <span className="hidden"><Avatar name="x" size={1} /></span>
    </div>
  );
}
