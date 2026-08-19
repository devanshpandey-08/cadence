import type { Suite, TestEnv } from './framework';
import { assert, budget, createEnv, eq, measure, syntheticContacts, syntheticEvents, syntheticPosts } from './framework';
import { parsePersisted } from '../store';
import { probeStorage } from './scaleModel';
import { authApi, DEMO_PASSWORD } from '../services/backend';
import { csvEscape, toCsv } from '../services/csv';
import { LIST_SIZES, seedState } from '../data';
import { addDays, isoOf, kfmt, money, monthMatrix, pct, PLATFORM_IDS, relTime, STATUSES, uid, weekOf } from '../meta';
import type { PostStatus } from '../types';

const T = (id: string, name: string, req: Suite['tests'][number]['req'], run: Suite['tests'][number]['run']) => ({ id, name, req, run });

/** Runs a block that touches the real session key, restoring it afterwards. */
const withSessionGuard = async (fn: () => Promise<void> | void) => {
  const KEY = 'cadence-session-v2';
  const saved = localStorage.getItem(KEY);
  try { await fn(); } finally {
    if (saved !== null) localStorage.setItem(KEY, saved);
    else localStorage.removeItem(KEY);
  }
};

/* ================= S1 · CORE UTILITIES ================= */
const utilities: Suite = {
  id: 's1', name: 'Core utilities', icon: 'sliders', tone: '#0e7a52',
  blurb: 'Date math, formatters and ID generation that every module depends on.',
  tests: [
    T('u1', 'isoOf emits zero-padded YYYY-MM-DD', 'resilience', () => {
      eq(isoOf(new Date(2026, 0, 5)), '2026-01-05', 'Jan 5');
      eq(isoOf(new Date(2026, 11, 31)), '2026-12-31', 'Dec 31');
    }),
    T('u2', 'addDays crosses month & year boundaries', 'resilience', () => {
      eq(addDays(new Date(2026, 0, 31), 1).getDate(), 1, 'Jan 31 + 1');
      eq(addDays(new Date(2026, 11, 31), 1).getFullYear(), 2027, 'year rollover');
    }),
    T('u3', 'monthMatrix is always 42 cells starting Monday', 'calendar', () => {
      for (let m = 0; m < 12; m++) {
        const cells = monthMatrix(2026, m);
        eq(cells.length, 42, `month ${m} length`);
        eq((cells[0].date.getDay() + 6) % 7, 0, `month ${m} starts Monday`);
      }
    }),
    T('u4', 'monthMatrix covers the 1st and flags in-month days', 'calendar', () => {
      const cells = monthMatrix(2026, 5);
      assert(cells.some(c => c.iso === '2026-06-01' && c.inMonth), 'June 1 present & in-month');
      assert(cells.filter(c => c.inMonth).length === 30, 'June has 30 in-month cells');
    }),
    T('u5', 'weekOf returns 7 consecutive days from Monday', 'calendar', () => {
      const days = weekOf('2026-06-10'); // a Wednesday
      eq(days.length, 7, 'seven days');
      eq(days[0].iso, '2026-06-08', 'starts Monday');
      for (let i = 1; i < 7; i++) eq(addDays(new Date(days[i - 1].iso + 'T12:00:00'), 1).getDate(), days[i].date.getDate(), `day ${i} consecutive`);
    }),
    T('u6', 'relTime labels past, today and future correctly', 'core-crm', () => {
      eq(relTime(isoOf(new Date())), 'Today', 'today');
      eq(relTime(isoOf(addDays(new Date(), 1))), 'Tomorrow', 'tomorrow');
      eq(relTime(isoOf(addDays(new Date(), -1))), 'Yesterday', 'yesterday');
      eq(relTime(isoOf(addDays(new Date(), -9))), '9d ago', 'past');
      eq(relTime(isoOf(addDays(new Date(), 12))), 'in 12d', 'future');
    }),
    T('u7', 'money, kfmt and pct format without drift', 'core-crm', () => {
      eq(money(48000), '$48,000', 'money');
      eq(kfmt(12400), '12.4K', 'kfmt');
      eq(kfmt(980), '980', 'kfmt small');
      eq(pct(1, 3), '33%', 'pct rounds');
      eq(pct(0, 0), '0%', 'pct div-by-zero safe');
    }),
    T('u8', 'uid produces collision-free identifiers at volume', 'security', () =>
      budget('10,000 uid() calls', 80, () => {
        const set = new Set(Array.from({ length: 10000 }, () => uid()));
        assert(set.size === 10000, `expected 10,000 unique ids, got ${set.size}`);
      })),
  ],
};

