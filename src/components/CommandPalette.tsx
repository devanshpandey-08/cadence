import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp } from '../store';
import { cx, fmtDate, Icon, STATUSES } from '../meta';
import type { View } from '../types';
import { Avatar } from './ui';

export const GMAP: Record<string, View> = {
  d: 'dashboard', i: 'inbox', t: 'tasks', c: 'contacts', p: 'deals', s: 'calendar', m: 'campaigns', f: 'marketing',
  a: 'ai', u: 'automations', l: 'listening', k: 'calls', r: 'ads', g: 'launch', q: 'testing', x: 'settings',
  n: 'insights', e: 'experiments', b: 'attribution', w: 'conversations', y: 'web', o: 'seo',
  h: 'cdp', j: 'emailinfra', z: 'importers', v: 'assets',
};

const NAV_LABEL: Record<View, string> = {
  dashboard: 'Dashboard', inbox: 'Inbox', tasks: 'Tasks', contacts: 'Contacts', deals: 'Deal pipeline',
  calendar: 'Content calendar', campaigns: 'Email campaigns', marketing: 'Forms & pages', assets: 'Asset library',
  ai: 'AI Studio', automations: 'Automations', listening: 'Social listening', calls: 'Calls', ads: 'Ads Manager',
  insights: 'Insights (BI)', experiments: 'A/B testing', attribution: 'Attribution',
  conversations: 'SMS & WhatsApp', web: 'Web analytics', seo: 'SEO suite',
  cdp: 'Identity & events', emailinfra: 'Email infrastructure', importers: 'Importers',
  agents: 'Agent Fleet', security: 'Security & sessions',
  launch: 'Launch console', testing: 'QA console', settings: 'Settings',
};
const NAV_ICON: Record<View, string> = {
  dashboard: 'dash', inbox: 'inbox', tasks: 'checksq', contacts: 'users', deals: 'kanban',
  calendar: 'calendar', campaigns: 'mail', marketing: 'layout', assets: 'image',
  ai: 'bolt', automations: 'refresh', listening: 'globe', calls: 'phone', ads: 'trend',
  insights: 'trend', experiments: 'layers', attribution: 'link',
  conversations: 'message', web: 'globe', seo: 'search',
  cdp: 'users', emailinfra: 'mail', importers: 'download',
  agents: 'cpu', security: 'shield',
  launch: 'pulse', testing: 'shield', settings: 'sliders',
};

interface Item {
  id: string;
  group: string;
  label: string;
  sub?: string;
  kbd?: string;
  icon: string;
  avatar?: string;
  run: () => void;
}

