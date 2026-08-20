import { Component, Suspense, lazy } from 'react';
import type { ComponentType, ErrorInfo, ReactNode } from 'react';
import { AppProvider, useApp } from './store';
import { Shell } from './components/Shell';
import { Login } from './components/Login';

/* ------------------------------------------------------------------
   Production loading strategy: every module is code-split with
   React.lazy, so the initial bundle carries only the shell + dashboard
   and heavy screens (BI, QA console, importers…) arrive on demand.
   ------------------------------------------------------------------ */
const L = (loader: Promise<{ default: ComponentType }>) => lazy(() => loader);
const Dashboard = L(import('./modules/Dashboard').then(m => ({ default: m.Dashboard })));
const Inbox = L(import('./modules/Inbox').then(m => ({ default: m.Inbox })));
const Tasks = L(import('./modules/Tasks').then(m => ({ default: m.Tasks })));
const Contacts = L(import('./modules/Contacts').then(m => ({ default: m.Contacts })));
const Deals = L(import('./modules/Deals').then(m => ({ default: m.Deals })));
const CalendarView = L(import('./modules/CalendarView').then(m => ({ default: m.CalendarView })));
const Campaigns = L(import('./modules/Campaigns').then(m => ({ default: m.Campaigns })));
const Marketing = L(import('./modules/Marketing').then(m => ({ default: m.Marketing })));
const Assets = L(import('./modules/Assets').then(m => ({ default: m.Assets })));
const Composer = L(import('./modules/Composer').then(m => ({ default: m.Composer })));
const AIStudio = L(import('./modules/AIStudio').then(m => ({ default: m.AIStudio })));
const Automations = L(import('./modules/Automations').then(m => ({ default: m.Automations })));
const Listening = L(import('./modules/Listening').then(m => ({ default: m.Listening })));
const Calls = L(import('./modules/Calls').then(m => ({ default: m.Calls })));
const Ads = L(import('./modules/Ads').then(m => ({ default: m.Ads })));
const Insights = L(import('./modules/Insights').then(m => ({ default: m.Insights })));
const Experiments = L(import('./modules/Experiments').then(m => ({ default: m.Experiments })));
const Attribution = L(import('./modules/Attribution').then(m => ({ default: m.Attribution })));
const Conversations = L(import('./modules/Conversations').then(m => ({ default: m.Conversations })));
const WebAnalytics = L(import('./modules/WebAnalytics').then(m => ({ default: m.WebAnalytics })));
const Seo = L(import('./modules/Seo').then(m => ({ default: m.Seo })));
const Cdp = L(import('./modules/Cdp').then(m => ({ default: m.Cdp })));
const EmailInfra = L(import('./modules/EmailInfra').then(m => ({ default: m.EmailInfra })));
const Importers = L(import('./modules/Importers').then(m => ({ default: m.Importers })));
const Launch = L(import('./modules/Launch').then(m => ({ default: m.Launch })));
const Testing = L(import('./modules/Testing').then(m => ({ default: m.Testing })));
const Settings = L(import('./modules/Settings').then(m => ({ default: m.Settings })));

function LoadingScreen() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <span className="cadence" style={{ color: '#e0913c' }} aria-hidden><i /><i /><i /><i /></span>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-mut">loading module…</p>
      </div>
    </div>
  );
}

function Router() {
  const { s } = useApp();
  const screen = (() => {
    switch (s.view) {
      case 'inbox': return <Inbox />;
      case 'tasks': return <Tasks />;
      case 'contacts': return <Contacts />;
      case 'deals': return <Deals />;
      case 'calendar': return <CalendarView />;
      case 'campaigns': return <Campaigns />;
    case 'marketing': return <Marketing />;
    case 'assets': return <Assets />;
    case 'ai': return <AIStudio />;      case 'automations': return <Automations />;
      case 'listening': return <Listening />;
      case 'calls': return <Calls />;
      case 'ads': return <Ads />;
      case 'insights': return <Insights />;
      case 'experiments': return <Experiments />;
      case 'attribution': return <Attribution />;
      case 'conversations': return <Conversations />;
      case 'web': return <WebAnalytics />;
      case 'seo': return <Seo />;
      case 'cdp': return <Cdp />;
      case 'emailinfra': return <EmailInfra />;
      case 'importers': return <Importers />;
      case 'launch': return <Launch />;
      case 'testing': return <Testing />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  })();
  return <Suspense fallback={<LoadingScreen />}>{screen}</Suspense>;
}

function Gate() {
  const { s } = useApp();
  return s.me
    ? (
      <>
        <Shell><Router /></Shell>
        <Suspense fallback={null}><Composer /></Suspense>
      </>
    )
    : <Login />;
}

/* Crash boundary — a render error shows a recovery screen instead of a
   blank page; the payload survives for the error report (Sentry in prod). */
class CrashBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    try { console.error('[cadence] render crash', error, info.componentStack); } catch { /* noop */ }
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="bg-dots grid min-h-screen place-items-center p-6">
        <div className="anim-pop w-full max-w-md rounded-xl border border-line bg-card p-6 shadow-pop">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-danger">runtime error · recovered boundary</p>
          <h1 className="font-display mt-2 text-[22px] font-bold tracking-tight text-ink">The workspace hit a snag</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-mut">
            Your data is safe in local storage. Reload to continue — if it repeats, reset the demo data below.
          </p>
          <pre className="mt-3 max-h-24 overflow-auto rounded-lg border border-line bg-paper/60 p-2.5 font-mono text-[10px] leading-relaxed text-danger">{String(this.state.error)}</pre>
          <div className="mt-4 flex gap-2">
            <button onClick={() => window.location.reload()} className="press h-9 flex-1 rounded-lg bg-moss text-[13px] font-semibold text-night shadow-btn transition-colors hover:bg-pine">Reload workspace</button>
            <button onClick={() => { try { localStorage.removeItem('cadence-v2'); } catch { /* noop */ } window.location.reload(); }}
              className="press h-9 flex-1 rounded-lg border border-line2 bg-card text-[13px] font-semibold text-ink transition hover:border-danger hover:text-danger">Reset demo data</button>
          </div>
        </div>
      </div>
    );
  }
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
