import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/config";

export function LogoMark({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/fe-mark.png"
      alt=""
      width={512}
      height={512}
      aria-hidden="true"
      className={cn("size-7 object-contain", className)}
    />
  );
}

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label={`${BRAND.name} home`}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <span className="relative flex size-9 items-center justify-center rounded-[11px] border border-white/12 bg-[radial-gradient(circle_at_50%_24%,rgba(139,92,246,0.18),rgba(8,7,12,0.98)_72%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_-8px_rgba(139,92,246,0.55)] transition-transform duration-300 group-hover:-rotate-6">
        <LogoMark className="size-[30px]" />
      </span>
      {!compact ? (
        <span className="font-display leading-none font-extrabold uppercase text-mist">
          <span className="block text-[20px] tracking-[-0.035em]">Fearless</span>
          <span className="mt-1 flex items-center gap-1.5 text-[7px] font-bold tracking-[0.4em] text-violet">
            <span className="h-px w-2.5 bg-violet/60" />
            Esports
          </span>
        </span>
      ) : null}
    </Link>
  );
}
