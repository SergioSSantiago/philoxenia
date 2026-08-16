/** Create-friendly invite handoff: prefer clipboard; native share is opt-in. */

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

export async function shareInviteNative(opts: {
  title: string;
  text: string;
  url: string;
}): Promise<"shared" | "dismissed" | "unavailable"> {
  if (typeof navigator.share !== "function") return "unavailable";
  try {
    await navigator.share(opts);
    return "shared";
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return "dismissed";
    return "unavailable";
  }
}

export function inviteReadyStatus(copied: boolean, asConnector: boolean): string {
  if (copied) {
    return asConnector
      ? "Invite copied — paste it to someone you trust. You earn if they book."
      : "Invite copied — paste it wherever you like.";
  }
  return "Invite ready — select the link below and copy it.";
}
