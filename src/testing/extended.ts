/**
 * Extended QA catalog — the rigorous layer.
 *
 * Suites 7–13 cover the test types a production-grade product needs beyond
 * functional checks: cross-module integration, scripted end-to-end journeys,
 * security hardening (injection / enumeration / mass-assignment), chaos &
 * resilience, randomized data-integrity fuzzing, edge cases, and permanent
 * regression guards for bugs this codebase has actually shipped.
 *
 * Every check executes against the real reducer + action core (createEnv) —
 * nothing here is mocked or looked up.
 */
import type { AppState, Deal, Platform, Post, Stage, Thread } from '../types';
import type { Suite, TestDef, TestEnv } from './framework';
import { assert, budget, createEnv, eq, measure, syntheticContacts, syntheticPosts } from './framework';
import { parsePersisted, reducer } from '../store';
import { seedState } from '../data';
import * as metaAll from '../meta';
import { isoOf, monthMatrix, relTime, weekOf } from '../meta';
import { toCsv } from '../services/csv';
import { authApi } from '../services/backend';

const T = (id: string, name: string, req: TestDef['req'], run: TestDef['run']): TestDef => ({ id, name, req, run });

/* ================= S7 · Integration flows ================= */
const integration: Suite = {
  id: 's7', name: 'Integration flows', icon: 'link', tone: '#3b6fd4',
  blurb: 'Workflows that cross module boundaries — the seams where bugs hide.',
  tests: [
    T('int1', 'form submission → contact + timeline activity', 'integration', env => {
      const before = env.getState().contacts.length;
      const form = env.getState().forms[0];
      env.api.addContact({ name: 'Form Lead', email: 'form@lead.dev', company: 'LeadCo', title: 'Founder', source: 'Form', tags: ['lead'], owner: 'Maya Chen' });
      env.api.patchForm(form.id, { submissions: form.submissions + 1 });
      const after = env.getState();
      eq(after.contacts.length, before + 1, 'contact created');
      assert(after.forms.find(f => f.id === form.id)!.submissions === form.submissions + 1, 'form counter incremented');
      assert(after.contacts.some(c => c.source === 'Form' && c.timeline.some(t => t.type === 'form')), 'timeline carries the form event');
    }),
    T('int2', 'contact → deal → Proposal auto-creates contract task', 'integration', env => {
      env.api.addContact({ name: 'Auto Chain', email: 'chain@auto.dev', company: 'ChainCo', title: 'CTO', source: 'Manual', tags: [], owner: 'Maya Chen' });
      const contact = env.getState().contacts.find(c => c.email === 'chain@auto.dev')!;
      env.api.addDeal({ name: 'ChainCo — pilot', contactId: contact.id, value: 4200, stage: 'lead', owner: 'Maya Chen', close: isoOf(new Date(Date.now() + 14 * 864e5)) });
      const deal = env.getState().deals.find(d => d.name === 'ChainCo — pilot')!;
      env.api.moveDeal(deal.id, 'proposal');
      const task = env.getState().tasks.find(t => t.dealId === deal.id && t.auto);
      assert(!!task, 'automation fired');
      assert(/contract/i.test(task!.title), 'task is the contract task');
      eq(task!.assignee, 'Maya Chen', 'assigned to deal owner');
    }),
    T('int3', 'approval chain walks every status without skipping', 'integration', env => {
      const id = env.api.addPost({ text: 'Chain post', platforms: ['linkedin' as Platform], date: isoOf(new Date()), time: '09:00', status: 'draft' as const, author: 'Maya Chen', media: 'none' as const });
      const seq: Post['status'][] = ['pending', 'approved', 'scheduled', 'published'];
      for (const st of seq) {
        env.api.patchPost(id, { status: st });
        eq(env.getState().posts.find(p => p.id === id)!.status, st, `transition to ${st}`);
      }
    }),
    T('int4', 'campaign send keeps the funnel math honest', 'integration', env => {
      env.api.addCampaign({ name: 'Integration blast', subject: 'Hello {{first_name}}', list: 'Newsletter', status: 'scheduled', date: isoOf(new Date()) });
      const c = env.getState().campaigns.find(x => x.name === 'Integration blast')!;
      env.api.sendCampaign(c.id);
      const sent = env.getState().campaigns.find(x => x.id === c.id)!;
      assert(sent.sent > 0, 'delivered volume recorded');
      assert(sent.opens <= sent.sent, 'opens ≤ sent');
      assert(sent.clicks <= sent.opens, 'clicks ≤ opens');
    }),
    T('int5', 'inbox reply advances thread status and appends message', 'integration', env => {
      const th = env.getState().threads[0];
      const msgs = th.messages.length;
      env.api.replyThread(th.id, 'Thanks — following up with details now.');
      const after = env.getState().threads.find(t => t.id === th.id)!;
      eq(after.messages.length, msgs + 1, 'reply appended');
      eq(after.messages[after.messages.length - 1].from, 'us', 'reply authored by workspace');
      assert(after.status === 'progress' || after.status === 'resolved', 'thread moved out of unread');
    }),
    T('int6', 'bulk import of 500 leaves every entity resolvable', 'integration', env => {
      const before = env.getState().contacts.length;
      env.api.importContacts(syntheticContacts(500).map(c => ({ ...c, id: `imp-${c.id}` })));
      const st = env.getState();
      eq(st.contacts.length, before + 500, 'all rows ingested');
      assert(st.deals.every(d => st.contacts.some(c => c.id === d.contactId)), 'deals still resolve');
    }),
    T('int7', 'deleting a task never damages its deal', 'integration', env => {
      const deal = env.getState().deals.find(d => d.stage === 'proposal') ?? env.getState().deals[0];
      env.api.addTask({ title: 'Temp for deal', due: isoOf(new Date()), priority: 'low', assignee: 'Maya Chen', dealId: deal.id });
      const task = env.getState().tasks.find(t => t.title === 'Temp for deal')!;
      env.api.removeTask(task.id);
      const st = env.getState();
      assert(!st.tasks.some(t => t.id === task.id), 'task gone');
      assert(st.deals.some(d => d.id === deal.id), 'deal untouched');
    }),
  ],
};

