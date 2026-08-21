import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, uid, TODAY, relTime } from '../meta';
import type { Ticket } from '../types';
import { Avatar, Btn, Card, Drawer, Field, IconBtn, Modal, Pill, Tag, inputCls } from '../components/ui';

export interface ServiceTicket {
  id: string;
  subject: string;
  status: 'open' | 'waiting' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'billing' | 'general' | 'feature';
  contactId: string;
  contactName: string;
  contactEmail: string;
  assignee?: string;
  createdAt: string;
  updatedAt: string;
  slaDue?: string;
  csat?: number;
  nps?: number;
  messages: Array<{
    id: string;
    from: 'customer' | 'agent' | 'system';
    text: string;
    at: string;
    attachments?: string[];
  }>;
  tags: string[];
  source: 'email' | 'chat' | 'form' | 'phone' | 'social';
}

const PRIORITY_COLORS = {
  low: { bg: '#e8f4f8', text: '#1a7fa4', border: '#b8dbe8' },
  medium: { bg: '#fff8e6', text: '#b5790a', border: '#f0d8a8' },
  high: { bg: '#ffe8e6', text: '#c41e3a', border: '#f5c2c0' },
  urgent: { bg: '#4a0404', text: '#ffffff', border: '#8b0000' },
};

const STATUS_META = {
  open: { color: '#3e7cb1', label: 'Open' },
  waiting: { color: '#b5790a', label: 'Waiting on Customer' },
  closed: { color: '#0e7a52', label: 'Closed' },
};

const SAMPLE_TICKETS: ServiceTicket[] = [
  {
    id: uid(),
    subject: 'Integration with Shopify not syncing orders',
    status: 'open',
    priority: 'high',
    category: 'technical',
    contactId: 'c1',
    contactName: 'Sarah Johnson',
    contactEmail: 'sarah@techcorp.com',
    assignee: 'Maya Chen',
    createdAt: '2025-08-20T09:30:00',
    updatedAt: '2025-08-20T14:22:00',
    slaDue: '2025-08-21T09:30:00',
    messages: [
      { id: uid(), from: 'customer', text: 'Hi, our Shopify orders haven\'t synced since yesterday evening. This is affecting our fulfillment.', at: '2025-08-20T09:30:00' },
      { id: uid(), from: 'agent', text: 'Hi Sarah, I\'m looking into this now. Can you confirm which integration version you\'re running?', at: '2025-08-20T10:15:00' },
      { id: uid(), from: 'customer', text: 'We\'re on v2.4.1', at: '2025-08-20T14:22:00' },
    ],
    tags: ['shopify', 'integration', 'bug'],
    source: 'email',
  },
  {
    id: uid(),
    subject: 'Question about enterprise pricing',
    status: 'waiting',
    priority: 'medium',
    category: 'billing',
    contactId: 'c2',
    contactName: 'Michael Torres',
    contactEmail: 'm.torres@growthco.io',
    assignee: 'Jonas Berg',
    createdAt: '2025-08-19T16:45:00',
    updatedAt: '2025-08-20T11:00:00',
    slaDue: '2025-08-22T16:45:00',
    messages: [
      { id: uid(), from: 'customer', text: 'We\'re interested in upgrading to Enterprise. Can you share detailed pricing for 50K contacts?', at: '2025-08-19T16:45:00' },
      { id: uid(), from: 'agent', text: 'Absolutely! I\'ll have our sales team prepare a custom quote. Do you need multi-brand support?', at: '2025-08-20T11:00:00' },
    ],
    tags: ['pricing', 'enterprise', 'upgrade'],
    source: 'form',
  },
  {
    id: uid(),
    subject: 'Feature request: Bulk social media scheduling',
    status: 'open',
    priority: 'low',
    category: 'feature',
    contactId: 'c3',
    contactName: 'Emma Wilson',
    contactEmail: 'emma@creativestudio.co',
    createdAt: '2025-08-18T13:20:00',
    updatedAt: '2025-08-18T13:20:00',
    messages: [
      { id: uid(), from: 'customer', text: 'Would love to see bulk upload for social posts with CSV. Currently have to create each one manually.', at: '2025-08-18T13:20:00' },
    ],
    tags: ['feature-request', 'social', 'bulk'],
    source: 'chat',
  },
];

