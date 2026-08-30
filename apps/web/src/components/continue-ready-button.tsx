"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

type ContinueReadyButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick" | "disabled" | "children"
> & {
  children?: string;
  /** When set, show this link instead of hiding after sign-in (e.g. landing → Home). */
  signedInHref?: string;
  signedInLabel?: string;
};

/** One tap → Ready X connect (if needed) + SNIP-12 sign-in. */
export function ContinueWithReadyXButton({
  children = "Continue with Ready X",
  signedInHref,
  signedInLabel = "Go to Home",
  className,
  variant,
  ...rest
}: ContinueReadyButtonProps) {
  const { token, isLoading, signingIn, startSignIn } = useAuth();

  if (isLoading) {
    return (
      <Button
        type="button"
        variant={variant}
        className={className}
        disabled
        {...rest}
      >
        Continue with Ready X
      </Button>
    );
  }

  if (token) {
    if (signedInHref) {
      return (
        <Link href={signedInHref}>
          <Button type="button" variant={variant} className={className} {...rest}>
            {signedInLabel}
          </Button>
        </Link>
      );
    }
    return null;
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={signingIn}
      onClick={() => void startSignIn()}
      {...rest}
    >
      {signingIn ? "Opening Ready X…" : children}
    </Button>
  );
}
