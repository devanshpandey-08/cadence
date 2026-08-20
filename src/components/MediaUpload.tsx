import { useEffect, useRef, useState } from 'react';
import { cx, Icon } from '../meta';
import type { MediaAttachment } from '../types';
import { Btn, inputCls } from './ui';

/** 300 KB or smaller → data-URL (persists across reloads, demo stand-in for S3). */
const PERSIST_LIMIT = 300 * 1024;
const IMAGE_LIMIT = 8 * 1024 * 1024;   // 8 MB
export const MAX_CAROUSEL = 4;

export interface LoadedImage { url: string; name: string; size: number; sessionOnly: boolean; }

/** Reads an image file → data-URL (small) or object-URL (large, session-only). */
export function readImageFile(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Not an image file')); return; }
    if (file.size > IMAGE_LIMIT) { reject(new Error('Over the 8 MB image limit')); return; }
    if (file.size <= PERSIST_LIMIT) {
      const r = new FileReader();
      r.onload = () => resolve({ url: String(r.result), name: file.name, size: file.size, sessionOnly: false });
      r.onerror = () => reject(new Error('Could not read file'));
      r.readAsDataURL(file);
    } else {
      resolve({ url: URL.createObjectURL(file), name: file.name, size: file.size, sessionOnly: true });
    }
  });
}

export const fmtSize = (n: number) =>
  n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;

const isVideoLink = (u: string) => /(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|\.mp4|\.webm|\.mov)(\?|$|\/)/i.test(u.trim());

/** YouTube/TikTok/Vimeo URL → embeddable preview src (best effort). */
export function videoEmbedSrc(u: string): string | null {
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = u.match(/vimeo\.com\/(\d+)/i);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return u;
  return null;
}

/* ------------------------------------------------------------------ */

