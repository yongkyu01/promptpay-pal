import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { supabase } from "@/integrations/supabase/client";

/**
 * Custom URL scheme used as the OAuth redirect target inside the native app.
 * Must match Android intent-filter / iOS URL scheme entries (auto-generated
 * from `appId` by Capacitor: `app.lovable.<id>://`).
 */
export const NATIVE_REDIRECT_SCHEME =
  "app.lovable.7f4cb82d6ad04a26975e515cb644ad1b";
export const NATIVE_REDIRECT_URI = `${NATIVE_REDIRECT_SCHEME}://oauth-callback`;

export const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

/**
 * Opens an OAuth URL in the system browser (for native apps) or via standard
 * navigation (for web). Returns a promise that resolves when the deep-link
 * callback fires, with the parsed URL.
 */
export async function openOAuthUrlNative(url: string): Promise<URL> {
  return new Promise(async (resolve, reject) => {
    let handler: { remove: () => void } | null = null;
    try {
      const sub = await CapacitorApp.addListener("appUrlOpen", async (data) => {
        try {
          const parsed = new URL(data.url);
          handler?.remove();
          await Browser.close().catch(() => {});
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
      handler = sub;
      await Browser.open({ url, windowName: "_self" });
    } catch (e) {
      handler?.remove();
      reject(e);
    }
  });
}

/**
 * Parses access_token / refresh_token from a callback URL (either query or hash)
 * and sets the Supabase session.
 */
export async function setSessionFromCallbackUrl(url: URL): Promise<void> {
  const params = new URLSearchParams(
    url.hash.startsWith("#") ? url.hash.slice(1) : url.hash || url.search.slice(1)
  );
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) {
    throw new Error("No tokens in callback URL");
  }
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
}