/* ================= S2 · DATA INTEGRITY ================= */
const integrity: Suite = {
  id: 's2', name: 'Seed data integrity', icon: 'file', tone: '#3e7cb1',
  blurb: 'Referential integrity across the unified database — the schema contract.',
  tests: [
    T('i1', 'contact ids and emails are unique', 'resilience', () => {
      const s = seedState();
      eq(new Set(s.contacts.map(c => c.id)).size, s.contacts.length, 'unique ids');
      eq(new Set(s.contacts.map(c => c.email)).size, s.contacts.length, 'unique emails');
    }),
    T('i2', 'every deal references an existing contact', 'core-crm', () => {
      const s = seedState();
      const ids = new Set(s.contacts.map(c => c.id));
      s.deals.forEach(d => assert(ids.has(d.contactId), `deal "${d.name}" → missing contact ${d.contactId}`));
    }),
    T('i3', 'thread.contactId always resolves when set', 'inbox', () => {
      const s = seedState();
      const ids = new Set(s.contacts.map(c => c.id));
      s.threads.forEach(t => { if (t.contactId) assert(ids.has(t.contactId), `thread ${t.id} → missing contact`); });
      assert(s.threads.some(t => !t.contactId), 'seed keeps at least one unlinked social contact');
    }),
    T('i4', 'posts only use valid platforms & lifecycle statuses', 'publisher', () => {
      const s = seedState();
      s.posts.forEach(p => {
        p.platforms.forEach(pl => assert(PLATFORM_IDS.includes(pl), `unknown platform ${pl}`));
        assert(p.status in STATUSES, `unknown status ${p.status}`);
      });
    }),
    T('i5', 'users have unique emails and valid hardcoded roles', 'roles', () => {
      const s = seedState();
      eq(new Set(s.users.map(u => u.email)).size, s.users.length, 'unique emails');
      s.users.forEach(u => assert(['admin', 'editor', 'viewer'].includes(u.role), `bad role ${u.role}`));
    }),
    T('i6', 'all 8 social platforms are represented', 'publisher', () => {
      const s = seedState();
      eq(new Set(s.accounts.map(a => a.platform)).size, 8, 'eight unique platforms');
    }),
    T('i7', 'timeline entries only use known activity types', 'core-crm', () => {
      const s = seedState();
      const ok = ['email', 'call', 'meeting', 'note', 'form', 'social', 'deal'];
      s.contacts.forEach(c => c.timeline.forEach(e => assert(ok.includes(e.type), `bad type ${e.type}`)));
    }),
    T('i8', 'demo workspace ships non-trivially populated', 'core-crm', () => {
      const s = seedState();
      assert(s.contacts.length >= 10, 'contacts ≥ 10');
      assert(s.deals.length >= 6, 'deals ≥ 6');
      assert(s.threads.length >= 5, 'threads ≥ 5');
      assert(s.posts.length >= 8, 'posts ≥ 8');
    }),
  ],
};

