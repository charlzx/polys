import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const MARK_PX = { sm: 20, md: 28, lg: 44 } as const;

const STROKE_WIDTH = { sm: 2, md: 1.75, lg: 1.5 } as const;

const WORDMARK_CLASS = {
  sm: "text-subtitle font-bold leading-none tracking-tight",
  md: "text-subtitle font-bold leading-none tracking-tight",
  lg: "text-title font-bold leading-none tracking-tight",
} as const;

function HexMark({ px, strokeWidth }: { px: number; strokeWidth: number }) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="22,12 17,3.3 7,3.3 2,12 7,20.7 17,20.7" />
    </svg>
  );
}

export function Logo({ size = "md", showWordmark = true, className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <HexMark px={MARK_PX[size]} strokeWidth={STROKE_WIDTH[size]} />
      {showWordmark && (
        <span className={WORDMARK_CLASS[size]}>Polys</span>
      )}
    </span>
  );
}
