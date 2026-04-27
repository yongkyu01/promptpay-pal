const RELAY_STORAGE_KEY = "line_relay_state";
const RELAY_TS_STORAGE_KEY = "line_relay_ts";
const RELAY_STORAGE_CHANGE_EVENT = "relay-storage-changed";

export const RELAY_MAX_AGE_MS = 2 * 60 * 1000;

export const notifyRelayStorageChange = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(RELAY_STORAGE_CHANGE_EVENT));
};

export const writeStoredRelayState = (relayId: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(RELAY_STORAGE_KEY, relayId);
  localStorage.setItem(RELAY_TS_STORAGE_KEY, Date.now().toString());
  notifyRelayStorageChange();
};

export const clearStoredRelayState = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RELAY_STORAGE_KEY);
  localStorage.removeItem(RELAY_TS_STORAGE_KEY);
  notifyRelayStorageChange();
};

export const readStoredRelayState = (): string | null => {
  if (typeof window === "undefined") return null;
  const relayId = localStorage.getItem(RELAY_STORAGE_KEY);
  if (!relayId) return null;
  const rawTs = localStorage.getItem(RELAY_TS_STORAGE_KEY);
  const relayTs = rawTs ? Number(rawTs) : NaN;
  if (!Number.isFinite(relayTs) || Date.now() - relayTs > RELAY_MAX_AGE_MS) {
    clearStoredRelayState();
    return null;
  }
  return relayId;
};

const isKnownExternalAndroidBrowser = (ua: string): boolean =>
  /SamsungBrowser\/|Chrome\/\d|CriOS\/|Firefox\/|FxiOS\/|EdgA?\/|OPR\/|Opera\//i.test(ua);

export const isNativeApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (!!(window as any).Capacitor) return true;
  if (/app\.lovable\./i.test(ua)) return true;
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  if (/Android/.test(ua) && /wv[\);]/i.test(ua) && !/FBAN|FBAV|Instagram|Line\/|LIFF/i.test(ua)) return true;
  if (/Android/.test(ua) && /WebView/i.test(ua) && !/FBAN|FBAV|Instagram|Line\/|LIFF/i.test(ua)) return true;
  if (/Android/.test(ua) && !isKnownExternalAndroidBrowser(ua) && !/Chrome\/\d/i.test(ua) && /AppleWebKit/i.test(ua)) return true;
  return false;
};

export const isWebViewInApp = (): boolean => {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|LIFF/i.test(ua);
};

export const isLineInAppBrowser = (): boolean => {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return false;
  const ua = navigator.userAgent || "";
  return /Line\/|LIFF/i.test(ua);
};

type LaunchMethod = "window_open" | "anchor_blank" | "android_intent" | "same_tab";

const tryOpenInNewTab = (url: string): LaunchMethod | null => {
  try {
    const popup = window.open(url, "_blank", "noopener,noreferrer");
    if (popup) {
      try { (popup as any).opener = null; } catch {}
      return "window_open";
    }
  } catch {}
  try {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    (document.body || document.documentElement).appendChild(link);
    link.click();
    link.remove();
    return "anchor_blank";
  } catch {
    return null;
  }
};

export const openInExternalBrowser = (url: string): LaunchMethod => {
  const popupMethod = tryOpenInNewTab(url);
  if (popupMethod) return popupMethod;
  const stripped = url.replace(/^https?:\/\//, "");
  if (/Android/i.test(navigator.userAgent)) {
    try {
      window.location.href = `intent://${stripped}#Intent;scheme=https;action=android.intent.action.VIEW;end`;
      return "android_intent";
    } catch {}
  }
  window.location.href = url;
  return "same_tab";
};
