import { useState } from 'react';
import { useApp, useCanEdit } from '../store';
import { cx, Icon } from '../meta';
import { Btn, Card, Field, inputCls, Modal, Pill, SectionTitle, Toggle } from '../components/ui';

const DEVICE_ICON = { laptop: 'laptop', smartphone: 'smartphone', server: 'server' } as const;

export function Security() {
  const { s, a } = useApp();
  const isAdmin = s.me?.role === 'admin';
  const can = useCanEdit();
  const [revealed, setRevealed] = useState<string | null>(null);
  const [newKey, setNewKey] = useState(false);
  const [nk, setNk] = useState({ label: '', scopes: 'contacts:read' });

  const score = 62 + (s.security.mfa ? 18 : 0) + (s.security.anomalyAlerts ? 10 : 0) + (s.security.rateLimit ? 10 : 0);
  const posture = score >= 90 ? { label: 'Excellent', color: '#7cc98f' } : score >= 75 ? { label: 'Strong', color: '#7cc98f' } : { label: 'Needs attention', color: '#e0b45c' };

  const fakeSecret = (prefix: string) => `${prefix}_${'•'.repeat(18)}${Math.random().toString(36).slice(2, 6)}`;

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-ember">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-ember" />Trust · Access control
          </p>
          <h1 className="font-display mt-1.5 text-[26px] font-bold leading-tight tracking-tight text-ink">Security & Sessions</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            Who's in, what they can touch, and proof for the auditor. Session and key management is admin-only — editors and viewers see a read-only posture.
          </p>
        </div>
        {!isAdmin && <Pill color="#e0b45c" tint="rgba(224,180,92,0.14)"><Icon name="lock" size={11} /> read-only — admin required to change</Pill>}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* posture + policies */}
        <div className="col-span-12 space-y-4 lg:col-span-4">
          <Card className="p-4">
            <SectionTitle>Security posture</SectionTitle>
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-line)" strokeWidth="9" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={posture.color} strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 264} 264`} className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <p className="tnum font-display text-[24px] font-bold text-ink">{score}</p>
                </div>
              </div>
              <div>
                <p className="font-display text-[17px] font-bold" style={{ color: posture.color }}>{posture.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-mut">Weighted across MFA, anomaly detection, rate limiting and key hygiene.</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {([
                { k: 'mfa' as const, label: 'Multi-factor authentication', icon: 'fingerprint', desc: 'TOTP + passkey for all admins' },
                { k: 'anomalyAlerts' as const, label: 'Anomaly login detection', icon: 'alert', desc: 'Flags new device / geo / velocity' },
                { k: 'rateLimit' as const, label: 'API rate limiting', icon: 'gauge', desc: '100 req/min per key, burst 20' },
              ]).map(p => (
                <div key={p.k} className="flex items-center gap-3 rounded-lg border border-line bg-paper/50 px-3 py-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mint text-pine"><Icon name={p.icon} size={15} /></span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[12px] font-bold text-ink">{p.label}</p>
                    <p className="truncate text-[10px] text-mut">{p.desc}</p>
                  </div>
                  <Toggle on={s.security[p.k]} disabled={!isAdmin} onChange={v => a.setSecurity({ [p.k]: v })} />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle>Compliance registry</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {['SOC 2 Type II', 'ISO 27001', 'GDPR', 'CCPA', 'EU AI Act Art. 50'].map(c => (
                <span key={c} className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-[10.5px] font-semibold text-ink2">
                  <Icon name="check" size={11} sw={2.8} className="text-pine" /> {c}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[10.5px] leading-relaxed text-mut">Reports and DSAR tooling export from here in production. Consent timestamps are stored per contact.</p>
          </Card>
        </div>

        <div className="col-span-12 space-y-4 lg:col-span-8">
          {/* sessions */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-paper/60 px-4 py-3">
              <SectionTitle right={<Pill color="#3d6bff" tint="rgba(61,107,255,0.12)">{s.sessions.length} active</Pill>}>Active sessions</SectionTitle>
            </div>
            <div className="divide-y divide-line/70">
              {s.sessions.map(sess => (
                <div key={sess.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', sess.current ? 'bg-mint text-pine' : 'bg-paper text-mut ring-1 ring-line')}>
                    <Icon name={DEVICE_ICON[sess.kind]} size={16} />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="flex items-center gap-2 text-[12.5px] font-bold text-ink">
                      {sess.device}
                      {sess.current && <Pill color="#7cc98f" tint="rgba(124,201,143,0.14)">this device</Pill>}
                    </p>
                    <p className="truncate font-mono text-[9.5px] text-mut">{sess.browser} · {sess.location} · {sess.ip} · {sess.lastActive}</p>
                  </div>
                  {!sess.current && (
                    <Btn size="sm" variant="dangerGhost" className="border border-line" disabled={!isAdmin} onClick={() => a.revokeSession(sess.id)}>
                      <Icon name="x" size={12} sw={2.6} /> Revoke
                    </Btn>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* api keys */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-paper/60 px-4 py-3">
              <SectionTitle right={<Pill color="#8a63d2" tint="rgba(138,99,210,0.12)">{s.apiKeys.length} keys</Pill>}>API keys</SectionTitle>
              <Btn size="sm" disabled={!isAdmin} onClick={() => setNewKey(true)}><Icon name="plus" size={13} sw={2.4} /> New key</Btn>
            </div>
            <div className="divide-y divide-line/70">
              {s.apiKeys.map(k => (
                <div key={k.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-paper text-mut ring-1 ring-line"><Icon name="key" size={15} /></span>
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="text-[12.5px] font-bold text-ink">{k.label}</p>
                      <button onClick={() => setRevealed(revealed === k.id ? null : k.id)} disabled={!can}
                        className="mt-0.5 font-mono text-[10px] text-mut transition hover:text-ink disabled:cursor-default">
                        {revealed === k.id ? fakeSecret(k.prefix) : `${k.prefix}_••••••••••••••••`} <span className="text-faint">· click to {revealed === k.id ? 'hide' : 'reveal'}</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Btn size="sm" variant="outline" disabled={!isAdmin} onClick={() => a.rotateApiKey(k.id)}><Icon name="refresh" size={12} /> Rotate</Btn>
                      <Btn size="sm" variant="dangerGhost" className="border border-line" disabled={!isAdmin} onClick={() => a.removeApiKey(k.id)}><Icon name="trash" size={12} /></Btn>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-12">
                    {k.scopes.map(sc => <span key={sc} className="rounded bg-paper px-1.5 py-0.5 font-mono text-[9px] font-semibold text-mut ring-1 ring-line">{sc}</span>)}
                    <span className="ml-auto font-mono text-[9px] text-faint">created {k.created} · last used {k.lastUsed}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Modal open={newKey} onClose={() => setNewKey(false)} title="Create API key" sub="Scopes follow least-privilege. The secret is shown once." w="max-w-md"
        footer={<>
          <Btn variant="ghost" onClick={() => setNewKey(false)}>Cancel</Btn>
          <Btn disabled={!nk.label.trim()} onClick={() => { a.addApiKey(nk.label.trim(), nk.scopes.split(',').map(x => x.trim()).filter(Boolean)); setNewKey(false); setNk({ label: '', scopes: 'contacts:read' }); }}>
            <Icon name="key" size={13} /> Create key
          </Btn>
        </>}>
        <div className="space-y-3">
          <Field label="Label" req><input className={inputCls} value={nk.label} onChange={e => setNk({ ...nk, label: e.target.value })} placeholder="e.g. Warehouse sync" /></Field>
          <Field label="Scopes" hint="comma separated">
            <input className={inputCls} value={nk.scopes} onChange={e => setNk({ ...nk, scopes: e.target.value })} placeholder="contacts:read, posts:write" />
          </Field>
          <p className="rounded-lg bg-paper/70 px-3 py-2 text-[10.5px] leading-relaxed text-mut">
            Available: <span className="font-mono text-[9.5px]">contacts:read/write · posts:read/write · campaigns:write · reports:read</span>
          </p>
        </div>
      </Modal>
    </div>
  );
}
