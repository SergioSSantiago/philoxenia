import type { User } from "@philoxenia/shared";
import { WalletAddress } from "@/components/wallet-address";

export function UserBadge({
  user,
  role,
  showWallet = true,
}: {
  user: User;
  role?: string;
  showWallet?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      {role && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {role}
        </p>
      )}
      <p
        className={`font-medium text-foreground text-lg ${
          role ? "mt-1" : ""
        }`}
      >
        {user.displayName}
      </p>
      {showWallet && (
        <div className="mt-2">
          <WalletAddress address={user.walletAddress} compact />
        </div>
      )}
    </div>
  );
}
