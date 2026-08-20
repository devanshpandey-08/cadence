import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import type {
  AppState, Campaign, Contact, Deal, FormDef, Notif, PageDef, Post, Stage, Task, Thread, ToastMsg, User, View,
} from './types';
import confetti from 'canvas-confetti';
import { authApi } from './services/backend';
import { LIST_SIZES, seedState } from './data';
import { addDays, isoOf, PLATFORMS, stageMeta, uid } from './meta';

export const KEY = 'cadence-v2';

export type Action =
  | { t: 'ui'; p: Partial<AppState> }
  | { t: 'toast+'; m: ToastMsg }
  | { t: 'toast-'; id: string }
  | { t: 'notif+'; n: Notif }
  | { t: 'notif-read' }
  | { t: 'contact+'; c: Contact }
  | { t: 'contact~'; id: string; p: Partial<Contact> }
  | { t: 'deal+'; dl: Deal }
  | { t: 'deal~'; id: string; p: Partial<Deal> }
  | { t: 'task+'; task: Task }
  | { t: 'task~'; id: string; p: Partial<Task> }
  | { t: 'task-'; id: string }
  | { t: 'post+'; post: Post }
  | { t: 'post~'; id: string; p: Partial<Post> }
  | { t: 'post-'; id: string }
  | { t: 'thread~'; id: string; p: Partial<Thread> }
  | { t: 'campaign+'; c: Campaign }
  | { t: 'campaign~'; id: string; p: Partial<Campaign> }
  | { t: 'form+'; f: FormDef }
  | { t: 'form~'; id: string; p: Partial<FormDef> }
  | { t: 'page+'; pg: PageDef }
  | { t: 'user+'; u: User }
  | { t: 'user~'; id: string; p: Partial<User> }
  | { t: 'account~'; id: string; p: Partial<Contact & object> & object }
  | { t: 'import'; contacts: Contact[] }
  | { t: 'reset' };

export function reducer(s: AppState, a: Action): AppState {
  switch (a.t) {
    case 'ui': return { ...s, ...a.p };
    case 'toast+': return { ...s, toasts: [...s.toasts.slice(-3), a.m] };
    case 'toast-': return { ...s, toasts: s.toasts.filter(t => t.id !== a.id) };
    case 'notif+': return { ...s, notifs: [a.n, ...s.notifs] };
    case 'notif-read': return { ...s, notifs: s.notifs.map(n => ({ ...n, read: true })) };
    case 'contact+': return { ...s, contacts: [a.c, ...s.contacts] };
    case 'contact~': return { ...s, contacts: s.contacts.map(c => c.id === a.id ? { ...c, ...a.p } : c) };
    case 'deal+': return { ...s, deals: [a.dl, ...s.deals] };
    case 'deal~': return { ...s, deals: s.deals.map(dl => dl.id === a.id ? { ...dl, ...a.p } : dl) };
    case 'task+': return { ...s, tasks: [a.task, ...s.tasks] };
    case 'task~': return { ...s, tasks: s.tasks.map(t => t.id === a.id ? { ...t, ...a.p } : t) };
    case 'task-': return { ...s, tasks: s.tasks.filter(t => t.id !== a.id) };
    case 'post+': return { ...s, posts: [a.post, ...s.posts] };
    case 'post~': return { ...s, posts: s.posts.map(p => p.id === a.id ? { ...p, ...a.p } : p) };
    case 'post-': return { ...s, posts: s.posts.filter(p => p.id !== a.id) };
    case 'thread~': return { ...s, threads: s.threads.map(t => t.id === a.id ? { ...t, ...a.p } : t) };
    case 'campaign+': return { ...s, campaigns: [a.c, ...s.campaigns] };
    case 'campaign~': return { ...s, campaigns: s.campaigns.map(c => c.id === a.id ? { ...c, ...a.p } : c) };
    case 'form+': return { ...s, forms: [a.f, ...s.forms] };
    case 'form~': return { ...s, forms: s.forms.map(f => f.id === a.id ? { ...f, ...a.p } : f) };
    case 'page+': return { ...s, pages: [a.pg, ...s.pages] };
    case 'user+': return { ...s, users: [...s.users, a.u] };
    case 'user~': return { ...s, users: s.users.map(u => u.id === a.id ? { ...u, ...a.p } : u) };
    case 'account~': return { ...s, accounts: s.accounts.map(ac => ac.id === a.id ? { ...ac, ...a.p } : ac) };
    case 'import': {
      // Dedupe by email (case-insensitive) and MERGE — never create a duplicate
      // person. On a match we keep the existing record (stable id), union tags,
      // and fold the imported timeline in front of the existing one.
      const byEmail = new Map<string, Contact>();
      for (const c of s.contacts) byEmail.set(c.email.toLowerCase(), c);
      const replacements = new Map<string, Contact>(); // existingId -> merged
      const fresh: Contact[] = [];
      for (const inc of a.contacts) {
        const key = inc.email.toLowerCase();
        const hit = byEmail.get(key);
        if (hit) {
          const merged: Contact = {
            ...hit,
            tags: Array.from(new Set([...hit.tags, ...inc.tags])),
            timeline: [...inc.timeline, ...hit.timeline],
            createdAt: inc.createdAt < hit.createdAt ? inc.createdAt : hit.createdAt,
          };
          byEmail.set(key, merged);
          replacements.set(hit.id, merged);
        } else {
          byEmail.set(key, inc);
          fresh.push(inc);
        }
      }
      const applyMerges = (c: Contact) => replacements.get(c.id) ?? c;
      return { ...s, contacts: [...fresh.map(applyMerges), ...s.contacts.map(applyMerges)] };
    }
    case 'reset': return seedState();
    default: return s;
  }
}

