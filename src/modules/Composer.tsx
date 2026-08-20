import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon, PLATFORM_IDS, PLATFORMS, PlatformIcon, STATUSES, TODAY } from '../meta';
import type { MediaType, Platform, PostStatus } from '../types';
import { Btn, IconBtn, inputCls, Modal, Pill } from '../components/ui';

function MediaBlock({ media, tall }: { media: MediaType; tall?: boolean }) {
  if (media === 'none') return null;
  return (
    <div className={cx('relative mt-2 flex items-center justify-center overflow-hidden rounded-lg',
      tall ? 'aspect-[3/4]' : 'aspect-[16/10]')}
      style={{ background: media === 'video' ? 'linear-gradient(140deg,#1d2a24,#0f1712 65%)' : 'linear-gradient(135deg,#2c1e15,#6b4226 55%,#a3703f)' }}>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-card/15 text-card/90 backdrop-blur-sm">
        <Icon name={media === 'video' ? 'play' : 'image'} size={18} />
      </span>
      <span className="absolute bottom-2 right-2 rounded-md bg-night/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-card/80">
        {media}
      </span>
      {media === 'carousel' && (
        <span className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1">
          {[0, 1, 2].map(i => <span key={i} className={cx('h-1.5 rounded-full', i === 0 ? 'w-4 bg-card' : 'w-1.5 bg-card/45')} />)}
        </span>
      )}
    </div>
  );
}

function Preview({ p, text, media }: { p: Platform; text: string; media: MediaType }) {
  const body = text.trim() || 'Your post copy appears here…';
  const shared = 'mx-auto w-full max-w-[360px] rounded-xl border border-line bg-card p-3 text-left shadow-sm';
  switch (p) {
    case 'linkedin':
      return (
        <div className={shared}>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-moss/15 font-mono text-[10px] font-bold text-moss">E&O</div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-ink">Ember & Oak Roastery</p>
              <p className="text-[10px] text-faint">2,140 followers · 1h · <Icon name="globe" size={9} className="inline" /></p>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink2">{body}</p>
          <MediaBlock media={media} />
          <div className="mt-2.5 flex items-center gap-4 border-t border-line pt-2 text-faint">
            <span className="flex items-center gap-1 text-[10px]"><Icon name="check" size={12} /> Like</span>
            <span className="flex items-center gap-1 text-[10px]"><Icon name="message" size={11} /> Comment</span>
            <span className="flex items-center gap-1 text-[10px]"><Icon name="reply" size={11} /> Repost</span>
          </div>
        </div>
      );
    case 'instagram':
      return (
        <div className={shared}>
          <div className="flex items-center gap-2">
            <span className="rounded-full p-[2px]" style={{ background: 'linear-gradient(45deg,#f09433,#dc2743,#bc1888)' }}>
              <div className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-moss/20 font-mono text-[8px] font-bold text-pine">E&O</div>
            </span>
            <p className="text-xs font-bold text-ink">emberandoak</p>
            <Icon name="more" size={14} className="ml-auto text-mut" />
          </div>
          <MediaBlock media={media === 'none' ? 'image' : media} />
          <div className="mt-2 flex items-center gap-3 text-ink">
            <Icon name="heart" size={16} /><Icon name="message" size={15} /><Icon name="send" size={15} />
          </div>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-ink2"><span className="font-bold text-ink">emberandoak</span> {body}</p>
        </div>
      );
    case 'x':
      return (
        <div className={shared}>
          <div className="flex items-start gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-moss/15 font-mono text-[9px] font-bold text-moss">E&O</div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink">Ember & Oak <span className="font-normal text-faint">@emberandoak · now</span></p>
              <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-ink2">{body}</p>
              <MediaBlock media={media} />
              <div className="mt-2 flex items-center gap-6 text-faint">
                <span className="flex items-center gap-1 text-[10px]"><Icon name="message" size={12} /> 4</span>
                <span className="flex items-center gap-1 text-[10px]"><Icon name="reply" size={12} /> 12</span>
                <span className="flex items-center gap-1 text-[10px]"><Icon name="heart" size={12} /> 96</span>
              </div>
            </div>
          </div>
        </div>
      );
    case 'facebook':
      return (
        <div className={shared}>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-moss/15 font-mono text-[9px] font-bold text-moss">E&O</div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-ink">Ember & Oak</p>
              <p className="text-[10px] text-faint">Just now · <Icon name="globe" size={9} className="inline" /></p>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink2">{body}</p>
          <MediaBlock media={media} />
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[10px] text-faint">
            <span className="flex items-center gap-1"><Icon name="heart" size={11} /> Like</span>
            <span>Comment</span><span>Share</span>
          </div>
        </div>
      );
    case 'tiktok':
      return (
        <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-xl border border-line shadow-sm">
          <div className="relative flex aspect-[9/14] flex-col justify-end p-3" style={{ background: 'linear-gradient(160deg,#101712,#2c1e15 70%,#6b4226)' }}>
            <div className="absolute right-2 top-1/3 flex flex-col items-center gap-3 text-card/90">
              <span className="flex flex-col items-center text-[9px]"><Icon name="heart" size={17} />8.4K</span>
              <span className="flex flex-col items-center text-[9px]"><Icon name="message" size={15} />312</span>
              <span className="flex flex-col items-center text-[9px]"><Icon name="send" size={15} />980</span>
            </div>
            <p className="text-[10px] font-bold text-card">@emberandoak</p>
            <p className="mt-1 line-clamp-3 text-[10px] leading-snug text-card/85">{body}</p>
            <p className="mt-1.5 font-mono text-[8.5px] uppercase tracking-wider text-card/50">{media === 'none' ? 'video' : media} · original sound</p>
          </div>
        </div>
      );
    case 'youtube':
      return (
        <div className={shared}>
          <div className="relative flex aspect-video items-center justify-center rounded-lg" style={{ background: 'linear-gradient(140deg,#1d2a24,#0f1712)' }}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-card/15 text-card"><Icon name="play" size={18} /></span>
            <span className="absolute bottom-2 right-2 rounded bg-night/70 px-1 py-0.5 font-mono text-[9px] text-card">4:32</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-ink">{body.split('\n')[0]}</p>
          <p className="mt-1 text-[10px] text-faint">Ember & Oak Roastery · Premieres {TODAY}</p>
        </div>
      );
    case 'pinterest':
      return (
        <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          <div className="flex aspect-[3/4] items-center justify-center" style={{ background: 'linear-gradient(150deg,#6b4226,#a3703f)' }}>
            <Icon name="image" size={22} className="text-card/70" />
          </div>
          <p className="line-clamp-2 p-2.5 text-[11px] font-bold leading-snug text-ink">{body.split('\n')[0]}</p>
        </div>
      );
    case 'gmb':
      return (
        <div className={shared}>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-moss/15 font-mono text-[9px] font-bold text-moss">E&O</div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-ink">Ember & Oak — Portland</p>
              <p className="text-[10px] text-faint">Local update · just now</p>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-ink2">{body}</p>
          <MediaBlock media={media} />
          <div className="mt-2 flex gap-2">
            <span className="rounded-md bg-steelbg px-2.5 py-1 text-[10px] font-bold text-steel">Call</span>
            <span className="rounded-md bg-mint px-2.5 py-1 text-[10px] font-bold text-pine">Book online</span>
          </div>
        </div>
      );
  }
}

