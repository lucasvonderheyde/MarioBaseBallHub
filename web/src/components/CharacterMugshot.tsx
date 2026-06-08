import { characterMugshotUrl } from "@/lib/asset-urls";
import { mugshotFileForCharId } from "@/lib/character-display";

type Props = {
  charId: string;
  size?: number;
  className?: string;
};

export function CharacterMugshot({ charId, size = 28, className = "rounded" }: Props) {
  const file = mugshotFileForCharId(charId);
  if (!file) {
    return (
      <span
        className={`inline-flex items-center justify-center bg-zinc-800 text-zinc-600 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-hidden
      >
        ?
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={characterMugshotUrl(file)}
      alt=""
      width={size}
      height={size}
      className={className}
    />
  );
}
