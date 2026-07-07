export function Mission() {
  return (
    <section className="bg-peach-light py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <p className="mb-4 text-sm font-semibold tracking-widest text-red uppercase">
          Two ways of fighting the same problem
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
          Our mission
        </h2>
        <p className="mt-8 text-lg leading-[1.85] text-text-muted">
          Inside hospitals, we&apos;re building tools that help them save time.
          And beyond them, we run a public channel teaching people why time
          matters so much in medicine — the moments when it counts, and what to
          do in them. Both halves serve the same goal:{" "}
          <span className="font-semibold text-red">
            saving time in medicine.
          </span>
        </p>
        <a
          href="https://www.instagram.com/doqto.health/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center gap-2 rounded-full border border-red/20 bg-white px-6 py-3 text-sm font-medium text-red transition-all hover:border-red hover:bg-red hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
          </svg>
          Follow on Instagram
        </a>
      </div>
    </section>
  );
}
