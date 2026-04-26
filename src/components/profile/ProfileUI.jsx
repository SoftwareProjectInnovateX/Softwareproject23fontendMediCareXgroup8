import React from "react";
import { CheckCircle, AlertCircle } from "lucide-react";
import { C } from "./profileTheme";

// ── Section card — white container with tinted header strip ───────────────────
export function SectionCard({ icon, title, subtitle, children }) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        boxShadow: C.cardShadow,
      }}
    >
      <div
        className="flex items-center gap-2.5 px-[22px] py-4"
        style={{
          background: C.accentFaint,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          className="w-[34px] h-[34px] rounded-lg flex items-center justify-center"
          style={{ background: C.accentFaint }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: C.textPrimary }}>
            {title}
          </p>
          <p className="text-[11px]" style={{ color: C.textMuted }}>
            {subtitle}
          </p>
        </div>
      </div>
      <div className="p-[22px] flex flex-col gap-3.5">{children}</div>
    </div>
  );
}

// ── Section label — FIXED (handles both icon types) ───────────────────────────
export function SectionLabel({ icon, label }) {
  const Icon = icon;

  return (
    <p
      className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-4"
      style={{ color: C.textMuted }}
    >
      {React.isValidElement(icon)
        ? icon
        : Icon
        ? <Icon size={14} />
        : null}
      {label}
    </p>
  );
}

// ── Field — label + input wrapper ─────────────────────────────────────────────
export function Field({ icon, label, children }) {
  return (
    <div>
      <label
        className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-1.5"
        style={{ color: C.textMuted }}
      >
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

// ── Success banner — green confirmation strip ─────────────────────────────────
export function SuccessBanner({ message }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3.5 py-2.5"
      style={{
        background: C.successBg,
        border: `1px solid ${C.successBorder}`,
      }}
    >
      <CheckCircle size={15} color={C.successText} />
      <p className="text-[13px] font-semibold" style={{ color: C.successText }}>
        {message}
      </p>
    </div>
  );
}

// ── Toast — fixed top-right notification ─────────────────────────────────────
export function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";

  return (
    <div
      className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-semibold shadow-lg"
      style={{
        background: isError ? C.dangerBg : C.successBg,
        color: isError ? C.dangerText : C.successText,
        border: `1px solid ${isError ? C.dangerBorder : C.successBorder}`,
      }}
    >
      {isError ? (
        <AlertCircle size={15} color={C.dangerText} />
      ) : (
        <CheckCircle size={15} color={C.successText} />
      )}
      {toast.msg}
    </div>
  );
}