export function ServiceHub() {
  const { s, a } = useApp();
  const [tickets, setTickets] = useState<ServiceTicket[]>(SAMPLE_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchQ, setSearchQ] = useState('');
  const [newTicketModal, setNewTicketModal] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState(true);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      if (searchQ && !t.subject.toLowerCase().includes(searchQ.toLowerCase()) && 
          !t.contactName.toLowerCase().includes(searchQ.toLowerCase())) return false;
      return true;
    });
  }, [tickets, filterStatus, filterPriority, searchQ]);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    waiting: tickets.filter(t => t.status === 'waiting').length,
    closed: tickets.filter(t => t.status === 'closed').length,
    avgResponseTime: '2h 14m',
    csatAvg: 4.6,
    npsAvg: 72,
  }), [tickets]);

  const handleCreateTicket = (data: Partial<ServiceTicket>) => {
    const newTicket: ServiceTicket = {
      id: uid(),
      subject: data.subject || 'New ticket',
      status: 'open',
      priority: data.priority || 'medium',
      category: data.category || 'general',
      contactId: data.contactId || '',
      contactName: data.contactName || 'Unknown',
      contactEmail: data.contactEmail || '',
      assignee: data.assignee,
      createdAt: TODAY,
      updatedAt: TODAY,
      messages: [{ id: uid(), from: 'customer', text: data.messages?.[0]?.text || '', at: TODAY }],
      tags: data.tags || [],
      source: data.source || 'email',
    };
    setTickets([newTicket, ...tickets]);
    setNewTicketModal(false);
  };

  const handleAddMessage = (ticketId: string, text: string, from: 'agent' | 'customer') => {
    setTickets(tickets.map(t => 
      t.id === ticketId 
        ? { ...t, messages: [...t.messages, { id: uid(), from, text, at: TODAY }], updatedAt: TODAY }
        : t
    ));
  };

  const handleUpdateStatus = (ticketId: string, status: ServiceTicket['status']) => {
    setTickets(tickets.map(t => t.id === ticketId ? { ...t, status, updatedAt: TODAY } : t));
  };

  const handleUpdatePriority = (ticketId: string, priority: ServiceTicket['priority']) => {
    setTickets(tickets.map(t => t.id === ticketId ? { ...t, priority, updatedAt: TODAY } : t));
  };

  const handleAssignTicket = (ticketId: string, assignee: string) => {
    setTickets(tickets.map(t => t.id === ticketId ? { ...t, assignee, updatedAt: TODAY } : t));
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <StatCard icon="inbox" label="Total Tickets" value={stats.total.toString()} color="#3e7cb1" />
        <StatCard icon="circle" label="Open" value={stats.open.toString()} color="#3e7cb1" />
        <StatCard icon="hourglass" label="Waiting" value={stats.waiting.toString()} color="#b5790a" />
        <StatCard icon="checksq" label="Closed" value={stats.closed.toString()} color="#0e7a52" />
        <StatCard icon="clock" label="Avg Response" value={stats.avgResponseTime} color="#7a5fa8" />
        <StatCard icon="star" label="CSAT" value={stats.csatAvg.toString()} color="#e8a43d" />
        <StatCard icon="heart" label="NPS" value={stats.npsAvg.toString()} color="#e2618f" />
        <StatCard icon="shield" label="SLA Met" value="98.2%" color="#0e7a52" />
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input
                  className="h-9 w-[280px] rounded-lg border border-line2 bg-card pl-9 pr-3 text-sm outline-none focus:border-moss"
                  placeholder="Search tickets..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-lg border border-line2 bg-card px-3 text-sm outline-none focus:border-moss"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="waiting">Waiting</option>
                <option value="closed">Closed</option>
              </select>
              <select
                className="h-9 rounded-lg border border-line2 bg-card px-3 text-sm outline-none focus:border-moss"
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Btn variant="secondary" onClick={() => setKnowledgeBase(!knowledgeBase)}>
                <Icon name="book" size={16} className="mr-2" />
                Knowledge Base
              </Btn>
              <Btn onClick={() => setNewTicketModal(true)}>
                <Icon name="plus" size={16} className="mr-2" />
                New Ticket
              </Btn>
            </div>
          </div>

          {/* Ticket Table */}
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-paper border-b border-line">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-faint">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-faint">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-faint">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-faint">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-faint">Assignee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-faint">Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr
                    key={ticket.id}
                    className="border-b border-line/50 hover:bg-mint/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedTicket(ticket)}
                  >
                    <td className="px-4 py-3">
                      <div className="max-w-[300px] truncate text-sm font-medium text-ink">{ticket.subject}</div>
                      <div className="text-xs text-faint mt-0.5">{ticket.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={ticket.contactName} size={24} />
                        <div>
                          <div className="text-sm text-ink">{ticket.contactName}</div>
                          <div className="text-xs text-faint">{ticket.contactEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Pill
                        text={STATUS_META[ticket.status].label}
                        color={STATUS_META[ticket.status].color}
                        tint={`${STATUS_META[ticket.status].color}20`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                        style={{
                          backgroundColor: PRIORITY_COLORS[ticket.priority].bg,
                          color: PRIORITY_COLORS[ticket.priority].text,
                          border: `1px solid ${PRIORITY_COLORS[ticket.priority].border}`,
                        }}
                      >
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={ticket.assignee} size={20} />
                          <span className="text-sm text-ink">{ticket.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-faint">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-faint">{relTime(new Date(ticket.updatedAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Sidebar - SLA & Queues */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-ink mb-3">My Queues</h3>
            <div className="space-y-2">
              {['Unassigned', 'My Tickets', 'Overdue', 'Escalated'].map(queue => (
                <button
                  key={queue}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-mint/50 transition-colors text-left"
                >
                  <span className="text-sm text-ink">{queue}</span>
                  <span className="text-xs text-faint bg-paper px-2 py-0.5 rounded-full">
                    {queue === 'Unassigned' ? tickets.filter(t => !t.assignee).length :
                     queue === 'My Tickets' ? tickets.filter(t => t.assignee === 'Maya Chen').length :
                     queue === 'Overdue' ? tickets.filter(t => t.slaDue && new Date(t.slaDue) < new Date()).length :
                     tickets.filter(t => t.priority === 'urgent').length}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink mb-3">SLA Performance</h3>
            <div className="space-y-3">
              <SLAMetric label="First Response Time" target="< 2h" actual="1h 42m" met={true} />
              <SLAMetric label="Resolution Time" target="< 24h" actual="18h 30m" met={true} />
              <SLAMetric label="Customer Satisfaction" target="> 90%" actual="94%" met={true} />
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-ink mb-3">Categories</h3>
            <div className="space-y-2">
              {[
                { cat: 'Technical', count: 12, color: '#3e7cb1' },
                { cat: 'Billing', count: 5, color: '#0e7a52' },
                { cat: 'General', count: 8, color: '#7a5fa8' },
                { cat: 'Feature Request', count: 3, color: '#e8a43d' },
              ].map(item => (
                <div key={item.cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-ink">{item.cat}</span>
                  </div>
                  <span className="text-xs text-faint">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Ticket Detail Drawer */}
      {selectedTicket && (
        <TicketDetail
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onAddMessage={handleAddMessage}
          onUpdateStatus={handleUpdateStatus}
          onUpdatePriority={handleUpdatePriority}
          onAssign={handleAssignTicket}
        />
      )}

      {/* New Ticket Modal */}
      {newTicketModal && (
        <NewTicketModal
          onClose={() => setNewTicketModal(false)}
          onSubmit={handleCreateTicket}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon name={icon} size={20} style={{ color }} />
        </div>
        <div>
          <div className="text-2xl font-bold text-ink">{value}</div>
          <div className="text-xs text-faint">{label}</div>
        </div>
      </div>
    </Card>
  );
}

function SLAMetric({ label, target, actual, met }: { label: string; target: string; actual: string; met: boolean }) {
  return (
    <div className="flex items-center justify-between p-2 bg-paper rounded-lg">
      <div>
        <div className="text-xs text-faint">{label}</div>
        <div className="text-sm font-medium text-ink">Target: {target}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold" style={{ color: met ? '#0e7a52' : '#c41e3a' }}>{actual}</div>
        <div className="text-xs" style={{ color: met ? '#0e7a52' : '#c41e3a' }}>{met ? '✓ On Track' : '⚠ At Risk'}</div>
      </div>
    </div>
  );
}

function TicketDetail({
  ticket,
  onClose,
  onAddMessage,
  onUpdateStatus,
  onUpdatePriority,
  onAssign,
}: {
  ticket: ServiceTicket;
  onClose: () => void;
  onAddMessage: (id: string, text: string, from: 'agent' | 'customer') => void;
  onUpdateStatus: (id: string, status: ServiceTicket['status']) => void;
  onUpdatePriority: (id: string, priority: ServiceTicket['priority']) => void;
  onAssign: (id: string, assignee: string) => void;
}) {
  const [messageText, setMessageText] = useState('');
  const [showInternalNote, setShowInternalNote] = useState(false);

  const handleSend = () => {
    if (messageText.trim()) {
      onAddMessage(ticket.id, messageText, 'agent');
      setMessageText('');
    }
  };

  return (
    <Drawer open={!!ticket} onClose={onClose} title={`Ticket #${ticket.id.slice(0, 8)}`} w="max-w-4xl">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-line">
          <div>
            <h2 className="text-lg font-semibold text-ink">{ticket.subject}</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-faint">
              <span>Created {relTime(new Date(ticket.createdAt))}</span>
              <span>•</span>
              <span>From: {ticket.contactEmail}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-8 rounded border border-line bg-card px-2 text-xs outline-none"
              value={ticket.status}
              onChange={e => onUpdateStatus(ticket.id, e.target.value as ServiceTicket['status'])}
            >
              <option value="open">Open</option>
              <option value="waiting">Waiting</option>
              <option value="closed">Closed</option>
            </select>
            <select
              className="h-8 rounded border border-line bg-card px-2 text-xs outline-none"
              value={ticket.priority}
              onChange={e => onUpdatePriority(ticket.id, e.target.value as ServiceTicket['priority'])}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Contact Info */}
        <div className="flex items-center gap-3 p-3 bg-paper rounded-lg">
          <Avatar name={ticket.contactName} size={32} />
          <div className="flex-1">
            <div className="text-sm font-medium text-ink">{ticket.contactName}</div>
            <div className="text-xs text-faint">{ticket.contactEmail}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-faint">Source</div>
            <div className="text-sm text-ink capitalize">{ticket.source}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-faint">Assignee</div>
            <select
              className="text-sm text-ink bg-transparent border-none outline-none"
              value={ticket.assignee || ''}
              onChange={e => onAssign(ticket.id, e.target.value)}
            >
              <option value="">Unassigned</option>
              <option value="Maya Chen">Maya Chen</option>
              <option value="Jonas Berg">Jonas Berg</option>
              <option value="Priya Nair">Priya Nair</option>
            </select>
          </div>
        </div>

        {/* Messages Timeline */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {ticket.messages.map(msg => (
            <div
              key={msg.id}
              className={cx(
                'flex gap-3 p-3 rounded-lg',
                msg.from === 'customer' ? 'bg-mint/30' : msg.from === 'agent' ? 'bg-blue-50' : 'bg-paper'
              )}
            >
              <Avatar
                name={msg.from === 'customer' ? ticket.contactName : msg.from === 'agent' ? 'Agent' : 'System'}
                size={28}
                color={msg.from === 'customer' ? '#3e7cb1' : msg.from === 'agent' ? '#0e7a52' : '#7a5fa8'}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-ink">
                    {msg.from === 'customer' ? ticket.contactName : msg.from === 'agent' ? 'Support Team' : 'System'}
                  </span>
                  <span className="text-xs text-faint">{relTime(new Date(msg.at))}</span>
                </div>
                <div className="text-sm text-ink whitespace-pre-wrap">{msg.text}</div>
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {msg.attachments.map((att, i) => (
                      <div key={i} className="flex items-center gap-1 px-2 py-1 bg-card rounded border border-line">
                        <Icon name="file" size={12} className="text-faint" />
                        <span className="text-xs text-faint">{att}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Reply Box */}
        <div className="pt-4 border-t border-line">
          <div className="flex gap-2 mb-2">
            <button
              className={cx(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                !showInternalNote ? 'bg-moss text-white' : 'bg-paper text-ink hover:bg-mint/50'
              )}
              onClick={() => setShowInternalNote(false)}
            >
              Reply to Customer
            </button>
            <button
              className={cx(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                showInternalNote ? 'bg-purple-100 text-purple-700' : 'bg-paper text-ink hover:bg-mint/50'
              )}
              onClick={() => setShowInternalNote(true)}
            >
              Internal Note
            </button>
          </div>
          <div className="flex gap-2">
            <textarea
              className="flex-1 min-h-[80px] rounded-lg border border-line bg-card p-3 text-sm outline-none focus:border-moss resize-none"
              placeholder={showInternalNote ? 'Add internal note...' : 'Write your reply...'}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
            />
            <div className="flex flex-col gap-2">
              <IconBtn icon="paperclip" size={20} />
              <IconBtn icon="image" size={20} />
              <IconBtn icon="file" size={20} />
            </div>
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-faint">
                <input type="checkbox" className="rounded border-line" />
                Mark as resolved
              </label>
            </div>
            <Btn onClick={handleSend}>
              <Icon name="send" size={16} className="mr-2" />
              Send
            </Btn>
          </div>
        </div>

        {/* CSAT/NPS */}
        {ticket.status === 'closed' && !ticket.csat && (
          <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-sm font-medium text-ink mb-2">Request CSAT Feedback</div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  className="w-8 h-8 rounded-full border border-yellow-300 hover:bg-yellow-200 text-sm font-medium"
                  onClick={() => {/* Send CSAT survey */}}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function NewTicketModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: Partial<ServiceTicket>) => void }) {
  const [subject, setSubject] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [priority, setPriority] = useState<ServiceTicket['priority']>('medium');
  const [category, setCategory] = useState<ServiceTicket['category']>('general');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    onSubmit({
      subject,
      contactEmail,
      contactName: contactEmail.split('@')[0],
      priority,
      category,
      messages: [{ id: uid(), from: 'customer', text: message, at: TODAY }],
      source: 'form',
    });
  };

  return (
    <Modal open={true} onClose={onClose} title="Create New Ticket" sub="Log a support ticket manually" w="max-w-lg">
      <div className="space-y-4">
        <Field label="Subject" req>
          <input
            className={inputCls}
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief description of the issue"
          />
        </Field>
        <Field label="Customer Email" req>
          <input
            className={inputCls}
            type="email"
            value={contactEmail}
            onChange={e => setContactEmail(e.target.value)}
            placeholder="customer@example.com"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <select
              className={inputCls}
              value={priority}
              onChange={e => setPriority(e.target.value as ServiceTicket['priority'])}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </Field>
          <Field label="Category">
            <select
              className={inputCls}
              value={category}
              onChange={e => setCategory(e.target.value as ServiceTicket['category'])}
            >
              <option value="technical">Technical</option>
              <option value="billing">Billing</option>
              <option value="general">General</option>
              <option value="feature">Feature Request</option>
            </select>
          </Field>
        </div>
        <Field label="Message" req>
          <textarea
            className={cx(inputCls, 'min-h-[100px]')}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Detailed description of the issue..."
          />
        </Field>
        <div className="flex justify-end gap-2 pt-4">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSubmit}>Create Ticket</Btn>
        </div>
      </div>
    </Modal>
  );
}
