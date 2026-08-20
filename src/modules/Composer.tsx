import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../store';
import { addDays, cx, Icon, isoOf, PLATFORM_IDS, PLATFORMS, PlatformIcon, STATUSES, TODAY } from '../meta';
import type { MediaAttachment, MediaType, Platform, PostStatus } from '../types';
import { Btn, IconBtn, inputCls, Modal, Pill } from '../components/ui';
import { MediaUpload, videoEmbedSrc } from '../components/MediaUpload';

/** Deterministic hashtag suggestions from the copy's topic words. */
function suggestedTags(text: string): string[] {
  const stop = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'is', 'are', 'was', 'our', 'your', 'we', 'you', 'this', 'that', 'at', 'by']);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
    .filter(w => w.length > 3 && !stop.has(w));
  const uniq = Array.from(new Set(words)).slice(0, 3).map(w => `#${w}`);
  const evergreen = ['#coffee', '#specialtycoffee', '#roastery'];
  return Array.from(new Set([...uniq, ...evergreen.filter(e => !uniq.includes(e))])).slice(0, 5);
}

function MediaBlock({ media, att, tall }: { media: MediaType; att?: MediaAttachment | null; tall?: boolean }) {
  if (media === 'none') return null;
  const embed = att?.kind === 'video' && att.url ? videoEmbedSrc(att.url) : null;
  const img = att?.kind === 'image' && att.url ? att.url : att?.kind === 'carousel' && att.urls?.length ? att.urls[0] : null;
  return (
    <div className={cx('relative mt-2 flex items-center justify-center overflow-hidden rounded-lg',
      tall ? 'aspect-[3/4]' : 'aspect-[16/10]')}
      style={{ background: media === 'video' ? 'linear-gradient(140deg,#1d2a24,#0f1712 65%)' : 'linear-gradient(135deg,#2c1e15,#6b4226 55%,#a3703f)' }}>
      {embed && <iframe title="media" src={embed} className="absolute inset-0 h-full w-full" allowFullScreen />}
      {img && <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {!embed && !img && (
        <span className="grid h-10 w-10 place-items-center rounded-full bg-card/15 text-card/90 backdrop-blur-sm">
          <Icon name={media === 'video' ? 'play' : 'image'} size={18} />
        </span>
      )}
      <span className="absolute bottom-2 right-2 rounded-md bg-night/60 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-card/80">
        {media}
      </span>
      {media === 'carousel' && (
        <span className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1">
          {Array.from({ length: att?.urls?.length ?? 3 }).slice(0, 4).map((_, i) => <span key={i} className={cx('h-1.5 rounded-full', i === 0 ? 'w-4 bg-card' : 'w-1.5 bg-card/45')} />)}
        </span>
      )}
    </div>
  );
}

function Preview({ p, text, media, att }: { p: Platform; text: string; media: MediaType; att?: MediaAttachment | null }) {
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
          <MediaBlock media={media} att={att} />
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
          <MediaBlock media={media === 'none' ? 'image' : media} att={att} />
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
              <MediaBlock media={media} att={att} />
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
          <MediaBlock media={media} att={att} />
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
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg" style={{ background: 'linear-gradient(140deg,#1d2a24,#0f1712)' }}>
            {att?.kind === 'video' && att.url && videoEmbedSrc(att.url)
              ? <iframe title="video" src={videoEmbedSrc(att.url) ?? undefined} className="absolute inset-0 h-full w-full" allowFullScreen />
              : <span className="grid h-10 w-10 place-items-center rounded-full bg-card/15 text-card"><Icon name="play" size={18} /></span>}
            <span className="absolute bottom-2 right-2 rounded bg-night/70 px-1 py-0.5 font-mono text-[9px] text-card">{att?.kind === 'video' ? 'linked' : '4:32'}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug text-ink">{body.split('\n')[0]}</p>
          <p className="mt-1 text-[10px] text-faint">Ember & Oak Roastery · Premieres {TODAY}</p>
        </div>
      );
    case 'pinterest':
      return (
        <div className="mx-auto w-full max-w-[240px] overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
          <div className="relative flex aspect-[3/4] items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(150deg,#6b4226,#a3703f)' }}>
            {att?.kind === 'image' && att.url
              ? <img src={att.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
              : att?.kind === 'carousel' && att.urls?.length
                ? <img src={att.urls[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                : <Icon name="image" size={22} className="text-card/70" />}
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
          <MediaBlock media={media} att={att} />
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
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const media: MediaType = attachment?.kind ?? 'none';
  const [igFormat, setIgFormat] = useState<'feed' | 'story' | 'reel'>('feed');
  const [overrides, setOverrides] = useState<Partial<Record<Platform, string>>>({});
  const [showOverrides, setShowOverrides] = useState(false);
  const [utm, setUtm] = useState(true);
  const [shorten, setShorten] = useState(true);
  const [firstComment, setFirstComment] = useState('');
  const [campaign, setCampaign] = useState('');
  const [pdate, setPdate] = useState(TODAY);
  const [ptime, setPtime] = useState('12:00');
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [repeatCount, setRepeatCount] = useState(4);
  const [tab, setTab] = useState<Platform>('linkedin');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (editing) {
      setText(editing.text); setPlats(editing.platforms); setAttachment(editing.attachment ?? null);
      setFirstComment(editing.firstComment ?? ''); setCampaign(editing.campaign ?? '');
      setPdate(editing.date); setPtime(editing.time); setTab(editing.platforms[0]);
    } else {
      setText(''); setPlats(['linkedin']); setAttachment(s.composer.attachment ?? null); setFirstComment(''); setCampaign('');
      setPdate(date ?? TODAY); setPtime('12:00'); setTab('linkedin');
    }
    setOverrides(editing?.perPlatform ?? {}); setShowOverrides(false); setUtm(true); setShorten(true);
    setRepeat('none'); setRepeatCount(4);
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
    if (igSelected && igFormat === 'reel' && attachment?.kind !== 'video') {
      setErr('Reels need a video — attach a YouTube/TikTok/.mp4 link in the Media section.');
      return false;
    }
    if (tiktokSelected && media !== 'video') {
      setErr('TikTok posts are video — attach a video link (or uncheck TikTok for this post).');
      return false;
    }
    return true;
  };

  /* link tooling applied per platform at commit time */
  const decorate = (raw: string, p: Platform) => {
    let out = raw;
    const short = `https://cadence.site/${Math.random().toString(36).slice(2, 7)}`;
    out = out.replace(/https?:\/\/\S+/g, m => (shorten ? short : m));
    if (utm) {
      const params = `utm_source=${p}&utm_medium=social&utm_campaign=${encodeURIComponent(campaign || 'organic')}`;
      out = out.replace(/(https?:\/\/\S+)/g, m => (m.includes('?') ? `${m}&${params}` : `${m}?${params}`));
    }
    return out;
  };

  const activeOverrides = Object.fromEntries(
    plats.filter(p => overrides[p] && overrides[p]!.trim() && overrides[p]!.trim() !== text.trim()).map(p => [p, overrides[p]!.trim()]),
  ) as Partial<Record<Platform, string>>;

  const base = {
    text: decorate(text.trim(), plats[0]),
    platforms: plats, media,
    attachment: attachment ?? undefined,
    perPlatform: Object.keys(activeOverrides).length
      ? Object.fromEntries(Object.entries(activeOverrides).map(([p, t]) => [p, decorate(t, p as Platform)])) as Partial<Record<Platform, string>>
      : undefined,
    firstComment: igSelected ? firstComment.trim() : undefined,
    campaign: campaign || undefined, date: pdate, time: ptime,
  };

  const shift = (n: number) => {
    const d = new Date(pdate + 'T00:00:00');
    if (repeat === 'daily') return isoOf(addDays(d, n));
    if (repeat === 'weekly') return isoOf(addDays(d, n * 7));
    if (repeat === 'monthly') { const x = new Date(d); x.setMonth(x.getMonth() + n); return isoOf(x); }
    return pdate;
  };

  const commit = (status: PostStatus, msg: string, kind: 'success' | 'info' | 'warning' = 'success') => {
    if (editing) {
      a.patchPost(editing.id, { ...base, status });
    } else {
      a.addPost({ ...base, status, author: 'Maya Chen', likes: 0, comments: 0, shares: 0 });
      // recurring series: schedule the follow-ups (new posts only)
      if (repeat !== 'none' && status === 'scheduled') {
        for (let i = 1; i < repeatCount; i++) {
          a.addPost({ ...base, date: shift(i), status: 'scheduled', author: 'Maya Chen', likes: 0, comments: 0, shares: 0 });
        }
      }
    }
    if (status === 'pending') a.notify(`Post submitted for approval: "${text.trim().slice(0, 44)}…"`);
    const seriesNote = repeat !== 'none' && status === 'scheduled' && !editing ? ` · ${repeatCount}-post ${repeat} series` : '';
    a.toast(msg + seriesNote, kind);
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
            <div className="mt-1 flex items-center justify-end">
              <span className={cx('font-mono text-[10.5px] font-semibold', over ? 'text-danger' : 'text-faint')}>
                {text.length} / {limit}
              </span>
            </div>

            {/* hashtag suggestions + link tooling */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-wider text-faint">hashtags</span>
              {suggestedTags(text).map(h => (
                <button key={h} onClick={() => setText(t => (t.includes(h) ? t : `${t.trimEnd()} ${h}`))}
                  className={cx('rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold transition active:scale-95',
                    text.includes(h) ? 'border-moss bg-mint text-pine' : 'border-line bg-card text-mut hover:border-moss hover:text-pine')}>
                  {h}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-line" />
              <label className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] font-semibold text-mut">
                <input type="checkbox" checked={utm} onChange={e => setUtm(e.target.checked)} className="h-3 w-3 accent-[#0b7a55]" />
                auto-UTM
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] font-semibold text-mut">
                <input type="checkbox" checked={shorten} onChange={e => setShorten(e.target.checked)} className="h-3 w-3 accent-[#0b7a55]" />
                shorten links
              </label>
            </div>

            {/* per-platform customization */}
            <button onClick={() => setShowOverrides(o => !o)}
              className={cx('mt-2 flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide transition',
                showOverrides || Object.keys(activeOverrides).length ? 'border-moss bg-mint text-pine' : 'border-line bg-card text-mut hover:border-line2')}>
              <Icon name="edit" size={10} /> per-platform copy {Object.keys(activeOverrides).length > 0 && `· ${Object.keys(activeOverrides).length} custom`}
            </button>
            {showOverrides && (
              <div className="anim-rise mt-2 space-y-2">
                {plats.map(p => (
                  <label key={p} className="block">
                    <span className="mb-1 flex items-center gap-1.5 font-mono text-[9.5px] font-semibold uppercase tracking-wider text-mut">
                      <PlatformIcon p={p} size={13} /> {PLATFORMS[p].name} override
                    </span>
                    <textarea rows={2} value={overrides[p] ?? ''} placeholder={text.trim() || 'Same as master copy'}
                      onChange={e => setOverrides(o => ({ ...o, [p]: e.target.value }))}
                      className={cx(inputCls, 'resize-none text-xs leading-relaxed')} />
                  </label>
                ))}
              </div>
            )}
          </div>

          <MediaUpload attachment={attachment} onChange={setAttachment} />

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
                    <button key={f.id} onClick={() => setIgFormat(f.id)}
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

          <div className="grid grid-cols-2 gap-2.5">
            <label className="block">
              <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Repeat</span>
              <select className={inputCls} value={repeat} onChange={e => setRepeat(e.target.value as typeof repeat)}>
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            {repeat !== 'none' && (
              <label className="block anim-rise">
                <span className="mb-1 block font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-mut">Occurrences</span>
                <input type="number" min={2} max={12} className={inputCls} value={repeatCount}
                  onChange={e => setRepeatCount(Math.min(12, Math.max(2, Number(e.target.value) || 2)))} />
              </label>
            )}
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
            <Preview p={activeTab} text={overrides[activeTab] && overrides[activeTab]!.trim() ? overrides[activeTab]! : text} media={media} att={attachment} />
          </div>
          <p className="mt-2 border-t border-line pt-2 text-center font-mono text-[9.5px] text-faint">
            Exactly what {PLATFORMS[activeTab].name} users will see
          </p>
        </div>
      </div>
    </Modal>
  );
}
