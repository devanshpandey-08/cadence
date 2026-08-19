import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { authApi, DEMO_PASSWORD, ROLE_LABEL } from '../services/backend';
import { cx, Icon, PLATFORM_IDS, PLATFORMS, PlatformIcon } from '../meta';
import { Avatar, inputCls, Sticker } from './ui';

const MARQUEE = ['ONE LOGIN', '8 PLATFORMS', 'CRM + SOCIAL + EMAIL', 'NO PER-SEAT TAX', '$79 FLAT', 'NO AI FEES', '1 DATABASE'];

function Marquee({ dark }: { dark?: boolean }) {
  const row = [...MARQUEE, ...MARQUEE];
  return (
    <div className={cx('overflow-hidden border-y-2 border-ink py-1.5', dark ? 'bg-lime text-ink' : 'bg-ink text-lime')}>
      <div className="marquee flex w-max items-center gap-6" style={{ ['--speed' as string]: '22s' }}>
        {row.map((m, i) => (
          <span key={i} className="flex items-center gap-6 font-mono text-[10.5px] font-bold uppercase tracking-[0.18em]">
            {m} <span className="text-pink">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

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
  const pipeColors = ['#75756b', '#3d6bff', '#ffd954', '#ff7a3d'];
  return (
    <div className="space-y-2.5">
      {/* pipeline */}
      <div className="shimmer anim-rise relative w-[360px] overflow-hidden rounded-xl border-2 border-nightline bg-night2 px-4 py-3 shadow-[4px_4px_0_0_#c8f169]" style={{ animationDelay: '120ms' }}>
        <div className="mb-2 flex items-center justify-between">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-nighttx">Open pipeline</p>
          <p className="tnum font-mono text-[12px] font-bold text-lime">$48.2K</p>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-sm border border-nightline bg-night">
          {pipe.map((v, i) => (
            <div key={i} className="anim-grow h-full" style={{ width: `${v}%`, background: pipeColors[i], animationDelay: `${300 + i * 120}ms` }} />
          ))}
        </div>
      </div>

      {/* inbox — a reply being typed */}
      <div className="anim-rise flex w-[360px] items-center gap-3 rounded-xl border-2 border-nightline bg-night2 px-3.5 py-2.5 shadow-[4px_4px_0_0_#ff5ca8]" style={{ animationDelay: '260ms' }}>
        <PlatformIcon p="instagram" size={24} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-bold text-card">@latte.lena commented</p>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-night">
              <div className="type-bar absolute inset-y-0 left-0 rounded-full bg-lime" />
            </div>
            <span className="live-dot h-3 w-[2px] bg-lime" />
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-md border border-pink/50 bg-pink/15 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-pink">
          drafting
        </span>
      </div>

      {/* queued posts */}
      {QUEUE.map((m, i) => (
        <div key={m.p} className="anim-rise flex w-[360px] items-center gap-3 rounded-xl border-2 border-nightline bg-night2 px-3.5 py-2.5" style={{ animationDelay: `${400 + i * 120}ms` }}>
          <PlatformIcon p={m.p} size={24} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-bold text-card">{m.label}</p>
            <p className="font-mono text-[9.5px] text-nighttx">{PLATFORMS[m.p].name} · scheduled {m.t}</p>
          </div>
          <span className="flex items-center gap-1 rounded-md border border-lime/40 bg-lime/12 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-lime">
            <span className="live-dot h-1 w-1 rounded-full bg-lime" /> queued
          </span>
        </div>
      ))}

      {/* realtime counters */}
      <div className="anim-rise flex w-[360px] items-center justify-between rounded-xl border-2 border-nightline bg-night2 px-4 py-3" style={{ animationDelay: '780ms' }}>
        {[
          { icon: 'users', label: 'followers', v: followers.toLocaleString(), c: '#c8f169' },
          { icon: 'heart', label: 'engagement', v: eng.toLocaleString(), c: '#ff5ca8' },
          { icon: 'bolt', label: 'auto-task', v: 'sent', c: '#ffd954' },
        ].map(c => (
          <div key={c.label} className="text-center">
            <p className="flex items-center justify-center gap-1.5 font-mono text-[13px] font-bold text-card">
              <span style={{ color: c.c }}><Icon name={c.icon} size={12} sw={2.2} /></span>{c.v}
            </p>
            <p className="mt-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-nighttx">{c.label}</p>
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

  const roleChip = { admin: '#c8f169', editor: '#9db8ff', viewer: '#e4e4d8' } as const;

  return (
    <div className="flex min-h-full">
      {/* brand / product panel */}
      <div className="relative hidden w-[47%] flex-col overflow-hidden bg-night lg:flex">
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-[0.3]" />
        <span aria-hidden className="outline-text-light pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[150px] leading-none opacity-60">CADENCE</span>

        <Marquee />

        <div className="relative flex flex-1 flex-col justify-between gap-6 p-9">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-lime shadow-[3px_3px_0_0_#ff5ca8]">
              <Icon name="bolt" size={20} sw={2.2} className="text-ink" />
            </span>
            <div className="leading-none">
              <p className="font-display text-[21px] tracking-tight text-card">CADENCE</p>
              <p className="mt-1 font-mono text-[8.5px] font-bold uppercase tracking-[0.26em] text-nighttx">social crm</p>
            </div>
            <Sticker color="#ff5ca8" rotate={3} className="ml-auto">v3 · phases 1–3</Sticker>
          </div>

          <div className="relative">
            <h1 className="max-w-[520px] font-display text-[46px] leading-[0.98] tracking-tight text-card">
              YOUR SOCIALS <span className="text-lime">+</span> YOUR CRM <span className="text-pink">HAD A BABY.</span>
            </h1>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Sticker rotate={-3}>$79 flat</Sticker>
              <Sticker color="#ff5ca8" rotate={2}>8 platforms</Sticker>
              <Sticker color="#9db8ff" rotate={-1.5}>1 database</Sticker>
              <Sticker color="#ffd954" rotate={3}>no per-seat tax</Sticker>
            </div>
            <div className="mt-7"><LiveVignette /></div>
          </div>

          <div className="relative">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {PLATFORM_IDS.map((p, i) => (
                <span key={p} className="sticker anim-bouncein grid h-9 w-9 place-items-center rounded-lg border-2 border-nightline bg-night2"
                  style={{ animationDelay: `${900 + i * 70}ms`, ['--rot' as string]: `${i % 2 ? 2 : -2}deg` }} title={PLATFORMS[p].name}>
                  <PlatformIcon p={p} size={20} />
                </span>
              ))}
            </div>
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-nighttx">
              buffer schedules · hubspot tracks · <span className="text-lime">cadence does both</span>
            </p>
          </div>
        </div>
      </div>

      {/* form panel */}
      <div className="bg-checker relative flex flex-1 flex-col overflow-hidden">
        <div className="glow-top pointer-events-none absolute inset-x-0 top-0 h-80" />
        <div className="lg:hidden"><Marquee dark={false} /></div>

        <div className="relative flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-[430px]">
            <div className="mb-6 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-lime shadow-hard">
                <Icon name="bolt" size={20} sw={2.2} className="text-ink" />
              </span>
              <p className="font-display text-xl text-ink">CADENCE <span className="ml-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-mut">social crm</span></p>
            </div>

            <div className="anim-rise rounded-2xl border-2 border-ink bg-card p-6 shadow-hard-lg sm:p-7">
              <Sticker rotate={-2} className="mb-4">demo workspace</Sticker>
              <h2 className="font-display text-[27px] leading-tight text-ink">yo, welcome back</h2>
              <p className="mt-1.5 text-[13px] font-medium text-ink2">One login for CRM, calendar, inbox, email & AI.</p>

              {/* workspace accounts */}
              <div className="mt-5">
                <p className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-mut">pick a demo account</p>
                <div className="grid grid-cols-3 gap-2">
                  {s.users.map(u => (
                    <button key={u.id} onClick={() => fill(u.email)}
                      className={cx('press group rounded-xl border-[1.5px] border-ink p-2.5 text-left transition-all',
                        email === u.email ? 'bg-mint shadow-hard' : 'bg-card shadow-hard-sm hover:bg-paper')}>
                      <Avatar name={u.name} color={u.color} size={30} />
                      <p className="mt-1.5 truncate text-[11px] font-bold text-ink">{u.name.split(' ')[0]}</p>
                      <span className="mt-1 inline-block rounded border border-ink/60 px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-ink" style={{ background: roleChip[u.role] }}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-3.5">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-ink">Work email</span>
                  <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-ink">
                    Password
                    <button type="button" onClick={() => a.toast(`Demo workspaces share one password: "${DEMO_PASSWORD}"`, 'info')} className="font-mono text-[10px] font-bold text-pink underline decoration-2 underline-offset-2 transition hover:text-ink">
                      demo hint
                    </button>
                  </span>
                  <div className="relative">
                    <input className={cx(inputCls, 'pr-10')} type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPw(v => !v)} title={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mut transition hover:text-ink">
                      <Icon name={showPw ? 'x' : 'eye'} size={15} />
                    </button>
                  </div>
                </label>

                <div className="flex items-center justify-between">
                  <button type="button" onClick={() => setRemember(v => !v)} className="flex items-center gap-2 text-xs font-bold text-ink2 transition hover:text-ink">
                    <span className={cx('grid h-[18px] w-[18px] place-items-center rounded-[5px] border-[1.5px] border-ink transition-all', remember ? 'bg-lime text-ink' : 'bg-card')}>
                      {remember && <Icon name="check" size={11} sw={3.4} />}
                    </span>
                    Keep me signed in
                  </button>
                  <button type="button" onClick={() => a.toast('Password reset link sent — check your inbox (demo)', 'info')} className="text-xs font-bold text-ink underline decoration-pink decoration-2 underline-offset-2 transition hover:text-pink">
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <p key={shake} className="anim-shake flex items-center gap-2 rounded-lg border-2 border-danger bg-dangerbg px-3 py-2.5 text-xs font-bold text-danger">
                    <Icon name="alert" size={14} sw={2.2} /> {error}
                  </p>
                )}

                <button type="submit" disabled={busy}
                  className={cx('press-hard flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink bg-lime text-[14px] font-bold text-ink shadow-hard',
                    busy && 'pointer-events-none opacity-80')}>
                  {busy ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3.5" />
                        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                      </svg>
                      Verifying credentials…
                    </>
                  ) : (
                    <>LET'S GO <Icon name="chevr" size={15} sw={2.8} /></>
                  )}
                </button>
              </form>

              <p className="mt-5 rounded-xl border-[1.5px] border-ink bg-paper px-3.5 py-2.5 text-center text-[11px] font-medium leading-relaxed text-ink2">
                Sessions use a signed token (demo: localStorage). Viewer accounts are <span className="font-bold">read-only</span> — sign in as Priya to see role gating.
              </p>
            </div>

            <p className="mt-4 text-center font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">v3.0 · phases 1–3 shipped · onboarding &lt; 24h</p>
          </div>
        </div>

        <div className="relative hidden lg:block"><Marquee /></div>
      </div>
    </div>
  );
}
