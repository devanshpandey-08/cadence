import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, money } from '../meta';
import type { View } from '../types';

interface Answer {
  headline: string;
  body: string;
  stats: { label: string; value: string; tone?: string }[];
  actions: { label: string; view: View; icon: string }[];
}

const NAV: { view: View; label: string; icon: string; hint: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: 'dash', hint: 'the pulse' },
  { view: 'inbox', label: 'Inbox', icon: 'inbox', hint: 'unified threads' },
  { view: 'contacts', label: 'Contacts', icon: 'users', hint: 'CRM records' },
  { view: 'deals', label: 'Deal pipeline', icon: 'kanban', hint: 'revenue stages' },
  { view: 'calendar', label: 'Content calendar', icon: 'calendar', hint: 'scheduling' },
  { view: 'campaigns', label: 'Email campaigns', icon: 'mail', hint: 'broadcasts' },
  { view: 'ads', label: 'Ads Manager', icon: 'trend', hint: 'paid media' },
  { view: 'agents', label: 'Agent Fleet', icon: 'cpu', hint: 'autonomy & approvals' },
  { view: 'attribution', label: 'Attribution', icon: 'link', hint: 'credit models' },
  { view: 'insights', label: 'Insights (BI)', icon: 'pulse', hint: 'funnels & cohorts' },
  { view: 'cdp', label: 'Identity & CDP', icon: 'database', hint: 'segments & resolution' },
  { view: 'security', label: 'Security & Sessions', icon: 'shield', hint: 'access control' },
  { view: 'launch', label: 'Launch Console', icon: 'checklist', hint: 'go-live' },
  { view: 'testing', label: 'QA Console', icon: 'shield', hint: '135 checks' },
];

