import Link from "next/link";

const sections = [
  {
    title: "Built for Indian hospitals",
    body: "DOQTO is made for ward work, emergencies, and quality reviews. It is not a consumer GPS app.",
  },
  {
    title: "We follow India’s data protection law",
    body: "Staff location is personal data. We only use it for hospital operations, limit who can see it, and do not keep live location longer than needed. This follows the Digital Personal Data Protection Act, 2023.",
  },
  {
    title: "We help with accreditation evidence",
    body: "When a Code Blue or alert happens, DOQTO records the time it started, who was sent, and when they confirmed. Hospitals can use that timeline for NABH or JCI quality reviews. DOQTO does not give you the accreditation certificate.",
  },
  {
    title: "We collect only what is needed",
    body: "People are shown by ward zone, not exact GPS. Equipment shows last known zone. Shared screens prefer bed numbers and initials instead of full patient names when possible.",
  },
  {
    title: "Clear access and records",
    body: "Different roles see different things. Important actions are logged. Hospitals can ask how long we keep location data and incident records.",
  },
  {
    title: "Ready for hospital security review",
    body: "For a pilot or purchase, we can answer security questions and sign a data processing agreement covering where data is hosted and who helps run the service.",
  },
];

export function CompliancePage() {
  return (
    <main className="bg-peach pt-24 pb-20 md:pt-28 md:pb-28">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-[11px] font-medium tracking-[0.18em] text-red/70 uppercase">
          Compliance
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-text md:text-5xl">
          How DOQTO handles hospital data
        </h1>
        <p className="mt-5 text-base leading-relaxed text-text-muted md:text-lg">
          Simple rules. No overselling. Here is what we do and what we do not
          claim.
        </p>

        <div className="mt-12 space-y-6">
          {sections.map((section, index) => (
            <article
              key={section.title}
              className="border border-red/12 bg-white/80 px-6 py-6"
            >
              <p className="font-mono text-xs font-semibold tracking-wider text-red">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-2 font-display text-xl font-semibold text-text">
                {section.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-text-muted">
                {section.body}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-12 border border-red/20 bg-white px-6 py-7">
          <h2 className="font-display text-xl font-semibold text-text">
            What we do not claim
          </h2>
          <div className="mt-4 space-y-3 text-base leading-relaxed text-text-muted">
            <p>DOQTO is not a certified electronic medical record system.</p>
            <p>
              DOQTO is not HIPAA certified, SOC 2 certified, or ISO 27001
              certified unless we complete those audits and say so clearly.
            </p>
            <p>
              DOQTO is not an NABH or JCI accreditation body. We help hospitals
              keep timed records for their own reviews.
            </p>
            <p>
              Location is by hospital zone. It is not centimetre accurate indoor
              GPS.
            </p>
          </div>
        </div>

        <div className="mt-10">
          <Link
            href="/#contact"
            className="inline-flex items-center justify-center rounded-xl bg-red px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-dark"
          >
            Talk about security or a data agreement
          </Link>
        </div>
      </div>
    </main>
  );
}
