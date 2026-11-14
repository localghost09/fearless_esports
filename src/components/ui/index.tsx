import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[linear-gradient(180deg,#e4ff91_0%,#d3ff55_46%,#c1f238_100%)] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_14px_34px_-14px_rgba(211,255,85,0.55)] hover:-translate-y-px hover:brightness-[1.04] active:translate-y-0 active:brightness-95",
  secondary:
    "border border-white/10 bg-white/[0.045] text-mist shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/20 hover:bg-white/[0.075]",
  ghost: "text-muted hover:bg-white/[0.05] hover:text-mist",
  danger:
    "border border-orange/25 bg-orange/10 text-[#ff9a80] hover:bg-orange/15 hover:border-orange/35",
  dark: "border border-white/10 bg-ink/80 text-mist hover:border-white/20 hover:bg-surface-2",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-10 px-4 text-[10px] gap-1.5 rounded-xl",
  md: "h-12 px-5 text-[11px] gap-2 rounded-xl",
  lg: "h-14 px-6 text-xs gap-2.5 rounded-[14px]",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex min-w-0 select-none items-center justify-center text-center font-bold uppercase tracking-[0.11em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:pointer-events-none disabled:opacity-40",
    variants[variant],
    sizes[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  arrow,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: boolean;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...props}>
      {children}
      {arrow ? <ArrowUpRight className="size-4" strokeWidth={2.5} /> : null}
    </Link>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "lime" | "orange" | "violet" | "ice" | "red" | "outline";
  className?: string;
}) {
  const tones = {
    neutral: "bg-white/[0.06] text-mist/75 border-white/10",
    lime: "bg-lime/10 text-lime border-lime/25",
    orange: "bg-orange/10 text-[#ff9a80] border-orange/25",
    violet: "bg-violet/10 text-[#c3b9ff] border-violet/25",
    ice: "bg-ice/10 text-[#a8efff] border-ice/25",
    red: "bg-red-500/10 text-red-300 border-red-500/25",
    outline: "bg-transparent text-muted border-line",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[9px] font-extrabold uppercase tracking-[0.13em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-orange opacity-70" />
      <span className="relative inline-flex size-2 rounded-full bg-orange" />
    </span>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          {label}
        </span>
        {hint ? <span className="text-[10px] text-muted/50">{hint}</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-[11px] text-[#ff8b70]">{error}</span> : null}
    </label>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] px-4 text-[13px] font-medium text-mist shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] placeholder:text-muted/40 transition hover:border-white/15 focus:border-violet/50 focus:bg-white/[0.05] focus:outline-none focus:ring-2 focus:ring-violet/10";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(inputClass, "h-auto min-h-24 resize-y py-3", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "appearance-none pr-10", className)} {...props}>
      {children}
    </select>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2.5 flex items-center gap-2.5 text-[9px] font-extrabold uppercase tracking-[0.2em] text-violet">
            <span className="h-px w-5 bg-violet/50" />
            {eyebrow}
          </p>
        ) : null}
        <h2 className="section-title text-mist">{title}</h2>
        {description ? (
          <p className="mt-2.5 max-w-xl text-[12px] leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="group hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted transition hover:border-violet/35 hover:text-violet sm:flex"
        >
          {actionLabel}
          <ArrowUpRight className="size-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </div>
  );
}

export function Progress({
  value,
  total,
  className,
  tone = "lime",
}: {
  value: number;
  total: number;
  className?: string;
  tone?: "lime" | "orange" | "violet";
}) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(1, total)) * 100));
  const tones = {
    lime: "bg-[linear-gradient(90deg,#b6ee2e,#d3ff55)] shadow-[0_0_14px_rgba(211,255,85,0.45)]",
    orange: "bg-[linear-gradient(90deg,#e04c2b,#ff6a45)] shadow-[0_0_14px_rgba(255,106,69,0.4)]",
    violet: "bg-[linear-gradient(90deg,#8b7cff,#b3a8ff)] shadow-[0_0_14px_rgba(169,156,255,0.4)]",
  } as const;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-white/[0.07]", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-2xl border border-violet/25 bg-violet/[0.08] text-violet shadow-[0_0_30px_-10px_rgba(140,92,255,0.6)]">
        {icon}
      </div>
      <h3 className="font-display text-xl font-bold uppercase tracking-[-0.02em] text-mist">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
