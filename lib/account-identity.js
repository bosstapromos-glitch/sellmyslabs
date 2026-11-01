export function verifiedIdentity(user, ownerEmail) {
  if (!user?.id) return null;
  const emails = [
    ...new Set(
      (user.emailAddresses || [])
        .filter((address) => address.verification?.status === "verified")
        .map((address) => address.emailAddress?.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  return {
    id: user.id,
    emails,
    email: emails[0] || "",
    isOwner: !!ownerEmail && emails.includes(ownerEmail.trim().toLowerCase()),
  };
}
