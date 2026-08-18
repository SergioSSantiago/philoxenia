"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Card } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  function clearSession() {
    try {
      localStorage.removeItem("philoxenia_token");
      localStorage.removeItem("philoxenia_user");
    } catch {
      /* ignore */
    }
    window.location.href = "/home";
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-2xl">Philoxenia couldn’t load this page</h1>
        <p className="mt-3 text-sm text-muted leading-relaxed">
          Philoxenia hit a client error. Try again, or Connect Ready X to Book
          & pay if the session is stuck.
        </p>
        {error?.message ? (
          <p className="mt-3 break-words rounded-lg bg-background px-3 py-2 text-left text-xs text-red-700">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col gap-3">
          <Button className="w-full" onClick={() => reset()}>
            Try Philoxenia again
          </Button>
          <Button variant="secondary" className="w-full" onClick={clearSession}>
            Disconnect Ready X & go Home
          </Button>
          <Link href="/home" className="text-sm text-muted hover:text-foreground">
            Back to Home
          </Link>
        </div>
      </Card>
    </div>
  );
}
