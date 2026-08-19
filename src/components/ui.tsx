import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { cx, hashColor, initials, Icon } from '../meta';
import type { Deal, ToastMsg } from '../types';
import { STAGES } from '../meta';
import { useApp } from '../store';

/* ---------- primitives ---------- */
export const inputCls =
  'w-full rounded-lg border border-line2 bg-card px-3 py-2 text-[13px] text-ink shadow-[inset_0_1px_2px_rgb(23_31_25/0.04)] outline-none transition-all placeholder:text-faint hover:border-faint focus:border-moss focus:ring-[3px] focus:ring-moss/15';

export function Btn({
  children, onClick, variant = 'primary', size = 'md', className, disabled, type = 'button', title,
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'dark' | 'outline' | 'ghost' | 'danger' | 'dangerGhost';
  size?: 'sm' | 'md'; className?: string; disabled?: boolean; type?: 'button' | 'submit'; title?: string;
}) {
  const v = {
    primary: 'bg-moss text-card shadow-btn hover:bg-pine',
    dark: 'bg-night text-card shadow-btn hover:bg-night2',
    outline: 'border border-line2 bg-card text-ink shadow-[0_1px_2px_rgb(23_31_25/0.05)] hover:border-moss/60 hover:text-pine hover:bg-mint/40',
    ghost: 'text-ink2 hover:bg-ink/6 hover:text-ink',
    danger: 'bg-danger text-card shadow-btn hover:brightness-95',
    dangerGhost: 'text-danger hover:bg-dangerbg',
  }[variant];
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      className={cx(
        'press inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-3.5 text-[13px]', v, className,
      )}>
      {children}
    </button>
  );
}

export function IconBtn({ name, onClick, title, className, size = 16 }: { name: string; onClick?: () => void; title?: string; className?: string; size?: number }) {
  return (
    <button onClick={onClick} title={title}
      className={cx('press grid h-7 w-7 shrink-0 place-items-center rounded-md text-mut transition-colors hover:bg-ink/6 hover:text-ink', className)}>
      <Icon name={name} size={size} />
    </button>
  );
}

