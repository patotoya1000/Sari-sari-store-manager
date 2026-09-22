// native/platform.js — the single shared "are we running inside the native app?"
// check. Every other native/*.js file imports this instead of re-checking
// window.Capacitor itself, so there's exactly one place that knows how to ask.

export function isNative() {
  return !!window.Capacitor?.isNativePlatform?.();
}
