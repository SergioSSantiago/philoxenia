/** Shared copy: Ready X setup for Philoxenia (login + private pay). */

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
          <strong>Desktop:</strong> Chrome + Ready X extension,{" "}
          <strong>Smart Wallet</strong> + <strong>Private</strong>.{" "}
          <strong>iPhone:</strong> install{" "}
          <strong>Ready X</strong>. Safari can <strong>Connect</strong>{" "}
          (WalletConnect). For Private STRK, open Philoxenia in the Ready X
          in-app browser.{" "}
          <strong>Firefox:</strong> no Ready X — no private pay.
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-red-800/95 sm:text-sm">
          <li>
            <strong>Desktop:</strong> use <strong>Chrome</strong> with the{" "}
            <strong>Ready X</strong> extension. Enable{" "}
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
            </a>
            . From Safari you can <strong>Connect</strong> (WalletConnect
            redirect into Ready X). For Private STRK, prefer Philoxenia inside
            the <strong>Ready X in-app browser</strong>.
          </li>
          <li>
            <strong>Firefox:</strong> Ready X extension is unavailable — no
            private payments. Use Chrome + Ready X or the Ready X app browser.
          </li>
        </ul>
      )}
    </aside>
  );
}
