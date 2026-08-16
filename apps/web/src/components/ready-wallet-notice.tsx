/** Shared copy: Ready X setup required for Philoxenia (login + private pay). */

export const READY_WALLET_SETUP_TITLE = "Required: Ready X setup";

export function ReadyWalletNotice({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <aside
      role="note"
      className={`rounded-xl border border-red-700/40 bg-red-50 px-4 py-3 text-left text-red-800 ${className}`}
    >
      <p className="text-sm font-semibold tracking-tight text-red-900">
        {READY_WALLET_SETUP_TITLE}
      </p>
      {compact ? (
        <p className="mt-1.5 text-xs leading-relaxed text-red-800/95">
          Use <strong>Chrome</strong> (or Brave) with the{" "}
          <strong>Ready X</strong> extension. Enable <strong>Smart Wallet</strong>{" "}
          and <strong>Private</strong> in Ready. Firefox does{" "}
          <strong>not</strong> ship Ready X — only the old Ready Wallet, which
          cannot do private pay.
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-red-800/95 sm:text-sm">
          <li>
            Prefer <strong>Chrome</strong> or <strong>Brave</strong> with the{" "}
            <strong>Ready X</strong> browser extension — or open Philoxenia inside
            the <strong>Ready X in-app browser</strong>.
          </li>
          <li>
            In Ready X settings, turn on <strong>Smart Wallet</strong> and{" "}
            <strong>Private</strong> (STRK20 / wallet API ≥ 0.10). Without that,
            login or Private pay will fail.
          </li>
          <li>
            <strong>Firefox:</strong> the Ready X extension is{" "}
            <strong>not available</strong>. You only get the legacy Ready Wallet
            (formerly Argent), which does <strong>not</strong> support private
            payments. Use Chrome/Brave + Ready X instead.
          </li>
        </ul>
      )}
    </aside>
  );
}
