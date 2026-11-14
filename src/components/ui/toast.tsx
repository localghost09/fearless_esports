"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: Tone;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: Tone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: Check,
  error: AlertTriangle,
  info: Info,
};

const tones = {
  success: "border-lime/30 text-lime",
  error: "border-orange/35 text-[#ff8b70]",
  info: "border-[#56E1FF]/30 text-[#8cebff]",
};

function ToastRow({ item, onDone }: { item: ToastItem; onDone: (id: string) => void }) {
  const Icon = icons[item.tone];
  useEffect(() => {
    const timeout = window.setTimeout(() => onDone(item.id), 4200);
    return () => window.clearTimeout(timeout);
  }, [item.id, onDone]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-[min(420px,calc(100vw-32px))] items-start gap-3 rounded-xl border bg-[#0d1116]/95 p-3.5 shadow-2xl backdrop-blur-xl",
        tones[item.tone],
      )}
      role="status"
    >
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-white/6">
        <Icon className="size-3.5" strokeWidth={3} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-mist">{item.title}</p>
        {item.description ? (
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{item.description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => onDone(item.id)}
        aria-label="Dismiss notification"
        className="text-muted transition hover:text-mist"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue["toast"]>(({ title, description, tone = "success" }) => {
    const id = crypto.randomUUID();
    setItems((current) => [...current.slice(-2), { id, title, description, tone }]);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[90] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((item) => (
          <ToastRow key={item.id} item={item} onDone={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
