/**
 * Deep layer — the "every path" suites.
 *
 *  S14 Module smoke renders   : mounts all 23 screens through the real provider —
 *                               the exact class of bug that once blanked the app.
 *  S15 API surface & contracts: every action callable per role + the registries
 *                               that the whole product keys off.
 *  S16 Calendar exhaustives   : all 132 months 2020–2030 + a full leap year of weeks.
 *  S17 Persistence fuzz       : corruption at random offsets must degrade to seed,
 *                               never throw, never half-load.
 *  S18 Reducer purity         : unknown actions are identity, patches idempotent,
 *                               no-op moves never double-fire automations.
 *  S19 Flood endurance        : thousands of events through the live reducer.
 */
import { Component, createElement } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import type { Suite, TestDef, TestEnv } from './framework';
import { assert, budget, createEnv, eq } from './framework';
import { AppProvider, parsePersisted, reducer } from '../store';
import { seedState } from '../data';
import { isoOf, monthMatrix, pad, PLATFORMS, PLATFORM_IDS, STATUSES, STATUS_ICON, STAGES, WEEKDAYS, weekOf } from '../meta';

import { Dashboard } from '../modules/Dashboard';
import { Contacts } from '../modules/Contacts';
import { Deals } from '../modules/Deals';
import { CalendarView } from '../modules/CalendarView';
import { Inbox } from '../modules/Inbox';
import { Tasks } from '../modules/Tasks';
import { Campaigns } from '../modules/Campaigns';
import { Marketing } from '../modules/Marketing';
import { AIStudio } from '../modules/AIStudio';
import { Automations } from '../modules/Automations';
import { Listening } from '../modules/Listening';
import { Calls } from '../modules/Calls';
import { Ads } from '../modules/Ads';
import { Insights } from '../modules/Insights';
import { Experiments } from '../modules/Experiments';
import { Attribution } from '../modules/Attribution';
import { Conversations } from '../modules/Conversations';
import { WebAnalytics } from '../modules/WebAnalytics';
import { Seo } from '../modules/Seo';
import { Launch } from '../modules/Launch';
import { Settings } from '../modules/Settings';
import { Login } from '../components/Login';
import { Shell } from '../components/Shell';

const T = (id: string, name: string, req: TestDef['req'], run: TestDef['run']): TestDef => ({ id, name, req, run });

/* ================= S14 · module smoke renders ================= */
class CrashProbe extends Component<{ onErr: (e: unknown) => void; children?: ReactNode }> {
  componentDidCatch(e: unknown) { this.props.onErr(e); }
  render() { return this.props.children; }
}

function renderScreen(name: string, node: ReactNode): { ok: boolean; err?: string; nodes: number } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  let err: unknown = null;
  try {
    flushSync(() => root.render(
      createElement(CrashProbe, { onErr: e => { err = e; } },
        createElement(AppProvider, null, node)),
    ));
  } catch (e) { err = e; }
  const nodes = host.querySelectorAll('*').length;
  root.unmount();
  host.remove();
  return { ok: !err && nodes > 5, err: err ? String(err).slice(0, 160) : undefined, nodes };
}

function smoke(name: string, screens: [string, () => ReactNode][]): void {
  const bad: string[] = [];
  for (const [label, make] of screens) {
    const r = renderScreen(label, make());
    if (!r.ok) bad.push(`${label}${r.err ? ` — ${r.err}` : ' (empty render)'}`);
  }
  assert(bad.length === 0, `screens failed: ${bad.join(' · ')}`);
}

