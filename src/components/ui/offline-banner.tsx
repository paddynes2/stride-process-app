"use client";

import { useSyncExternalStore } from "react";
import { WifiOff, Wifi } from "lucide-react";

// Module-level external store for network status + reconnection flash
let listeners: Array<() => void> = [];
let state = { isOffline: false, showReconnected: false };
let dismissTimer: ReturnType<typeof setTimeout> | undefined;

function emit() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  state = { isOffline: !navigator.onLine, showReconnected: false };

  window.addEventListener("offline", () => {
    clearTimeout(dismissTimer);
    state = { isOffline: true, showReconnected: false };
    emit();
  });

  window.addEventListener("online", () => {
    const wasOffline = state.isOffline;
    state = { isOffline: false, showReconnected: wasOffline };
    emit();
    if (wasOffline) {
      dismissTimer = setTimeout(() => {
        state = { isOffline: false, showReconnected: false };
        emit();
      }, 3000);
    }
  });
}

function subscribe(callback: () => void) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter((l) => l !== callback);
  };
}

function getSnapshot() {
  return state;
}

const serverSnapshot = { isOffline: false, showReconnected: false };
function getServerSnapshot() {
  return serverSnapshot;
}

export function OfflineBanner() {
  const { isOffline, showReconnected } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[500] flex items-center justify-center gap-2 px-4 py-2 text-[length:var(--text-sm)] font-medium"
      style={{
        background: isOffline ? "var(--warning-subtle)" : "var(--success-subtle)",
        color: isOffline ? "var(--warning)" : "var(--success)",
        borderBottom: `1px solid ${isOffline ? "var(--warning)" : "var(--success)"}`,
      }}
    >
      {isOffline ? (
        <>
          <WifiOff size={14} aria-hidden="true" />
          <span>You&apos;re offline &mdash; changes won&apos;t be saved</span>
        </>
      ) : (
        <>
          <Wifi size={14} aria-hidden="true" />
          <span>Back online</span>
        </>
      )}
    </div>
  );
}
