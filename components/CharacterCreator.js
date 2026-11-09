'use client';
import { motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Shuffle, Sparkles } from 'lucide-react';
import ClassIcon from './ClassIcon';
import { CLASSES, CLASS_LOOK, HAIRSTYLES, LOOK, RACES, STATS, STAT_LABEL, WEAPON_LABEL, buildCharacter, defaultLook, fmtMod, skillsFor, totalMod } from '@/lib/data';
import { emit } from '@/lib/client';
import { useLang } from '@/lib/lang';
import LangToggle from './LangToggle';

export default function CharacterCreator({ me, room, onDone }) {
  const prev = me.character;
  const [name, setName] = useState(prev?.name || me.name);
  const [raceId, setRace] = useState(prev?.raceId || 'human');
  const [classId, setClass] = useState(prev?.classId || 'fighter');
  const [backstory, setBackstory] = useState(prev?.backstory || '');
  const [look, setLook] = useState(prev?.look || defaultLook(prev?.classId || 'fighter', prev?.raceId || 'human'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const preview = useMemo(() => buildCharacter({ name: name || me.name, classId, raceId, backstory, look }), [name, classId, raceId, backstory, look, me.name]);
  const cls = CLASSES[classId];
  const { T, D } = useLang();
  const skills = skillsFor(preview);

  const chooseClass = (id) => {
    setClass(id);
    // ganti kelas → pakai busana khas kelas itu, warna kulit/rambut tetap
    setLook((l) => ({ ...defaultLook(id, raceId), skin: l.skin, hair: l.hair, boots: l.boots }));
  };
  const chooseRace = (id) => {
    setRace(id);
    setLook((l) => ({ ...l, skin: defaultLook(classId, id).skin }));
  };
  const randomize = () => {
    const r = (arr) => arr[Math.floor(Math.random() * arr.length)];
    setLook({
      skin: r(LOOK.skin),
      hair: r(LOOK.hair),
      outfit: r(LOOK.outfit),
      pants: r(LOOK.pants),
      boots: r(LOOK.boots),
      hairstyle: r(Object.keys(HAIRSTYLES)),
      weapon: r(CLASS_LOOK[classId].weapons),
    });
  };

  async function submit() {
    setBusy(true);
    setError('');
    const res = await emit('char:set', { name, classId, raceId, backstory, look });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    onDone?.();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <p className="font-display text-xs tracking-[0.4em] text-ember uppercase">
          {T('cc.room', { code: room.code })}
          {room.phase !== 'lobby' ? T('cc.running') : ''}
        </p>
        <h1 className="gold-text mt-2 font-display text-4xl font-black sm:text-5xl">{T('cc.title')}</h1>
        <div className="mt-3 flex justify-center"><LangToggle /></div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="panel rounded-2xl p-5">
            <Label n="1">{T('cc.name')}</Label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              className="mt-2 w-full rounded-lg border border-gold/20 bg-ink/70 px-4 py-3 font-display text-xl outline-none focus:border-ember/70"
            />
          </section>

          <section className="panel rounded-2xl p-5">
            <Label n="2">{T('cc.race')}</Label>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(RACES).map(([id, r]) => (
                <Choice key={id} active={raceId === id} onClick={() => chooseRace(id)}>
                  <p className="font-display font-bold">{D.race(id, r.label)}</p>
                  <p className="mt-0.5 text-xs text-gold/80">
                    {Object.entries(r.bonus)
                      .map(([s, v]) => `${s} +${v}`)
                      .join(' · ')}
                  </p>
                  <p className="mt-1 text-xs text-parch-dim">{D.raceTrait(id, r.trait)}</p>
                </Choice>
              ))}
            </div>
          </section>

          <section className="panel rounded-2xl p-5">
            <Label n="3">{T('cc.class')}</Label>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(CLASSES).map(([id, c]) => (
                <Choice key={id} active={classId === id} onClick={() => chooseClass(id)} color={c.color}>
                  <div className="flex items-center gap-2">
                    <ClassIcon classId={id} size={20} />
                    <p className="font-display font-bold">{c.label}</p>
                  </div>
                  <p className="mt-1 text-xs text-parch-dim">{D.classTagline(id, c.tagline)}</p>
                  <p className="mt-2 text-[11px] text-parch-dim/80">
                    HP d{c.hitDie} · AC {c.ac} · {c.primary}
                  </p>
                </Choice>
              ))}
            </div>
          </section>

          <section className="panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <Label n="4">{T('cc.look')}</Label>
              <button onClick={randomize} className="flex items-center gap-1.5 rounded-full border border-gold/25 px-3 py-1 text-xs text-gold hover:bg-gold/10">
                <Shuffle size={13} /> {T('cc.random')}
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Swatches label={T('cc.skin')} value={look.skin} options={LOOK.skin} onChange={(v) => setLook({ ...look, skin: v })} />
              <Swatches label={T('cc.hair')} value={look.hair} options={LOOK.hair} onChange={(v) => setLook({ ...look, hair: v })} />
              <Swatches label={T('cc.outfit')} value={look.outfit} options={LOOK.outfit} onChange={(v) => setLook({ ...look, outfit: v })} />
              <Swatches label={T('cc.pants')} value={look.pants} options={LOOK.pants} onChange={(v) => setLook({ ...look, pants: v })} />
              <Swatches label={T('cc.boots')} value={look.boots} options={LOOK.boots} onChange={(v) => setLook({ ...look, boots: v })} />
              <Pills label={T('cc.head')} value={look.hairstyle} options={Object.entries(HAIRSTYLES).map(([k, v]) => [k, D.hair(k, v)])} onChange={(v) => setLook({ ...look, hairstyle: v })} />
            </div>
            <div className="mt-4">
              <Pills label={T('cc.weapon')} value={look.weapon} options={CLASS_LOOK[classId].weapons.map((w) => [w, D.weapon(w, WEAPON_LABEL[w])])} onChange={(v) => setLook({ ...look, weapon: v })} />
            </div>
          </section>

          <section className="panel rounded-2xl p-5">
            <Label n="5">{T('cc.backstory')}</Label>
            <textarea
              value={backstory}
              onChange={(e) => setBackstory(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder={T('cc.backstoryPh')}
              className="mt-2 w-full resize-none rounded-lg border border-gold/20 bg-ink/70 px-4 py-3 font-story text-lg outline-none focus:border-ember/70"
            />
            <p className="mt-1 text-right text-xs text-parch-dim">{T('cc.backstoryHint', { n: backstory.length })}</p>
          </section>
        </div>

        <motion.aside layout className="panel h-fit rounded-2xl p-4 lg:sticky lg:top-6">
          <PreviewStage character={preview} />
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {skills.map((s) => (
              <PreviewSkill key={s.id} skill={s} character={preview} />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-bold">{preview.name}</p>
              <p className="text-sm text-parch-dim">
                {D.race(raceId, RACES[raceId].label)} {cls.label} · {T('cc.level1')}
              </p>
            </div>
            <div className="flex gap-2 text-center">
              <Stat label="HP" value={preview.maxHp} tone="text-blood" />
              <Stat label="AC" value={preview.ac} tone="text-gold" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-6 gap-1">
            {STATS.map((s) => (
              <div key={s} title={D.stat(s, STAT_LABEL[s])} className={`rounded-md border py-1 text-center ${s === cls.primary ? 'border-ember/50 bg-ember/10' : 'border-gold/10 bg-ink/40'}`}>
                <p className="text-[9px] tracking-widest text-parch-dim">{s}</p>
                <p className="font-display text-base font-bold">{fmtMod(totalMod(preview, s))}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-parch-dim">{D.classFeature(classId, cls.feature)}</p>

          <button
            onClick={submit}
            disabled={busy || !name.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-ember to-[#c4621f] py-3 font-display font-bold tracking-wider text-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            <Sparkles size={18} /> {busy ? T('cc.forging') : prev ? T('cc.save') : T('cc.create')}
          </button>
          {prev && onDone && (
            <button onClick={onDone} className="mt-2 w-full text-sm text-parch-dim hover:text-parch">
              {T('common.cancel')}
            </button>
          )}
          {error && <p className="mt-2 text-sm text-blood">{error}</p>}
        </motion.aside>
      </div>
    </main>
  );
}

// ---- pratinjau: hero kustom vs boneka jerami ----
let previewStage = null;
function PreviewStage({ character }) {
  const ref = useRef(null);
  const latest = useRef(character);
  latest.current = character;

  useEffect(() => {
    let st;
    let cancelled = false;
    import('@/lib/stage/engine').then(({ Stage }) => {
      if (cancelled || !ref.current) return;
      st = new Stage(ref.current, { preview: true });
      previewStage = st;
      st.syncHeroes([{ id: 'preview', character: latest.current }]);
      st.syncEnemies([{ id: 'dummy', name: 'Boneka', type: 'dummy', hp: 1, maxHp: 1 }]);
    });
    return () => {
      cancelled = true;
      st?.destroy();
      if (previewStage === st) previewStage = null;
    };
  }, []);

  useEffect(() => {
    previewStage?.syncHeroes([{ id: 'preview', character }]);
  }, [character]);

  return (
    <div className="overflow-hidden rounded-xl border border-gold/20">
      <canvas ref={ref} width={320} height={180} className="block aspect-video w-full bg-coal" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}

function PreviewSkill({ skill, character }) {
  const { D } = useLang();
  return (
    <button
      onClick={() => {
        if (!previewStage || previewStage.running) return;
        previewStage.enqueue([{ kind: 'skill', actor: 'preview', skill: skill.id, target: skill.ally ? 'preview' : 'dummy' }]);
      }}
      title={D.skillDesc(skill)}
      className="group flex items-center gap-1.5 rounded-lg border border-gold/15 bg-ink/50 px-2 py-1.5 text-left text-xs transition hover:border-ember/60"
    >
      <Play size={11} className="shrink-0 text-ember transition group-hover:scale-125" />
      <span className="truncate">{D.skillName(skill)}</span>
      <span className="ml-auto shrink-0 text-[10px] text-parch-dim">{fmtMod(totalMod(character, skill.stat))}</span>
    </button>
  );
}

function Swatches({ label, value, options, onChange }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-widest text-parch-dim uppercase">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`${label} ${c}`}
            className={`h-7 w-7 rounded-md transition active:scale-90 ${value === c ? 'ring-2 ring-ember ring-offset-2 ring-offset-coal' : 'ring-1 ring-black/40 hover:scale-110'}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

function Pills({ label, value, options, onChange }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-widest text-parch-dim uppercase">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`rounded-full border px-3 py-1 text-xs transition ${value === v ? 'border-ember bg-ember/10 text-ember' : 'border-gold/15 text-parch-dim hover:text-parch'}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Label({ n, children }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold tracking-widest text-parch-dim uppercase">
      <span className="grid h-5 w-5 place-items-center rounded-full border border-gold/40 font-display text-[10px] text-gold">{n}</span>
      {children}
    </p>
  );
}

function Choice({ active, onClick, children, color = '#f08a3c' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-xl border p-3 text-left transition active:scale-[0.98] ${active ? 'bg-ember/[0.08]' : 'border-gold/10 bg-ink/40 hover:border-gold/30'}`}
      style={active ? { borderColor: color, boxShadow: `0 0 0 1px ${color}55, 0 10px 30px -15px ${color}` } : undefined}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-gold/10 bg-ink/40 px-3 py-1">
      <p className={`font-display text-2xl leading-tight font-black ${tone}`}>{value}</p>
      <p className="text-[9px] tracking-widest text-parch-dim uppercase">{label}</p>
    </div>
  );
}
