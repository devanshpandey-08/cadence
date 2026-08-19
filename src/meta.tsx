import type { ReactNode } from 'react';
import type { Platform, PostStatus, Stage } from './types';

/* ---------- utils ---------- */
export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ');
export const uid = () => Math.random().toString(36).slice(2, 10);
export const pad = (n: number) => String(n).padStart(2, '0');
export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const TODAY = isoOf(new Date());
export const money = (n: number) => '$' + n.toLocaleString('en-US');
export const kfmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));
export const pct = (a: number, b: number) => (b === 0 ? '0%' : Math.round((a / b) * 100) + '%');

export function relTime(iso: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${-diff}d ago`;
  return `in ${diff}d`;
}

const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const fmtDate = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return `${MONTHS_S[d.getMonth()]} ${d.getDate()}`;
};
export const fmtLong = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return `${DAYS_L[d.getDay()]}, ${MONTHS_L[d.getMonth()]} ${d.getDate()}`;
};
export const monthTitle = (y: number, m: number) => `${MONTHS_L[m]} ${y}`;

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function monthMatrix(y: number, m: number) {
  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7;
  const start = new Date(y, m, 1 - startDow);
  const cells: { date: Date; iso: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({ date: d, iso: isoOf(d), inMonth: d.getMonth() === m });
  }
  return cells;
}

export function weekOf(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7;
  const mon = addDays(d, -dow);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = addDays(mon, i);
    return { date: dd, iso: isoOf(dd) };
  });
}

/* ---------- stroke icon set ---------- */
const P: Record<string, ReactNode> = {
  dash: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.6" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.6" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.6" /></>,
  inbox: <><path d="M22 12.5h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.61 2 12.5V18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5.5l-3.45-6.89A2 2 0 0 0 16.76 4.5H7.24a2 2 0 0 0-1.79 1.11z" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  checksq: <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="m8.2 12.3 2.8 2.8 5-6" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M15.5 3.13a4 4 0 0 1 0 7.75" /></>,
  kanban: <><path d="M5 4.5v15" strokeWidth="2.6" /><path d="M12 4.5v9.5" strokeWidth="2.6" /><path d="M19 4.5v5.5" strokeWidth="2.6" /></>,
  mail: <><rect x="2.5" y="5" width="19" height="14" rx="2.2" /><path d="m3 7.5 9 5.8 9-5.8" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2.2" /><path d="M3.5 10.2h17" /><path d="M8 2.8v4M16 2.8v4" /></>,
  sliders: <><path d="M4 8h9M17.5 8H20M4 16h3M11.5 16H20" /><circle cx="15" cy="8" r="2.3" /><circle cx="9" cy="16" r="2.3" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20.5 20.5-4.6-4.6" /></>,
  bell: <><path d="M18 8.4a6 6 0 0 0-12 0c0 6.6-2.7 8.6-2.7 8.6h17.4S18 15 18 8.4" /><path d="M13.7 20.5a2 2 0 0 1-3.4 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  chevd: <path d="m6 9 6 6 6-6" />,
  chevl: <path d="M15 6l-6 6 6 6" />,
  chevr: <path d="m9 6 6 6-6 6" />,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  bolt: <path d="M13 2 3.5 14H10l-1 8 9.5-12H12l1-8z" />,
  send: <><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />,
  reply: <><path d="m9 17-5-5 5-5" /><path d="M4 12h11a5 5 0 0 1 5 5v3" /></>,
  trash: <><path d="M3.5 6.5h17" /><path d="M8.5 6.5v-2a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v2" /><path d="m19 6.5-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2l-1-13" /><path d="M10 11v6M14 11v6" /></>,
  edit: <path d="M17 3.5a2.6 2.6 0 1 1 3.7 3.7L7.5 20.4 2.5 21.5l1.1-5L16.8 3.7z" />,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.9.6a2 2 0 0 1 1.6 2z" />,
  file: <><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z" /><path d="M14 2.5V8h5.5" /><path d="M15.5 13h-7M15.5 17h-7" /></>,
  video: <><rect x="2.5" y="6" width="13" height="12" rx="2.2" /><path d="m15.5 10.5 6-3.5v10l-6-3.5" /></>,
  layout: <><rect x="3.5" y="3.5" width="17" height="17" rx="2.2" /><path d="M3.5 9.5h17" /><path d="M9.5 20.5v-11" /></>,
  star: <path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5-5.9-3.2-5.9 3.2 1.2-6.5L2.5 9.4l6.6-.9z" />,
  trend: <><path d="M7 17 17 7" /><path d="M8.5 7H17v8.5" /></>,
  more: <><circle cx="5" cy="12" r="1.1" fill="currentColor" /><circle cx="12" cy="12" r="1.1" fill="currentColor" /><circle cx="19" cy="12" r="1.1" fill="currentColor" /></>,
  filter: <path d="M22 3.5H2l8 9.4v6.6l4 2v-8.6z" />,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8.5-5-5-5 5" /><path d="M12 3.5V15" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3.5" /></>,
  link: <><path d="M10 13.5a5 5 0 0 0 7.5.5l2.5-2.5a5 5 0 0 0-7-7L11.5 6" /><path d="M14 10.5a5 5 0 0 0-7.5-.5L4 12.5a5 5 0 0 0 7 7l1.5-1.5" /></>,
  alert: <><path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4.5" /><path d="M12 17.5h.01" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  external: <><path d="M18 13.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5.5" /><path d="M14.5 3H21v6.5" /><path d="M10 14 21 3" /></>,
  tag: <><path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z" /><circle cx="7.5" cy="7.5" r="0.6" fill="currentColor" /></>,
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  refresh: <><path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" /><path d="M3 21v-5h5" /></>,
  copy: <><rect x="9" y="9" width="12.5" height="12.5" rx="2" /><path d="M5.5 15H4.8A2.3 2.3 0 0 1 2.5 12.7V4.8A2.3 2.3 0 0 1 4.8 2.5h7.9A2.3 2.3 0 0 1 15 4.8v.7" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.5 2.7 3.9 6 3.9 9s-1.4 6.3-3.9 9c-2.5-2.7-3.9-6-3.9-9S9.5 5.7 12 3z" /></>,
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  image: <><rect x="3.5" y="3.5" width="17" height="17" rx="2.2" /><circle cx="9" cy="9" r="1.8" /><path d="m20.5 15.5-4.5-4.5-9 9" /></>,
  play: <path d="M7 4.5 19 12 7 19.5z" />,
  shield: <><path d="M12 22s8-3.6 8-9.8V5.2L12 2 4 5.2v7C4 18.4 12 22 12 22z" /><path d="m8.8 11.8 2.3 2.3 4.3-4.8" /></>,
  gauge: <><path d="M4 14.5a8 8 0 1 1 16 0" /><path d="M12 14.5 15.5 9" /><path d="M3.5 18.5h17" /></>,
  terminal: <><rect x="2.5" y="4" width="19" height="16" rx="2.2" /><path d="m6.5 9 3 3-3 3" /><path d="M12 15.5h5.5" /></>,
};

export function Icon({ name, size = 17, className, sw = 1.8 }: { name: keyof typeof P | string; size?: number; className?: string; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {P[name]}
    </svg>
  );
}

/* ---------- platform meta + brand glyphs ---------- */
export const PLATFORMS: Record<Platform, { name: string; color: string; tint: string; limit: number }> = {
  linkedin: { name: 'LinkedIn', color: '#0a66c2', tint: '#e7f0fa', limit: 3000 },
  instagram: { name: 'Instagram', color: '#d63384', tint: '#fbe9f2', limit: 2200 },
  facebook: { name: 'Facebook', color: '#1877f2', tint: '#e7f0fe', limit: 5000 },
  x: { name: 'X (Twitter)', color: '#14171a', tint: '#ecedef', limit: 280 },
  tiktok: { name: 'TikTok', color: '#0f9a96', tint: '#e0f3f2', limit: 2200 },
  youtube: { name: 'YouTube', color: '#e62129', tint: '#fce7e8', limit: 5000 },
  pinterest: { name: 'Pinterest', color: '#bd081c', tint: '#fae5e7', limit: 500 },
  gmb: { name: 'Google Business', color: '#0f9d58', tint: '#e2f3ea', limit: 1500 },
};
export const PLATFORM_IDS = Object.keys(PLATFORMS) as Platform[];

function BrandGlyph({ p }: { p: Platform }) {
  switch (p) {
    case 'linkedin':
      return <><circle cx="6.9" cy="7.2" r="1.7" fill="#fff" /><rect x="5.4" y="10.3" width="3" height="8.3" rx="0.6" fill="#fff" /><path d="M11.2 10.3h2.9v1.3c.6-1 1.7-1.5 3-1.5 2.3 0 3.9 1.5 3.9 4.4v4.1h-3v-3.7c0-1.5-.6-2.4-1.8-2.4s-2 .9-2 2.5v3.6h-3z" fill="#fff" /></>;
    case 'instagram':
      return <><rect x="3.6" y="3.6" width="16.8" height="16.8" rx="5" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="12" cy="12" r="4.1" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="17.2" cy="6.8" r="1.3" fill="#fff" /></>;
    case 'facebook':
      return <path d="M13.6 21v-7.1h2.4l.4-2.9h-2.8V9.1c0-.8.3-1.4 1.5-1.4h1.4V5.1c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.1H8v2.9h2.4V21z" fill="#fff" />;
    case 'x':
      return <path d="M17.8 3h3l-6.6 7.6L22 21h-6.1l-4.8-6.3L5.6 21h-3l7.1-8.1L2 3h6.3l4.3 5.7zm-1.1 16.2h1.7L7.4 4.7H5.6z" fill="#fff" />;
    case 'tiktok':
      return <path d="M16.6 3c.4 2.1 1.8 3.6 4 3.9v3c-1.6 0-3-.5-4.1-1.3v6.6c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6c.3 0 .7 0 1 .1v3.1c-.3-.2-.7-.2-1-.2-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3V3z" fill="#fff" />;
    case 'youtube':
      return <><rect x="2.5" y="5.5" width="19" height="13" rx="3.5" fill="#fff" opacity="0.16" /><rect x="2.5" y="5.5" width="19" height="13" rx="3.5" fill="none" stroke="#fff" strokeWidth="1.6" /><path d="M10 8.8 15.2 12 10 15.2z" fill="#fff" /></>;
    case 'pinterest':
      return <path d="M12 3.2a8.8 8.8 0 0 0-3.2 17 8.6 8.6 0 0 1 .1-2.8l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.4 1.8-2.4.9 0 1.3.6 1.3 1.4 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.4-1.7-4.1-4.2-4.1-2.9 0-4.6 2.1-4.6 4.4 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.1c0 .2-.2.2-.4.1-1.2-.6-2-2.3-2-3.7 0-3 2.2-5.8 6.3-5.8 3.3 0 5.9 2.4 5.9 5.5 0 3.3-2.1 6-5 6-1 0-1.9-.5-2.2-1.1l-.6 2.3c-.2.8-.8 1.8-1.2 2.4a8.8 8.8 0 1 0 3.7-16.1z" fill="#fff" />;
    case 'gmb':
      return <><circle cx="12" cy="10" r="6.5" fill="none" stroke="#fff" strokeWidth="2" /><circle cx="12" cy="10" r="2.2" fill="#fff" /><path d="M12 16.5 9 21h6z" fill="#fff" /></>;
  }
}

export function PlatformIcon({ p, size = 16, className }: { p: Platform; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="6.5" fill={PLATFORMS[p].color} />
      <BrandGlyph p={p} />
    </svg>
  );
}

/* ---------- pipeline stages ---------- */
export const STAGES: { id: Stage; label: string; color: string; tint: string }[] = [
  { id: 'lead', label: 'Lead', color: '#75756b', tint: '#eeeee4' },
  { id: 'qualified', label: 'Qualified', color: '#3d6bff', tint: '#e3eaff' },
  { id: 'proposal', label: 'Proposal', color: '#d99a06', tint: '#fff3cc' },
  { id: 'negotiation', label: 'Negotiation', color: '#e86a17', tint: '#ffe9d4' },
  { id: 'won', label: 'Closed Won', color: '#2e9e4f', tint: '#e0f6e4' },
  { id: 'lost', label: 'Closed Lost', color: '#e5484d', tint: '#ffe0df' },
];
export const stageMeta = (id: Stage) => STAGES.find(s => s.id === id) ?? STAGES[0];

/* ---------- post statuses ---------- */
export const STATUSES: Record<PostStatus, { label: string; color: string; tint: string }> = {
  draft: { label: 'Draft', color: '#75756b', tint: '#eeeee4' },
  pending: { label: 'Pending approval', color: '#d99a06', tint: '#fff3cc' },
  approved: { label: 'Approved', color: '#29c6a7', tint: '#ddf6ef' },
  scheduled: { label: 'Scheduled', color: '#3d6bff', tint: '#e3eaff' },
  published: { label: 'Published', color: '#2e9e4f', tint: '#e0f6e4' },
  failed: { label: 'Failed', color: '#e5484d', tint: '#ffe0df' },
};
export const STATUS_ICON: Record<PostStatus, string> = {
  draft: 'edit', pending: 'clock', approved: 'check', scheduled: 'calendar', published: 'check', failed: 'alert',
};

/* ---------- misc ---------- */
export const AV_COLORS = ['#14140f', '#3d6bff', '#e86a17', '#ff5ca8', '#2e9e4f', '#29c6a7', '#e5484d', '#8a63d2'];
export const hashColor = (s: string) => AV_COLORS[(s.charCodeAt(0) + s.length) % AV_COLORS.length];
export const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
