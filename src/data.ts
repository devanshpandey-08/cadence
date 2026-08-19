import type { AppState, Activity, Contact } from './types';
import { addDays, isoOf, uid } from './meta';

const d = (n: number) => isoOf(addDays(new Date(), n));
let seedN = 0;
const act = (type: Activity['type'], text: string, n: number): Activity => ({ id: 'a' + ++seedN, type, text, at: d(n) });

export const LIST_SIZES: Record<string, number> = {
  'Newsletter — 4,213': 4213,
  'Wholesale leads — 182': 182,
  'Portland locals — 640': 640,
  'Event RSVPs — 96': 96,
};

export const TAG_OPTIONS = ['wholesale', 'vip', 'newsletter', 'lead', 'partner', 'office-coffee', 'local'];

export function seedState(): AppState {
  const contacts: Contact[] = [
    {
      id: 'c1', name: 'Ingrid Halvorsen', email: 'ingrid@cafeastra.com', phone: '+1 (503) 555-0141',
      company: 'Café Astra', title: 'Head Buyer', source: 'Webinar', tags: ['wholesale', 'vip'], owner: 'Maya Chen',
      createdAt: d(-122), lastActivity: d(-1), fromSocial: false,
      timeline: [
        act('deal', 'Deal "Café Astra — annual wholesale" moved to Negotiation', -1),
        act('call', 'Call — 18 min. Discussing Q3 volume and delivery cadence.', -3),
        act('email', 'Sent "Wholesale pricing 2026" — opened 2×', -6),
        act('form', 'Submitted "Wholesale inquiry" form', -14),
        act('social', 'Commented on LinkedIn post "Spring blend drop"', -19),
      ],
    },
    {
      id: 'c2', name: 'Marcus Webb', email: 'marcus@hotelverdant.com', phone: '+1 (206) 555-0177',
      company: 'Hotel Verdant', title: 'F&B Director', source: 'Import', tags: ['wholesale', 'lead'], owner: 'Maya Chen',
      createdAt: d(-95), lastActivity: d(-2),
      timeline: [
        act('email', 'Proposal PDF delivered via Gmail SMTP — opened', -2),
        act('meeting', 'Meeting — lobby tasting session, 45 min', -9),
        act('deal', 'Deal "Hotel Verdant minibar program" created', -12),
      ],
    },
    {
      id: 'c3', name: 'Tessa Brandt', email: 'tessa@bluebirddeli.com',
      company: 'Bluebird Deli', title: 'Owner', source: 'Form', tags: ['newsletter', 'local'], owner: 'Jonas Berg',
      createdAt: d(-60), lastActivity: d(-4),
      timeline: [
        act('social', 'Commented on Facebook: "The counter cart worked great at our weekend market"', -4),
        act('form', 'Submitted "Wholesale inquiry" form', -21),
      ],
    },
    {
      id: 'c4', name: 'Jae Park', email: 'jae@copperkettle.co',
      company: 'Copper Kettle Coffee', title: 'Head Roaster', source: 'Social', tags: ['lead'], owner: 'Jonas Berg',
      createdAt: d(-4), lastActivity: d(0), fromSocial: true,
      timeline: [
        act('social', 'Commented on Instagram: "Do you ship the Huila single origin to Korea?"', 0),
        act('note', 'Auto-created from Instagram comment on "Origin story: Huila"', -4),
      ],
    },
    {
      id: 'c5', name: 'Sofia Reyes', email: 'sofia@lumenco.work', phone: '+1 (415) 555-0102',
      company: 'Lumen Coworking', title: 'Operations Manager', source: 'Form', tags: ['office-coffee'], owner: 'Priya Nair',
      createdAt: d(-33), lastActivity: d(-1),
      timeline: [
        act('email', 'Sent "Lumen proposal v2" — clicked pricing link', -1),
        act('form', 'Submitted "Demo request" landing page form', -8),
      ],
    },
    {
      id: 'c6', name: 'Anders Lindqvist', email: 'anders@nordbeans.se',
      company: 'Nord Beans', title: 'Founder', source: 'Manual', tags: ['partner', 'wholesale'], owner: 'Maya Chen',
      createdAt: d(-210), lastActivity: d(-5),
      timeline: [
        act('meeting', 'Zoom — collab roast profile tasting', -5),
        act('deal', 'Deal "Nord Beans — collab roast" moved to Negotiation', -7),
      ],
    },
    {
      id: 'c7', name: 'Nadia Okafor', email: 'nadia@grainhouse.com',
      company: 'The Grain House', title: 'General Manager', source: 'Import', tags: ['wholesale'], owner: 'Maya Chen',
      createdAt: d(-88), lastActivity: d(-6),
      timeline: [act('deal', 'Deal "Grain House — brunch program" won 🎉', -6), act('email', 'Welcome email sent via Gmail SMTP', -6)],
    },
    {
      id: 'c8', name: 'Felix Marsh', email: 'felix@fablebrew.com',
      company: 'Fable Books & Brew', title: 'Manager', source: 'Social', tags: ['lead', 'local'], owner: 'Priya Nair',
      createdAt: d(-2), lastActivity: d(-1), fromSocial: true,
      timeline: [
        act('social', 'Commented on TikTok: "What grinder is in the latte art video?"', -1),
        act('note', 'Auto-created from TikTok comment', -2),
      ],
    },
    {
      id: 'c9', name: 'Ruth Adler', email: 'ruth@hotelverdant.com',
      company: 'Hotel Verdant', title: 'Events Lead', source: 'Chat', tags: ['lead'], owner: 'Maya Chen',
      createdAt: d(-15), lastActivity: d(-3),
      timeline: [act('social', 'DM on X: "Can we book the tasting room for a corporate event?"', -3)],
    },
    {
      id: 'c10', name: 'Owen Blackwood', email: 'owen@asterandvine.com',
      company: 'Aster & Vine', title: 'Owner', source: 'Webinar', tags: ['wholesale', 'newsletter'], owner: 'Jonas Berg',
      createdAt: d(-41), lastActivity: d(-8),
      timeline: [act('email', 'Opened "Wholesale Nurture — Q3"', -8)],
    },
    {
      id: 'c11', name: 'Greta Solheim', email: 'greta@fjordbakeri.no',
      company: 'Fjord Bakeri', title: 'Purchasing', source: 'Import', tags: ['wholesale'], owner: 'Priya Nair',
      createdAt: d(-70), lastActivity: d(-12),
      timeline: [act('call', 'Call — 9 min. Wants samples before committing.', -12)],
    },
    {
      id: 'c12', name: 'Dev Kapoor', email: 'dev@brightloft.io',
      company: 'BrightLoft Studios', title: 'Office Manager', source: 'Form', tags: ['office-coffee', 'newsletter'], owner: 'Priya Nair',
      createdAt: d(-19), lastActivity: d(-2),
      timeline: [act('form', 'Subscribed via newsletter popup', -19), act('email', 'Clicked "Cold brew for offices" link', -2)],
    },
  ];

  return {
    view: 'dashboard',
    me: null,
    contactId: null,
    dealId: null,
    composer: { open: false },
    create: null,
    contacts,
    companies: [
      { id: 'co1', name: 'Café Astra', domain: 'cafeastra.com' },
      { id: 'co2', name: 'Hotel Verdant', domain: 'hotelverdant.com' },
      { id: 'co3', name: 'Bluebird Deli', domain: 'bluebirddeli.com' },
      { id: 'co4', name: 'Copper Kettle Coffee', domain: 'copperkettle.co' },
      { id: 'co5', name: 'Lumen Coworking', domain: 'lumenco.work' },
      { id: 'co6', name: 'Nord Beans', domain: 'nordbeans.se' },
      { id: 'co7', name: 'The Grain House', domain: 'grainhouse.com' },
      { id: 'co8', name: 'Fable Books & Brew', domain: 'fablebrew.com' },
    ],
    deals: [
      { id: 'd1', name: 'Café Astra — annual wholesale', contactId: 'c1', value: 48000, stage: 'negotiation', owner: 'Maya Chen', close: d(18), created: d(-30), notes: [{ id: uid(), text: 'Legal reviewing the MSAA. Ingrid pushing for 60-day terms.', at: d(-2), by: 'Maya Chen' }] },
      { id: 'd2', name: 'Hotel Verdant minibar program', contactId: 'c2', value: 32000, stage: 'proposal', owner: 'Maya Chen', close: d(10), created: d(-12), notes: [{ id: uid(), text: 'Wants single-serve pouches with hotel sleeve branding.', at: d(-4), by: 'Maya Chen' }] },
      { id: 'd3', name: 'Bluebird Deli — counter cart', contactId: 'c3', value: 6400, stage: 'qualified', owner: 'Jonas Berg', close: d(25), created: d(-21), notes: [] },
      { id: 'd4', name: 'Lumen — office subscription', contactId: 'c5', value: 11800, stage: 'proposal', owner: 'Priya Nair', close: d(7), created: d(-8), notes: [] },
      { id: 'd5', name: 'Nord Beans — collab roast', contactId: 'c6', value: 15000, stage: 'negotiation', owner: 'Maya Chen', close: d(30), created: d(-26), notes: [] },
      { id: 'd6', name: 'Copper Kettle — starter sacks', contactId: 'c4', value: 1800, stage: 'lead', owner: 'Jonas Berg', close: d(40), created: d(-3), notes: [] },
      { id: 'd7', name: 'Grain House — brunch program', contactId: 'c7', value: 9200, stage: 'won', owner: 'Maya Chen', close: d(-6), created: d(-50), notes: [] },
      { id: 'd8', name: 'Fable — book club boxes', contactId: 'c8', value: 3600, stage: 'qualified', owner: 'Priya Nair', close: d(21), created: d(-6), notes: [] },
      { id: 'd9', name: 'Verdant — event catering pilot', contactId: 'c9', value: 7500, stage: 'lost', owner: 'Maya Chen', close: d(-15), created: d(-40), notes: [{ id: uid(), text: 'Went with in-house catering. Revisit in Q1.', at: d(-15), by: 'Maya Chen' }] },
    ],
    tasks: [
      { id: 't1', title: 'Send contract — Hotel Verdant minibar program', due: d(0), done: false, priority: 'high', assignee: 'Maya Chen', dealId: 'd2', auto: true },
      { id: 't2', title: 'Call Ingrid re: Q3 volume commitments', due: d(0), done: false, priority: 'high', assignee: 'Maya Chen', dealId: 'd1' },
      { id: 't3', title: 'Follow up on Lumen proposal v2', due: d(1), done: false, priority: 'high', assignee: 'Priya Nair', dealId: 'd4' },
      { id: 't4', title: 'Prep cupping samples for Nord Beans', due: d(2), done: false, priority: 'med', assignee: 'Jonas Berg', dealId: 'd5' },
      { id: 't5', title: 'Chase Bluebird counter cart decision', due: d(-1), done: false, priority: 'med', assignee: 'Jonas Berg', dealId: 'd3' },
      { id: 't6', title: 'Update wholesale price sheet for 2026', due: d(4), done: false, priority: 'low', assignee: 'Sam Ortiz' },
      { id: 't7', title: 'Onboard Fable to the wholesale portal', due: d(6), done: false, priority: 'low', assignee: 'Priya Nair', dealId: 'd8' },
      { id: 't8', title: 'Intro email to Anders (collab roast)', due: d(-3), done: true, priority: 'med', assignee: 'Maya Chen', dealId: 'd5' },
      { id: 't9', title: 'Book tasting room for Verdant tour', due: d(-5), done: true, priority: 'med', assignee: 'Maya Chen', dealId: 'd2' },
    ],
    posts: [
      { id: 'p1', text: 'Meet the spring blend: Huila sunrise. Notes of panela, blood orange and a long cacao finish. Roasted Tuesday, shipping Friday.', platforms: ['linkedin'], date: d(-6), time: '09:00', status: 'published', author: 'Jonas Berg', media: 'image', likes: 214, comments: 18, shares: 22 },
      { id: 'p2', text: 'Origin story: 48 hours in Huila, Colombia. Swipe for the farmers behind your morning cup →', platforms: ['instagram'], date: d(-4), time: '12:30', status: 'published', author: 'Priya Nair', media: 'carousel', likes: 1204, comments: 96, shares: 41, firstComment: 'Full story + brew guide on the blog — link in bio ☕' },
      { id: 'p3', text: 'Latte art in 12 seconds. No edits, one pour.', platforms: ['tiktok'], date: d(-2), time: '17:45', status: 'published', author: 'Jonas Berg', media: 'video', likes: 8412, comments: 312, shares: 980 },
      { id: 'p4', text: 'Cupping night is back — Thursday 7pm at the roastery. First 20 RSVPs get the new Ethiopia Guji to taste.', platforms: ['facebook'], date: d(-1), time: '18:00', status: 'published', author: 'Maya Chen', media: 'image', likes: 87, comments: 24, shares: 9 },
      { id: 'p5', text: 'Flash sale: 20% off single origins today only. Use code FLASH20.', platforms: ['x'], date: d(-1), time: '10:15', status: 'failed', author: 'Maya Chen', media: 'none', failReason: 'X API rate limit exceeded — retry from the calendar.' },
      { id: 'p6', text: 'Saturday hours: roastery open 8–4. Tasting bar pouring the spring flight all day.', platforms: ['gmb'], date: d(0), time: '08:00', status: 'published', author: 'Sam Ortiz', media: 'none', likes: 31, comments: 2, shares: 0 },
      { id: 'p7', text: 'Wholesale FAQ — the 5 questions every café asks before switching roasters (a thread):', platforms: ['linkedin', 'x'], date: d(0), time: '14:30', status: 'scheduled', author: 'Maya Chen', media: 'none' },
      { id: 'p8', text: 'Roastery ASMR: 60 seconds of the Probat warming up. Sound on.', platforms: ['instagram'], date: d(0), time: '18:15', status: 'scheduled', author: 'Jonas Berg', media: 'video' },
      { id: 'p9', text: 'Brew guide: the 4:6 method for our medium roasts. Save this pin for your Sunday brew.', platforms: ['pinterest'], date: d(1), time: '10:00', status: 'scheduled', author: 'Priya Nair', media: 'image' },
      { id: 'p10', text: 'Summer cold brew drop — June 1. Concentrate, ready-to-drink, and a keg program for offices.', platforms: ['instagram', 'facebook'], date: d(2), time: '11:30', status: 'scheduled', author: 'Priya Nair', media: 'carousel', campaign: 'Cold Brew Launch' },
      { id: 'p11', text: 'Case study: how Café Astra cut coffee waste 31% with our weekly delivery cadence.', platforms: ['linkedin'], date: d(3), time: '09:30', status: 'pending', author: 'Jonas Berg', media: 'image' },
      { id: 'p12', text: 'Barista POV: opening shift at Ember & Oak. Cold open, no music, just the machine.', platforms: ['tiktok'], date: d(4), time: '16:00', status: 'pending', author: 'Jonas Berg', media: 'video' },
      { id: 'p13', text: 'Roast profile walkthrough: why we develop the Huila 45 seconds longer.', platforms: ['youtube'], date: d(6), time: '13:00', status: 'draft', author: 'Maya Chen', media: 'video' },
      { id: 'p14', text: 'Staff picks: the 3 bags we actually take home. Carousel with tasting notes.', platforms: ['instagram'], date: d(5), time: '12:00', status: 'scheduled', author: 'Priya Nair', media: 'carousel' },
    ],
    threads: [
      {
        id: 'th1', platform: 'instagram', kind: 'comment', person: 'Jae Park', contactId: 'c4',
        preview: 'Do you ship the Huila single origin to Korea?', status: 'unread', postText: 'Origin story: 48 hours in Huila, Colombia…',
        messages: [{ id: uid(), from: 'them', text: 'Do you ship the Huila single origin to Korea? The 250g bags.', at: d(0) }],
      },
      {
        id: 'th2', platform: 'linkedin', kind: 'comment', person: 'Ingrid Halvorsen', contactId: 'c1', assignee: 'Maya Chen',
        preview: 'Is the spring blend available in 5kg bags for espresso programs?', status: 'progress', postText: 'Meet the spring blend: Huila sunrise…',
        messages: [
          { id: uid(), from: 'them', text: 'Is the spring blend available in 5kg bags for espresso programs?', at: d(-1) },
          { id: uid(), from: 'us', text: 'Yes — 5kg and 10kg formats, roasted to order. Sending the wholesale sheet to your email now.', at: d(-1) },
        ],
      },
      {
        id: 'th3', platform: 'x', kind: 'dm', person: '@flatwhitefred',
        preview: 'Hey! Any chance of a monthly subscription for the cold brew?', status: 'unread', postText: 'Direct message',
        messages: [{ id: uid(), from: 'them', text: 'Hey! Any chance of a monthly subscription for the cold brew? I would sign up today.', at: d(0) }],
      },
      {
        id: 'th4', platform: 'facebook', kind: 'comment', person: 'Tessa Brandt', contactId: 'c3', assignee: 'Jonas Berg',
        preview: 'The counter cart worked great at our weekend market 🙌', status: 'resolved', postText: 'Cupping night is back — Thursday 7pm…',
        messages: [
          { id: uid(), from: 'them', text: 'The counter cart worked great at our weekend market 🙌 Sold out of cold brew by noon.', at: d(-4) },
          { id: uid(), from: 'us', text: 'Amazing to hear, Tessa! Upping your next delivery by two crates.', at: d(-4) },
        ],
      },
      {
        id: 'th5', platform: 'tiktok', kind: 'comment', person: 'Felix Marsh', contactId: 'c8', assignee: 'Priya Nair',
        preview: 'What grinder are you using in the latte art video?', status: 'progress', postText: 'Latte art in 12 seconds. No edits, one pour.',
        messages: [{ id: uid(), from: 'them', text: 'What grinder are you using in the latte art video? Dialing in mine at the shop.', at: d(-1) }],
      },
      {
        id: 'th6', platform: 'instagram', kind: 'dm', person: '@oatmilkonly',
        preview: 'Collab idea: oat milk × Ember & Oak tasting flight?', status: 'unread', postText: 'Direct message',
        messages: [{ id: uid(), from: 'them', text: 'Collab idea: oat milk × Ember & Oak tasting flight? We have 40k local followers.', at: d(0) }],
      },
    ],
    campaigns: [
      { id: 'cm1', name: 'Spring Blend Announcement', subject: 'The spring blend is here, {{first_name}}', list: 'Newsletter — 4,213', status: 'sent', sent: 4213, opens: 2014, clicks: 257, date: d(-5) },
      { id: 'cm2', name: 'Wholesale Nurture — Q3', subject: '{{company}} + Ember & Oak this quarter?', list: 'Wholesale leads — 182', status: 'sent', sent: 182, opens: 113, clicks: 21, date: d(-12) },
      { id: 'cm3', name: 'Cold Brew Launch', subject: 'Cold brew drops June 1 — early access inside', list: 'Newsletter — 4,213', status: 'scheduled', sent: 0, opens: 0, clicks: 0, date: d(2) },
      { id: 'cm4', name: 'Cupping Night RSVP', subject: 'Your seat at Thursday\'s cupping, {{first_name}}', list: 'Portland locals — 640', status: 'draft', sent: 0, opens: 0, clicks: 0, date: d(3) },
    ],
    forms: [
      { id: 'f1', name: 'Wholesale inquiry', type: 'embedded', submissions: 182, conv: 4.8, active: true, template: 'Contact' },
      { id: 'f2', name: 'Newsletter popup', type: 'popup', submissions: 1930, conv: 2.1, active: true, template: 'Newsletter' },
      { id: 'f3', name: 'Cupping night RSVP', type: 'standalone', submissions: 96, conv: 12.4, active: true, template: 'Event RSVP' },
    ],
    pages: [
      { id: 'pg1', name: 'Spring Blend Launch', slug: 'spring-blend', template: 'squeeze', views: 8214, submissions: 312, status: 'live' },
      { id: 'pg2', name: 'Brew Guide Ebook', slug: 'brew-guide', template: 'ebook', views: 3910, submissions: 445, status: 'live' },
      { id: 'pg3', name: 'Book a Cupping', slug: 'book-a-cupping', template: 'demo', views: 1216, submissions: 96, status: 'live' },
      { id: 'pg4', name: 'Thanks — Wholesale', slug: 'thanks-wholesale', template: 'thankyou', views: 402, submissions: 0, status: 'draft' },
    ],
    users: [
      { id: 'u1', name: 'Maya Chen', email: 'maya@emberandoak.com', role: 'admin', color: '#0e7a52' },
      { id: 'u2', name: 'Jonas Berg', email: 'jonas@emberandoak.com', role: 'editor', color: '#3e7cb1' },
      { id: 'u3', name: 'Priya Nair', email: 'priya@emberandoak.com', role: 'editor', color: '#a96f14' },
      { id: 'u4', name: 'Sam Ortiz', email: 'sam@emberandoak.com', role: 'viewer', color: '#7a5fa8' },
    ],
    accounts: [
      { id: 'sa1', platform: 'instagram', handle: '@emberandoak', connected: true, followers: 12400, growth: 312 },
      { id: 'sa2', platform: 'linkedin', handle: 'Ember & Oak Roastery', connected: true, followers: 2140, growth: 58 },
      { id: 'sa3', platform: 'facebook', handle: 'Ember & Oak', connected: true, followers: 5320, growth: 44 },
      { id: 'sa4', platform: 'tiktok', handle: '@emberandoak', connected: true, followers: 28900, growth: 1240 },
      { id: 'sa5', platform: 'pinterest', handle: '@emberandoak', connected: true, followers: 3180, growth: 91 },
      { id: 'sa6', platform: 'gmb', handle: 'Ember & Oak — Portland', connected: true, followers: 890, growth: 23 },
      { id: 'sa7', platform: 'x', handle: '@emberandoak', connected: false },
      { id: 'sa8', platform: 'youtube', handle: 'Ember & Oak Roastery', connected: false },
    ],
    notifs: [
      { id: 'n1', text: 'Automation created task "Send contract — Hotel Verdant minibar program"', at: d(0), read: false, kind: 'auto' },
      { id: 'n2', text: '2 posts are waiting for your approval in the calendar', at: d(0), read: false, kind: 'approval' },
      { id: 'n3', text: 'X post failed: API rate limit. Retry from the calendar.', at: d(-1), read: false, kind: 'system' },
      { id: 'n4', text: 'HubSpot import finished — 48 contacts, 6 companies, 9 deals', at: d(-9), read: true, kind: 'import' },
    ],
    toasts: [],
  };
}

/* ---------- dashboard metric seeds per range ---------- */
function walk(base: number, vol: number, n: number, seed: number): number[] {
  const out: number[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = Math.max(base * 0.35, v + Math.sin(i * 1.7 + seed) * vol + (((seed * (i + 3)) % 7) - 3) * vol * 0.3);
    out.push(Math.round(v));
  }
  return out;
}

export function metricsFor(range: 7 | 30 | 90) {
  const k = range === 7 ? 1 : range === 30 ? 3.4 : 9.1;
  return {
    newContacts: Math.round(38 * k),
    newContactsSeries: walk(26, 9, 12, range),
    engagement: Math.round(11800 * k),
    engagementSeries: walk(820, 260, 12, range + 2),
    emailsSent: Math.round(4400 * k),
    openRate: range === 7 ? 46 : range === 30 ? 44 : 41,
    emailSeries: walk(340, 90, 12, range + 4),
    postsPublished: Math.round(21 * k),
    followers: Math.round(1460 * k),
  };
}
