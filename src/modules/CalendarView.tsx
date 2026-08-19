import { useMemo, useState } from 'react';
import { useApp, useCanEdit } from '../store';
import {
  cx, Icon, isoOf, monthMatrix, monthTitle, PLATFORM_IDS, PLATFORMS, PlatformIcon, STATUSES, STATUS_ICON, TODAY, weekOf, WEEKDAYS,
} from '../meta';
import type { Platform, Post, PostStatus } from '../types';
import { Btn, Card, IconBtn, Modal, Pill, Seg } from '../components/ui';

function PostChip({ p, onClick, wide }: { p: Post; onClick: () => void; wide?: boolean }) {
  const can = useCanEdit();
  const main = PLATFORMS[p.platforms[0]];
  const st = STATUSES[p.status];
  return (
    <button
      draggable={can}
      onDragStart={e => { e.dataTransfer.setData('text/post', p.id); e.dataTransfer.effectAllowed = 'move'; }}
      onClick={e => { e.stopPropagation(); onClick(); }}
      title={`${st.label} · ${p.platforms.map(x => PLATFORMS[x].name).join(', ')}`}
      className={cx(
        'group flex w-full items-center gap-1.5 rounded-md border border-line/80 py-1 pl-1.5 pr-1 text-left transition-all hover:-translate-y-px hover:shadow-sm',
        wide ? 'px-2 py-1.5' : '',
      )}
      style={{ background: main.tint, borderLeft: `3px solid ${main.color}` }}>
      <span className="shrink-0 font-mono text-[9px] font-bold" style={{ color: main.color }}>{p.time}</span>
      <span className={cx('min-w-0 flex-1 truncate text-[10.5px] font-medium leading-tight', p.status === 'draft' ? 'text-mut italic' : 'text-ink2')}>
        {p.text}
      </span>
      {p.status === 'published' && (p.likes ?? 0) > 0 && (
        <span className="tnum flex shrink-0 items-center gap-0.5 font-mono text-[8.5px] font-bold text-ink2" title={`${p.likes} likes · ${p.comments ?? 0} comments · ${p.shares ?? 0} shares`}>
          <Icon name="heart" size={9} />{p.likes}
        </span>
      )}
      {p.platforms.length > 1 && <span className="shrink-0 font-mono text-[8.5px] font-bold text-mut">+{p.platforms.length - 1}</span>}
      <span className="shrink-0" style={{ color: st.color }} title={st.label}>
        <Icon name={STATUS_ICON[p.status]} size={11} />
      </span>
    </button>
  );
}

