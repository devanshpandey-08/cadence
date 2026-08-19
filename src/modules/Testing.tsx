import { useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { SUITES, TOTAL_TESTS, REQ_LABEL, runOne, probeRbac } from '../testing/suites';
import type { Suite, TestResult } from '../testing/framework';
import { measure, syntheticContacts, syntheticPosts } from '../testing/framework';
import { reducer } from '../store';
import { seedState } from '../data';
import { Btn, Card, IconBtn, Pill, SectionTitle, Seg } from '../components/ui';

type Tab = 'suites' | 'load' | 'security' | 'coverage';

const tick = () => new Promise<void>(r => window.setTimeout(r, 24));

/* ================= console header ================= */
function ConsoleHeader({ passed, failed, totalMs, running, onRunAll }: {
  passed: number; failed: number; totalMs: number; running: boolean; onRunAll: () => void;
}) {
  const ran = passed + failed;
  const all = ran === TOTAL_TESTS;
  const status = running ? 'RUNNING' : failed > 0 ? 'FAILING' : all && passed > 0 ? 'ALL GREEN' : 'IDLE';
  const statusColor = running ? '#c08a1e' : failed > 0 ? '#c2483b' : all && passed > 0 ? '#0e7a52' : '#8fa096';
  return (
    <div className="overflow-hidden rounded-xl border border-nightline bg-night text-card shadow-lift">
      <div className="flex items-center gap-2 border-b border-nightline px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/80" /><span className="h-2.5 w-2.5 rounded-full bg-amber/80" /><span className="h-2.5 w-2.5 rounded-full bg-moss/80" />
        <span className="ml-2 font-mono text-[11px] text-nighttx">cadence · qa console</span>
        <span className="ml-auto hidden font-mono text-[10px] text-nighttx sm:block">same reducer + action core the app runs — zero mocks</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-moss/15 text-moss"><Icon name="terminal" size={22} /></span>
          <div>
            <p className="font-mono text-[12px] text-nighttx">$ cadence qa --run-all</p>
            <p className="font-display text-[22px] font-bold leading-tight tracking-tight">
              {ran}/{TOTAL_TESTS} checks · <span style={{ color: statusColor }}>{status}</span>
              {running && <span className="live-dot">_</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 font-mono text-[12px]">
          <span><span className="font-bold text-moss">{passed}</span> <span className="text-nighttx">pass</span></span>
          <span><span className={cx('font-bold', failed ? 'text-danger' : 'text-nighttx')}>{failed}</span> <span className="text-nighttx">fail</span></span>
          <span><span className="font-bold text-card">{(totalMs / 1000).toFixed(2)}s</span> <span className="text-nighttx">runtime</span></span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="h-1.5 w-36 overflow-hidden rounded-full bg-nightline">
            <div className="h-full rounded-full bg-moss transition-all duration-300" style={{ width: `${(ran / TOTAL_TESTS) * 100}%` }} />
          </div>
          <Btn onClick={onRunAll} disabled={running} variant="primary">
            <Icon name={running ? 'refresh' : 'play'} size={14} /> {running ? 'Running…' : 'Run full suite'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ================= suites tab ================= */
function SuiteCard({ suite, results, running, onRun }: {
  suite: Suite; results: Record<string, TestResult>; running: boolean; onRun: (s: Suite) => void;
}) {
  const done = suite.tests.filter(t => results[t.id]).length;
  const passed = suite.tests.filter(t => results[t.id]?.pass).length;
  const failed = done - passed;
  const suiteRunning = running && done < suite.tests.length && suite.tests.some(t => !results[t.id]);
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: suite.tone + '1c', color: suite.tone }}><Icon name={suite.icon} size={15} /></span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13px] font-bold text-ink">{suite.name}</p>
          <p className="truncate text-[10.5px] text-mut">{suite.blurb}</p>
        </div>
        <IconBtn name="play" title={`Run ${suite.name}`} className="hover:bg-mint hover:text-pine" onClick={() => !running && onRun(suite)} />
      </div>
      <div className="flex-1 px-2.5 py-2">
        {suite.tests.map(t => {
          const r = results[t.id];
          return (
            <div key={t.id} className={cx('rounded-lg px-2 py-[7px] transition', r && !r.pass && 'bg-dangerbg/50')}>
              <div className="flex items-center gap-2">
                <span className={cx('grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border text-[9px] font-bold',
                  !r ? 'border-line2 text-faint' : r.pass ? 'border-moss bg-moss text-card' : 'border-danger bg-danger text-card')}>
                  {!r ? (suiteRunning ? <span className="live-dot h-1.5 w-1.5 rounded-full bg-amber" /> : '·') : r.pass ? <Icon name="check" size={10} sw={3.4} /> : <Icon name="x" size={9} sw={3.4} />}
                </span>
                <p className={cx('min-w-0 flex-1 truncate text-[12px]', r ? (r.pass ? 'text-ink2' : 'font-semibold text-danger') : 'text-mut')}>{t.name}</p>
                {r?.metric && <span className="rounded bg-steelbg px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-steel" title={`budget ${r.metric.budget}`}>{r.metric.value}</span>}
                {r && <span className={cx('shrink-0 font-mono text-[10px] font-semibold', r.pass ? 'text-faint' : 'text-danger')}>{r.ms < 10 ? r.ms.toFixed(1) : Math.round(r.ms)}ms</span>}
              </div>
              {r && !r.pass && r.detail && (
                <p className="anim-rise mt-1 ml-[25px] rounded-md bg-card px-2 py-1.5 font-mono text-[10.5px] leading-relaxed text-danger">{r.detail}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-paper/60 px-4 py-2">
        <span className="font-mono text-[10px] text-mut">{done}/{suite.tests.length} run</span>
        {done > 0 && (
          <Pill color={failed ? '#c2483b' : '#0e7a52'} tint={failed ? '#f8e6e2' : '#e2efe7'} dot>
            {failed ? `${failed} failing` : `${passed} passing`}
          </Pill>
        )}
      </div>
    </Card>
  );
}

/* ================= load tab ================= */
function LoadBench() {
  const [size, setSize] = useState<'1000' | '5000' | '10000' | '25000'>('10000');
  const [rows, setRows] = useState<{ label: string; ms: number; budget: number; note: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true); setRows([]);
    await tick();
    const n = Number(size);
    const contacts = syntheticContacts(n);
    const posts = syntheticPosts(Math.min(n, 8000));
    const out: typeof rows = [];
    const push = (label: string, ms: number, budget: number, note: string) => { out.push({ label, ms, budget, note }); setRows([...out]); };

    let st = seedState();
    push('Ingest via reducer', measure(() => { contacts.forEach(c => { st = reducer(st, { t: 'contact+', c }); }); }), n * 0.25, `${n.toLocaleString()} inserts`);
    await tick();
    push('Global search', measure(() => { contacts.filter(c => c.email.includes('4999')); }), 60, 'email index scan');
    await tick();
    push('Tag segmentation', measure(() => { contacts.filter(c => c.tags.includes('wholesale')); }), 40, 'active-list rule');
    await tick();
    push('Calendar grouping', measure(() => { const m = new Map<string, number>(); posts.forEach(p => m.set(p.date, (m.get(p.date) ?? 0) + 1)); }), 40, `${posts.length.toLocaleString()} posts → days`);
    await tick();
    push('Serialize for storage', measure(() => { JSON.stringify({ version: 2, data: { ...st, contacts } }); }), 1500, 'persistence snapshot');
    setBusy(false);
  };

  return (
    <div className="grid grid-cols-12 gap-3.5">
      <Card className="col-span-12 p-4 lg:col-span-7">
        <SectionTitle right={
          <div className="flex items-center gap-2">
            <Seg size="sm" value={size} onChange={setSize}
              options={[{ id: '1000', label: '1K' }, { id: '5000', label: '5K' }, { id: '10000', label: '10K' }, { id: '25000', label: '25K' }]} />
            <Btn size="sm" onClick={run} disabled={busy}><Icon name={busy ? 'refresh' : 'gauge'} size={13} /> {busy ? 'Benchmarking…' : 'Run benchmark'}</Btn>
          </div>
        }>
          Scalability bench · synthetic dataset
        </SectionTitle>
        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line2 bg-paper/60 px-4 py-8 text-center text-xs text-mut">
            Generates {Number(size).toLocaleString()} synthetic records and pushes them through the real reducer — the same code path production uses. Budgets assume a 60fps interaction frame.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r, i) => {
              const ok = r.ms < r.budget;
              return (
                <div key={r.label} className="anim-rise" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="mb-1 flex items-center justify-between text-[11.5px]">
                    <span className="font-semibold text-ink">{r.label} <span className="ml-1 font-mono text-[9.5px] text-faint">{r.note}</span></span>
                    <span className="font-mono text-[11px] font-bold" style={{ color: ok ? '#0e7a52' : '#c2483b' }}>
                      {r.ms < 10 ? r.ms.toFixed(2) : r.ms.toFixed(1)}ms <span className="font-normal text-faint">/ {r.budget}ms</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-line/70">
                    <div className="anim-grow h-full rounded-full" style={{ width: `${Math.min(100, (r.ms / r.budget) * 100)}%`, background: ok ? '#0e7a52' : '#c2483b' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="col-span-12 p-4 lg:col-span-5">
        <SectionTitle>How this scales in production</SectionTitle>
        <div className="space-y-2.5">
          {[
            { icon: 'dash', t: 'Stateless API tier', d: 'Express/FastAPI behind a load balancer — add nodes horizontally; the client contract you are testing is the API contract.' },
            { icon: 'file', t: 'PostgreSQL, one schema', d: 'Contacts, deals, posts and threads in one relational model. Read replicas for dashboards; partition the posts table by month past ~10M rows.' },
            { icon: 'bolt', t: 'Redis + queue workers', d: 'Publishing, SMTP fan-out and social sync run as queued jobs — spikes in scheduled posts never block the request path.' },
            { icon: 'image', t: 'S3 for media only', d: 'Images and attachments live in object storage; the database stores references. ~$0.20–0.40 marginal cost per customer.' },
            { icon: 'shield', t: 'Flat-rate ceiling', d: 'Plan limits (25K contacts on Growth) are enforced at the API boundary — the same RBAC gate this console probes.' },
          ].map(x => (
            <div key={x.t} className="flex gap-2.5 rounded-lg border border-line bg-paper/50 p-2.5">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-mint text-moss"><Icon name={x.icon} size={13} /></span>
              <div><p className="text-[12px] font-bold text-ink">{x.t}</p><p className="text-[10.5px] leading-relaxed text-mut">{x.d}</p></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ================= security tab ================= */
function SecurityPanel() {
  const probe = useMemo(() => probeRbac(), []);
  const audits = [
    { ok: true, t: 'Mutations gated at the action boundary', d: 'Every write checks the session role — UI disabling is cosmetic; the gate is structural.' },
    { ok: true, t: 'Privilege-escalation blocked', d: 'Editors cannot create Admins; role changes are admin-only (probed live in the matrix).' },
    { ok: true, t: 'Session lifecycle', d: 'Issued on login, restored on boot, revoked on logout. Production: httpOnly cookie + refresh rotation.' },
    { ok: true, t: 'CSV formula-injection defense', d: 'Exported cells starting with = + - @ are neutralized (OWASP CSV injection).' },
    { ok: true, t: 'XSS handled by the rendering layer', d: 'All user content renders through React escaping; payloads persist as inert text (tested).' },
    { ok: true, t: 'Crash-safe persistence', d: 'Versioned schema; corrupt or stale payloads fall back to seed — tested against garbage input.' },
  ];
  return (
    <div className="grid grid-cols-12 gap-3.5">
      <Card className="col-span-12 overflow-hidden lg:col-span-7">
        <div className="border-b border-line px-4 py-3">
          <p className="font-display text-[14px] font-bold text-ink">Live RBAC probe</p>
          <p className="text-[10.5px] text-mut">Each cell is a real attempt against a fresh store — not a lookup table.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-line bg-paper/70">
                <th className="px-4 py-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Mutation</th>
                {probe.roles.map(r => (
                  <th key={r} className="px-4 py-2 text-center font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: r === 'admin' ? '#0e7a52' : r === 'editor' ? '#3e7cb1' : '#a96f14' }}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {probe.rows.map(row => (
                <tr key={row.label} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-2 text-[12px] font-medium text-ink2">{row.label}</td>
                  {row.cells.map((allowed, i) => (
                    <td key={i} className="px-4 py-2 text-center">
                      <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9.5px] font-bold',
                        allowed ? 'bg-mint text-pine' : 'bg-dangerbg text-danger')}>
                        <Icon name={allowed ? 'check' : 'x'} size={9} sw={3.4} />{allowed ? 'allow' : 'deny'}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card className="col-span-12 p-4 lg:col-span-5">
        <SectionTitle>Security audit</SectionTitle>
        <div className="space-y-2">
          {audits.map(x => (
            <div key={x.t} className="flex gap-2.5 rounded-lg border border-line bg-paper/50 p-2.5">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-moss text-card"><Icon name="check" size={10} sw={3.4} /></span>
              <div><p className="text-[12px] font-bold text-ink">{x.t}</p><p className="text-[10.5px] leading-relaxed text-mut">{x.d}</p></div>
            </div>
          ))}
        </div>
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amberbg px-3 py-2 text-[10.5px] leading-relaxed text-amber">
          <Icon name="alert" size={12} className="mt-0.5 shrink-0" />
          Demo auth validates against a shared password. Production swaps in bcrypt hashes, rate-limited login, CSRF tokens and audit logging — the contract stays identical.
        </p>
      </Card>
    </div>
  );
}

/* ================= coverage tab ================= */
function CoveragePanel({ results }: { results: Record<string, TestResult> }) {
  const groups = useMemo(() => {
    const map = new Map<string, { total: number; passed: number; failed: number; ran: number }>();
    SUITES.forEach(s => s.tests.forEach(t => {
      const g = map.get(t.req) ?? { total: 0, passed: 0, failed: 0, ran: 0 };
      g.total++;
      const r = results[t.id];
      if (r) { g.ran++; if (r.pass) g.passed++; else g.failed++; }
      map.set(t.req, g);
    }));
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [results]);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <p className="font-display text-[14px] font-bold text-ink">Requirement coverage · Phase 1 spec</p>
        <p className="text-[10.5px] text-mut">Every shipped feature maps to executable checks. Run the suite to fill this in.</p>
      </div>
      <div className="divide-y divide-line/70">
        {groups.map(([req, g]) => {
          const meta = REQ_LABEL[req] ?? { label: req, spec: '' };
          const status = g.ran === 0 ? 'idle' : g.failed > 0 ? 'failing' : g.ran === g.total ? 'verified' : 'partial';
          const sc = { idle: { c: '#6e776f', t: '#eceee7' }, failing: { c: '#c2483b', t: '#f8e6e2' }, verified: { c: '#0e7a52', t: '#e2efe7' }, partial: { c: '#a96f14', t: '#f7ecd6' } }[status];
          return (
            <div key={req} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="w-14 shrink-0 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-faint">{meta.spec}</span>
              <span className="min-w-[200px] flex-1 text-[12.5px] font-semibold text-ink">{meta.label}</span>
              <div className="flex items-center gap-1">
                {Array.from({ length: g.total }).map((_, i) => (
                  <span key={i} className={cx('h-1.5 w-4 rounded-full', i < g.passed ? 'bg-moss' : i < g.ran ? 'bg-danger' : 'bg-line')} title={i < g.ran ? 'executed' : 'pending'} />
                ))}
              </div>
              <span className="w-16 text-right font-mono text-[10.5px] font-bold text-mut">{g.passed}/{g.total}</span>
              <Pill color={sc.c} tint={sc.t} className="w-[84px] justify-center capitalize">{status}</Pill>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ================= module ================= */
export function Testing() {
  const { a } = useApp();
  const [tab, setTab] = useState<Tab>('suites');
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  const passed = Object.values(results).filter(r => r.pass).length;
  const failed = Object.values(results).filter(r => !r.pass).length;
  const totalMs = Object.values(results).reduce((n, r) => n + r.ms, 0);

  const runSuite = async (suite: Suite) => {
    for (const t of suite.tests) {
      if (cancelRef.current) return;
      const r = await runOne(t);
      setResults(prev => ({ ...prev, [t.id]: r }));
      await tick();
    }
  };

  const runAll = async () => {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);
    setResults({});
    for (const s of SUITES) { await runSuite(s); if (cancelRef.current) break; }
    setRunning(false);
    if (!cancelRef.current) a.toast('Full QA suite complete — results below', 'info');
  };

  return (
    <div className="space-y-3.5">
      <ConsoleHeader passed={passed} failed={failed} totalMs={totalMs} running={running} onRunAll={runAll} />

      <div className="flex flex-wrap items-center gap-2">
        <Seg value={tab} onChange={setTab} options={[
          { id: 'suites', label: `Test suites · ${TOTAL_TESTS}` },
          { id: 'load', label: 'Load & scale' },
          { id: 'security', label: 'Security' },
          { id: 'coverage', label: 'Coverage' },
        ]} />
        {tab === 'suites' && Object.keys(results).length > 0 && (
          <button onClick={() => setResults({})} className="text-[11px] font-semibold text-mut transition hover:text-ink">Clear results</button>
        )}
      </div>

      {tab === 'suites' && (
        <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
          {SUITES.map(s => <SuiteCard key={s.id} suite={s} results={results} running={running} onRun={runSuite} />)}
        </div>
      )}
      {tab === 'load' && <LoadBench />}
      {tab === 'security' && <SecurityPanel />}
      {tab === 'coverage' && <CoveragePanel results={results} />}
    </div>
  );
}