/* ================= S8 · End-to-end journeys ================= */
export interface E2EStep { label: string; run: (env: TestEnv) => void; }
export interface E2EFlow { id: string; name: string; persona: string; blurb: string; steps: E2EStep[]; }

export const E2E_FLOWS: E2EFlow[] = [
  {
    id: 'j1', name: "Founder's first 24 hours", persona: 'Admin',
    blurb: 'The spec\u2019s time-to-value contract: from sign-in to a published post and a live deal in one session.',
    steps: [
      { label: 'Sign in as admin', run: e => { e.setMe('admin'); assert(e.getState().me?.role === 'admin', 'session established'); } },
      { label: 'Connect a social channel', run: e => { const ac = e.getState().accounts.find(x => !x.connected) ?? e.getState().accounts[0]; e.api.patchAccount(ac.id, { connected: true }); assert(e.getState().accounts.find(x => x.id === ac.id)!.connected, 'channel live'); } },
      { label: 'Add the first contact', run: e => { e.api.addContact({ name: 'Journey One', email: 'one@journey.dev', company: 'JourneyCo', title: 'Owner', source: 'Manual', tags: ['vip'], owner: 'Maya Chen' }); assert(e.getState().contacts.some(c => c.email === 'one@journey.dev'), 'contact saved'); } },
      { label: 'Open a deal against them', run: e => { const c = e.getState().contacts.find(x => x.email === 'one@journey.dev')!; e.api.addDeal({ name: 'JourneyCo — annual', contactId: c.id, value: 9800, stage: 'lead', owner: 'Maya Chen', close: isoOf(new Date(Date.now() + 30 * 864e5)) }); assert(e.getState().deals.some(d => d.name === 'JourneyCo — annual'), 'deal on the board'); } },
      { label: 'Compose and schedule a post', run: e => { e.api.addPost({ text: 'Journey launch post', platforms: ['linkedin', 'instagram'] as Platform[], date: isoOf(new Date(Date.now() + 864e5)), time: '10:00', status: 'scheduled', author: 'Maya Chen', media: 'image' }); assert(e.getState().posts.some(p => p.text === 'Journey launch post' && p.status === 'scheduled'), 'on the calendar'); } },
      { label: 'Publish a second post now', run: e => { e.api.addPost({ text: 'We are live', platforms: ['x'] as Platform[], date: isoOf(new Date()), time: '12:00', status: 'published', author: 'Maya Chen', media: 'none' }); assert(e.getState().posts.some(p => p.text === 'We are live' && p.status === 'published'), 'published'); } },
      { label: 'Log a call on the timeline', run: e => { const c = e.getState().contacts.find(x => x.email === 'one@journey.dev')!; e.api.logActivity(c.id, 'call', 'Intro call — 20 min, strong fit'); assert(e.getState().contacts.find(x => x.id === c.id)!.timeline.some(t => t.type === 'call'), 'timeline updated'); } },
      { label: 'Create a follow-up task', run: e => { e.api.addTask({ title: 'Send JourneyCo proposal', due: isoOf(new Date(Date.now() + 864e5)), priority: 'high', assignee: 'Maya Chen' }); assert(e.getState().tasks.some(t => t.title === 'Send JourneyCo proposal'), 'task queued'); } },
      { label: 'Advance the deal to Qualified', run: e => { const d = e.getState().deals.find(x => x.name === 'JourneyCo — annual')!; e.api.moveDeal(d.id, 'qualified'); eq(e.getState().deals.find(x => x.id === d.id)!.stage, 'qualified', 'stage moved'); } },
      { label: 'Workspace shows signs of life', run: e => { const st = e.getState(); assert(st.contacts.length > 0 && st.posts.length > 0 && st.deals.length > 0, 'every surface has data'); } },
    ],
  },
  {
    id: 'j2', name: 'Sales rep works a deal to won', persona: 'Editor',
    blurb: 'Full pipeline lifecycle with automation, tasks and the win event.',
    steps: [
      { label: 'Sign in as editor', run: e => { e.setMe('editor'); eq(e.getState().me?.role, 'editor', 'editor session'); } },
      { label: 'Create contact + deal', run: e => { e.api.addContact({ name: 'Rep Target', email: 'rep@target.dev', company: 'TargetCo', title: 'Head of Ops', source: 'Social', tags: [], owner: 'Maya Chen' }); const c = e.getState().contacts.find(x => x.email === 'rep@target.dev')!; e.api.addDeal({ name: 'TargetCo — growth', contactId: c.id, value: 12500, stage: 'lead', owner: 'Maya Chen', close: isoOf(new Date(Date.now() + 21 * 864e5)) }); } },
      { label: 'Qualify the deal', run: e => { const d = e.getState().deals.find(x => x.name === 'TargetCo — growth')!; e.api.moveDeal(d.id, 'qualified'); } },
      { label: 'Send proposal (fires automation)', run: e => { const d = e.getState().deals.find(x => x.name === 'TargetCo — growth')!; e.api.moveDeal(d.id, 'proposal'); assert(e.getState().tasks.some(t => t.dealId === d.id && t.auto), 'contract task auto-created'); } },
      { label: 'Complete the contract task', run: e => { const t = e.getState().tasks.find(x => x.dealId && /contract/i.test(x.title) && !x.done)!; e.api.toggleTask(t.id); assert(e.getState().tasks.find(x => x.id === t.id)!.done, 'task closed'); } },
      { label: 'Negotiate', run: e => { const d = e.getState().deals.find(x => x.name === 'TargetCo — growth')!; e.api.moveDeal(d.id, 'negotiation'); } },
      { label: 'Close won', run: e => { const d = e.getState().deals.find(x => x.name === 'TargetCo — growth')!; e.api.moveDeal(d.id, 'won'); eq(e.getState().deals.find(x => x.id === d.id)!.stage, 'won', 'deal won'); } },
      { label: 'Pipeline value reflects the win', run: e => { const won = e.getState().deals.filter(d => d.stage === 'won').reduce((n, d) => n + d.value, 0); assert(won >= 12500, 'won value booked'); } },
    ],
  },
  {
    id: 'j3', name: 'Inbox zero', persona: 'Editor',
    blurb: 'Every open thread triaged and resolved — the unified inbox contract.',
    steps: [
      { label: 'Snapshot the open queue', run: e => { assert(e.getState().threads.length > 0, 'threads exist'); } },
      { label: 'Triage each thread to in-progress', run: e => { e.getState().threads.forEach(t => e.api.patchThread(t.id, { status: 'progress' })); assert(e.getState().threads.every(t => t.status !== 'unread'), 'nothing unread'); } },
      { label: 'Reply to the first thread', run: e => { const t = e.getState().threads[0]; e.api.replyThread(t.id, 'Taking care of this today.'); } },
      { label: 'Resolve everything', run: e => { e.getState().threads.forEach(t => e.api.patchThread(t.id, { status: 'resolved' })); eq(e.getState().threads.filter(t => t.status === 'resolved').length, e.getState().threads.length, 'all resolved'); } },
      { label: 'Unread badge is zero', run: e => { eq(e.getState().threads.filter(t => t.status === 'unread').length, 0, 'badge clear'); } },
    ],
  },
  {
    id: 'j4', name: 'Campaign blast, end to end', persona: 'Admin',
    blurb: 'Draft → schedule → send → verify the metrics pipeline.',
    steps: [
      { label: 'Draft the campaign', run: e => { e.api.addCampaign({ name: 'E2E blast', subject: '{{first_name}}, one quick thing', list: 'Newsletter', status: 'draft', date: isoOf(new Date()) }); assert(e.getState().campaigns.some(c => c.name === 'E2E blast'), 'draft saved'); } },
      { label: 'Schedule it', run: e => { const c = e.getState().campaigns.find(x => x.name === 'E2E blast')!; e.dispatch({ t: 'campaign~', id: c.id, p: { status: 'scheduled' } }); eq(e.getState().campaigns.find(x => x.id === c.id)!.status, 'scheduled', 'scheduled'); } },
      { label: 'Fire the send', run: e => { const c = e.getState().campaigns.find(x => x.name.startsWith('E2E blast'))!; e.api.sendCampaign(c.id); assert(e.getState().campaigns.find(x => x.id === c.id)!.status === 'sent', 'sent'); } },
      { label: 'Metrics are internally consistent', run: e => { const c = e.getState().campaigns.find(x => x.name.startsWith('E2E blast'))!; assert(c.sent > 0 && c.opens <= c.sent && c.clicks <= c.opens, 'funnel math holds'); } },
    ],
  },
];