function DayModal({ iso, onClose }: { iso: string; onClose: () => void }) {
  const { s, a } = useApp();
  const posts = s.posts.filter(p => p.date === iso).sort((x, y) => x.time.localeCompare(y.time));
  return (
    <Modal open onClose={onClose} title={`Posts on ${iso}`} sub={`${posts.length} post${posts.length === 1 ? '' : 's'} this day`} w="max-w-md">
      <div className="space-y-2">
        {posts.map(p => (
          <div key={p.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-paper/60 p-2.5">
            <span className="flex shrink-0 -space-x-1">{p.platforms.map(pl => <PlatformIcon key={pl} p={pl} size={16} className="ring-2 ring-card" />)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink">{p.text}</p>
              <p className="font-mono text-[10px] text-mut">{p.time} · {STATUSES[p.status].label}</p>
            </div>
            <IconBtn name="edit" title="Edit" onClick={() => { onClose(); a.openComposer({ postId: p.id }); }} />
            <IconBtn name="trash" title="Delete" className="hover:bg-dangerbg hover:text-danger" onClick={() => a.removePost(p.id)} />
          </div>
        ))}
        {posts.length === 0 && <p className="py-4 text-center text-xs text-mut">Nothing here — the slot was cleared.</p>}
      </div>
      <div className="mt-3 flex justify-end">
        <Btn size="sm" variant="outline" onClick={() => { onClose(); a.openComposer({ date: iso }); }}><Icon name="plus" size={13} /> Add post</Btn>
      </div>
    </Modal>
  );
}

export function CalendarView() {
  const { s, a } = useApp();
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [weekIso, setWeekIso] = useState(TODAY);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [plats, setPlats] = useState<Set<Platform>>(new Set(PLATFORM_IDS));
  const [status, setStatus] = useState<'all' | PostStatus>('all');
  const [overCell, setOverCell] = useState<string | null>(null);
  const [dayModal, setDayModal] = useState<string | null>(null);

  const togglePlat = (p: Platform) => {
    const n = new Set(plats);
    if (n.has(p)) { if (n.size > 1) n.delete(p); } else n.add(p);
    setPlats(n);
  };

  const visible = useMemo(
    () => s.posts.filter(p => p.platforms.some(pl => plats.has(pl)) && (status === 'all' || p.status === status)),
    [s.posts, plats, status],
  );
  const byDate = useMemo(() => {
    const m = new Map<string, Post[]>();
    visible.forEach(p => {
      const arr = m.get(p.date) ?? [];
      arr.push(p);
      m.set(p.date, arr);
    });
    m.forEach(arr => arr.sort((x, y) => x.time.localeCompare(y.time)));
    return m;
  }, [visible]);

  const cells = useMemo(() => monthMatrix(cur.y, cur.m), [cur]);
  const days = useMemo(() => weekOf(weekIso), [weekIso]);

  const shiftMonth = (n: number) => {
    const d = new Date(cur.y, cur.m + n, 1);
    setCur({ y: d.getFullYear(), m: d.getMonth() });
    setWeekIso(isoOf(d));
  };

  const dropOn = (iso: string, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/post');
    if (id) {
      const post = s.posts.find(p => p.id === id);
      if (post && post.date !== iso) a.movePost(id, iso);
    }
    setOverCell(null);
  };

  const renderChips = (iso: string, max: number) => {
    const list = byDate.get(iso) ?? [];
    return (
      <>
        {list.slice(0, max).map(p => (
          <PostChip key={p.id} p={p} onClick={() => a.openComposer({ postId: p.id })} wide={view === 'week'} />
        ))}
        {list.length > max && (
          <button onClick={e => { e.stopPropagation(); setDayModal(iso); }}
            className="w-full rounded-md px-1 py-0.5 text-left font-mono text-[9px] font-bold text-steel transition hover:bg-steelbg">
            +{list.length - max} more
          </button>
        )}
      </>
    );
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1">
          <IconBtn name="chevl" onClick={() => (view === 'month' ? shiftMonth(-1) : setWeekIso(isoOf(new Date(new Date(weekIso + 'T00:00:00').getTime() - 7 * 864e5))))} title="Previous" className="border border-line bg-card" />
          <Btn variant="outline" size="sm" onClick={() => { setCur({ y: now.getFullYear(), m: now.getMonth() }); setWeekIso(TODAY); }}>Today</Btn>
          <IconBtn name="chevr" onClick={() => (view === 'month' ? shiftMonth(1) : setWeekIso(isoOf(new Date(new Date(weekIso + 'T00:00:00').getTime() + 7 * 864e5))))} title="Next" className="border border-line bg-card" />
        </div>
        <h1 className="font-display text-[21px] font-bold tracking-tight text-ink">
          {view === 'month' ? monthTitle(cur.y, cur.m) : `Week of ${days[0].iso}`}
        </h1>
        <Seg options={[{ id: 'month', label: 'Month' }, { id: 'week', label: 'Week' }]} value={view} onChange={setView} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select value={status} onChange={e => setStatus(e.target.value as 'all' | PostStatus)}
            className="h-8 rounded-lg border border-line bg-card px-2 text-[11px] font-medium text-ink2 outline-none focus:border-moss">
            <option value="all">All statuses</option>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Btn onClick={() => a.openComposer()}><Icon name="plus" size={14} sw={2.4} /> New post</Btn>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Platforms</span>
        {PLATFORM_IDS.map(p => {
          const on = plats.has(p);
          return (
            <button key={p} onClick={() => togglePlat(p)}
              className={cx('flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-2.5 text-[11px] font-semibold transition-all',
                on ? 'border-transparent text-ink shadow-sm' : 'border-line bg-card text-faint hover:text-mut')}
              style={on ? { background: PLATFORMS[p].tint } : undefined}>
              <PlatformIcon p={p} size={15} className={cx(!on && 'opacity-35 grayscale')} />
              {PLATFORMS[p].name.split(' ')[0]}
            </button>
          );
        })}
      </div>

      {view === 'month' ? (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-7 border-b border-line bg-paper/70">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={cx('px-2 py-2 text-center font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut', i >= 5 && 'bg-paper')}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((c, i) => {
              const list = byDate.get(c.iso) ?? [];
              const isToday = c.iso === TODAY;
              const dow = i % 7;
              return (
                <div key={c.iso}
                  onDragOver={e => { e.preventDefault(); setOverCell(c.iso); }}
                  onDragLeave={() => setOverCell(o => (o === c.iso ? null : o))}
                  onDrop={e => dropOn(c.iso, e)}
                  onClick={() => a.openComposer({ date: c.iso })}
                  className={cx(
                    'group relative min-h-[104px] cursor-pointer border-b border-r border-line/70 p-1.5 transition-colors [&:nth-child(7n)]:border-r-0',
                    dow >= 5 && 'bg-paper/60',
                    !c.inMonth && 'bg-paper/80 opacity-55',
                    overCell === c.iso ? 'bg-mint/70 ring-2 ring-inset ring-moss/40' : 'hover:bg-mint/30',
                    i >= 35 && 'border-b-0',
                  )}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={cx(
                      'grid h-5 w-5 place-items-center rounded-full font-mono text-[10px] font-semibold',
                      isToday ? 'bg-moss font-bold text-card' : 'text-mut',
                    )}>{c.date.getDate()}</span>
                    <span className="opacity-0 transition group-hover:opacity-100"><Icon name="plus" size={12} className="text-moss" /></span>
                  </div>
                  <div className="space-y-1">{renderChips(c.iso, 3)}</div>
                  {list.length === 0 && (
                    <span className="pointer-events-none absolute inset-x-2 bottom-2 rounded-md border border-dashed border-line2 py-1 text-center font-mono text-[8.5px] uppercase tracking-wider text-faint opacity-0 transition group-hover:opacity-70">
                      schedule
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-7">
          {days.map(d => {
            const list = byDate.get(d.iso) ?? [];
            const isToday = d.iso === TODAY;
            return (
              <div key={d.iso}
                onDragOver={e => { e.preventDefault(); setOverCell(d.iso); }}
                onDragLeave={() => setOverCell(o => (o === d.iso ? null : o))}
                onDrop={e => dropOn(d.iso, e)}
                className={cx('flex min-h-[180px] flex-col rounded-xl border p-1.5 transition-all',
                  overCell === d.iso ? 'border-moss bg-mint/60 ring-2 ring-moss/25' : isToday ? 'border-moss/50 bg-card' : 'border-line bg-card/70')}>
                <button onClick={() => a.openComposer({ date: d.iso })} className="mb-1.5 flex items-center justify-between rounded-md px-1.5 py-1 transition hover:bg-mint/50">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider text-mut">{WEEKDAYS[(d.date.getDay() + 6) % 7]}</span>
                  <span className={cx('grid h-5 w-5 place-items-center rounded-full font-mono text-[10px] font-bold', isToday ? 'bg-moss text-card' : 'text-ink2')}>
                    {d.date.getDate()}
                  </span>
                </button>
                <div className="flex-1 space-y-1">{renderChips(d.iso, 8)}</div>
                {list.length === 0 && <p className="px-1.5 pb-1 font-mono text-[9px] uppercase tracking-wider text-faint">open slot</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Statuses</span>
        {Object.entries(STATUSES).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-[10.5px] text-mut">
            <span style={{ color: v.color }}><Icon name={STATUS_ICON[k as PostStatus]} size={11} /></span>{v.label}
          </span>
        ))}
        <span className="ml-auto hidden items-center gap-1.5 text-[10.5px] text-faint sm:flex">
          <Icon name="clock" size={11} /> Drag posts between days to reschedule · click a day to compose
        </span>
      </div>

      {dayModal && <DayModal iso={dayModal} onClose={() => setDayModal(null)} />}
    </div>
  );
}
