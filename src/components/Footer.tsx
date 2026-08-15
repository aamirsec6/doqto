import Image from "next/image";
import Link from "next/link";

const footerLinks = [
  { href: "/compliance", label: "Compliance" },
  { href: "/#contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-red/10 bg-peach-light py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icon.png"
            alt="DOQTO"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <span className="font-display text-sm font-semibold tracking-[0.18em] text-red">
            DOQTO
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold text-text-muted transition hover:text-red"
            >
              {link.label}
            </Link>
          ))}
          <a
            href="https://www.linkedin.com/company/doqto/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-red transition hover:text-red-dark"
          >
            LinkedIn
          </a>
        </nav>

        <p className="text-xs text-text-muted">© 2026 DOQTO · India</p>
      </div>
    </footer>
  );
}
