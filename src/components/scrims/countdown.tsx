"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Countdown({
  target,
  format = "short",
  className,
  hideIfStarted = false,
}: {
  target: string;
  format?: "short" | "boxes" | "hm";
  className?: string;
  hideIfStarted?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (now === null) {
    return (
      <span className={cn("tabular text-muted/40", className)} aria-hidden="true">
        {format === "boxes" ? "— — : — —" : "IN —H —M"}
      </span>
    );
  }

  const diff = new Date(target).getTime() - now;
  if (diff <= 0) {
    if (hideIfStarted) return null;
    return (
      <span className={cn("inline-flex items-center gap-1.5 font-bold text-orange", className)}>
        <span className="size-1.5 animate-pulse rounded-full bg-orange" />
        LIVE
      </span>
    );
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  if (format === "boxes") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {days > 0 ? (
          <Box value={pad(days)} label="DAYS" />
        ) : null}
        <Box value={pad(hours)} label="HRS" />
        <Box value={pad(minutes)} label="MIN" />
        <Box value={pad(seconds)} label="SEC" />
      </div>
    );
  }

  if (format === "hm") {
    return (
      <span className={cn("tabular", className)}>
        {days > 0 ? `${days}d ` : ""}
        {pad(hours)}h {pad(minutes)}m
      </span>
    );
  }

  return (
    <span className={cn("tabular", className)}>
      {days > 0 ? `IN ${days}D ${pad(hours)}H` : `IN ${pad(hours)}H ${pad(minutes)}M`}
    </span>
  );
}

function Box({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex min-w-12 flex-col items-center rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-sm">
      <span className="font-display text-xl leading-none font-bold tabular text-mist">{value}</span>
      <span className="mt-1 text-[7px] font-bold tracking-[0.16em] text-muted">{label}</span>
    </span>
  );
}

export function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className={className}>—</span>;
  return (
    <span className={className}>
      {new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      })
        .format(new Date(iso))
        .toUpperCase()}
    </span>
  );
}
