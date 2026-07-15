import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-red/10 bg-peach-light py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
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
        <div className="flex flex-col items-center gap-2 sm:items-end">
          <a
            href="https://www.linkedin.com/company/doqto/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-red transition hover:text-red-dark"
          >
            LinkedIn
          </a>
          <p className="text-xs text-text-muted">© 2026 DOQTO · India</p>
        </div>
      </div>
    </footer>
  );
}