export function Pill({ color, tint, children, dot, className }: { color: string; tint: string; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span style={{ color, background: tint, boxShadow: `inset 0 0 0 1px ${color}22` }}
      className={cx('tnum inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-[11px] font-semibold leading-none', className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

export function Avatar({ name, color, size = 28, className, status }: { name: string; color?: string; size?: number; className?: string; status?: 'online' | 'busy' }) {
  return (
    <div className={cx('relative shrink-0 select-none', className)}>
      <div style={{ width: size, height: size, background: color || hashColor(name), fontSize: Math.max(9, size * 0.34) }}
        className="flex items-center justify-center rounded-full font-bold tracking-wide text-card shadow-[inset_0_-2px_4px_rgb(0_0_0/0.18)]">
        {initials(name)}
      </div>
      {status && (
        <span className={cx('absolute -bottom-px -right-px rounded-full ring-2 ring-card', status === 'online' ? 'bg-moss' : 'bg-amber')}
          style={{ width: Math.max(8, size * 0.3), height: Math.max(8, size * 0.3) }} />
      )}
    </div>
  );
}

export function Tag({ children, onX }: { children: ReactNode; onX?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-1.5 py-[2px] font-mono text-[10.5px] font-medium text-ink2">
      {children}
      {onX && (
        <button onClick={onX} className="text-faint transition hover:text-danger"><Icon name="x" size={10} sw={2.4} /></button>
      )}
    </span>
  );
}

export function Field({ label, children, hint, req }: { label: string; children: ReactNode; hint?: string; req?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-xs font-semibold text-ink2">
        <span>{label}{req && <span className="text-danger"> *</span>}</span>
        {hint && <span className="font-mono text-[10px] font-normal text-faint">{hint}</span>}
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
    <div className="relative inline-flex items-center gap-0.5 rounded-lg border border-line bg-paper/90 p-0.5 shadow-[inset_0_1px_2px_rgb(23_31_25/0.05)]">
      {ind && (
        <span aria-hidden className="absolute top-0.5 bottom-0.5 rounded-[7px] bg-card shadow-[0_1px_3px_rgb(23_31_25/0.14),inset_0_1px_0_rgb(255_255_255/0.9)] ring-1 ring-line/80 transition-all duration-300"
          style={{ left: ind.left, width: ind.width, transitionTimingFunction: 'var(--spring)' }} />
      )}
      {options.map(o => (
        <button key={o.id} ref={el => { refs.current[o.id] = el; }} onClick={() => onChange(o.id)}
          className={cx(
            'relative z-10 rounded-[7px] font-semibold transition-colors duration-200',
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
      className={cx('relative h-[22px] w-10 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-40',
        on ? 'bg-moss shadow-[inset_0_1px_2px_rgb(0_0_0/0.2)]' : 'bg-line2 shadow-[inset_0_1px_2px_rgb(23_31_25/0.12)]')}>
      <span className={cx('absolute top-[3px] h-4 w-4 rounded-full bg-card shadow-[0_1px_3px_rgb(23_31_25/0.3)] transition-all duration-300',
        on ? 'left-[21px]' : 'left-[3px]')}
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
      <div className="fixed inset-0 bg-night/55 backdrop-blur-[3px] anim-fade" onClick={onClose} />
      <div className={cx('relative w-full anim-pop overflow-hidden rounded-xl border border-line bg-card shadow-pop', w)}
        role="dialog" aria-modal>
        <div className="flex items-start justify-between gap-4 border-b border-line bg-paper/50 px-5 py-4">
          <div>
            <h3 className="font-display text-[17px] font-bold tracking-tight text-ink">{title}</h3>
            {sub && <p className="mt-0.5 text-xs leading-relaxed text-mut">{sub}</p>}
          </div>
          <IconBtn name="x" onClick={onClose} title="Close (Esc)" />
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-paper/40 px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, children, w = 'max-w-xl' }: { open: boolean; onClose: () => void; children: ReactNode; w?: string }) {
  useOverlayChrome(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-night/45 backdrop-blur-[2px] anim-fade" onClick={onClose} />
      <div className={cx('absolute inset-y-0 right-0 w-full anim-slide overflow-y-auto border-l border-line bg-card shadow-pop', w)}>
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
        <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
          <span className="inline-block h-[7px] w-[7px] rounded-[2px] bg-moss" />{eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-[26px] font-bold leading-none tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1.5 max-w-[640px] text-[12.5px] leading-relaxed text-mut">{sub}</p>}
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

export function Spark({ data, color = '#0e7a52', h = 36, w = 130, className }: { data: number[]; color?: string; h?: number; w?: number; className?: string }) {
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
          <stop offset="0" stopColor={color} stopOpacity="0.24" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${gid})`} />
      <path className="draw" d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} className="live-dot" opacity="0.5" />
    </svg>
  );
}

export function StageBar({ deals, className }: { deals: Deal[]; className?: string }) {
  const open = STAGES.filter(s => !['won', 'lost'].includes(s.id));
  const vals = open.map(s => deals.filter(d => d.stage === s.id).reduce((a, d) => a + d.value, 0));
  const total = vals.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-line/70 shadow-[inset_0_1px_2px_rgb(23_31_25/0.08)]">
        {vals.map((v, i) => (
          <div key={open[i].id} className="anim-grow h-full transition-all duration-500"
            style={{ width: `${(v / total) * 100}%`, background: open[i].color, animationDelay: `${i * 70}ms` }}
            title={`${open[i].label} · $${(vals[i] / 1000).toFixed(1)}K`} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {open.map((s, i) => (
          <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5 text-mut">
              <span className="h-2 w-2 rounded-[3px]" style={{ background: s.color }} />{s.label}
            </span>
            <span className="tnum font-mono font-semibold text-ink">${(vals[i] / 1000).toFixed(1)}K</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, sub, action }: { icon: string; title: string; sub: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line2 bg-paper/60 px-6 py-12 text-center">
      <div className="relative mb-2 grid h-12 w-12 place-items-center rounded-xl border border-line bg-card text-mut shadow-[0_2px_8px_rgb(23_31_25/0.06)]">
        <Icon name={icon} size={21} />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-paper bg-moss" />
      </div>
      <p className="font-display text-[15px] font-bold tracking-tight text-ink">{title}</p>
      <p className="max-w-[320px] text-xs leading-relaxed text-mut">{sub}</p>
      {action && <div className="mt-3.5">{action}</div>}
    </div>
  );
}

export function Card({ children, className, style, hover }: { children: ReactNode; className?: string; style?: CSSProperties; hover?: boolean }) {
  return (
    <div style={style}
      className={cx('rounded-xl border border-line bg-card shadow-[0_1px_2px_rgb(23_31_25/0.04),inset_0_1px_0_rgb(255_255_255/0.6)]',
        hover && 'lift hover:border-line2', className)}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight text-ink">
        <span className="inline-block h-[14px] w-[3px] rounded-full bg-moss/70" />
        {children}
      </h2>
      {right}
    </div>
  );
}

/* ---------- toast host ---------- */
export function ToastHost() {
  const { s, a } = useApp();
  const icons: Record<ToastMsg['kind'], string> = { success: 'check', info: 'bolt', warning: 'alert' };
  const colors: Record<ToastMsg['kind'], string> = { success: '#22b57c', info: '#6fa8d6', warning: '#e0a63f' };
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[350px] flex-col gap-2">
      {s.toasts.map(t => (
        <div key={t.id} className="pointer-events-auto anim-toast relative overflow-hidden rounded-xl border border-nightline bg-night px-3.5 py-3 shadow-pop">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: colors[t.kind], color: '#0f1611' }}>
              <Icon name={icons[t.kind]} size={11} sw={2.8} />
            </span>
            <p className="flex-1 text-[12.5px] font-medium leading-snug text-card/95">{t.text}</p>
            <button onClick={() => a.ui({ toasts: s.toasts.filter(x => x.id !== t.id) })} className="text-card/40 transition hover:text-card">
              <Icon name="x" size={13} />
            </button>
          </div>
          <span className="toast-bar absolute bottom-0 left-0 h-[2px] rounded-r-full" style={{ background: colors[t.kind], opacity: 0.85 }} />
        </div>
      ))}
    </div>
  );
}
