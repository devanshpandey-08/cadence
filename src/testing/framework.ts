import type { AppState, Role, User } from '../types';
import { makeApi, reducer } from '../store';
import type { Action, Api } from '../store';
import { seedState } from '../data';
import { isoOf } from '../meta';

export type ReqTag =
  | 'core-crm' | 'pipeline' | 'tasks' | 'calendar' | 'publisher'
  | 'forms' | 'pages' | 'email' | 'approvals' | 'inbox' | 'scheduler' | 'roles'
  | 'security' | 'resilience' | 'scale' | 'api'
  | 'integration' | 'e2e' | 'hardening' | 'chaos' | 'fuzz' | 'edge' | 'regression'
  | 'smoke' | 'contracts' | 'persist' | 'purity' | 'flood' | 'prodverify';

export interface TestResult {
  id: string;
  name: string;
  req: ReqTag;
  pass: boolean;
  ms: number;
  detail?: string;
  metric?: { value: string; budget: string };
}

export interface TestDef {
  id: string;
  name: string;
  req: ReqTag;
  run: (env: TestEnv) => void | { metric: { value: string; budget: string } } | Promise<void | { metric: { value: string; budget: string } }>;
}

export interface Suite {
  id: string;
  name: string;
  icon: string;
  tone: string;
  blurb: string;
  tests: TestDef[];
}

/* ---------- environment ---------- */
export interface TestEnv {
  getState: () => AppState;
  api: Api;
  toasts: string[];
  notifs: string[];
  dispatch: (a: Action) => void;
  setMe: (role: Role) => void;
}

const ROLE_FIX: Record<Role, User> = {
  admin: { id: 't-admin', name: 'Test Admin', email: 'admin@test.dev', role: 'admin', color: '#0e7a52' },
  editor: { id: 't-editor', name: 'Test Editor', email: 'editor@test.dev', role: 'editor', color: '#3e7cb1' },
  viewer: { id: 't-viewer', name: 'Test Viewer', email: 'viewer@test.dev', role: 'viewer', color: '#a96f14' },
};

/** Fresh seeded workspace wired to the real reducer + action core. */
export function createEnv(role: Role | null = 'admin'): TestEnv {
  let state: AppState = { ...seedState(), me: role ? ROLE_FIX[role] : null };
  const toasts: string[] = [];
  const notifs: string[] = [];
  const dispatch = (a: Action) => { state = reducer(state, a); };
  const api = makeApi({
    get: () => state,
    dispatch,
    toast: t => toasts.push(t),
    notify: t => notifs.push(t),
    persist: false,
  });
  return {
    getState: () => state,
    api, toasts, notifs, dispatch,
    setMe: r => dispatch({ t: 'ui', p: { me: ROLE_FIX[r] } }),
  };
}

/* ---------- assertion helpers ---------- */
export function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}
export const eq = (a: unknown, b: unknown, msg: string) => assert(a === b, `${msg} — expected ${String(b)}, got ${String(a)}`);

export function measure(fn: () => void): number {
  const t0 = performance.now();
  fn();
  return performance.now() - t0;
}

/** Times fn, asserts it beats the budget, and surfaces the number as a metric. */
export function budget(name: string, budgetMs: number, fn: () => void): { metric: { value: string; budget: string } } {
  const ms = measure(fn);
  assert(ms < budgetMs, `${name} took ${ms.toFixed(1)}ms — budget ${budgetMs}ms`);
  return { metric: { value: `${ms.toFixed(1)}ms`, budget: `< ${budgetMs}ms` } };
}

/* ---------- synthetic data for scale tests ---------- */
export function syntheticContacts(n: number) {
  const today = isoOf(new Date());
  return Array.from({ length: n }, (_, i) => ({
    id: `syn-${i}`,
    name: `Scale Contact ${i}`,
    email: `scale${i}@loadtest.dev`,
    company: `LoadCo ${i % 97}`,
    title: 'Analyst',
    source: 'Manual' as const,
    tags: [i % 3 === 0 ? 'wholesale' : 'lead'],
    owner: 'Maya Chen',
    createdAt: today,
    lastActivity: today,
    timeline: [{ id: `tl-${i}`, type: 'note' as const, text: `synthetic ${i}`, at: today }],
  }));
}

export function syntheticEvents(n: number) {
  const today = isoOf(new Date());
  return Array.from({ length: n }, (_, i) => ({
    id: `ev-${i}`, type: 'social' as const, who: `Contact ${i % 997}`,
    text: `Replied to commenter ${i} on instagram`, at: today,
  }));
}

export function syntheticPosts(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `sp-${i}`,
    text: `Load post ${i} — capacity check`,
    platforms: ['linkedin' as const],
    date: isoOf(new Date(2026, 0, 1 + (i % 60))),
    time: '12:00',
    status: 'scheduled' as const,
    author: 'Maya Chen',
    media: 'none' as const,
  }));
}
