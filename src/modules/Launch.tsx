import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { Btn, Card, Pill, SectionTitle, Toggle } from '../components/ui';

/* ------------------------------------------------------------------ */
/* Launch plan — grounded in production research:                      */
/*  - Multi-tenant Postgres via Row-Level Security (shared schema)     */
/*  - The 3 real costs: app review, token refresh, rate-limiting       */
/* ------------------------------------------------------------------ */

interface LaunchTask {
  id: string;
  label: string;
  detail: string;
  effort: number; // engineer-days
  critical?: boolean; // blocks first paying customer
}
interface LaunchPhase {
  id: string;
  name: string;
  icon: string;
  color: string;
  blurb: string;
  tasks: LaunchTask[];
}

const PLAN: LaunchPhase[] = [
  {
    id: 'found', name: 'Foundation', icon: 'database', color: '#0b7a55',
    blurb: 'Data isolation & real auth. Nothing else is safe without this.',
    tasks: [
      { id: 'db', label: 'Production Postgres with Row-Level Security', effort: 4, critical: true,
        detail: 'One shared schema, a workspace_id column on every table, and Postgres RLS policies so a missing tenant filter can never leak another customer\u2019s rows. This is the cost-efficient model that scales to millions of rows before you ever shard.' },
      { id: 'auth', label: 'Replace demo auth with bcrypt + JWT refresh rotation', effort: 3, critical: true,
        detail: 'Hash passwords with bcrypt, issue short-lived access tokens (15m) and rotating refresh tokens in httpOnly cookies. The service seam in services/backend.ts already matches this contract \u2014 swap fetch() in per method.' },
      { id: 'env', label: 'Secrets & environment management', effort: 1, critical: true,
        detail: 'Database URL, SMTP creds, platform client secrets and Stripe keys in a secret manager \u2014 never in the repo or the client bundle.' },
      { id: 'domain', label: 'Domain, DNS & automatic SSL', effort: 1, critical: true,
        detail: 'App domain + wildcard for tenant landing pages (yoursite.yourdomain.com). Let the host auto-renew TLS.' },
      { id: 'backup', label: 'Backups + point-in-time recovery', effort: 2, critical: true,
        detail: 'Managed Postgres with daily snapshots and WAL archiving. Test an actual restore, not just that backups run.' },
    ],
  },
  {
    id: 'rev', name: 'Revenue', icon: 'card', color: '#b26e14',
    blurb: 'Billing, deliverability and the legal floor. Required to charge.',
    tasks: [
      { id: 'stripe', label: 'Stripe billing for the $29 / $79 plans', effort: 3, critical: true,
        detail: 'Checkout + customer portal, metered limits (contacts, social accounts, emails/mo) enforced at the API boundary \u2014 the same RBAC gate the QA console already probes. Handle webhooks for subscription lifecycle.' },
      { id: 'email', label: 'Email deliverability: SPF / DKIM / DMARC', effort: 2, critical: true,
        detail: 'Phase 1 sends via the customer\u2019s SMTP, so document their DNS records. If you later deliver for them, warm a dedicated sending domain and authenticate it.' },
      { id: 'legal', label: 'Terms, Privacy Policy & DPA', effort: 2,
        detail: 'You store contacts and social data \u2014 you need a ToS, privacy policy, and a data-processing agreement for GDPR-adjacent customers. Use counsel-drafted templates.' },
      { id: 'pricing', label: 'Plan limits wired to enforcement', effort: 2,
        detail: 'Free (500 contacts / 3 accounts), Starter ($29), Growth ($79). Enforce in middleware, surface upgrade prompts in-product.' },
    ],
  },
  {
    id: 'plat', name: 'Platform', icon: 'globe', color: '#3b6fd4',
    blurb: 'The three things that cost real time: app review, tokens, rate limits.',
    tasks: [
      { id: 'apps', label: 'Platform app review (Meta, LinkedIn, TikTok, X, YT, Pinterest, Google)', effort: 10, critical: true,
        detail: 'Each network reviews your app before production access. Meta and TikTok are the slowest \u2014 start these first, they run in parallel and gate your launch date more than any code does.' },
      { id: 'tokens', label: 'OAuth token refresh workers', effort: 4, critical: true,
        detail: 'Access tokens expire (Meta ~60d, LinkedIn ~60d, TikTok 24h). A background worker must refresh them before expiry and alert when a customer must re-auth.' },
      { id: 'webhooks', label: 'Webhooks for inbox: comments, DMs, mentions', effort: 5, critical: true,
        detail: 'Subscribe to each platform\u2019s realtime events, verify signatures, and enqueue into the unified inbox. This is what makes the Social Inbox live instead of polled.' },
      { id: 'queue', label: 'Redis + Bull queue for publishing', effort: 3, critical: true,
        detail: 'Scheduled posts fan out through a queue with per-platform rate-limit accounting and retry/backoff. Keeps publish spikes off the request path and respects API quotas.' },
      { id: 'gaps', label: 'Handle platform publishing gaps', effort: 3,
        detail: 'Some targets (TikTok reach, IG Stories/Reels) can\u2019t be fully automated \u2014 ship the schedule-plus-manual-reminder flow the Composer already models.' },
    ],
  },
  {
    id: 'ops', name: 'Operations', icon: 'pulse', color: '#7a5fa8',
    blurb: 'Run it like a business: observe, deploy, scale horizontally.',
    tasks: [
      { id: 'ci', label: 'CI/CD: test \u2192 build \u2192 deploy', effort: 2, critical: true,
        detail: 'Run the QA suite in CI so a regression blocks the deploy. Blue-green or rolling deploys behind the load balancer.' },
      { id: 'monitor', label: 'Monitoring, logs & alerting', effort: 3, critical: true,
        detail: 'Error tracking, uptime, queue depth, and token-refresh failures paged to you. You can\u2019t fix a silent social outage a customer finds first.' },
      { id: 'scale', label: 'Stateless API + read replicas', effort: 3,
        detail: 'The API tier holds no session state, so you add nodes horizontally. Offload dashboard/report reads to replicas; partition the posts table by month past ~10M rows.' },
      { id: 'cdn', label: 'CDN in front of S3 media', effort: 1,
        detail: 'Serve images/attachments from object storage through a CDN. Cheap, and it keeps app servers from ever touching bytes.' },
    ],
  },
];

