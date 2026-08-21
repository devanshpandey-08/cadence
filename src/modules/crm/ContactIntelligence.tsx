import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, Activity, Mail, Phone, Calendar, MoreHorizontal, 
  Search, Filter, Plus, ArrowRightLeft, TrendingUp, MessageSquare, 
  FileText, Clock, CheckCircle, AlertCircle, Star, Share2, Download,
  Edit3, Trash2, Save, X, ChevronDown, ChevronUp, Hash, Type, DollarSign,
  GitMerge, Target, Zap, BarChart3, PieChart as PieChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

// --- Types ---

type LifecycleStage = 'Subscriber' | 'Lead' | 'MQL' | 'SQL' | 'Opportunity' | 'Customer' | 'Evangelist';

interface CustomProperty {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'dropdown' | 'boolean' | 'currency';
  value?: any;
  options?: string[];
}

interface Interaction {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note' | 'social';
  timestamp: string;
  summary: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  direction?: 'inbound' | 'outbound';
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  companyId?: string;
  lifecycleStage: LifecycleStage;
  leadScore: number;
  owner: string;
  createdAt: string;
  lastContacted: string;
  properties: CustomProperty[];
  interactions: Interaction[];
  tasks: { id: string; title: string; dueDate: string; completed: boolean }[];
  avatarUrl?: string;
}

interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  annualRevenue: number;
  employeeCount: number;
  parentId?: string;
  contacts: string[];
}

// --- Mock Data ---

const MOCK_PROPERTIES: CustomProperty[] = [
  { id: '1', name: 'Industry', type: 'dropdown', options: ['Tech', 'Finance', 'Healthcare', 'Retail'], value: 'Tech' },
  { id: '2', name: 'Annual Budget', type: 'currency', value: 50000 },
  { id: '3', name: 'Decision Maker', type: 'boolean', value: true },
  { id: '4', name: 'Last Demo Date', type: 'date', value: '2026-08-15' },
  { id: '5', name: 'Interest Level', type: 'number', value: 8 },
];

const MOCK_INTERACTIONS: Interaction[] = [
  { id: '1', type: 'email', timestamp: '2026-08-20T10:30:00', summary: 'Re: Q4 Pricing Proposal', sentiment: 'positive', direction: 'inbound' },
  { id: '2', type: 'call', timestamp: '2026-08-19T14:15:00', summary: 'Discovery Call - Discussed pain points', sentiment: 'neutral', direction: 'outbound' },
  { id: '3', type: 'meeting', timestamp: '2026-08-15T09:00:00', summary: 'Product Demo with CTO', sentiment: 'positive' },
  { id: '4', type: 'social', timestamp: '2026-08-10T11:20:00', summary: 'Liked post on LinkedIn', sentiment: 'positive' },
  { id: '5', type: 'note', timestamp: '2026-08-01T16:45:00', summary: 'Initial inbound lead from webinar', sentiment: 'neutral' },
];

const MOCK_CONTACTS: Contact[] = [
  {
    id: 'c1',
    firstName: 'Sarah',
    lastName: 'Connor',
    email: 'sarah@skynet.com',
    phone: '+1 (555) 123-4567',
    jobTitle: 'CTO',
    companyId: 'comp1',
    lifecycleStage: 'Opportunity',
    leadScore: 92,
    owner: 'Alex Johnson',
    createdAt: '2026-01-15',
    lastContacted: '2026-08-20',
    properties: MOCK_PROPERTIES,
    interactions: MOCK_INTERACTIONS,
    tasks: [
      { id: 't1', title: 'Send contract', dueDate: '2026-08-22', completed: false },
      { id: 't2', title: 'Schedule technical review', dueDate: '2026-08-25', completed: false }
    ],
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026704d'
  },
  {
    id: 'c2',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@acme.com',
    phone: '+1 (555) 987-6543',
    jobTitle: 'Marketing Director',
    companyId: 'comp2',
    lifecycleStage: 'MQL',
    leadScore: 65,
    owner: 'Alex Johnson',
    createdAt: '2026-03-10',
    lastContacted: '2026-08-18',
    properties: MOCK_PROPERTIES,
    interactions: MOCK_INTERACTIONS.slice(0, 2),
    tasks: [],
    avatarUrl: 'https://i.pravatar.cc/150?u=a042581f4e29026024d'
  }
];

