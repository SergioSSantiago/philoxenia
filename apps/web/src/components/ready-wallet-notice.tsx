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
          <strong>Desktop:</strong> Chrome + Ready X extension, with{" "}
          <strong>Smart Wallet</strong> and <strong>Private</strong> on.{" "}
          <strong>iPhone:</strong> open Philoxenia in the{" "}
          <strong>Ready X app browser</strong> (Safari will not work).{" "}
          <strong>Firefox:</strong> no Ready X extension — legacy Ready only, no
          private pay.
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-red-800/95 sm:text-sm">
          <li>
            <strong>Desktop:</strong> use <strong>Chrome</strong> with the{" "}
            <strong>Ready X</strong> extension. In Ready X, enable{" "}
            <strong>Smart Wallet</strong> and <strong>Private</strong>.
          </li>
          <li>
            <strong>iPhone:</strong> you{" "}
            <strong>must open Philoxenia inside the Ready X wallet app
            browser</strong>
            — not Safari or Chrome on iOS. Otherwise connect/sign and private
            pay will fail.
          </li>
          <li>
            <strong>Firefox:</strong> the Ready X extension is{" "}
            <strong>not available</strong>. Only the legacy Ready Wallet
            appears, which <strong>cannot</strong> do private payments. Use
            Chrome + Ready X (desktop) or the Ready X app browser (iPhone).
          </li>
        </ul>
      )}
    </aside>
  );
}
