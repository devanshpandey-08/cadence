import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AppProvider, useApp } from './store';
import { Shell } from './components/Shell';
import { Login } from './components/Login';
import { Dashboard } from './modules/Dashboard';
import { Contacts } from './modules/Contacts';
import { Deals } from './modules/Deals';
import { CalendarView } from './modules/CalendarView';
import { Inbox } from './modules/Inbox';
import { Campaigns } from './modules/Campaigns';
import { Marketing } from './modules/Marketing';
import { AIStudio } from './modules/AIStudio';
import { Automations } from './modules/Automations';
import { Listening } from './modules/Listening';
import { Calls } from './modules/Calls';
import { Ads } from './modules/Ads';
import { Insights } from './modules/Insights';
import { Experiments } from './modules/Experiments';
import { Attribution } from './modules/Attribution';
import { Conversations } from './modules/Conversations';
import { WebAnalytics } from './modules/WebAnalytics';
import { Seo } from './modules/Seo';
import { Agents } from './modules/Agents';
import { Assets } from './modules/Assets';
import { Cdp } from './modules/Cdp';
import { EmailInfra } from './modules/EmailInfra';
import { Importers } from './modules/Importers';
import { Security } from './modules/Security';
import { Tasks } from './modules/Tasks';
import { Testing } from './modules/Testing';
import { Settings } from './modules/Settings';
import { Launch } from './modules/Launch';
import { Composer } from './modules/Composer';

class CrashBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    try { console.error('[cadence] render crash', error, info.componentStack); } catch { /* noop */ }
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-dots p-6">
        <div className="anim-pop w-full max-w-md rounded-xl border border-line bg-card p-6 shadow-pop">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-danger">runtime error · recovered boundary</p>
          <h1 className="mt-2 font-display text-[22px] font-bold tracking-tight text-ink">The workspace hit a snag</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-mut">Your data is safe in local storage. Reload to continue — if it repeats, reset the demo data below.</p>
          <pre className="mt-3 max-h-24 overflow-auto rounded-lg border border-line bg-paper/60 p-2.5 font-mono text-[10px] leading-relaxed text-danger">{String(this.state.error)}</pre>
          <div className="mt-4 flex gap-2">
            <button onClick={() => window.location.reload()} className="press h-9 flex-1 rounded-lg bg-moss text-[13px] font-semibold text-night shadow-btn transition-colors hover:bg-pine">Reload workspace</button>
            <button onClick={() => { try { localStorage.removeItem('cadence-v2'); } catch { /* noop */ } window.location.reload(); }} className="press h-9 flex-1 rounded-lg border border-line2 bg-card text-[13px] font-semibold text-ink transition hover:border-danger hover:text-danger">Reset demo data</button>
          </div>
        </div>
      </div>
    );
  }
}

function Router() {
  const { s } = useApp();
  switch (s.view) {
    case 'inbox': return <Inbox />;
    case 'tasks': return <Tasks />;
    case 'contacts': return <Contacts />;
    case 'deals': return <Deals />;
    case 'calendar': return <CalendarView />;
    case 'campaigns': return <Campaigns />;
    case 'marketing': return <Marketing />;
    case 'ai': return <AIStudio />;
    case 'automations': return <Automations />;
    case 'listening': return <Listening />;
    case 'calls': return <Calls />;
    case 'ads': return <Ads />;
    case 'insights': return <Insights />;
    case 'experiments': return <Experiments />;
    case 'attribution': return <Attribution />;
    case 'conversations': return <Conversations />;
    case 'web': return <WebAnalytics />;
    case 'seo': return <Seo />;
    case 'agents': return <Agents />;
    case 'assets': return <Assets />;
    case 'cdp': return <Cdp />;
    case 'emailinfra': return <EmailInfra />;
    case 'importers': return <Importers />;
    case 'security': return <Security />;
    case 'launch': return <Launch />;
    case 'testing': return <Testing />;
    case 'settings': return <Settings />;
    default: return <Dashboard />;
  }
}

function Gate() {
  const { s } = useApp();
  if (!s.me) return <Login />;
  return (
    <>
      <Shell>
        <Router />
      </Shell>
      <Composer />
    </>
  );
}

export default function App() {
  return (
    <CrashBoundary>
      <AppProvider>
        <Gate />
      </AppProvider>
    </CrashBoundary>
  );
}
