import { ContactForm } from "@/components/ContactForm";

export function Contact() {
  return (
    <section id="contact" className="bg-peach py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="mb-4 text-sm font-semibold tracking-widest text-red uppercase">
            Get in touch
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-text md:text-4xl">
            Partnerships, pilots & investment
          </h2>
          <p className="mt-6 text-lg text-text-muted">
            Tell us what you&apos;re looking for. We&apos;ll get back to you.
          </p>
        </div>

        <div className="mt-12">
          <ContactForm />
        </div>

        <p className="mt-10 text-center text-sm text-text-muted">
          Prefer LinkedIn?{" "}
          <a
            href="https://linkedin.com/company/doqto"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-red transition hover:text-red-dark"
          >
            Connect with us
          </a>
        </p>
      </div>
    </section>
  );
}
