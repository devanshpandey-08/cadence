import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { LIST_SIZES } from '../data';
import { cx, fmtDate, Icon, isoOf, kfmt } from '../meta';
import type { Campaign } from '../types';
import { Btn, Card, CountUp, Field, IconBtn, inputCls, Modal, Pill, SectionTitle } from '../components/ui';

const STATUS_META = {
  draft: { label: 'Draft', color: '#6e776f', tint: '#eceee7' },
  scheduled: { label: 'Scheduled', color: '#3e7cb1', tint: '#e5eef6' },
  sent: { label: 'Sent', color: '#0e7a52', tint: '#e2efe7' },
} as const;

function SubjectLine({ subject }: { subject: string }) {
  const parts = subject.split(/(\{\{[^}]+\}\})/g);
  return (
    <span className="text-xs text-ink2">
      {parts.map((p, i) => p.startsWith('{{')
        ? <code key={i} className="mx-0.5 rounded bg-mint px-1 py-0.5 font-mono text-[10px] font-semibold text-pine">{p}</code>
        : <span key={i}>{p}</span>)}
    </span>
  );
}

function NewCampaignModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, a } = useApp();
  const [f, setF] = useState({ name: '', subject: '', list: Object.keys(LIST_SIZES)[0], date: isoOf(new Date(Date.now() + 864e5)) });
  const [blocks, setBlocks] = useState<{ id: string; text: string }[]>([{ id: '1', text: '' }]);
  const [err, setErr] = useState('');

  const save = (status: 'draft' | 'scheduled') => {
    if (!f.name.trim() || !f.subject.trim()) { setErr('Name and subject are required.'); return; }
    a.addCampaign({ name: f.name.trim(), subject: f.subject.trim(), list: f.list, status, date: status === 'scheduled' ? f.date : isoOf(new Date()) });
    setF({ name: '', subject: '', list: Object.keys(LIST_SIZES)[0], date: isoOf(new Date(Date.now() + 864e5)) });
    setErr('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New email campaign" sub="One-time broadcast — delivered through your connected SMTP, not our servers." w="max-w-lg"
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="outline" onClick={() => save('draft')}>Save draft</Btn>
        <Btn onClick={() => save('scheduled')}><Icon name="calendar" size={13} /> Schedule</Btn>
      </>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Campaign name" req><input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Cold Brew Launch" /></Field>
          <Field label="Send to list">
            <select className={inputCls} value={f.list} onChange={e => setF({ ...f, list: e.target.value })}>
              {Object.entries(LIST_SIZES).map(([l, n]) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Subject line" hint="personalize with tokens" req>
          <input className={inputCls} value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} placeholder="Cold brew drops June 1, {{first_name}}" />
          <div className="mt-1.5 flex gap-1.5">
            {['{{first_name}}', '{{company}}', '{{last_post_title}}'].map(t => (
              <button key={t} onClick={() => setF({ ...f, subject: f.subject + ' ' + t })}
                className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-mut transition hover:border-moss hover:text-pine">
                {t}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Content blocks" hint="drag-and-drop editor in the full app">
          <div className="space-y-2">
            {blocks.map((b, i) => (
              <div key={b.id} className="flex items-center gap-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-faint">{['text', 'image', 'button'][i % 3]}</span>
                <input className={inputCls} value={b.text}
                  onChange={e => setBlocks(bs => bs.map(x => x.id === b.id ? { ...x, text: e.target.value } : x))}
                  placeholder={i === 0 ? 'Opening paragraph…' : i === 1 ? 'Image URL (stored in S3)…' : 'Button label + link…'} />
                <IconBtn name="trash" className="hover:bg-dangerbg hover:text-danger" onClick={() => setBlocks(bs => bs.length > 1 ? bs.filter(x => x.id !== b.id) : bs)} />
              </div>
            ))}
            <button onClick={() => setBlocks(bs => [...bs, { id: String(Date.now()), text: '' }])}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-line2 px-3 py-1.5 text-[11px] font-semibold text-mut transition hover:border-moss hover:text-pine">
              <Icon name="plus" size={12} /> Add block
            </button>
          </div>
        </Field>
        <Field label="Send date (scheduled)"><input type="date" className={inputCls} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></Field>
        <p className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 text-[10.5px] text-mut">
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" />
          Sending via <span className="font-semibold text-ink2">maya@emberandoak.com (Gmail SMTP)</span> — opens & clicks are tracked by your provider.
        </p>
        {err && <p className="anim-shake rounded-lg bg-dangerbg px-3 py-2 text-xs font-medium text-danger">{err}</p>}
      </div>
    </Modal>
  );
}

export function Campaigns() {
  const { s, a } = useApp();
  const [newOpen, setNewOpen] = useState(false);
  const [report, setReport] = useState<Campaign | null>(null);

  useEffect(() => {
    if (s.create === 'campaign') { setNewOpen(true); a.ui({ create: null }); }
  }, [s.create, a]);

  const sent = s.campaigns.filter(c => c.status === 'sent');
  const totals = useMemo(() => {
    const sentN = sent.reduce((x, c) => x + c.sent, 0);
    const opens = sent.reduce((x, c) => x + c.opens, 0);
    const clicks = sent.reduce((x, c) => x + c.clicks, 0);
    return { sentN, openRate: sentN ? Math.round((opens / sentN) * 100) : 0, clickRate: opens ? Math.round((clicks / opens) * 100) : 0 };
  }, [sent]);

  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-12 gap-3.5">
        {[
          { label: 'Emails sent (all time)', v: totals.sentN, icon: 'send' },
          { label: 'Avg open rate', v: totals.openRate, suffix: '%', icon: 'eye' },
          { label: 'Click-to-open rate', v: totals.clickRate, suffix: '%', icon: 'trend' },
        ].map((k, i) => (
          <Card key={k.label} className={cx('col-span-12 p-4 sm:col-span-4', i === 0 && 'sm:col-span-4')} hover>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">{k.label}</p>
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-mint text-moss"><Icon name={k.icon} size={14} /></span>
            </div>
            <CountUp value={k.v} suffix={k.suffix ?? ''} className="mt-1 font-display text-[24px] font-bold tracking-tight text-ink" />
          </Card>
        ))}
        <Card className="col-span-12 flex flex-wrap items-center gap-3 border-moss/30 bg-mint/40 p-4">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-moss text-card"><Icon name="mail" size={16} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold text-ink">Delivery: your own SMTP — zero per-email fees from us</p>
            <p className="text-[11px] text-mut">Gmail · maya@emberandoak.com · connected & verified. Switch providers anytime (Outlook, SendGrid, Amazon SES).</p>
          </div>
          <Btn variant="outline" size="sm" onClick={() => a.toast('Test email delivered via Gmail SMTP — 0.4s', 'info')}><Icon name="send" size={13} /> Send test</Btn>
          <Btn variant="primary" onClick={() => setNewOpen(true)}><Icon name="plus" size={14} sw={2.4} /> New campaign</Btn>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-line bg-paper/70">
                {['Campaign', 'Subject', 'List', 'Sent', 'Open rate', 'Clicks', 'Date', ''].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {s.campaigns.map(c => {
                const sm = STATUS_META[c.status];
                const openPct = c.sent ? Math.round((c.opens / c.sent) * 100) : 0;
                return (
                  <tr key={c.id} className="border-b border-line/70 transition last:border-0 hover:bg-mint/30">
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-ink">{c.name}</p>
                      <Pill color={sm.color} tint={sm.tint} className="mt-1">{sm.label}</Pill>
                    </td>
                    <td className="max-w-[240px] px-4 py-3"><SubjectLine subject={c.subject} /></td>
                    <td className="px-4 py-3 font-mono text-[10.5px] text-mut">{c.list}</td>
                    <td className="px-4 py-3 font-mono text-[11.5px] font-bold text-ink">{c.sent ? c.sent.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3">
                      {c.sent ? (
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-line/80">
                            <div className="anim-grow h-full rounded-full bg-moss" style={{ width: `${openPct}%` }} />
                          </div>
                          <span className="font-mono text-[10.5px] font-bold text-ink">{openPct}%</span>
                        </div>
                      ) : <span className="text-[11px] text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ink2">{c.sent ? c.clicks.toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 font-mono text-[10.5px] text-mut">{fmtDate(c.date)}</td>
                    <td className="px-4 py-3">
                      {c.status === 'sent' ? (
                        <Btn size="sm" variant="outline" onClick={() => setReport(c)}><Icon name="eye" size={12} /> Report</Btn>
                      ) : (
                        <Btn size="sm" onClick={() => a.sendCampaign(c.id)}><Icon name="send" size={12} /> Send now</Btn>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="flex items-center gap-1.5 text-[11px] text-faint">
        <Icon name="bolt" size={12} className="text-moss" /> Drip sequences land in Phase 2 — Phase 1 ships one-time broadcasts to keep SMTP delivery rock solid.
      </p>

      <NewCampaignModal open={newOpen} onClose={() => setNewOpen(false)} />

      <Modal open={!!report} onClose={() => setReport(null)} title={report?.name ?? ''} sub={`Sent ${fmtDate(report?.date ?? '')} via Gmail SMTP`} w="max-w-md">
        {report && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { l: 'Delivered', v: report.sent.toLocaleString(), c: '#18201a' },
                { l: 'Opens', v: `${Math.round((report.opens / (report.sent || 1)) * 100)}%`, c: '#0e7a52' },
                { l: 'Clicks', v: `${Math.round((report.clicks / (report.opens || 1)) * 100)}% of opens`, c: '#3e7cb1' },
                { l: 'Bounces', v: String(Math.round(report.sent * 0.006)), c: '#c2483b' },
              ].map(k => (
                <div key={k.l} className="rounded-lg border border-line bg-paper/70 px-3 py-2.5">
                  <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-mut">{k.l}</p>
                  <p className="mt-0.5 font-display text-[18px] font-bold" style={{ color: k.c }}>{k.v}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-mut">Top link: <span className="font-semibold text-ink2">emberandoak.com/spring-blend</span> — {report.clicks} clicks</p>
            <p className="rounded-lg bg-mint/60 px-3 py-2 text-[10.5px] text-pine">Subscribers came from list: <span className="font-mono font-semibold">{report.list}</span> · {kfmt(report.sent)} reached with zero Cadence delivery fees.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
