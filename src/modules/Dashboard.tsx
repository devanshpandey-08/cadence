import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { metricsFor } from '../data';
import {
  cx, fmtDate, fmtLong, Icon, kfmt, money, PLATFORMS, PlatformIcon, relTime, STATUSES, STATUS_ICON, TODAY,
} from '../meta';
import type { Platform, Source } from '../types';
import { Avatar, Btn, Card, CountUp, EmptyState, Pill, SectionTitle, Seg, Spark, StageBar } from '../components/ui';

const ACT_ICON: Record<string, string> = { email: 'mail', call: 'phone', meeting: 'video', note: 'file', form: 'layout', social: 'message', deal: 'kanban' };

const SOURCE_COLORS: Record<Source, string> = {
  Form: '#3e7cb1', Import: '#7a5fa8', Social: '#0e7a52', Manual: '#6e776f', Webinar: '#a96f14', Chat: '#2f8f83',
};

function KpiTile({ label, value, prefix, suffix, series, color, delta, foot }: {
  label: string; value: number; prefix?: string; suffix?: string; series: number[]; color: string; delta: string; foot?: string;
}) {
  return (
    <Card className="flex flex-col justify-between p-4" hover>
      <div>
        <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">{label}</p>
        <div className="mt-1.5 flex items-baseline gap-2">
          <CountUp value={value} prefix={prefix} suffix={suffix} className="font-display text-[25px] font-bold leading-none tracking-tight text-ink" />
          <span className="flex items-center gap-0.5 font-mono text-[10.5px] font-semibold text-moss"><Icon name="trend" size={11} />{delta}</span>
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <p className="text-[10.5px] text-faint">{foot ?? 'vs previous period'}</p>
        <Spark data={series} color={color} w={96} h={30} />
      </div>
    </Card>
  );
}

