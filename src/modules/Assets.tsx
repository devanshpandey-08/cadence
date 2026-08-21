import { useMemo, useRef, useState } from 'react';
import { useApp, useCanEdit } from '../store';
import { cx, Icon, relTime, uid } from '../meta';
import type { Asset } from '../types';
import { Btn, Card, EmptyState, IconBtn, inputCls, Pill, SectionTitle } from '../components/ui';
import { fmtSize, readImageFile } from '../components/MediaUpload';

const FOLDERS = ['all', 'product', 'brand', 'campaign', 'people'] as const;
type Folder = (typeof FOLDERS)[number];

export function Assets() {
  const { s, a } = useApp();
  const can = useCanEdit();
  const [folder, setFolder] = useState<Folder>('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const rows = useMemo(() => s.assets.filter(x =>
    (folder === 'all' || x.tag === folder) &&
    (!q.trim() || x.name.toLowerCase().includes(q.trim().toLowerCase())),
  ), [s.assets, folder, q]);

  const usage = (x: Asset) => s.posts.filter(p =>
    p.attachment?.url === x.url || (p.attachment?.urls ?? []).includes(x.url),
  ).length;

  const totalBytes = s.assets.reduce((n, x) => n + x.size, 0);
  const quota = 5 * 1024 * 1024 * 1024; // 5 GB S3 bucket in the demo story

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !can) return;
    setBusy(true);
    let added = 0;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const im = await readImageFile(f);
        a.addAsset({ id: uid(), name: f.name, url: im.url, size: f.size, kind: 'image', tag: folder === 'all' ? 'brand' : folder, createdAt: new Date().toISOString().slice(0, 10) });
        added += 1;
      } catch { /* skip bad files */ }
    }
    setBusy(false);
    if (added) a.toast(`${added} asset${added > 1 ? 's' : ''} uploaded to the library`, 'success');
    else a.toast('No image files found in that selection', 'warning');
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Icon name="search" size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search assets…"
            className="h-9 w-[220px] rounded-lg border border-line bg-card pl-8 pr-3 text-[13px] outline-none transition placeholder:text-faint focus:border-moss focus:ring-2 focus:ring-moss/15" />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {FOLDERS.map(f => {
            const n = f === 'all' ? s.assets.length : s.assets.filter(x => x.tag === f).length;
            return (
              <button key={f} onClick={() => setFolder(f)}
                className={cx('rounded-full border px-2.5 py-1 font-mono text-[10.5px] font-semibold capitalize transition active:scale-95',
                  folder === f ? 'border-moss bg-mint text-pine' : 'border-line bg-card text-mut hover:border-line2 hover:text-ink2')}>
                {f} <span className="opacity-60">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { void onFiles(e.target.files); e.target.value = ''; }} />
          <Btn onClick={() => inputRef.current?.click()} disabled={!can || busy}>
            <Icon name={busy ? 'refresh' : 'upload'} size={14} className={busy ? 'animate-spin' : ''} /> {busy ? 'Uploading…' : 'Upload'}
          </Btn>
        </div>
      </div>

      {/* storage meter */}
      <Card className="flex flex-wrap items-center gap-4 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-mint text-moss"><Icon name="image" size={17} /></span>
        <div className="min-w-[220px] flex-1">
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] font-bold text-ink">Media storage · S3 bucket</p>
            <p className="tnum font-mono text-[10.5px] text-mut">{fmtSize(totalBytes)} of 5 GB</p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line/70">
            <div className="anim-grow h-full rounded-full bg-moss" style={{ width: `${Math.max(1.5, (totalBytes / quota) * 100)}%` }} />
          </div>
        </div>
        <p className="hidden max-w-[300px] text-[10.5px] leading-relaxed text-faint md:block">
          Images ≤300 KB persist across sessions in the demo; production streams straight to S3 with CDN delivery.
        </p>
      </Card>

      {rows.length === 0 ? (
        <EmptyState icon="image" title="No assets here yet" sub="Upload product shots, brand photography or campaign art — then attach them to any post in one click."
          action={<Btn size="sm" onClick={() => inputRef.current?.click()}><Icon name="upload" size={13} /> Upload your first asset</Btn>} />
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-4">
          {rows.map(x => {
            const used = usage(x);
            return (
              <Card key={x.id} className="group overflow-hidden" hover>
                <div className="relative aspect-[4/3] overflow-hidden bg-night">
                  <img src={x.url} alt={x.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                  <span className="absolute left-2 top-2">
                    <Pill color="#f4f4ef" tint="rgb(20 20 15 / 0.72)" className="capitalize backdrop-blur-sm">{x.tag}</Pill>
                  </span>
                  {used > 0 && (
                    <span className="absolute right-2 top-2">
                      <Pill color="#c8f169" tint="rgb(20 20 15 / 0.72)"><Icon name="send" size={9} /> used {used}×</Pill>
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-center gap-1.5 bg-gradient-to-t from-night/85 to-transparent px-2 pb-2 pt-6 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                    <Btn size="sm" variant="primary" onClick={() => { a.openComposer({ attachment: { kind: 'image', url: x.url, name: x.name } }); a.toast('Asset staged — finish your post in the composer', 'info'); }}>
                      <Icon name="send" size={12} /> Use in post
                    </Btn>
                    <IconBtn name="copy" title="Copy URL" className="bg-card/90 hover:bg-card"
                      onClick={() => { try { void navigator.clipboard.writeText(x.url); } catch { /* noop */ } a.toast('Asset URL copied', 'info'); }} />
                    <IconBtn name="trash" title="Delete asset" className="bg-card/90 hover:bg-dangerbg hover:text-danger" onClick={() => a.removeAsset(x.id)} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[12px] font-bold text-ink">{x.name}</p>
                    <p className="font-mono text-[9.5px] text-faint">{fmtSize(x.size)} · {relTime(x.createdAt)}</p>
                  </div>
                  <select value={x.tag} onChange={e => { a.removeAsset(x.id); a.addAsset({ ...x, tag: e.target.value }); a.toast(`Moved to "${e.target.value}"`, 'info'); }}
                    title="Move to folder" onClick={e => e.stopPropagation()}
                    className="h-7 shrink-0 rounded-md border border-line bg-card px-1 font-mono text-[9.5px] font-semibold text-mut outline-none focus:border-moss">
                    {FOLDERS.filter(f => f !== 'all').map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <SectionTitle>How the library feeds the product</SectionTitle>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { icon: 'send', t: 'Composer', d: '"Use in post" stages the asset directly into a new post across all 8 platforms.' },
              { icon: 'layout', t: 'Landing pages', d: 'Hero & gallery blocks pull from this same bucket — one source of truth.' },
              { icon: 'mail', t: 'Email blocks', d: 'Image blocks in campaigns reference stored assets, never hotlinked files.' },
            ].map(x => (
              <div key={x.t} className="rounded-lg border border-line bg-paper/50 p-3">
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-ink"><Icon name={x.icon} size={13} className="text-moss" /> {x.t}</p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-mut">{x.d}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <SectionTitle>Folder tips</SectionTitle>
          <ul className="space-y-1.5 text-[11px] leading-relaxed text-ink2">
            {['product — packs, bottles, pour shots', 'brand — interiors, team, lifestyle', 'campaign — per-campaign creative sets', 'people — founders, baristas, customers'].map(x => (
              <li key={x} className="flex items-start gap-1.5"><Icon name="check" size={11} sw={3} className="mt-[3px] shrink-0 text-moss" />{x}</li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