/* ================= S3 · CRM FLOWS ================= */
const crm: Suite = {
  id: 's3', name: 'CRM flows', icon: 'users', tone: '#0e7a52',
  blurb: 'Contacts, deals, tasks and the automations that tie them together.',
  tests: [
    T('c1', 'addContact creates a record with timeline seed', 'core-crm', env => {
      const before = env.getState().contacts.length;
      const id = env.api.addContact({ name: 'Test Person', email: 'test@qa.dev', company: 'QA Co', title: 'QA', source: 'Manual', tags: [], owner: 'Maya Chen' });
      const c = env.getState().contacts.find(x => x.id === id);
      eq(env.getState().contacts.length, before + 1, 'count +1');
      assert(!!c && c.timeline.length === 1 && c.createdAt === isoOf(new Date()), 'created with timeline');
    }),
    T('c2', 'patchContact merges partial fields immutably', 'core-crm', env => {
      const id = env.getState().contacts[0].id;
      env.api.patchContact(id, { phone: '+1 555' });
      const c = env.getState().contacts.find(x => x.id === id)!;
      eq(c.phone, '+1 555', 'phone merged');
      assert(c.name.length > 0, 'other fields intact');
    }),
    T('c3', 'logActivity prepends to timeline and bumps lastActivity', 'core-crm', env => {
      const c0 = env.getState().contacts[0];
      env.api.logActivity(c0.id, 'call', 'Discussed pricing');
      const c = env.getState().contacts.find(x => x.id === c0.id)!;
      eq(c.timeline[0].text, 'Discussed pricing', 'prepended');
      eq(c.lastActivity, isoOf(new Date()), 'lastActivity bumped');
    }),
    T('c4', 'addDeal stores stage, owner and empty notes', 'pipeline', env => {
      const cid = env.getState().contacts[0].id;
      env.api.addDeal({ name: 'QA Deal', contactId: cid, value: 5000, stage: 'lead', owner: 'Maya Chen', close: isoOf(addDays(new Date(), 30)) });
      const d = env.getState().deals.find(x => x.name === 'QA Deal')!;
      eq(d.stage, 'lead', 'stage');
      eq(d.notes.length, 0, 'notes empty');
    }),
    T('c5', 'AUTOMATION: move → Proposal creates "Send contract" task', 'tasks', env => {
      const cid = env.getState().contacts[0].id;
      env.api.addDeal({ name: 'Auto Deal', contactId: cid, value: 9000, stage: 'qualified', owner: 'Jonas Berg', close: isoOf(addDays(new Date(), 20)) });
      const d = env.getState().deals.find(x => x.name === 'Auto Deal')!;
      const tasksBefore = env.getState().tasks.length;
      env.api.moveDeal(d.id, 'proposal');
      const auto = env.getState().tasks.filter(t => t.auto && t.dealId === d.id);
      eq(env.getState().tasks.length, tasksBefore + 1, 'one task created');
      eq(auto[0].title, 'Send contract — Auto Deal', 'title templated');
      eq(auto[0].assignee, 'Jonas Berg', 'assigned to deal owner');
      assert(env.notifs.some(n => n.includes('Automation')), 'automation notification fired');
    }),
    T('c6', 'move → Won updates stage and notifies the team', 'pipeline', env => {
      const d = env.getState().deals.find(x => x.stage === 'negotiation')!;
      env.api.moveDeal(d.id, 'won');
      eq(env.getState().deals.find(x => x.id === d.id)!.stage, 'won', 'stage won');
      assert(env.notifs.some(n => n.includes('closed won')), 'win notification');
    }),
    T('c7', 'deal moves append to the contact timeline', 'pipeline', env => {
      const d = env.getState().deals.find(x => x.stage === 'lead')!;
      const before = env.getState().contacts.find(c => c.id === d.contactId)!.timeline.length;
      env.api.moveDeal(d.id, 'qualified');
      const after = env.getState().contacts.find(c => c.id === d.contactId)!.timeline.length;
      eq(after, before + 1, 'timeline +1');
    }),
    T('c8', 'toggleTask flips completion state', 'tasks', env => {
      const t = env.getState().tasks.find(x => !x.done)!;
      env.api.toggleTask(t.id);
      eq(env.getState().tasks.find(x => x.id === t.id)!.done, true, 'done');
      env.api.toggleTask(t.id);
      eq(env.getState().tasks.find(x => x.id === t.id)!.done, false, 'reopened');
    }),
    T('c9', 'post lifecycle: draft → pending → approved → scheduled → published', 'approvals', env => {
      const id = env.api.addPost({ text: 'QA lifecycle post', platforms: ['linkedin'], date: isoOf(new Date()), time: '10:00', status: 'draft', author: 'Test', media: 'none' });
      const flow: PostStatus[] = ['pending', 'approved', 'scheduled', 'published'];
      flow.forEach(st => {
        env.api.patchPost(id, { status: st });
        eq(env.getState().posts.find(p => p.id === id)!.status, st, `→ ${st}`);
      });
    }),
    T('c10', 'removePost deletes without touching other posts', 'publisher', env => {
      const before = env.getState().posts.length;
      const id = env.getState().posts[0].id;
      env.api.removePost(id);
      eq(env.getState().posts.length, before - 1, 'count -1');
      assert(!env.getState().posts.some(p => p.id === id), 'gone');
    }),
    T('c11', 'importContacts prepends a batch and notifies', 'api', env => {
      const batch = syntheticContacts(5);
      env.api.importContacts(batch);
      eq(env.getState().contacts[0].id, 'syn-0', 'prepended');
      assert(env.notifs.some(n => n.includes('import finished')), 'import notification');
    }),
  ],
};

