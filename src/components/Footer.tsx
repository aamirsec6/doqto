import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-red/10 bg-peach-light py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center">
        <Image
          src="/icon.png"
          alt="DOQTO"
          width={40}
          height={40}
          className="h-10 w-10"
        />
        <p className="font-display text-sm font-medium tracking-wide text-red">
          Every minute, accounted for.
        </p>
        <p className="text-xs text-text-muted">
          © 2026 DOQTO · India
        </p>
      </div>
    </footer>
  );
}