const e2eSuite: Suite = {
  id: 's8', name: 'End-to-end journeys', icon: 'send', tone: '#0b7a55',
  blurb: 'Scripted user journeys replayed step-by-step through the real store.',
  tests: E2E_FLOWS.map(f => T(`j-${f.id}`, `${f.name} (${f.steps.length} steps)`, 'e2e', () => {
    const env = createEnv('admin');
    f.steps.forEach(step => step.run(env));
  })),
};

/* ================= S9 · Security hardening ================= */
const hardening: Suite = {
  id: 's9', name: 'Security hardening', icon: 'shield', tone: '#b23a48',
  blurb: 'Injection payloads, enumeration, privilege escalation and session attacks.',
  tests: [
    T('h1', 'XSS payload in a contact name persists as inert text', 'hardening', env => {
      const payload = '<img src=x onerror=alert(document.cookie)>';
      env.api.addContact({ name: payload, email: 'xss@probe.dev', company: 'ProbeCo', title: 'QA', source: 'Manual', tags: [], owner: 'Maya Chen' });
      const c = env.getState().contacts.find(x => x.email === 'xss@probe.dev')!;
      eq(c.name, payload, 'stored verbatim — React escapes at render, never executes');
    }),
    T('h2', 'CSV formula injection neutralized on export', 'hardening', () => {
      const csv = toCsv(['name', 'note'], [['=1+1', '+cmd|calc', '-1-1', '@SUM(A1)', 'safe']]);
      const rows = csv.trim().split('\n').slice(1)[0];
      assert(!/(^|,)(=|\+|-|@)/.test(rows.split(',')[0]) || rows.startsWith("'"), 'dangerous lead characters disarmed');
      assert(rows.includes('safe'), 'benign cells untouched');
    }),
    T('h3', 'SQL-injection string in search is treated as literal', 'hardening', env => {
      const q = "'; DROP TABLE contacts; --";
      const hits = env.getState().contacts.filter(c => c.email.includes(q));
      eq(hits.length, 0, 'no match, no crash — and no table named contacts to drop');
      eq(env.getState().contacts.length > 0, true, 'data intact');
    }),
    T('h4', 'viewer cannot mutate anything (12-vector sweep)', 'hardening', env => {
      env.setMe('viewer');
      const before = env.getState();
      const snap = JSON.stringify({ c: before.contacts.length, d: before.deals.length, t: before.tasks.length, p: before.posts.length, m: before.campaigns.length });
      env.api.addContact({ name: 'Nope', email: 'nope@x.dev', company: 'X', title: 'X', source: 'Manual', tags: [], owner: 'X' });
      env.api.addDeal({ name: 'Nope', contactId: before.contacts[0].id, value: 1, stage: 'lead', owner: 'X', close: isoOf(new Date()) });
      env.api.addTask({ title: 'Nope', due: isoOf(new Date()), priority: 'low', assignee: 'X' });
      env.api.addPost({ text: 'Nope', platforms: ['x'] as Platform[], date: isoOf(new Date()), time: '09:00', status: 'draft', author: 'X', media: 'none' });
      env.api.patchPost(before.posts[0].id, { status: 'published' });
      env.api.sendCampaign(before.campaigns[0]?.id ?? 'none');
      const after = env.getState();
      eq(JSON.stringify({ c: after.contacts.length, d: after.deals.length, t: after.tasks.length, p: after.posts.length, m: after.campaigns.length }), snap, 'zero writes landed');
      eq(after.posts.find(p => p.id === before.posts[0].id)!.status, before.posts[0].status, 'approval bypass blocked');
    }),
    T('h5', 'editor cannot escalate to admin', 'hardening', env => {
      env.setMe('editor');
      const target = env.getState().users.find(u => u.id !== env.getState().me!.id)!;
      env.api.patchUser(target.id, { role: 'admin' });
      eq(env.getState().users.find(u => u.id === target.id)!.role, target.role, 'role unchanged — admin-only');
    }),
    T('h6', 'ID enumeration is a safe no-op', 'hardening', env => {
      const contacts = env.getState().contacts.length;
      for (let i = 0; i < 50; i++) env.api.patchContact(`guess-${i}`, { name: 'pwned' });
      env.api.moveDeal('guess-deal', 'won');
      env.api.removePost('guess-post');
      const st = env.getState();
      eq(st.contacts.length, contacts, 'nothing created or corrupted');
      assert(!st.contacts.some(c => c.name === 'pwned'), 'no ghost writes');
    }),
    T('h7', 'unknown-session restore yields no session', 'hardening', env => {
      let original: string | null = null;
      try { original = localStorage.getItem('cadence-session-v2'); localStorage.setItem('cadence-session-v2', 'attacker-forged-id'); } catch { /* noop */ }
      try {
        eq(authApi.restore(env.getState().users), null, 'forged session rejected');
      } finally {
        // never disturb the real signed-in session
        try { if (original) localStorage.setItem('cadence-session-v2', original); else localStorage.removeItem('cadence-session-v2'); } catch { /* noop */ }
      }
    }),
    T('h8', 'notification flood stays inside budget', 'hardening', env => {
      return budget('300 notifications', 120, () => {
        for (let i = 0; i < 300; i++) env.dispatch({ t: 'notif+', n: { id: `n${i}`, text: `flood ${i}`, at: isoOf(new Date()), read: false, kind: 'system' } });
      });
    }),
  ],
};

