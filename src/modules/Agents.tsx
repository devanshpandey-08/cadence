import { useMemo } from 'react';
import { useApp, useCanEdit } from '../store';
import { cx, Icon, relTime } from '../meta';
import type { Agent, AgentTier } from '../types';
import { Btn, Card, CountUp, Pill, SectionTitle } from '../components/ui';

const TIER_META: Record<AgentTier, { label: string; desc: string; color: string }> = {
  supervised: { label: 'Supervised', desc: 'Asks before every action', color: '#7fa3c9' },
  copilot: { label: 'Co-pilot', desc: 'Drafts for your review', color: '#e0b45c' },
  autonomous: { label: 'Autonomous', desc: 'Acts, then reports', color: '#7cc98f' },
};
const TIERS: AgentTier[] = ['supervised', 'copilot', 'autonomous'];
const RISK_META = {
  low: { label: 'Low', color: '#7cc98f', tint: 'rgba(124,201,143,0.14)' },
  med: { label: 'Medium', color: '#e0b45c', tint: 'rgba(224,180,92,0.14)' },
  high: { label: 'High', color: '#e0713a', tint: 'rgba(224,113,58,0.16)' },
} as const;

function TierSlider({ agent }: { agent: Agent }) {
  const { a } = useApp();
  const can = useCanEdit();
  const idx = TIERS.indexOf(agent.tier);
  return (
    <div className="mt-3">
      <div className="flex rounded-lg border border-nightline bg-night2/50 p-0.5">
        {TIERS.map(t => (
          <button key={t} disabled={!can} onClick={() => a.setAgentTier(agent.id, t)}
            className={cx('flex-1 rounded-md px-1 py-1 text-[10px] font-bold transition disabled:opacity-50',
              agent.tier === t ? 'text-night' : 'text-nighttx hover:text-card')}
            style={agent.tier === t ? { background: TIER_META[t].color } : undefined}
            title={TIER_META[t].desc}>
            {TIER_META[t].label}
          </button>
        ))}
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-nightline">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${((idx + 1) / 3) * 100}%`, background: TIER_META[agent.tier].color }} />
      </div>
      <p className="mt-1 font-mono text-[9px] text-nighttx">{TIER_META[agent.tier].desc}</p>
    </div>
  );
}