const LIFECYCLE_COLORS: Record<LifecycleStage, string> = {
  'Subscriber': 'bg-gray-400',
  'Lead': 'bg-blue-400',
  'MQL': 'bg-indigo-400',
  'SQL': 'bg-purple-400',
  'Opportunity': 'bg-orange-400',
  'Customer': 'bg-green-500',
  'Evangelist': 'bg-pink-500'
};

const ENGAGEMENT_DATA = [
  { name: 'Mon', emails: 40, calls: 24, meetings: 12 },
  { name: 'Tue', emails: 30, calls: 18, meetings: 8 },
  { name: 'Wed', emails: 55, calls: 32, meetings: 15 },
  { name: 'Thu', emails: 20, calls: 12, meetings: 5 },
  { name: 'Fri', emails: 65, calls: 40, meetings: 20 },
  { name: 'Sat', emails: 45, calls: 25, meetings: 10 },
  { name: 'Sun', emails: 30, calls: 15, meetings: 6 },
];

const PIPELINE_DATA = [
  { name: 'Leads', value: 400, color: '#6366f1' },
  { name: 'MQL', value: 300, color: '#8b5cf6' },
  { name: 'SQL', value: 200, color: '#ec4899' },
  { name: 'Opp', value: 100, color: '#f97316' },
  { name: 'Closed', value: 50, color: '#22c55e' },
];

// --- Sub-Components ---