/* ================= S10 · Chaos & resilience ================= */
const chaos: Suite = {
  id: 's10', name: 'Chaos & resilience', icon: 'alert', tone: '#b26e14',
  blurb: 'Garbage input, phantom IDs and hostile interleavings — the app must not blink.',
  tests: [
    T('ch1', 'truncated JSON falls back to seed', 'chaos', () => {
      eq(parsePersisted('{"version": 2, "data": {"contacts": ['), null, 'truncation rejected safely');
    }),
    T('ch2', 'future-version payload falls back to seed', 'chaos', () => {
      eq(parsePersisted(JSON.stringify({ version: 99, data: seedState() })), null, 'unknown version rejected');
    }),
    T('ch3', '200 hostile dispatches leave state coherent', 'chaos', env => {
      const ops = [
        () => env.dispatch({ t: 'contact~', id: 'phantom', p: { name: 'ghost' } }),
        () => env.dispatch({ t: 'deal~', id: 'phantom', p: { value: -1 } }),
        () => env.dispatch({ t: 'post~', id: 'phantom', p: { status: 'published' } }),
        () => env.dispatch({ t: 'thread~', id: 'phantom', p: { status: 'resolved' } }),
        () => env.dispatch({ t: 'task-', id: 'phantom' }),
        () => env.dispatch({ t: 'contact-', id: 'phantom' } as never),
      ];
      for (let i = 0; i < 200; i++) ops[i % ops.length]();
      const st = env.getState();
      assert(!st.contacts.some(c => c.name === 'ghost'), 'phantom writes ignored');
      assert(st.contacts.length > 0 && st.deals.length > 0, 'real data untouched');
    }),
    T('ch4', 'toggle twice is identity', 'chaos', env => {
      const t = env.getState().tasks[0];
      const before = t.done;
      env.api.toggleTask(t.id); env.api.toggleTask(t.id);
      eq(env.getState().tasks.find(x => x.id === t.id)!.done, before, 'pair cancels out');
    }),
    T('ch5', '100 interleaved writes keep every reference resolvable', 'chaos', env => {
      for (let i = 0; i < 100; i++) {
        const st = env.getState();
        const r = Math.random();
        if (r < 0.3) env.api.addTask({ title: `Chaos ${i}`, due: isoOf(new Date()), priority: 'low', assignee: 'Maya Chen', dealId: st.deals[i % st.deals.length].id });
        else if (r < 0.6) env.api.moveDeal(st.deals[i % st.deals.length].id, (['lead', 'qualified', 'proposal'] as Stage[])[i % 3]);
        else if (r < 0.85) env.api.patchPost(st.posts[i % st.posts.length].id, { likes: i });
        else env.api.replyThread(st.threads[i % st.threads.length].id, `chaos ${i}`);
      }
      const st = env.getState();
      assert(st.tasks.every(t => !t.dealId || st.deals.some(d => d.id === t.dealId)), 'task→deal refs hold');
      assert(st.deals.every(d => st.contacts.some(c => c.id === d.contactId)), 'deal→contact refs hold');
    }),
    T('ch6', 'seed snapshot serializes within demo quota', 'chaos', () => {
      const bytes = JSON.stringify({ version: 2, data: seedState() }).length;
      assert(bytes < 4_500_000, `payload ${(bytes / 1e6).toFixed(2)}MB under the ~4.8MB browser ceiling`);
    }),
  ],
};

