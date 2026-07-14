export function Mission() {
  return (
    <section id="mission" className="bg-peach-light py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="mb-4 text-sm font-semibold tracking-widest text-red uppercase">
          Beyond the hospital
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
          Teaching why time matters
        </h2>
        <p className="mt-8 text-lg leading-[1.85] text-text-muted">
          Inside hospitals, we build tools that help them save time. Outside, we
          run a public channel on the moments when time counts in medicine, and
          what to do in them. Same goal both ways:{" "}
          <span className="font-semibold text-red">
            saving time in medicine.
          </span>
        </p>
        <a
          href="https://www.instagram.com/doqto.health/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-red transition hover:text-red-dark"
        >
          @doqto.health on Instagram
        </a>
      </div>
    </section>
  );
}