const PropertyEditor = ({ property, onUpdate }: { property: CustomProperty; onUpdate: (p: CustomProperty) => void }) => {
  const renderInput = () => {
    switch (property.type) {
      case 'dropdown':
        return (
          <Select value={property.value} onValueChange={(v) => onUpdate({ ...property, value: v })}>
            <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {property.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
            </SelectContent>
          </Select>
        );
      case 'boolean':
        return <Switch checked={property.value} onCheckedChange={(c) => onUpdate({ ...property, value: c })} className="scale-75" />;
      case 'currency':
        return (
          <div className="flex items-center border rounded-md px-2 h-8 bg-background">
            <span className="text-gray-500 mr-1">$</span>
            <input type="number" className="w-full bg-transparent border-none outline-none text-sm" value={property.value} onChange={(e) => onUpdate({ ...property, value: parseFloat(e.target.value) })} />
          </div>
        );
      case 'date':
        return <Input type="date" className="h-8 text-xs" value={property.value} onChange={(e) => onUpdate({ ...property, value: e.target.value })} />;
      default:
        return <Input type="text" className="h-8 text-xs" value={property.value || ''} onChange={(e) => onUpdate({ ...property, value: e.target.value })} />;
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-700">{property.name}</span>
        <span className="text-[10px] text-gray-400 uppercase">{property.type}</span>
      </div>
      <div className="w-1/2">{renderInput()}</div>
    </div>
  );
};

const MergeConflictResolver = ({ contact1, contact2, onMerge }: { contact1: Contact; contact2: Contact; onMerge: () => void }) => {
  const [selected, setSelected] = useState<Record<string, 'left' | 'right'>>({});
  const fields = ['firstName', 'lastName', 'email', 'phone', 'jobTitle'];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Resolve Duplicates</h3>
        <Badge variant="destructive">Potential Match: 98%</Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center text-sm font-medium text-gray-500">Keep Left</div>
        <div className="text-center text-sm font-medium text-gray-500">Field</div>
        <div className="text-center text-sm font-medium text-gray-500">Keep Right</div>
      </div>

      {fields.map(field => (
        <div key={field} className="grid grid-cols-3 gap-4 items-center">
          <button onClick={() => setSelected({...selected, [field]: 'left'})} className={`p-2 rounded border text-sm truncate ${selected[field] === 'left' ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-200' : 'hover:bg-gray-50'}`}>
            {(contact1 as any)[field]}
          </button>
          <div className="text-center text-xs text-gray-400 uppercase">{field}</div>
          <button onClick={() => setSelected({...selected, [field]: 'right'})} className={`p-2 rounded border text-sm truncate ${selected[field] === 'right' ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-200' : 'hover:bg-gray-50'}`}>
            {(contact2 as any)[field]}
          </button>
        </div>
      ))}

      <DialogFooter className="mt-6">
        <Button variant="outline" onClick={onMerge}>Cancel</Button>
        <Button onClick={onMerge} className="bg-blue-600 hover:bg-blue-700">
          <GitMerge className="w-4 h-4 mr-2" /> Merge Contacts
        </Button>
      </DialogFooter>
    </div>
  );
};

export default function ContactIntelligence() {
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [selectedContactId, setSelectedContactId] = useState<string | null>('c1');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  const filteredContacts = contacts.filter(c => 
    c.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdateProperty = (contactId: string, propId: string, newValue: any) => {
    setContacts(prev => prev.map(c => {
      if (c.id !== contactId) return c;
      return { ...c, properties: c.properties.map(p => p.id === propId ? { ...p, value: newValue } : p) };
    }));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 overflow-hidden">
      
      {/* --- Left Sidebar: Contact List --- */}
      <div className="w-80 border-r bg-white flex flex-col">
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input placeholder="Search contacts..." className="pl-8 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setViewMode('list')}>
              <Users className="w-3 h-3 mr-1" /> List
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={() => setViewMode('board')}>
              <BarChart3 className="w-3 h-3 mr-1" /> Board
            </Button>
          </div>
          <Button className="w-full h-9 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Contact
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {filteredContacts.map(contact => (
              <motion.div
                key={contact.id}
                layoutId={contact.id}
                onClick={() => setSelectedContactId(contact.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                  selectedContactId === contact.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={contact.avatarUrl} />
                    <AvatarFallback>{contact.firstName[0]}{contact.lastName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm truncate">{contact.firstName} {contact.lastName}</h4>
                      <Badge variant="secondary" className={`text-[10px] h-4 px-1.5 ${LIFECYCLE_COLORS[contact.lifecycleStage]} text-white border-none`}>
                        {contact.lifecycleStage}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{contact.jobTitle}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs font-medium">{contact.leadScore}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">• Last seen 2h ago</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-3 border-t bg-gray-50">
          <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500" onClick={() => setIsMergeModalOpen(true)}>
            <GitMerge className="w-3 h-3 mr-2" /> Find Duplicates
          </Button>
        </div>
      </div>

      {/* --- Main Content: Contact Details --- */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          
          {/* Header */}
          <header className="bg-white border-b p-6 flex justify-between items-start">
            <div className="flex gap-4">
              <Avatar className="h-20 w-20 border-2 border-white shadow-md">
                <AvatarImage src={selectedContact.avatarUrl} />
                <AvatarFallback className="text-xl">{selectedContact.firstName[0]}{selectedContact.lastName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">{selectedContact.firstName} {selectedContact.lastName}</h1>
                  <Badge variant="outline" className="text-xs font-normal">{selectedContact.owner}</Badge>
                </div>
                <p className="text-gray-600 mt-1">{selectedContact.jobTitle} at <span className="font-medium text-blue-600 cursor-pointer hover:underline">{selectedContact.companyId}</span></p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {selectedContact.email}</span>
                  <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedContact.phone}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Created {selectedContact.createdAt}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon"><Share2 className="w-4 h-4" /></Button><TooltipContent>Share Profile</TooltipContent></Tooltip>
              </TooltipProvider>
              <Button variant="outline" size="icon"><Edit3 className="w-4 h-4" /></Button>
              <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Calendar className="w-4 h-4 mr-2" /> Book Meeting
              </Button>
            </div>
          </header>

          {/* Tabs Content */}
          <div className="flex-1 overflow-hidden flex">
            <Tabs defaultValue="overview" className="w-full flex flex-col">
              <div className="px-6 pt-4 border-b bg-white">
                <TabsList className="h-10 bg-gray-100 p-1">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Activity Timeline</TabsTrigger>
                  <TabsTrigger value="properties" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Custom Properties</TabsTrigger>
                  <TabsTrigger value="tasks" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Tasks & Notes</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="flex-1 p-6">
                <TabsContent value="overview" className="space-y-6 mt-0">
                  
                  {/* Top Stats Row */}
                  <div className="grid grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-gray-500 uppercase">Lead Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{selectedContact.leadScore}</div>
                        <Progress value={selectedContact.leadScore} className="h-1.5 mt-2" />
                        <p className="text-[10px] text-gray-400 mt-1">Top 5% of leads</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-gray-500 uppercase">Lifecycle Stage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${LIFECYCLE_COLORS[selectedContact.lifecycleStage]}`}></div>
                          <span className="text-lg font-semibold">{selectedContact.lifecycleStage}</span>
                        </div>
                        <Button variant="link" className="h-auto p-0 text-xs text-blue-600 mt-1">Change Stage</Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-gray-500 uppercase">Est. Revenue</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">$45,000</div>
                        <p className="text-[10px] text-green-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> +12% from last interaction
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-medium text-gray-500 uppercase">Next Action</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-sm font-medium">Send Contract</div>
                        <p className="text-[10px] text-gray-400">Due Tomorrow</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    {/* Left Column: Properties Preview */}
                    <div className="col-span-2 space-y-6">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                          <CardTitle className="text-sm font-semibold">Key Properties</CardTitle>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsPropertyModalOpen(true)}>
                            <Edit3 className="w-3 h-3 mr-1" /> Edit All
                          </Button>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            {selectedContact.properties.slice(0, 6).map(prop => (
                              <div key={prop.id} className="space-y-1">
                                <Label className="text-[10px] text-gray-500 uppercase">{prop.name}</Label>
                                <div className="text-sm font-medium truncate">{String(prop.value)}</div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">Engagement Analytics</CardTitle>
                        </CardHeader>
                        <CardContent className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ENGAGEMENT_DATA}>
                              <defs>
                                <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                              <Area type="monotone" dataKey="emails" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEmails)" />
                              <Area type="monotone" dataKey="calls" stroke="#22c55e" fillOpacity={0} fill="#22c55e" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right Column: Quick Actions & Hierarchy */}
                    <div className="space-y-6">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">Quick Log</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <Button variant="outline" className="w-full justify-start h-9 text-sm" size="sm">
                            <Mail className="w-4 h-4 mr-2 text-blue-500" /> Send Email
                          </Button>
                          <Button variant="outline" className="w-full justify-start h-9 text-sm" size="sm">
                            <Phone className="w-4 h-4 mr-2 text-green-500" /> Log Call
                          </Button>
                          <Button variant="outline" className="w-full justify-start h-9 text-sm" size="sm">
                            <MessageSquare className="w-4 h-4 mr-2 text-purple-500" /> Add Note
                          </Button>
                          <Button variant="outline" className="w-full justify-start h-9 text-sm" size="sm">
                            <Calendar className="w-4 h-4 mr-2 text-orange-500" /> Schedule Task
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">Company Hierarchy</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-2 bg-gray-50 rounded border">
                              <Building2 className="w-4 h-4 text-gray-500" />
                              <div>
                                <div className="text-sm font-medium">Skynet Systems</div>
                                <div className="text-[10px] text-gray-500">Parent Company</div>
                              </div>
                            </div>
                            <div className="pl-4 border-l-2 border-gray-200 ml-2 space-y-2">
                              <div className="text-xs text-gray-500">Subsidiaries (2)</div>
                              <div className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer hover:underline">
                                <Building2 className="w-3 h-3" /> Cyberdyne Systems
                              </div>
                              <div className="flex items-center gap-2 text-xs text-blue-600 cursor-pointer hover:underline">
                                <Building2 className="w-3 h-3" /> Dyson Corp
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold">Pipeline Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={PIPELINE_DATA} innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">
                                {PIPELINE_DATA.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="mt-0">
                  <div className="max-w-3xl mx-auto space-y-6">
                    {selectedContact.interactions.map((interaction, idx) => (
                      <div key={interaction.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                            interaction.type === 'email' ? 'bg-blue-100 text-blue-600' :
                            interaction.type === 'call' ? 'bg-green-100 text-green-600' :
                            interaction.type === 'meeting' ? 'bg-purple-100 text-purple-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {interaction.type === 'email' && <Mail className="w-4 h-4" />}
                            {interaction.type === 'call' && <Phone className="w-4 h-4" />}
                            {interaction.type === 'meeting' && <Calendar className="w-4 h-4" />}
                            {interaction.type === 'note' && <FileText className="w-4 h-4" />}
                            {interaction.type === 'social' && <Activity className="w-4 h-4" />}
                          </div>
                          {idx !== selectedContact.interactions.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1"></div>}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="bg-white p-4 rounded-lg border shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm">{interaction.summary}</h4>
                              <span className="text-[10px] text-gray-400">{new Date(interaction.timestamp).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-2">
                              {interaction.sentiment && (
                                <Badge variant="outline" className={`text-[10px] h-5 ${
                                  interaction.sentiment === 'positive' ? 'bg-green-50 text-green-700 border-green-200' :
                                  interaction.sentiment === 'negative' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-gray-50 text-gray-700 border-gray-200'
                                }`}>
                                  {interaction.sentiment.toUpperCase()}
                                </Badge>
                              )}
                              {interaction.direction && (
                                <Badge variant="secondary" className="text-[10px] h-5">{interaction.direction.toUpperCase()}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="properties" className="mt-0">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Custom Property Manager</CardTitle>
                        <CardDescription>Add, edit, or remove custom fields for this contact.</CardDescription>
                      </div>
                      <Button size="sm" onClick={() => setIsPropertyModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" /> Add Property
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg divide-y">
                        {selectedContact.properties.map(prop => (
                          <PropertyEditor key={prop.id} property={prop} onUpdate={(updated) => handleUpdateProperty(selectedContact.id, prop.id, updated.value)} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="tasks" className="mt-0">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">Upcoming Tasks</h3>
                      <Button size="sm" variant="outline"><Plus className="w-3 h-3 mr-1" /> New Task</Button>
                    </div>
                    {selectedContact.tasks.map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${task.completed ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                          {task.completed && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm ${task.completed ? 'line-through text-gray-400' : 'font-medium'}`}>{task.title}</p>
                          <p className="text-xs text-gray-500">Due: {task.dueDate}</p>
                        </div>
                        <Badge variant={task.completed ? 'secondary' : 'destructive'} className="text-[10px]">
                          {task.completed ? 'Completed' : 'Pending'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>Select a contact to view details</p>
          </div>
        </div>
      )}

      {/* --- Modals --- */}
      
      <Dialog open={isMergeModalOpen} onOpenChange={setIsMergeModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Merge Contacts</DialogTitle>
            <DialogDescription>Review duplicates and select which information to keep.</DialogDescription>
          </DialogHeader>
          <MergeConflictResolver contact1={contacts[0]} contact2={contacts[1]} onMerge={() => { alert("Contacts merged successfully!"); setIsMergeModalOpen(false); }} />
        </DialogContent>
      </Dialog>

      <Dialog open={isPropertyModalOpen} onOpenChange={setIsPropertyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Custom Properties</DialogTitle>
            <DialogDescription>Create new fields or modify existing ones.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Field Name</Label>
                <Input placeholder="e.g., Favorite Color" />
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="dropdown">Dropdown</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="req" />
              <Label htmlFor="req">Required Field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPropertyModalOpen(false)}>Cancel</Button>
            <Button onClick={() => setIsPropertyModalOpen(false)}>Save Property</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