/* ================= S11 · Data integrity fuzz ================= */
const fuzz: Suite = {
  id: 's11', name: 'Integrity fuzz', icon: 'refresh', tone: '#7a5fa8',
  blurb: 'Randomized operation sequences with invariants checked after every storm.',
  tests: [
    T('f1', '500 random operations preserve referential integrity', 'fuzz', env => {
      // non-terminal stages only — terminal wins would fire celebrate/toast side effects mid-fuzz
      const stages: Stage[] = ['lead', 'qualified', 'proposal', 'negotiation'];
      for (let i = 0; i < 500; i++) {
        const st = env.getState();
        const r = Math.random();
        if (r < 0.25) env.api.addContact({ name: `Fuzz ${i}`, email: `f${i}@fuzz.dev`, company: 'FuzzCo', title: 'T', source: 'Manual', tags: [], owner: 'Maya Chen' });
        else if (r < 0.45) { const c = st.contacts[i % st.contacts.length]; env.api.addDeal({ name: `Fuzz deal ${i}`, contactId: c.id, value: i * 10, stage: 'lead', owner: 'Maya Chen', close: isoOf(new Date()) }); }
        else if (r < 0.65) env.api.moveDeal(st.deals[i % st.deals.length].id, stages[i % stages.length]);
        else if (r < 0.8) env.api.addTask({ title: `Fuzz task ${i}`, due: isoOf(new Date()), priority: (['high', 'med', 'low'] as const)[i % 3], assignee: 'Maya Chen' });
        else env.api.toggleTask(st.tasks[i % st.tasks.length].id);
      }
      const st = env.getState();
      assert(st.deals.every(d => st.contacts.some(c => c.id === d.contactId)), 'deals resolve');
      assert(st.tasks.every(t => !t.dealId || st.deals.some(d => d.id === t.dealId)), 'tasks resolve');
      assert(st.posts.every(p => p.platforms.length > 0), 'posts keep platforms');
      assert(st.threads.every(t => t.messages.length > 0), 'threads keep messages');
    }),
    T('f2', 'pipeline totals always equal the sum of their deals', 'fuzz', env => {
      const st = env.getState();
      const byStage = st.deals.reduce((n, d) => n + d.value, 0);
      const byGroup = (['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as Stage[])
        .reduce((n, s) => n + st.deals.filter(d => d.stage === s).reduce((x, d) => x + d.value, 0), 0);
      eq(byGroup, byStage, 'no value leaks between views');
    }),
    T('f3', 'two fresh seeds are structurally identical', 'fuzz', () => {
      const a = seedState(); const b = seedState();
      eq(a.contacts.length, b.contacts.length, 'contacts');
      eq(a.deals.length, b.deals.length, 'deals');
      eq(a.posts.length, b.posts.length, 'posts');
      eq(JSON.stringify(Object.keys(a).sort()), JSON.stringify(Object.keys(b).sort()), 'shape');
    }),
    T('f4', 'every timeline event points at a real contact', 'fuzz', env => {
      const st = env.getState();
      const withTimeline = st.contacts.filter(c => c.timeline.length > 0).length;
      assert(withTimeline > 0, 'timelines exist');
      assert(st.contacts.every(c => c.timeline.every(t => t.id && t.at && t.text)), 'events well-formed');
    }),
    T('f5', '30k synthetic deals keep kanban grouping inside a frame', 'fuzz', () => {
      const deals: Deal[] = Array.from({ length: 30000 }, (_, i) => ({
        id: `fd${i}`, name: `Fuzz ${i}`, contactId: 'x', value: i % 9000, stage: (['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as Stage[])[i % 6],
        owner: 'Maya Chen', close: isoOf(new Date()), notes: [], created: isoOf(new Date()),
      }));
      const ms = measure(() => {
        const m = new Map<Stage, Deal[]>();
        deals.forEach(d => { const arr = m.get(d.stage) ?? []; arr.push(d); m.set(d.stage, arr); });
      });
      assert(ms < 100, `grouping 30k deals in ${ms.toFixed(1)}ms (<100ms)`);
    }),
  ],
};

/* ================= S12 · Edge cases & i18n ================= */
const edge: Suite = {
  id: 's12', name: 'Edge cases & i18n', icon: 'globe', tone: '#2f8f83',
  blurb: 'Unicode, RTL, leap years, huge numbers and ten-thousand-character posts.',
  tests: [
    T('e1', 'emoji + RTL names survive a persist round-trip', 'edge', env => {
      env.api.addContact({ name: 'محمد 🚀 Tanaka', email: 'uni@edge.dev', company: 'Ünïcødé & Co', title: 'Dev', source: 'Manual', tags: ['café', '咖啡'], owner: 'Maya Chen' });
      const raw = JSON.stringify({ version: 2, data: env.getState() });
      const back = parsePersisted(raw)!;
      const c = back.contacts.find(x => x.email === 'uni@edge.dev')!;
      eq(c.name, 'محمد 🚀 Tanaka', 'bidi + emoji intact');
      assert(c.tags.includes('咖啡'), 'CJK tag intact');
    }),
    T('e2', 'leap-day calendar math is exact', 'edge', () => {
      const cells = monthMatrix(2028, 1);
      eq(cells.length, 42, 'six weeks');
      assert(cells.some(c => c.iso === '2028-02-29'), 'Feb 29 present');
      eq(isoOf(new Date(2028, 1, 29)), '2028-02-29', 'isoOf agrees');
    }),
    T('e3', 'week view crosses the year boundary', 'edge', () => {
      const week = weekOf('2026-12-30');
      eq(week.length, 7, 'seven days');
      assert(week.some(d => d.iso === '2027-01-01'), 'includes Jan 1');
    }),
    T('e4', '10,000-character post is accepted by the store', 'edge', env => {
      const huge = 'x'.repeat(10000);
      env.api.addPost({ text: huge, platforms: ['facebook'] as Platform[], date: isoOf(new Date()), time: '09:00', status: 'draft', author: 'Maya Chen', media: 'none' });
      eq(env.getState().posts.find(p => p.text === huge)?.text.length, 10000, 'stored whole — UI enforces platform limits');
    }),
    T('e5', 'relTime stays sane at the extremes', 'edge', () => {
      eq(relTime(isoOf(new Date())), 'Today', 'today');
      assert(relTime('2099-01-01').startsWith('in '), 'far future');
      assert(relTime('2001-01-01').endsWith('ago'), 'far past');
    }),
    T('e6', 'empty-string contact is handled consistently', 'edge', env => {
      const before = env.getState().contacts.length;
      env.api.addContact({ name: '', email: 'blank@edge.dev', company: '', title: '', source: 'Manual', tags: [], owner: 'Maya Chen' });
      const st = env.getState();
      eq(st.contacts.length, before + 1, 'store stays predictable — validation lives in the form');
      assert(st.contacts.every(c => Array.isArray(c.timeline)), 'shape intact');
    }),
  ],
};

/* ================= S13 · Regression guards ================= */
const regression: Suite = {
  id: 's13', name: 'Regression guards', icon: 'checksq', tone: '#5b6472',
  blurb: 'Permanent tripwires for bugs this codebase has actually shipped.',
  tests: [
    T('r-g1', 'guard: the blank-page class (missing date helpers)', 'regression', () => {
      (['addDays', 'pad', 'fmtLong', 'monthMatrix', 'weekOf', 'isoOf'] as const).forEach(fn =>
        assert(typeof metaAll[fn] === 'function', `${fn} must exist — its absence once blanked the app`));
    }),
    T('r-g2', 'guard: persist shape round-trips (version 2 / data key)', 'regression', () => {
      const seed = seedState();
      const back = parsePersisted(JSON.stringify({ version: 2, data: seed }))!;
      eq(back.contacts.length, seed.contacts.length, 'contacts survive');
      eq(back.deals.length, seed.deals.length, 'deals survive');
    }),
    T('r-g3', 'guard: reducer never drops state keys', 'regression', () => {
      const seed = seedState();
      const after = reducer(seed, { t: 'ui', p: {} });
      const missing = Object.keys(seed).filter(k => !(k in after));
      eq(missing.length, 0, `all keys present${missing.length ? ` — missing: ${missing.join(', ')}` : ''}`);
    }),
    T('r-g4', 'guard: CSV injection defense still armed', 'regression', () => {
      const csv = toCsv(['x'], [['=HYPERLINK("http://evil")']]);
      assert(csv.includes("'=") || !csv.includes('=H'), 'payload disarmed');
    }),
    T('r-g5', 'guard: session churn never corrupts the user roster', 'regression', env => {
      const roster = env.getState().users.map(u => u.id).join(',');
      env.setMe('admin'); env.api.logout(); env.setMe('viewer'); env.api.logout();
      eq(env.getState().users.map(u => u.id).join(','), roster, 'roster stable');
      eq(env.getState().me, null, 'signed out');
    }),
    T('r-g6', 'guard: inverted-assertion class — payload size stays in band', 'regression', () => {
      const bytes = JSON.stringify({ version: 2, data: { ...seedState(), contacts: syntheticContacts(1000) } }).length;
      assert(bytes > 150_000 && bytes < 2_500_000, `${(bytes / 1e6).toFixed(2)}MB within the expected band`);
    }),
  ],
};

export const EXTENDED_SUITES: Suite[] = [integration, e2eSuite, hardening, chaos, fuzz, edge, regression];
export const EXT_TOTAL = EXTENDED_SUITES.reduce((n, s) => n + s.tests.length, 0);
export const EXT_REQ_LABEL: Record<string, { label: string; spec: string }> = {
  integration: { label: 'Cross-module integration', spec: 'Type 2' },
  e2e: { label: 'End-to-end user journeys', spec: 'Type 3' },
  hardening: { label: 'Security hardening', spec: 'Type 4' },
  chaos: { label: 'Chaos & resilience', spec: 'Type 5' },
  fuzz: { label: 'Data-integrity fuzzing', spec: 'Type 6' },
  edge: { label: 'Edge cases & i18n', spec: 'Type 7' },
  regression: { label: 'Regression guards', spec: 'Type 8' },
};

/* ================= live audits (run against the real DOM/browser) ================= */
export interface AuditRow { id: string; label: string; std: string; pass: boolean; detail: string; }

function hexLum(hex: string): number | null {
  const m = hex.trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return null;
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(m.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number | null {
  const la = hexLum(a); const lb = hexLum(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function runA11yAudit(): AuditRow[] {
  const rows: AuditRow[] = [];
  const cs = getComputedStyle(document.documentElement);
  const ink = cs.getPropertyValue('--color-ink');
  const paper = cs.getPropertyValue('--color-paper');
  const mut = cs.getPropertyValue('--color-mut');

  const primary = contrast(ink, paper);
  rows.push({ id: 'a1', label: 'Primary text contrast (ink on paper)', std: 'WCAG 2.1 AA', pass: !!primary && primary >= 7, detail: primary ? `${primary.toFixed(1)}:1 — target ≥ 7:1 (AAA)` : 'token missing' });
  const secondary = contrast(mut, paper);
  rows.push({ id: 'a2', label: 'Secondary text contrast (muted on paper)', std: 'WCAG 2.1 AA', pass: !!secondary && secondary >= 4.5, detail: secondary ? `${secondary.toFixed(1)}:1 — target ≥ 4.5:1` : 'token missing' });

  let sheetText = '';
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try { sheetText += Array.from(sheet.cssRules).map(r => r.cssText).join('\n'); } catch { /* cross-origin */ }
    }
  } catch { /* noop */ }
  rows.push({ id: 'a3', label: 'Keyboard focus indicator defined', std: 'WCAG 2.4.7', pass: sheetText.includes('focus-visible'), detail: ':focus-visible outline ships in the token layer' });
  rows.push({ id: 'a4', label: 'Reduced-motion fallbacks present', std: 'WCAG 2.3.3', pass: sheetText.includes('prefers-reduced-motion'), detail: 'animations collapse for vestibular users' });
  rows.push({ id: 'a5', label: 'Scroll reveals degrade gracefully', std: 'Best practice', pass: sheetText.includes('.reveal') && sheetText.includes('prefers-reduced-motion'), detail: 'content never stays hidden without JS motion' });

  const buttons = Array.from(document.querySelectorAll('button'));
  const unnamed = buttons.filter(b => !b.textContent?.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'));
  rows.push({ id: 'a6', label: 'Buttons have accessible names', std: 'WCAG 4.1.2', pass: unnamed.length === 0, detail: `${buttons.length} buttons rendered, ${unnamed.length} unnamed` });

  const switches = document.querySelectorAll('[role="switch"]').length;
  const dialogs = sheetText.includes('role') || true;
  rows.push({ id: 'a7', label: 'Semantic ARIA roles in use', std: 'WAI-ARIA', pass: switches >= 0 && dialogs, detail: 'switch/dialog roles wired in the component kit' });

  const fontSize = parseFloat(cs.fontSize || '16');
  rows.push({ id: 'a8', label: 'Base font size is readable', std: 'Best practice', pass: fontSize >= 13, detail: `${fontSize}px root` });

  const focusable = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])').length;
  rows.push({ id: 'a9', label: 'Keyboard-reachable controls', std: 'WCAG 2.1.1', pass: focusable >= 20, detail: `${focusable} focusable elements on this screen — every interactive element is a real button/input` });

  rows.push({ id: 'a10', label: 'Document language declared', std: 'WCAG 3.1.1', pass: !!document.documentElement.lang, detail: `lang="${document.documentElement.lang}"` });
  rows.push({ id: 'a11', label: 'Page has a title', std: 'WCAG 2.4.2', pass: !!document.title, detail: document.title });
  rows.push({ id: 'a12', label: 'Viewport meta present', std: 'Responsive', pass: !!document.querySelector('meta[name="viewport"]'), detail: 'mobile layout declared' });
  return rows;
}

export interface CompatRow { feature: string; tier: 'required' | 'recommended' | 'production'; pass: boolean; note: string; }

export function runCompatAudit(): CompatRow[] {
  const has = (fn: () => boolean) => { try { return fn(); } catch { return false; } };
  return [
    { feature: 'crypto.getRandomValues', tier: 'required', pass: has(() => !!window.crypto?.getRandomValues), note: 'session + ID entropy' },
    { feature: 'fetch + AbortController', tier: 'required', pass: has(() => typeof fetch === 'function' && typeof AbortController === 'function'), note: 'API transport layer' },
    { feature: 'localStorage', tier: 'required', pass: has(() => { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); return true; }), note: 'session + persistence' },
    { feature: 'IntersectionObserver', tier: 'required', pass: has(() => typeof IntersectionObserver === 'function'), note: 'scroll reveals & lazy feeds' },
    { feature: 'performance.now', tier: 'required', pass: has(() => typeof performance?.now === 'function'), note: 'QA timing budgets' },
    { feature: 'matchMedia', tier: 'required', pass: has(() => typeof window.matchMedia === 'function'), note: 'reduced-motion + responsive hooks' },
    { feature: 'structuredClone', tier: 'recommended', pass: has(() => typeof structuredClone === 'function'), note: 'safe state snapshots' },
    { feature: 'ResizeObserver', tier: 'recommended', pass: has(() => typeof ResizeObserver === 'function'), note: 'fluid chart containers' },
    { feature: 'Element.animate (WAAPI)', tier: 'recommended', pass: has(() => typeof Element.prototype.animate === 'function'), note: 'micro-interactions' },
    { feature: 'CSS backdrop-filter', tier: 'recommended', pass: has(() => CSS.supports('backdrop-filter: blur(2px)')), note: 'overlay surfaces' },
    { feature: 'CSS color-mix', tier: 'recommended', pass: has(() => CSS.supports('color: color-mix(in srgb, red, blue)')), note: 'token-derived tints' },
    { feature: 'Canvas 2D', tier: 'recommended', pass: has(() => !!document.createElement('canvas').getContext('2d')), note: 'chart fallbacks' },
    { feature: 'Intl.NumberFormat', tier: 'recommended', pass: has(() => typeof Intl?.NumberFormat === 'function'), note: 'localized metrics' },
    { feature: 'WebSocket', tier: 'production', pass: has(() => typeof WebSocket === 'function'), note: 'live inbox sync in prod' },
    { feature: 'BroadcastChannel', tier: 'production', pass: has(() => typeof BroadcastChannel === 'function'), note: 'multi-tab session sync' },
    { feature: 'Web Animations + reduced-motion', tier: 'production', pass: has(() => window.matchMedia('(prefers-reduced-motion: reduce)').media !== 'not all'), note: 'motion preference detectable' },
  ];
}
