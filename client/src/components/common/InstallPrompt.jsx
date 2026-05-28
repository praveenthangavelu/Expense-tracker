import { useEffect, useMemo, useState } from "react";

const DISMISSED_KEY = "expenseflow_pwa_install_dismissed_v1";

const isIos = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua);
};

const isStandalone = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator?.standalone === true;
};

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "1");
  const [installed, setInstalled] = useState(() => isStandalone());

  const ios = useMemo(() => isIos(), []);

  useEffect(() => {
    const onBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const show = !dismissed && !installed && (ios || !!deferredPrompt);
  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    if (res?.outcome !== "accepted") return;
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[min(980px,calc(100%-24px))] -translate-x-1/2">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[rgba(5,6,11,0.92)] backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.65)]">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-[rgba(99,228,181,0.18)] bg-[var(--mint-soft)] text-[var(--mint)]">
                ⬇
              </span>
              <p className="text-sm font-bold text-white truncate">
                Install ExpenseFlow for a better experience
              </p>
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {ios
                ? "On iPhone/iPad: Tap Share → Add to Home Screen."
                : "Works offline. Faster launch. Looks like a real app."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!ios && (
              <button
                type="button"
                onClick={install}
                className="rounded-xl border border-[rgba(99,228,181,0.30)] bg-[rgba(99,228,181,0.12)] px-3 py-2 text-xs font-extrabold text-[var(--mint)] hover:bg-[rgba(99,228,181,0.16)] transition"
              >
                Install
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-white transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