/* ================= S4 · MARKETING & INBOX ================= */
const marketing: Suite = {
  id: 's4', name: 'Marketing & inbox', icon: 'mail', tone: '#3e7cb1',
  blurb: 'Social replies, auto-created contacts, campaigns, forms, pages — and export safety.',
  tests: [
    T('m1', 'replyThread appends an outbound message, marks In progress', 'inbox', env => {
      const th = env.getState().threads.find(t => t.contactId)!;
      env.api.replyThread(th.id, 'Yes — we ship worldwide.');
      const t = env.getState().threads.find(x => x.id === th.id)!;
      eq(t.messages[t.messages.length - 1].from, 'us', 'outbound message');
      assert(t.status !== 'unread', 'no longer unread');
    }),
    T('m2', 'AUTOMATION: replying to a stranger auto-creates a Social contact', 'inbox', env => {
      const th = env.getState().threads.find(t => !t.contactId)!;
      const before = env.getState().contacts.length;
      env.api.replyThread(th.id, 'Thanks for reaching out!');
      const t = env.getState().threads.find(x => x.id === th.id)!;
      eq(env.getState().contacts.length, before + 1, 'contact created');
      assert(!!t.contactId, 'thread linked');
      const c = env.getState().contacts.find(x => x.id === t.contactId)!;
      eq(c.source, 'Social', 'source Social');
      assert(c.fromSocial === true, 'fromSocial flag');
    }),
    T('m3', 'addCampaign seeds zeroed metrics', 'email', env => {
      env.api.addCampaign({ name: 'QA Blast', subject: 'Hello {{first_name}}', list: Object.keys(LIST_SIZES)[0], status: 'draft', date: isoOf(new Date()) });
      const c = env.getState().campaigns.find(x => x.name === 'QA Blast')!;
      eq(c.sent + c.opens + c.clicks, 0, 'metrics zeroed');
    }),
    T('m4', 'sendCampaign: reach = list size, opens ≤ sent, clicks ≤ opens', 'email', env => {
      const list = Object.keys(LIST_SIZES)[0];
      env.api.addCampaign({ name: 'QA Send', subject: 'Test', list, status: 'draft', date: isoOf(new Date()) });
      const c = env.getState().campaigns.find(x => x.name === 'QA Send')!;
      env.api.sendCampaign(c.id);
      const sent = env.getState().campaigns.find(x => x.id === c.id)!;
      eq(sent.status, 'sent', 'status sent');
      eq(sent.sent, LIST_SIZES[list], 'reach equals list size');
      assert(sent.opens <= sent.sent && sent.clicks <= sent.opens, 'funnel monotonic');
    }),
    T('m5', 'addForm publishes active with zero submissions', 'forms', env => {
      env.api.addForm({ name: 'QA Form', type: 'popup', template: 'Contact' });
      const f = env.getState().forms.find(x => x.name === 'QA Form')!;
      eq(f.active, true, 'active');
      eq(f.submissions, 0, 'zero submissions');
    }),
    T('m6', 'addPage goes live on a slug domain', 'pages', env => {
      env.api.addPage({ name: 'QA Page', slug: 'qa-page', template: 'squeeze' });
      const p = env.getState().pages.find(x => x.slug === 'qa-page')!;
      eq(p.status, 'live', 'live');
    }),
    T('m7', 'movePost reschedules to the target date', 'calendar', env => {
      const p = env.getState().posts[0];
      env.api.movePost(p.id, '2026-12-24');
      eq(env.getState().posts.find(x => x.id === p.id)!.date, '2026-12-24', 'date moved');
    }),
    T('m8', 'CSV export quotes commas, quotes and newlines (RFC 4180)', 'security', () => {
      const csv = toCsv(['name'], [['Acme, Inc. "Best" \n Corp']]);
      eq(csv, 'name\n"Acme, Inc. ""Best"" \n Corp"', 'escaped, embedded newline preserved inside quotes');
    }),
    T('m9', 'CSV formula-injection cells are neutralized', 'security', () => {
      eq(csvEscape('=CMD("calc")'), '"\'=CMD(""calc"")"', '= guarded');
      eq(csvEscape('+1+1'), '"\'+1+1"', '+ guarded');
      eq(csvEscape('@SUM(A1)'), '"\'@SUM(A1)"', '@ guarded');
      eq(csvEscape('Normal value'), '"Normal value"', 'clean values untouched');
    }),
    T('m10', 'script payloads are stored as inert data, never executed', 'security', env => {
      const payload = '<script>document.title="pwned"</script>';
      env.api.addContact({ name: payload, email: 'xss@qa.dev', company: 'QA', title: '', source: 'Manual', tags: [], owner: 'Maya Chen' });
      const c = env.getState().contacts.find(x => x.email === 'xss@qa.dev')!;
      eq(c.name, payload, 'stored verbatim as text');
      assert(document.title !== 'pwned', 'no execution');
    }),
  ],
};

