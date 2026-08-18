"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { copyText } from "@/lib/share-invite";

export function CopyInviteButton({
  url,
  label = "Copy place invite",
  className = "w-full sm:w-auto",
  onCopied,
}: {
  url: string;
  label?: string;
  className?: string;
  onCopied?: (ok: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const ok = await copyText(url);
    onCopied?.(ok);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className={className}
      onClick={() => void onClick()}
    >
      {copied ? "Place invite copied" : label}
    </Button>
  );
}
