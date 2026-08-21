import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp, useCanEdit } from '../store';
import { Avatar, IconBtn, Modal, Pill, ToastHost } from './ui';
import { cx, Icon, kfmt, relTime, TODAY } from '../meta';
import type { View } from '../types';
import { CommandPalette, GMAP } from './CommandPalette';
import { Copilot } from './Copilot';
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
  assets: { t: 'Asset Library', s: 'Photos, videos and brand media — one bucket for every channel' },
  ai: { t: 'AI Studio', s: 'Phase 3 — on-device copilot for posts, replies, scoring' },
  automations: { t: 'Automations', s: 'Phase 2 — drip sequences that run while you sleep' },
  listening: { t: 'Social Listening', s: 'Phase 2 — every mention, scored and streamed' },
  calls: { t: 'Calls', s: 'Phase 2 — VoIP dialing that logs itself to the CRM' },
  ads: { t: 'Ads Manager', s: 'Phase 3 — spend, pacing and ROAS across networks' },
  insights: { t: 'Insights', s: 'Funnels, cohorts and leaderboards off the unified database' },
  experiments: { t: 'A/B Testing', s: 'Two-proportion z-tests — ship only at 95% confidence' },
  attribution: { t: 'Attribution', s: 'Multi-touch credit across five models' },
  conversations: { t: 'SMS & WhatsApp', s: 'Meta Cloud API + Twilio, logged to the CRM timeline' },
  web: { t: 'Web Analytics', s: 'First-party, cookieless traffic for your pages' },
  seo: { t: 'SEO Suite', s: 'Audit, rank tracking and SERP preview' },
  cdp: { t: 'Identity & Event Graph', s: 'P0 — dedupe, UTM persistence and the live event firehose' },
  emailinfra: { t: 'Email Infrastructure', s: 'P1 — dedicated IP, transactional API, predictive send' },
  importers: { t: 'Importers', s: 'P0 — one-click HubSpot & Klaviyo migration' },
  agents: { t: 'Agent Fleet', s: 'P3 — tiered autonomy with human-in-the-loop approvals' },
  security: { t: 'Security & Sessions', s: 'Access control, MFA, sessions and API keys' },
  launch: { t: 'Launch Console', s: 'Pre-flight to production: multi-tenant, billing, platform APIs' },
  testing: { t: 'QA Console', s: 'Automated suites, load benchmarks and live security probes' },
  settings: { t: 'Settings', s: 'Team, channels, plan and integrations' },
};

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ember to-tang shadow-hard">
        <svg width="18" height="18" viewBox="0 0 32 32">
          <rect x="7" y="16" width="4" height="9" rx="1.5" fill="#191410" opacity="0.85" />
          <rect x="14" y="11" width="4" height="14" rx="1.5" fill="#191410" />
          <rect x="21" y="6" width="4" height="19" rx="1.5" fill="#191410" opacity="0.85" />
        </svg>
      </span>
      <div className="leading-none">
        <p className="font-display text-[17px] font-bold tracking-tight text-ink">Cadence</p>
        <p className="mt-1 font-mono text-[8.5px] font-medium uppercase tracking-[0.26em] text-nighttx">social crm</p>
      </div>
    </div>
  );
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { s, a } = useApp();
  const unread = s.threads.filter(t => t.status === 'unread').length;
  const due = s.tasks.filter(t => !t.done && t.due <= TODAY).length;
  const pending = s.posts.filter(p => p.status === 'pending').length;
  const pendingApprovals = s.approvals.filter(ap => ap.status === 'pending').length;

  const groups: { label: string; items: { v: View; icon: string; label: string; badge?: number; badgeColor?: string }[] }[] = [
    {
      label: 'Overview',
      items: [
        { v: 'dashboard', icon: 'dash', label: 'Dashboard' },
        { v: 'inbox', icon: 'inbox', label: 'Inbox', badge: unread, badgeColor: '#e2618f' },
        { v: 'tasks', icon: 'checksq', label: 'Tasks', badge: due, badgeColor: '#b26e14' },
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
        { v: 'calendar', icon: 'calendar', label: 'Calendar', badge: pending, badgeColor: '#3b6fd4' },
        { v: 'campaigns', icon: 'mail', label: 'Campaigns' },
        { v: 'marketing', icon: 'layout', label: 'Forms & Pages' },
        { v: 'assets', icon: 'image', label: 'Asset Library' },
      ],
    },
    {
      label: 'Intelligence · P3',
      items: [
        { v: 'ai', icon: 'bolt', label: 'AI Studio' },
        { v: 'listening', icon: 'globe', label: 'Listening' },
        { v: 'ads', icon: 'trend', label: 'Ads Manager' },
      ],
    },
    {
      label: 'Growth · P2',
      items: [
        { v: 'automations', icon: 'refresh', label: 'Automations' },
        { v: 'calls', icon: 'phone', label: 'Calls' },
      ],
    },
    {
      label: 'Insights · P2',
      items: [
        { v: 'insights', icon: 'trend', label: 'Insights (BI)' },
        { v: 'attribution', icon: 'link', label: 'Attribution' },
        { v: 'experiments', icon: 'layers', label: 'A/B Testing' },
      ],
    },
    {
      label: 'Reach · P2',
      items: [
        { v: 'conversations', icon: 'message', label: 'SMS & WhatsApp' },
        { v: 'web', icon: 'globe', label: 'Web Analytics' },
        { v: 'seo', icon: 'search', label: 'SEO Suite' },
      ],
    },
    {
      label: 'Data Platform · P0',
      items: [
        { v: 'cdp', icon: 'users', label: 'Identity & Events' },
        { v: 'emailinfra', icon: 'mail', label: 'Email Infra' },
        { v: 'importers', icon: 'download', label: 'Importers' },
      ],
    },
    {
      label: 'Autonomy · P3',
      items: [
        { v: 'agents', icon: 'cpu', label: 'Agent Fleet', badge: pendingApprovals, badgeColor: '#e0b45c' },
      ],
    },
    {
      label: 'Workspace',
      items: [
        { v: 'security', icon: 'shield', label: 'Security' },
        { v: 'launch', icon: 'pulse', label: 'Launch Console' },
        { v: 'testing', icon: 'shield', label: 'QA Console' },
        { v: 'settings', icon: 'sliders', label: 'Settings' },
      ],
    },
  ];

  const usedPct = Math.min(100, (s.contacts.length / 250) * 100);

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-night/50 anim-fade md:hidden" onClick={onClose} />}
      <aside className={cx(
        'fixed inset-y-0 left-0 z-40 flex w-[232px] shrink-0 flex-col border-r-2 border-ink bg-night transition-transform duration-300 md:static md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <Logo />

        <button onClick={() => { a.nav('settings'); onClose(); }}
          className="group mx-3 mb-3 flex items-center gap-2.5 rounded-lg border border-nightline bg-night2/70 px-2.5 py-2.5 text-left transition-all hover:border-moss/50">
          <div className="relative grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-moss/22 font-mono text-[10px] font-bold text-lime">
            E&O
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-night bg-lime" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold text-white">Ember & Oak Roastery</p>
            <p className="mt-0.5 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-nighttx">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-lime" /> all synced
            </p>
          </div>
          <Icon name="chevd" size={12} className="shrink-0 text-nighttx transition-transform group-hover:translate-y-0.5" />
        </button>

        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {groups.map(g => (
            <div key={g.label} className="mb-3.5">
              <div className="mb-1.5 flex items-center gap-2 px-2.5">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-nighttx/55">{g.label}</p>
                <span className="h-px flex-1 bg-nightline/50" />
              </div>
              {g.items.map(it => {
                const active = s.view === it.v;
                return (
                  <button key={it.v} onClick={() => { a.nav(it.v); onClose(); }}
                    className={cx(
                      'group relative mb-0.5 flex w-full items-center gap-2.5 rounded-lg py-[7px] pl-2.5 pr-2.5 text-[13px] font-semibold transition-all duration-150',
                      active
                        ? 'bg-night2 text-white'
                        : 'text-nighttx hover:bg-night2/60 hover:text-white/90',
                    )}>
                    <span className={cx('absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-lime transition-all',
                      active ? 'opacity-100' : 'opacity-0 group-hover:opacity-30')} />
                    <span className={cx('grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[7px] transition-all duration-150',
                      active ? 'bg-moss/25 text-lime' : 'text-nighttx group-hover:text-white/80')}>
                      <Icon name={it.icon} size={15} sw={active ? 2 : 1.8} />
                    </span>
                    <span className="flex-1 text-left">{it.label}</span>
                    {it.badge ? (
                      <span className="tnum rounded-full px-1.5 py-[3px] font-mono text-[9.5px] font-bold leading-none text-white"
                        style={{ background: it.badgeColor }}>
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
              <kbd className="rounded border border-nightline bg-night2 px-1 py-0.5 text-[9px] text-ink/80">⌘K</kbd> commands
            </span>
            <span className="flex items-center gap-1 font-mono text-[9.5px] font-semibold text-nighttx">
              <kbd className="rounded border border-nightline bg-night2 px-1 py-0.5 text-[9px] text-ink/80">?</kbd> shortcuts
            </span>
          </div>
        </nav>

        <div className="mx-3 mb-2 rounded-lg border border-nightline bg-night2/70 p-3">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-lime">
              <Icon name="bolt" size={11} sw={2} /> Growth plan
            </p>
            <button onClick={() => { a.nav('settings'); onClose(); }} className="text-[10px] font-semibold text-nighttx transition hover:text-white">Manage</button>
          </div>
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-nightline">
            <div className="h-full rounded-full bg-gradient-to-r from-moss to-lime transition-all duration-700" style={{ width: `${usedPct}%` }} />
          </div>
          <p className="tnum mt-2 font-mono text-[10px] font-semibold text-nighttx">
            <span className="text-white">{kfmt(s.contacts.length * 1030)}</span> / 25K contacts · 10 users
          </p>
        </div>

        <button onClick={() => { a.nav('settings'); onClose(); }} className="group mx-3 mb-4 flex items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-all hover:border-nightline hover:bg-night2/70">
          <Avatar name={(s.me ?? s.users[0]).name} color={(s.me ?? s.users[0]).color} size={30} status="online" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold text-ink">{(s.me ?? s.users[0]).name}</p>
            <p className="truncate text-[10px] text-nighttx">{ROLE_LABEL[(s.me ?? s.users[0]).role]} · {(s.me ?? s.users[0]).email}</p>
          </div>
          <Icon name="sliders" size={13} className="shrink-0 text-nighttx opacity-0 transition-opacity group-hover:opacity-100" />
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
        className="h-9 w-full rounded-lg border border-line2 bg-card pl-9 pr-12 text-[13px] outline-none transition placeholder:text-faint focus:border-moss focus:shadow-[0_0_0_3px_rgb(224_145_60/0.16)]"
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
        title={can ? 'Create something new (N)' : 'Read-only role'}
        className={cx('press flex h-9 items-center gap-1.5 rounded-lg bg-moss px-3.5 text-[13px] font-semibold text-white shadow-btn transition-colors hover:bg-pine', open && 'bg-pine', !can && 'cursor-not-allowed opacity-50')}>
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
      <button onClick={() => setOpen(o => !o)} className="relative grid h-9 w-9 place-items-center rounded-lg border border-line bg-card text-ink2 transition-colors hover:border-line2 hover:text-ink">
        <Icon name="bell" size={16} />
        {unread > 0 && <span className="tnum absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 font-mono text-[9px] font-bold text-white ring-2 ring-paper">{unread}</span>}
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
      <span className={cx('h-1.5 w-1.5 rounded-full', syncing ? 'live-dot bg-butter' : 'bg-lime')} />
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

const GROUP_OF: Record<View, string> = {
  dashboard: 'Overview', inbox: 'Overview', tasks: 'Overview',
  contacts: 'CRM', deals: 'CRM',
  calendar: 'Marketing', campaigns: 'Marketing', marketing: 'Marketing', assets: 'Marketing',
  ai: 'Intelligence', listening: 'Intelligence', ads: 'Intelligence',
  automations: 'Growth', calls: 'Growth',
  insights: 'Insights', experiments: 'Insights', attribution: 'Insights',
  conversations: 'Reach', web: 'Reach', seo: 'Reach',
  cdp: 'Data Platform', emailinfra: 'Data Platform', importers: 'Data Platform',
  agents: 'Autonomy',
  security: 'Workspace', launch: 'Workspace', testing: 'Workspace', settings: 'Workspace',
};

function Topbar({ onMenu, onAsk }: { onMenu: () => void; onAsk: () => void }) {
  const { s } = useApp();
  const can = useCanEdit();
  const t = TITLES[s.view];
  return (
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-3 border-b border-line bg-paper/90 px-4 backdrop-blur-md md:px-6">
      <IconBtn name="more" onClick={onMenu} className="md:hidden" title="Menu" />
      <div key={s.view} className="anim-rise min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.22em] text-moss">
          <span className="inline-block h-[5px] w-[5px] rounded-[1.5px] bg-moss" />{GROUP_OF[s.view]}
        </p>
        <h1 className="truncate font-display text-[17.5px] font-bold leading-tight tracking-tight text-ink">{t.t}</h1>
      </div>
      <button onClick={onAsk} title="Ask Cadence (⌘K)"
        className="press hidden h-9 items-center gap-2 rounded-lg border border-line2 bg-card px-3 text-[12.5px] font-semibold text-ink shadow-hard-sm transition hover:border-moss/60 hover:text-pine md:flex">
        <Icon name="orbit" size={15} className="text-ember" /> Ask Cadence
        <kbd className="rounded border border-line bg-paper px-1 font-mono text-[9px] text-faint">⌘K</kbd>
      </button>
      <SyncTicker />
      <SearchBox />
      {!can && <Pill color="#e86a17" tint="#ffe9d4" className="hidden md:inline-flex"><Icon name="eye" size={11} /> Read-only</Pill>}
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
  const [copilot, setCopilot] = useState(false);
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
        setCopilot(p => !p);
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
        <Topbar onMenu={() => setMobileNav(true)} onAsk={() => setCopilot(true)} />
        <main className="bg-dots relative flex-1 overflow-y-auto">
          <div className="glow-top pointer-events-none absolute inset-x-0 top-0 h-72" />
          <div className="anim-drift pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full bg-moss/6 blur-3xl" />
          <div className="anim-drift2 pointer-events-none absolute -left-40 bottom-10 h-96 w-96 rounded-full bg-steel/6 blur-3xl" />
          <div key={s.view} className="anim-rise relative mx-auto max-w-[1400px] px-4 py-6 md:px-7">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette open={palette} onClose={() => setPalette(false)} />
      <Copilot open={copilot} onClose={() => setCopilot(false)} />
      <ShortcutsHelp open={help} onClose={() => setHelp(false)} />
      <ToastHost />
    </div>
  );
}
