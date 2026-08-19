import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { authApi, DEMO_PASSWORD, ROLE_LABEL } from '../services/backend';
import { cx, Icon, PLATFORMS, PlatformIcon } from '../meta';
import { Avatar, inputCls } from './ui';

const QUEUE = [
  { p: 'linkedin' as const, t: '09:00', label: 'Wholesale spotlight' },
  { p: 'instagram' as const, t: '12:30', label: 'Spring blend reel' },
  { p: 'x' as const, t: '15:00', label: 'Roast-day thread' },
];

/* A living product vignette — the three tools, visibly unified. */
function LiveVignette() {
  const [followers, setFollowers] = useState(2147);
  const [eng, setEng] = useState(312);
  useEffect(() => {
    const t = window.setInterval(() => {
      setFollowers(f => f + Math.floor(Math.random() * 3));
      setEng(e => e + Math.floor(Math.random() * 2));
    }, 2400);
    return () => window.clearInterval(t);
  }, []);
  const pipe = [34, 26, 18, 22];
  const pipeColors = ['#8a978d', '#4c86a8', '#c08a1e', '#c4622d'];
  return (
    <div className="mt-8 space-y-2.5">
      {/* pipeline */}
      <div className="shimmer anim-rise relative w-[352px] overflow-hidden rounded-xl border border-nightline bg-night2/80 px-4 py-3" style={{ animationDelay: '120ms' }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-nighttx">Open pipeline</p>
          <p className="font-mono text-[11px] font-bold text-moss">$48.2K</p>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-nightline">
          {pipe.map((v, i) => (
            <div key={i} className="anim-grow h-full" style={{ width: `${v}%`, background: pipeColors[i], animationDelay: `${300 + i * 120}ms` }} />
          ))}
        </div>
      </div>

      {/* inbox — a reply being typed */}
      <div className="anim-rise flex w-[352px] items-center gap-3 rounded-xl border border-nightline bg-night2/80 px-3.5 py-2.5" style={{ animationDelay: '260ms' }}>
        <PlatformIcon p="instagram" size={24} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-semibold text-card">@latte.lena commented</p>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-nightline">
              <div className="type-bar absolute inset-y-0 left-0 rounded-full bg-moss" />
            </div>
            <span className="anim-blink h-3 w-[2px] bg-moss" />
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-steel/15 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-steel">
          drafting
        </span>
      </div>

      {/* queued posts */}
      {QUEUE.map((m, i) => (
        <div key={m.p} className="anim-rise flex w-[352px] items-center gap-3 rounded-xl border border-nightline bg-night2/80 px-3.5 py-2.5" style={{ animationDelay: `${400 + i * 120}ms` }}>
          <PlatformIcon p={m.p} size={24} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold text-card">{m.label}</p>
            <p className="font-mono text-[9.5px] text-nighttx">{PLATFORMS[m.p].name} · scheduled {m.t}</p>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-moss/15 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-moss">
            <span className="live-dot h-1 w-1 rounded-full bg-moss" /> queued
          </span>
        </div>
      ))}

      {/* realtime counters */}
      <div className="anim-rise flex w-[352px] items-center justify-between rounded-xl border border-nightline bg-night2/80 px-4 py-3" style={{ animationDelay: '780ms' }}>
        {[
          { icon: 'users', label: 'followers', v: followers.toLocaleString() },
          { icon: 'heart', label: 'engagement', v: eng.toLocaleString() },
          { icon: 'bolt', label: 'auto-task', v: 'sent' },
        ].map(c => (
          <div key={c.label} className="text-center">
            <p className="flex items-center justify-center gap-1.5 font-mono text-[13px] font-bold text-card">
              <Icon name={c.icon} size={12} className="text-moss" />{c.v}
            </p>
            <p className="mt-0.5 font-mono text-[8px] font-semibold uppercase tracking-[0.14em] text-nighttx">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Login() {
  const { s, a } = useApp();
  const [email, setEmail] = useState('maya@emberandoak.com');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(0);

  const submit = async (e?: { preventDefault: () => void }) => {
    e?.preventDefault();
    if (busy) return;
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      setShake(x => x + 1);
      return;
    }
    setBusy(true);
    const res = await authApi.login(s.users, email, password);
    if (!res.ok) {
      setBusy(false);
      setError(res.error);
      setShake(x => x + 1);
      return;
    }
    a.login(res.user.id, remember);
  };

  const fill = (em: string) => {
    setEmail(em);
    setPassword(DEMO_PASSWORD);
    setError('');
  };

  return (
    <div className="flex min-h-full">
      {/* brand / product panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-night p-10 lg:flex">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-[0.35]" />
        <div className="anim-drift pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-moss/15 blur-3xl" />
        <div className="anim-drift2 pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-steel/10 blur-3xl" />
        <div className="anim-drift pointer-events-none absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-amber/8 blur-3xl" style={{ animationDelay: '4s' }} />

        <div className="relative flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="9" fill="#0e7a52" />
            <rect x="7" y="16" width="4" height="9" rx="1.5" fill="#f1f2ec" />
            <rect x="14" y="11" width="4" height="14" rx="1.5" fill="#f1f2ec" />
            <rect x="21" y="6" width="4" height="19" rx="1.5" fill="#f1f2ec" />
          </svg>
          <div className="leading-none">
            <p className="font-display text-xl font-bold tracking-tight text-card">Cadence</p>
            <p className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.24em] text-nighttx">Social CRM</p>
          </div>
        </div>

        <div className="relative">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-moss">One database · every channel</p>
          <h1 className="mt-3 max-w-[430px] font-display text-[40px] font-bold leading-[1.04] tracking-tight text-card">
            Buffer schedules posts.<br />HubSpot tracks customers.<br />
            <span className="text-moss">We built both in one tool.</span>
          </h1>

          <LiveVignette />
        </div>

        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] text-nighttx">
          <span>PostgreSQL · one schema</span><span className="text-nightline">|</span>
          <span>Redis publish queue</span><span className="text-nightline">|</span>
          <span>Your SMTP, not ours</span><span className="text-nightline">|</span>
          <span>$0 marginal AI cost</span>
        </div>
      </div>

      {/* form panel */}
      <div className="bg-dots relative flex flex-1 items-center justify-center p-6">
        <div className="glow-top pointer-events-none absolute inset-x-0 top-0 h-80" />
        <div className="relative w-full max-w-[420px]">
          <div className="mb-6 lg:hidden">
            <div className="flex items-center gap-2.5">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect width="32" height="32" rx="9" fill="#0e7a52" />
                <rect x="7" y="16" width="4" height="9" rx="1.5" fill="#f1f2ec" />
                <rect x="14" y="11" width="4" height="14" rx="1.5" fill="#f1f2ec" />
                <rect x="21" y="6" width="4" height="19" rx="1.5" fill="#f1f2ec" />
              </svg>
              <p className="font-display text-lg font-bold tracking-tight text-ink">Cadence <span className="ml-1 font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-mut">Social CRM</span></p>
            </div>
          </div>

          <h2 className="font-display text-[26px] font-bold tracking-tight text-ink">Sign in to Ember & Oak</h2>
          <p className="mt-1 text-[13px] text-mut">Your workspace: CRM, calendar, inbox and email — one login.</p>

          {/* workspace accounts */}
          <div className="mt-5">
            <p className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-mut">Demo accounts · click to fill</p>
            <div className="grid grid-cols-3 gap-2">
              {s.users.map(u => (
                <button key={u.id} onClick={() => fill(u.email)}
                  className={cx('group rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.98]',
                    email === u.email ? 'border-moss bg-mint/70 ring-2 ring-moss/15' : 'border-line bg-card hover:border-line2')}>
                  <Avatar name={u.name} color={u.color} size={30} />
                  <p className="mt-1.5 truncate text-[11px] font-bold text-ink">{u.name.split(' ')[0]}</p>
                  <p className="font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: u.role === 'admin' ? '#0e7a52' : u.role === 'editor' ? '#3e7cb1' : '#6e776f' }}>
                    {ROLE_LABEL[u.role]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink2">Work email</span>
              <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center justify-between text-xs font-semibold text-ink2">
                Password
                <button type="button" onClick={() => a.toast(`Demo workspaces share one password: "${DEMO_PASSWORD}"`, 'info')} className="font-mono text-[10px] font-semibold text-moss transition hover:text-pine">
                  demo hint
                </button>
              </span>
              <div className="relative">
                <input className={cx(inputCls, 'pr-10')} type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(v => !v)} title={showPw ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint transition hover:text-ink">
                  <Icon name={showPw ? 'x' : 'eye'} size={15} />
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setRemember(v => !v)} className="flex items-center gap-2 text-xs font-medium text-ink2 transition hover:text-ink">
                <span className={cx('grid h-[17px] w-[17px] place-items-center rounded-[5px] border transition-all', remember ? 'border-moss bg-moss text-card' : 'border-line2 bg-card')}>
                  {remember && <Icon name="check" size={10} sw={3.2} />}
                </span>
                Keep me signed in
              </button>
              <button type="button" onClick={() => a.toast('Password reset link sent — check your inbox (demo)', 'info')} className="text-xs font-semibold text-moss transition hover:text-pine">
                Forgot password?
              </button>
            </div>

            {error && (
              <p key={shake} className="anim-shake flex items-center gap-2 rounded-lg border border-dangerbg bg-dangerbg/70 px-3 py-2.5 text-xs font-semibold text-danger">
                <Icon name="alert" size={14} /> {error}
              </p>
            )}

            <button type="submit" disabled={busy}
              className={cx('flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-moss text-[14px] font-bold text-card shadow-sm transition-all hover:bg-pine active:scale-[0.985]',
                busy && 'pointer-events-none opacity-80')}>
              {busy ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Verifying credentials…
                </>
              ) : (
                <>Sign in <Icon name="chevr" size={15} sw={2.4} /></>
              )}
            </button>
          </form>

          <p className="mt-5 rounded-xl border border-line bg-card/70 px-3.5 py-2.5 text-center text-[11px] leading-relaxed text-mut">
            Sessions use a signed token (demo: localStorage). Viewer accounts are <span className="font-semibold text-ink2">read-only</span> — sign in as Priya to see role gating.
          </p>
          <p className="mt-3 text-center font-mono text-[9.5px] text-faint">v2.0 · Phase 1 MVP · self-serve onboarding in &lt; 24h</p>
        </div>
      </div>
    </div>
  );
}
