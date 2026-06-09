import { managerDisplayName, managerInitials } from "@/lib/manager-profile";

type Props = {
  user: {
    username: string;
    displayName?: string | null;
    profilePictureUrl?: string | null;
  };
  size?: number;
  className?: string;
};

export function ManagerAvatar({ user, size = 48, className = "" }: Props) {
  const label = managerDisplayName(user);
  if (user.profilePictureUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.profilePictureUrl}
        alt=""
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full bg-zinc-800 font-semibold text-zinc-200 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.34) }}
      title={label}
    >
      {managerInitials(user)}
    </span>
  );
}
