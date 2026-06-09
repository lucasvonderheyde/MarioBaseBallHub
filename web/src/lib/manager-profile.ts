type UserLike = {
  username: string;
  displayName?: string | null;
  profilePictureUrl?: string | null;
};

export function managerDisplayName(user: UserLike): string {
  return user.displayName?.trim() || user.username;
}

export function managerInitials(user: UserLike): string {
  const name = managerDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function isValidProfilePictureUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
