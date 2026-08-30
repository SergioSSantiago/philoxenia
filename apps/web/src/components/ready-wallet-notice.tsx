/** Shared copy: Ready X setup for Philoxenia (login + Private Book & pay). */

export const READY_WALLET_SETUP_TITLE = "Ready X for private Book & pay";

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
      className={`rounded-xl border border-border bg-background px-4 py-3 text-left text-muted ${className}`}
    >
      <p className="text-sm font-medium text-foreground">
        {READY_WALLET_SETUP_TITLE}
      </p>
      {compact ? (
        <p className="mt-1.5 text-xs leading-relaxed">
          <strong>Desktop:</strong> Chrome + Ready X extension.{" "}
          <strong>Phone:</strong> Ready X app → open Philoxenia inside Ready X.
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs leading-relaxed sm:text-sm">
          <li>
            <strong>Desktop:</strong> Chrome with the{" "}
            <strong>Ready X</strong> wallet extension.
          </li>
          <li>
            <strong>Phone:</strong> Download{" "}
            <a
              href="https://apps.apple.com/us/app/ready-x/id6744935604"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent underline underline-offset-2"
            >
              Ready X
            </a>{" "}
            and open Philoxenia in the Ready X browser.
          </li>
        </ul>
      )}
    </aside>
  );
}
