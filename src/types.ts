export type View =
  | 'dashboard' | 'inbox' | 'tasks' | 'contacts' | 'deals'
  | 'calendar' | 'campaigns' | 'marketing' | 'testing' | 'settings';

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
}

export interface Company { id: string; name: string; domain: string; }

export interface Note { id: string; text: string; at: string; by: string; }

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

export interface Post {
  id: string;
  text: string;
  platforms: Platform[];
  date: string;
  time: string;
  status: PostStatus;
  author: string;
  media: MediaType;
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

export interface ComposerState { open: boolean; postId?: string; date?: string; }

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
}
