"use client";

import type { ReactNode } from "react";

export { Shell } from "./app-shell";

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary: "bg-accent text-white hover:bg-accent/90 shadow-sm",
    secondary:
      "bg-surface border border-border text-foreground hover:bg-accent-soft/50",
    ghost: "text-muted hover:text-foreground",
  };

  return (
    <button
      type={type}
      className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition touch-manipulation active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl text-foreground sm:text-2xl">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-muted leading-relaxed sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted sm:px-6">
      {message}
    </p>
  );
}

export function TextInput({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full min-h-[44px] rounded-xl border border-border bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted touch-manipulation ${className}`}
      {...props}
    />
  );
}
