import { useRef, useState } from 'react';
import { useApp } from '../store';
import { cx, Icon } from '../meta';
import { Btn, Card, Field, inputCls, Pill, SectionTitle } from '../components/ui';
import { syntheticContacts } from '../testing/framework';

type Src = 'hubspot' | 'klaviyo';

interface ImportStep { label: string; count?: number }
const STEPS: Record<Src, ImportStep[]> = {
  hubspot: [
    { label: 'Authenticate & list objects' },
    { label: 'Pull contacts + properties', count: 48210 },
    { label: 'Pull companies', count: 3120 },
    { label: 'Pull deals + stages', count: 1204 },
    { label: 'Pull lists + email templates', count: 86 },
    { label: 'Auto-map properties → Cadence fields' },
    { label: 'Dedupe against existing CRM' },
    { label: 'Write to unified database' },
  ],
  klaviyo: [
    { label: 'Authenticate & list profiles' },
    { label: 'Pull profiles + segments', count: 21470 },
    { label: 'Pull flows (drip sequences)', count: 14 },
    { label: 'Pull campaigns + metrics', count: 220 },
    { label: 'Map segments → Cadence lists' },
    { label: 'Dedupe against existing CRM' },
    { label: 'Write to unified database' },
  ],
};

const SRC_META: Record<Src, { name: string; icon: string; tone: string; tag: string; what: string }> = {
  hubspot: {
    name: 'HubSpot', icon: 'kanban', tone: '#e0713a', tag: 'CRM + deals + lists',
    what: 'Contacts, companies, deals with stage mapping, lists, and email templates — the full CRM you are leaving behind.',
  },
  klaviyo: {
    name: 'Klaviyo', icon: 'mail', tone: '#2c8c7a', tag: 'Email profiles + flows',
    what: 'Subscriber profiles, segments, drip flows, and campaign history — brings your email audience with you.',
  },
};

interface ImportRun { src: Src; step: number; done: boolean; started: number }

