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
          <strong>iPhone:</strong> install{" "}
          <strong>Ready X</strong> (App Store — not the old Ready / Crypto Card),
          then open Philoxenia in its <strong>in-app browser</strong>. Safari
          opens the old wallet and cannot finish login.{" "}
          <strong>Firefox:</strong> no Ready X — no private pay.
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-red-800/95 sm:text-sm">
          <li>
            <strong>Desktop:</strong> use <strong>Chrome</strong> with the{" "}
            <strong>Ready X</strong> extension. In Ready X, enable{" "}
            <strong>Smart Wallet</strong> and <strong>Private</strong>.
          </li>
          <li>
            <strong>iPhone:</strong> install{" "}
            <a
              href="https://apps.apple.com/us/app/ready-x/id6744935604"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              Ready X
            </a>{" "}
            (not the older Ready / Crypto Card app). Open Philoxenia{" "}
            <strong>inside the Ready X in-app browser</strong> — not Safari.
            Safari WalletConnect deep-links to the legacy app and never returns
            a signature.
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
