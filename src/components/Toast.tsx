import { useEffect, useState, useCallback } from "react";
import { _toastListeners, type ToastMessage } from "./toastService";

/** Toast notification container — mount once in the app root. */
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((msg: ToastMessage) => {
    setToasts((prev) => [...prev.slice(-4), msg]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== msg.id));
    }, 4000);
  }, []);

  useEffect(() => {
    _toastListeners.push(addToast);
    return () => {
      const idx = _toastListeners.indexOf(addToast);
      if (idx !== -1) _toastListeners.splice(idx, 1);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.625rem",
        maxWidth: "380px",
        width: "calc(100vw - 2rem)",
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="alert">
          <span className="toast-icon">
            {t.type === "success" ? "✓" : t.type === "error" ? "✗" : t.type === "warn" ? "⚠" : "ℹ"}
          </span>
          <span className="toast-text">{t.text}</span>
          <button
            className="toast-close"
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