export function Importers() {
  const { s, a } = useApp();
  const [run, setRun] = useState<ImportRun | null>(null);
  const [keys, setKeys] = useState<Record<Src, string>>({ hubspot: '', klaviyo: '' });
  const timers = useRef<number[]>([]);

  const start = (src: Src) => {
    if (run && !run.done) return;
    if (!keys[src].trim()) { a.toast(`Paste your ${SRC_META[src].name} API key first`, 'warning'); return; }
    const steps = STEPS[src];
    setRun({ src, step: 0, done: false, started: Date.now() });
    timers.current.forEach(t => window.clearTimeout(t));
    timers.current = [];
    steps.forEach((_, i) => {
      const t = window.setTimeout(() => {
        setRun(r => (r && r.src === src ? { ...r, step: i + 1, done: i + 1 >= steps.length } : r));
        if (i + 1 >= steps.length) {
          const n = src === 'hubspot' ? 850 : 420;
          const { added, merged } = a.importContacts(syntheticContacts(n).map(c => ({ ...c, id: `${src}-${c.id}`, source: 'Import' })));
          a.toast(`${SRC_META[src].name} import complete — ${added.toLocaleString()} added · ${merged.toLocaleString()} merged, 0 duplicates`, 'success');
        }
      }, 420 * (i + 1));
      timers.current.push(t);
    });
  };

  const canEdit = s.me?.role !== 'viewer';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-moss">
            <span className="inline-block h-[6px] w-[6px] rounded-[2px] bg-moss" />P0 · Migration
          </p>
          <h1 className="mt-1.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink">One-click importers</h1>
          <p className="mt-1 max-w-[640px] text-[12.5px] leading-relaxed text-mut">
            Bring your CRM and your email list in one move. Property mapping is automatic, dedupe runs before write, and nothing lands until you confirm the preview.
          </p>
        </div>
        <Pill color="#1e6b4f" tint="#e2ede6" dot>under 10 min for 50K contacts</Pill>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {(Object.keys(SRC_META) as Src[]).map(src => {
          const meta = SRC_META[src];
          const steps = STEPS[src];
          const isRunning = run?.src === src;
          const step = isRunning ? run.step : 0;
          const done = isRunning && run.done;
          return (
            <Card key={src} className="col-span-12 flex flex-col overflow-hidden lg:col-span-6" hover>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: meta.tone + '22', color: meta.tone }}>
                  <Icon name={meta.icon} size={19} sw={2} />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[15px] font-bold text-ink">{meta.name}</p>
                  <p className="font-mono text-[9.5px] uppercase tracking-wider text-mut">{meta.tag}</p>
                </div>
                {done && <Pill color="#2c8c7a" tint="#dcebe4" dot>imported</Pill>}
                {isRunning && !done && <Pill color="#a3690e" tint="#f5e7cb" dot>running</Pill>}
              </div>

              <div className="flex-1 px-4 py-3.5">
                <p className="text-[11.5px] leading-relaxed text-mut">{meta.what}</p>

                <div className="mt-3.5 space-y-1">
                  {steps.map((st, i) => {
                    const state = !isRunning ? 'idle' : i < step ? 'done' : i === step ? 'active' : 'wait';
                    return (
                      <div key={st.label} className={cx('flex items-center gap-2.5 rounded-md px-2 py-1.5 transition',
                        state === 'active' && 'bg-mint/40', state === 'done' && 'opacity-80')}>
                        <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full font-mono text-[9px] font-bold transition',
                          state === 'done' ? 'bg-moss text-night' : state === 'active' ? 'bg-ember text-night' : 'border border-line2 text-faint')}>
                          {state === 'done' ? <Icon name="check" size={10} sw={3} /> : state === 'active' ? <span className="live-dot h-1.5 w-1.5 rounded-full bg-night" /> : i + 1}
                        </span>
                        <p className={cx('flex-1 text-[11.5px]', state === 'active' ? 'font-bold text-ink' : 'font-medium text-ink2')}>{st.label}</p>
                        {st.count && state === 'done' && <span className="tnum font-mono text-[9.5px] font-bold text-mut">{st.count.toLocaleString()}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-line bg-paper/40 px-4 py-3.5">
                <Field label={`${meta.name} API key`} hint={src === 'hubspot' ? 'private app token' : 'private key'}>
                  <div className="flex gap-2">
                    <input className={inputCls} value={keys[src]} onChange={e => setKeys(k => ({ ...k, [src]: e.target.value }))}
                      placeholder={src === 'hubspot' ? 'pat-na1-…' : 'pk_…'} type="password" disabled={!canEdit} />
                    <Btn onClick={() => start(src)} disabled={!canEdit || (isRunning && !done)}>
                      <Icon name={done ? 'refresh' : 'download'} size={13} /> {done ? 'Re-run' : isRunning ? 'Importing…' : 'Import'}
                    </Btn>
                  </div>
                </Field>
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
                  <Icon name="shield" size={11} className="mt-0.5 shrink-0" />
                  Read-only scope. Keys are stored encrypted at rest and never logged. {meta.name} data maps into the same unified schema as everything else.
                </p>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <SectionTitle right={<Pill color="#35598f" tint="#e3e9f2">property auto-mapping</Pill>}>
          What happens to your fields
        </SectionTitle>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {[
            { from: 'hs_email / $email', to: 'email', note: 'identity key' },
            { from: 'firstname + lastname', to: 'name', note: 'concatenated' },
            { from: 'dealstage / $consent', to: 'deal stage / tags', note: 'stage-mapped' },
            { from: 'hs_lifecycle_stage', to: 'source + tags', note: 'lifecycle → tag' },
            { from: 'phone / $phone_number', to: 'phone', note: 'E.164 normalized' },
            { from: 'createdate / $created', to: 'createdAt', note: 'ISO-8601' },
          ].map(m => (
            <div key={m.from} className="flex items-center gap-2 rounded-lg border border-line bg-paper/40 px-3 py-2">
              <span className="font-mono text-[10px] font-semibold text-mut">{m.from}</span>
              <Icon name="chevr" size={12} className="shrink-0 text-faint" />
              <span className="font-mono text-[10px] font-bold text-moss">{m.to}</span>
              <span className="ml-auto rounded bg-card px-1.5 py-0.5 font-mono text-[8.5px] text-faint ring-1 ring-line">{m.note}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
