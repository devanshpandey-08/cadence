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
import { Tasks } from './modules/Tasks';
import { Testing } from './modules/Testing';
import { Settings } from './modules/Settings';
import { Launch } from './modules/Launch';
import { Composer } from './modules/Composer';

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
    <AppProvider>
      <Gate />
    </AppProvider>
  );
}