export function Composer() {
  const { s, a } = useApp();
  const { open, postId, date } = s.composer;
  const editing = useMemo(() => s.posts.find(p => p.id === postId) ?? null, [s.posts, postId]);

  const [text, setText] = useState('');
  const [plats, setPlats] = useState<Platform[]>(['linkedin']);
  const [media, setMedia] = useState<MediaType>('none');
  const [igFormat, setIgFormat] = useState<'feed' | 'story' | 'reel'>('feed');
  const [firstComment, setFirstComment] = useState('');
  const [campaign, setCampaign] = useState('');
  const [pdate, setPdate] = useState(TODAY);
  const [ptime, setPtime] = useState('12:00');
  const [tab, setTab] = useState<Platform>('linkedin');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (editing) {
      setText(editing.text); setPlats(editing.platforms); setMedia(editing.media);
      setFirstComment(editing.firstComment ?? ''); setCampaign(editing.campaign ?? '');
      setPdate(editing.date); setPtime(editing.time); setTab(editing.platforms[0]);
    } else {
      setText(''); setPlats(['linkedin']); setMedia('none'); setFirstComment(''); setCampaign('');
      setPdate(date ?? TODAY); setPtime('12:00'); setTab('linkedin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId, date]);

  if (!open) return null;

  const limit = Math.min(...plats.map(p => PLATFORMS[p].limit));
  const over = text.length > limit;
  const activeTab = plats.includes(tab) ? tab : plats[0];
  const igSelected = plats.includes('instagram');
  const tiktokSelected = plats.includes('tiktok');

  const validate = () => {
    if (!text.trim()) { setErr('Write something first — the preview needs copy.'); return false; }
    if (over) { setErr(`Over the ${limit}-character limit for ${PLATFORMS[plats.find(p => PLATFORMS[p].limit === limit) ?? 'x'].name}.`); return false; }
    return true;
  };

  const base = {
    text: text.trim(), platforms: plats, media, firstComment: igSelected ? firstComment.trim() : undefined,
    campaign: campaign || undefined, date: pdate, time: ptime,
  };

  const commit = (status: PostStatus, msg: string, kind: 'success' | 'info' | 'warning' = 'success') => {
    if (editing) {
      a.patchPost(editing.id, { ...base, status });
    } else {
      a.addPost({ ...base, status, author: 'Maya Chen', likes: 0, comments: 0, shares: 0 });
    }
    if (status === 'pending') a.notify(`Post submitted for approval: "${text.trim().slice(0, 44)}…"`);
    a.toast(msg, kind);
    a.closeComposer();
  };

  return (
    <Modal open onClose={a.closeComposer} w="max-w-4xl"
      title={editing ? 'Edit post' : 'Compose post'}
      sub={editing ? `Currently ${STATUSES[editing.status].label.toLowerCase()} · changes keep its place on the calendar` : 'Write once, publish everywhere — previews update live'}>
      <div className="grid gap-4 md:grid-cols-[1fr_340px]">
        {/* left: composer */}
        <div className="space-y-3.5">
          {editing?.status === 'pending' && (
            <p className="flex items-center gap-2 rounded-lg bg-amberbg px-3 py-2 text-xs font-medium text-amber"><Icon name="clock" size={13} /> Waiting on approval — editing resubmits it to the queue.</p>
          )}
          {editing?.rejectNote && (
            <p className="flex items-center gap-2 rounded-lg bg-dangerbg px-3 py-2 text-xs font-medium text-danger"><Icon name="alert" size={13} /> Rejected: {editing.rejectNote}</p>
          )}
          {editing?.status === 'failed' && (
            <p className="flex items-center gap-2 rounded-lg bg-dangerbg px-3 py-2 text-xs font-medium text-danger"><Icon name="alert" size={13} /> {editing.failReason ?? 'Publishing failed.'}</p>
          )}

          <div>
            <p className="mb-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Publish to</p>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_IDS.map(p => {
                const on = plats.includes(p);
                return (
                  <button key={p}
                    onClick={() => setPlats(ps => (on ? (ps.length > 1 ? ps.filter(x => x !== p) : ps) : [...ps, p]))}
                    className={cx('flex items-center gap-1.5 rounded-lg border py-1.5 pl-1.5 pr-2.5 text-[11.5px] font-semibold transition-all active:scale-95',
                      on ? 'border-transparent shadow-sm' : 'border-line bg-card text-faint hover:text-mut')}
                    style={on ? { background: PLATFORMS[p].tint, color: '#18201a' } : undefined}>
                    <PlatformIcon p={p} size={17} className={cx(!on && 'opacity-35 grayscale')} />
                    {PLATFORMS[p].name.split(' ')[0]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={5}
              placeholder="What's happening at the roastery? @mentions and line breaks work. Paste a link for video — we don't host video files."
              className={cx(inputCls, 'resize-none leading-relaxed')} />
            <div className="mt-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {(['none', 'image', 'video', 'carousel'] as MediaType[]).map(m => (
                  <button key={m} onClick={() => setMedia(m)}
                    className={cx('flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide transition',
                      media === m ? 'border-moss bg-mint text-pine' : 'border-line bg-card text-mut hover:border-line2')}>
                    <Icon name={m === 'none' ? 'x' : m === 'video' ? 'play' : 'image'} size={10} />{m}
                  </button>
                ))}
              </div>
              <span className={cx('font-mono text-[10.5px] font-semibold', over ? 'text-danger' : 'text-faint')}>
                {text.length} / {limit}
              </span>
            </div>
          </div>

          {igSelected && (
            <div className="anim-rise space-y-2.5">
              <div>
                <p className="mb-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Instagram format</p>
                <div className="flex gap-1.5">
                  {([
                    { id: 'feed', label: 'Feed', icon: 'image', note: 'photo / carousel' },
                    { id: 'story', label: 'Story', icon: 'clock', note: '24h · reminder to post manually if API blocked' },
                    { id: 'reel', label: 'Reel', icon: 'play', note: '9:16 video via Content Publishing' },
                  ] as const).map(f => (
                    <button key={f.id} onClick={() => { setIgFormat(f.id); if (f.id === 'reel' && media === 'none') setMedia('video'); }}
                      title={f.note}
                      className={cx('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11.5px] font-semibold transition-all active:scale-95',
                        igFormat === f.id ? 'border-transparent bg-mint text-pine shadow-sm' : 'border-line bg-card text-mut hover:border-line2 hover:text-ink2')}>
                      <Icon name={f.icon} size={13} /> {f.label}
                    </button>
                  ))}
                </div>
                {igFormat !== 'feed' && (
                  <p className="anim-rise mt-1.5 flex items-start gap-1.5 rounded-lg bg-paper px-2.5 py-2 text-[10.5px] leading-snug text-mut">
                    <Icon name="alert" size={12} className="mt-0.5 shrink-0 text-amber" />
                    {igFormat === 'story'
                      ? 'Stories publish where the API allows; otherwise we schedule it and push a reminder to post manually at the right moment.'
                      : 'Reels publish directly through the Instagram Content Publishing API (9:16 video link).'}
                  </p>
                )}
              </div>
              <div>
                <p className="mb-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">First comment · Instagram engagement hack</p>
                <input className={inputCls} value={firstComment} onChange={e => setFirstComment(e.target.value)} placeholder="e.g. Full story + brew guide — link in bio" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2.5">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Date</span>
              <input type="date" className={inputCls} value={pdate} onChange={e => setPdate(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Time</span>
              <input type="time" className={inputCls} value={ptime} onChange={e => setPtime(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Campaign</span>
              <select className={inputCls} value={campaign} onChange={e => setCampaign(e.target.value)}>
                <option value="">None</option>
                {s.campaigns.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          </div>

          <div className="space-y-1.5">
            {tiktokSelected && (
              <p className="flex items-start gap-1.5 rounded-lg bg-paper px-2.5 py-2 text-[10.5px] leading-snug text-mut">
                <Icon name="alert" size={12} className="mt-0.5 shrink-0 text-amber" />
                TikTok's API limits direct publishing — we'll schedule it and push a reminder to post manually for full reach.
              </p>
            )}
            {igSelected && (
              <p className="flex items-start gap-1.5 rounded-lg bg-paper px-2.5 py-2 text-[10.5px] leading-snug text-mut">
                <Icon name="bolt" size={12} className="mt-0.5 shrink-0 text-moss" />
                Instagram API: max 100 published posts per 24h — carousels count as a single post.
              </p>
            )}
          </div>

          {err && <p className="anim-shake rounded-lg bg-dangerbg px-3 py-2 text-xs font-medium text-danger">{err}</p>}

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3.5">
            {editing && (
              <Btn variant="dangerGhost" size="sm" onClick={() => { a.removePost(editing.id); a.closeComposer(); }}>
                <Icon name="trash" size={13} /> Delete
              </Btn>
            )}
            <div className="ml-auto flex flex-wrap gap-2">
              <Btn variant="ghost" size="sm" onClick={() => { if (validate()) commit('draft', 'Draft saved — find it on the calendar', 'info'); }}>Save draft</Btn>
              <Btn variant="outline" size="sm" onClick={() => { if (validate()) commit('pending', 'Submitted — Maya will be notified', 'info'); }}>
                <Icon name="clock" size={13} /> Submit for approval
              </Btn>
              <Btn variant="dark" size="sm" onClick={() => { if (validate()) commit('published', `Published to ${plats.length} platform${plats.length > 1 ? 's' : ''}`); }}>
                <Icon name="send" size={13} /> Post now
              </Btn>
              <Btn size="sm" onClick={() => { if (validate()) commit('scheduled', `Scheduled for ${pdate} at ${ptime}`); }}>
                <Icon name="calendar" size={13} /> {editing ? 'Update' : 'Schedule'}
              </Btn>
            </div>
          </div>
        </div>

        {/* right: preview */}
        <div className="rounded-xl border border-line bg-paper/70 p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Live preview</p>
            <div className="flex gap-1">
              {plats.map(p => (
                <button key={p} onClick={() => setTab(p)} title={PLATFORMS[p].name}
                  className={cx('rounded-md p-0.5 transition-all', activeTab === p ? 'bg-card shadow-sm ring-1 ring-line' : 'opacity-50 hover:opacity-90')}>
                  <PlatformIcon p={p} size={18} />
                </button>
              ))}
            </div>
          </div>
          <div key={activeTab + text.length} className="anim-fade max-h-[430px] overflow-y-auto pb-1">
            <Preview p={activeTab} text={text} media={media} />
          </div>
          <p className="mt-2 border-t border-line pt-2 text-center font-mono text-[9.5px] text-faint">
            Exactly what {PLATFORMS[activeTab].name} users will see
          </p>
        </div>
      </div>
    </Modal>
  );
}