/** Parses a persisted payload; returns null when corrupt, versioned-out, or empty. */
export function parsePersisted(raw: string | null): AppState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 2 && parsed.data && Array.isArray(parsed.data.contacts)) {
      return { ...parsed.data } as AppState;
    }
    return null;
  } catch {
    return null;
  }
}

function load(): AppState {
  let base = seedState();
  try {
    base = parsePersisted(localStorage.getItem(KEY)) ?? base;
  } catch { /* storage unavailable */ }
  // Session restore flows through the auth service (GET /api/v1/me in production).
  return { ...base, me: authApi.restore(base.users), toasts: [], composer: { open: false }, create: null };
}

export interface Api {
  nav: (v: View) => void;
  ui: (p: Partial<AppState>) => void;
  openContact: (id: string) => void;
  openDeal: (id: string) => void;
  openComposer: (p?: { postId?: string; date?: string }) => void;
  closeComposer: () => void;
  toast: (text: string, kind?: ToastMsg['kind']) => void;
  notify: (text: string, kind?: Notif['kind']) => void;
  addContact: (c: Omit<Contact, 'id' | 'createdAt' | 'lastActivity' | 'timeline'>) => string;
  patchContact: (id: string, p: Partial<Contact>) => void;
  logActivity: (contactId: string, type: Contact['timeline'][number]['type'], text: string) => void;
  addDeal: (dl: Omit<Deal, 'id' | 'created' | 'notes'>) => void;
  patchDeal: (id: string, p: Partial<Deal>) => void;
  moveDeal: (id: string, stage: Stage) => void;
  addTask: (t: Omit<Task, 'id' | 'done'>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  addPost: (p: Omit<Post, 'id'>) => string;
  patchPost: (id: string, p: Partial<Post>) => void;
  movePost: (id: string, date: string) => void;
  removePost: (id: string) => void;
  patchThread: (id: string, p: Partial<Thread>) => void;
  replyThread: (id: string, text: string) => void;
  addCampaign: (c: Omit<Campaign, 'id' | 'sent' | 'opens' | 'clicks'>) => void;
  sendCampaign: (id: string) => void;
  addForm: (f: Omit<FormDef, 'id' | 'submissions' | 'conv' | 'active'>) => void;
  patchForm: (id: string, p: Partial<FormDef>) => void;
  addPage: (pg: Omit<PageDef, 'id' | 'views' | 'submissions' | 'status'>) => void;
  patchUser: (id: string, p: Partial<User>) => void;
  addUser: (name: string, email: string, role: User['role']) => void;
  patchAccount: (id: string, p: { connected: boolean }) => void;
  importContacts: (list: Contact[]) => { added: number; merged: number };
  reset: () => void;
  login: (userId: string, remember: boolean) => void;
  logout: () => void;
}

/**
 * The domain core — dependency-injected so the React provider and the QA
 * harness execute the identical code path. Side effects (toasts, confetti,
 * storage) arrive through `deps`, keeping every transition pure & testable.
 */
export interface ApiDeps {
  get: () => AppState;
  dispatch: (a: Action) => void;
  toast: (text: string, kind?: ToastMsg['kind']) => void;
  notify: (text: string, kind?: Notif['kind']) => void;
  celebrate?: (big?: boolean) => void;
  persist?: boolean;
}

export function makeApi(deps: ApiDeps): Api {
  const { get, dispatch, toast, notify } = deps;
  /* ---- permission gates (mirrors server-side RBAC middleware) ---- */
  const requireEdit = () => {
    const me = get().me;
    if (me && me.role === 'viewer') { toast('Viewer role is read-only — ask an Admin for Editor access', 'warning'); return false; }
    return true;
  };
  const requireAdmin = () => {
    const me = get().me;
    if (me && me.role !== 'admin') { toast('Only Admins can manage users & billing', 'warning'); return false; }
    return true;
  };
  const celebrate = (big = false) => deps.celebrate?.(big);

  return {
    nav: v => dispatch({ t: 'ui', p: { view: v, contactId: null, dealId: null } }),
    ui: p => dispatch({ t: 'ui', p }),
    openContact: id => dispatch({ t: 'ui', p: { view: 'contacts', contactId: id, dealId: null } }),
    openDeal: id => dispatch({ t: 'ui', p: { view: 'deals', dealId: id, contactId: null } }),
    openComposer: p => {
      const me = get().me;
      if (me && me.role === 'viewer') {
        toast('Viewer role is read-only — ask an Admin for Editor access', 'warning');
        return;
      }
      dispatch({ t: 'ui', p: { composer: { open: true, ...p } } });
    },
    closeComposer: () => dispatch({ t: 'ui', p: { composer: { open: false } } }),
    toast, notify,

    addContact: c => {
      if (!requireEdit()) return '';
      const id = uid();
      const today = isoOf(new Date());
      dispatch({
        t: 'contact+',
        c: { ...c, id, createdAt: today, lastActivity: today, timeline: [{ id: uid(), type: 'note', text: 'Contact created', at: today }] },
      });
      toast(`${c.name} added to contacts`);
      return id;
    },
    patchContact: (id, p) => { if (requireEdit()) dispatch({ t: 'contact~', id, p }); },
    logActivity: (contactId, type, text) => {
      if (!requireEdit()) return;
      const today = isoOf(new Date());
      const c = get().contacts.find(x => x.id === contactId);
      if (!c) return;
      dispatch({ t: 'contact~', id: contactId, p: { lastActivity: today, timeline: [{ id: uid(), type, text, at: today }, ...c.timeline] } });
    },

    addDeal: dl => {
      if (!requireEdit()) return;
      dispatch({ t: 'deal+', dl: { ...dl, id: uid(), created: isoOf(new Date()), notes: [] } });
      toast(`Deal "${dl.name}" created in ${stageMeta(dl.stage).label}`);
    },
    patchDeal: (id, p) => { if (requireEdit()) dispatch({ t: 'deal~', id, p }); },
    moveDeal: (id, stage) => {
      if (!requireEdit()) return;
      const dl = get().deals.find(x => x.id === id);
      if (!dl || dl.stage === stage) return;
      dispatch({ t: 'deal~', id, p: { stage } });
      const c = get().contacts.find(x => x.id === dl.contactId);
      if (c) {
        dispatch({
          t: 'contact~', id: c.id,
          p: { lastActivity: isoOf(new Date()), timeline: [{ id: uid(), type: 'deal' as const, text: `Deal "${dl.name}" moved to ${stageMeta(stage).label}`, at: isoOf(new Date()) }, ...c.timeline] },
        });
      }
      if (stage === 'proposal') {
        const task: Task = {
          id: uid(), title: `Send contract — ${dl.name}`, due: isoOf(addDays(new Date(), 1)),
          done: false, priority: 'high', assignee: dl.owner, dealId: dl.id, auto: true,
        };
        dispatch({ t: 'task+', task });
        notify(`Automation created task "Send contract — ${dl.name}"`, 'auto');
        toast('Automation · "Send contract" task created', 'info');
      } else if (stage === 'won') {
        celebrate(true);
        toast(`Deal won — ${dl.name}`);
        notify(`Deal "${dl.name}" closed won`, 'system');
      } else {
        toast(`Moved to ${stageMeta(stage).label}`, 'info');
      }
    },

    addTask: t => { if (!requireEdit()) return; dispatch({ t: 'task+', task: { ...t, id: uid(), done: false } }); toast('Task added'); },
    toggleTask: id => {
      if (!requireEdit()) return;
      const t = get().tasks.find(x => x.id === id);
      if (!t) return;
      dispatch({ t: 'task~', id, p: { done: !t.done } });
      if (!t.done) toast(`Completed — ${t.title}`, 'info');
    },
    removeTask: id => { if (requireEdit()) dispatch({ t: 'task-', id }); },

    addPost: p => {
      if (!requireEdit()) return '';
      const id = uid();
      dispatch({ t: 'post+', post: { ...p, id } });
      return id;
    },
    patchPost: (id, p) => { if (requireEdit()) dispatch({ t: 'post~', id, p }); },
    movePost: (id, date) => {
      if (!requireEdit()) return;
      dispatch({ t: 'post~', id, p: { date } });
      toast('Post rescheduled', 'info');
    },
    removePost: id => { if (requireEdit()) { dispatch({ t: 'post-', id }); toast('Post deleted', 'warning'); } },

    patchThread: (id, p) => { if (requireEdit()) dispatch({ t: 'thread~', id, p }); },
    replyThread: (id, text) => {
      if (!requireEdit()) return;
      const th = get().threads.find(x => x.id === id);
      if (!th) return;
      dispatch({
        t: 'thread~', id,
        p: {
          status: th.status === 'unread' ? 'progress' : th.status,
          messages: [...th.messages, { id: uid(), from: 'us' as const, text, at: isoOf(new Date()) }],
        },
      });
      if (th.contactId) {
        const c = get().contacts.find(x => x.id === th.contactId);
        if (c) {
          dispatch({
            t: 'contact~', id: c.id,
            p: { lastActivity: isoOf(new Date()), timeline: [{ id: uid(), type: 'social' as const, text: `Replied to ${th.person} on ${th.platform}`, at: isoOf(new Date()) }, ...c.timeline] },
          });
        }
      } else {
        const cid = uid();
        dispatch({
          t: 'contact+',
          c: {
            id: cid, name: th.person.replace('@', ''), email: `${th.person.replace('@', '')}@social.import`, company: '—', title: 'Social contact',
            source: 'Social', tags: ['lead'], owner: 'Maya Chen', createdAt: isoOf(new Date()), lastActivity: isoOf(new Date()), fromSocial: true,
            timeline: [{ id: uid(), type: 'social', text: `Auto-created from ${th.platform} ${th.kind}`, at: isoOf(new Date()) }],
          },
        });
        dispatch({ t: 'thread~', id, p: { contactId: cid } });
        toast('Contact auto-created from social', 'info');
        notify(`New contact auto-created from ${th.platform} ${th.kind}`, 'auto');
      }
    },

    addCampaign: c => { if (!requireEdit()) return; dispatch({ t: 'campaign+', c: { ...c, id: uid(), sent: 0, opens: 0, clicks: 0 } }); toast(c.status === 'scheduled' ? 'Campaign scheduled' : 'Draft saved'); },
    sendCampaign: id => {
      if (!requireEdit()) return;
      const c = get().campaigns.find(x => x.id === id);
      if (!c) return;
      const sent = LIST_SIZES[c.list] ?? 500;
      const opens = Math.round(sent * (0.36 + Math.random() * 0.16));
      const clicks = Math.round(opens * (0.09 + Math.random() * 0.06));
      dispatch({ t: 'campaign~', id, p: { status: 'sent', sent, opens, clicks, date: isoOf(new Date()) } });
      celebrate();
      toast(`Sent to ${sent.toLocaleString()} subscribers via your SMTP`);
      notify(`Campaign "${c.name}" delivered — ${opens.toLocaleString()} opens so far`, 'system');
    },

    addForm: f => { if (!requireEdit()) return; dispatch({ t: 'form+', f: { ...f, id: uid(), submissions: 0, conv: 0, active: true } }); toast(`Form "${f.name}" created`); },
    patchForm: (id, p) => { if (requireEdit()) dispatch({ t: 'form~', id, p }); },
    addPage: pg => { if (!requireEdit()) return; dispatch({ t: 'page+', pg: { ...pg, id: uid(), views: 0, submissions: 0, status: 'live' } }); toast(`Landing page published at ${pg.slug}.emberandoak.cadence.site`, 'info'); },

    patchUser: (id, p) => { if (requireAdmin()) dispatch({ t: 'user~', id, p }); },
    addUser: (name, email, role) => {
      if (!requireAdmin()) return;
      dispatch({ t: 'user+', u: { id: uid(), name, email, role, color: '#2f8f83' } });
      toast(`Invite sent to ${email}`);
    },
    patchAccount: (id, p) => { if (requireEdit()) dispatch({ t: 'account~', id, p }); },

    importContacts: list => {
      // Truthful accounting: compute the dedupe outcome BEFORE dispatching.
      const existing = new Set(get().contacts.map((c: Contact) => c.email.toLowerCase()));
      let merged = 0;
      for (const c of list) {
        if (existing.has(c.email.toLowerCase())) merged += 1;
        else existing.add(c.email.toLowerCase());
      }
      const added = list.length - merged;
      if (!requireEdit()) return { added, merged };
      dispatch({ t: 'import', contacts: list });
      notify(`Import finished — ${added.toLocaleString()} new, ${merged.toLocaleString()} merged (deduped)`, 'import');
      toast(`Import complete — ${added.toLocaleString()} added · ${merged.toLocaleString()} merged, 0 duplicates`);
      return { added, merged };
    },

    reset: () => {
      if (deps.persist) { try { localStorage.removeItem(KEY); } catch { /* noop */ } }
      dispatch({ t: 'reset' });
      toast('Demo data reset', 'info');
    },

    login: (userId, remember) => {
      const u = get().users.find(x => x.id === userId);
      if (!u) return;
      dispatch({ t: 'ui', p: { me: u } });
      notify(`Signed in as ${u.name} · ${u.role === 'viewer' ? 'read-only session' : 'workspace ready'}`, 'system');
      void remember; // authApi already persisted the session token
    },
    logout: () => {
      authApi.logout();
      dispatch({ t: 'ui', p: { me: null, view: 'dashboard', contactId: null, dealId: null } });
    },
  };
}

/** Role gate — Viewers get read-only access everywhere. */
export const useCanEdit = () => {
  const { s } = useApp();
  return s.me ? s.me.role !== 'viewer' : true;
};

const Ctx = createContext<{ s: AppState; a: Api } | null>(null);

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, load);
  const ref = useRef(s);
  ref.current = s;

  /* persistence — debounced so ambient ticks and rapid input batch into one write */
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const { toasts: _t, me: _m, ...rest } = s;
        localStorage.setItem(KEY, JSON.stringify({ version: 2, "data": rest }));
      } catch { /* storage full or unavailable */ }
    }, 350);
    return () => window.clearTimeout(t);
  }, [s]);

  /* flush on close so the last action is never lost */
  useEffect(() => {
    const flush = () => {
      try {
        const { toasts: _t, me: _m, ...rest } = ref.current;
        localStorage.setItem(KEY, JSON.stringify({ version: 2, "data": rest }));
      } catch { /* noop */ }
    };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  /* ---------- ambient life ----------
     The workspace keeps breathing while you watch. In production these events
     stream in over WebSocket from the sync workers; here they're simulated —
     but they flow through the exact same reducer as real user actions. */
  useEffect(() => {
    const NAMES = ['Ava Lindqvist', 'Marcus Webb', 'Noor Haddad', 'Tom Okafor', 'Lena Fischer', 'Diego Ramos'];
    const COMPANIES = ['Fjord Coffee Co.', 'Bean & Barrel', 'Kettle House', 'North Loop Café', 'Grindhouse PDX'];
    const MSGS = [
      'Is the spring blend available for wholesale yet?',
      'Do you ship to Canada? Looking at two locations.',
      'That latte art reel was 🔥 — what machine is that?',
      'Can we get a sample pack before committing?',
      'When does the summer cold brew drop?',
    ];
    const t = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return; // hidden tab — save the cycles
      const st = ref.current;
      if (!st.me) return; // signed out — no noise on the login screen
      const push = (text: string, kind: 'auto' | 'system' = 'system') =>
        dispatch({ t: 'notif+', n: { id: uid(), text, at: isoOf(new Date()), read: false, kind } });
      const roll = Math.random();
      if (roll < 0.42 && st.threads.length > 0) {
        // incoming social message — the inbox goes live
        const th = st.threads[Math.floor(Math.random() * st.threads.length)];
        dispatch({
          t: 'thread~', id: th.id,
          p: { status: 'unread', messages: [...th.messages, { id: uid(), from: 'them', text: MSGS[Math.floor(Math.random() * MSGS.length)], at: isoOf(new Date()) }] },
        });
        push(`New ${th.kind} from ${th.person} on ${PLATFORMS[th.platform].name}`);
      } else if (roll < 0.72) {
        // engagement tick on a published post
        const pubs = st.posts.filter(p => p.status === 'published');
        if (pubs.length > 0) {
          const p = pubs[Math.floor(Math.random() * pubs.length)];
          const likes = (p.likes ?? 0) + 3 + Math.floor(Math.random() * 18);
          dispatch({
            t: 'post~', id: p.id,
            p: { likes, comments: (p.comments ?? 0) + (Math.random() < 0.5 ? 1 : 0), shares: (p.shares ?? 0) + (Math.random() < 0.3 ? 1 : 0) },
          });
          if (likes > 45) push(`A post is gaining traction — ${likes} likes on ${PLATFORMS[p.platforms[0]].name}`, 'auto');
        }
      } else if (st.contacts.length < 25) {
        // a form converts — a new contact lands in the CRM
        // (capped at the Growth-plan demo quota so the meter never overflows)
        const form = st.forms[0];
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        const co = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
        const today = isoOf(new Date());
        dispatch({
          t: 'contact+',
          c: {
            id: uid(), name,
            email: `${name.split(' ')[0].toLowerCase()}@${co.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')}.com`,
            company: co, title: 'Owner', source: 'Form', tags: ['lead'], owner: 'Maya Chen',
            createdAt: today, lastActivity: today,
            timeline: [{ id: uid(), type: 'form', text: `Filled out "${form?.name ?? 'Demo request'}"`, at: today }],
          },
        });
        if (form) dispatch({ t: 'form~', id: form.id, p: { submissions: form.submissions + 1 } });
        push(`New lead: ${name} via "${form?.name ?? 'your form'}"`, 'auto');
      }
    }, 24000);
    return () => window.clearInterval(t);
  }, [dispatch]);

  const a = useMemo<Api>(() => makeApi({
    get: () => ref.current,
    dispatch,
    toast: (text, kind = 'success') => {
      const id = uid();
      dispatch({ t: 'toast+', m: { id, text, kind } });
      window.setTimeout(() => dispatch({ t: 'toast-', id }), 4200);
    },
    notify: (text, kind = 'system') =>
      dispatch({ t: 'notif+', n: { id: uid(), text, at: isoOf(new Date()), read: false, kind } }),
    celebrate: (big = false) => {
      try {
        const colors = ['#0e7a52', '#3e7cb1', '#c08a1e', '#2f8f83', '#f1f2ec'];
        confetti({ particleCount: big ? 130 : 55, spread: big ? 75 : 55, startVelocity: big ? 38 : 26, origin: { y: 0.7 }, colors, disableForReducedMotion: true });
        if (big) window.setTimeout(() => confetti({ particleCount: 70, spread: 90, origin: { y: 0.65, x: 0.6 }, colors, disableForReducedMotion: true }), 180);
      } catch { /* confetti unavailable */ }
    },
    persist: true,
  }), []);

  return <Ctx.Provider value={{ s, a }}>{children}</Ctx.Provider>;
}