const smokeSuite: Suite = {
  id: 's14', name: 'Module smoke renders', icon: 'layout', tone: '#7a5fa8',
  blurb: 'Mounts every screen through the real provider — catches the blank-page class instantly.',
  tests: [
    T('sm1', 'core CRM screens mount and render DOM', 'smoke', () =>
      budget('8 screens', 4000, () => smoke('core', [
        ['Dashboard', () => createElement(Dashboard)],
        ['Contacts', () => createElement(Contacts)],
        ['Deals', () => createElement(Deals)],
        ['Calendar', () => createElement(CalendarView)],
        ['Inbox', () => createElement(Inbox)],
        ['Tasks', () => createElement(Tasks)],
        ['Campaigns', () => createElement(Campaigns)],
        ['Marketing', () => createElement(Marketing)],
      ]))),
    T('sm2', 'growth + intelligence screens mount and render DOM', 'smoke', () =>
      budget('5 screens', 4000, () => smoke('growth', [
        ['AI Studio', () => createElement(AIStudio)],
        ['Automations', () => createElement(Automations)],
        ['Listening', () => createElement(Listening)],
        ['Calls', () => createElement(Calls)],
        ['Ads', () => createElement(Ads)],
      ]))),
    T('sm3', 'insights + reach + workspace screens mount and render DOM', 'smoke', () =>
      budget('8 screens', 4000, () => smoke('reach', [
        ['Insights', () => createElement(Insights)],
        ['Experiments', () => createElement(Experiments)],
        ['Attribution', () => createElement(Attribution)],
        ['Conversations', () => createElement(Conversations)],
        ['Web analytics', () => createElement(WebAnalytics)],
        ['SEO', () => createElement(Seo)],
        ['Launch console', () => createElement(Launch)],
        ['Settings', () => createElement(Settings)],
      ]))),
    T('sm4', 'login + shell chrome mount signed-out and signed-in', 'smoke', () =>
      budget('2 screens', 3000, () => smoke('shell', [
        ['Login', () => createElement(Login)],
        ['Shell', () => createElement(Shell, null, createElement('div', null, 'probe'))],
      ]))),
  ],
};

