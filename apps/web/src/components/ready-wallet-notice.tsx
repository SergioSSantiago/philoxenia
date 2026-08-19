/** Shared copy: Ready X setup for Philoxenia (login + Private Book & pay). */

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
          <strong>Desktop:</strong> Chrome with the Ready X wallet extension is
          recommended. <strong>Phone:</strong> download the Ready X wallet app
          and open Philoxenia in the Ready X browser.
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-red-800/95 sm:text-sm">
          <li>
            <strong>Desktop:</strong> Chrome with the{" "}
            <strong>Ready X</strong> wallet extension is recommended.
          </li>
          <li>
            <strong>Phone:</strong> Download the{" "}
            <a
              href="https://apps.apple.com/us/app/ready-x/id6744935604"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              Ready X
            </a>{" "}
            wallet app and open Philoxenia in the Ready X browser.
          </li>
        </ul>
      )}
    </aside>
  );
}
