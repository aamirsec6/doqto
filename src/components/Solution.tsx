const portfolio = [
  {
    title: "Safety & Emergency Response",
    description:
      "One-tap alerts, locate the nearest responder, dispatch, and auto-log everything for compliance.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Operations & Flow",
    description:
      "Find any clinician in seconds, see live load across the hospital, and move patients without phone calls.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Assets & Patients",
    description:
      "Track equipment and patient movement. End the search, end the loss.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "The Trackable Hospital",
    description:
      "A real-time operational view — the hospital's command centre.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Solution() {
  return (
    <section id="solution" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold tracking-widest text-red uppercase">
            What DOQTO does
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
            Real-time intelligence for hospitals
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-text-muted">
            DOQTO is a real-time intelligence platform for hospitals. It gives a
            hospital the ability to see itself — where its people, patients and
            equipment are, and where time is being lost — and to act on it in
            the moment. It runs on infrastructure hospitals already have, so it
            doesn&apos;t demand expensive hardware.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          {portfolio.map((item, i) => (
            <div
              key={item.title}
              className="card-hover group rounded-2xl border border-red/10 bg-peach-light p-8"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="mb-5 inline-flex rounded-xl bg-red/10 p-3 text-red transition-colors group-hover:bg-red group-hover:text-white">
                {item.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-text">
                {item.title}
              </h3>
              <p className="mt-3 leading-relaxed text-text-muted">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-12 text-center text-base font-medium text-text-muted italic">
          One platform, entered where the need is sharpest, that grows with the
          hospital.
        </p>
      </div>
    </section>
  );
}
