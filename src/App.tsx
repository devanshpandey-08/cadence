import { AppProvider, useApp } from './store';
import { Shell } from './components/Shell';
import { Dashboard } from './modules/Dashboard';
import { Contacts } from './modules/Contacts';
import { Deals } from './modules/Deals';
import { CalendarView } from './modules/CalendarView';
import { Inbox } from './modules/Inbox';
import { Campaigns } from './modules/Campaigns';
import { Marketing } from './modules/Marketing';
import { Tasks } from './modules/Tasks';
import { Settings } from './modules/Settings';
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
    case 'settings': return <Settings />;
    default: return <Dashboard />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <Shell>
        <Router />
      </Shell>
      <Composer />
    </AppProvider>
  );
}
