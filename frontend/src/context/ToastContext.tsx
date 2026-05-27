"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from "react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 3;
const DISMISS_MS = 5000;

function nextId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visibleToasts, setVisibleToasts] = useState<Toast[]>([]);
  const [queue, setQueue] = useState<Toast[]>([]);

  // Track timers by toast id so we can reliably clear.
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setVisibleToasts((prev) => prev.filter((t) => t.id !== id));
    setQueue((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const flushQueue = useCallback(() => {
    setQueue((prevQueue) => {
      let nextQueue = prevQueue;
      setVisibleToasts((prevVisible) => {
        const capacity = MAX_VISIBLE - prevVisible.length;
        if (capacity <= 0) return prevVisible;
        const toAdd = nextQueue.slice(0, capacity);
        nextQueue = nextQueue.slice(capacity);
        return [...prevVisible, ...toAdd];
      });
      return nextQueue;
    });
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = nextId();
      const t: Toast = { id, message, variant };

      setQueue((prev) => {
        const candidateVisible = Math.min(visibleToasts.length, MAX_VISIBLE);
        // We use visibleToasts.length from closure. To avoid race conditions,
        // enqueue and let flushQueue enforce max visible.
        return [...prev, t];
      });

      // Put immediately into visible if we have capacity.
      setVisibleToasts((prevVisible) => {
        if (prevVisible.length >= MAX_VISIBLE) return prevVisible;
        return [...prevVisible, t];
      });

      // Remove from queue if it was added there and moved into visible.
      setQueue((prev) => prev.filter((x) => x.id !== t.id));

      // Auto-dismiss.
      const timerId = window.setTimeout(() => {
        dismiss(id);
        // Make room for next queued toast.
        flushQueue();
      }, DISMISS_MS);
      timersRef.current.set(id, timerId);

      // Ensure queue is drained if there is space.
      // (In practice, auto-dismiss and manual dismiss call flushQueue too.)
      flushQueue();
    },
    [dismiss, flushQueue, visibleToasts.length]
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Render-time live announcements are handled by ToastViewport */}
      <ToastViewport visibleToasts={visibleToasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  visibleToasts,
  onDismiss,
}: {
  visibleToasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  // Use a polite live region. For error variant, we can make it assertive.
  const [announcement, setAnnouncement] = useState<string>("");

  useEffect(() => {
    if (visibleToasts.length === 0) return;
    // Announce the most recently added toast.
    const last = visibleToasts[visibleToasts.length - 1];
    setAnnouncement(`${last.variant}: ${last.message}`);
  }, [visibleToasts]);

  return (
    <>
      <div
        aria-live={visibleToasts.some((t) => t.variant === "error") ? "assertive" : "polite"}
        className="sr-only"
      >
        {announcement}
      </div>

      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]"
      >
        {visibleToasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
        ))}
      </div>
    </>
  );
}

function variantStyles(variant: ToastVariant) {
  switch (variant) {
    case "success":
      return {
        container: "bg-green-50 border-green-200 text-green-900",
        bar: "bg-green-500",
      };
    case "error":
      return {
        container: "bg-red-50 border-red-200 text-red-900",
        bar: "bg-red-500",
      };
    case "warning":
      return {
        container: "bg-yellow-50 border-yellow-200 text-yellow-900",
        bar: "bg-yellow-500",
      };
    case "info":
    default:
      return {
        container: "bg-blue-50 border-blue-200 text-blue-900",
        bar: "bg-blue-500",
      };
  }
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const styles = variantStyles(toast.variant);

  return (
    <div
      role="status"
      aria-live="off"
      className={`border-l-4 ${styles.container} rounded-xl shadow-sm px-3 py-2 flex items-start gap-3`}
    >
      <div className={`h-full w-1 mt-1 rounded ${styles.bar}`} aria-hidden="true" />
      <div className="flex-1 text-sm leading-5">
        <div className="font-semibold capitalize">{toast.variant}</div>
        <div>{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={`Dismiss ${toast.variant} notification`}
        className="ml-1 inline-flex items-center justify-center rounded-md px-2 py-1 text-current/70 hover:text-current hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