const TOTAL_TASKS = PLAN.reduce((n, p) => n + p.tasks.length, 0);

/* ---------- persistence ---------- */
const LS = 'cadence-launch-v1';
interface LaunchState { done: Record<string, boolean>; inprog: Record<string, boolean>; }
function loadLaunch(): LaunchState {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return JSON.parse(raw);
  } catch { /* noop */ }
  return { done: {}, inprog: {} };
}

/* ---------- living clock ---------- */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/* ---------- readiness ring ---------- */
function Ring({ pct, size = 120 }: { pct: number; size?: number }) {
  const r = (size - 14) / 2;
  const C = 2 * Math.PI * r;
  const color = pct >= 100 ? '#0b7a55' : pct >= 60 ? '#b26e14' : '#c2483b';
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (Math.min(pct, 100) / 100) * C}
          className="transition-all duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[26px] font-bold leading-none" style={{ color }}>{Math.round(pct)}%</span>
        <span className="mt-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] text-mut">ready</span>
      </div>
    </div>
  );
}

/* ---------- task row ---------- */
function TaskRow({ t, state, onToggle, onProg }: {
  t: LaunchTask; state: LaunchState;
  onToggle: (id: string) => void; onProg: (id: string) => void;
}) {
  const done = !!state.done[t.id];
  const inprog = !!state.inprog[t.id] && !done;
  return (
    <div className={cx('group rounded-lg border px-3 py-2.5 transition-all',
      done ? 'border-moss/40 bg-mint/40' : inprog ? 'border-amber/50 bg-amberbg/30' : 'border-line bg-card hover:border-line2')}>
      <div className="flex items-start gap-2.5">
        <button onClick={() => onToggle(t.id)}
          className={cx('mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-all active:scale-90',
            done ? 'border-moss bg-moss text-card' : 'border-line2 bg-card hover:border-moss')}>
          {done && <Icon name="check" size={11} sw={3.4} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className={cx('text-[12.5px] font-semibold leading-snug', done ? 'text-mut line-through' : 'text-ink')}>{t.label}</p>
            {t.critical && !done && (
              <Pill color="#c2483b" tint="#f8e6e2" className="!px-1.5 !text-[9px]">blocks launch</Pill>
            )}
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-mut">{t.detail}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="font-mono text-[9.5px] font-semibold text-faint">{t.effort} eng-day{t.effort > 1 ? 's' : ''}</span>
            <button onClick={() => onProg(t.id)}
              className={cx('ml-auto rounded-md border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide transition-all',
                inprog ? 'border-amber bg-amberbg text-amber' : 'border-line text-faint opacity-0 group-hover:opacity-100 hover:border-amber hover:text-amber')}>
              {inprog ? 'in progress' : 'mark in progress'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- module ---------- */
export function Launch() {
  const { a } = useApp();
  const [state, setState] = useState<LaunchState>(loadLaunch);
  const [tab, setTab] = useState<'plan' | 'stack' | 'cost'>('plan');
  const now = useNow();

  useEffect(() => {
    try { localStorage.setItem(LS, JSON.stringify(state)); } catch { /* noop */ }
  }, [state]);

  const toggle = (id: string) => setState(s => ({ ...s, done: { ...s.done, [id]: !s.done[id] } }));
  const prog = (id: string) => setState(s => ({ ...s, inprog: { ...s.inprog, [id]: !s.inprog[id] } }));

  const { doneCount, inprogCount, readiness, effortTotal, effortDone, criticalLeft } = useMemo(() => {
    let done = 0, inprog = 0, eT = 0, eD = 0, crit = 0;
    PLAN.forEach(p => p.tasks.forEach(t => {
      eT += t.effort;
      if (state.done[t.id]) { done++; eD += t.effort; }
      else {
        if (state.inprog[t.id]) inprog++;
        if (t.critical) crit++;
      }
    }));
    return {
      doneCount: done, inprogCount: inprog,
      readiness: (done / TOTAL_TASKS) * 100,
      effortTotal: eT, effortDone: eD, criticalLeft: crit,
    };
  }, [state]);

  const launched = readiness >= 100;
  const clock = now.toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="space-y-4">
      {/* mission-control header */}
      <div className="glow-top relative overflow-hidden rounded-xl border border-line bg-card p-5">
        <div className="pointer-events-none absolute -right-6 -top-10 select-none font-display text-[150px] font-bold leading-none text-ink opacity-[0.03]">GO</div>
        <div className="relative flex flex-wrap items-center gap-6">
          <Ring pct={readiness} />
          <div className="min-w-[220px] flex-1">
            <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-mut">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" /> Launch console · {clock}
            </p>
            <h1 className="mt-1 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">
              {launched ? 'Cleared for launch.' : 'Pre-flight to production.'}
            </h1>
            <p className="mt-1 max-w-[560px] text-[12.5px] leading-relaxed text-mut">
              {doneCount}/{TOTAL_TASKS} checks complete · {inprogCount} in progress · <span className={cx('font-semibold', criticalLeft ? 'text-danger' : 'text-moss')}>{criticalLeft} launch-blocker{criticalLeft === 1 ? '' : 's'} left</span> · {effortDone}/{effortTotal} eng-days done. Grounded in multi-tenant Postgres + the real social-API costs.
            </p>
            <div className="mt-3 h-1.5 w-full max-w-[420px] overflow-hidden rounded-full bg-line">
              <div className="anim-grow h-full rounded-full bg-gradient-to-r from-moss to-[#2fbf8f]" style={{ width: `${readiness}%` }} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Btn variant={launched ? 'primary' : 'outline'} onClick={() => a.toast(launched ? 'All checks green \u2014 ship it.' : `${criticalLeft} critical item${criticalLeft === 1 ? '' : 's'} still open`, launched ? 'success' : 'warning')}>
              <Icon name={launched ? 'check' : 'alert'} size={14} /> {launched ? 'Ready to deploy' : 'Pre-flight status'}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setState({ done: {}, inprog: {} }); a.toast('Launch checklist reset', 'info'); }}>
              <Icon name="refresh" size={13} /> Reset checklist
            </Btn>
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="flex items-center gap-2">
        {([['plan', 'checklist', 'Launch checklist'], ['stack', 'database', 'The stack that scales'], ['cost', 'tag', 'Cost model']] as const).map(([id, icon, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cx('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition-all',
              tab === id ? 'border-moss bg-moss text-card shadow-btn' : 'border-line bg-card text-mut hover:border-line2 hover:text-ink')}>
            <Icon name={icon} size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'plan' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {PLAN.map(phase => {
            const pDone = phase.tasks.filter(t => state.done[t.id]).length;
            const pPct = (pDone / phase.tasks.length) * 100;
            return (
              <Card key={phase.id} className="overflow-hidden">
                <div className="border-b border-line px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: phase.color + '1a', color: phase.color }}>
                      <Icon name={phase.icon} size={15} />
                    </span>
                    <div className="flex-1">
                      <p className="font-display text-[14px] font-bold text-ink">{phase.name}</p>
                      <p className="text-[10.5px] text-mut">{phase.blurb}</p>
                    </div>
                    <Pill color={pPct === 100 ? '#0b7a55' : '#6e776f'} tint={pPct === 100 ? '#e2efe7' : '#eceee7'} className="tnum">{pDone}/{phase.tasks.length}</Pill>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pPct}%`, background: phase.color }} />
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  {phase.tasks.map(t => <TaskRow key={t.id} t={t} state={state} onToggle={toggle} onProg={prog} />)}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'stack' && <StackView />}
      {tab === 'cost' && <CostView />}
    </div>
  );
}

/* ---------- architecture that scales ---------- */
function StackView() {
  const layers = [
    { icon: 'globe', name: 'CDN + Web', note: 'Static React bundle + media cache. Serves the UI; never touches the DB.', tech: 'Vercel / CloudFront' },
    { icon: 'server', name: 'Stateless API tier', note: 'Express/FastAPI behind a load balancer. Add nodes horizontally; sessions live in tokens, not memory.', tech: 'Node / Python' },
    { icon: 'bolt', name: 'Queue workers', note: 'Redis + Bull. Publishing, SMTP fan-out, token refresh, webhook ingest \u2014 all off the request path with rate-limit accounting.', tech: 'Redis + BullMQ' },
    { icon: 'database', name: 'Postgres \u00b7 one schema, RLS', note: 'workspace_id on every row + Row-Level Security. Read replicas for dashboards; partition posts by month past ~10M rows.', tech: 'PostgreSQL 16' },
    { icon: 'image', name: 'Object storage', note: 'Images, logos, attachments. The DB stores references only \u2014 ~$0.20\u20130.40 marginal cost per customer.', tech: 'S3' },
  ];
  return (
    <Card className="p-5">
      <SectionTitle>How this reaches HubSpot-scale data</SectionTitle>
      <p className="mb-4 max-w-[680px] text-[12px] leading-relaxed text-mut">
        You don\u2019t start with a cluster. You start with one Postgres schema isolated by Row-Level Security \u2014 the model that stays cheap and correct through millions of rows \u2014 and scale each layer independently as customers arrive.
      </p>
      <div className="space-y-2.5">
        {layers.map((l, i) => (
          <div key={l.name} className="anim-rise flex items-start gap-3.5 rounded-xl border border-line bg-paper/50 p-3.5" style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex flex-col items-center">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-moss/12 text-moss"><Icon name={l.icon} size={16} /></span>
              {i < layers.length - 1 && <span className="mt-1 h-6 w-px bg-line2" />}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-bold text-ink">{l.name}</p>
                <span className="rounded bg-ink/6 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-ink2">{l.tech}</span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-mut">{l.note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { n: '10M+ rows', d: 'before you partition the posts table by month' },
          { n: 'RLS', d: 'a missing tenant filter can never leak another workspace' },
          { n: 'horizontal', d: 'stateless API \u2192 add nodes, not a rewrite' },
        ].map(x => (
          <div key={x.n} className="rounded-lg border border-line bg-card p-3">
            <p className="font-display text-[18px] font-bold text-moss">{x.n}</p>
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-mut">{x.d}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- cost model ---------- */
function CostView() {
  const rows = [
    { cust: '100 customers', infra: '$40\u201380', per: '~$0.60', margin: 'healthy' },
    { cust: '1,000 customers', infra: '$200\u2013400', per: '~$0.20\u20130.40', margin: 'strong' },
    { cust: '10,000 customers', infra: '$900\u20131,800', per: '~$0.10\u20130.18', margin: 'excellent' },
  ];
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <SectionTitle>Infrastructure economics</SectionTitle>
        <p className="mb-4 max-w-[680px] text-[12px] leading-relaxed text-mut">
          Because email rides the customer\u2019s SMTP, media lives in S3, and publishing is queued, your marginal cost per customer stays in cents \u2014 which is what lets a flat $29\u201379 price reach ~90% gross margin at scale.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="border-b border-line">
                {['Scale', 'Monthly infra', 'Per customer', 'Gross margin'].map(h => (
                  <th key={h} className="px-3 py-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.cust} className="border-b border-line/60 last:border-0">
                  <td className="px-3 py-2.5 text-[12.5px] font-semibold text-ink">{r.cust}</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-ink2">{r.infra} / mo</td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-ink2">{r.per} / mo</td>
                  <td className="px-3 py-2.5"><Pill color="#0b7a55" tint="#e2efe7">{r.margin}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4">
          <SectionTitle>What the demo already proves</SectionTitle>
          <ul className="space-y-1.5">
            {['Unified CRM + scheduler + email data model', 'Role-based access enforced at the action boundary', 'Approval, automation & inbox workflows end to end', 'A measured scale ceiling & passing QA suite'].map(x => (
              <li key={x} className="flex items-start gap-2 text-[11.5px] text-ink2"><Icon name="check" size={12} sw={3} className="mt-0.5 shrink-0 text-moss" />{x}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <SectionTitle>What production adds</SectionTitle>
          <ul className="space-y-1.5">
            {['Real auth, RLS isolation & backups', 'Stripe billing wired to plan limits', 'Platform app review + token refresh workers', 'Webhooks, queue, monitoring & CI/CD'].map(x => (
              <li key={x} className="flex items-start gap-2 text-[11.5px] text-ink2"><Icon name="plus" size={12} sw={2.6} className="mt-0.5 shrink-0 text-amber" />{x}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
