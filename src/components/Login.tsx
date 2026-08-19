import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { authApi, DEMO_PASSWORD, ROLE_LABEL, ROLE_SCOPE } from '../services/backend';
import { cx, Icon, kfmt, PLATFORMS, PLATFORM_IDS, PlatformIcon } from '../meta';
import { Avatar, inputCls } from './ui';

function Cadence({ tone, idle }: { tone?: string; idle?: boolean }) {
  return (
    <span className={cx('cadence', idle && 'idle')} style={{ color: tone ?? '#e0913c' }} aria-hidden>
      <i /><i /><i /><i />
    </span>
  );
}

/* Living proof of the product — one database, three pulses. */
function Ledger({ delay = 0 }: { delay?: number }) {
  const [followers, setFollowers] = useState(2147);
  const [eng, setEng] = useState(312);
  useEffect(() => {
    const t = window.setInterval(() => {
      setFollowers(f => f + Math.floor(Math.random() * 3));
      setEng(e => e + Math.floor(Math.random() * 2));
    }, 2400);
    return () => window.clearInterval(t);
  }, []);
  const pipe = [
    { v: 34, c: '#7fa3c9' },
    { v: 26, c: '#d9b45c' },
    { v: 18, c: '#e0713a' },
    { v: 22, c: '#9dbb7e' },
  ];
  const queue = [
    { p: 'linkedin' as const, t: '09:00', label: 'Wholesale spotlight' },
    { p: 'instagram' as const, t: '12:30', label: 'Spring blend reel' },
    { p: 'x' as const, t: '15:00', label: 'Roast-day thread' },
  ];
  return (
    <div className="w-full max-w-[400px] space-y-2.5" style={{ transitionDelay: `${delay}ms` }}>
      <div className="anim-rise rounded-lg border border-nightline bg-night2/80 px-4 py-3" style={{ animationDelay: '120ms' }}>
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

      <div className="anim-rise flex items-center gap-3 rounded-lg border border-nightline bg-night2/80 px-3.5 py-2.5" style={{ animationDelay: '260ms' }}>
        <PlatformIcon p="instagram" size={22} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-xs font-semibold text-ink">@latte.lena commented</p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-nightline">
            <div className="type-bar h-full rounded-full bg-lime" />
          </div>
        </div>
        <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-blue">drafting</span>
      </div>

      {queue.map((m, i) => (
        <div key={m.p} className="anim-rise flex items-center gap-3 rounded-lg border border-nightline bg-night2/80 px-3.5 py-2.5" style={{ animationDelay: `${400 + i * 110}ms` }}>
          <PlatformIcon p={m.p} size={22} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-semibold text-ink">{m.label}</p>
            <p className="font-mono text-[9.5px] text-nighttx">{PLATFORMS[m.p].name} · {m.t}</p>
          </div>
          <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-lime">
            <span className="live-dot h-1 w-1 rounded-full bg-lime" /> queued
          </span>
        </div>
      ))}

      <div className="anim-rise flex items-center justify-between rounded-lg border border-nightline bg-night2/80 px-4 py-3" style={{ animationDelay: '760ms' }}>
        {[
          { label: 'followers', v: kfmt(followers) },
          { label: 'engagement', v: String(eng) },
          { label: 'auto-task', v: 'sent' },
        ].map(c => (
          <div key={c.label} className="text-center">
            <p className="tnum font-display text-[16px] font-semibold text-ink">{c.v}</p>
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
    <div className="relative flex min-h-screen items-stretch overflow-hidden">
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-60" />
      <div className="glow-top pointer-events-none absolute inset-x-0 top-0 h-[420px]" />

      {/* left — the product, already breathing */}
      <div className="relative hidden w-[54%] flex-col justify-between border-r border-nightline bg-night/70 p-10 lg:flex">
        <div className="flex items-center gap-3">
          <span className="relative grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-ember to-copper shadow-hard">
            <svg width="20" height="20" viewBox="0 0 32 32">
              <rect x="7" y="16" width="4" height="9" rx="1.5" fill="#191410" opacity="0.85" />
              <rect x="14" y="11" width="4" height="14" rx="1.5" fill="#191410" />
              <rect x="21" y="6" width="4" height="19" rx="1.5" fill="#191410" opacity="0.85" />
            </svg>
          </span>
          <div className="leading-none">
            <p className="font-display text-[19px] font-bold tracking-tight text-ink">Cadence</p>
            <p className="mt-1 font-mono text-[8.5px] font-medium uppercase tracking-[0.24em] text-nighttx">Social CRM</p>
          </div>
          <span className="ml-auto flex items-center gap-2 rounded-full border border-nightline bg-night2/80 px-3 py-1.5">
            <Cadence />
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-nighttx">workspace live</span>
          </span>
        </div>

        <div className="max-w-[460px]">
          <p className="anim-rise font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ember">Ember & Oak Roastery</p>
          <h1 className="anim-rise mt-3 font-display text-[44px] font-bold leading-[1.02] tracking-tight text-ink" style={{ animationDelay: '80ms' }}>
            Every post, deal and<br />
            <em className="text-ember">reply</em> — one heartbeat.
          </h1>
          <p className="anim-rise mt-4 max-w-[400px] text-[13.5px] leading-relaxed text-mut" style={{ animationDelay: '160ms' }}>
            CRM, social scheduling, email and landing pages in one database.
            Buffer schedules posts. HubSpot tracks customers. Cadence does both — for $79 flat.
          </p>
          <div className="anim-rise mt-8" style={{ animationDelay: '220ms' }}>
            <Ledger />
          </div>
        </div>

        <div className="anim-rise flex items-center gap-4" style={{ animationDelay: '900ms' }}>
          <div className="flex -space-x-1.5">
            {PLATFORM_IDS.map(p => <PlatformIcon key={p} p={p} size={22} className="rounded-md ring-2 ring-night" />)}
          </div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-nighttx">8 platforms · one login</p>
        </div>
      </div>

      {/* right — the session card */}
      <div className="relative flex flex-1 items-center justify-center p-6">
        <div key={shake} className={cx('w-full max-w-[420px]', shake > 0 && 'anim-shake')}>
          <div className="anim-pop rounded-xl border border-line bg-card p-6 shadow-pop">
            <div className="flex items-center gap-3 rounded-lg border border-line bg-paper/60 px-3 py-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-mint font-mono text-[10px] font-bold text-pine">E&O</span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-bold text-ink">Ember & Oak Roastery</p>
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-mut">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" /> all channels synced
                </p>
              </div>
              <Cadence />
            </div>

            <h2 className="mt-5 font-display text-[22px] font-bold tracking-tight text-ink">Sign in to the workspace</h2>
            <p className="mt-1 text-xs leading-relaxed text-mut">Pick a seat — each role sees the product differently.</p>

            <div className="mt-4 space-y-1.5">
              {s.users.map(u => {
                const on = email === u.email;
                return (
                  <button key={u.id} onClick={() => fill(u.email)}
                    className={cx('flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all',
                      on ? 'border-moss bg-mint/60 shadow-hard-sm' : 'border-line bg-card hover:border-line2 hover:bg-paper/50')}>
                    <Avatar name={u.name} color={u.color} size={28} />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className="truncate text-[12.5px] font-semibold text-ink">{u.name}</p>
                      <p className="truncate font-mono text-[9.5px] text-mut">{ROLE_SCOPE[u.role]}</p>
                    </div>
                    <span className={cx('rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider',
                      u.role === 'admin' ? 'bg-emberbg text-ember' : u.role === 'editor' ? 'bg-steelbg text-steel' : 'bg-amberbg text-amber')}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={submit} className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-mut">Email</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="you@company.com" />
              </label>
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-mut">
                  Password
                  <button type="button" onClick={() => { setPassword(DEMO_PASSWORD); setError(''); }} className="normal-case tracking-normal text-ember transition hover:text-pine">
                    use demo password
                  </button>
                </span>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className={cx(inputCls, 'pr-10')} placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mut transition hover:text-ink" title={showPw ? 'Hide' : 'Show'}>
                    <Icon name="eye" size={15} />
                  </button>
                </div>
              </label>

              {error && (
                <p className="flex items-start gap-2 rounded-lg border border-danger/40 bg-dangerbg px-3 py-2 text-xs font-medium leading-snug text-danger">
                  <Icon name="alert" size={13} className="mt-0.5 shrink-0" /> {error}
                </p>
              )}

              <button type="submit" disabled={busy}
                className="press flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-moss text-[13.5px] font-bold text-night shadow-btn transition-colors hover:bg-pine hover:text-ink disabled:opacity-60">
                {busy ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-night/30 border-t-night" /> Checking the vault…</>
                ) : (
                  <><Icon name="send" size={14} sw={2.2} /> Open the workspace</>
                )}
              </button>

              <label className="flex cursor-pointer items-center justify-center gap-2 text-[11px] text-mut">
                <button type="button" onClick={() => setRemember(v => !v)}
                  className={cx('grid h-4 w-4 place-items-center rounded border transition-all', remember ? 'border-moss bg-moss text-night' : 'border-line2 bg-card')}>
                  {remember && <Icon name="check" size={10} sw={3.2} />}
                </button>
                Keep me signed in on this device
              </label>
            </form>
          </div>

          <p className="mt-4 text-center font-mono text-[10px] leading-relaxed text-faint">
            Demo workspace · password <span className="rounded bg-night2 px-1.5 py-0.5 font-bold text-lime">{DEMO_PASSWORD}</span> for every seat
            <br />Flat-rate plans from $0 — no per-contact tax, cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
