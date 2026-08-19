import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp, useCanEdit } from '../store';
import { Avatar, IconBtn, Modal, Pill, ToastHost } from './ui';
import { cx, Icon, kfmt, relTime, TODAY } from '../meta';
import type { View } from '../types';
import { CommandPalette, GMAP } from './CommandPalette';
import { ROLE_LABEL, ROLE_SCOPE } from '../services/backend';

const TITLES: Record<View, { t: string; s: string }> = {
  dashboard: { t: 'Dashboard', s: 'CRM, social and email — one pulse' },
  inbox: { t: 'Social Inbox', s: 'Comments, DMs and mentions from every platform' },
  tasks: { t: 'Tasks & Activity', s: 'Follow-ups, calls and automations' },
  contacts: { t: 'Contacts', s: 'Every person and company in one database' },
  deals: { t: 'Deal Pipeline', s: 'Drag deals through the stages' },
  calendar: { t: 'Content Calendar', s: 'Plan, approve and publish everywhere' },
  campaigns: { t: 'Email Campaigns', s: 'Broadcasts delivered through your own SMTP' },
  marketing: { t: 'Forms & Pages', s: 'Capture leads and convert on landing pages' },
  settings: { t: 'Settings', s: 'Team, channels, plan and integrations' },
};

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
      <svg width="30" height="30" viewBox="0 0 32 32" className="shrink-0">
        <rect width="32" height="32" rx="9" fill="#0e7a52" />
        <rect x="7" y="16" width="4" height="9" rx="1.5" fill="#f1f2ec" />
        <rect x="14" y="11" width="4" height="14" rx="1.5" fill="#f1f2ec" />
        <rect x="21" y="6" width="4" height="19" rx="1.5" fill="#f1f2ec" />
      </svg>
      <div className="leading-none">
        <p className="font-display text-[17px] font-bold tracking-tight text-card">Cadence</p>
        <p className="mt-1 font-mono text-[8.5px] font-medium uppercase tracking-[0.22em] text-nighttx">Social CRM</p>
      </div>
    </div>
  );
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { s, a } = useApp();
  const unread = s.threads.filter(t => t.status === 'unread').length;
  const due = s.tasks.filter(t => !t.done && t.due <= TODAY).length;
  const pending = s.posts.filter(p => p.status === 'pending').length;

  const groups: { label: string; items: { v: View; icon: string; label: string; badge?: number; badgeColor?: string }[] }[] = [
    {
      label: 'Overview',
      items: [
        { v: 'dashboard', icon: 'dash', label: 'Dashboard' },
        { v: 'inbox', icon: 'inbox', label: 'Inbox', badge: unread, badgeColor: '#c2483b' },
        { v: 'tasks', icon: 'checksq', label: 'Tasks', badge: due, badgeColor: '#a96f14' },
      ],
    },
    {
      label: 'CRM',
      items: [
        { v: 'contacts', icon: 'users', label: 'Contacts' },
        { v: 'deals', icon: 'kanban', label: 'Deals' },
      ],
    },
    {
      label: 'Marketing',
      items: [
        { v: 'calendar', icon: 'calendar', label: 'Calendar', badge: pending, badgeColor: '#c08a1e' },
        { v: 'campaigns', icon: 'mail', label: 'Campaigns' },
        { v: 'marketing', icon: 'layout', label: 'Forms & Pages' },
      ],
    },
    {
      label: 'Workspace',
      items: [{ v: 'settings', icon: 'sliders', label: 'Settings' }],
    },
  ];

  const usedPct = Math.min(100, (s.contacts.length / 250) * 100);

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-night/50 anim-fade md:hidden" onClick={onClose} />}
      <aside className={cx(
        'fixed inset-y-0 left-0 z-40 flex w-[228px] shrink-0 flex-col border-r border-nightline bg-night transition-transform duration-300 md:static md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <Logo />

        <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-nightline bg-night2/70 px-2.5 py-2">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-moss/20 font-mono text-[10px] font-bold text-moss">E&O</div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold text-card">Ember & Oak Roastery</p>
            <p className="flex items-center gap-1 text-[10px] text-nighttx">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" /> All channels synced
            </p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {groups.map(g => (
            <div key={g.label} className="mb-3">
              <p className="mb-1 px-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-nighttx/60">{g.label}</p>
              {g.items.map(it => {
                const active = s.view === it.v;
                return (
                  <button key={it.v} onClick={() => { a.nav(it.v); onClose(); }}
                    className={cx(
                      'group relative mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all',
                      active ? 'bg-night2 text-card' : 'text-nighttx hover:bg-night2/60 hover:text-card',
                    )}>
                    <span className={cx('absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-moss transition-all', active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40')} />
                    <Icon name={it.icon} size={16} className={active ? 'text-moss' : ''} />
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.badge ? (
                      <span className="rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-card" style={{ background: it.badgeColor }}>
                        {it.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="mx-1 mb-1 flex items-center justify-between rounded-lg border border-nightline/70 bg-night2/40 px-2.5 py-2">
            <span className="flex items-center gap-1.5 font-mono text-[9.5px] font-semibold text-nighttx">
              <kbd className="rounded border border-nightline bg-night2 px-1 py-0.5 text-[9px] text-card/80">⌘K</kbd> commands
            </span>
            <span className="flex items-center gap-1 font-mono text-[9.5px] font-semibold text-nighttx">
              <kbd className="rounded border border-nightline bg-night2 px-1 py-0.5 text-[9px] text-card/80">?</kbd> shortcuts
            </span>
          </div>
        </nav>

        <div className="mx-3 mb-2 rounded-lg border border-nightline bg-night2/70 p-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-moss">Growth plan</p>
            <button onClick={() => { a.nav('settings'); onClose(); }} className="text-[10px] font-semibold text-nighttx transition hover:text-card">Manage</button>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-nightline">
            <div className="h-full rounded-full bg-moss transition-all duration-700" style={{ width: `${usedPct}%` }} />
          </div>
          <p className="mt-1.5 text-[10.5px] text-nighttx">
            <span className="font-mono font-semibold text-card/90">{kfmt(s.contacts.length * 1030)}</span> / 25K contacts · 10 users
          </p>
        </div>

        <button onClick={() => { a.nav('settings'); onClose(); }} className="mx-3 mb-4 flex items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-night2/70">
          <Avatar name={(s.me ?? s.users[0]).name} color={(s.me ?? s.users[0]).color} size={30} />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-xs font-semibold text-card">{(s.me ?? s.users[0]).name}</p>
            <p className="truncate text-[10px] text-nighttx">{ROLE_LABEL[(s.me ?? s.users[0]).role]} · {(s.me ?? s.users[0]).email}</p>
          </div>
        </button>
      </aside>
    </>
  );
}

function SearchBox() {
  const { s, a } = useApp();
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return null;
    return {
      contacts: s.contacts.filter(c => (c.name + c.company + c.email).toLowerCase().includes(t)).slice(0, 5),
      deals: s.deals.filter(d => d.name.toLowerCase().includes(t)).slice(0, 4),
    };
  }, [q, s.contacts, s.deals]);

  return (
    <div className="relative hidden w-[300px] lg:block">
      <Icon name="search" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => window.setTimeout(() => setFocus(false), 150)}
        placeholder="Search contacts, deals…"
        className="h-9 w-full rounded-lg border border-line bg-card pl-9 pr-12 text-[13px] outline-none transition placeholder:text-faint focus:border-moss focus:ring-2 focus:ring-moss/15"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] text-faint">⌘K</span>
      {focus && results && (results.contacts.length > 0 || results.deals.length > 0) && (
        <div className="absolute left-0 right-0 top-11 z-40 anim-pop overflow-hidden rounded-xl border border-line bg-card shadow-pop">
          {results.contacts.length > 0 && (
            <div className="p-1.5">
              <p className="px-2 pb-1 pt-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-faint">Contacts</p>
              {results.contacts.map(c => (
                <button key={c.id} onMouseDown={() => { a.openContact(c.id); setQ(''); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-mint/60">
                  <Avatar name={c.name} size={24} />
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-xs font-semibold text-ink">{c.name}</p>
                    <p className="truncate text-[10.5px] text-mut">{c.title} · {c.company}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {results.deals.length > 0 && (
            <div className="border-t border-line p-1.5">
              <p className="px-2 pb-1 pt-0.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-faint">Deals</p>
              {results.deals.map(d => (
                <button key={d.id} onMouseDown={() => { a.openDeal(d.id); setQ(''); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-mint/60">
                  <Icon name="kanban" size={14} className="text-mut" />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-xs font-semibold text-ink">{d.name}</p>
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-ink2">${(d.value / 1000).toFixed(1)}K</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateMenu() {
  const { s, a } = useApp();
  const can = useCanEdit();
  const [open, setOpen] = useState(false);
  const items: { label: string; icon: string; fn: () => void }[] = [
    { label: 'New post', icon: 'send', fn: () => a.openComposer() },
    { label: 'New contact', icon: 'users', fn: () => a.ui({ view: 'contacts', create: 'contact', contactId: null }) },
    { label: 'New deal', icon: 'kanban', fn: () => a.ui({ view: 'deals', create: 'deal', dealId: null }) },
    { label: 'New campaign', icon: 'mail', fn: () => a.ui({ view: 'campaigns', create: 'campaign' }) },
    { label: 'New task', icon: 'checksq', fn: () => a.ui({ view: 'tasks', create: 'task' }) },
  ];
  return (
    <div className="relative">
      <button onClick={() => (can ? setOpen(o => !o) : a.toast('Viewer role is read-only — ask an Admin for Editor access', 'warning'))}
        title={can ? 'Create something new' : 'Read-only role'}
        className={cx('flex h-9 items-center gap-1.5 rounded-lg bg-moss px-3.5 text-[13px] font-semibold text-card shadow-sm transition-all hover:bg-pine active:scale-[0.97]', open && 'bg-pine', !can && 'cursor-not-allowed opacity-55')}>
        <Icon name="plus" size={15} sw={2.4} /> Create
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-48 anim-pop rounded-xl border border-line bg-card p-1.5 shadow-pop">
            {items.map(it => (
              <button key={it.label} onClick={() => { it.fn(); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-ink2 transition hover:bg-mint/70 hover:text-ink">
                <Icon name={it.icon} size={15} className="text-mut" /> {it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Bell() {
  const { s, a } = useApp();
  const [open, setOpen] = useState(false);
  const unread = s.notifs.filter(n => !n.read).length;
  const kindColor = { auto: '#0e7a52', approval: '#a96f14', import: '#3e7cb1', system: '#6e776f' } as const;
  const kindIcon = { auto: 'bolt', approval: 'clock', import: 'download', system: 'bell' } as const;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-card text-ink2 transition hover:border-line2 hover:text-ink">
        <Icon name="bell" size={16} />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 font-mono text-[9px] font-bold text-card">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-[340px] anim-pop overflow-hidden rounded-xl border border-line bg-card shadow-pop">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <p className="font-display text-[13.5px] font-bold text-ink">Notifications</p>
              <button onClick={() => a.ui({ notifs: s.notifs.map(n => ({ ...n, read: true })) })} className="text-[11px] font-semibold text-moss transition hover:text-pine">
                Mark all read
              </button>
            </div>
            <div className="max-h-[330px] overflow-y-auto p-1.5">
              {s.notifs.length === 0 && <p className="px-3 py-6 text-center text-xs text-mut">You're all caught up.</p>}
              {s.notifs.map(n => (
                <div key={n.id} className={cx('flex items-start gap-2.5 rounded-lg px-2.5 py-2.5', !n.read && 'bg-mint/50')}>
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ background: kindColor[n.kind] + '1f', color: kindColor[n.kind] }}>
                    <Icon name={kindIcon[n.kind]} size={12} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs leading-snug text-ink2">{n.text}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-faint">{relTime(n.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SyncTicker() {
  const [sec, setSec] = useState(6);
  useEffect(() => {
    const t = window.setInterval(() => setSec(x => (x >= 47 ? 1 : x + 1)), 1000);
    return () => window.clearInterval(t);
  }, []);
  const syncing = sec <= 3;
  return (
    <div className="hidden items-center gap-1.5 rounded-lg border border-line bg-card px-2.5 py-2 xl:flex" title="Social APIs polled continuously — comments and DMs stream into the inbox">
      <span className={cx('h-1.5 w-1.5 rounded-full', syncing ? 'live-dot bg-amber' : 'bg-moss')} />
      <span className="font-mono text-[10px] font-semibold text-mut">{syncing ? 'syncing…' : `synced ${sec}s ago`}</span>
    </div>
  );
}

function UserMenu() {
  const { s, a } = useApp();
  const [open, setOpen] = useState(false);
  const me = s.me ?? s.users[0];
  const roleColor = { admin: '#0e7a52', editor: '#3e7cb1', viewer: '#a96f14' }[me.role];
  const roleTint = { admin: '#e2efe7', editor: '#e5eef6', viewer: '#f7ecd6' }[me.role];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cx('flex items-center gap-1.5 rounded-lg border border-transparent p-1 pr-1.5 transition hover:border-line hover:bg-card', open && 'border-line bg-card')}>
        <Avatar name={me.name} color={me.color} size={30} />
        <Icon name="chevd" size={12} className={cx('text-faint transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-40 w-[264px] anim-pop overflow-hidden rounded-xl border border-line bg-card shadow-pop">
            <div className="border-b border-line bg-paper/60 px-4 py-3.5">
              <div className="flex items-center gap-2.5">
                <Avatar name={me.name} color={me.color} size={36} />
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-[13px] font-bold text-ink">{me.name}</p>
                  <p className="truncate text-[10.5px] text-mut">{me.email}</p>
                </div>
              </div>
              <p className="mt-2.5 flex items-center gap-1.5">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: roleColor, background: roleTint }}>{ROLE_LABEL[me.role]}</span>
                <span className="text-[10px] text-mut">{ROLE_SCOPE[me.role]}</span>
              </p>
            </div>
            <div className="p-1.5">
              <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12px] font-medium text-mut">
                <Icon name="dash" size={14} /> Press <span className="rounded border border-line bg-paper px-1 font-mono text-[10px] font-bold text-ink2">?</span> for keyboard shortcuts
              </div>
              <button onClick={() => { setOpen(false); a.logout(); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold text-danger transition hover:bg-dangerbg">
                <Icon name="external" size={14} /> Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { s } = useApp();
  const can = useCanEdit();
  const t = TITLES[s.view];
  return (
    <header className="sticky top-0 z-20 flex h-[58px] shrink-0 items-center gap-3 border-b border-line bg-paper/85 px-4 backdrop-blur-md md:px-6">
      <IconBtn name="more" onClick={onMenu} className="md:hidden" title="Menu" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-[16.5px] font-bold leading-tight tracking-tight text-ink">{t.t}</h1>
        <p className="hidden truncate text-[11px] leading-tight text-mut sm:block">{t.s}</p>
      </div>
      <SyncTicker />
      <SearchBox />
      {!can && <Pill color="#a96f14" tint="#f7ecd6" className="hidden md:inline-flex"><Icon name="eye" size={11} /> Read-only</Pill>}
      <CreateMenu />
      <Bell />
      <div className="flex items-center gap-2 border-l border-line pl-3">
        <UserMenu />
      </div>
    </header>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-grid h-[20px] min-w-[20px] place-items-center rounded-[5px] border border-line bg-paper px-1 font-mono text-[10px] font-semibold text-ink2">{children}</kbd>;
}

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: 'Command palette — search & run anything' },
  { keys: ['/'], label: 'Open the palette from anywhere' },
  { keys: ['N'], label: 'Compose a new post' },
  { keys: ['G', 'D'], label: 'Go to Dashboard' },
  { keys: ['G', 'I'], label: 'Go to Inbox' },
  { keys: ['G', 'T'], label: 'Go to Tasks' },
  { keys: ['G', 'C'], label: 'Go to Contacts' },
  { keys: ['G', 'P'], label: 'Go to Deal pipeline' },
  { keys: ['G', 'S'], label: 'Go to Content calendar (schedule)' },
  { keys: ['G', 'M'], label: 'Go to Email campaigns (mail)' },
  { keys: ['G', 'F'], label: 'Go to Forms & pages' },
  { keys: ['G', 'X'], label: 'Go to Settings' },
  { keys: ['Esc'], label: 'Close dialogs, drawers and the palette' },
];

function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" sub="Move through Cadence without touching the mouse" w="max-w-md">
      <div className="space-y-1">
        {SHORTCUTS.map(sc => (
          <div key={sc.label} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition hover:bg-paper">
            <span className="text-xs text-ink2">{sc.label}</span>
            <span className="flex shrink-0 items-center gap-1">{sc.keys.map(k => <Kbd key={k}>{k}</Kbd>)}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { s, a } = useApp();
  const [mobileNav, setMobileNav] = useState(false);
  const [palette, setPalette] = useState(false);
  const [help, setHelp] = useState(false);
  const sRef = useRef(s);
  sRef.current = s;
  const gPending = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(p => !p);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (sRef.current.composer.open) return;
      const now = Date.now();
      const inG = now - gPending.current < 900;
      if (e.key === 'g' || e.key === 'G') { gPending.current = now; return; }
      if (inG) {
        const v = GMAP[e.key.toLowerCase()];
        if (v) { e.preventDefault(); a.nav(v); gPending.current = 0; return; }
      }
      if (e.key === '/') { e.preventDefault(); setPalette(true); return; }
      if (e.key === '?') { e.preventDefault(); setHelp(h => !h); return; }
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); a.openComposer(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [a]);

  return (
    <div className="flex h-full overflow-hidden">
      <Sidebar mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileNav(true)} />
        <main className="bg-dots relative flex-1 overflow-y-auto">
          <div className="glow-top pointer-events-none absolute inset-x-0 top-0 h-72" />
          <div key={s.view} className="anim-rise relative mx-auto max-w-[1280px] px-4 py-5 md:px-6">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <ShortcutsHelp open={help} onClose={() => setHelp(false)} />
      <ToastHost />
    </div>
  );
}
