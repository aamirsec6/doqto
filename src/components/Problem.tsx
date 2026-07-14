export function Problem() {
  return (
    <section id="problem" className="bg-peach-light py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold tracking-widest text-red uppercase">
            The problem we&apos;re solving
          </p>
          <div className="section-divider mb-10" />
          <p className="text-lg leading-[1.85] text-text-muted md:text-xl">
            In an emergency, the difference between recovery and loss is measured
            in minutes. Yet hospitals routinely lose those minutes not to
            medicine, but to{" "}
            <span className="font-medium text-text">not knowing</span>. Where is
            the on-call doctor. Where is the nearest free bed. Where is the
            equipment. What is the patient&apos;s status. Today this information
            lives in phone calls, footsteps, and people&apos;s memory, not in a
            system. A hospital cannot see itself in real time, and that blindness
            has a cost.{" "}
            <span className="font-semibold text-red">Patients pay it.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