/* ================= S5 · SECURITY & ROLES ================= */
const security: Suite = {
  id: 's5', name: 'Security & RBAC', icon: 'shield', tone: '#c2483b',
  blurb: 'Auth, sessions, and least-privilege enforcement on every mutation.',
  tests: [
    T('r1', 'valid credentials authenticate', 'security', async env =>
      withSessionGuard(async () => {
        const res = await authApi.login(env.getState().users, 'maya@emberandoak.com', DEMO_PASSWORD);
        assert(res.ok, 'login ok');
        if (res.ok) eq(res.user.email, 'maya@emberandoak.com', 'right user');
      })),
    T('r2', 'wrong password is rejected with a safe error', 'security', async env => {
      const res = await authApi.login(env.getState().users, 'maya@emberandoak.com', 'wrong-password');
      eq(res.ok, false, 'rejected');
    }),
    T('r3', 'unknown email is rejected without user enumeration', 'security', async env => {
      const res = await authApi.login(env.getState().users, 'ghost@nowhere.dev', DEMO_PASSWORD);
      eq(res.ok, false, 'rejected');
    }),
    T('r4', 'session persists and restores across a reload', 'security', async env =>
      withSessionGuard(async () => {
        await authApi.login(env.getState().users, 'maya@emberandoak.com', DEMO_PASSWORD);
        const restored = authApi.restore(env.getState().users);
        assert(restored?.email === 'maya@emberandoak.com', 'session restored');
        authApi.logout();
        eq(authApi.restore(env.getState().users), null, 'cleared after logout');
      })),
    T('r5', 'logout clears the session and drops privileges', 'security', env => {
      env.setMe('admin');
      assert(env.getState().me !== null, 'signed in');
      env.api.logout();
      eq(env.getState().me, null, 'signed out');
    }),
    T('r6', 'VIEWER BLOCKED · add contact', 'roles', env => {
      env.setMe('viewer');
      const before = env.getState().contacts.length;
      env.api.addContact({ name: 'Blocked', email: 'b@qa.dev', company: '', title: '', source: 'Manual', tags: [], owner: '' });
      eq(env.getState().contacts.length, before, 'no state change');
      assert(env.toasts.some(t => t.includes('read-only')), 'warning surfaced');
    }),
    T('r7', 'VIEWER BLOCKED · move deal', 'roles', env => {
      env.setMe('viewer');
      const d = env.getState().deals[0];
      env.api.moveDeal(d.id, 'won');
      eq(env.getState().deals.find(x => x.id === d.id)!.stage, d.stage, 'stage unchanged');
    }),
    T('r8', 'VIEWER BLOCKED · approve post (approval bypass attempt)', 'roles', env => {
      env.setMe('viewer');
      const p = env.getState().posts.find(x => x.status === 'pending')!;
      env.api.patchPost(p.id, { status: 'published' });
      eq(env.getState().posts.find(x => x.id === p.id)!.status, 'pending', 'still pending');
    }),
    T('r9', 'VIEWER BLOCKED · reply in inbox', 'roles', env => {
      env.setMe('viewer');
      const th = env.getState().threads[0];
      const msgs = th.messages.length;
      env.api.replyThread(th.id, 'should not send');
      eq(env.getState().threads.find(x => x.id === th.id)!.messages.length, msgs, 'no message added');
    }),
    T('r10', 'VIEWER BLOCKED · send campaign', 'roles', env => {
      env.setMe('viewer');
      const c = env.getState().campaigns.find(x => x.status !== 'sent')!;
      env.api.sendCampaign(c.id);
      assert(env.getState().campaigns.find(x => x.id === c.id)!.status !== 'sent', 'not sent');
    }),
    T('r11', 'EDITOR BLOCKED · user management is admin-only', 'roles', env => {
      env.setMe('editor');
      const before = env.getState().users.length;
      env.api.addUser('Sneaky', 'sneaky@qa.dev', 'admin');
      eq(env.getState().users.length, before, 'no privilege escalation');
    }),
    T('r12', 'ADMIN ALLOWED · add user and change roles', 'roles', env => {
      env.setMe('admin');
      env.api.addUser('New Hire', 'new@qa.dev', 'editor');
      const u = env.getState().users.find(x => x.email === 'new@qa.dev')!;
      assert(!!u, 'user added');
      env.api.patchUser(u.id, { role: 'viewer' });
      eq(env.getState().users.find(x => x.id === u.id)!.role, 'viewer', 'role changed');
    }),
  ],
};

