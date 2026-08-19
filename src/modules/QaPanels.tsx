import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { createEnv } from '../testing/framework';
import type { TestEnv } from '../testing/framework';
import { E2E_FLOWS, runA11yAudit, runCompatAudit } from '../testing/extended';
import type { AuditRow, CompatRow, E2EFlow } from '../testing/extended';
import { Btn, Card, Pill, SectionTitle } from '../components/ui';

/* ================= E2E journey replay ================= */
type StepResult = { ok: boolean; ms: number; err?: string };

function FlowCard({ flow, delay }: { flow: E2EFlow; delay: number }) {
  const { a } = useApp();
  const [steps, setSteps] = useState<Record<number, StepResult>>({});
  const [running, setRunning] = useState(false);
  const done = Object.keys(steps).length;
  const failed = Object.values(steps).filter(r => !r.ok).length;

  const run = async () => {
    if (running) return;
    setRunning(true);
    setSteps({});
    let broke = false;
    const env: TestEnv = createEnv('admin');
    for (let i = 0; i < flow.steps.length; i++) {
      await new Promise(r => window.setTimeout(r, 140));
      const t0 = performance.now();
      try {
        flow.steps[i].run(env);
        setSteps(s => ({ ...s, [i]: { ok: true, ms: performance.now() - t0 } }));
      } catch (e) {
        broke = true;
        setSteps(s => ({ ...s, [i]: { ok: false, ms: performance.now() - t0, err: e instanceof Error ? e.message : 'failed' } }));
        break; // a broken journey stops — that's the point
      }
    }
    setRunning(false);
    a.toast(broke ? `${flow.name} needs attention` : `${flow.name} verified`, broke ? 'warning' : 'info');
  };

  return (
    <Card className="anim-rise flex flex-col overflow-hidden" >
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3" style={{ animationDelay: `${delay}ms` }}>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint text-moss"><Icon name="send" size={14} /></span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[13px] font-bold text-ink">{flow.name}</p>
          <p className="truncate text-[10.5px] text-mut">{flow.blurb}</p>
        </div>
        <Pill color="#3b6fd4" tint="#e3eaff">{flow.persona}</Pill>
        <Btn size="sm" variant={done ? 'outline' : 'primary'} onClick={run} disabled={running}>
          <Icon name={running ? 'refresh' : 'play'} size={12} /> {running ? 'Running…' : done ? 'Replay' : 'Run'}
        </Btn>
      </div>
      <div className="flex-1 px-3 py-2.5">
        {flow.steps.map((step, i) => {
          const r = steps[i];
          const active = running && done === i;
          return (
            <div key={i} className={cx('flex items-start gap-2.5 rounded-lg px-1.5 py-[5px]', r && !r.ok && 'bg-dangerbg/50')}>
              <span className={cx('mt-0.5 grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full border text-[9px] font-bold',
                !r ? (active ? 'border-moss text-moss' : 'border-line2 text-faint') : r.ok ? 'border-moss bg-moss text-card' : 'border-danger bg-danger text-card')}>
                {!r ? (active ? <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" /> : i + 1) : r.ok ? <Icon name="check" size={10} sw={3.4} /> : <Icon name="x" size={9} sw={3.4} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cx('text-[12px] leading-snug', r ? (r.ok ? 'text-ink2' : 'font-semibold text-danger') : 'text-mut')}>{step.label}</p>
                {r && !r.ok && r.err && <p className="mt-0.5 font-mono text-[10px] text-danger">{r.err}</p>}
              </div>
              {r && <span className={cx('shrink-0 font-mono text-[9.5px] font-semibold', r.ok ? 'text-faint' : 'text-danger')}>{r.ms < 10 ? r.ms.toFixed(1) : Math.round(r.ms)}ms</span>}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-paper/60 px-4 py-2">
        <span className="font-mono text-[10px] text-mut">{done}/{flow.steps.length} steps</span>
        {done > 0 && (
          <Pill color={failed ? '#c2483b' : '#0e7a52'} tint={failed ? '#f8e6e2' : '#e2efe7'} dot>
            {failed ? 'journey broken' : 'journey verified'}
          </Pill>
        )}
      </div>
    </Card>
  );
}

export function E2EPanel() {
  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-[640px] text-[12px] leading-relaxed text-mut">
          Full user journeys replayed step-by-step through the real store — each persona gets a fresh workspace.
          A journey halts at the first broken step, exactly like a real user would.
        </p>
        <Pill color="#0b7a55" tint="#e2efe7" dot>{E2E_FLOWS.reduce((n, f) => n + f.steps.length, 0)} scripted steps</Pill>
      </div>
      <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
        {E2E_FLOWS.map((f, i) => <FlowCard key={f.id} flow={f} delay={i * 60} />)}
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <Icon name="bolt" size={12} className="text-moss" />
        For CI, replay these exact flows headlessly with Playwright against the deployed bundle — the steps above are the spec.
      </p>
    </div>
  );
}

/* ================= accessibility audit ================= */
export function A11yPanel() {
  const { a } = useApp();
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  useEffect(() => { setRows(runA11yAudit()); }, []);
  const pass = rows?.filter(r => r.pass).length ?? 0;

  return (
    <div className="grid grid-cols-12 gap-3.5">
      <Card className="col-span-12 overflow-hidden lg:col-span-8">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <p className="font-display text-[14px] font-bold text-ink">Live accessibility audit</p>
            <p className="text-[10.5px] text-mut">Probes the real DOM, tokens and stylesheets of this running app.</p>
          </div>
          <Btn size="sm" variant="outline" onClick={() => { setRows(runA11yAudit()); a.toast('Audit re-run against the live DOM', 'info'); }}>
            <Icon name="refresh" size={12} /> Re-run
          </Btn>
        </div>
        <div className="divide-y divide-line/70">
          {(rows ?? []).map(r => (
            <div key={r.id} className="flex items-start gap-3 px-4 py-2.5">
              <span className={cx('mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full', r.pass ? 'bg-moss text-card' : 'bg-danger text-card')}>
                <Icon name={r.pass ? 'check' : 'x'} size={10} sw={3.2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12.5px] font-semibold text-ink">{r.label}</p>
                  <span className="rounded bg-paper px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-mut ring-1 ring-line">{r.std}</span>
                </div>
                <p className="text-[10.5px] text-mut">{r.detail}</p>
              </div>
            </div>
          ))}
          {!rows && <p className="px-4 py-8 text-center text-xs text-mut">Auditing…</p>}
        </div>
      </Card>
      <div className="col-span-12 space-y-3.5 lg:col-span-4">
        <Card className="p-4">
          <SectionTitle>Score</SectionTitle>
          <p className="font-display text-[34px] font-bold leading-none tracking-tight text-ink">
            {pass}<span className="text-[18px] text-faint">/{rows?.length ?? 0}</span>
          </p>
          <p className="mt-1 text-[11px] text-mut">checks passing against WCAG 2.1 AA + best practice</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
            <div className="anim-grow h-full rounded-full bg-moss" style={{ width: `${rows ? (pass / rows.length) * 100 : 0}%` }} />
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle>What this covers</SectionTitle>
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-ink2">
            {['Contrast ratios computed from live design tokens', 'Keyboard focus + reduced-motion fallbacks in the shipped CSS', 'Accessible names for every rendered control', 'Document semantics: lang, title, viewport'].map(x => (
              <li key={x} className="flex items-start gap-1.5"><Icon name="check" size={11} sw={3} className="mt-[3px] shrink-0 text-moss" />{x}</li>
            ))}
          </ul>
          <p className="mt-3 rounded-lg bg-paper/70 px-2.5 py-2 text-[10.5px] leading-relaxed text-mut">
            Add <span className="font-mono font-semibold text-ink2">@axe-core/playwright</span> to CI for automated screen-reader-level checks on every deploy.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ================= compatibility matrix ================= */
export function CompatPanel() {
  const { a } = useApp();
  const [rows, setRows] = useState<CompatRow[] | null>(null);
  useEffect(() => { setRows(runCompatAudit()); }, []);
  const tiers: { id: CompatRow['tier']; label: string; color: string; tint: string }[] = [
    { id: 'required', label: 'Required — app cannot run without', color: '#c2483b', tint: '#f8e6e2' },
    { id: 'recommended', label: 'Recommended — degraded experience without', color: '#b26e14', tint: '#f7ecd6' },
    { id: 'production', label: 'Production — needed for live sync at scale', color: '#3b6fd4', tint: '#e5eef6' },
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-[640px] text-[12px] leading-relaxed text-mut">
          Feature-detection against <span className="font-semibold text-ink2">this exact browser</span> — the same APIs the app and the live-sync layer depend on.
        </p>
        <Btn size="sm" variant="outline" onClick={() => { setRows(runCompatAudit()); a.toast('Compatibility re-detected', 'info'); }}>
          <Icon name="refresh" size={12} /> Re-detect
        </Btn>
      </div>
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        {tiers.map(t => {
          const group = (rows ?? []).filter(r => r.tier === t.id);
          const ok = group.filter(r => r.pass).length;
          return (
            <Card key={t.id} className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <p className="text-[12.5px] font-bold text-ink">{t.label}</p>
                  <p className="font-mono text-[10px] text-mut">{ok}/{group.length} supported here</p>
                </div>
                <Pill color={t.color} tint={t.tint} dot>{ok === group.length ? 'all good' : `${group.length - ok} missing`}</Pill>
              </div>
              <div className="divide-y divide-line/70">
                {group.map(r => (
                  <div key={r.feature} className="flex items-center gap-2.5 px-4 py-2">
                    <span className={cx('grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full', r.pass ? 'bg-moss text-card' : 'bg-danger text-card')} style={{ width: 18, height: 18 }}>
                      <Icon name={r.pass ? 'check' : 'x'} size={9} sw={3.4} />
                    </span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate font-mono text-[11px] font-semibold text-ink">{r.feature}</p>
                      <p className="truncate text-[10px] text-mut">{r.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <Icon name="globe" size={12} className="text-moss" />
        Target: evergreen browsers (Chrome/Edge/Firefox/Safari, last 2 versions). The build ships ES2020 — no polyfill weight for dead browsers.
      </p>
    </div>
  );
}
