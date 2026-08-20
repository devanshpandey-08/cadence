/**
 * Meta Conversions API (CAPI) — event payload construction + Event Match
 * Quality (EMQ) scoring.
 *
 * Meta grades every CAPI event 0–10 based on which customer-information
 * parameters are present and how well-formed they are. Below ~6 the event is
 * effectively unmatchable and the integration is useless (ads can't optimize
 * on it). The rubric below is a faithful, documented approximation of Meta's
 * published guidance: em + ph + external_id + fbp/fbp + ip + ua are the
 * high-value keys; names are low-value. Hashing is required in production —
 * we emulate SHA-256 truncation here (the real worker runs node:crypto).
 */

export interface CapiUserData {
  em?: string;            // hashed email
  ph?: string;            // hashed phone (E.164)
  external_id?: string;   // hashed CRM id
  fn?: string;            // hashed first name
  ln?: string;            // hashed last name
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;           // click id (fbclid cookie)
  fbp?: string;           // browser id (fbp cookie)
  ct?: string;            // city
  st?: string;            // state
  zp?: string;            // zip
  country?: string;
}

export interface CapiEvent {
  event_name: string;
  event_time: number;
  action_source: 'website';
  event_id: string;       // dedupe key vs the pixel
  user_data: CapiUserData;
  custom_data?: { currency: string; value: number };
}

/* Emulated SHA-256 → hex (deterministic; real worker uses node:crypto). */
export function sha256Hex(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = (h2 >>> 0) * 4294967296 + (h1 >>> 0);
  return n.toString(16).padStart(14, '0').repeat(4).slice(0, 64);
}

const normalizeEmail = (e: string) => e.trim().toLowerCase();
const normalizePhone = (p: string) => p.replace(/[^\d]/g, '');

/** Builds the user_data block the way the production worker does. */
export function buildCapiUserData(c: {
  email?: string; phone?: string; id?: string; name?: string;
  ip?: string; ua?: string; fbc?: string; fbp?: string; city?: string; country?: string;
}): CapiUserData {
  const [fn, ...rest] = (c.name ?? '').trim().split(/\s+/);
  const ln = rest[rest.length - 1] ?? '';
  const ud: CapiUserData = {};
  if (c.email) ud.em = sha256Hex(normalizeEmail(c.email));
  if (c.phone) ud.ph = sha256Hex(normalizePhone(c.phone));
  if (c.id) ud.external_id = sha256Hex(c.id.toLowerCase());
  if (fn) ud.fn = sha256Hex(fn.toLowerCase());
  if (ln) ud.ln = sha256Hex(ln.toLowerCase());
  if (c.ip) ud.client_ip_address = c.ip;
  if (c.ua) ud.client_user_agent = c.ua;
  if (c.fbc) ud.fbc = c.fbc;
  if (c.fbp) ud.fbp = c.fbp;
  if (c.city) ud.ct = sha256Hex(c.city.toLowerCase().replace(/\s/g, ''));
  if (c.country) ud.country = c.country.toLowerCase();
  return ud;
}

export function buildCapiEvent(ud: CapiUserData, value?: number): CapiEvent {
  return {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_id: `evt_${Math.random().toString(36).slice(2, 10)}`,
    user_data: ud,
    custom_data: value !== undefined ? { currency: 'USD', value } : undefined,
  };
}

/**
 * Event Match Quality 0–10.
 * Weights follow Meta's published guidance: hashed email & phone are the two
 * strongest match keys; external_id and the cookie pair (fbc/fbp) next;
 * ip/ua meaningful; names weak. A realistic CRM payload (em+ph+external_id+
 * fbp+fbc+ip+ua) scores ~9. Email-only scores ~2-3 (why "below 6 is useless").
 */
const EMQ_WEIGHTS: [keyof CapiUserData, number][] = [
  ['em', 2.0],
  ['ph', 1.8],
  ['external_id', 1.4],
  ['fbp', 1.2],
  ['fbc', 1.0],
  ['client_ip_address', 0.8],
  ['client_user_agent', 0.8],
  ['fn', 0.5],
  ['ln', 0.5],
];

export function emqScore(ud: CapiUserData): number {
  let score = 0;
  for (const [key, w] of EMQ_WEIGHTS) if (ud[key]) score += w;
  return Math.round(Math.min(10, score) * 10) / 10;
}

/** Human verdict against Meta's usability threshold. */
export function emqVerdict(score: number): { ok: boolean; label: string; tone: string } {
  if (score >= 8) return { ok: true, label: 'Excellent match', tone: '#1e6b4f' };
  if (score >= 6) return { ok: true, label: 'Usable — ads can optimize', tone: '#1e6b4f' };
  if (score >= 4) return { ok: false, label: 'Marginal — add phone / cookie ids', tone: '#b26e14' };
  return { ok: false, label: 'Too low — event will not match', tone: '#c2483b' };
}
