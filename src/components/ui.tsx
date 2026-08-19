import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cx, hashColor, initials, Icon } from '../meta';
import type { Deal, ToastMsg } from '../types';
import { STAGES } from '../meta';
import { useApp } from '../store';

/* ---------- primitives ---------- */
export const inputCls =
  'w-full rounded-lg border-[1.5px] border-ink bg-card px-3 py-2 text-[13px] font-medium text-ink outline-none transition-all placeholder:font-normal placeholder:text-faint hover:bg-paper/60 focus:shadow-hard-sm';

export function Btn({
  children, onClick, variant = 'primary', size = 'md', className, disabled, type = 'button', title,
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'dark' | 'outline' | 'ghost' | 'danger' | 'dangerGhost';
  size?: 'sm' | 'md'; className?: string; disabled?: boolean; type?: 'button' | 'submit'; title?: string;
}) {
  const v = {
    primary: 'border-ink bg-ink text-lime shadow-hard hover:bg-pine hover:text-lime',
    dark: 'border-ink bg-ink text-card shadow-hard hover:bg-pine',
    outline: 'border-ink bg-card text-ink shadow-hard-sm hover:bg-mint',
    ghost: 'text-ink2 hover:bg-ink/8 hover:text-ink',
    danger: 'border-ink bg-danger text-card shadow-hard hover:brightness-95',
    dangerGhost: 'text-danger hover:bg-dangerbg',
  }[variant];
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      className={cx(
        'press-hard inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border-[1.5px] font-bold disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9.5 px-4 text-[13px]', v, className,
      )}>
      {children}
    </button>
  );
}

export function IconBtn({ name, onClick, title, className, size = 16 }: { name: string; onClick?: () => void; title?: string; className?: string; size?: number }) {
  return (
    <button onClick={onClick} title={title}
      className={cx('press grid h-7 w-7 shrink-0 place-items-center rounded-md border border-transparent text-mut transition-colors hover:border-ink hover:bg-butter hover:text-ink', className)}>
      <Icon name={name} size={size} />
    </button>
  );
}

