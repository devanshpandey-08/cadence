import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { Btn, Card, IconBtn, inputCls, Modal, Pill, SectionTitle, Seg } from '../components/ui';

type Chan = 'whatsapp' | 'sms';

interface Msg { id: string; from: 'them' | 'us'; text: string; at: string; status?: 'sent' | 'delivered' | 'read' }
interface Convo { id: string; contactId: string; chan: Chan; msgs: Msg[] }

const SEED: Convo[] = [
  { id: 'cv1', contactId: 'c1', chan: 'whatsapp', msgs: [
    { id: 'm1', from: 'them', text: 'Hi! Saw your spring blend post — do you do wholesale pricing?', at: '09:12' },
    { id: 'm2', from: 'us', text: 'Hey Sofia! We do — 12kg+ monthly gets tier pricing. Want the sheet?', at: '09:15', status: 'read' },
    { id: 'm3', from: 'them', text: 'Yes please, and a sample if possible 🙏', at: '09:18' },
  ]},
  { id: 'cv2', contactId: 'c3', chan: 'whatsapp', msgs: [
    { id: 'm4', from: 'us', text: 'Marcus — reminder: your trial roast ships tomorrow. Anything to adjust?', at: 'Yesterday', status: 'delivered' },
  ]},
  { id: 'cv3', contactId: 'c5', chan: 'sms', msgs: [
    { id: 'm5', from: 'them', text: 'Running 10 min late for the cupping!', at: '14:52' },
    { id: 'm6', from: 'us', text: 'No worries — kettle is on. ☕', at: '14:53', status: 'delivered' },
  ]},
  { id: 'cv4', contactId: 'c2', chan: 'sms', msgs: [
    { id: 'm7', from: 'us', text: 'Ruth, your demo is confirmed for tomorrow 10:00. Reply STOP to opt out.', at: 'Monday', status: 'read' },
  ]},
];

/* Meta Cloud API per-message pricing (US, July-2025 model) + Twilio SMS */
const PRICING = {
  whatsapp: { marketing: 0.025, utility: 0.006, service: 0 },
  sms: { segment: 0.0079 },
};

const TEMPLATES = [
  { id: 't1', cat: 'marketing' as const, name: 'Welcome & catalog', text: 'Hi {{first_name}}! Welcome to Ember & Oak — here is our wholesale catalog: emberandoak.com/wholesale' },
  { id: 't2', cat: 'utility' as const, name: 'Order shipped', text: '{{first_name}}, your order shipped today. Track: emberandoak.com/track' },
  { id: 't3', cat: 'utility' as const, name: 'Booking reminder', text: 'Reminder {{first_name}}: your cupping is tomorrow at 10:00. Reply C to confirm.' },
];

