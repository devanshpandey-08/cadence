/**
 * Scale-ceiling model — measured, not asserted.
 *
 * - bytesPerRecord(): serializes realistic sample rows and averages their size.
 * - probeStorage(): writes to browser storage until QuotaExceededError to find
 *   the real usable ceiling of the demo shell.
 * - project(): maps a dataset size onto the three storage tiers:
 *     demo   → this browser shell (measured quota, ~80% usable)
 *     phase1 → one PostgreSQL cluster, partitioned (~500GB healthy ceiling)
 *     sharded→ Citus / per-tenant shards (effectively unbounded)
 */
import { isoOf } from '../meta';

const sampleContact = (i: number) => ({
  id: `c-${i}`, name: `Contact ${i}`, email: `contact${i}@example.com`, phone: '+1 (503) 555-0100',
  company: `Company ${i % 500}`, title: 'Head of Growth', source: 'Form', tags: ['wholesale', 'lead'],
  owner: 'Maya Chen', createdAt: isoOf(new Date()), lastActivity: isoOf(new Date()),
  timeline: [{ id: `t-${i}`, type: 'note', text: 'Imported from HubSpot — properties auto-mapped', at: isoOf(new Date()) }],
});
const sampleDeal = (i: number) => ({
  id: `d-${i}`, name: `Enterprise renewal ${i}`, contactId: `c-${i}`, value: 48000 + i, stage: 'negotiation',
  owner: 'Maya Chen', close: isoOf(new Date()), created: isoOf(new Date()),
  notes: [{ id: `n-${i}`, text: 'Legal reviewing the MSAA. Pushing for 60-day terms.', at: isoOf(new Date()), by: 'Maya Chen' }],
});
const samplePost = (i: number) => ({
  id: `p-${i}`, text: `Spring blend spotlight — roasted in small batches and shipped within 24h. ${i}`,
  platforms: ['linkedin', 'instagram'], date: isoOf(new Date()), time: '12:00', status: 'scheduled',
  author: 'Maya Chen', media: 'image', likes: 40 + i, comments: 7, shares: 3,
});
const sampleEvent = (i: number) => ({
  id: `e-${i}`, type: 'social', text: `Replied to commenter ${i} on instagram — spring blend post`, at: isoOf(new Date()),
});

function avgBytes(factory: (i: number) => unknown): number {
  let total = 0;
  const N = 24;
  for (let i = 0; i < N; i++) total += JSON.stringify(factory(i)).length;
  return Math.round(total / N);
}

export const BYTES = {
  contact: avgBytes(sampleContact),
  deal: avgBytes(sampleDeal),
  post: avgBytes(samplePost),
  event: avgBytes(sampleEvent),
};

export interface DatasetDef { id: 'contact' | 'deal' | 'post' | 'event'; label: string; icon: string; note: string; }
export const DATASETS: DatasetDef[] = [
  { id: 'contact', label: 'Contacts', icon: 'users', note: 'Growth plan cap: 25K — beyond that, shard by workspace' },
  { id: 'deal', label: 'Deals', icon: 'kanban', note: 'Typically 10× fewer than contacts' },
  { id: 'post', label: 'Scheduled posts', icon: 'calendar', note: 'Partitioned by month in production' },
  { id: 'event', label: 'Timeline events', icon: 'clock', note: 'The real scale axis — every touchpoint, forever' },
];

/* ---------- storage probe (demo ceiling) ---------- */
export interface QuotaProbe { usableMB: number; nowMB: number; }

export async function probeStorage(): Promise<QuotaProbe> {
  let nowBytes = 0;
  try {
    for (const k of Object.keys(localStorage)) nowBytes += (localStorage.getItem(k) ?? '').length + k.length;
  } catch { /* unavailable */ }

  const KEY = 'cadence-quota-probe';
  const chunk = 'x'.repeat(256 * 1024); // 256KB blocks
  let writtenKB = 0;
  try {
    for (let i = 0; i < 400; i++) { // probe up to 100MB
      localStorage.setItem(`${KEY}-${i}`, chunk);
      writtenKB += 256;
    }
  } catch { /* QuotaExceededError — that is the ceiling */ }
  try { for (let i = 0; i < 400; i++) localStorage.removeItem(`${KEY}-${i}`); } catch { /* noop */ }

  return { usableMB: writtenKB / 1024, nowMB: nowBytes / (1024 * 1024) };
}

/* ---------- projection tiers ---------- */
export type Tier = 'demo' | 'phase1' | 'sharded';
export const PHASE1_GB = 500; // healthy ceiling: one Postgres cluster, partitioned, with read replicas

export interface Projection {
  records: number;
  bytes: number;
  tier: Tier;
  demoCapMB: number;
  fitDemo: boolean;
  infra: string[];
  headline: string;
}

const INFRA: Record<Tier, string[]> = {
  demo: [
    'JSON snapshots in browser storage — the shell you are using now',
    'No indexes: every query is a full scan',
    'Hard cap: the measured quota (probe tab runs it live)',
  ],
  phase1: [
    'PostgreSQL 16 · one primary + two read replicas (~$50–100/mo)',
    'posts & timeline_events partitioned by month',
    'Hot indexes on (workspace_id, created_at) — dashboards hit replicas',
    'Redis + queue workers absorb publish bursts off the request path',
    'S3 holds media; the DB stores references only',
  ],
  sharded: [
    'Citus or per-tenant shards keyed by workspace_id',
    'Timeline events aged to columnar cold storage (S3 + Athena)',
    'Cross-shard reads via the router; writes stay single-shard',
    'Effective ceiling: billions of rows, linear cost per tenant',
  ],
};

export function project(records: number, bytesPer: number, quotaMB: number): Projection {
  const bytes = records * bytesPer;
  const demoCapMB = Math.max(quotaMB * 0.8, 1);
  const fitDemo = bytes <= demoCapMB * 1e6;
  const gb = bytes / 1e9;
  const tier: Tier = fitDemo ? 'demo' : gb <= PHASE1_GB ? 'phase1' : 'sharded';
  const headline =
    tier === 'demo' ? 'Runs right here, in this browser tab'
      : tier === 'phase1' ? 'Phase 1 stack — one PostgreSQL cluster'
        : 'Tenant-sharded cluster — effectively unbounded';
  return { records, bytes, tier, demoCapMB, fitDemo, infra: INFRA[tier], headline };
}

/* ---------- formatters ---------- */
export function fmtBytes(bytes: number): string {
  if (bytes < 1e6) return `${(bytes / 1e3).toFixed(0)} KB`;
  if (bytes < 1e9) return `${(bytes / 1e6).toFixed(1)} MB`;
  if (bytes < 1e12) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${(bytes / 1e12).toFixed(2)} TB`;
}
export function fmtRecords(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 2).replace(/\.00$/, '')}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}
/** Log-scale position (0–100%) across 1KB → 100TB for the capacity ruler. */
export function rulerPos(bytes: number): number {
  const min = Math.log10(1e3);
  const max = Math.log10(1e14);
  const p = (Math.log10(Math.max(bytes, 1e3)) - min) / (max - min);
  return Math.min(100, Math.max(0, p * 100));
}
