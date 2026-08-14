import Link from "next/link";

export function BrandLockup({
  size = "default",
  className = "",
}: {
  size?: "default" | "large" | "hero";
  className?: string;
}) {
  const typeClass =
    size === "hero"
      ? "text-[2.15rem] leading-none"
      : size === "large"
        ? "text-2xl sm:text-[1.75rem]"
        : "text-xl sm:text-2xl";
  const markClass =
    size === "hero"
      ? "h-14 w-14"
      : size === "large"
        ? "h-10 w-10 sm:h-11 sm:w-11"
        : "h-9 w-9 sm:h-10 sm:w-10";

  return (
    <Link
      href="/"
      className={`inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap text-foreground ${className}`}
    >
      <span className={`tracking-wide ${typeClass}`}>Philoxenia</span>
      <img
        src="/philoxenia-mark.png"
        alt=""
        width={40}
        height={40}
        className={`${markClass} rounded-full object-cover ring-1 ring-border`}
      />
    </Link>
  );
}