export function Agents() {
  const { s, a } = useApp();
  const can = useCanEdit();
  const pending = s.approvals.filter(x => x.status === 'pending');
  const decided = s.approvals.filter(x => x.status !== 'pending');
  const totalOps = s.agents.reduce((n, ag) => n + ag.actions, 0);
  const split = useMemo(() => ({
    auto: s.agents.filter(x => x.tier === 'autonomous').length,
    co: s.agents.filter(x => x.tier === 'copilot').length,
    sup: s.agents.filter(x => x.tier === 'supervised').length,
  }), [s.agents]);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ember">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-ember" />Phase 3 · Autonomy
          </p>
          <h1 className="font-display mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-ink">Agent Fleet</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            Eight specialized agents operating under tiered autonomy. High-stakes moves route to the human-in-the-loop queue — nothing irreversible runs unreviewed.
          </p>
        </div>
        <Pill color="#7cc98f" tint="rgba(124,201,143,0.14)" dot>{pending.length} awaiting review</Pill>
      </div>

      {/* telemetry */}
      <div className="stagger grid grid-cols-12 gap-3">
        <Card className="col-span-6 p-3.5 lg:col-span-3" hover>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-mut">Operations (30d)</p>
          <CountUp value={totalOps} className="font-display mt-1 block text-[24px] font-bold leading-none text-ink" />
        </Card>
        <Card className="col-span-6 p-3.5 lg:col-span-3" hover>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-mut">Autonomous</p>
          <p className="font-display mt-1 text-[24px] font-bold leading-none" style={{ color: TIER_META.autonomous.color }}>{split.auto}<span className="text-[13px] text-mut">/{s.agents.length}</span></p>
        </Card>
        <Card className="col-span-6 p-3.5 lg:col-span-3" hover>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-mut">Co-pilot</p>
          <p className="font-display mt-1 text-[24px] font-bold leading-none" style={{ color: TIER_META.copilot.color }}>{split.co}<span className="text-[13px] text-mut">/{s.agents.length}</span></p>
        </Card>
        <Card className="col-span-6 p-3.5 lg:col-span-3" hover>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-mut">Approval rate</p>
          <p className="font-display mt-1 text-[24px] font-bold leading-none text-ink">{decided.length ? Math.round((decided.filter(d => d.status === 'approved').length / decided.length) * 100) : 0}%</p>
        </Card>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* approval queue */}
        <Card className="col-span-12 overflow-hidden lg:col-span-5">
          <div className="border-b border-line bg-paper/60 px-4 py-3">
            <SectionTitle right={<Pill color="#e0b45c" tint="rgba(224,180,92,0.14)">{pending.length}</Pill>}>Human-in-the-loop queue</SectionTitle>
          </div>
          <div className="max-h-[560px] space-y-2.5 overflow-y-auto p-3">
            {pending.map(ap => {
              const rm = RISK_META[ap.risk];
              return (
                <div key={ap.id} className="anim-rise rounded-xl border border-line bg-card p-3 shadow-hard-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-ink">{ap.action}</p>
                      <p className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider" style={{ color: rm.color }}>{ap.agent} · {rm.label} risk</p>
                    </div>
                    <span className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase" style={{ background: rm.tint, color: rm.color }}>{relTime(ap.at)}</span>
                  </div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-mut">{ap.detail}</p>
                  <div className="mt-3 flex gap-2">
                    <Btn size="sm" className="flex-1" disabled={!can} onClick={() => a.decideApproval(ap.id, true)}><Icon name="check" size={13} sw={2.6} /> Approve</Btn>
                    <Btn size="sm" variant="dangerGhost" className="flex-1 border border-line" disabled={!can} onClick={() => a.decideApproval(ap.id, false)}><Icon name="x" size={13} sw={2.6} /> Reject</Btn>
                  </div>
                </div>
              );
            })}
            {pending.length === 0 && (
              <div className="py-10 text-center">
                <p className="font-display text-[15px] font-bold text-ink">Queue is clear</p>
                <p className="mt-1 text-[11px] text-mut">Agents are acting within their autonomy. New requests surface here.</p>
              </div>
            )}
          </div>
          {decided.length > 0 && (
            <div className="border-t border-line bg-paper/50 px-4 py-2.5">
              <p className="font-mono text-[9.5px] text-mut">Audit log: {decided.length} decision{decided.length === 1 ? '' : 's'} — {decided.filter(d => d.status === 'approved').length} approved, {decided.filter(d => d.status === 'rejected').length} rejected. Immutable in production.</p>
            </div>
          )}
        </Card>

        {/* fleet */}
        <div className="col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-7">
          {s.agents.map(ag => (
            <Card key={ag.id} className="p-3.5" hover>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: ag.color + '1e', color: ag.color }}>
                  <Icon name={ag.icon} size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-bold text-ink">{ag.name}</p>
                    {ag.status === 'working' && <span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: ag.color }} />}
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] text-mut">{ag.role}</p>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <p className="tnum font-mono text-[10.5px] text-mut"><span className="font-bold text-ink">{ag.actions.toLocaleString()}</span> ops</p>
                <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: ag.status === 'working' ? ag.color : '#a6a69b' }}>{ag.status === 'working' ? 'working' : 'idle'}</span>
              </div>
              <TierSlider agent={ag} />
            </Card>
          ))}
        </div>
      </div>

      {/* governance */}
      <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 border-ember/30 bg-ember/6 p-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-ember/15 text-ember"><Icon name="shield" size={17} /></span>
        <div className="min-w-[240px] flex-1">
          <p className="text-[13px] font-bold text-ink">Governance guardrails</p>
          <p className="text-[11px] leading-relaxed text-mut">Irreversible actions (spend, publish, send) always require approval below Autonomous. Every decision is logged with actor, timestamp and rationale. Viewers can't alter autonomy.</p>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] text-mut">
          <span><span className="font-bold text-ink">EU AI Act Art. 50</span> · disclosure on</span>
          <span><span className="font-bold text-ink">Kill-switch</span> · fleet-wide pause</span>
        </div>
      </Card>
    </div>
  );
}
