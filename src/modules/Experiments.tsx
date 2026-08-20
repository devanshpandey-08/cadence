import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { Btn, Card, Field, inputCls, Modal, Pill, SectionTitle, Seg } from '../components/ui';

/* ---------- real statistics: two-proportion z-test ---------- */
const erf = (x: number) => {
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return s * y;
};
const normCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

function twoProp(a1: number, n1: number, a2: number, n2: number) {
  const p1 = n1 ? a1 / n1 : 0;
  const p2 = n2 ? a2 / n2 : 0;
  const p = (a1 + a2) / Math.max(1, n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / Math.max(1, n1) + 1 / Math.max(1, n2)));
  const z = se ? (p1 - p2) / se : 0;
  const confidence = Math.max(0, (2 * normCdf(Math.abs(z)) - 1) * 100);
  const lift = p2 > 0 ? ((p1 - p2) / p2) * 100 : 0;
  return { p1, p2, z, confidence, lift };
}

/** minimum sample per variant for 95% confidence / 80% power at a given lift */
function sampleSize(baseRate: number, relLift: number) {
  const p1 = baseRate;
  const p2 = baseRate * (1 + relLift);
  const zA = 1.96, zB = 0.84;
  const n = Math.pow(zA + zB, 2) * (p1 * (1 - p1) + p2 * (1 - p2)) / Math.pow(p2 - p1, 2);
  return Math.ceil(n);
}

interface Experiment {
  id: string; name: string; metric: string; kind: 'email' | 'page' | 'post';
  a: { label: string; n: number; x: number }; b: { label: string; n: number; x: number };
  status: 'running' | 'shipped';
}