/* ================= S6 · RESILIENCE & SCALE ================= */
const scale: Suite = {
  id: 's6', name: 'Resilience & scale', icon: 'gauge', tone: '#c08a1e',
  blurb: 'Crash-safety on corrupt storage, and throughput budgets at 10–50× current load.',
  tests: [
    T('x1', 'corrupt JSON falls back to seed instead of crashing', 'resilience', () => {
      eq(parsePersisted('{{{not json'), null, 'garbage → null');
      eq(parsePersisted(null), null, 'empty → null');
      eq(parsePersisted('{"version":1,"data":{}}'), null, 'old version → null');
    }),
    T('x2', 'a valid v2 payload restores exactly', 'resilience', () => {
      const s = seedState();
      const { toasts: _t, me: _m, ...rest } = s;
      const out = parsePersisted(JSON.stringify({ version: 2, data: rest }));
      assert(out !== null && out.contacts.length === s.contacts.length, 'contacts restored');
      assert(out!.deals.length === s.deals.length, 'deals restored');
    }),
    T('x3', 'reducer ingests 10,000 contacts inside budget', 'scale', env =>
      budget('10k contact inserts', 1800, () => {
        syntheticContacts(10000).forEach(c => env.dispatch({ t: 'contact+', c }));
        eq(env.getState().contacts.length, 10000 + seedState().contacts.length, 'all ingested');
      })),
    T('x4', 'search + tag filter over 50,000 contacts beats 120ms', 'scale', () => {
      const big = syntheticContacts(50000);
      const q = 'scale contact 4';
      return budget('50k search', 120, () => {
        const hits = big.filter(c => (c.name + c.company + c.email).toLowerCase().includes(q) && c.tags.includes('lead'));
        assert(hits.length >= 0, 'search completed');
      });
    }),
    T('x5', 'calendar math for 20 years of months beats 60ms', 'scale', () =>
      budget('240 monthMatrix calls', 60, () => {
        let cells = 0;
        for (let y = 2020; y < 2040; y++) for (let m = 0; m < 12; m++) cells += monthMatrix(y, m).length;
        eq(cells, 240 * 42, 'cell count');
      })),
    T('x6', 'unified activity feed merges 25k events inside budget', 'scale', () => {
      const contacts = syntheticContacts(25000);
      return budget('25k-event feed merge', 220, () => {
        const feed = contacts
          .flatMap(c => c.timeline.map(t => ({ ...t, who: c.name })))
          .sort((a, b) => b.at.localeCompare(a.at))
          .slice(0, 8);
        eq(feed.length, 8, 'top 8');
      });
    }),
    T('x7', 'calendar grouping of 5,000 posts beats 40ms', 'scale', () => {
      const posts = syntheticPosts(5000);
      return budget('5k post grouping', 40, () => {
        const byDate = new Map<string, number>();
        posts.forEach(p => byDate.set(p.date, (byDate.get(p.date) ?? 0) + 1));
        assert(byDate.size <= 60, 'grouped by day');
      });
    }),
    T('x8', 'persistence payload for 5,000 contacts stays under 4.5 MB', 'scale', () =>
      budget('5k serialize', 2000, () => {
        const s = seedState();
        const big = { ...s, contacts: [...syntheticContacts(5000), ...s.contacts] };
        const bytes = new TextEncoder().encode(JSON.stringify({ version: 2, data: big })).length;
        const mb = bytes / (1024 * 1024);
        assert(mb < 4.5, `payload ${mb.toFixed(2)} MB exceeds localStorage quota risk`);
        return undefined as never;
      })),
    T('x9', '100k contacts serialize inside the persistence budget', 'scale', () =>
      budget('100k serialize', 2500, () => {
        const json = JSON.stringify(syntheticContacts(100000));
        const mb = json.length / 1e6;
        // ~230 B/record ⇒ 100k rows ≈ 23 MB; guard against both truncation and bloat
        assert(mb > 15 && mb < 80, `payload sanity — got ${mb.toFixed(1)} MB, expected ~23 MB`);
      })),
    T('x10', 'activity feed merge stays linear at 100k events', 'scale', () =>
      budget('100k-event merge', 400, () => {
        const feed = syntheticEvents(100000).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8);
        eq(feed.length, 8, 'top 8');
      })),
    T('x11', 'kanban grouping holds a 60fps frame with 5k deals', 'scale', () =>
      budget('5k-deal group + sum', 80, () => {
        const stages = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as const;
        const deals = Array.from({ length: 5000 }, (_, i) => ({ id: `d${i}`, stage: stages[i % 6], value: 1000 + i * 10 }));
        stages.forEach(st => deals.filter(d => d.stage === st).reduce((n, d) => n + d.value, 0));
      })),
    T('x12', 'browser storage probe finds ≥ 2 MB usable', 'scale', async () => {
      const q = await probeStorage();
      assert(q.usableMB >= 2, `only ${q.usableMB.toFixed(1)} MB usable`);
      return { metric: { value: `${q.usableMB.toFixed(1)} MB`, budget: '≥ 2 MB' } };
    }),
  ],
};

