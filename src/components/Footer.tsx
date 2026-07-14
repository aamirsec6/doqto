import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-red/10 bg-peach-light py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icon.png"
            alt="DOQTO"
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <span className="font-display text-sm font-semibold tracking-[0.18em] text-red">
            DOQTO
          </span>
        </div>
        <p className="text-xs text-text-muted">© 2026 DOQTO · India</p>
      </div>
    </footer>
  );
}
