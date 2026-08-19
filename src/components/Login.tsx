import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { authApi, DEMO_PASSWORD, ROLE_LABEL } from '../services/backend';
import { cx, Icon, kfmt, PLATFORMS, PlatformIcon } from '../meta';
import { Avatar, inputCls } from './ui';

/* A quiet, living proof of the product — pipeline, inbox and queue, one database. */
function Vignette() {
  const [followers, setFollowers] = useState(2147);
  const [eng, setEng] = useState(312);
  useEffect(() => {
    const t = window.setInterval(() => {
      setFollowers(f => f + Math.floor(Math.random() * 3));
      setEng(e => e + Math.floor(Math.random() * 2));
    }, 2600);
    return () => window.clearInterval(t);
  }, []);
  const pipe = [
    { v: 34, c: '#3b6fd4' },
    { v: 26, c: '#e5b23f' },
    { v: 18, c: '#e0713a' },
    { v: 22, c: '#2fbf8f' },
  ];
  const queue = [
    { p: 'linkedin' as const, t: '09:00', label: 'Wholesale spotlight' },
    { p: 'instagram' as const, t: '12:30', label: 'Spring blend reel' },
    { p: 'x' as const, t: '15:00', label: 'Roast-day thread' },
  ];
  return (
    <div className="mt-9 w-full max-w-[380px] space-y-2.5">
      <div className="anim-rise rounded-xl border border-nightline bg-night2/70 px-4 py-3" style={{ animationDelay: '120ms' }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-nighttx">Open pipeline</p>
          <p className="tnum font-mono text-[11px] font-bold text-lime">$48.2K</p>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-nightline">
          {pipe.map((s, i) => (
            <div key={i} className="anim-grow h-full" style={{ width: `${s.v}%`, background: s.c, animationDelay: `${300 + i * 110}ms` }} />
          ))}
        </div>
      </div>

      <div className="anim-rise flex items-center gap-3 rounded-xl border border-nightline bg-night2/70 px-3.5 py-2.5" style={{ animationDelay: '260ms' }}>
        <PlatformIcon p="instagram" size={22} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-semibold text-white/90">@latte.lena commented</p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-nightline">
              <div className="type-bar absolute inset-y-0 left-0 rounded-full bg-lime" />
            </div>
          </div>
        </div>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-blue">drafting</span>
      </div>

      {queue.map((m, i) => (
        <div key={m.p} className="anim-rise flex items-center gap-3 rounded-xl border border-nightline bg-night2/70 px-3.5 py-2.5" style={{ animationDelay: `${400 + i * 110}ms` }}>
          <PlatformIcon p={m.p} size={22} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold text-white/90">{m.label}</p>
            <p className="font-mono text-[9.5px] text-nighttx">{PLATFORMS[m.p].name} · {m.t}</p>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-lime">
            <span className="live-dot h-1 w-1 rounded-full bg-lime" /> queued
          </span>
        </div>
      ))}

      <div className="anim-rise flex items-center justify-between rounded-xl border border-nightline bg-night2/70 px-4 py-3" style={{ animationDelay: '760ms' }}>
        {[
          { label: 'followers', v: kfmt(followers) },
          { label: 'engagement', v: String(eng) },
          { label: 'auto-task', v: 'sent' },
        ].map(c => (
          <div key={c.label} className="text-center">
            <p className="tnum font-display text-[15px] font-semibold text-white/95">{c.v}</p>
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
      {/* brand panel */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-night p-10 lg:flex">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-[0.25]" />
        <div className="anim-drift pointer-events-none absolute -left-28 -top-28 h-96 w-96 rounded-full bg-moss/12 blur-3xl" />
        <div className="anim-drift2 pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-blue/8 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <svg width="34" height="34" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#0b7a55" />
            <rect x="8" y="17" width="3.6" height="7" rx="1.8" fill="#f4f7f3" />
            <rect x="14.2" y="12" width="3.6" height="12" rx="1.8" fill="#f4f7f3" />
            <rect x="20.4" y="7" width="3.6" height="17" rx="1.8" fill="#f4f7f3" />
          </svg>
          <div className="leading-none">
            <p className="font-display text-xl font-semibold tracking-tight text-white">Cadence</p>
            <p className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.24em] text-nighttx">Social CRM</p>
          </div>
        </div>

        <div className="relative">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-lime">One database · every channel</p>
          <h1 className="mt-3 max-w-[440px] font-display text-[38px] font-semibold leading-[1.1] tracking-tight text-white">
            Buffer schedules posts.<br />HubSpot tracks customers.<br />
            <span className="text-lime">We built both in one tool.</span>
          </h1>
          <Vignette />
        </div>

        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] text-nighttx">
          <span>PostgreSQL · one schema</span><span className="text-nightline">·</span>
          <span>Redis publish queue</span><span className="text-nightline">·</span>
          <span>Your SMTP, not ours</span>
        </div>
      </div>

      {/* form panel */}
      <div className="glow-top relative flex flex-1 items-center justify-center p-6">
        <div className="relative w-full max-w-[400px]">
          <div className="mb-7 lg:hidden">
            <div className="flex items-center gap-2.5">
              <svg width="32" height="32" viewBox="0 0 32 32">
                <rect width="32" height="32" rx="8" fill="#0b7a55" />
                <rect x="8" y="17" width="3.6" height="7" rx="1.8" fill="#f4f7f3" />
                <rect x="14.2" y="12" width="3.6" height="12" rx="1.8" fill="#f4f7f3" />
                <rect x="20.4" y="7" width="3.6" height="17" rx="1.8" fill="#f4f7f3" />
              </svg>
              <p className="font-display text-lg font-semibold tracking-tight text-ink">Cadence</p>
            </div>
          </div>

          <h2 className="font-display text-[26px] font-semibold tracking-tight text-ink">Sign in to Ember & Oak</h2>
          <p className="mt-1 text-[13px] text-mut">Your workspace: CRM, calendar, inbox and email — one login.</p>

          <div className="mt-6">
            <p className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Demo accounts · click to fill</p>
            <div className="grid grid-cols-3 gap-2">
              {s.users.map(u => (
                <button key={u.id} onClick={() => fill(u.email)}
                  className={cx('group rounded-xl border p-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift',
                    email === u.email ? 'border-moss bg-mint' : 'border-line bg-card hover:border-line2')}>
                  <Avatar name={u.name} color={u.color} size={30} />
                  <p className="mt-1.5 truncate text-[11px] font-bold text-ink">{u.name.split(' ')[0]}</p>
                  <p className="font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ color: u.role === 'admin' ? '#0b7a55' : u.role === 'editor' ? '#3b6fd4' : '#b26e14' }}>
                    {ROLE_LABEL[u.role]}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3.5">
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
                <span className={cx('grid h-[17px] w-[17px] place-items-center rounded-[5px] border transition-all', remember ? 'border-moss bg-moss text-white' : 'border-line2 bg-card')}>
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
              className={cx('press flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-moss text-[14px] font-semibold text-white shadow-btn transition-colors hover:bg-pine',
                busy && 'pointer-events-none opacity-80')}>
              {busy ? (
                <>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Verifying…
                </>
              ) : (
                <>Sign in <Icon name="chevr" size={15} sw={2.2} /></>
              )}
            </button>
          </form>

          <p className="mt-5 rounded-xl border border-line bg-card px-3.5 py-2.5 text-center text-[11px] leading-relaxed text-mut">
            Viewer accounts are <span className="font-semibold text-ink2">read-only</span> — sign in as Priya to see role gating.
          </p>
        </div>
      </div>
    </div>
  );
}