export function MediaUpload({
  attachment, onChange, mode = 'full', label,
}: {
  attachment: MediaAttachment | null;
  onChange: (a: MediaAttachment | null) => void;
  mode?: 'full' | 'compact';
  label?: string;
}) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const progRef = useRef<number | null>(null);
  useEffect(() => () => { if (progRef.current) window.clearInterval(progRef.current); }, []);

  const ingest = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');
    const list = Array.from(files);
    setBusy(true); setProgress(8);
    progRef.current = window.setInterval(() => setProgress(p => Math.min(88, p + 14)), 90);
    try {
      const imgs: LoadedImage[] = [];
      for (const f of list) {
        if (f.type.startsWith('image/')) imgs.push(await readImageFile(f));
      }
      if (imgs.length === 0) {
        setError('Drop images here — video is added as a link (we never host video files).');
        return;
      }
      if (imgs.length === 1) {
        const im = imgs[0];
        onChange({ kind: 'image', url: im.url, name: im.name, sessionOnly: im.sessionOnly });
      } else {
        onChange({
          kind: 'carousel',
          urls: imgs.slice(0, MAX_CAROUSEL).map(i => i.url),
          name: `${imgs.length} images`,
          sessionOnly: imgs.some(i => i.sessionOnly),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      if (progRef.current) window.clearInterval(progRef.current);
      setBusy(false); setProgress(0);
    }
  };

  const attachLink = () => {
    if (!isVideoLink(link)) { setError('That does not look like a YouTube / Vimeo / TikTok / .mp4 link.'); return; }
    setError('');
    onChange({ kind: 'video', url: link.trim(), name: link.trim().replace(/^https?:\/\/(www\.)?/, '').slice(0, 42) });
    setLinkOpen(false); setLink('');
  };

  /* ---------- compact (single small image, e.g. a form logo) ---------- */
  if (mode === 'compact') {
    return (
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={() => inputRef.current?.click()}
          className="group relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg border-[1.5px] border-dashed border-line2 bg-paper/60 text-mut transition hover:border-moss hover:text-pine">
          {attachment?.url
            ? <img src={attachment.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            : <Icon name="image" size={16} />}
        </button>
        <div className="min-w-0 flex-1">
          {attachment?.url ? (
            <p className="flex items-center gap-1.5 truncate text-[11px] font-medium text-ink2">
              <Icon name="check" size={11} sw={3} className="text-moss" />
              <span className="truncate">{attachment.name ?? 'logo'}</span>
              <button type="button" onClick={() => onChange(null)} className="ml-auto shrink-0 text-faint transition hover:text-danger"><Icon name="x" size={12} /></button>
            </p>
          ) : (
            <p className="text-[10.5px] text-mut">{label ?? 'Upload logo'} <span className="text-faint">· PNG/JPG ≤ 8 MB</span></p>
          )}
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { void ingest(e.target.files); e.target.value = ''; }} />
      </div>
    );
  }

  /* ---------- full ---------- */
  const a = attachment;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.16em] text-mut">Media · photos & video</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setLinkOpen(o => !o)}
            className={cx('flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide transition',
              linkOpen || a?.kind === 'video' ? 'border-moss bg-mint text-pine' : 'border-line bg-card text-mut hover:border-line2 hover:text-ink2')}>
            <Icon name="video" size={11} /> video link
          </button>
          {a && (
            <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-semibold text-danger transition hover:bg-dangerbg">
              <Icon name="trash" size={11} /> Remove
            </button>
          )}
        </div>
      </div>

      {!a && !linkOpen && (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); void ingest(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={cx('grid cursor-pointer place-items-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-all',
            drag ? 'border-moss bg-mint/70 scale-[1.01]' : 'border-line2 bg-paper/50 hover:border-moss/60 hover:bg-mint/30')}>
          {busy ? (
            <div className="w-56">
              <p className="text-[12px] font-semibold text-ink2">Processing {progress}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-moss transition-all duration-150" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <>
              <span className={cx('grid h-11 w-11 place-items-center rounded-xl border-[1.5px] border-line2 bg-card text-mut shadow-hard-sm transition', drag && 'text-pine border-moss')}>
                <Icon name="upload" size={19} />
              </span>
              <p className="mt-2.5 text-[13px] font-bold text-ink">{drag ? 'Drop it.' : 'Drag photos here, or click to browse'}</p>
              <p className="mt-1 font-mono text-[10px] text-mut">
                ≤ 4 images → carousel · images ≤ 300 KB persist · video goes as a link
              </p>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => { void ingest(e.target.files); e.target.value = ''; }} />
        </div>
      )}

      {linkOpen && !a && (
        <div className="anim-rise flex items-center gap-2">
          <input className={inputCls} autoFocus value={link} onChange={e => setLink(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && attachLink()}
            placeholder="https://youtube.com/watch?v=… or a direct .mp4" />
          <Btn size="sm" onClick={attachLink}><Icon name="link" size={12} /> Attach</Btn>
        </div>
      )}

      {/* attached preview */}
      {a && (
        <div className="anim-pop mt-2 overflow-hidden rounded-xl border-[1.5px] border-line2 bg-night shadow-hard-sm">
          {a.kind === 'video' ? (
            <div>
              {videoEmbedSrc(a.url ?? '') ? (
                <iframe title="video preview" src={videoEmbedSrc(a.url ?? '') ?? undefined} className="aspect-video w-full" allowFullScreen />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-night2">
                  <span className="flex items-center gap-2 font-mono text-[11px] text-nighttx"><Icon name="video" size={15} /> preview plays on the platform</span>
                </div>
              )}
            </div>
          ) : a.kind === 'carousel' ? (
            <div className="grid grid-cols-4 gap-0.5">
              {(a.urls ?? []).map((u, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute bottom-1 left-1 rounded bg-night/70 px-1 font-mono text-[8.5px] font-bold text-card">{i + 1}/{a.urls?.length}</span>
                </div>
              ))}
            </div>
          ) : (
            <img src={a.url} alt={a.name ?? 'attachment'} className="max-h-64 w-full object-cover" />
          )}
          <div className="flex items-center gap-2 px-3 py-2">
            <Icon name={a.kind === 'video' ? 'video' : a.kind === 'carousel' ? 'image' : 'image'} size={13} className="shrink-0 text-lime" />
            <p className="min-w-0 flex-1 truncate font-mono text-[10px] text-nighttx">{a.name}</p>
            {a.kind !== 'video' && a.sessionOnly && (
              <span className="shrink-0 rounded bg-night2 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-butter" title="Larger than the 300 KB persist limit — in production this lives in S3">
                session only · S3 in prod
              </span>
            )}
            <span className="shrink-0 rounded bg-night2 px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider text-lime">{a.kind}</span>
          </div>
        </div>
      )}

      {error && <p className="anim-shake mt-2 rounded-lg bg-dangerbg px-3 py-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}
