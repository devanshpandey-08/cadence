import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, PLATFORMS, PlatformIcon, relTime } from '../meta';
import type { Thread } from '../types';
import { Avatar, Btn, Card, EmptyState, IconBtn, Pill, Seg } from '../components/ui';

type Filter = 'all' | 'unread' | 'progress' | 'resolved';

const STATUS_META = {
  unread: { label: 'Unread', color: '#c2483b', tint: '#f8e6e2' },
  progress: { label: 'In progress', color: '#a96f14', tint: '#f7ecd6' },
  resolved: { label: 'Resolved', color: '#0e7a52', tint: '#e2efe7' },
} as const;

export function Inbox() {
  const { s, a } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [sel, setSel] = useState<string | null>(s.threads[0]?.id ?? null);
  const [reply, setReply] = useState('');

  const threads = useMemo(
    () => s.threads.filter(t => filter === 'all' || t.status === filter),
    [s.threads, filter],
  );
  const thread = s.threads.find(t => t.id === sel) ?? null;

  useEffect(() => {
    if (thread && thread.status === 'unread') a.patchThread(thread.id, { status: 'progress' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  const counts = {
    all: s.threads.length,
    unread: s.threads.filter(t => t.status === 'unread').length,
    progress: s.threads.filter(t => t.status === 'progress').length,
    resolved: s.threads.filter(t => t.status === 'resolved').length,
  };

  const contact = thread?.contactId ? s.contacts.find(c => c.id === thread.contactId) : null;

  const send = () => {
    if (!thread || !reply.trim()) return;
    a.replyThread(thread.id, reply.trim());
    setReply('');
    a.toast(`Reply sent to ${thread.person} via ${PLATFORMS[thread.platform].name} API`);
  };

  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[320px_1fr]">
      {/* thread list */}
      <Card className="flex max-h-[calc(100vh-170px)] flex-col overflow-hidden">
        <div className="border-b border-line p-2.5">
          <Seg size="sm" value={filter} onChange={setFilter}
            options={[
              { id: 'all', label: `All ${counts.all}` },
              { id: 'unread', label: `Unread ${counts.unread}` },
              { id: 'progress', label: `Open ${counts.progress}` },
              { id: 'resolved', label: `Done ${counts.resolved}` },
            ]} />
        </div>
        <div className="flex-1 overflow-y-auto p-1.5">
          {threads.map(t => (
            <button key={t.id} onClick={() => setSel(t.id)}
              className={cx('relative mb-1 flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition',
                sel === t.id ? 'bg-mint/70 ring-1 ring-moss/25' : 'hover:bg-paper')}>
              {t.status === 'unread' && <span className="absolute left-0.5 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r bg-danger" />}
              <PlatformIcon p={t.platform} size={24} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cx('truncate text-xs', t.status === 'unread' ? 'font-bold text-ink' : 'font-semibold text-ink2')}>{t.person}</p>
                  <span className="shrink-0 font-mono text-[9px] text-faint">{relTime(t.messages[t.messages.length - 1].at)}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-mut">{t.preview}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Pill color={STATUS_META[t.status].color} tint={STATUS_META[t.status].tint}>{STATUS_META[t.status].label}</Pill>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-faint">{t.kind}</span>
                </div>
              </div>
            </button>
          ))}
          {threads.length === 0 && <p className="px-3 py-8 text-center text-xs text-mut">No conversations in this bucket.</p>}
        </div>
      </Card>

      {/* conversation */}
      <Card className="flex max-h-[calc(100vh-170px)] flex-col overflow-hidden">
        {!thread ? (
          <div className="grid flex-1 place-items-center p-8">
            <EmptyState icon="inbox" title="Pick a conversation" sub="Comments, DMs and mentions from all eight platforms land here in one thread." />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2.5 border-b border-line px-4 py-3">
              <PlatformIcon p={thread.platform} size={26} />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13.5px] font-bold text-ink">{thread.person}</p>
                <p className="truncate text-[10.5px] text-mut">
                  {thread.kind === 'dm' ? 'Direct message' : `${thread.kind} on "${thread.postText}"`} · via @{s.accounts.find(x => x.platform === thread.platform)?.handle ?? 'emberandoak'}
                </p>
              </div>
              <select value={thread.assignee ?? ''} onChange={e => { a.patchThread(thread.id, { assignee: e.target.value || undefined }); a.toast(e.target.value ? `Assigned to ${e.target.value}` : 'Unassigned', 'info'); }}
                className="h-8 rounded-lg border border-line bg-card px-2 text-[11px] font-medium text-ink2 outline-none focus:border-moss">
                <option value="">Unassigned</option>
                {s.users.map(u => <option key={u.id}>{u.name}</option>)}
              </select>
              <Seg size="sm" value={thread.status} onChange={v => { a.patchThread(thread.id, { status: v as Thread['status'] }); }}
                options={[{ id: 'unread', label: 'Unread' }, { id: 'progress', label: 'Open' }, { id: 'resolved', label: 'Done' }]} />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3.5">
              {contact ? (
                <button onClick={() => a.openContact(contact.id)}
                  className="mb-3 flex w-full items-center gap-2.5 rounded-lg border border-line bg-mint/40 px-3 py-2 text-left transition hover:border-moss/50 hover:bg-mint/70">
                  <Avatar name={contact.name} size={26} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-xs font-bold text-ink">{contact.name} <span className="font-normal text-mut">· {contact.company}</span></p>
                    <p className="font-mono text-[9.5px] text-mut">CRM profile · {contact.timeline.length} touchpoints · {s.deals.filter(d => d.contactId === contact.id).length} deals</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10.5px] font-bold text-moss">Open in CRM <Icon name="external" size={11} /></span>
                </button>
              ) : (
                <p className="mb-3 flex items-center gap-2 rounded-lg border border-dashed border-line2 bg-paper/70 px-3 py-2 text-[11px] text-mut">
                  <Icon name="bolt" size={13} className="shrink-0 text-moss" />
                  No CRM contact yet — replying auto-creates one and links this thread.
                </p>
              )}

              <div className="space-y-2.5">
                {thread.messages.map(m => (
                  <div key={m.id} className={cx('flex', m.from === 'us' ? 'justify-end' : 'justify-start')}>
                    <div className={cx('anim-rise max-w-[82%] rounded-xl px-3 py-2',
                      m.from === 'us' ? 'rounded-br-sm bg-moss text-card' : 'rounded-bl-sm border border-line bg-paper text-ink2')}>
                      <p className="whitespace-pre-line text-xs leading-relaxed">{m.text}</p>
                      <p className={cx('mt-1 font-mono text-[9px]', m.from === 'us' ? 'text-card/60' : 'text-faint')}>{relTime(m.at)} · {m.from === 'us' ? 'you' : thread.person}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-line p-3">
              <div className="flex items-center gap-1.5 pb-2">
                <button onClick={() => a.toast(`Liked ${thread.person}'s ${thread.kind}`, 'info')} className="flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 text-[10.5px] font-semibold text-ink2 transition hover:border-danger/40 hover:text-danger">
                  <Icon name="heart" size={11} /> Like
                </button>
                <button onClick={() => a.toast(`${thread.kind === 'dm' ? 'Conversation' : 'Comment'} hidden from public view`, 'warning')} className="flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 text-[10.5px] font-semibold text-ink2 transition hover:border-line2">
                  <Icon name="eye" size={11} /> Hide
                </button>
                <button onClick={() => { a.patchThread(thread.id, { status: 'resolved' }); a.toast('Conversation resolved'); }} className="flex items-center gap-1 rounded-md border border-line bg-card px-2 py-1 text-[10.5px] font-semibold text-ink2 transition hover:border-moss/50 hover:text-moss">
                  <Icon name="check" size={11} /> Resolve
                </button>
              </div>
              <div className="flex items-end gap-2">
                <textarea value={reply} onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }}
                  rows={2} placeholder={`Reply to ${thread.person}…  (⌘↵ to send)`}
                  className="min-h-[52px] flex-1 resize-none rounded-lg border border-line2 bg-card px-3 py-2 text-xs leading-relaxed outline-none transition placeholder:text-faint focus:border-moss focus:ring-2 focus:ring-moss/15" />
                <Btn onClick={send} disabled={!reply.trim()}><Icon name="send" size={14} /> Send</Btn>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
