const milestones = [
  { label: "Problem validated", done: true },
  { label: "System designed", done: true },
  { label: "Public channel live", done: true },
  { label: "Building the working prototype", done: false, current: true },
  { label: "First pilot hospitals identified", done: false, current: true },
];

export function Status() {
  return (
    <section className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <p className="mb-4 text-center text-sm font-semibold tracking-widest text-red uppercase">
          Where we are today
        </p>
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
          Building deliberately, and openly
        </h2>

        <div className="mt-14 space-y-4">
          {milestones.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-4 rounded-xl border px-6 py-4 ${
                item.current
                  ? "border-red/30 bg-red-muted"
                  : item.done
                    ? "border-red/10 bg-peach-light"
                    : "border-red/10 bg-peach-light opacity-50"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  item.done
                    ? "bg-red text-white"
                    : item.current
                      ? "border-2 border-red bg-white"
                      : "border-2 border-red/30 bg-white"
                }`}
              >
                {item.done ? (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : item.current ? (
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red" />
                ) : null}
              </div>
              <span
                className={`text-base ${
                  item.current ? "font-medium text-text" : "text-text-muted"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
