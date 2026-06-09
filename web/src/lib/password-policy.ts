export const PASSWORD_MIN_LENGTH = 10;
export const BCRYPT_COST = 12;

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (password.length > 128) {
    return { ok: false, message: "Password must be 128 characters or fewer." };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { ok: false, message: "Password must include at least one letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: "Password must include at least one number." };
  }
  if (/\s/.test(password)) {
    return { ok: false, message: "Password cannot contain spaces." };
  }
  return { ok: true };
}

export function passwordPolicyDescription(): string {
  return `${PASSWORD_MIN_LENGTH}+ characters with at least one letter and one number.`;
}