export function Experiments() {
  const { s, a } = useApp();
  const [exps, setExps] = useState<Experiment[]>(() => [
    {
      id: 'x1', name: 'Subject line — spring blend', metric: 'open rate', kind: 'email', status: 'running',
      a: { label: '"Cold brew drops June 1"', n: 1240, x: 508 },
      b: { label: '"June 1. Cold brew. You in?"', n: 1236, x: 587 },
    },
    {
      id: 'x2', name: 'Landing hero — demo page', metric: 'form conversion', kind: 'page', status: 'running',
      a: { label: 'Control — "Book a demo"', n: 860, x: 54 },
      b: { label: 'Variant — "See your pipeline in Cadence"', n: 872, x: 71 },
    },
    {
      id: 'x3', name: 'LinkedIn hook style', metric: 'engagement rate', kind: 'post', status: 'running',
      a: { label: 'Question hook', n: 3100, x: 149 },
      b: { label: 'Contrarian statement', n: 3050, x: 214 },
    },
  ]);
  const [newOpen, setNewOpen] = useState(false);
  const [nf, setNf] = useState({ name: '', base: 20, lift: 15 });

  const results = useMemo(() => exps.map(e => ({ e, r: twoProp(e.b.x, e.b.n, e.a.x, e.a.n) })), [exps]);
  const required = sampleSize(nf.base / 100, nf.lift / 100);

  const ship = (id: string, winner: 'a' | 'b') => {
    setExps(xs => xs.map(x => x.id === id ? { ...x, status: 'shipped' } : x));
    a.toast(`Winner shipped — variant ${winner.toUpperCase()} is now live for everyone`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-moss" />Phase 2 · Experimentation
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">A/B testing</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            Two-proportion z-test, computed live — no canned "statistical significance" badge. Ship only when confidence ≥ 95% and the sample is real.
          </p>
        </div>
        <Btn onClick={() => setNewOpen(true)}><Icon name="plus" size={14} sw={2.4} /> New experiment</Btn>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {results.map(({ e, r }) => {
          const sig = r.confidence >= 95;
          const winner = r.lift > 0 ? 'b' : 'a';
          const wLabel = winner === 'b' ? e.b.label : e.a.label;
          return (
            <Card key={e.id} className="flex flex-col p-4" hover>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-bold text-ink">{e.name}</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-wider text-mut">{e.kind} · {e.metric}</p>
                </div>
                <Pill color={e.status === 'shipped' ? '#1e6b4f' : sig ? '#a3690e' : '#575046'}
                  tint={e.status === 'shipped' ? '#e2ede6' : sig ? '#f5e7cb' : '#ece7da'}>
                  {e.status === 'shipped' ? 'Shipped' : sig ? 'Significant' : 'Running'}
                </Pill>
              </div>

              <div className="mt-3 space-y-2">
                {[{ v: e.a, k: 'A' as const, rate: r.p2 }, { v: e.b, k: 'B' as const, rate: r.p1 }].map(({ v, k, rate }) => {
                  const isWin = sig && ((k === 'B' && r.lift > 0) || (k === 'A' && r.lift < 0));
                  return (
                    <div key={k} className={cx('rounded-lg border p-2.5', isWin ? 'border-moss bg-mint/50' : 'border-line bg-paper/50')}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-ink2">
                          <span className={cx('grid h-4.5 w-4.5 place-items-center rounded font-mono text-[9px]', isWin ? 'bg-moss text-night' : 'bg-line text-ink2')} style={{ width: 18, height: 18 }}>{k}</span>
                          <span className="truncate">{v.label}</span>
                        </span>
                        <span className="tnum shrink-0 font-mono text-[11.5px] font-bold text-ink">{(rate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/80">
                        <div className="anim-grow h-full rounded-full" style={{ width: `${Math.min(100, rate * 100 * 2)}%`, background: isWin ? '#6fb5a3' : '#7d6f5e' }} />
                      </div>
                      <p className="tnum mt-1 font-mono text-[9.5px] text-mut">{v.x.toLocaleString()} / {v.n.toLocaleString()} {e.metric.split(' ')[0]}s</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 rounded-lg border border-line bg-night px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-nighttx">Confidence</span>
                  <span className={cx('tnum font-mono text-[13px] font-bold', sig ? 'text-lime' : 'text-ink')}>{r.confidence.toFixed(1)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-nightline">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${r.confidence}%`, background: sig ? '#c8f169' : '#e0913c' }} />
                </div>
                <p className="mt-1.5 font-mono text-[9.5px] text-nighttx">
                  lift <span className={cx('font-bold', r.lift >= 0 ? 'text-lime' : 'text-ember')}>{r.lift >= 0 ? '+' : ''}{r.lift.toFixed(1)}%</span> · z = {((r.lift >= 0 ? 1 : -1) * Math.abs(twoProp(e.b.x, e.b.n, e.a.x, e.a.n).lift) >= 0 ? 1 : -1) && (Math.abs(r.confidence) >= 0) ? ((r.p1 - r.p2) / Math.max(0.0001, Math.sqrt(((r.p1 + r.p2) / 2) * (1 - (r.p1 + r.p2) / 2) * (1 / e.b.n + 1 / e.a.n)))).toFixed(2) : '0.00'}
                </p>
              </div>

              <div className="mt-auto pt-3">
                {e.status === 'running' && sig ? (
                  <Btn size="sm" className="w-full" onClick={() => ship(e.id, winner as 'a' | 'b')}>
                    <Icon name="check" size={13} sw={2.6} /> Ship winner · {winner.toUpperCase()}
                  </Btn>
                ) : e.status === 'running' ? (
                  <p className="rounded-lg bg-paper/70 px-2.5 py-2 text-center font-mono text-[10px] text-mut">
                    needs {Math.max(0, Math.ceil(sampleSize(Math.min(r.p1, r.p2) || 0.05, 0.1) - Math.min(e.a.n, e.b.n))).toLocaleString()} more per variant at 10% MDE
                  </p>
                ) : (
                  <p className="flex items-center justify-center gap-1.5 rounded-lg bg-mint/60 px-2.5 py-2 text-center text-[11px] font-semibold text-pine">
                    <Icon name="check" size={12} sw={2.6} /> {wLabel} is live
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New experiment" w="max-w-md"
        sub="Plan the sample before you run it — underpowered tests produce coin-flip decisions."
        footer={<>
          <Btn variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Btn>
          <Btn onClick={() => {
            setExps(xs => [...xs, {
              id: `x${Date.now()}`, name: nf.name || 'Untitled experiment', metric: 'open rate', kind: 'email', status: 'running',
              a: { label: 'Control', n: 0, x: 0 }, b: { label: 'Variant', n: 0, x: 0 },
            }]);
            setNewOpen(false); a.toast(`Experiment created — needs ${required.toLocaleString()} per variant`);
          }}>Create experiment</Btn>
        </>}>
        <div className="space-y-3">
          <Field label="What are you testing?" req>
            <input className={inputCls} value={nf.name} onChange={e => setNf({ ...nf, name: e.target.value })} placeholder="e.g. WhatsApp welcome message" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Baseline rate" hint="%">
              <input type="number" className={inputCls} value={nf.base} onChange={e => setNf({ ...nf, base: Number(e.target.value) })} />
            </Field>
            <Field label="Minimum detectable lift" hint="%">
              <input type="number" className={inputCls} value={nf.lift} onChange={e => setNf({ ...nf, lift: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="rounded-lg border border-line bg-night px-3.5 py-3">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-nighttx">Required sample</p>
            <p className="tnum mt-1 font-display text-[22px] font-bold text-lime">{required.toLocaleString()} <span className="text-[12px] font-normal text-nighttx">per variant · 95% conf / 80% power</span></p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
