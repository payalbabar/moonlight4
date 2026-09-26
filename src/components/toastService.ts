/**
 * StegoVault — Toast notification service
 *
 * Separate from Toast.tsx so the imperative `showToast` function and the
 * React component can live in different files, satisfying the
 * react-refresh/only-export-components fast-refresh rule.
 */

export type ToastType = "success" | "error" | "warn" | "info";

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

let _toastId = 0;
type ToastListener = (msg: ToastMessage) => void;
export const _toastListeners: ToastListener[] = [];

/** Call this anywhere — shows a toast in the ToastContainer. */
export function showToast(text: string, type: ToastType = "info"): void {
  const msg: ToastMessage = { id: ++_toastId, text, type };
  _toastListeners.forEach((l) => l(msg));
}