export function Dashboard() {
  const { s, a } = useApp();
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const m = metricsFor(Number(range) as 7 | 30 | 90);

  const openDeals = s.deals.filter(d => !['won', 'lost'].includes(d.stage));
  const pipeline = openDeals.reduce((x, d) => x + d.value, 0);
  const won = s.deals.filter(d => d.stage === 'won');
  const lost = s.deals.filter(d => d.stage === 'lost');
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;

  const todayPosts = useMemo(
    () => s.posts.filter(p => p.date === TODAY).sort((x, y) => x.time.localeCompare(y.time)),
    [s.posts],
  );
  const pending = s.posts.filter(p => p.status === 'pending');
  const dueTasks = s.tasks.filter(t => !t.done && t.due <= TODAY).sort((x, y) => x.due.localeCompare(y.due)).slice(0, 5);
  const upcoming = s.tasks.filter(t => !t.done && t.due > TODAY).sort((x, y) => x.due.localeCompare(y.due)).slice(0, 3);

  const feed = useMemo(() =>
    s.contacts
      .flatMap(c => c.timeline.map(t => ({ ...t, who: c.name, cid: c.id })))
      .sort((x, y) => y.at.localeCompare(x.at))
      .slice(0, 8),
  [s.contacts]);

  const sources = useMemo(() => {
    const all = Object.keys(SOURCE_COLORS) as Source[];
    return all.map(src => ({ src, n: s.contacts.filter(c => c.source === src).length }))
      .filter(x => x.n > 0).sort((x, y) => y.n - x.n);
  }, [s.contacts]);

  const connected = s.accounts.filter(ac => ac.connected);

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-mut">{fmtLong(TODAY)}</p>
          <h1 className="mt-1 font-display text-[27px] font-bold leading-none tracking-tight text-ink">
            Morning, Maya — <span className="text-moss">{todayPosts.length} posts</span> go out today.
          </h1>
          <p className="mt-1.5 text-[13px] text-mut">
            {pending.length > 0 ? `${pending.length} post${pending.length > 1 ? 's' : ''} waiting on your approval · ` : ''}
            {dueTasks.length} task{dueTasks.length === 1 ? '' : 's'} due · pipeline at {money(pipeline)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Seg options={[{ id: '7', label: '7d' }, { id: '30', label: '30d' }, { id: '90', label: '90d' }]} value={range} onChange={setRange} />
          <Btn onClick={() => a.openComposer()}><Icon name="send" size={14} /> New post</Btn>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 p-4 lg:col-span-5" hover>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Open pipeline</p>
              <CountUp value={pipeline} prefix="$" className="font-display text-[30px] font-bold leading-tight tracking-tight text-ink" />
            </div>
            <Pill color="#0e7a52" tint="#e2efe7" dot>{openDeals.length} deals open</Pill>
          </div>
          <StageBar deals={s.deals} className="mt-3" />
          <div className="mt-3 flex items-center gap-4 border-t border-line pt-3 text-xs">
            <span className="text-mut">Won this period <span className="ml-1 font-mono font-bold text-moss">{money(won.reduce((x, d) => x + d.value, 0))}</span></span>
            <span className="text-mut">Win rate <span className="ml-1 font-mono font-bold text-ink">{winRate}%</span></span>
          </div>
        </Card>
        <div className="col-span-12 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:col-span-7">
          <KpiTile label="New contacts" value={m.newContacts} series={m.newContactsSeries} color="#0e7a52" delta="+18%" foot="forms, imports & social" />
          <KpiTile label="Engagement" value={m.engagement} series={m.engagementSeries} color="#3e7cb1" delta="+24%" foot="likes, comments, shares" />
          <KpiTile label="Emails sent" value={m.emailsSent} suffix="" series={m.emailSeries} color="#a96f14" delta="+9%" foot={`${m.openRate}% avg open rate`} />
        </div>
      </div>

      {/* queue / approvals / tasks */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 p-4 lg:col-span-5">
          <SectionTitle right={
            <button onClick={() => a.nav('calendar')} className="flex items-center gap-1 text-[11px] font-semibold text-moss transition hover:text-pine">
              Open calendar <Icon name="chevr" size={12} />
            </button>
          }>Today's queue</SectionTitle>
          {todayPosts.length === 0 ? (
            <EmptyState icon="calendar" title="Nothing scheduled today" sub="Click any day on the calendar or compose a post to fill the queue."
              action={<Btn size="sm" variant="outline" onClick={() => a.openComposer({ date: TODAY })}>Compose for today</Btn>} />
          ) : (
            <div className="space-y-1.5">
              {todayPosts.map(p => (
                <button key={p.id} onClick={() => a.openComposer({ postId: p.id })}
                  className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-line hover:bg-paper/70">
                  <span className="w-[42px] shrink-0 font-mono text-[11px] font-semibold text-ink2">{p.time}</span>
                  <span className="flex shrink-0 -space-x-1">
                    {p.platforms.map(pl => <PlatformIcon key={pl} p={pl} size={17} className="rounded-[5px] ring-2 ring-card" />)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{p.text}</span>
                  <Pill color={STATUSES[p.status].color} tint={STATUSES[p.status].tint}>
                    <Icon name={STATUS_ICON[p.status]} size={10} />{STATUSES[p.status].label}
                  </Pill>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="col-span-12 p-4 sm:col-span-6 lg:col-span-3">
          <SectionTitle right={pending.length > 0 ? <Pill color="#a96f14" tint="#f7ecd6">{pending.length}</Pill> : undefined}>
            Needs approval
          </SectionTitle>
          {pending.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line2 bg-paper/60 px-3 py-5 text-center text-xs text-mut">Queue is clear. 🎯 Approved posts auto-schedule.</p>
          ) : (
            <div className="space-y-2.5">
              {pending.map(p => (
                <div key={p.id} className="rounded-lg border border-line bg-paper/60 p-2.5">
                  <div className="mb-1.5 flex items-center gap-1.5">
                    {p.platforms.map(pl => <PlatformIcon key={pl} p={pl} size={15} />)}
                    <span className="ml-auto font-mono text-[9.5px] text-faint">{fmtDate(p.date)} · {p.time}</span>
                  </div>
                  <p className="mb-2 line-clamp-2 text-xs leading-snug text-ink2">{p.text}</p>
                  <div className="flex gap-1.5">
                    <Btn size="sm" className="flex-1" onClick={() => { a.patchPost(p.id, { status: 'scheduled' }); a.toast(`Approved — scheduled for ${fmtDate(p.date)} ${p.time}`); a.notify(`Post approved: "${p.text.slice(0, 40)}…"`); }}>
                      <Icon name="check" size={12} sw={2.6} /> Approve
                    </Btn>
                    <Btn size="sm" variant="dangerGhost" className="flex-1 border border-dangerbg" onClick={() => { a.patchPost(p.id, { status: 'draft', rejectNote: 'Tighten the hook, then resubmit.' }); a.toast('Sent back to draft with a note', 'warning'); }}>
                      Reject
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="col-span-12 p-4 sm:col-span-6 lg:col-span-4">
          <SectionTitle right={
            <button onClick={() => a.nav('tasks')} className="flex items-center gap-1 text-[11px] font-semibold text-moss transition hover:text-pine">
              All tasks <Icon name="chevr" size={12} />
            </button>
          }>Tasks due</SectionTitle>
          <div className="space-y-1">
            {[...dueTasks, ...upcoming].slice(0, 6).map(t => {
              const overdue = t.due < TODAY && !t.done;
              const deal = s.deals.find(d => d.id === t.dealId);
              return (
                <div key={t.id} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-paper/80">
                  <button onClick={() => a.toggleTask(t.id)}
                    className={cx('grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-all',
                      t.done ? 'border-moss bg-moss text-card' : 'border-line2 bg-card hover:border-moss')}>
                    {t.done && <Icon name="check" size={11} sw={3} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cx('truncate text-xs font-medium', t.done ? 'text-faint line-through' : 'text-ink')}>{t.title}</p>
                    {deal && <p className="truncate text-[10px] text-faint">{deal.name}</p>}
                  </div>
                  {t.auto && <span title="Created by automation"><Icon name="bolt" size={12} className="text-moss" /></span>}
                  <span className={cx('shrink-0 font-mono text-[10px] font-semibold', overdue ? 'text-danger' : 'text-mut')}>{relTime(t.due)}</span>
                  <Avatar name={t.assignee} size={20} />
                </div>
              );
            })}
            {dueTasks.length + upcoming.length === 0 && <p className="py-5 text-center text-xs text-mut">Nothing due. Enjoy the quiet.</p>}
          </div>
        </Card>
      </div>

      {/* feed + sources + channels */}
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 p-4 lg:col-span-6">
          <SectionTitle right={<span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-moss"><span className="live-dot h-1.5 w-1.5 rounded-full bg-moss" /> Live</span>}>
            Activity across the workspace
          </SectionTitle>
          <div className="relative space-y-0.5 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-line">
            {feed.map(f => (
              <button key={f.id} onClick={() => a.openContact(f.cid)} className="relative flex w-full items-start gap-3 rounded-lg px-0.5 py-1.5 text-left transition hover:bg-paper/80">
                <span className="relative z-10 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full border border-line bg-card text-mut">
                  <Icon name={ACT_ICON[f.type]} size={12} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-ink2"><span className="font-semibold text-ink">{f.who}</span> — {f.text}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] text-faint">{relTime(f.at)}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 p-4 sm:col-span-6 lg:col-span-3">
          <SectionTitle>Where contacts come from</SectionTitle>
          <div className="space-y-2.5">
            {sources.map(x => (
              <div key={x.src}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 font-medium text-ink2">
                    {x.src === 'Social' && <Icon name="bolt" size={11} className="text-moss" />}
                    {x.src}
                  </span>
                  <span className="font-mono font-semibold text-ink">{x.n}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line/70">
                  <div className="anim-grow h-full rounded-full" style={{ width: `${(x.n / s.contacts.length) * 100}%`, background: SOURCE_COLORS[x.src] }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 rounded-lg bg-mint/60 px-2.5 py-2 text-[10.5px] leading-snug text-pine">
            <Icon name="bolt" size={11} className="mr-1 inline" />Social commenters become CRM contacts automatically — no manual entry.
          </p>
        </Card>

        <Card className="col-span-12 p-4 sm:col-span-6 lg:col-span-3">
          <SectionTitle right={
            <button onClick={() => a.nav('settings')} className="flex items-center gap-1 text-[11px] font-semibold text-moss transition hover:text-pine">
              Manage <Icon name="chevr" size={12} />
            </button>
          }>Connected channels</SectionTitle>
          <div className="space-y-1">
            {connected.map(ac => (
              <div key={ac.id} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition hover:bg-paper/80">
                <PlatformIcon p={ac.platform} size={22} />
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-xs font-semibold text-ink">{ac.handle}</p>
                  <p className="font-mono text-[10px] text-mut">{kfmt(ac.followers ?? 0)} followers</p>
                </div>
                <span className="font-mono text-[10px] font-semibold text-moss">+{kfmt(ac.growth ?? 0)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 border-t border-line pt-2.5 text-[10.5px] text-faint">
            {connected.length} of {s.accounts.length} channels connected · flat-rate, no per-channel fees
          </p>
        </Card>
      </div>

      {/* one-liner strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-nightline bg-night px-5 py-4">
        <p className="font-display text-[15px] font-semibold tracking-tight text-card">
          Buffer schedules posts. HubSpot tracks customers. <span className="text-moss">Cadence does both — in one database.</span>
        </p>
        <div className="flex items-center gap-4 font-mono text-[11px] text-nighttx">
          <span><span className="text-card/85">Buffer $60</span> + HubSpot $50 + Mailchimp $30</span>
          <span className="text-card/40">=</span>
          <span className="text-card/85 line-through decoration-danger/70">$140/mo</span>
          <span className="rounded-md bg-moss px-2 py-1 font-bold text-card">$79/mo here</span>
        </div>
      </div>
    </div>
  );
}