function Kbd({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <kbd className={cx(
      'inline-grid h-[19px] min-w-[19px] place-items-center rounded-[5px] border px-1 font-mono text-[10px] font-semibold leading-none',
      dark ? 'border-nightline bg-night2 text-nighttx' : 'border-line bg-paper text-mut',
    )}>{children}</kbd>
  );
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, a } = useApp();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) { setQ(''); setSel(0); window.setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const nav: Item[] = (Object.keys(NAV_LABEL) as View[]).map(v => ({
      id: 'nav-' + v, group: 'Navigate', label: `Go to ${NAV_LABEL[v]}`, kbd: 'g ' + (Object.entries(GMAP).find(([, x]) => x === v)?.[0] ?? ''),
      icon: NAV_ICON[v], run: () => a.nav(v),
    }));
    const acts: Item[] = [
      { id: 'new-post', group: 'Actions', label: 'Compose a post', sub: 'Write once, publish everywhere', kbd: 'n', icon: 'send', run: () => a.openComposer() },
      { id: 'new-contact', group: 'Actions', label: 'Add a contact', icon: 'users', run: () => a.ui({ view: 'contacts', create: 'contact', contactId: null }) },
      { id: 'new-deal', group: 'Actions', label: 'Add a deal', icon: 'kanban', run: () => a.ui({ view: 'deals', create: 'deal', dealId: null }) },
      { id: 'new-campaign', group: 'Actions', label: 'New email campaign', icon: 'mail', run: () => a.ui({ view: 'campaigns', create: 'campaign' }) },
      { id: 'new-task', group: 'Actions', label: 'Log a task', icon: 'checksq', run: () => a.ui({ view: 'tasks', create: 'task' }) },
      { id: 'import', group: 'Actions', label: 'One-click HubSpot import', sub: 'Contacts, companies, deals, lists', icon: 'download', run: () => a.nav('settings') },
      { id: 'reset', group: 'Actions', label: 'Reset demo data', sub: 'Back to the seeded workspace', icon: 'refresh', run: () => a.reset() },
    ];
    const t = q.trim().toLowerCase();
    const contacts: Item[] = (t.length >= 1
      ? s.contacts.filter(c => (c.name + ' ' + c.company + ' ' + c.email).toLowerCase().includes(t))
      : s.contacts).slice(0, 5).map(c => ({
        id: 'c-' + c.id, group: 'Contacts', label: c.name, sub: `${c.title} · ${c.company}`, avatar: c.name, icon: 'users', run: () => a.openContact(c.id),
      }));
    const deals: Item[] = (t.length >= 1
      ? s.deals.filter(d => d.name.toLowerCase().includes(t))
      : s.deals.filter(d => !['won', 'lost'].includes(d.stage))).slice(0, 4).map(d => ({
        id: 'd-' + d.id, group: 'Deals', label: d.name, sub: `$${(d.value / 1000).toFixed(1)}K · closes ${fmtDate(d.close)}`, icon: 'kanban', run: () => a.openDeal(d.id),
      }));
    const posts: Item[] = (t.length >= 1
      ? s.posts.filter(p => p.text.toLowerCase().includes(t))
      : s.posts.filter(p => p.status === 'pending' || p.status === 'scheduled').concat(s.posts)).slice(0, 4).map(p => ({
        id: 'p-' + p.id, group: 'Posts', label: p.text.length > 56 ? p.text.slice(0, 56) + '…' : p.text,
        sub: `${STATUSES[p.status].label} · ${fmtDate(p.date)} ${p.time}`, icon: 'calendar', run: () => a.openComposer({ postId: p.id }),
      }));
    const all = [...acts, ...nav, ...contacts, ...deals, ...posts];
    if (!t) return all;
    return all.filter(i => (i.label + ' ' + (i.sub ?? '')).toLowerCase().includes(t));
  }, [q, s.contacts, s.deals, s.posts, a]);

  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => {
    if (sel < 0 || sel >= items.length) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${sel}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [sel, items.length]);

  if (!open) return null;

  const run = (i: Item) => { i.run(); onClose(); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(x => Math.min(items.length - 1, x + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(x => Math.max(0, x - 1)); }
    else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); run(items[sel]); }
  };

  let lastGroup = '';
  let flat = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-night/55 anim-fade backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[560px] anim-pop overflow-hidden rounded-xl border border-line bg-card shadow-pop">
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Icon name="search" size={16} className="shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search contacts, deals, posts — or run a command…"
            className="h-12 w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
          <Kbd>esc</Kbd>
        </div>
        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-1.5">
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-mut">No matches for “{q}”. Try a name, deal, or command.</p>
          )}
          {items.map(i => {
            flat += 1;
            const idx = flat;
            const header = i.group !== lastGroup;
            lastGroup = i.group;
            return (
              <div key={i.id}>
                {header && (
                  <p className="px-2.5 pb-1 pt-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-faint">{i.group}</p>
                )}
                <button
                  data-i={idx}
                  onMouseEnter={() => setSel(idx)}
                  onClick={() => run(i)}
                  className={cx('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors', idx === sel ? 'bg-mint/80' : 'hover:bg-paper')}
                >
                  {i.avatar
                    ? <Avatar name={i.avatar} size={24} />
                    : <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded-md', idx === sel ? 'bg-moss/15 text-moss' : 'bg-paper text-mut')}><Icon name={i.icon} size={13} /></span>}
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13px] font-semibold text-ink">{i.label}</span>
                    {i.sub && <span className="block truncate text-[10.5px] text-mut">{i.sub}</span>}
                  </span>
                  {i.kbd && <span className="flex gap-0.5">{i.kbd.split(' ').map((k, j) => <Kbd key={j}>{k}</Kbd>)}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 border-t border-line bg-paper/70 px-4 py-2.5 font-mono text-[10px] text-faint">
          <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
          <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
          <span className="ml-auto flex items-center gap-1"><Kbd>?</Kbd> all shortcuts</span>
        </div>
      </div>
    </div>
  );
}