export function Conversations() {
  const { s, a } = useApp();
  const [convos, setConvos] = useState<Convo[]>(SEED);
  const [chan, setChan] = useState<Chan>('whatsapp');
  const [sel, setSel] = useState(SEED[0].id);
  const [draft, setDraft] = useState('');
  const [bcOpen, setBcOpen] = useState(false);
  const [bcT, setBcT] = useState(TEMPLATES[0]);

  const list = useMemo(() => convos.filter(c => c.chan === chan), [convos, chan]);
  const active = convos.find(c => c.id === sel) ?? list[0];
  const contact = s.contacts.find(c => c.id === active?.contactId);

  const merge = (text: string) => text
    .split('{{first_name}}').join(contact?.name.split(' ')[0] ?? 'there')
    .split('{{company}}').join(contact?.company ?? 'your company');

  const send = () => {
    if (!draft.trim() || !active) return;
    const text = merge(draft.trim());
    setConvos(cs => cs.map(c => c.id === active.id
      ? { ...c, msgs: [...c.msgs, { id: `m${Date.now()}`, from: 'us', text, at: 'now', status: 'sent' }] }
      : c));
    if (contact) a.logActivity(contact.id, 'note', `${chan === 'whatsapp' ? 'WhatsApp' : 'SMS'} sent: "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`);
    setDraft('');
    a.toast(chan === 'whatsapp' ? 'Sent via Meta Cloud API — logged to timeline' : 'SMS queued via Twilio — logged to timeline');
  };

  const recipients = 214;
  const bcCost = recipients * (chan === 'whatsapp' ? PRICING.whatsapp[bcT.cat] : PRICING.sms.segment);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-moss" />Phase 2 · Messaging
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">SMS & WhatsApp</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            Meta Cloud API + Twilio behind one composer. Every message lands on the contact timeline — sales sees the whole story.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Seg options={[{ id: 'whatsapp', label: 'WhatsApp' }, { id: 'sms', label: 'SMS' }]} value={chan} onChange={v => { setChan(v); const first = convos.find(c => c.chan === v); if (first) setSel(first.id); }} />
          <Btn onClick={() => setBcOpen(true)}><Icon name="send" size={13} /> Broadcast</Btn>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* thread list */}
        <Card className="col-span-12 overflow-hidden md:col-span-4">
          <div className="border-b border-line px-4 py-2.5">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">{list.length} conversations</p>
          </div>
          <div className="divide-y divide-line/70">
            {list.map(c => {
              const ct = s.contacts.find(x => x.id === c.contactId);
              const last = c.msgs[c.msgs.length - 1];
              const unread = last?.from === 'them';
              return (
                <button key={c.id} onClick={() => setSel(c.id)}
                  className={cx('flex w-full items-start gap-2.5 px-4 py-3 text-left transition', sel === c.id ? 'bg-mint/40' : 'hover:bg-paper/60')}>
                  <span className={cx('mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg', c.chan === 'whatsapp' ? 'bg-[#25D366]/15 text-[#128C4B]' : 'bg-steelbg text-steel')}>
                    <Icon name={c.chan === 'whatsapp' ? 'message' : 'phone'} size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cx('truncate text-[12.5px]', unread ? 'font-bold text-ink' : 'font-semibold text-ink2')}>{ct?.name ?? 'Unknown'}</p>
                      <span className="shrink-0 font-mono text-[9px] text-faint">{last?.at}</span>
                    </div>
                    <p className={cx('truncate text-[11px]', unread ? 'font-medium text-ink' : 'text-mut')}>
                      {last?.from === 'us' ? 'You: ' : ''}{last?.text}
                    </p>
                  </div>
                  {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ember" />}
                </button>
              );
            })}
            {list.length === 0 && <p className="px-4 py-8 text-center text-xs text-mut">No {chan === 'whatsapp' ? 'WhatsApp' : 'SMS'} threads yet.</p>}
          </div>
        </Card>

        {/* conversation */}
        <Card className="col-span-12 flex flex-col overflow-hidden md:col-span-8" style={{ minHeight: 420 }}>
          {active && contact ? (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span className={cx('grid h-8 w-8 place-items-center rounded-lg', active.chan === 'whatsapp' ? 'bg-[#25D366]/15 text-[#128C4B]' : 'bg-steelbg text-steel')}>
                  <Icon name={active.chan === 'whatsapp' ? 'message' : 'phone'} size={15} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <button onClick={() => a.openContact(contact.id)} className="truncate text-[13px] font-bold text-ink transition hover:text-moss">{contact.name}</button>
                  <p className="truncate font-mono text-[9.5px] text-mut">{contact.phone ?? '+1 503 555 0117'} · {contact.company} · <span className="text-moss">full CRM profile ↗</span></p>
                </div>
                <Pill color="#1e6b4f" tint="#e2ede6" dot>{active.chan === 'whatsapp' ? 'Meta Cloud API' : 'Twilio'}</Pill>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto bg-paper/50 px-4 py-4">
                {active.msgs.map(m => (
                  <div key={m.id} className={cx('flex', m.from === 'us' ? 'justify-end' : 'justify-start')}>
                    <div className={cx('max-w-[75%] rounded-xl px-3 py-2 text-[12.5px] leading-relaxed',
                      m.from === 'us' ? 'rounded-br-sm bg-night text-ink' : 'rounded-bl-sm border border-line bg-card text-ink2')}>
                      <p className="break-words">{m.text}</p>
                      <p className={cx('mt-1 flex items-center justify-end gap-1 font-mono text-[8.5px]', m.from === 'us' ? 'text-nighttx' : 'text-faint')}>
                        {m.at}{m.status === 'read' && <Icon name="check" size={9} sw={3} className="text-lime" />}
                        {m.status === 'delivered' && <Icon name="check" size={9} sw={3} />}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-line p-3">
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setDraft(t.text)}
                      className="flex items-center gap-1.5 rounded-full border border-line bg-paper px-2.5 py-1 text-[10.5px] font-semibold text-ink2 transition hover:border-moss hover:text-pine">
                      <Icon name="file" size={10} /> {t.name}
                      <span className={cx('rounded px-1 font-mono text-[8px] font-bold uppercase', t.cat === 'marketing' ? 'bg-emberbg text-ember' : 'bg-steelbg text-steel')}>{t.cat}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2">
                  <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={`Message ${contact.name.split(' ')[0]}… merge fields: {{first_name}} {{company}}`}
                    className={cx(inputCls, 'resize-none')} />
                  <Btn onClick={send} disabled={!draft.trim()}><Icon name="send" size={13} /> Send</Btn>
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[9.5px] text-faint">
                  <Icon name="bolt" size={10} className="text-ember" />
                  {active.chan === 'whatsapp'
                    ? `est. $${PRICING.whatsapp.marketing.toFixed(3)} (marketing template) · free inside the 24h service window`
                    : `est. $${PRICING.sms.segment.toFixed(4)} per segment (US)`} · 1,000 free service conversations/mo from Meta
                </p>
              </div>
            </>
          ) : (
            <div className="grid flex-1 place-items-center"><p className="text-xs text-mut">Select a conversation.</p></div>
          )}
        </Card>
      </div>

      <Modal open={bcOpen} onClose={() => setBcOpen(false)} title="Broadcast message" w="max-w-md"
        sub="Template messages require Meta approval in production — these three are pre-approved in the demo."
        footer={<>
          <Btn variant="ghost" onClick={() => setBcOpen(false)}>Cancel</Btn>
          <Btn onClick={() => {
            setBcOpen(false);
            a.toast(`Broadcast queued to ${recipients} recipients · est. $${bcCost.toFixed(2)}`);
            if (contact) a.logActivity(contact.id, 'note', `${chan === 'whatsapp' ? 'WhatsApp' : 'SMS'} broadcast: "${bcT.name}"`);
          }}><Icon name="send" size={13} /> Queue broadcast</Btn>
        </>}>
        <div className="space-y-3">
          <SectionTitle>Pick a template</SectionTitle>
          <div className="space-y-1.5">
            {TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setBcT(t)}
                className={cx('flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition', bcT.id === t.id ? 'border-moss bg-mint/50' : 'border-line hover:border-line2')}>
                <Icon name="file" size={14} className="mt-0.5 text-mut" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-bold text-ink">{t.name}</p>
                    <span className={cx('rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase', t.cat === 'marketing' ? 'bg-emberbg text-ember' : 'bg-steelbg text-steel')}>{t.cat}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-mut">{t.text}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between rounded-lg border border-line bg-night px-3.5 py-3">
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-nighttx">Audience · Newsletter list</p>
              <p className="tnum mt-0.5 font-display text-[18px] font-bold text-ink">{recipients.toLocaleString()} recipients</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-nighttx">Estimated cost</p>
              <p className="tnum mt-0.5 font-display text-[18px] font-bold text-lime">${bcCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
