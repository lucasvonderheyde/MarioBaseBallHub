export function loginFailureMessage(options: {
  hasPasswordSetAt: boolean;
  hasGoogleLink: boolean;
}): string {
  if (!options.hasPasswordSetAt && options.hasGoogleLink) {
    return "This account uses Google sign-in. Continue with Google instead.";
  }
  return "Invalid credentials.";
}
