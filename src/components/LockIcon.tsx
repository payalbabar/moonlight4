import type { CSSProperties } from "react";

interface LockIconProps {
  size?: number;
  style?: CSSProperties;
  className?: string;
}

/** Shared lock SVG icon used across the app. */
export default function LockIcon({ size, style, className }: LockIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      style={style ?? (size ? undefined : { width: "100%", height: "100%" })}
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