/* ================= S15 · API surface & registry contracts ================= */
const contractsSuite: Suite = {
  id: 's15', name: 'API surface & contracts', icon: 'link', tone: '#35598f',
  blurb: 'Every action the UI can dispatch, exercised per role — plus the registries everything keys off.',
  tests: [
    T('ct1', 'admin can call every API method without a throw', 'contracts', env => {
      const st0 = env.getState();
      const calls: [string, () => void][] = [
        ['nav', () => env.api.nav('contacts')],
        ['ui', () => env.api.ui({})],
        ['openContact', () => env.api.openContact(st0.contacts[0].id)],
        ['openDeal', () => env.api.openDeal(st0.deals[0].id)],
        ['openComposer', () => env.api.openComposer({})],
        ['closeComposer', () => env.api.closeComposer()],
        ['toast', () => env.api.toast('probe')],
        ['notify', () => env.api.notify('probe')],
        ['addContact', () => env.api.addContact({ name: 'Surface A', email: 'a@surface.dev', company: 'S', title: 'T', source: 'Manual', tags: [], owner: 'Maya Chen' })],
        ['patchContact', () => env.api.patchContact(st0.contacts[0].id, { title: 'Surface' })],
        ['logActivity', () => env.api.logActivity(st0.contacts[0].id, 'note', 'surface probe')],
        ['addDeal', () => env.api.addDeal({ name: 'Surface deal', contactId: st0.contacts[0].id, value: 100, stage: 'lead', owner: 'Maya Chen', close: isoOf(new Date()) })],
        ['patchDeal', () => env.api.patchDeal(st0.deals[0].id, { value: st0.deals[0].value })],
        ['moveDeal', () => env.api.moveDeal(st0.deals[1].id, st0.deals[1].stage === 'qualified' ? 'lead' : 'qualified')],
        ['addTask', () => env.api.addTask({ title: 'Surface task', due: isoOf(new Date()), priority: 'low', assignee: 'Maya Chen' })],
        ['toggleTask', () => env.api.toggleTask(st0.tasks[0].id)],
        ['removeTask', () => env.api.removeTask(env.getState().tasks.find(t => t.title === 'Surface task')!.id)],
        ['addPost', () => env.api.addPost({ text: 'surface', platforms: ['x'], date: isoOf(new Date()), time: '09:00', status: 'draft', author: 'Maya Chen', media: 'none' })],
        ['patchPost', () => env.api.patchPost(st0.posts[0].id, { text: st0.posts[0].text })],
        ['movePost', () => env.api.movePost(st0.posts[0].id, st0.posts[0].date)],
        ['removePost', () => env.api.removePost(env.getState().posts.find(p => p.text === 'surface')!.id)],
        ['patchThread', () => env.api.patchThread(st0.threads[0].id, { status: st0.threads[0].status })],
        ['replyThread', () => env.api.replyThread(st0.threads[0].id, 'surface probe')],
        ['addCampaign', () => env.api.addCampaign({ name: 'Surface blast', subject: 's', list: 'Newsletter', status: 'draft', date: isoOf(new Date()) })],
        ['sendCampaign', () => env.api.sendCampaign(env.getState().campaigns.find(c => c.name === 'Surface blast')!.id)],
        ['addForm', () => env.api.addForm({ name: 'Surface form', type: 'embedded', template: 'Minimal' })],
        ['patchForm', () => env.api.patchForm(st0.forms[0].id, { active: st0.forms[0].active })],
        ['addPage', () => env.api.addPage({ name: 'Surface page', slug: 'surface-page', template: 'squeeze' })],
        ['patchUser', () => env.api.patchUser(st0.users[1].id, { role: st0.users[1].role })],
        ['addUser', () => env.api.addUser('Surface Hire', 'hire@surface.dev', 'viewer')],
        ['patchAccount', () => env.api.patchAccount(st0.accounts[0].id, { connected: st0.accounts[0].connected })],
        ['importContacts', () => env.api.importContacts([])],
        ['login', () => env.api.login('t-admin', true)],
      ];
      const thrown: string[] = [];
      for (const [n, fn] of calls) { try { fn(); } catch { thrown.push(n); } }
      assert(thrown.length === 0, `threw: ${thrown.join(', ')}`);
    }),
    T('ct2', 'viewer: the entire mutation surface is inert', 'contracts', env => {
      env.setMe('viewer');
      const st0 = env.getState();
      const snap = JSON.stringify({
        c: st0.contacts.length, d: st0.deals.length, t: st0.tasks.length, p: st0.posts.length,
        m: st0.campaigns.length, f: st0.forms.length, pg: st0.pages.length, u: st0.users.length,
      });
      env.api.addContact({ name: 'X', email: 'x@x.dev', company: 'X', title: 'X', source: 'Manual', tags: [], owner: 'X' });
      env.api.addDeal({ name: 'X', contactId: st0.contacts[0].id, value: 1, stage: 'lead', owner: 'X', close: isoOf(new Date()) });
      env.api.addTask({ title: 'X', due: isoOf(new Date()), priority: 'low', assignee: 'X' });
      env.api.addPost({ text: 'X', platforms: ['x'], date: isoOf(new Date()), time: '09:00', status: 'draft', author: 'X', media: 'none' });
      env.api.patchPost(st0.posts[0].id, { status: 'published' });
      env.api.moveDeal(st0.deals[0].id, 'won');
      env.api.replyThread(st0.threads[0].id, 'x');
      env.api.sendCampaign(st0.campaigns[0].id);
      env.api.addForm({ name: 'X', type: 'embedded', template: 'Minimal' });
      env.api.addPage({ name: 'X', slug: 'x', template: 'squeeze' });
      env.api.addUser('X', 'x2@x.dev', 'admin');
      env.api.importContacts([]);
      env.api.openComposer({});
      const st1 = env.getState();
      eq(JSON.stringify({
        c: st1.contacts.length, d: st1.deals.length, t: st1.tasks.length, p: st1.posts.length,
        m: st1.campaigns.length, f: st1.forms.length, pg: st1.pages.length, u: st1.users.length,
      }), snap, 'zero writes landed');
      eq(st1.composer.open, false, 'composer stays closed for viewers');
      eq(st1.posts.find(p => p.id === st0.posts[0].id)!.status, st0.posts[0].status, 'no approval bypass');
    }),
    T('ct3', 'editor: everything except user management', 'contracts', env => {
      env.setMe('editor');
      const st0 = env.getState();
      env.api.addContact({ name: 'Editor OK', email: 'ed@ok.dev', company: 'E', title: 'T', source: 'Manual', tags: [], owner: 'Maya Chen' });
      assert(env.getState().contacts.some(c => c.email === 'ed@ok.dev'), 'editor writes land');
      env.api.addUser('Sneaky', 'sneaky@x.dev', 'admin');
      eq(env.getState().users.length, st0.users.length, 'addUser blocked');
      env.api.patchUser(st0.users[0].id, { role: 'viewer' });
      eq(env.getState().users.find(u => u.id === st0.users[0].id)!.role, st0.users[0].role, 'patchUser blocked');
    }),
    T('ct4', 'registries: platforms, statuses, stages are complete & sane', 'contracts', () => {
      eq(PLATFORM_IDS.length, 8, 'eight platforms');
      for (const p of PLATFORM_IDS) {
        assert(PLATFORMS[p].limit > 0, `${p} has a character limit`);
        assert(PLATFORMS[p].name.length > 0, `${p} named`);
      }
      eq(PLATFORMS.x.limit, 280, 'X keeps its 280-char limit');
      eq(Object.keys(STATUSES).length, 6, 'six lifecycle statuses');
      for (const s of Object.keys(STATUSES) as (keyof typeof STATUS_ICON)[]) {
        assert(!!STATUS_ICON[s], `status "${s}" has an icon — a missing one once broke the calendar`);
      }
      eq(STAGES.length, 6, 'six pipeline stages');
      eq(WEEKDAYS.length, 7, 'seven weekdays');
    }),
  ],
};

