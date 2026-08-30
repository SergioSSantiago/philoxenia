"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

type ContinueReadyButtonProps = Omit<
  ComponentProps<typeof Button>,
  "onClick" | "disabled" | "children"
> & {
  children?: string;
};

/** One tap → Ready X connect (if needed) + SNIP-12 sign-in. */
export function ContinueWithReadyXButton({
  children = "Continue with Ready X",
  className,
  variant,
  ...rest
}: ContinueReadyButtonProps) {
  const { user, signingIn, startSignIn } = useAuth();

  if (user) return null;

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
