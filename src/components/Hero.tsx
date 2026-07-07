import Image from "next/image";
import { HospitalTracker } from "@/components/HospitalTracker";

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-peach pt-24 pb-16 md:pt-28 md:pb-20">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-red/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-red/5 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
        {/* Animated floor plan — shown first on mobile for impact */}
        <div className="animate-fade-in order-1 w-full lg:order-2">
          <HospitalTracker />
        </div>

        {/* Copy */}
        <div className="order-2 flex flex-col items-center text-center lg:order-1 lg:items-start lg:text-left">
          <div className="animate-fade-in">
            <Image
              src="/logo.png"
              alt="DOQTO"
              width={360}
              height={150}
              priority
              className="h-auto w-full max-w-xs md:max-w-sm"
            />
          </div>

          <h1 className="animate-fade-up mt-8 font-display text-3xl font-semibold leading-tight tracking-tight text-red sm:text-4xl lg:text-5xl">
            Every minute, accounted for.
          </h1>

          <p className="animate-fade-up delay-100 mt-6 max-w-lg text-base leading-relaxed text-text-muted md:text-lg">
            Real-time intelligence that helps hospitals save the time they lose
            every day — starting with the minutes that decide whether a patient
            lives.
          </p>

          <p className="animate-fade-up delay-200 mt-8 text-xs font-medium tracking-widest text-red/70 uppercase">
            Built by doctors. Based in India.
          </p>

          <div className="animate-fade-up delay-300 mt-10 hidden flex-wrap gap-6 lg:flex">
            <div className="rounded-xl border border-red/10 bg-white/50 px-5 py-3 backdrop-blur-sm">
              <p className="font-display text-2xl font-bold text-red">Live</p>
              <p className="text-xs text-text-muted">Hospital visibility</p>
            </div>
            <div className="rounded-xl border border-red/10 bg-white/50 px-5 py-3 backdrop-blur-sm">
              <p className="font-display text-2xl font-bold text-red">RFID</p>
              <p className="text-xs text-text-muted">Asset &amp; people tracking</p>
            </div>
            <div className="rounded-xl border border-red/10 bg-white/50 px-5 py-3 backdrop-blur-sm">
              <p className="font-display text-2xl font-bold text-red">0</p>
              <p className="text-xs text-text-muted">New hardware needed</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
