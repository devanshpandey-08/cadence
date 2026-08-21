export type View =
  | 'dashboard' | 'inbox' | 'tasks' | 'contacts' | 'deals'
  | 'calendar' | 'campaigns' | 'marketing' | 'assets'
  | 'ai' | 'automations' | 'listening' | 'calls' | 'ads'
  | 'insights' | 'experiments' | 'attribution'
  | 'conversations' | 'web' | 'seo'
  | 'cdp' | 'emailinfra' | 'importers'
  | 'agents' | 'security'
  | 'testing' | 'launch' | 'settings'
  | 'servicehub';

export type Platform =
  | 'linkedin' | 'instagram' | 'facebook' | 'x'
  | 'tiktok' | 'youtube' | 'pinterest' | 'gmb';

export type PostStatus = 'draft' | 'pending' | 'approved' | 'scheduled' | 'published' | 'failed';
export type Stage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type Role = 'admin' | 'editor' | 'viewer';
export type Source = 'Form' | 'Import' | 'Social' | 'Manual' | 'Webinar' | 'Chat';
export type MediaType = 'none' | 'image' | 'video' | 'carousel';

export interface Activity {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'form' | 'social' | 'deal';
  text: string;
  at: string;
}

/** Communication channel opt-ins (GDPR/CCPA-aware). */
export interface ChannelPrefs { email: boolean; sms: boolean; phone: boolean }

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  title: string;
  source: Source;
  tags: string[];
  owner: string;
  createdAt: string;
  lastActivity: string;
  timeline: Activity[];
  fromSocial?: boolean;
  score?: number;                 // 0–100 engagement score
  prefs?: ChannelPrefs;           // per-channel consent
  gdprConsentAt?: string;         // consent audit trail
  anonymized?: boolean;           // GDPR right-to-be-forgotten applied
}

/** A reusable media asset (the S3-backed library in production). */
export interface Asset {
  id: string;
  name: string;
  url: string;
  size: number;
  kind: 'image';
  tag?: string;
  createdAt: string;
  sessionOnly?: boolean;
}

export interface Company { id: string; name: string; domain: string; }

export interface Note { id: string; text: string; at: string; by: string; }

/** A quote/proposal line item. */
export interface LineItem { sku: string; qty: number; price: number }

export interface Deal {
  id: string;
  name: string;
  contactId: string;
  value: number;
  stage: Stage;
  owner: string;
  close: string;
  notes: Note[];
  created: string;
  lossReason?: string;            // required on close-lost
  winReason?: string;
  items?: LineItem[];             // products / line items
  quoteSent?: boolean;
}

export interface Task {
  id: string;
  title: string;
  due: string;
  done: boolean;
  priority: 'high' | 'med' | 'low';
  assignee: string;
  dealId?: string;
  contactId?: string;
  auto?: boolean;
}

/**
 * A real media attachment.
 * Images ≤300 KB are stored as data-URLs so they survive reload (demo stand-in
 * for the S3 object store); larger files use session object-URLs. Videos are
 * links (YouTube/TikTok/file URL) per the Phase 1 spec — we never host video.
 */
export interface MediaAttachment {
  kind: 'image' | 'video' | 'carousel';
  url?: string;            // single image / video link or preview
  urls?: string[];         // carousel frames (max 4)
  name?: string;
  sessionOnly?: boolean;   // blob: URL — lives for this browser session only
}

export interface Post {
  id: string;
  text: string;
  platforms: Platform[];
  date: string;
  time: string;
  status: PostStatus;
  author: string;
  media: MediaType;
  attachment?: MediaAttachment;
  perPlatform?: Partial<Record<Platform, string>>;
  firstComment?: string;
  campaign?: string;
  likes?: number;
  comments?: number;
  shares?: number;
  rejectNote?: string;
  failReason?: string;
}

export interface Msg { id: string; from: 'them' | 'us'; text: string; at: string; }

export interface Thread {
  id: string;
  platform: Platform;
  kind: 'comment' | 'dm' | 'mention';
  person: string;
  contactId?: string;
  preview: string;
  status: 'unread' | 'progress' | 'resolved';
  assignee?: string;
  postText: string;
  messages: Msg[];
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  list: string;
  status: 'draft' | 'scheduled' | 'sent';
  sent: number;
  opens: number;
  clicks: number;
  date: string;
}

export interface FormDef {
  id: string;
  name: string;
  type: 'embedded' | 'popup' | 'standalone';
  submissions: number;
  conv: number;
  active: boolean;
  template: string;
}

export interface PageDef {
  id: string;
  name: string;
  slug: string;
  template: 'squeeze' | 'webinar' | 'ebook' | 'demo' | 'thankyou';
  views: number;
  submissions: number;
  status: 'live' | 'draft';
}

export interface User { id: string; name: string; email: string; role: Role; color: string; }

export interface SocialAccount { id: string; platform: Platform; handle: string; connected: boolean; followers?: number; growth?: number; }

export interface Notif { id: string; text: string; at: string; read: boolean; kind: 'auto' | 'approval' | 'import' | 'system'; }

export interface ToastMsg { id: string; text: string; kind: 'success' | 'info' | 'warning'; }

/* ---------- Agent fleet (human-in-the-loop autonomy) ---------- */
export type AgentTier = 'supervised' | 'copilot' | 'autonomous';
export interface Agent {
  id: string;
  name: string;
  role: string;
  icon: string;
  color: string;
  tier: AgentTier;
  actions: number;          // accrued operations
  status: 'idle' | 'working';
}
export interface AgentApproval {
  id: string;
  agent: string;            // agent name
  action: string;           // what it wants to do
  detail: string;
  risk: 'low' | 'med' | 'high';
  status: 'pending' | 'approved' | 'rejected';
  at: string;
}

/* ---------- Security & sessions ---------- */
export interface DeviceSession {
  id: string;
  device: string;
  kind: 'laptop' | 'smartphone' | 'server';
  browser: string;
  location: string;
  ip: string;
  current: boolean;
  lastActive: string;
}
export interface ApiKeyDef {
  id: string;
  label: string;
  prefix: string;
  scopes: string[];
  created: string;
  lastUsed: string;
}
export interface SecuritySettings { mfa: boolean; anomalyAlerts: boolean; rateLimit: boolean; }

export interface ComposerState { open: boolean; postId?: string; date?: string; attachment?: MediaAttachment; }

export type CreateSignal = 'contact' | 'deal' | 'campaign' | 'task' | null;

export interface AppState {
  view: View;
  me: User | null;
  contactId: string | null;
  dealId: string | null;
  composer: ComposerState;
  create: CreateSignal;
  contacts: Contact[];
  companies: Company[];
  assets: Asset[];
  deals: Deal[];
  tasks: Task[];
  posts: Post[];
  threads: Thread[];
  campaigns: Campaign[];
  forms: FormDef[];
  pages: PageDef[];
  users: User[];
  accounts: SocialAccount[];
  notifs: Notif[];
  toasts: ToastMsg[];
  agents: Agent[];
  approvals: AgentApproval[];
  sessions: DeviceSession[];
  apiKeys: ApiKeyDef[];
  security: SecuritySettings;
}
