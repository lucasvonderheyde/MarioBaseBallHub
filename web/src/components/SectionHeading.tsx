import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Standard section title — use instead of ad-hoc `text-lg font-semibold` h2s. */
export function SectionHeading({ children, className = "" }: Props) {
  return <h2 className={`msb-section-title ${className}`.trim()}>{children}</h2>;
}
