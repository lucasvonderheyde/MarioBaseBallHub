import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function Card({ children, title, action, className = "" }: Props) {
  return (
    <section className={`msb-panel p-5 ${className}`}>
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            typeof title === "string" ? (
              <h2 className="msb-card-title">{title}</h2>
            ) : (
              <div className="min-w-0 flex-1">{title}</div>
            )
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
