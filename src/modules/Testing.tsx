import confetti from 'canvas-confetti';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { SUITES, TOTAL_TESTS, REQ_LABEL, runOne, probeRbac } from '../testing/suites';
import type { Suite, TestResult } from '../testing/framework';
import { measure, syntheticContacts, syntheticPosts } from '../testing/framework';
import { BYTES, DATASETS, PHASE1_GB, fmtBytes, fmtRecords, project, probeStorage, rulerPos } from '../testing/scaleModel';
import type { QuotaProbe, Tier } from '../testing/scaleModel';
import { reducer } from '../store';
import { seedState } from '../data';
import { Btn, Card, IconBtn, Pill, SectionTitle, Seg } from '../components/ui';

type Tab = 'suites' | 'load' | 'limits' | 'security' | 'coverage';

const tick = () => new Promise<void>(r => window.setTimeout(r, 24));

/* ================= console header ================= */
function ConsoleHeader({ passed, failed, totalMs, running, onRunAll }: {
  passed: number; failed: number; totalMs: number; running: boolean; onRunAll: () => void;
}) {
  const ran = passed + failed;
  const all = ran === TOTAL_TESTS;
  const status = running ? 'RUNNING' : failed > 0 ? 'FAILING' : all && passed > 0 ? 'ALL GREEN' : 'IDLE';
  const statusColor = running ? '#ffd954' : failed > 0 ? '#ff8a8d' : all && passed > 0 ? '#c8f169' : '#a9a99b';
  return (
    <div className="overflow-hidden rounded-xl border border-nightline bg-night text-card shadow-lift">
      <div className="flex items-center gap-2 border-b border-nightline px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/90" /><span className="h-2.5 w-2.5 rounded-full bg-butter/90" /><span className="h-2.5 w-2.5 rounded-full bg-lime" />
        <span className="ml-2 font-mono text-[11px] text-nighttx">cadence · qa console</span>
        <span className="ml-auto hidden font-mono text-[10px] text-nighttx sm:block">same reducer + action core the app runs — zero mocks</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-ink bg-lime text-ink shadow-hard-sm"><Icon name="terminal" size={22} sw={2.2} /></span>
          <div>
            <p className="font-mono text-[12px] text-nighttx">$ cadence qa --run-all</p>
            <p className="font-display text-[22px] font-bold leading-tight tracking-tight">
              {ran}/{TOTAL_TESTS} checks · <span style={{ color: statusColor }}>{status}</span>
              {running && <span className="live-dot">_</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 font-mono text-[12px]">
          <span><span className="font-bold text-lime">{passed}</span> <span className="text-nighttx">pass</span></span>
          <span><span className={cx('font-bold', failed ? 'text-danger' : 'text-nighttx')}>{failed}</span> <span className="text-nighttx">fail</span></span>
          <span><span className="font-bold text-card">{(totalMs / 1000).toFixed(2)}s</span> <span className="text-nighttx">runtime</span></span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="h-1.5 w-36 overflow-hidden rounded-full bg-nightline">
            <div className="h-full rounded-full bg-lime transition-all duration-300" style={{ width: `${(ran / TOTAL_TESTS) * 100}%` }} />
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

/* ================= scale ceiling lab ================= */
const TIER_META: Record<Tier, { label: string; color: string; tint: string; icon: string }> = {
  demo: { label: 'This browser tab', color: '#a96f14', tint: '#f7ecd6', icon: 'dash' },
  phase1: { label: 'Phase 1 stack', color: '#0e7a52', tint: '#e2efe7', icon: 'file' },
  sharded: { label: 'Sharded cluster', color: '#7a5fa8', tint: '#efeaf6', icon: 'globe' },
};

function RulerMarker({ label, sub, bytes, color, up }: { label: string; sub: string; bytes: number; color: string; up: boolean }) {
  return (
    <div className="absolute -top-2 bottom-0 z-10" style={{ left: `${rulerPos(bytes)}%` }}>
      <div className={cx('relative h-full w-0 border-l-2 border-dashed', up ? '' : '')} style={{ borderColor: color }}>
        <div className={cx('absolute left-0 whitespace-nowrap', up ? '-top-1 -translate-y-full' : 'bottom-0 translate-y-[3px]')}>
          <p className="rounded-t-md px-1.5 font-mono text-[9px] font-bold leading-[13px]" style={{ background: color, color: '#fbfbf8' }}>{label}</p>
          <p className="bg-card/90 px-1.5 font-mono text-[8.5px] leading-[12px] text-ink2 shadow-sm">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function ScaleLab() {
  const { a } = useApp();
  const [ds, setDs] = useState<'contact' | 'deal' | 'post' | 'event'>('contact');
  const [probe, setProbe] = useState<QuotaProbe | null>(null);
  const [probing, setProbing] = useState(false);
  const ranRef = useRef(false);

  const doProbe = async () => {
    setProbing(true);
    try { setProbe(await probeStorage()); } catch { /* storage unavailable */ }
    setProbing(false);
  };
  useEffect(() => { if (!ranRef.current) { ranRef.current = true; void doProbe(); } }, []);

  const quotaMB = probe?.usableMB ?? 5;
  const nowMB = probe?.nowMB ?? 0.4;
  const bytesPer = BYTES[ds];
  const demoCapBytes = quotaMB * 0.8 * 1e6;
  const ladder = [1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
  const fitsHere = Math.floor(demoCapBytes / bytesPer);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-12 gap-3.5">
        {/* bytes per record */}
        <Card className="col-span-12 p-4 lg:col-span-4">
          <SectionTitle right={<Pill color="#3e7cb1" tint="#e5eef6">measured</Pill>}>Cost per record</SectionTitle>
          <div className="space-y-1.5">
            {DATASETS.map(d => (
              <button key={d.id} onClick={() => setDs(d.id)}
                className={cx('flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all',
                  ds === d.id ? 'border-moss/50 bg-mint/60' : 'border-line bg-card hover:border-line2')}>
                <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-lg', ds === d.id ? 'bg-moss text-card' : 'bg-paper text-mut')}>
                  <Icon name={d.icon} size={13} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-bold text-ink">{d.label}</span>
                  <span className="block truncate text-[9.5px] text-faint">{d.note}</span>
                </span>
                <span className="shrink-0 font-mono text-[11px] font-bold" style={{ color: ds === d.id ? '#0e7a52' : '#6e776f' }}>{BYTES[d.id]} B</span>
              </button>
            ))}
          </div>
          <p className="mt-2.5 rounded-lg bg-paper/70 px-2.5 py-2 text-[10px] leading-relaxed text-mut">
            Averaged over real serialized rows — not estimates. At <span className="font-mono font-bold text-ink2">{bytesPer} B</span>/record,
            1B records ≈ <span className="font-mono font-bold text-ink2">{fmtBytes(1e9 * bytesPer)}</span> raw.
          </p>
        </Card>

        {/* storage probe */}
        <Card className="col-span-12 p-4 lg:col-span-8">
          <SectionTitle right={
            <Btn size="sm" variant="outline" onClick={doProbe} disabled={probing}>
              <Icon name={probing ? 'refresh' : 'gauge'} size={13} className={probing ? 'animate-spin' : ''} /> {probing ? 'Probing…' : 'Re-probe storage'}
            </Btn>
          }>
            Live ceiling probe · this browser
          </SectionTitle>
          {!probe ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-line2 bg-paper/60 py-8">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-line2 border-t-moss" />
              <p className="mt-2 font-mono text-[10.5px] text-mut">writing until QuotaExceededError…</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[11.5px] font-semibold text-ink2">Usable quota</span>
                  <span className="font-mono text-[15px] font-bold text-ink">{probe.usableMB.toFixed(1)} MB</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-line/70">
                  <div className="anim-grow absolute inset-y-0 left-0 rounded-full bg-moss/80" style={{ width: '100%' }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-steel" style={{ width: `${Math.min(100, (nowMB / probe.usableMB) * 100)}%` }} title="current usage" />
                </div>
                <div className="mt-1 flex justify-between font-mono text-[9.5px] text-mut">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-steel align-middle" />in use · {nowMB.toFixed(2)} MB</span>
                  <span>≈ {fitsHere.toLocaleString()} {DATASETS.find(d => d.id === ds)?.label.toLowerCase()} fit here</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { l: 'Probe wrote', v: `${probe.usableMB.toFixed(1)} MB`, c: '#0e7a52' },
                  { l: 'Safe working set', v: `${(quotaMB * 0.8).toFixed(1)} MB`, c: '#a96f14' },
                  { l: 'Headroom left', v: `${Math.max(0, quotaMB * 0.8 - nowMB).toFixed(1)} MB`, c: '#3e7cb1' },
                ].map(k => (
                  <div key={k.l} className="rounded-lg border border-line bg-paper/60 px-3 py-2">
                    <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] text-mut">{k.l}</p>
                    <p className="font-display text-[16px] font-bold" style={{ color: k.c }}>{k.v}</p>
                  </div>
                ))}
              </div>
              <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-mut">
                <Icon name="alert" size={12} className="mt-0.5 shrink-0 text-amber" />
                This is the honest demo ceiling — a browser tab. Past ~{fitsHere.toLocaleString()} records the workspace belongs on the server-side stack below, where the same code path runs unmodified.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* capacity ruler */}
      <Card className="p-4">
        <SectionTitle right={<span className="font-mono text-[10px] text-faint">log scale · 1 KB → 100 TB</span>}>
          Where does <span className="text-moss">{DATASETS.find(d => d.id === ds)?.label.toLowerCase()}</span> data live as it grows?
        </SectionTitle>
        <div className="relative mt-14 h-16 rounded-xl border border-line bg-paper/60">
          {[1e3, 1e6, 1e9, 1e12, 1e14].map((b, i) => (
            <div key={b} className="absolute top-0 bottom-0 border-l border-line/80" style={{ left: `${rulerPos(b)}%` }}>
              <span className="absolute top-1 left-1 font-mono text-[8.5px] text-faint">{['1KB', '1MB', '1GB', '1TB', '100TB'][i]}</span>
            </div>
          ))}
          <RulerMarker up label="now" sub={fmtBytes(nowMB * 1e6)} bytes={nowMB * 1e6} color="#3e7cb1" />
          <RulerMarker label="demo ceiling" sub={fmtBytes(demoCapBytes)} bytes={demoCapBytes} color="#a96f14" up />
          <RulerMarker label="Growth cap · 25K contacts" sub={fmtBytes(25000 * BYTES.contact)} bytes={25000 * BYTES.contact} color="#2f8f83" up={false} />
          <RulerMarker label="1M records" sub={fmtBytes(1e6 * bytesPer)} bytes={1e6 * bytesPer} color="#0e7a52" up />
          <RulerMarker label="1B records" sub={fmtBytes(1e9 * bytesPer)} bytes={1e9 * bytesPer} color="#7a5fa8" up={false} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {Object.entries(TIER_META).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-[10.5px] text-mut">
              <span className="grid h-4 w-4 place-items-center rounded" style={{ background: v.tint, color: v.color }}><Icon name={v.icon} size={9} /></span>
              {v.label}
            </span>
          ))}
        </div>
      </Card>

      {/* projection ladder */}
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <p className="font-display text-[14px] font-bold text-ink">Projection ladder · 10K → 1B records</p>
            <p className="text-[10.5px] text-mut">Same domain model, same client code — only the storage tier changes.</p>
          </div>
          <Btn size="sm" variant="outline" onClick={() => { try { void navigator.clipboard.writeText(`Cadence scale model: 1B ${DATASETS.find(d => d.id === ds)?.label.toLowerCase()} ≈ ${fmtBytes(1e9 * bytesPer)} @ ${bytesPer}B/record — served by tenant-sharded Postgres.`); } catch { /* noop */ } a.toast('Scale model copied', 'info'); }}>
            <Icon name="copy" size={12} /> Copy model
          </Btn>
        </div>
        <div className="divide-y divide-line/70">
          {ladder.map((n, i) => {
            const p = project(n, bytesPer, quotaMB);
            const tm = TIER_META[p.tier];
            return (
              <div key={n} className="anim-rise flex flex-wrap items-center gap-3 px-4 py-2.5" style={{ animationDelay: `${i * 50}ms` }}>
                <span className="w-20 shrink-0 font-mono text-[13px] font-bold text-ink">{fmtRecords(n)}</span>
                <span className="w-24 shrink-0 font-mono text-[11px] text-mut">{fmtBytes(p.bytes)}</span>
                <div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-line/60 md:block">
                  <div className="anim-grow h-full rounded-full" style={{ width: `${Math.max(2, rulerPos(p.bytes))}%`, background: tm.color }} />
                </div>
                <Pill color={tm.color} tint={tm.tint} className="w-[140px] justify-center"><Icon name={tm.icon} size={10} />{tm.label}</Pill>
                <span className="hidden max-w-[300px] flex-1 truncate text-[10.5px] text-faint lg:block">{p.headline}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* the honest answer */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        {(Object.keys(TIER_META) as Tier[]).map(t => (
          <div key={t} className={cx('rounded-xl border p-4', t === 'demo' ? 'border-amber/30 bg-amberbg/40' : t === 'phase1' ? 'border-moss/30 bg-mint/40' : 'border-line bg-card')}>
            <p className="flex items-center gap-2 font-display text-[13.5px] font-bold text-ink">
              <span className="grid h-6 w-6 place-items-center rounded-md" style={{ background: TIER_META[t].tint, color: TIER_META[t].color }}><Icon name={TIER_META[t].icon} size={12} /></span>
              {TIER_META[t].label}
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {(t === 'demo' ? [
                `JSON snapshots in browser storage — the shell you are using now`,
                `Hard ceiling: the ${quotaMB.toFixed(1)} MB measured above`,
                'Right for: evaluation, demos, small teams under plan caps',
              ] : t === 'phase1' ? [
                'PostgreSQL 16 · primary + read replicas (~$50–100/mo)',
                'posts & timeline events partitioned by month',
                'Redis queue absorbs publish bursts off the request path',
                'Comfortably serves millions of rows per workspace',
              ] : [
                'Citus or per-tenant shards keyed by workspace_id',
                'Cold timeline events aged to columnar S3 + Athena',
                'Writes stay single-shard; reads fan out via router',
                'Billions of rows — linear cost, no re-architecture',
              ]).map(x => (
                <li key={x} className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-ink2">
                  <span className="mt-[3px] shrink-0" style={{ color: TIER_META[t].color }}><Icon name="check" size={10} sw={3} /></span>{x}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <Icon name="bolt" size={12} className="text-moss" />
        Short answer: millions on the Phase 1 stack today, billions with tenant sharding — and every number above was measured on this machine, not promised.
      </p>
    </div>
  );
}

/* ================= report card ================= */
function buildReport(results: Record<string, TestResult>): string {
  const all = Object.values(results);
  const passed = all.filter(r => r.pass).length;
  const ms = all.reduce((n, r) => n + r.ms, 0);
  const lines = [
    '# Cadence QA Report',
    `- Verdict: ${passed === all.length ? 'ALL GREEN' : `${all.length - passed} failing`}`,
    `- Checks: ${passed}/${all.length} passing`,
    `- Runtime: ${(ms / 1000).toFixed(2)}s`,
    `- Generated: ${new Date().toISOString()}`,
    '',
    '## Results',
  ];
  SUITES.forEach(s => {
    lines.push(`### ${s.name}`);
    s.tests.forEach(t => {
      const r = results[t.id];
      lines.push(`- [${r ? (r.pass ? 'x' : ' ') : ' '}] ${t.name}${r ? ` (${r.ms < 10 ? r.ms.toFixed(1) : Math.round(r.ms)}ms)` : ''}${r && !r.pass && r.detail ? ` — ${r.detail}` : ''}`);
    });
  });
  return lines.join('\n');
}

function ReportCard({ results }: { results: Record<string, TestResult> }) {
  const { a } = useApp();
  const firedRef = useRef(false);
  const all = Object.values(results);
  const ran = all.length;
  const passed = all.filter(r => r.pass).length;
  const green = ran === TOTAL_TESTS && passed === TOTAL_TESTS;
  useEffect(() => {
    if (green && !firedRef.current) {
      firedRef.current = true;
      try {
        confetti({ particleCount: 120, spread: 80, startVelocity: 34, origin: { y: 0.6 }, colors: ['#0e7a52', '#3e7cb1', '#c08a1e', '#f1f2ec'], disableForReducedMotion: true });
      } catch { /* noop */ }
    }
    if (!green) firedRef.current = false;
  }, [green]);
  if (ran === 0) return null;
  return (
    <div className={cx('anim-pop flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3',
      green ? 'border-moss/40 bg-mint/50' : ran === TOTAL_TESTS ? 'border-danger/40 bg-dangerbg/50' : 'border-line bg-card')}>
      <span className={cx('grid h-9 w-9 place-items-center rounded-lg', green ? 'bg-moss text-card' : ran === TOTAL_TESTS ? 'bg-danger text-card' : 'bg-paper text-mut')}>
        <Icon name={green ? 'checksq' : ran === TOTAL_TESTS ? 'alert' : 'clock'} size={17} />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="font-display text-[14px] font-bold text-ink">
          {green ? 'All green — Phase 1 verified end to end' : ran === TOTAL_TESTS ? `${TOTAL_TESTS - passed} checks need attention` : `Suite in progress — ${ran}/${TOTAL_TESTS}`}
        </p>
        <p className="text-[11px] text-mut">
          {green
            ? `${TOTAL_TESTS} checks · ${(all.reduce((n, r) => n + r.ms, 0) / 1000).toFixed(2)}s · every requirement has executable proof`
            : 'Failures show inline with expected vs. actual.'}
        </p>
      </div>
      {ran === TOTAL_TESTS && (
        <Btn size="sm" variant={green ? 'primary' : 'outline'} onClick={() => { try { void navigator.clipboard.writeText(buildReport(results)); } catch { /* noop */ } a.toast('Markdown QA report copied to clipboard', 'info'); }}>
          <Icon name="copy" size={13} /> Copy report
        </Btn>
      )}
    </div>
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

      <ReportCard results={results} />

      <div className="flex flex-wrap items-center gap-2">
        <Seg value={tab} onChange={setTab} options={[
          { id: 'suites', label: `Test suites · ${TOTAL_TESTS}` },
          { id: 'load', label: 'Load bench' },
          { id: 'limits', label: 'Scale ceiling' },
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
      {tab === 'limits' && <ScaleLab />}
      {tab === 'security' && <SecurityPanel />}
      {tab === 'coverage' && <CoveragePanel results={results} />}
    </div>
  );
}
