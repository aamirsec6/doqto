const stats = [
  {
    value: "0.804",
    label: "Reliability of the Visibility Deficit Index",
  },
  {
    value: "−0.570",
    label: "Effect on staff satisfaction — the strongest factor (p < 0.001)",
  },
  {
    value: "88",
    label: "Hospital workers surveyed",
  },
];

export function Research() {
  return (
    <section id="research" className="relative overflow-hidden bg-red py-24 text-white md:py-32">
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-white blur-3xl" />
        <div className="absolute right-1/4 bottom-0 h-96 w-96 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold tracking-widest text-white/70 uppercase">
            This isn&apos;t a guess. We validated it.
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            The empirical case for one platform
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-white/85">
            Before building, we ran a formal study of 88 hospital workers. The
            finding was striking: staff don&apos;t experience safety, locating,
            equipment, coordination and records as separate problems —
            statistical analysis collapsed them into a single underlying factor
            we call the{" "}
            <span className="font-semibold text-white">
              Visibility Deficit
            </span>
            . It is the strongest driver of staff dissatisfaction we measured.
            That is the empirical case for one platform, not six disconnected
            tools.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.value}
              className="rounded-2xl border border-white/20 bg-white/10 p-8 backdrop-blur-sm"
            >
              <p className="stat-number font-display text-5xl font-bold tracking-tight md:text-6xl">
                {stat.value}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-white/80">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
