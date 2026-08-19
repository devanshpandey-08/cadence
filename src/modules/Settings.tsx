import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, kfmt, PLATFORM_IDS, PLATFORMS, PlatformIcon } from '../meta';
import type { Role, User } from '../types';
import { Avatar, Btn, Card, Field, IconBtn, inputCls, Modal, Pill, SectionTitle, Toggle } from '../components/ui';

const ROLE_META: Record<Role, { label: string; color: string; tint: string; can: string }> = {
  admin: { label: 'Admin', color: '#2e9e4f', tint: '#e0f6e4', can: 'Full access · billing · user management' },
  editor: { label: 'Editor', color: '#3e7cb1', tint: '#e5eef6', can: 'Create, edit, publish · contacts & deals' },
  viewer: { label: 'Viewer', color: '#6e776f', tint: '#eceee7', can: 'Read-only · calendar, contacts, reports' },
};

const PLANS = [
  { id: 'free', name: 'Free', price: 0, feats: ['1 user', '3 social accounts', '500 contacts', '1 pipeline', '100 emails/mo', 'Cadence branding on emails'] },
  { id: 'starter', name: 'Starter', price: 29, feats: ['3 users', '10 social accounts', '5K contacts', '3 pipelines', '5K emails/mo', '5 landing pages'] },
  { id: 'growth', name: 'Growth', price: 79, feats: ['10 users', '25 social accounts', '25K contacts', '10 pipelines', '25K emails/mo', '25 landing pages', 'Approval workflows'] },
];

function HubSpotModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { a } = useApp();
  const [key, setKey] = useState('');
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const timer = useRef<number | null>(null);
  const steps = ['Connecting to HubSpot', 'Pulling contacts (up to 50K)', 'Pulling companies & deals', 'Auto-mapping properties', 'Preview confirmed — writing'];

  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  const start = () => {
    setRunning(true); setStep(0);
    let i = 0;
    timer.current = window.setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        if (timer.current) window.clearInterval(timer.current);
        const today = new Date().toISOString().slice(0, 10);
        a.importContacts([
          { id: 'hs1' + Date.now(), name: 'Margaux Delacroix', email: 'margaux@maisoncafe.fr', company: 'Maison Café', title: 'Achats', source: 'Import', tags: ['wholesale'], owner: 'Maya Chen', createdAt: today, lastActivity: today, timeline: [{ id: 'hst1', type: 'note', text: 'Imported from HubSpot — 12 properties mapped', at: today }] },
          { id: 'hs2' + Date.now(), name: 'Tom Riedel', email: 'tom@riedelbaker.de', company: 'Riedel Bäckerei', title: 'Owner', source: 'Import', tags: ['lead'], owner: 'Jonas Berg', createdAt: today, lastActivity: today, timeline: [{ id: 'hst2', type: 'note', text: 'Imported from HubSpot', at: today }] },
          { id: 'hs3' + Date.now(), name: 'Carmen Vidal', email: 'carmen@vidalhostel.es', company: 'Vidal Hostel Group', title: 'F&B Manager', source: 'Import', tags: ['wholesale', 'vip'], owner: 'Priya Nair', createdAt: today, lastActivity: today, timeline: [{ id: 'hst3', type: 'note', text: 'Imported from HubSpot — deal stage mapped to Qualified', at: today }] },
        ]);
        setRunning(false); setKey('');
        onClose();
      } else setStep(i);
    }, 640);
  };

  return (
    <Modal open={open} onClose={onClose} title="One-click HubSpot import" sub="Contacts, companies, deals, lists and email templates — mapped automatically." w="max-w-md">
      <Field label="HubSpot private app key" hint="pat-na1-…" req>
        <input className={inputCls} value={key} onChange={e => setKey(e.target.value)} placeholder="pat-na1-1a2b3c4d-…" />
      </Field>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[['< 10 min', 'for 50K contacts'], ['Auto-map', 'properties → fields'], ['Preview', 'before committing']].map(x => (
          <div key={x[0]} className="rounded-lg bg-paper px-2 py-2">
            <p className="font-mono text-[11px] font-bold text-ink">{x[0]}</p>
            <p className="text-[9.5px] text-mut">{x[1]}</p>
          </div>
        ))}
      </div>
      {running && (
        <div className="mt-3 space-y-2 rounded-lg border border-line bg-paper/70 p-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-moss transition-all duration-500" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
          </div>
          {steps.map((st, i) => (
            <p key={st} className={cx('flex items-center gap-2 text-[11px]', i < step ? 'text-moss' : i === step ? 'font-semibold text-ink' : 'text-faint')}>
              {i < step ? <Icon name="check" size={11} sw={3} /> : i === step ? <span className="live-dot h-1.5 w-1.5 rounded-full bg-amber" /> : <span className="h-1.5 w-1.5 rounded-full bg-line2" />}{st}
            </p>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={start} disabled={running || key.trim().length < 6}><Icon name="download" size={14} /> {running ? 'Importing…' : 'Import everything'}</Btn>
      </div>
    </Modal>
  );
}

export function Settings() {
  const { s, a } = useApp();
  const [plan, setPlan] = useState('growth');
  const [hsOpen, setHsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inv, setInv] = useState({ name: '', email: '', role: 'editor' as Role });
  const [resetOpen, setResetOpen] = useState(false);
  const [apiKey, setApiKey] = useState('cd_live_7f3a91e2c8d4b6a5');

  return (
    <div className="mx-auto max-w-[920px] space-y-4">
      {/* team */}
      <Card className="p-4">
        <SectionTitle right={<Btn size="sm" variant="outline" onClick={() => setInviteOpen(true)}><Icon name="plus" size={13} /> Invite user</Btn>}>
          Team · 3 hardcoded roles, no role tax
        </SectionTitle>
        <div className="space-y-1.5">
          {s.users.map(u => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-paper/50 px-3 py-2.5">
              <Avatar name={u.name} color={u.color} size={32} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[13px] font-bold text-ink">{u.name}</p>
                <p className="truncate text-[10.5px] text-mut">{u.email}</p>
              </div>
              <p className="hidden max-w-[240px] text-[10px] leading-snug text-faint sm:block">{ROLE_META[u.role].can}</p>
              <select value={u.role}
                onChange={e => { a.patchUser(u.id, { role: e.target.value as Role }); a.toast(`${u.name} is now ${ROLE_META[e.target.value as Role].label}`, 'info'); }}
                className="rounded-full border-0 py-1.5 pl-3 pr-8 text-[11px] font-bold outline-none ring-1 ring-inset ring-transparent transition focus:ring-moss"
                style={{ color: ROLE_META[u.role].color, background: ROLE_META[u.role].tint }}>
                <option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option>
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* connected accounts */}
      <Card className="p-4">
        <SectionTitle right={<span className="font-mono text-[10.5px] font-bold text-moss">{s.accounts.filter(x => x.connected).length}/{s.accounts.length} connected</span>}>
          Social channels · flat-rate, no per-channel fees
        </SectionTitle>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {s.accounts.map(ac => (
            <div key={ac.id} className={cx('flex items-center gap-2.5 rounded-lg border p-2.5 transition', ac.connected ? 'border-line bg-card' : 'border-dashed border-line2 bg-paper/50')}>
              <PlatformIcon p={ac.platform} size={26} className={cx(!ac.connected && 'opacity-30 grayscale')} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[11px] font-bold text-ink">{PLATFORMS[ac.platform].name}</p>
                <p className="truncate font-mono text-[9.5px] text-mut">{ac.handle}</p>
              </div>
              <Toggle on={ac.connected} onChange={v => {
                a.patchAccount(ac.id, { connected: v });
                a.toast(v ? `${PLATFORMS[ac.platform].name} connected via OAuth` : `${PLATFORMS[ac.platform].name} disconnected`, v ? 'success' : 'warning');
              }} />
            </div>
          ))}
        </div>
      </Card>

      {/* plan */}
      <Card className="p-4">
        <SectionTitle right={<Pill color="#0e7a52" tint="#e2efe7" dot>Monthly only · cancel anytime</Pill>}>Pricing</SectionTitle>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {PLANS.map(p => (
            <div key={p.id} className={cx('relative rounded-xl border p-3.5 transition', plan === p.id ? 'border-moss bg-mint/40 shadow-lift' : 'border-line bg-card hover:border-line2')}>
              {plan === p.id && <span className="absolute -top-2.5 left-3.5 rounded-full bg-moss px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-card">Current</span>}
              <p className="font-display text-[15px] font-bold text-ink">{p.name}</p>
              <p className="mt-0.5 font-display text-[26px] font-bold tracking-tight text-ink">${p.price}<span className="text-xs font-medium text-mut">/mo</span></p>
              <ul className="mt-2 space-y-1">
                {p.feats.map(f => (
                  <li key={f} className="flex items-center gap-1.5 text-[10.5px] text-ink2"><Icon name="check" size={10} sw={3} className="text-moss" />{f}</li>
                ))}
              </ul>
              <Btn size="sm" variant={plan === p.id ? 'outline' : 'primary'} className="mt-3 w-full" disabled={plan === p.id}
                onClick={() => { setPlan(p.id); a.toast(`Plan switched to ${p.name} — $${p.price}/mo, prorated`, 'info'); }}>
                {plan === p.id ? 'Active' : `Switch to ${p.name}`}
              </Btn>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-nightline bg-night px-4 py-3">
          <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-nighttx">Why teams switch</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            {[['Buffer', 60], ['HubSpot Starter', 50], ['Mailchimp', 30]].map(([n, v]) => (
              <span key={n as string} className="rounded-md bg-night2 px-2 py-1 text-card/80">{n} <span className="font-mono font-bold text-card">${v}</span></span>
            ))}
            <span className="font-mono text-card/40">=</span>
            <span className="font-mono font-bold text-card/80 line-through decoration-danger">$140/mo, 3 logins, 0 shared data</span>
            <span className="ml-auto rounded-md bg-moss px-2.5 py-1 font-mono font-bold text-card">Cadence $79/mo — one database</span>
          </div>
        </div>
      </Card>

      {/* integrations */}
      <Card className="p-4">
        <SectionTitle>Import & integrations</SectionTitle>
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <div className="rounded-lg border border-line bg-paper/50 p-3">
            <p className="flex items-center gap-2 text-xs font-bold text-ink"><Icon name="download" size={14} className="text-moss" /> HubSpot importer</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-mut">Paste a key, we pull everything and map it. Under 10 minutes for 50K contacts.</p>
            <Btn size="sm" variant="outline" className="mt-2.5" onClick={() => setHsOpen(true)}>Run import</Btn>
          </div>
          <div className="rounded-lg border border-line bg-paper/50 p-3">
            <p className="flex items-center gap-2 text-xs font-bold text-ink"><Icon name="link" size={14} className="text-steel" /> REST API</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-mut">CRUD for contacts, companies, deals, lists, posts · API-key auth · 100 req/min.</p>
            <div className="mt-2.5 flex items-center gap-1.5">
              <code className="min-w-0 flex-1 truncate rounded-md border border-line bg-card px-2 py-1.5 font-mono text-[9.5px] text-ink2">{apiKey}</code>
              <IconBtn name="copy" title="Copy key" onClick={() => { try { void navigator.clipboard.writeText(apiKey); } catch { /* noop */ } a.toast('API key copied', 'info'); }} />
              <IconBtn name="refresh" title="Regenerate" onClick={() => { setApiKey('cd_live_' + Math.random().toString(36).slice(2, 18)); a.toast('New API key generated — old key revoked in 24h', 'warning'); }} />
            </div>
          </div>
          <div className="rounded-lg border border-line bg-paper/50 p-3">
            <p className="flex items-center gap-2 text-xs font-bold text-ink"><Icon name="bolt" size={14} className="text-amber" /> Zapier</p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-mut">Triggers: new contact, form submit, deal moved, post published. Actions: create contact/deal, add to list, schedule post.</p>
            <div className="mt-2.5 flex items-center gap-2">
              <Pill color="#0e7a52" tint="#e2efe7" dot>Connected</Pill>
              <span className="font-mono text-[9.5px] text-faint">covers 80% of integration needs</span>
            </div>
          </div>
        </div>
      </Card>

      {/* smtp + workspace */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4">
          <SectionTitle>Email delivery · your SMTP</SectionTitle>
          <div className="flex items-center gap-2.5 rounded-lg border border-line bg-paper/50 px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint text-moss"><Icon name="mail" size={15} /></span>
            <div className="flex-1 leading-tight">
              <p className="text-xs font-bold text-ink">Gmail — maya@emberandoak.com</p>
              <p className="text-[10px] text-mut">OAuth connected · we build the email, your provider delivers it</p>
            </div>
            <Pill color="#0e7a52" tint="#e2efe7" dot>Verified</Pill>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-mut">
            Also supported: Outlook, SendGrid, Amazon SES credentials. No AWS SES bill from us — that margin stays yours (≈90% gross at $0.20–0.40 per customer).
          </p>
        </Card>
        <Card className="p-4">
          <SectionTitle>Workspace</SectionTitle>
          <div className="space-y-2.5">
            <Field label="Workspace name"><input className={inputCls} defaultValue="Ember & Oak Roastery" onBlur={e => a.toast(`Workspace renamed to "${e.target.value}"`, 'info')} /></Field>
            <Field label="Scheduling domain">
              <div className="flex items-center gap-2">
                <input className={inputCls} defaultValue="book.emberandoak.com" />
                <Pill color="#3e7cb1" tint="#e5eef6">CNAME ok</Pill>
              </div>
            </Field>
          </div>
        </Card>
      </div>

      {/* danger */}
      <Card className="flex flex-wrap items-center justify-between gap-3 border-danger/30 p-4">
        <div>
          <p className="text-[13px] font-bold text-ink">Reset demo data</p>
          <p className="text-[10.5px] text-mut">Wipes local changes ({s.contacts.length} contacts, {s.deals.length} deals, {s.posts.length} posts) and reseeds the workspace.</p>
        </div>
        <Btn variant="danger" onClick={() => setResetOpen(true)}><Icon name="refresh" size={14} /> Reset workspace</Btn>
      </Card>

      <HubSpotModal open={hsOpen} onClose={() => setHsOpen(false)} />

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a teammate" sub="They get one login for CRM, social, email — everything." w="max-w-sm"
        footer={<><Btn variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Btn>
          <Btn onClick={() => {
            if (!inv.name.trim() || !inv.email.includes('@')) { a.toast('Name and valid email required', 'warning'); return; }
            a.addUser(inv.name.trim(), inv.email.trim(), inv.role);
            setInv({ name: '', email: '', role: 'editor' }); setInviteOpen(false);
          }}><Icon name="send" size={13} /> Send invite</Btn></>}>
        <div className="space-y-3">
          <Field label="Full name" req><input className={inputCls} value={inv.name} onChange={e => setInv({ ...inv, name: e.target.value })} placeholder="Rio Tanaka" /></Field>
          <Field label="Email" req><input className={inputCls} value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} placeholder="rio@emberandoak.com" /></Field>
          <Field label="Role">
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(ROLE_META) as Role[]).map(r => (
                <button key={r} onClick={() => setInv({ ...inv, role: r })}
                  className={cx('rounded-lg border px-2 py-2 text-[11px] font-bold transition', inv.role === r ? 'border-moss bg-mint/60 text-pine' : 'border-line bg-card text-mut hover:border-line2')}>
                  {ROLE_META[r].label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset workspace?" sub="This clears your local demo data and restores the original Ember & Oak workspace." w="max-w-sm"
        footer={<><Btn variant="ghost" onClick={() => setResetOpen(false)}>Keep my data</Btn><Btn variant="danger" onClick={() => { a.reset(); setResetOpen(false); }}><Icon name="refresh" size={13} /> Yes, reset</Btn></>}>
        <p className="text-xs leading-relaxed text-mut">Contacts, deals, posts, threads, campaigns and settings return to the seeded state. This only affects this browser's localStorage — {kfmt(25)}K-contact accounts are unaffected in production.</p>
      </Modal>

      <p className="pb-2 text-center font-mono text-[10px] text-faint">Cadence Phase 1 · one database, one login, one flat price · infra ≈ $0.20–0.40/customer/mo</p>
    </div>
  );
}
