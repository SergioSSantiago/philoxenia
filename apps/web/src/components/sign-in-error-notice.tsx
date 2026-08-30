"use client";

import { ActionNotice } from "@/components/action-notice";
import { useAuth } from "@/lib/auth-context";

/** Shown only when sign-in fails — no modal gate before Ready X. */
export function SignInErrorNotice() {
  const { signInError, clearSignInError, signingIn, startSignIn } = useAuth();

  return (
    <ActionNotice
      open={Boolean(signInError)}
      title="Could not continue with Ready X"
      body={signInError ?? ""}
      tone="error"
      busy={signingIn}
      primaryLabel="Try Ready X again"
      secondaryLabel="Dismiss"
      onPrimary={() => void startSignIn()}
      onSecondary={clearSignInError}
    />
  );
}