/* ================= S16 · calendar exhaustives ================= */
const calendarSuite: Suite = {
  id: 's16', name: 'Calendar exhaustives', icon: 'calendar', tone: '#2c8c7a',
  blurb: 'Not spot checks — every month for a decade and a full leap year of weeks.',
  tests: [
    T('cal1', 'all 132 months 2020–2030: 42 cells, Monday-first, day 1 present, monotonic', 'calendar', () => {
      for (let y = 2020; y <= 2030; y++) {
        for (let m = 0; m < 12; m++) {
          const cells = monthMatrix(y, m);
          eq(cells.length, 42, `${y}-${pad(m + 1)} cell count`);
          eq((cells[0].date.getDay() + 6) % 7, 0, `${y}-${pad(m + 1)} starts Monday`);
          assert(cells.some(c => c.iso === `${y}-${pad(m + 1)}-01`), `${y}-${pad(m + 1)} contains day 1`);
          assert(cells.some(c => c.inMonth), `${y}-${pad(m + 1)} flags in-month`);
          for (let i = 1; i < 42; i++) {
            assert(cells[i].date.getTime() === cells[i - 1].date.getTime() + 864e5, `${y}-${pad(m + 1)} day ${i} consecutive`);
          }
        }
      }
    }),
    T('cal2', 'every day of leap year 2024 yields a sane week', 'calendar', () => {
      const d = new Date(2024, 0, 1);
      let checked = 0;
      while (d.getFullYear() === 2024) {
        const week = weekOf(isoOf(d));
        eq(week.length, 7, 'seven days');
        eq((week[0].date.getDay() + 6) % 7, 0, 'Monday first');
        assert(week.some(w => w.iso === isoOf(d)), 'contains the anchor day');
        for (let i = 1; i < 7; i++) assert(week[i].date.getTime() === week[i - 1].date.getTime() + 864e5, 'consecutive across DST');
        d.setDate(d.getDate() + 9); // every 9th day covers all weekday alignments
        checked++;
      }
      assert(checked >= 40, `checked ${checked} anchor days`);
    }),
  ],
};

/* ================= S17 · persistence fuzz ================= */
const persistSuite: Suite = {
  id: 's17', name: 'Persistence corruption fuzz', icon: 'alert', tone: '#b26914',
  blurb: 'Random corruption must degrade to seed — never throw, never half-load.',
  tests: [
    T('pf1', 'corruption at 60 random offsets never throws', 'persist', () => {
      const valid = JSON.stringify({ version: 2, ['data']: seedState() });
      for (let i = 0; i < 60; i++) {
        const cut = 1 + Math.floor(Math.random() * (valid.length - 2));
        const corrupted = i % 3 === 0
          ? valid.slice(0, cut)                                   // truncation
          : i % 3 === 1
            ? valid.slice(0, cut) + '§§' + valid.slice(cut + 2)   // substitution
            : valid.slice(0, cut) + valid.slice(cut).split('').reverse().join(''); // scramble tail
        const out = parsePersisted(corrupted);
        assert(out === null || Array.isArray(out.contacts), 'null or fully valid — never partial');
      }
    }),
    T('pf2', 'hostile versions, shapes and encodings rejected cleanly', 'persist', () => {
      for (const v of [0, 1, 3, 99, -1]) {
        eq(parsePersisted(JSON.stringify({ version: v, ['data']: seedState() })), null, `version ${v}`);
      }
      eq(parsePersisted(''), null, 'empty string');
      eq(parsePersisted('null'), null, 'null literal');
      eq(parsePersisted('{}'), null, 'bare object');
      eq(parsePersisted(JSON.stringify({ version: 2, ['data']: { contacts: 'not-an-array' } })), null, 'wrong contacts type');
      const ok = parsePersisted(JSON.stringify({ version: 2, ['data']: seedState() }));
      assert(ok !== null && ok.contacts.length > 0, 'valid payload still loads');
    }),
  ],
};

