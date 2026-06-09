type PageWidth = "narrow" | "default" | "wide";

const widthClasses: Record<PageWidth, string> = {
  narrow: "max-w-lg",
  default: "max-w-3xl lg:max-w-4xl",
  wide: "max-w-4xl lg:max-w-6xl xl:max-w-7xl",
};

type Props = {
  children: React.ReactNode;
  width?: PageWidth;
  className?: string;
};

export function PageShell({ children, width = "default", className = "" }: Props) {
  return (
    <div
      className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8 ${widthClasses[width]} ${className}`}
    >
      {children}
    </div>
  );
}
