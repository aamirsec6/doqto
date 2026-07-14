import { HospitalTracker } from "@/components/HospitalTracker";

const pillars = [
  { title: "See", detail: "Hospital-wide visibility" },
  { title: "Find", detail: "People, patients & assets" },
  { title: "Act", detail: "When minutes matter" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-peach pt-24 pb-16 md:pt-28 md:pb-24">
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="order-1 flex flex-col lg:col-span-5">
            <p className="animate-fade-in text-[11px] font-medium tracking-[0.18em] text-red/70 uppercase">
              Built by doctors · India
            </p>

            <h1 className="animate-fade-up mt-5 font-display text-4xl font-semibold leading-[1.12] tracking-tight text-text sm:text-5xl">
              Every minute,{" "}
              <span className="text-red">accounted for.</span>
            </h1>

            <p className="animate-fade-up delay-100 mt-6 max-w-md text-base leading-relaxed text-text-muted md:text-lg">
              Real-time intelligence that helps hospitals save the time they lose
              every day, starting with the minutes that decide whether a patient
              lives.
            </p>

            <div className="animate-fade-up delay-200 mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-xl bg-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-dark"
              >
                Get in touch
              </a>
              <a
                href="#problem"
                className="inline-flex items-center justify-center rounded-xl border border-red/20 bg-white/70 px-5 py-3 text-sm font-semibold text-red transition hover:border-red hover:bg-white"
              >
                Why this exists
              </a>
            </div>

            <div className="animate-fade-up delay-300 mt-10 grid grid-cols-3 gap-0 border-t border-red/15 pt-6">
              {pillars.map((item, index) => (
                <div
                  key={item.title}
                  className={`pr-4 ${index > 0 ? "border-l border-red/15 pl-4" : ""}`}
                >
                  <p className="font-display text-lg font-semibold text-red">
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-text-muted">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="order-2 animate-fade-in delay-100 lg:col-span-7">
            <HospitalTracker />
          </div>
        </div>
      </div>
    </section>
  );
}