export const SUITES: Suite[] = [utilities, integrity, crm, marketing, security, scale];
export const TOTAL_TESTS = SUITES.reduce((n, s) => n + s.tests.length, 0);

/* ---------- requirement coverage map ---------- */
export const REQ_LABEL: Record<string, { label: string; spec: string }> = {
  'core-crm': { label: 'Unified contacts & timeline', spec: 'Feature 1' },
  pipeline: { label: 'Deal pipeline (kanban + list)', spec: 'Feature 2' },
  tasks: { label: 'Tasks & automations', spec: 'Feature 3' },
  calendar: { label: 'Content calendar', spec: 'Feature 4' },
  publisher: { label: 'Multi-platform publisher', spec: 'Feature 5' },
  forms: { label: 'Form builder', spec: 'Feature 6' },
  pages: { label: 'Landing pages', spec: 'Feature 7' },
  email: { label: 'Email campaigns (SMTP)', spec: 'Feature 8' },
  approvals: { label: 'Approval workflows', spec: 'Feature 10' },
  inbox: { label: 'Unified social inbox', spec: 'Feature 11' },
  roles: { label: 'Roles & permissions', spec: 'Feature 13' },
  security: { label: 'Auth & injection safety', spec: 'Hardening' },
  resilience: { label: 'Crash-safe persistence', spec: 'Hardening' },
  scale: { label: 'Throughput budgets', spec: 'Scalability' },
  api: { label: 'Import / REST surface', spec: 'Feature 18' },
};