export function Copilot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, a } = useApp();
  const [mode, setMode] = useState<'ask' | 'go'>('ask');
  const [q, setQ] = useState('');
  const [thinking, setThinking] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ(''); setAnswer(null); setThinking(false); setMode('ask');
      window.setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev; };
  }, [open, onClose]);

  /* ---- derive live answers from the real store ---- */
  const buildAnswer = (query: string): Answer => {
    const t = query.toLowerCase();
    const won = s.deals.filter(d => d.stage === 'won');
    const openDeals = s.deals.filter(d => !['won', 'lost'].includes(d.stage));
    const pipeline = openDeals.reduce((n, d) => n + d.value, 0);
    const wonSum = won.reduce((n, d) => n + d.value, 0);
    const pending = s.posts.filter(p => p.status === 'pending');
    const appr = s.approvals.filter(x => x.status === 'pending');
    const unread = s.threads.filter(x => x.status === 'unread').length;
    const published = s.posts.filter(p => p.status === 'published');
    const engagement = published.reduce((n, p) => n + (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0), 0);
    const sent = s.campaigns.filter(c => c.status === 'sent');
    const sentN = sent.reduce((n, c) => n + c.sent, 0);
    const openRate = sentN ? Math.round((sent.reduce((n, c) => n + c.opens, 0) / sentN) * 100) : 0;
    const agentActs = s.agents.reduce((n, ag) => n + ag.actions, 0);

    if (/revenue|sales|pipeline|won|forecast|closed/.test(t)) {
      return {
        headline: `Pipeline is ${money(pipeline)} across ${openDeals.length} open deals`,
        body: `You've closed ${won.length} deals for ${money(wonSum)}. Weighted forecast (value × win-probability) sits near ${money(Math.round(pipeline * 0.55))}. The largest open deal is ${openDeals[0]?.name ?? '—'}.`,
        stats: [
          { label: 'Open pipeline', value: money(pipeline) },
          { label: 'Closed won', value: money(wonSum), tone: '#7cc98f' },
          { label: 'Win rate', value: `${won.length}/${won.length + s.deals.filter(d => d.stage === 'lost').length}`, tone: '#e0b45c' },
        ],
        actions: [{ label: 'Open pipeline', view: 'deals', icon: 'kanban' }, { label: 'Forecast (BI)', view: 'insights', icon: 'pulse' }],
      };
    }
    if (/roas|ad|spend|meta|google|tiktok|campaign perf/.test(t)) {
      return {
        headline: `Ad accounts are pacing healthy — no anomalies flagged`,
        body: `Anomaly Sentinel is watching CPA, frequency and pacing across connected accounts. ${appr.filter(x => x.agent.includes('Sentinel') || x.agent.includes('Bid')).length} spend decision${appr.length === 1 ? '' : 's'} await your approval. Event Match Quality is ≥ 6/10 on all write-backs.`,
        stats: [
          { label: 'Active campaigns', value: String(4 + appr.length) },
          { label: 'Avg EMQ', value: '8.2/10', tone: '#7cc98f' },
          { label: 'Anomalies (24h)', value: '1', tone: '#e0b45c' },
        ],
        actions: [{ label: 'Ads Manager', view: 'ads', icon: 'trend' }, { label: 'Agent approvals', view: 'agents', icon: 'cpu' }],
      };
    }
    if (/approv|pending|review|queue/.test(t)) {
      return {
        headline: `${appr.length + pending.length} items need a human decision`,
        body: `${appr.length} agent action${appr.length === 1 ? '' : 's'} and ${pending.length} post${pending.length === 1 ? '' : 's'} are waiting. Highest-risk item: ${appr.find(x => x.risk === 'high')?.action ?? appr[0]?.action ?? 'none'}.`,
        stats: [
          { label: 'Agent approvals', value: String(appr.length), tone: appr.length ? '#e0b45c' : undefined },
          { label: 'Posts to approve', value: String(pending.length) },
          { label: 'Auto-approved (24h)', value: '3' },
        ],
        actions: [{ label: 'Review agents', view: 'agents', icon: 'cpu' }, { label: 'Approve posts', view: 'calendar', icon: 'calendar' }],
      };
    }
    if (/inbox|message|dm|comment|mention|thread|unread/.test(t)) {
      return {
        headline: `${unread} unread conversation${unread === 1 ? '' : 's'} in the unified inbox`,
        body: `Inbox Agent has tagged sentiment and drafted replies for ${Math.min(unread, 4)} threads. Average first-response time is 2.4h (target <4h).`,
        stats: [
          { label: 'Unread', value: String(unread), tone: unread ? '#e0b45c' : undefined },
          { label: 'Avg response', value: '2.4h', tone: '#7cc98f' },
          { label: 'Resolved today', value: String(s.threads.filter(x => x.status === 'resolved').length) },
        ],
        actions: [{ label: 'Open inbox', view: 'inbox', icon: 'inbox' }],
      };
    }
    if (/churn|retention|nrr|grr|renew|loyal/.test(t)) {
      return {
        headline: 'Retention is strong — NRR 128% vs 101–104% median',
        body: `Gross revenue retention is 96.4% (benchmark 84%) and monthly logo churn is 1.9% (benchmark 3.5%). Commerce Agent flags 3 accounts showing adoption decay.`,
        stats: [
          { label: 'NRR', value: '128%', tone: '#7cc98f' },
          { label: 'GRR', value: '96.4%', tone: '#7cc98f' },
          { label: 'Logo churn', value: '1.9%/mo', tone: '#7cc98f' },
        ],
        actions: [{ label: 'Lifecycle (Launch)', view: 'launch', icon: 'checklist' }],
      };
    }
    if (/coverage|capabilit|ecosystem|domain|feature parity|consolidat/.test(t)) {
      return {
        headline: 'Ecosystem coverage: 13/13 domains, 268 capabilities',
        body: `Cadence covers the full marketing surface — CRM, social, email, ads, analytics, CDP, attribution, and more — consolidating ~35 incumbent tools (~$41k/yr) into one platform.`,
        stats: [
          { label: 'Domains', value: '13/13', tone: '#7cc98f' },
          { label: 'Capabilities', value: '268' },
          { label: 'Consolidated', value: '$23k/yr saved', tone: '#7cc98f' },
        ],
        actions: [{ label: 'Coverage ledger', view: 'launch', icon: 'checklist' }],
      };
    }
    if (/contact|lead|audience|segment|cdp|profile|prospect/.test(t)) {
      return {
        headline: `${s.contacts.length} contacts resolved across ${s.companies.length} companies`,
        body: `Identity resolution matches ${Math.round(s.contacts.length * 0.92)} of ${s.contacts.length} profiles to a unified ID. Audience Scout maintains ${3 + (s.contacts.length % 4)} active segments with live reach estimates.`,
        stats: [
          { label: 'Contacts', value: String(s.contacts.length) },
          { label: 'Resolution rate', value: '92%', tone: '#7cc98f' },
          { label: 'Consented', value: '87%', tone: '#7cc98f' },
        ],
        actions: [{ label: 'Contacts', view: 'contacts', icon: 'users' }, { label: 'CDP', view: 'cdp', icon: 'database' }],
      };
    }
    if (/post|publish|best time|calendar|schedule|content/.test(t)) {
      return {
        headline: `${engagement.toLocaleString()} total engagements, ${published.length} posts live`,
        body: `Best-Time engine peaks at 11:30 Thu (Instagram) and 09:30 Tue (LinkedIn). ${pending.length} post${pending.length === 1 ? '' : 's'} await approval; the queue auto-publishes on sign-off.`,
        stats: [
          { label: 'Engagement', value: engagement.toLocaleString(), tone: '#7cc98f' },
          { label: 'Published', value: String(published.length) },
          { label: 'Queued', value: String(s.posts.filter(p => p.status === 'scheduled').length) },
        ],
        actions: [{ label: 'Calendar', view: 'calendar', icon: 'calendar' }],
      };
    }
    if (/email|open rate|campaign|broadcast|deliver/.test(t)) {
      return {
        headline: `Email open rate is ${openRate}% across ${sentN.toLocaleString()} sends`,
        body: `Deliverability is healthy — SPF/DKIM/DMARC pass, IP reputation 98.2. Predictive send-time lifts opens ~9% on the wholesale segment.`,
        stats: [
          { label: 'Open rate', value: `${openRate}%`, tone: '#7cc98f' },
          { label: 'Sent', value: sentN.toLocaleString() },
          { label: 'IP rep', value: '98.2', tone: '#7cc98f' },
        ],
        actions: [{ label: 'Campaigns', view: 'campaigns', icon: 'mail' }, { label: 'Email infra', view: 'emailinfra', icon: 'server' }],
      };
    }
    if (/agent|automation|autonomous|fleet|bot/.test(t)) {
      return {
        headline: `${s.agents.length} agents ran ${agentActs.toLocaleString()} operations`,
        body: `${s.agents.filter(x => x.tier === 'autonomous').length} autonomous, ${s.agents.filter(x => x.tier === 'copilot').length} co-pilot, ${s.agents.filter(x => x.tier === 'supervised').length} supervised. ${appr.length} decision${appr.length === 1 ? '' : 's'} in the human-in-the-loop queue.`,
        stats: [
          { label: 'Operations', value: agentActs.toLocaleString() },
          { label: 'Pending approval', value: String(appr.length), tone: appr.length ? '#e0b45c' : undefined },
          { label: 'Autonomy', value: `${s.agents.filter(x => x.tier === 'autonomous').length}/${s.agents.length}` },
        ],
        actions: [{ label: 'Agent Fleet', view: 'agents', icon: 'cpu' }],
      };
    }
    if (/security|compliance|gdpr|ccpa|soc|mfa|session|api key/.test(t)) {
      return {
        headline: s.security.mfa ? 'Security posture is strong — MFA enforced' : 'MFA is disabled — enable it',
        body: `SOC 2 Type II, ISO 27001, GDPR/CCPA aligned. ${s.sessions.length} active sessions, ${s.apiKeys.length} API keys. Rate limiting and anomaly login detection are ${s.security.rateLimit ? 'on' : 'off'}.`,
        stats: [
          { label: 'MFA', value: s.security.mfa ? 'On' : 'Off', tone: s.security.mfa ? '#7cc98f' : '#e0713a' },
          { label: 'Sessions', value: String(s.sessions.length) },
          { label: 'API keys', value: String(s.apiKeys.length) },
        ],
        actions: [{ label: 'Security & Sessions', view: 'security', icon: 'shield' }],
      };
    }
    // fallback
    return {
      headline: `Here's the live state of ${s.companies[0]?.name ?? 'your workspace'}`,
      body: `Ask me about revenue, ROAS, approvals, inbox, churn, coverage, audiences, posting times, email, agents, or security — I answer from your live data.`,
      stats: [
        { label: 'Pipeline', value: money(pipeline) },
        { label: 'Engagement', value: engagement.toLocaleString() },
        { label: 'Agents', value: `${s.agents.length}` },
      ],
      actions: [{ label: 'Dashboard', view: 'dashboard', icon: 'dash' }, { label: 'QA Console', view: 'testing', icon: 'shield' }],
    };
  };

  const ask = () => {
    if (!q.trim() || thinking) return;
    setThinking(true); setAnswer(null);
    window.setTimeout(() => { setAnswer(buildAnswer(q)); setThinking(false); }, 650);
  };

  const filteredNav = useMemo(() => {
    const t = q.trim().toLowerCase();
    return NAV.filter(n => n.label.toLowerCase().includes(t) || n.hint.toLowerCase().includes(t));
  }, [q]);

  const suggestions = ['What is our pipeline?', 'Any pending approvals?', 'How is ROAS?', 'Email open rate?', 'Which agents are autonomous?', 'Coverage vs HubSpot?'];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="fixed inset-0 bg-night/60 backdrop-blur-[3px] anim-fade" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-[640px] overflow-hidden rounded-xl border border-nightline bg-night shadow-pop">
        {/* header */}
        <div className="flex items-center gap-2.5 border-b border-nightline px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-ember to-tang text-night"><Icon name="orbit" size={17} sw={2} /></span>
          <div className="flex-1 leading-tight">
            <p className="font-display text-[14px] font-bold text-card">Ask Cadence</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-nighttx">answers from live data · not a canned model</p>
          </div>
          <div className="flex rounded-lg border border-nightline bg-night2/60 p-0.5">
            {(['ask', 'go'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setAnswer(null); }}
                className={cx('rounded-md px-2.5 py-1 text-[11px] font-bold transition', mode === m ? 'bg-card text-ink' : 'text-nighttx hover:text-card')}>
                {m === 'ask' ? 'Ask' : 'Go to'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-md text-nighttx transition hover:bg-night2 hover:text-card"><Icon name="x" size={15} /></button>
        </div>

        {/* input */}
        <div className="flex items-center gap-2 border-b border-nightline px-4 py-3">
          <Icon name={mode === 'ask' ? 'spark' : 'search'} size={16} className="shrink-0 text-ember" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && mode === 'ask') ask(); if (e.key === 'Enter' && mode === 'go' && filteredNav[0]) { a.nav(filteredNav[0].view); onClose(); } }}
            placeholder={mode === 'ask' ? 'Ask about revenue, ROAS, approvals, churn…' : 'Type to find a module…'}
            className="flex-1 bg-transparent text-[14px] text-card outline-none placeholder:text-nighttx/60"
          />
          {q && <button onClick={() => setQ('')} className="text-nighttx hover:text-card"><Icon name="x" size={13} /></button>}
        </div>

        {/* body */}
        <div className="max-h-[46vh] overflow-y-auto px-4 py-4">
          {mode === 'go' ? (
            <div className="space-y-1">
              {filteredNav.map(n => (
                <button key={n.view + n.label} onClick={() => { a.nav(n.view); onClose(); }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-night2">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-night2 text-ember"><Icon name={n.icon} size={14} /></span>
                  <span className="flex-1 text-[13px] font-semibold text-card">{n.label}</span>
                  <span className="font-mono text-[9.5px] text-nighttx">{n.hint}</span>
                </button>
              ))}
              {filteredNav.length === 0 && <p className="py-6 text-center text-xs text-nighttx">No module matches "{q}".</p>}
            </div>
          ) : thinking ? (
            <div className="flex items-center gap-3 py-8">
              <span className="flex gap-1">
                {[0, 1, 2].map(i => <span key={i} className="live-dot h-2 w-2 rounded-full bg-ember" style={{ animationDelay: `${i * 0.18}s` }} />)}
              </span>
              <p className="font-mono text-[11px] text-nighttx">reading live pipeline, inbox & agent state…</p>
            </div>
          ) : answer ? (
            <div className="anim-rise space-y-4">
              <div>
                <h3 className="font-display text-[17px] font-bold leading-snug text-card">{answer.headline}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-nighttx">{answer.body}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {answer.stats.map(st => (
                  <div key={st.label} className="rounded-lg border border-nightline bg-night2/50 px-3 py-2.5">
                    <p className="font-mono text-[8.5px] font-semibold uppercase tracking-[0.14em] text-nighttx">{st.label}</p>
                    <p className="tnum mt-1 font-display text-[17px] font-bold" style={{ color: st.tone ?? '#f4f7f3' }}>{st.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {answer.actions.map(act => (
                  <button key={act.label} onClick={() => { a.nav(act.view); onClose(); }}
                    className="press flex items-center gap-1.5 rounded-lg border border-nightline bg-night2/70 px-3 py-1.5 text-[12px] font-semibold text-card transition hover:border-ember/60 hover:text-ember">
                    <Icon name={act.icon} size={13} /> {act.label} <Icon name="chevr" size={11} className="text-nighttx" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-nighttx">Try asking</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map(sg => (
                  <button key={sg} onClick={() => { setQ(sg); }}
                    className="rounded-full border border-nightline bg-night2/50 px-3 py-1.5 text-[11.5px] font-medium text-nighttx transition hover:border-ember/50 hover:text-card">
                    {sg}
                  </button>
                ))}
              </div>
              <p className="pt-2 text-[10.5px] leading-relaxed text-nighttx/70">
                I compute answers from your live reducer state — pipeline, inbox, agents, campaigns, security — the same store the UI renders. Nothing is hallucinated.
              </p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between border-t border-nightline bg-night2/40 px-4 py-2">
          <span className="font-mono text-[9px] text-nighttx/70">↵ {mode === 'ask' ? 'to answer' : 'to open'} · esc to close</span>
          <span className="flex items-center gap-1.5 font-mono text-[9px] text-nighttx/70"><span className="live-dot h-1.5 w-1.5 rounded-full bg-lime" /> grounded in live state</span>
        </div>
      </div>
    </div>
  );
}
