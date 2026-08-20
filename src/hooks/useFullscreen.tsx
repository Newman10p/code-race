import { useEffect, useState, useCallback, useRef } from "react";

export function isMobile() {
  if (typeof navigator === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

function getFullscreenElement(): Element | null {
  if (typeof document === "undefined") return null;
  const d = document as any;
  return (
    d.fullscreenElement ||
    d.webkitFullscreenElement ||
    d.mozFullScreenElement ||
    d.msFullscreenElement ||
    null
  );
}

// Module-level flag so any exit-detection code can skip strikes when the
// page is unloading, navigating away, or HMR-reloading in dev.
let isUnloadingFlag = false;
export function isPageUnloading() {
  return isUnloadingFlag;
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { isUnloadingFlag = true; });
  window.addEventListener("beforeunload", () => { isUnloadingFlag = true; });
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Track browser fullscreen. Use a small delay so brief browser-triggered
    // transitions (permission prompts, focus swaps, Monaco's own fullscreen
    // widget) don't flip our state to false and back.
    let pendingFalse: number | null = null;
    const update = () => {
      const nowFs = !!getFullscreenElement();
      if (nowFs) {
        if (pendingFalse) { clearTimeout(pendingFalse); pendingFalse = null; }
        setIsFullscreen(true);
      } else {
        // Confirm the exit persists briefly before flipping state to false.
        if (pendingFalse) clearTimeout(pendingFalse);
        pendingFalse = window.setTimeout(() => {
          if (!getFullscreenElement()) setIsFullscreen(false);
          pendingFalse = null;
        }, 250);
      }
    };
    const events = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ];
    events.forEach((e) => document.addEventListener(e, update));
    // Sync immediately without the debounce
    setIsFullscreen(!!getFullscreenElement());
    return () => {
      if (pendingFalse) clearTimeout(pendingFalse);
      events.forEach((e) => document.removeEventListener(e, update));
    };
  }, []);

  const enter = useCallback(async () => {
    try {
      const el = document.documentElement as any;
      const req =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.mozRequestFullScreen ||
        el.msRequestFullscreen;
      if (req) await req.call(el);
      // Some browsers fire the change event asynchronously; sync state now.
      setIsFullscreen(!!getFullscreenElement());
    } catch {
      // ignore
    }
  }, []);

  const exit = useCallback(async () => {
    try {
      const d = document as any;
      if (getFullscreenElement()) {
        const ex =
          d.exitFullscreen ||
          d.webkitExitFullscreen ||
          d.mozCancelFullScreen ||
          d.msExitFullscreen;
        if (ex) await ex.call(d);
      }
    } catch {
      // ignore
    }
  }, []);

  return { isFullscreen, enter, exit };
}
