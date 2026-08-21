import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Mail, Megaphone, ShoppingCart, 
  Headphones, FileText, BarChart3, Settings, Plus, 
  Search, Bell, HelpCircle, Globe, Zap, Layers, 
  MessageSquare, Calendar, TrendingUp, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data for Dashboard Widgets
const dashboardStats = [
  { title: 'Total Revenue', value: '$2.4M', change: '+12.5%', trend: 'up', icon: ShoppingCart },
  { title: 'Active Leads', value: '8,432', change: '+8.2%', trend: 'up', icon: Users },
  { title: 'Email Open Rate', value: '42.8%', change: '+2.1%', trend: 'up', icon: Mail },
  { title: 'Social Engagement', value: '15.6K', change: '-1.4%', trend: 'down', icon: Megaphone },
];

const recentActivities = [
  { id: 1, user: 'Sarah J.', action: 'converted lead', target: 'Acme Corp', time: '2m ago', type: 'success' },
  { id: 2, user: 'System', action: 'sent campaign', target: 'Q3 Newsletter', time: '15m ago', type: 'info' },
  { id: 3, user: 'Mike T.', action: 'closed deal', target: 'Global Tech', value: '$45k', time: '1h ago', type: 'success' },
  { id: 4, user: 'Bot', action: 'detected sentiment drop', target: 'Twitter Brand Monitor', time: '2h ago', type: 'warning' },
];

const upcomingTasks = [
  { id: 1, task: 'Review Q3 Budget', due: 'Today', priority: 'high' },
  { id: 2, task: 'Approve Social Calendar', due: 'Tomorrow', priority: 'medium' },
  { id: 3, task: 'Client Onboarding: Nexus', due: 'Wed', priority: 'high' },
];

interface ModuleProps {
  name: string;
  icon: any;
  color: string;
  description: string;
  features: string[];
}

const ecosystemModules: ModuleProps[] = [
  { name: 'CRM & Contacts', icon: Users, color: 'bg-blue-500', description: '360° Customer View', features: ['Custom Objects', 'Contact Merging', 'Lifecycle Stages'] },
  { name: 'Marketing Automation', icon: Zap, color: 'bg-purple-500', description: 'Visual Workflow Builder', features: ['Multi-step Journeys', 'Lead Scoring', 'A/B Testing'] },
  { name: 'Social Command', icon: Megaphone, color: 'bg-pink-500', description: 'Omni-channel Publishing', features: ['AI Optimization', 'Listening', 'Competitor Analysis'] },
  { name: 'Sales Pipeline', icon: ShoppingCart, color: 'bg-green-500', description: 'Deal Management', features: ['Forecasting', 'Email Sync', 'E-Signature'] },
  { name: 'Service Hub', icon: Headphones, color: 'bg-orange-500', description: 'Customer Support', features: ['Ticketing', 'Knowledge Base', 'Live Chat'] },
  { name: 'Content Studio', icon: FileText, color: 'bg-indigo-500', description: 'Asset Management', features: ['Landing Pages', 'Blog CMS', 'Video Hosting'] },
  { name: 'Analytics BI', icon: BarChart3, color: 'bg-teal-500', description: 'Deep Insights', features: ['Custom Dashboards', 'Attribution', 'Cohort Analysis'] },
  { name: 'App Market', icon: Layers, color: 'bg-gray-500', description: 'Integrations', features: ['Shopify', 'Slack', 'Salesforce', 'API'] },
];