export function Pill({ color, tint, children, dot, className }: { color: string; tint: string; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span style={{ color, background: tint, boxShadow: `inset 0 0 0 1.5px ${color}55` }}
      className={cx('tnum inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-bold leading-none', className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

/** A loud, rotated tag — the Gen Z sticker. */
export function Sticker({ children, color = '#c8f169', rotate = -2, className }: { children: ReactNode; color?: string; rotate?: number; className?: string }) {
  return (
    <span style={{ background: color, transform: `rotate(${rotate}deg)` }}
      className={cx('sticker inline-flex items-center gap-1 whitespace-nowrap rounded-md border-[1.5px] border-ink px-2 py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink shadow-hard-sm', className)}>
      {children}
    </span>
  );
}

export function Avatar({ name, color, size = 28, className, status }: { name: string; color?: string; size?: number; className?: string; status?: 'online' | 'busy' }) {
  return (
    <div className={cx('relative shrink-0 select-none', className)}>
      <div style={{ width: size, height: size, background: color || hashColor(name), fontSize: Math.max(9, size * 0.34) }}
        className="flex items-center justify-center rounded-full font-bold tracking-wide text-card ring-[1.5px] ring-ink">
        {initials(name)}
      </div>
      {status && (
        <span className={cx('absolute -bottom-px -right-px rounded-full ring-2 ring-card', status === 'online' ? 'bg-lime' : 'bg-butter')}
          style={{ width: Math.max(8, size * 0.3), height: Math.max(8, size * 0.3) }} />
      )}
    </div>
  );
}

export function Tag({ children, onX }: { children: ReactNode; onX?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border-[1.5px] border-ink/80 bg-paper px-1.5 py-[2px] font-mono text-[10.5px] font-semibold text-ink2">
      {children}
      {onX && (
        <button onClick={onX} className="text-mut transition hover:text-danger"><Icon name="x" size={10} sw={2.8} /></button>
      )}
    </span>
  );
}

export function Field({ label, children, hint, req }: { label: string; children: ReactNode; hint?: string; req?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs font-bold text-ink">
        <span>{label}{req && <span className="text-danger"> *</span>}</span>
        {hint && <span className="font-mono text-[10px] font-medium text-mut">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* ---------- segmented control with sliding indicator ---------- */
export function Seg<T extends string>({ options, value, onChange, size = 'md' }: {
  options: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md';
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const el = refs.current[value];
    if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
  }, [value, options.length, size]);
  useEffect(() => {
    const onR = () => {
      const el = refs.current[value];
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
    };
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, [value]);
  return (
    <div className="relative inline-flex items-center gap-0.5 rounded-lg border-[1.5px] border-ink bg-paper p-0.5 shadow-hard-sm">
      {ind && (
        <span aria-hidden className="absolute top-0.5 bottom-0.5 rounded-[6px] border-[1.5px] border-ink bg-lime shadow-[1px_1px_0_0_#14140f] transition-all duration-300"
          style={{ left: ind.left, width: ind.width, transitionTimingFunction: 'var(--spring)' }} />
      )}
      {options.map(o => (
        <button key={o.id} ref={el => { refs.current[o.id] = el; }} onClick={() => onChange(o.id)}
          className={cx(
            'relative z-10 rounded-[6px] font-bold transition-colors duration-200',
            size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
            value === o.id ? 'text-ink' : 'text-mut hover:text-ink',
          )}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, disabled }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button disabled={disabled} onClick={() => onChange(!on)} role="switch" aria-checked={on}
      className={cx('relative h-[22px] w-10 shrink-0 rounded-full border-[1.5px] border-ink transition-colors duration-200 disabled:opacity-40',
        on ? 'bg-lime' : 'bg-line')}>
      <span className={cx('absolute top-[2.5px] h-4 w-4 rounded-full border-[1.5px] border-ink bg-card shadow-[1px_1px_0_0_#14140f] transition-all duration-300',
        on ? 'left-[20px]' : 'left-[2px]')}
        style={{ transitionTimingFunction: 'var(--spring)' }} />
    </button>
  );
}

/* ---------- overlays ---------- */
function useOverlayChrome(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev; };
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, sub, children, footer, w = 'max-w-lg' }: {
  open: boolean; onClose: () => void; title: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode; w?: string;
}) {
  useOverlayChrome(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-10">
      <div className="fixed inset-0 bg-ink/60 anim-fade" onClick={onClose} />
      <div className={cx('relative w-full anim-pop overflow-hidden rounded-xl border-2 border-ink bg-card shadow-pop', w)} role="dialog" aria-modal>
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink bg-butter/50 px-5 py-4">
          <div>
            <h3 className="font-display text-[17px] leading-tight text-ink">{title}</h3>
            {sub && <p className="mt-1 text-xs leading-relaxed text-ink2">{sub}</p>}
          </div>
          <IconBtn name="x" onClick={onClose} title="Close (Esc)" />
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t-2 border-ink bg-paper px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children, w = 'max-w-xl' }: { open: boolean; onClose: () => void; children: ReactNode; w?: string }) {
  useOverlayChrome(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/50 anim-fade" onClick={onClose} />
      <div className={cx('absolute inset-y-0 right-0 w-full anim-slide overflow-y-auto border-l-2 border-ink bg-card shadow-pop', w)}>
        {children}
      </div>
    </div>
  );
}

/* ---------- layout helpers ---------- */
export function PageHead({ eyebrow, title, sub, children }: { eyebrow: string; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="reveal in flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <Sticker rotate={-1.5}>{eyebrow}</Sticker>
        <h1 className="mt-2.5 font-display text-[26px] leading-[1.05] text-ink">{title}</h1>
        {sub && <p className="mt-2 max-w-[640px] text-[12.5px] leading-relaxed text-ink2">{sub}</p>}
      </div>
      {children && <div className="flex shrink-0 items-center gap-2">{children}</div>}
    </div>
  );
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setIn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setIn(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setIn(true); io.disconnect(); } }, { threshold: 0.06 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={cx('reveal', inView && 'in', className)}>
      {children}
    </div>
  );
}

/* ---------- data viz ---------- */
export function CountUp({ value, prefix = '', suffix = '', className }: { value: number; prefix?: string; suffix?: string; className?: string }) {
  const [v, setV] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 650);
      const e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(from + (value - from) * e));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={cx('tnum', className)}>{prefix}{v.toLocaleString()}{suffix}</span>;
}

export function Spark({ data, color = '#14140f', h = 36, w = 130, className }: { data: number[]; color?: string; h?: number; w?: number; className?: string }) {
  const gid = useId().replace(/[:]/g, '');
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    h - 3 - ((v - min) / (max - min || 1)) * (h - 7),
  ]);
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg className={cx('spark overflow-visible', className)} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${gid})`} />
      <path className="draw" d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x={last[0] - 3} y={last[1] - 3} width="6" height="6" fill={color} stroke="#fff" strokeWidth="1.5" transform={`rotate(45 ${last[0]} ${last[1]})`} />
    </svg>
  );
}

export function StageBar({ deals, className }: { deals: Deal[]; className?: string }) {
  const open = STAGES.filter(s => !['won', 'lost'].includes(s.id));
  const vals = open.map(s => deals.filter(d => d.stage === s.id).reduce((a, d) => a + d.value, 0));
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className={className}>
      <div className="flex h-3.5 w-full overflow-hidden rounded-md border-[1.5px] border-ink bg-line">
        {vals.map((v, i) => (
          <div key={open[i].id} className="anim-grow h-full transition-all duration-500"
            style={{ width: `${(v / total) * 100}%`, background: open[i].color, animationDelay: `${i * 70}ms` }}
            title={`${open[i].label} · $${(vals[i] / 1000).toFixed(1)}K`} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {open.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-ink2">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-ink" style={{ background: s.color }} />{s.label}
            </span>
            <span className="tnum font-mono font-bold text-ink">${(vals[i] / 1000).toFixed(1)}K</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, sub, action }: { icon: string; title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink/50 bg-paper/70 px-6 py-12 text-center">
      <div className="relative mb-2 grid h-12 w-12 rotate-[-4deg] place-items-center rounded-xl border-2 border-ink bg-butter text-ink shadow-hard">
        <Icon name={icon} size={21} sw={2} />
      </div>
      <p className="font-display text-[15px] text-ink">{title}</p>
      <p className="max-w-[320px] text-xs leading-relaxed text-ink2">{sub}</p>
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}

export function Card({ children, className, style, hover }: { children: ReactNode; className?: string; style?: CSSProperties; hover?: boolean }) {
  return (
    <div style={style}
      className={cx('rounded-xl border-[1.5px] border-ink bg-card shadow-hard-sm', hover && 'lift', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-1.5 font-display text-[14px] tracking-tight text-ink">
        <span className="text-pink">✦</span>{children}
      </h2>
      {right}
    </div>
  );
}

/* ---------- toast host ---------- */
export function ToastHost() {
  const { s, a } = useApp();
  const icons: Record<ToastMsg['kind'], string> = { success: 'check', info: 'bolt', warning: 'alert' };
  const colors: Record<ToastMsg['kind'], string> = { success: '#c8f169', info: '#9db8ff', warning: '#ffd954' };
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[350px] flex-col gap-2">
      {s.toasts.map(t => (
        <div key={t.id} className="pointer-events-auto anim-toast relative overflow-hidden rounded-xl border-2 border-ink bg-night px-3.5 py-3 shadow-[4px_4px_0_0_#c8f169]">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-[1.5px] border-ink" style={{ background: colors[t.kind], color: '#0f0f0b' }}>
              <Icon name={icons[t.kind]} size={11} sw={2.8} />
            </span>
            <p className="flex-1 text-[12.5px] font-semibold leading-snug text-card/95">{t.text}</p>
            <button onClick={() => a.ui({ toasts: s.toasts.filter(x => x.id !== t.id) })} className="text-card/40 transition hover:text-card">
              <Icon name="x" size={13} />
            </button>
          </div>
          <span className="toast-bar absolute bottom-0 left-0 h-[2.5px] rounded-r-full" style={{ background: colors[t.kind], opacity: 0.9 }} />
        </div>
      ))}
    </div>
  );
}
