// Identity must come from the Sites dispatcher, never client-side state.
export function hasAnalyticsAccess(user: { userId: string; email: string } | null, allowedEmails: string | undefined) {
  if (!user?.userId || !user.email) return false;
  const allowed = (allowedEmails ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(user.email.trim().toLowerCase());
}