export default function CadenceEcosystem() {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar Navigation */}
      <motion.aside 
        initial={{ width: sidebarOpen ? 280 : 80 }}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="bg-slate-900 text-white flex flex-col shadow-2xl z-20 relative"
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          {sidebarOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">Cadence OS</span>
            </motion.div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-slate-800 rounded-md transition-colors">
            <Layers size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <NavItem icon={LayoutDashboard} label="Dashboard" active={!activeModule} onClick={() => setActiveModule(null)} expanded={sidebarOpen} />
          <div className="pt-4 pb-2 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {sidebarOpen ? 'Core Modules' : '...'}
          </div>
          {ecosystemModules.map((mod) => (
            <NavItem 
              key={mod.name}
              icon={mod.icon} 
              label={mod.name} 
              active={activeModule === mod.name}
              onClick={() => setActiveModule(mod.name)}
              expanded={sidebarOpen}
              colorClass={mod.color.replace('bg-', 'text-')}
            />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <NavItem icon={Settings} label="Settings" expanded={sidebarOpen} />
          <NavItem icon={HelpCircle} label="Support" expanded={sidebarOpen} />
          {sidebarOpen && (
            <div className="mt-4 p-3 bg-slate-800 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-slate-300">System Operational</span>
              </div>
              <div className="text-xs text-slate-500">v2.6.0 (Aug 2026)</div>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search contacts, deals, campaigns..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md shadow-blue-200">
              <Plus size={16} />
              <span>Create New</span>
            </button>
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full border-2 border-white shadow-sm cursor-pointer"></div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 scroll-smooth">
          <AnimatePresence mode="wait">
            {!activeModule ? (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8 max-w-7xl mx-auto"
              >
                {/* Welcome Section */}
                <div className="flex justify-between items-end">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Good Morning, Alex</h1>
                    <p className="text-slate-500 mt-1">Here's what's happening in your marketing ecosystem today.</p>
                  </div>
                  <div className="flex gap-2">
                    <select className="bg-white border border-slate-200 text-slate-700 text-sm rounded-lg px-3 py-2 outline-none focus:border-blue-500">
                      <option>Last 30 Days</option>
                      <option>Last Quarter</option>
                      <option>Year to Date</option>
                    </select>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {dashboardStats.map((stat, idx) => (
                    <motion.div 
                      key={stat.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${stat.icon === ShoppingCart ? 'bg-green-100 text-green-600' : stat.icon === Users ? 'bg-blue-100 text-blue-600' : stat.icon === Mail ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'}`}>
                          <stat.icon size={20} />
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {stat.change}
                        </span>
                      </div>
                      <h3 className="text-slate-500 text-sm font-medium">{stat.title}</h3>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Main Grid: Activity & Modules */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* Left Column: Activity Feed */}
                  <div className="lg:col-span-2 space-y-8">
                    
                    {/* Activity Feed */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
                        <button className="text-sm text-blue-600 font-medium hover:underline">View All</button>
                      </div>
                      <div className="space-y-6">
                        {recentActivities.map((activity) => (
                          <div key={activity.id} className="flex gap-4 items-start">
                            <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${activity.type === 'success' ? 'bg-green-500' : activity.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                            <div className="flex-1">
                              <p className="text-sm text-slate-800">
                                <span className="font-semibold">{activity.user}</span> {activity.action} <span className="font-medium text-slate-900">{activity.target}</span>
                                {activity.value && <span className="text-green-600 font-semibold ml-1">({activity.value})</span>}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Quick Actions / Shortcuts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg shadow-blue-200">
                        <Mail className="mb-4 opacity-80" size={24} />
                        <h3 className="font-bold text-lg mb-1">Email Campaign</h3>
                        <p className="text-blue-100 text-sm mb-4">Launch your weekly newsletter to 5k subscribers.</p>
                        <button className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors">Create Now</button>
                      </div>
                      <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg shadow-purple-200">
                        <Users className="mb-4 opacity-80" size={24} />
                        <h3 className="font-bold text-lg mb-1">Import Contacts</h3>
                        <p className="text-purple-100 text-sm mb-4">Sync new leads from your latest webinar.</p>
                        <button className="bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-50 transition-colors">Start Import</button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Tasks & Upcoming */}
                  <div className="space-y-8">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                      <h2 className="text-lg font-bold text-slate-900 mb-4">Upcoming Tasks</h2>
                      <div className="space-y-4">
                        {upcomingTasks.map((task) => (
                          <div key={task.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${task.priority === 'high' ? 'border-red-500' : 'border-slate-300'}`}>
                              <div className="w-2.5 h-2.5 rounded-sm bg-transparent group-hover:bg-slate-300"></div>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-800">{task.task}</p>
                              <p className="text-xs text-slate-500">{task.due}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${task.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                              {task.priority}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button className="w-full mt-4 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium border border-dashed border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                        + Add Task
                      </button>
                    </div>

                    {/* System Health */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                      <h2 className="text-lg font-bold text-slate-900 mb-4">Ecosystem Health</h2>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">API Usage</span>
                            <span className="text-slate-900 font-bold">78%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">Storage</span>
                            <span className="text-slate-900 font-bold">42%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600 font-medium">Deliverability</span>
                            <span className="text-green-600 font-bold">99.8%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.8%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ecosystem Modules Grid (Quick Access) */}
                <div className="pt-4">
                  <h2 className="text-lg font-bold text-slate-900 mb-6">Explore Modules</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {ecosystemModules.map((mod, idx) => (
                      <motion.div
                        key={mod.name}
                        whileHover={{ y: -5, scale: 1.02 }}
                        onClick={() => setActiveModule(mod.name)}
                        className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-xl hover:border-blue-200 transition-all group"
                      >
                        <div className={`${mod.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4 shadow-md group-hover:scale-110 transition-transform`}>
                          <mod.icon size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg mb-1">{mod.name}</h3>
                        <p className="text-slate-500 text-sm mb-4">{mod.description}</p>
                        <ul className="space-y-2">
                          {mod.features.slice(0, 2).map((feat) => (
                            <li key={feat} className="text-xs text-slate-600 flex items-center gap-2">
                              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    ))}
                  </div>
                </div>

              </motion.div>
            ) : (
              <ModuleView moduleName={activeModule} onBack={() => setActiveModule(null)} />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Helper Components
function NavItem({ icon: Icon, label, active, onClick, expanded, colorClass = 'text-slate-400' }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
        ${active 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`}
    >
      <Icon size={20} className={`${active ? 'text-white' : colorClass} group-hover:text-white transition-colors`} />
      {expanded && (
        <motion.span 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-medium text-sm whitespace-nowrap"
        >
          {label}
        </motion.span>
      )}
      {!expanded && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
          {label}
        </div>
      )}
    </button>
  );
}

// Placeholder for Module Views (Will be expanded in next steps)
function ModuleView({ moduleName, onBack }: { moduleName: string, onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full flex flex-col"
    >
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
          <LayoutDashboard size={20} className="text-slate-500" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">{moduleName}</h1>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded uppercase">Beta</span>
      </div>
      
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="text-center z-10 max-w-md p-8">
          <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            {moduleName === 'CRM & Contacts' && <Users size={40} className="text-blue-500" />}
            {moduleName === 'Marketing Automation' && <Zap size={40} className="text-purple-500" />}
            {moduleName === 'Social Command' && <Megaphone size={40} className="text-pink-500" />}
            {moduleName === 'Sales Pipeline' && <ShoppingCart size={40} className="text-green-500" />}
            {moduleName === 'Service Hub' && <Headphones size={40} className="text-orange-500" />}
            {moduleName === 'Content Studio' && <FileText size={40} className="text-indigo-500" />}
            {moduleName === 'Analytics BI' && <BarChart3 size={40} className="text-teal-500" />}
            {moduleName === 'App Market' && <Layers size={40} className="text-gray-500" />}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Building {moduleName}...</h2>
          <p className="text-slate-500 mb-6">This module is being initialized with enterprise-grade features including custom objects, AI automation, and real-time sync capabilities.</p>
          <div className="flex gap-3 justify-center">
            <button className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">Initialize Database</button>
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">View Documentation</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