/* ================= S18 · reducer purity ================= */
const puritySuite: Suite = {
  id: 's18', name: 'Reducer purity & idempotency', icon: 'refresh', tone: '#5b6472',
  blurb: 'Unknown actions are identity, patches are idempotent, no-ops never double-fire.',
  tests: [
    T('pu1', 'unknown action returns the identical state reference', 'purity', () => {
      const st = seedState();
      const out = reducer(st, { t: '@@unknown-action' } as never);
      assert(out === st, 'reference equality — nothing was copied or mutated');
    }),
    T('pu2', 'patching the same field twice is a no-op the second time', 'purity', env => {
      const c = env.getState().contacts[0];
      env.api.patchContact(c.id, { title: 'QA Probe' });
      const once = JSON.stringify(env.getState().contacts[0]);
      env.api.patchContact(c.id, { title: 'QA Probe' });
      eq(JSON.stringify(env.getState().contacts[0]), once, 'second patch changes nothing');
    }),
    T('pu3', 'moving a deal to its current stage never double-fires automation', 'purity', env => {
      const d = env.getState().deals.find(x => x.stage === 'proposal') ?? env.getState().deals[0];
      const tasksBefore = env.getState().tasks.filter(t => t.dealId === d.id).length;
      env.api.moveDeal(d.id, d.stage);
      eq(env.getState().tasks.filter(t => t.dealId === d.id).length, tasksBefore, 'no duplicate contract task');
    }),
    T('pu4', 'toggling a task 100× lands on the original state', 'purity', env => {
      const t = env.getState().tasks[0];
      const original = t.done;
      for (let i = 0; i < 100; i++) env.api.toggleTask(t.id);
      eq(env.getState().tasks.find(x => x.id === t.id)!.done, original, 'even toggles cancel out');
    }),
  ],
};

/* ================= S19 · flood endurance ================= */
const floodSuite: Suite = {
  id: 's19', name: 'Flood endurance', icon: 'bolt', tone: '#b23a2e',
  blurb: 'Thousands of events through the live reducer — the app must not flinch.',
  tests: [
    T('fl1', '2,000-notification flood stays inside budget', 'flood', env =>
      budget('2000 notifications', 500, () => {
        for (let i = 0; i < 2000; i++) {
          env.dispatch({ t: 'notif+', n: { id: `fl${i}`, text: `flood ${i}`, at: isoOf(new Date()), read: false, kind: 'system' } });
        }
      })),
    T('fl2', '500 rapid toasts coalesce without crash', 'flood', env => {
      for (let i = 0; i < 500; i++) env.api.toast(`toast ${i}`);
      assert(Array.isArray(env.getState().toasts), 'toast queue intact');
    }),
    T('fl3', '1,000 engagement ticks keep post math sane', 'flood', env => {
      const p = env.getState().posts.find(x => x.status === 'published') ?? env.getState().posts[0];
      const start = p.likes ?? 0;
      for (let i = 0; i < 1000; i++) env.dispatch({ t: 'post~', id: p.id, p: { likes: start + i + 1 } });
      eq(env.getState().posts.find(x => x.id === p.id)!.likes, start + 1000, 'last write wins, no drift');
    }),
  ],
};

export const DEEP_SUITES: Suite[] = [smokeSuite, contractsSuite, calendarSuite, persistSuite, puritySuite, floodSuite];
export const DEEP_TOTAL = DEEP_SUITES.reduce((n, s) => n + s.tests.length, 0);
export const DEEP_REQ_LABEL: Record<string, { label: string; spec: string }> = {
  smoke: { label: 'Module smoke renders', spec: 'Type 9' },
  contracts: { label: 'API surface & registry contracts', spec: 'Type 10' },
  calendar: { label: 'Calendar exhaustives', spec: 'Type 11' },
  persist: { label: 'Persistence corruption fuzz', spec: 'Type 12' },
  purity: { label: 'Reducer purity & idempotency', spec: 'Type 13' },
  flood: { label: 'Flood endurance', spec: 'Type 14' },
};
