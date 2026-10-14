export function PolicyPage({ title, intro, sections }: { title: string; intro?: string; sections: { h: string; p?: string; items?: string[] }[] }) {
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-black sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 leading-8 text-ink-soft">{intro}</p>}
      <div className="mt-8 space-y-7">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="mb-2 text-xl font-extrabold">{s.h}</h2>
            {s.p && <p className="leading-8 text-ink-soft">{s.p}</p>}
            {s.items && <ul className="mt-2 list-disc space-y-1.5 ps-6 leading-8 text-ink-soft">{s.items.map((i) => <li key={i}>{i}</li>)}</ul>}
          </section>
        ))}
      </div>
    </div>
  );
}
