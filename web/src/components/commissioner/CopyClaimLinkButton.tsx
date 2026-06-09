"use client";

type Props = {
  path: string;
};

export function CopyClaimLinkButton({ path }: Props) {
  return (
    <button
      type="button"
      className="msb-btn-nav px-3 py-1 text-sm"
      onClick={() => {
        void navigator.clipboard.writeText(
          `${window.location.origin}${path}`,
        );
      }}
    >
      Copy link
    </button>
  );
}