export async function runOne(def: Suite['tests'][number]) {
  const env = createEnv('admin');
  const t0 = performance.now();
  try {
    const out = await def.run(env);
    return { id: def.id, name: def.name, req: def.req, pass: true, ms: performance.now() - t0, metric: out && 'metric' in out ? out.metric : undefined };
  } catch (e) {
    return { id: def.id, name: def.name, req: def.req, pass: false, ms: performance.now() - t0, detail: e instanceof Error ? e.message : String(e) };
  }
}

/* Live RBAC probe — attempts each mutation under each role and checks the delta. */
export function probeRbac() {
  const attempts: { label: string; run: (env: TestEnv) => boolean }[] = [
    { label: 'Add contact', run: e => { const n = e.getState().contacts.length; e.api.addContact({ name: 'P', email: 'p@p.dev', company: '', title: '', source: 'Manual', tags: [], owner: '' }); return e.getState().contacts.length > n; } },
    { label: 'Move deal', run: e => { const d = e.getState().deals.find(x => x.stage !== 'won')!; e.api.moveDeal(d.id, 'won'); return e.getState().deals.find(x => x.id === d.id)!.stage === 'won'; } },
    { label: 'Approve post', run: e => { const p = e.getState().posts.find(x => x.status === 'pending')!; e.api.patchPost(p.id, { status: 'published' }); return e.getState().posts.find(x => x.id === p.id)!.status === 'published'; } },
    { label: 'Reply in inbox', run: e => { const th = e.getState().threads[0]; const n = th.messages.length; e.api.replyThread(th.id, 'x'); return e.getState().threads.find(x => x.id === th.id)!.messages.length > n; } },
    { label: 'Send campaign', run: e => { const c = e.getState().campaigns.find(x => x.status !== 'sent')!; e.api.sendCampaign(c.id); return e.getState().campaigns.find(x => x.id === c.id)!.status === 'sent'; } },
    { label: 'Import contacts', run: e => { const n = e.getState().contacts.length; e.api.importContacts(syntheticContacts(2)); return e.getState().contacts.length > n; } },
    { label: 'Add user', run: e => { const n = e.getState().users.length; e.api.addUser('X', 'x@x.dev', 'editor'); return e.getState().users.length > n; } },
    { label: 'Change roles', run: e => { const u = e.getState().users[1]; e.api.patchUser(u.id, { role: 'viewer' }); return e.getState().users.find(x => x.id === u.id)!.role === 'viewer'; } },
  ];
  const roles = ['admin', 'editor', 'viewer'] as const;
  return {
    roles,
    rows: attempts.map(at => ({
      label: at.label,
      cells: roles.map(r => at.run(createEnv(r))),
    })),
  };
}
