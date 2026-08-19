import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import type {
  AppState, Campaign, Contact, Deal, FormDef, Notif, PageDef, Post, Stage, Task, Thread, ToastMsg, User, View,
} from './types';
import { LIST_SIZES, seedState } from './data';
import { addDays, isoOf, stageMeta, uid } from './meta';

const KEY = 'cadence-demo-v1';

type Action =
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

function reducer(s: AppState, a: Action): AppState {
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
    case 'import': return { ...s, contacts: [...a.contacts, ...s.contacts] };
    case 'reset': return seedState();
    default: return s;
  }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 1 && parsed.data && Array.isArray(parsed.data.contacts)) {
        return { ...parsed.data, toasts: [], composer: { open: false }, create: null };
      }
    }
  } catch { /* fall through to seed */ }
  return seedState();
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
  importContacts: (list: Contact[]) => void;
  reset: () => void;
}

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

  useEffect(() => {
    try {
      const { toasts: _t, ...rest } = s;
      localStorage.setItem(KEY, JSON.stringify({ version: 1, data: rest }));
    } catch { /* storage full or unavailable */ }
  }, [s]);

  const a = useMemo<Api>(() => {
    const toast = (text: string, kind: ToastMsg['kind'] = 'success') => {
      const id = uid();
      dispatch({ t: 'toast+', m: { id, text, kind } });
      window.setTimeout(() => dispatch({ t: 'toast-', id }), 4200);
    };
    const notify = (text: string, kind: Notif['kind'] = 'system') =>
      dispatch({ t: 'notif+', n: { id: uid(), text, at: isoOf(new Date()), read: false, kind } });

    return {
      nav: v => dispatch({ t: 'ui', p: { view: v, contactId: null, dealId: null } }),
      ui: p => dispatch({ t: 'ui', p }),
      openContact: id => dispatch({ t: 'ui', p: { view: 'contacts', contactId: id, dealId: null } }),
      openDeal: id => dispatch({ t: 'ui', p: { view: 'deals', dealId: id, contactId: null } }),
      openComposer: p => dispatch({ t: 'ui', p: { composer: { open: true, ...p } } }),
      closeComposer: () => dispatch({ t: 'ui', p: { composer: { open: false } } }),
      toast, notify,

      addContact: c => {
        const id = uid();
        const today = isoOf(new Date());
        dispatch({
          t: 'contact+',
          c: { ...c, id, createdAt: today, lastActivity: today, timeline: [{ id: uid(), type: 'note', text: 'Contact created', at: today }] },
        });
        toast(`${c.name} added to contacts`);
        return id;
      },
      patchContact: (id, p) => dispatch({ t: 'contact~', id, p }),
      logActivity: (contactId, type, text) => {
        const today = isoOf(new Date());
        const c = ref.current.contacts.find(x => x.id === contactId);
        if (!c) return;
        dispatch({ t: 'contact~', id: contactId, p: { lastActivity: today, timeline: [{ id: uid(), type, text, at: today }, ...c.timeline] } });
      },

      addDeal: dl => {
        dispatch({ t: 'deal+', dl: { ...dl, id: uid(), created: isoOf(new Date()), notes: [] } });
        toast(`Deal "${dl.name}" created in ${stageMeta(dl.stage).label}`);
      },
      patchDeal: (id, p) => dispatch({ t: 'deal~', id, p }),
      moveDeal: (id, stage) => {
        const dl = ref.current.deals.find(x => x.id === id);
        if (!dl || dl.stage === stage) return;
        dispatch({ t: 'deal~', id, p: { stage } });
        const c = ref.current.contacts.find(x => x.id === dl.contactId);
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
          toast(`Deal won — ${dl.name}`);
          notify(`Deal "${dl.name}" closed won`, 'system');
        } else {
          toast(`Moved to ${stageMeta(stage).label}`, 'info');
        }
      },

      addTask: t => { dispatch({ t: 'task+', task: { ...t, id: uid(), done: false } }); toast('Task added'); },
      toggleTask: id => {
        const t = ref.current.tasks.find(x => x.id === id);
        if (!t) return;
        dispatch({ t: 'task~', id, p: { done: !t.done } });
        if (!t.done) toast(`Completed — ${t.title}`, 'info');
      },
      removeTask: id => dispatch({ t: 'task-', id }),

      addPost: p => {
        const id = uid();
        dispatch({ t: 'post+', post: { ...p, id } });
        return id;
      },
      patchPost: (id, p) => dispatch({ t: 'post~', id, p }),
      movePost: (id, date) => {
        dispatch({ t: 'post~', id, p: { date } });
        toast('Post rescheduled', 'info');
      },
      removePost: id => { dispatch({ t: 'post-', id }); toast('Post deleted', 'warning'); },

      patchThread: (id, p) => dispatch({ t: 'thread~', id, p }),
      replyThread: (id, text) => {
        const th = ref.current.threads.find(x => x.id === id);
        if (!th) return;
        dispatch({
          t: 'thread~', id,
          p: {
            status: th.status === 'unread' ? 'progress' : th.status,
            messages: [...th.messages, { id: uid(), from: 'us' as const, text, at: isoOf(new Date()) }],
          },
        });
        if (th.contactId) {
          const c = ref.current.contacts.find(x => x.id === th.contactId);
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

      addCampaign: c => { dispatch({ t: 'campaign+', c: { ...c, id: uid(), sent: 0, opens: 0, clicks: 0 } }); toast(c.status === 'scheduled' ? 'Campaign scheduled' : 'Draft saved'); },
      sendCampaign: id => {
        const c = ref.current.campaigns.find(x => x.id === id);
        if (!c) return;
        const sent = LIST_SIZES[c.list] ?? 500;
        const opens = Math.round(sent * (0.36 + Math.random() * 0.16));
        const clicks = Math.round(opens * (0.09 + Math.random() * 0.06));
        dispatch({ t: 'campaign~', id, p: { status: 'sent', sent, opens, clicks, date: isoOf(new Date()) } });
        toast(`Sent to ${sent.toLocaleString()} subscribers via your SMTP`);
        notify(`Campaign "${c.name}" delivered — ${opens.toLocaleString()} opens so far`, 'system');
      },

      addForm: f => { dispatch({ t: 'form+', f: { ...f, id: uid(), submissions: 0, conv: 0, active: true } }); toast(`Form "${f.name}" created`); },
      patchForm: (id, p) => dispatch({ t: 'form~', id, p }),
      addPage: pg => { dispatch({ t: 'page+', pg: { ...pg, id: uid(), views: 0, submissions: 0, status: 'live' } }); toast(`Landing page published at ${pg.slug}.emberandoak.cadence.site`, 'info'); },

      patchUser: (id, p) => dispatch({ t: 'user~', id, p }),
      addUser: (name, email, role) => {
        dispatch({ t: 'user+', u: { id: uid(), name, email, role, color: '#2f8f83' } });
        toast(`Invite sent to ${email}`);
      },
      patchAccount: (id, p) => dispatch({ t: 'account~', id, p }),

      importContacts: list => {
        dispatch({ t: 'import', contacts: list });
        notify(`HubSpot import finished — ${list.length} contacts added`, 'import');
        toast(`Import complete — ${list.length} contacts added`);
      },

      reset: () => {
        try { localStorage.removeItem(KEY); } catch { /* noop */ }
        dispatch({ t: 'reset' });
        toast('Demo data reset', 'info');
      },
    };
  }, []);

  return <Ctx.Provider value={{ s, a }}>{children}</Ctx.Provider>;
}
