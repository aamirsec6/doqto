const portfolio = [
  {
    title: "Safety & Emergency Response",
    description:
      "One-tap alerts, locate the nearest responder, dispatch, and auto-log everything for compliance.",
  },
  {
    title: "Operations & Flow",
    description:
      "Find any clinician in seconds, see live load across the hospital, and move patients without phone calls.",
  },
  {
    title: "Assets & Patients",
    description:
      "Track equipment and patient movement. End the search, end the loss.",
  },
  {
    title: "The Trackable Hospital",
    description:
      "A real-time operational view, the hospital's command centre.",
  },
];

export function Solution() {
  return (
    <section id="solution" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <p className="mb-4 text-sm font-semibold tracking-widest text-red uppercase">
            What DOQTO does
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
            One platform, four ways in
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-text-muted">
            Enter where the need is sharpest. Grow with the hospital from there.
            Designed to fit how hospitals already work.
          </p>
        </div>

        <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {portfolio.map((item, i) => (
            <div key={item.title} className="border-t border-red/15 pt-6">
              <p className="font-mono text-xs font-semibold tracking-wider text-red">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-display text-xl font-semibold text-text">
                {item.title}
              </h3>
              <p className="mt-3 leading-relaxed text-text-muted">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
